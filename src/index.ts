/**
 * Host half of the export center bundle: restore a session archive produced by
 * the browser half.
 *
 * The browser downloads each Session through the official
 * `api/session.export` route (a ZIP holding the canonical `session.v4.jsonl`
 * log, its subagent logs, and every referenced attachment), wraps those ZIPs
 * into one container ZIP, and uploads that container here. This module reads
 * the container, writes every log as a new Session through the persistence
 * service, re-saves the attachments under their content-addressed ids, and
 * records the root Sessions in a Workspace.
 *
 * Only Node built-ins are imported: a profile plugin resolves `@deepseek-ai/*`
 * packages from the installation only when it declares them, and this bundle
 * deliberately declares no dependency.
 */
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Unzip, UnzipInflate, UnzipPassThrough } from './vendor/fflate.mjs'
import { MAX_UPLOAD_BYTES, MAX_ENTRY_BYTES, MAX_TOTAL_UNCOMPRESSED, MAX_REMEMBERED_ARCHIVES, MAX_SESSIONS, MAX_EVENTS, APPEND_BATCH, SESSION_FORMAT_VERSION, MANIFEST_SCHEMA } from './host/constants.js'
import { messageOf, validTime, sessionId } from './host/util.js'
import { CRC_TABLE, crc32, readZip, joinChunks, zipCrcMap, findEndOfCentralDirectory, readManifest } from './host/zip.js'
import { STATE_DIR, STATE_FILE, importedArchives, loadImportedArchives, persistImportedArchives } from './host/state.js'
import { IMAGE_TYPES, mediaTypeOf, restoreAttachments } from './host/attachments.js'

/** Absolute path of the archive upload route. */
const IMPORT_PATH = '/api/export-center.import'

/** Absolute path of the workspace listing route. */
const WORKSPACES_PATH = '/api/export-center.workspaces'

/** Options carried from the import request. */
type ImportOptions = { workspaceId?: string; archiveId?: string }

/** Header fields this plugin writes; the persistence service validates the rest. */
type StoredHeader = {
  version: number
  id: string
  createdAt: number
  cwd?: string
  isSeeded: boolean
  delegationDepth?: number
  agentPreset?: string
  parentSession?: string
  origin?: string
}

/** Host services this bundle requires. */
export const inject = ['connection', 'sessionPersistence', 'workspaceRegistry']

/**
 * Register the archive upload route.
 * @param ctx - Host context carrying the connection and persistence services.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register({
    path: IMPORT_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => importArchive(ctx, request),
  }), 'export-center: import route')
  ctx.effect(() => ctx.connection.fetch.register({
    path: WORKSPACES_PATH,
    methods: ['GET', 'HEAD'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = {
        workspaces: ctx.workspaceRegistry.list().map(workspace => ({
          id: workspace.id,
          path: workspace.path,
          title: workspace.title,
        })),
      }
      if (request.method === 'HEAD') return new Response(null, { status: 200 })
      return jsonResponse(200, body)
    },
  }), 'export-center: workspaces route')
}

loadImportedArchives()

/** The one running import, so a second browser cannot interleave writes. */
let activeImport = null

/**
 * Read the uploaded container and restore its Sessions.
 * @param ctx - Host context.
 * @param request - buffered POST request.
 * @returns JSON report; HTTP status reflects whether anything was restored.
 */
async function importArchive(ctx, request) {
  if (activeImport !== null) {
    return jsonResponse(409, { error: 'another import is running; retry when it finishes' })
  }
  const token = {}
  activeImport = token
  let report
  try {
    const url = new URL(request.url, 'http://export-center.invalid')
    const workspaceId = url.searchParams.get('workspaceId') || undefined
    const archiveId = url.searchParams.get('archiveId') || undefined
    const body = new Uint8Array(await request.arrayBuffer())
    if (body.byteLength === 0) return jsonResponse(400, { error: 'empty upload' })
    if (body.byteLength > MAX_UPLOAD_BYTES) {
      return jsonResponse(413, { error: `archive exceeds ${MAX_UPLOAD_BYTES} bytes` })
    }
    report = await restoreArchive(ctx, body, { workspaceId, archiveId })
  } catch (error) {
    return jsonResponse(500, { error: messageOf(error) })
  } finally {
    if (activeImport === token) activeImport = null
  }
  if (report.archiveId !== undefined && report.restored.length > 0) {
    importedArchives.set(report.archiveId, Date.now())
    while (importedArchives.size > MAX_REMEMBERED_ARCHIVES) {
      const oldest = importedArchives.keys().next().value
      importedArchives.delete(oldest)
    }
    persistImportedArchives()
  }
  const restored = report.restored.length
  return jsonResponse(restored === 0 ? 422 : 200, report)
}

