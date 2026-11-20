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
import { Unzip, UnzipInflate, UnzipPassThrough } from './vendor/fflate.mjs'

/** Absolute path of the archive upload route. */
const IMPORT_PATH = '/api/export-center.import'

/** Absolute path of the workspace listing route. */
const WORKSPACES_PATH = '/api/export-center.workspaces'

/** Largest container archive accepted from the browser. */
const MAX_UPLOAD_BYTES = 256 * 1024 * 1024

/** Largest declared uncompressed size of one archive entry. */
const MAX_ENTRY_BYTES = 64 * 1024 * 1024

/** Largest total uncompressed bytes one import may inflate. */
const MAX_TOTAL_UNCOMPRESSED = 512 * 1024 * 1024

/** Most archive ids remembered for duplicate reporting. */
const MAX_REMEMBERED_ARCHIVES = 500

/** Most Session logs one import writes. */
const MAX_SESSIONS = 500

/** Most events one Session log may carry. */
const MAX_EVENTS = 200000

/** Most events one persistence append writes. */
const APPEND_BATCH = 200

/** Current logical Session format version. */
const SESSION_FORMAT_VERSION = 4

/** Extensions accepted as image attachments, mapped to the media type. */
const IMAGE_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
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

/** Archive ids this Host process has already restored, so a repeat import can be reported. */
const importedArchives = new Map()

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
async function restoreArchive(ctx, container, options = {}) {
  const outer = readZip(container)
  const persistence = ctx.sessionPersistence
  const attachments = ctx.get('attachments')
  const projectionCache = ctx.get('sessionProjectionCache')
  const workspaces = ctx.workspaceRegistry.list()
  const presets = await knownPresetIds(ctx)
  const innerNames = [...outer.keys()].filter(name => /\.zip$/i.test(name)).sort()
  const report = {
    kind: 'dsh-export-center/import',
    archiveId: options.archiveId,
    duplicate: options.archiveId !== undefined && importedArchives.has(options.archiveId),
    restored: [],
    failed: [],
    attachments: { images: 0, files: 0, failed: [], converted: [] },
    sessions: [],
  }
  if (innerNames.length === 0) {
    report.failed.push({ entry: 'archive', reason: 'no session package found' })
    return report
  }

  const roots = []
  for (const name of innerNames.slice(0, MAX_SESSIONS)) {
    let inner
    try {
      inner = readZip(outer.get(name), name)
    } catch (error) {
      report.failed.push({ entry: name, reason: messageOf(error) })
      continue
    }
    const parsed = parseInnerPackage(inner, name)
    if (parsed.error !== undefined) {
      report.failed.push({ entry: name, reason: parsed.error })
      continue
    }
    roots.push(parsed)
  }

  for (const root of roots) {
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

      const header = {
        version: SESSION_FORMAT_VERSION,
        id: rootId,
        createdAt: finiteTime(source.createdAt),
        cwd: target === undefined ? undefined : target.workspace.path,
        isSeeded: seeded,
      }
      if (typeof source.delegationDepth === 'number' && Number.isSafeInteger(source.delegationDepth)) {
        header.delegationDepth = Math.max(0, source.delegationDepth)
      }
      const presetDropped = typeof source.agentPreset === 'string' && source.agentPreset !== ''
        && presets !== undefined && !presets.has(source.agentPreset)
      if (typeof source.agentPreset === 'string' && source.agentPreset !== '' && !presetDropped) {
        header.agentPreset = source.agentPreset
      }
      const written = await writeSession(persistence, projectionCache, header, root.events, inherited)
      if (!written.ok) {
        report.failed.push({
          entry: root.name,
          reason: written.reason,
          residualSessionId: written.created ? header.id : undefined,
        })
        continue
      }
      const verified = await verifySession(persistence, header.id)
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
        const childHeader = {
          version: SESSION_FORMAT_VERSION,
          id: childIds[index],
          createdAt: finiteTime(child.header.createdAt),
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
 * Re-open one just-written Session and read its first events back.
 * @param persistence - sessionPersistence service.
 * @param id - the written Session id.
 * @returns `'readable'`, or the failure text.
 */
async function verifySession(persistence, id) {
  let reader
  try {
    reader = await persistence.open(id, 'read')
    const result = await reader.read(0, 10)
    const count = Array.isArray(result.events) ? result.events.length : -1
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
 * Re-save every attachment carried by one package.
 * @param attachments - optional attachment service.
 * @param entries - attachment bytes keyed by archive name.
 * @param counters - report counters updated in place.
 * @returns how many images and files were stored.
 */
async function restoreAttachments(attachments, entries, counters) {
  const result = { images: 0, files: 0 }
  if (attachments === undefined) {
    if (entries.length > 0) counters.failed.push({ entry: '(all)', reason: 'attachment service unavailable' })
    return result
  }
  for (const [name, bytes] of entries) {
    const base = name.slice(name.lastIndexOf('/') + 1)
    try {
      if (name.startsWith('media/')) {
        const mediaType = mediaTypeOf(name, bytes)
        if (mediaType !== undefined) {
          try {
            await attachments.saveImage({ data: bytes, mediaType, name: base })
            counters.images += 1
            result.images += 1
            continue
          } catch (error) {
            // An image the store refuses (unknown or oversized format) is kept
            // verbatim as a file so the bytes still travel with the Session.
            await attachments.saveFile({ data: bytes, name: base })
            counters.files += 1
            result.files += 1
            counters.converted.push({ entry: name, reason: messageOf(error) })
            continue
          }
        }
        await attachments.saveFile({ data: bytes, name: base })
        counters.files += 1
        result.files += 1
        counters.converted.push({ entry: name, reason: 'unsupported image format; stored as a file' })
      } else if (name.startsWith('files/')) {
        await attachments.saveFile({ data: bytes, name: base })
        counters.files += 1
        result.files += 1
      }
    } catch (error) {
      counters.failed.push({ entry: name, reason: messageOf(error) })
    }
  }
  return result
}

/**
 * Detect a supported image media type from the entry name or its magic bytes.
 * @param name - archive entry name.
 * @param bytes - stored bytes.
 * @returns the media type, or undefined when the format is not one the image store accepts.
 */
function mediaTypeOf(name, bytes) {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (IMAGE_TYPES[extension] !== undefined) return IMAGE_TYPES[extension]
  if (bytes.length >= 8) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  }
  return undefined
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
 * A new durable Session id.
 * @returns `session-<uuid>`.
 */
function sessionId() {
  return `session-${randomUUID()}`
}

/**
 * Coerce a source timestamp to a non-negative safe integer.
 * @param value - candidate timestamp.
 * @returns the timestamp when valid, otherwise the current time.
 */
function finiteTime(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  return Date.now()
}

/**
 * Read every entry of a ZIP archive with fflate's streaming reader.
 *
 * The central directory is caller-supplied data, so every entry is bounded as
 * it is produced rather than as it is declared, and the whole archive has a
 * cumulative output budget. fflate owns the structural side (ZIP64, data
 * descriptors, malformed headers) and reports per-entry errors through the
 * file callback.
 * @param bytes - archive bytes.
 * @param name - archive label used in diagnostics.
 * @returns entry name to uncompressed bytes.
 */
function readZip(bytes, name = 'archive') {
  const crcByName = zipCrcMap(bytes)
  if (crcByName === undefined) throw new Error(`${name}: missing or damaged central directory`)
  const entries = new Map()
  let failure
  let total = 0
  const unzip = new Unzip()
  unzip.register(UnzipInflate)
  unzip.register(UnzipPassThrough)
  unzip.onfile = (file) => {
    if (failure !== undefined) return
    if (file.name.endsWith('/')) return
    const chunks = []
    let size = 0
    file.ondata = (error, chunk, final) => {
      if (failure !== undefined) return
      if (error) {
        failure = new Error(`${name}/${file.name}: ${messageOf(error)}`)
        if (typeof file.terminate === 'function') file.terminate()
        return
      }
      size += chunk.length
      total += chunk.length
      if (size > MAX_ENTRY_BYTES) {
        failure = new Error(`${name}/${file.name}: entry exceeds ${MAX_ENTRY_BYTES} bytes`)
        if (typeof file.terminate === 'function') file.terminate()
        return
      }
      if (total > MAX_TOTAL_UNCOMPRESSED) {
        failure = new Error(`${name}: uncompressed total exceeds ${MAX_TOTAL_UNCOMPRESSED} bytes`)
        if (typeof file.terminate === 'function') file.terminate()
        return
      }
      chunks.push(chunk)
      if (final) {
        const output = joinChunks(chunks, size)
        const expected = crcByName === undefined ? undefined : crcByName.get(file.name)
        if (expected !== undefined && crc32(output) !== expected) {
          failure = new Error(`${name}/${file.name}: CRC mismatch`)
          if (typeof file.terminate === 'function') file.terminate()
          return
        }
        entries.set(file.name, output)
      }
    }
    file.start()
  }
  try {
    unzip.push(bytes, true)
  } catch (error) {
    throw new Error(`${name}: ${messageOf(error)}`)
  }
  if (failure !== undefined) throw failure
  return entries
}

/**
 * Join byte chunks into one array.
 * @param chunks - produced chunks.
 * @param length - total byte length.
 * @returns the joined bytes.
 */
function joinChunks(chunks, length) {
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}
/** CRC-32 lookup table. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

/** CRC-32 of one byte array. */
function crc32(bytes) {
  let value = 0xffffffff
  for (let index = 0; index < bytes.length; index += 1) {
    value = CRC_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

/**
 * Read the recorded CRC-32 of every entry from the central directory.
 * fflate streams and validates the archive structure but does not expose the
 * expected checksum, so integrity is checked here.
 * @param bytes - archive bytes.
 * @returns entry name to CRC, or undefined when the directory cannot be read.
 */
function zipCrcMap(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = findEndOfCentralDirectory(view, bytes.length)
  if (end < 0) return undefined
  const count = view.getUint16(end + 10, true)
  let cursor = view.getUint32(end + 16, true)
  const map = new Map()
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) return undefined
    const expected = view.getUint32(cursor + 16, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const entryName = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
    map.set(entryName, expected)
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return map
}

/** Find the end-of-central-directory record. */
function findEndOfCentralDirectory(view, length) {
  const earliest = Math.max(0, length - 0xffff - 22)
  for (let offset = length - 22; offset >= earliest; offset -= 1) {
    if (offset >= 0 && view.getUint32(offset, true) === 0x06054b50) return offset
  }
  return -1
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

/**
 * Human-readable failure text.
 * @param error - unknown failure.
 * @returns message text.
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/* HTTP 405 for other methods is answered by the route registry itself. */
