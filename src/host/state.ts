import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { MAX_REMEMBERED_ARCHIVES } from './constants.js'

/** Where migration bookkeeping lives; overridable for tests. */
export const STATE_DIR = process.env.DSH_EXPORT_CENTER_STATE_DIR ?? join(homedir(), '.dsh', 'export-center')

/** Current migration state file. */
export const STATE_FILE = join(STATE_DIR, 'migration.json')

/** Legacy file written by 0.7–1.0; read once for continuity. */
export const LEGACY_IMPORTS_FILE = join(STATE_DIR, 'imports.json')

/** How many exported Session ids to remember. */
const MAX_EXPORT_RECORDS = 5000

/** How many imported archives to remember on disk. */
const MAX_IMPORT_RECORDS = Math.max(MAX_REMEMBERED_ARCHIVES, 1000)

type ImportRecord = { at: number, sessions: number }

type MigrationState = {
  version: 1
  lastExportAt: number
  exports: Record<string, number>
  imports: Record<string, ImportRecord>
}

const state: MigrationState = { version: 1, lastExportAt: 0, exports: {}, imports: {} }

/** Keep the newest N entries of a record keyed by id → timestamp. */
function trimByValue(record: Record<string, number>, limit: number): void {
  const keys = Object.keys(record)
  if (keys.length <= limit) return
  keys
    .sort((left, right) => record[left] - record[right])
    .slice(0, keys.length - limit)
    .forEach((key) => { delete record[key] })
}

/** Keep the newest N imported-archive records. */
function trimImports(limit: number): void {
  const keys = Object.keys(state.imports)
  if (keys.length <= limit) return
  keys
    .sort((left, right) => state.imports[left].at - state.imports[right].at)
    .slice(0, keys.length - limit)
    .forEach((key) => { delete state.imports[key] })
}

/**
 * Load migration state, then fold in the legacy `imports.json` once.
 * A missing or damaged file only loses bookkeeping, never Sessions.
 */
export function loadMigrationState(): void {
  try {
    const value = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    if (value !== null && typeof value === 'object') {
      if (typeof value.lastExportAt === 'number' && Number.isFinite(value.lastExportAt)) {
        state.lastExportAt = value.lastExportAt
      }
      if (value.exports !== null && typeof value.exports === 'object') {
        for (const [id, at] of Object.entries(value.exports)) {
          if (typeof id === 'string' && typeof at === 'number' && Number.isFinite(at)) state.exports[id] = at
        }
      }
      if (value.imports !== null && typeof value.imports === 'object') {
        for (const [id, record] of Object.entries(value.imports)) {
          if (typeof id !== 'string' || record === null || typeof record !== 'object') continue
          const at = typeof (record as ImportRecord).at === 'number' ? (record as ImportRecord).at : 0
          const sessions = typeof (record as ImportRecord).sessions === 'number' ? (record as ImportRecord).sessions : 0
          state.imports[id] = { at, sessions }
        }
      }
    }
  } catch (error) {
    // First run, or the file is unreadable: start empty.
  }

  try {
    const legacy = JSON.parse(readFileSync(LEGACY_IMPORTS_FILE, 'utf8'))
    if (Array.isArray(legacy?.entries)) {
      for (const entry of legacy.entries) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string' || typeof entry[1] !== 'number') continue
        if (state.imports[entry[0]] === undefined) state.imports[entry[0]] = { at: entry[1], sessions: 0 }
      }
    }
  } catch (error) {
    // No legacy file is the normal case after a fresh install.
  }

  trimByValue(state.exports, MAX_EXPORT_RECORDS)
  trimImports(MAX_IMPORT_RECORDS)
}

/** Persist the current state; failures never fail an import or export. */
export function persistMigrationState(): void {
  try {
    mkdirSync(STATE_DIR, { recursive: true })
    trimByValue(state.exports, MAX_EXPORT_RECORDS)
    trimImports(MAX_IMPORT_RECORDS)
    writeFileSync(STATE_FILE, JSON.stringify({
      version: 1,
      lastExportAt: state.lastExportAt,
      exports: state.exports,
      imports: state.imports,
    }))
  } catch (error) {
    // Bookkeeping is a convenience; the archive itself already exists.
  }
}

/**
 * Record that these Sessions were exported successfully.
 * @param sessionIds - source Session ids that made it into the archive.
 * @param at - export time in epoch milliseconds.
 * @returns the new watermark and remembered count.
 */
export function markExported(sessionIds: string[], at = Date.now()): { lastExportAt: number, exported: number } {
  for (const id of sessionIds) {
    if (typeof id === 'string' && id !== '') state.exports[id] = at
  }
  state.lastExportAt = Math.max(state.lastExportAt, at)
  persistMigrationState()
  return { lastExportAt: state.lastExportAt, exported: Object.keys(state.exports).length }
}

/**
 * Last successful export time of one Session, or 0 when never exported here.
 * @param sessionId - source Session id.
 * @returns epoch milliseconds.
 */
export function exportedAt(sessionId: string): number {
  return state.exports[sessionId] ?? 0
}

/** Bookkeeping snapshot handed to the browser. */
export function migrationSnapshot(): { lastExportAt: number, exports: Record<string, number>, imports: Record<string, ImportRecord> } {
  return { lastExportAt: state.lastExportAt, exports: { ...state.exports }, imports: { ...state.imports } }
}

/**
 * Record one successfully restored archive.
 * @param archiveId - SHA-256 of the uploaded container.
 * @param sessions - how many root Sessions it restored.
 */
export function markImported(archiveId: string, sessions: number): void {
  state.imports[archiveId] = { at: Date.now(), sessions }
  persistMigrationState()
}

/**
 * Whether this archive was already restored on this machine.
 * @param archiveId - SHA-256 of the uploaded container.
 */
export function wasImported(archiveId: string | undefined): boolean {
  return archiveId !== undefined && state.imports[archiveId] !== undefined
}

/**
 * The stored record of one archive.
 * @param archiveId - SHA-256 of the uploaded container.
 */
export function importRecord(archiveId: string): ImportRecord | undefined {
  return state.imports[archiveId]
}