/**
 * Restore every Session log inside one container archive.
 * @param ctx - Host context.
 * @param container - container ZIP bytes.
 * @param options - requested target Workspace id and the archive's own id.
 * @returns the import report.
 */
async function restoreArchive(ctx: any, container: Uint8Array, options: ImportOptions = {}) {
  const outer = readZip(container)
  const persistence = ctx.sessionPersistence
  const attachments = ctx.get('attachments')
  const projectionCache = ctx.get('sessionProjectionCache')
  const workspaces = ctx.workspaceRegistry.list()
  const presets = await knownPresetIds(ctx)
  const innerNames = [...outer.keys()].filter(name => /\.zip$/i.test(name)).sort()
  const manifest = readManifest(outer)
  const report = {
    kind: 'dsh-export-center/import',
    archiveId: options.archiveId,
    duplicate: options.archiveId !== undefined && importedArchives.has(options.archiveId),
    manifest: manifest.ok ? manifest.info : null,
    restored: [],
    failed: [],
    skipped: [],
    attachments: { images: 0, files: 0, failed: [], converted: [], idMismatch: [] },
    sessions: [],
  }
  if (!manifest.ok) {
    report.failed.push({ entry: 'manifest.json', reason: manifest.reason })
    return report
  }
  if (innerNames.length === 0) {
    report.failed.push({ entry: 'archive', reason: 'no session package found' })
    return report
  }

  const limit = Math.min(innerNames.length, MAX_SESSIONS)
  for (const name of innerNames.slice(limit)) {
    report.skipped.push({ entry: name, reason: `over the ${MAX_SESSIONS}-package limit` })
  }

  for (const name of innerNames.slice(0, limit)) {
    let inner
    try {
      inner = readZip(outer.get(name), name)
      // Release the container entry; only one package is needed at a time.
      outer.delete(name)
    } catch (error) {
      report.failed.push({ entry: name, reason: messageOf(error) })
      continue
    }
    const root = parseInnerPackage(inner, name)
    // Release the package bytes before the persistence work: a container may
    // hold hundreds of packages and only one is needed at a time.
    inner = undefined
    if (root.error !== undefined) {
      report.failed.push({ entry: name, reason: root.error })
      continue
    }
    try {
      const source = root.header
      const target = chooseWorkspace(workspaces, source.cwd, options.workspaceId)
      const targetInfo = target === undefined
        ? null
        : { id: target.workspace.id, path: target.workspace.path, mode: target.mode }
      // A fork carries an inherited prefix marked by `session/end-seed`; that
      // prefix keeps its original session references and is re-seeded as-is.
      const seeded = source.isSeeded === true && root.seedIndex >= 0
      const inherited = seeded ? root.seedIndex + 1 : undefined
      // Allocate every id first: events carry the source Session id (delivery
      // markers, parent links), and the stored log must name its own Session.
      const rootId = sessionId()
      const childIds = root.children.map(() => sessionId())
      const idMap = new Map()
      idMap.set(source.id, rootId)
      root.children.forEach((child, index) => idMap.set(child.header.id, childIds[index]))
      rewriteSessionRefs(root.events, idMap, seeded ? inherited : 0)

      const createdAt = validTime(source.createdAt)
      if (createdAt === undefined) {
        report.failed.push({ entry: root.name, reason: 'session header has no usable createdAt' })
        continue
      }
      const header: StoredHeader = {
        version: SESSION_FORMAT_VERSION,
        id: rootId,
        createdAt,
        cwd: target === undefined ? undefined : target.workspace.path,
        isSeeded: seeded,
      }
      const parentMissing = source.parentSession !== undefined && !idMap.has(source.parentSession)
      if (parentMissing) {
        header.delegationDepth = 0
      } else if (typeof source.delegationDepth === 'number' && Number.isSafeInteger(source.delegationDepth)) {
        header.delegationDepth = Math.max(0, source.delegationDepth)
      }
      const presetDropped = typeof source.agentPreset === 'string' && source.agentPreset !== ''
        && presets !== undefined && !presets.has(source.agentPreset)
      if (typeof source.agentPreset === 'string' && source.agentPreset !== '' && !presetDropped) {
        header.agentPreset = source.agentPreset
      }
      const written = await writeSession(persistence, projectionCache, header, root.events, inherited)
      if (!written.ok) {
        const rolledBack = written.created ? await removeSession(persistence, header.id) : false
        report.failed.push({
          entry: root.name,
          reason: written.reason,
          rolledBack,
          residualSessionId: written.created && !rolledBack ? header.id : undefined,
        })
        continue
      }
      const verified = await verifySession(persistence, header.id, root.events.length)
      if (verified.startsWith('unreadable')) {
        const rolledBack = await removeSession(persistence, header.id)
        report.failed.push({
          entry: root.name,
          reason: verified,
          rolledBack,
          residualSessionId: rolledBack ? undefined : header.id,
        })
        continue
      }
      if (target !== undefined) {
        try {
          await target.workspace.attachSession(header.id)
        } catch (error) {
          report.failed.push({ entry: root.name, reason: `stored but not attached: ${messageOf(error)}` })
        }
      }
      const restoredRefs = await restoreAttachments(attachments, root.attachments, report.attachments)
      let children = 0
      for (let index = 0; index < root.children.length; index += 1) {
        const child = root.children[index]
        const childSeeded = child.header.isSeeded === true && child.seedIndex >= 0
        const childInherited = childSeeded ? child.seedIndex + 1 : undefined
        rewriteSessionRefs(child.events, idMap, childSeeded ? childInherited : 0)
        const childHeader: StoredHeader = {
          version: SESSION_FORMAT_VERSION,
          id: childIds[index],
          createdAt: validTime(child.header.createdAt) ?? createdAt,
          cwd: header.cwd,
          isSeeded: childSeeded,
          parentSession: idMap.get(child.header.parentSession) ?? header.id,
          origin: 'subagent',
          delegationDepth: childDepth(child.header, header),
        }
        const childWritten = await writeSession(persistence, projectionCache, childHeader, child.events, childInherited)
        if (!childWritten.ok) {
          report.failed.push({ entry: `${root.name}#${child.name}`, reason: childWritten.reason })
          continue
        }
        children += 1
      }
      report.restored.push({
        entry: root.name,
        sourceSessionId: source.id,
        sessionId: header.id,
        title: root.title,
        createdAt: header.createdAt,
        cwd: header.cwd ?? null,
        sourceCwd: source.cwd ?? null,
        events: root.events.length,
        subagents: children,
        attachments: restoredRefs,
        presetDropped,
        parentMissing,
        workspace: targetInfo,
        verify: verified,
      })
    } catch (error) {
      report.failed.push({ entry: root.name, reason: messageOf(error) })
    }
  }
  return report
}

/**
 * Write one Session log through the persistence service.
 * @param persistence - sessionPersistence service.
 * @param projectionCache - optional projection cache service.
 * @param header - validated storage header.
 * @param events - validated event list.
 * @returns success flag and the failure reason.
 */
async function writeSession(persistence, projectionCache, header, events, inheritedEventCount) {
  let handle
  let created = false
  try {
    handle = await persistence.create(header, inheritedEventCount === undefined ? undefined : { inheritedEventCount })
    created = true
    // Append in bounded batches: one 5 MB frame is legal Zstandard, but the
    // persistence decoder is built for the small batches a live Session writes.
    for (let offset = 0; offset < events.length; offset += APPEND_BATCH) {
      await handle.append(events.slice(offset, offset + APPEND_BATCH))
    }
    await handle.flush()
  } catch (error) {
    return { ok: false, created, reason: messageOf(error) }
  } finally {
    if (handle !== undefined) {
      try { await handle.close() } catch (error) { /* closing a failed handle is best effort */ }
    }
  }
  try {
    projectionCache?.coldSnapshot(header, 0, events)
  } catch (error) {
    // The projection cache rebuilds from the log; a cache failure must not undo the restore.
  }
  return { ok: true }
}

/** Event data keys that name a Session. */
const SESSION_REF_KEYS = new Set(['sessionId', 'parentSessionId', 'childSessionId', 'parentSession'])

/**
 * Replace embedded source Session references with the restored ids.
 * Delivery markers and lineage fields must name the Session that now owns the log.
 * @param events - event list to rewrite in place.
 * @param idMap - source id to restored id.
 */
function rewriteSessionRefs(events, idMap, offset = 0) {
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (value === null || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (SESSION_REF_KEYS.has(key) && typeof child === 'string' && idMap.has(child)) {
        value[key] = idMap.get(child)
        continue
      }
      walk(child)
    }
  }
  for (let index = offset; index < events.length; index += 1) walk(events[index].data)
}

/**
 * Remove a Session this import just created, when the service supports it.
 * @param persistence - sessionPersistence service.
 * @param id - the Session to remove.
 * @returns whether a removal call succeeded.
 */
async function removeSession(persistence, id) {
  for (const method of ['delete', 'remove', 'deleteSession']) {
    if (typeof persistence[method] !== 'function') continue
    try {
      await persistence[method](id)
      return true
    } catch (error) {
      // Try the next spelling; an unsupported method is expected.
    }
  }
  return false
}

/**
 * Re-open one just-written Session and read its first events back.
 * @param persistence - sessionPersistence service.
 * @param id - the written Session id.
 * @returns `'readable'`, or the failure text.
 */
async function verifySession(persistence, id, expected) {
  let reader
  try {
    reader = await persistence.open(id, 'read')
    let offset = 0
    let count = 0
    for (;;) {
      const result = await reader.read(offset, 5000)
      const events = Array.isArray(result.events) ? result.events : []
      if (events.length === 0) break
      count += events.length
      offset += events.length
      if (count > expected) break
    }
    if (count !== expected) return `unreadable: ${count}/${expected} events`
    return `readable:${count}`
  } catch (error) {
    return `unreadable: ${messageOf(error)}`
  } finally {
    if (reader !== undefined) {
      try { await reader.close() } catch (error) { /* verification only */ }
    }
  }
}

/**
 * Parse one inner package: root log, root title, and subagent logs.
 * @param inner - entries of one exported Session ZIP.
 * @param name - container entry name, used in failures.
 * @returns parsed package or an error.
 */
function parseInnerPackage(inner, name) {
  const logNames = [...inner.keys()].filter(entry => /(^|\/)session(\.v\d+)?\.jsonl$/.test(entry))
  const rootLog = logNames.find(entry => !entry.includes('/'))
  if (rootLog === undefined) return { name, error: 'no session log in package' }
  let root
  try {
    root = parseLog(inner.get(rootLog), rootLog)
  } catch (error) {
    return { name, error: messageOf(error) }
  }
  const children = []
  for (const entry of logNames) {
    if (entry === rootLog || !entry.includes('/')) continue
    try {
      const log = parseLog(inner.get(entry), entry)
      children.push({ name: entry, header: log.header, events: log.events, seedIndex: log.seedIndex })
    } catch (error) {
      return { name, error: `${entry}: ${messageOf(error)}` }
    }
  }
  const attachments = [...inner.entries()]
    .filter(([entry]) => entry.startsWith('media/') || entry.startsWith('files/'))
    .map(([entry, bytes]) => [entry, bytes])
  return {
    name,
    header: root.header,
    events: root.events,
    title: root.title,
    seedIndex: root.seedIndex,
    children,
    attachments,
  }
}

/**
 * Parse one canonical JSONL log: a header line, then event lines.
 * @param bytes - log bytes.
 * @param name - entry name for diagnostics.
 * @returns header, events, and the latest title.
 */
function parseLog(bytes, name) {
  if (bytes === undefined) throw new Error(`${name}: missing`)
  const text = new TextDecoder().decode(bytes)
  const lines = text.split('\n')
  let header
  const events = []
  let title = ''
  let seedIndex = -1
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    let value
    try {
      value = JSON.parse(trimmed)
    } catch (error) {
      throw new Error(`invalid JSON line: ${messageOf(error)}`)
    }
    if (header === undefined) {
      if (value === null || typeof value !== 'object' || value.type !== 'session') {
        throw new Error('first line is not a session header')
      }
      header = value
      continue
    }
    if (value === null || typeof value !== 'object' || typeof value.type !== 'string') continue
    events.push(value)
    if (value.type === 'session/title') title = titleOf(value) || title
    if (value.type === 'session/end-seed') seedIndex = events.length - 1
    if (events.length > MAX_EVENTS) throw new Error(`more than ${MAX_EVENTS} events`)
  }
  if (header === undefined) throw new Error('empty log')
  return { header, events, title, seedIndex }
}

/**
 * Read the title text of one `session/title` event.
 * @param event - title event.
 * @returns the title, or an empty string.
 */
function titleOf(event) {
  const data = event && event.data
  if (data === null || typeof data !== 'object') return ''
  for (const key of ['title', 'text', 'value']) {
    if (typeof data[key] === 'string' && data[key].trim() !== '') return data[key].trim()
  }
  return ''
}

/**
 * Choose the target Workspace: an explicit request, then a path match, then the first one.
 * @param workspaces - registered workspaces in durable order.
 * @param cwd - source Session working directory.
 * @param requestedId - Workspace the browser asked for.
 * @returns the chosen workspace and how it was chosen, or undefined when none is registered.
 */
function chooseWorkspace(workspaces, cwd, requestedId) {
  if (workspaces.length === 0) return undefined
  if (typeof requestedId === 'string' && requestedId !== '') {
    const requested = workspaces.find(workspace => workspace.id === requestedId)
    if (requested !== undefined) return { workspace: requested, mode: 'requested' }
  }
  if (typeof cwd === 'string' && cwd !== '') {
    const match = workspaces.find(workspace => samePath(workspace.path, cwd))
    if (match !== undefined) return { workspace: match, mode: 'cwd' }
  }
  return { workspace: workspaces[0], mode: 'fallback' }
}

/**
 * Subagent delegation depth for one restored child.
 * @param header - source child header.
 * @param parent - resolved parent header.
 * @returns the source depth when it is a positive integer, else parent depth plus one.
 */
function childDepth(header, parent) {
  if (typeof header.delegationDepth === 'number'
    && Number.isSafeInteger(header.delegationDepth) && header.delegationDepth >= 1) {
    return header.delegationDepth
  }
  return (typeof parent.delegationDepth === 'number' ? parent.delegationDepth : 0) + 1
}

/**
 * Ids of the agent presets this deployment knows, or undefined without a roster.
 * @param ctx - Host context.
 * @returns the known preset ids, or undefined.
 */
async function knownPresetIds(ctx) {
  const presets = ctx.get('agentPresets')
  if (presets === undefined || typeof presets.list !== 'function') return undefined
  try {
    const rows = await presets.list()
    return new Set(rows.map(row => row.id))
  } catch (error) {
    return undefined
  }
}

/**
 * Compare two absolute paths for equality, tolerating separators and case on Windows.
 * @param left - first path.
 * @param right - second path.
 * @returns whether both name one directory.
 */
function samePath(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const normalize = (value) => {
    const next = value.replace(/[\\/]+$/, '').replace(/\//g, '\\')
    return process.platform === 'win32' ? next.toLowerCase() : next
  }
  return normalize(left) === normalize(right)
}
/**
 * One JSON response.
 * @param status - HTTP status.
 * @param value - JSON body.
 * @returns the response.
 */
function jsonResponse(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/* HTTP 405 for other methods is answered by the route registry itself. */
