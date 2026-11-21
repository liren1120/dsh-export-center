/**
 * Self-contained tests for the Host half: no network, no browser, no DSH.
 *
 *   node test/run.mjs
 *
 * The fixtures build real ZIP archives in memory (stored and deflated) so the
 * archive reader is exercised against forged sizes, bad CRC, truncation, and
 * decompression bombs.
 */
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateRawSync } from 'node:zlib'

// Keep duplicate-detection state out of the real profile.
process.env.DSH_EXPORT_CENTER_STATE_DIR = mkdtempSync(join(tmpdir(), 'export-center-test-'))
const { apply } = await import('../index.js')

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

function crc32(bytes) {
  let value = 0xffffffff
  for (let index = 0; index < bytes.length; index += 1) {
    value = CRC_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

function buildZip(entries, forge = {}) {
  const chunks = []
  const central = []
  let offset = 0
  for (const rawEntry of entries) {
    const entry = Array.isArray(rawEntry) ? { name: rawEntry[0], raw: rawEntry[1] } : rawEntry
    const nameBytes = Buffer.from(entry.name, 'utf8')
    const raw = Buffer.isBuffer(entry.raw) ? entry.raw : Buffer.from(entry.raw)
    const data = entry.deflate ? deflateRawSync(raw) : raw
    const checksum = entry.crc ?? crc32(raw)
    const declared = forge[entry.name] ?? raw.length
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(entry.deflate ? 8 : 0, 8)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(declared, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    chunks.push(local, nameBytes, data)
    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0)
    dir.writeUInt16LE(20, 4)
    dir.writeUInt16LE(20, 6)
    dir.writeUInt16LE(0x0800, 8)
    dir.writeUInt16LE(entry.deflate ? 8 : 0, 10)
    dir.writeUInt32LE(checksum, 16)
    dir.writeUInt32LE(data.length, 20)
    dir.writeUInt32LE(declared, 24)
    dir.writeUInt16LE(nameBytes.length, 28)
    dir.writeUInt32LE(offset, 42)
    central.push(dir, nameBytes)
    offset += local.length + nameBytes.length + data.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, directory, end])
}

function sessionLog(sourceId, extra = {}) {
  const header = {
    type: 'session',
    version: 4,
    id: sourceId,
    createdAt: 1700000000000,
    cwd: 'C:\\source\\work',
    isSeeded: false,
    delegationDepth: 0,
    agentPreset: 'standard',
    ...extra.header,
  }
  const events = [
    { type: 'session/title', seq: 0, time: 1700000000001, data: { title: 'Fixture session' } },
    { type: 'session-log-deepseek/delivery-accepted', seq: 1, time: 1700000000002, data: { sessionId: sourceId } },
    ...(extra.events ?? []),
  ]
  return `${JSON.stringify(header)}\n${events.map((event) => JSON.stringify(event)).join('\n')}\n`
}

function packageFor(sourceId, options = {}) {
  const entries = [{ name: 'session.v4.jsonl', raw: sessionLog(sourceId, options) }]
  if (options.child !== undefined) {
    const childHeader = {
      type: 'session',
      version: 4,
      id: options.child.id,
      createdAt: 1700000000010,
      cwd: 'C:\\source\\work',
      isSeeded: false,
      parentSession: sourceId,
      origin: 'subagent',
      delegationDepth: options.child.depth ?? 1,
    }
    const childEvent = { type: 'user/message', seq: 0, time: 1700000000011, data: { content: [{ type: 'text', text: 'child' }], source: { kind: 'user' } } }
    entries.push({ name: `subagents/${options.child.id}/session.v4.jsonl`, raw: `${JSON.stringify(childHeader)}\n${JSON.stringify(childEvent)}\n` })
  }
  for (const [name, bytes] of options.attachments ?? []) entries.push({ name, raw: bytes })
  return buildZip(entries)
}

/** Wrap Session packages in a container with the manifest the Host validates. */
function wrapContainer(pairs, manifest = {}) {
  const head = {
    kind: 'dsh-export-center/sessions',
    schema: 2,
    exportedAt: new Date().toISOString(),
    sessions: pairs.map(([entry]) => ({ entry })),
    ...manifest,
  }
  return buildZip([['manifest.json', Buffer.from(JSON.stringify(head))], ...pairs])
}

function harness(options = {}) {
  const routes = []
  const writes = []
  const createOptions = []
  const attached = []
  const attachments = []
  const ctx = {
    effect: (fn) => fn(),
    connection: { fetch: { register: (route) => { routes.push(route); return () => {} } } },
    sessionPersistence: {
      create: async (header, options) => {
        header.appended = []
        writes.push(header)
        createOptions.push(options)
        return {
          append: async (events) => { header.appended.push(...events) },
          flush: async () => {},
          close: async () => {},
        }
      },
      delete: async (id) => {
        const index = writes.findIndex((header) => header.id === id)
        if (index >= 0) writes.splice(index, 1)
      },
      open: async (id) => {
        if (options.verifyFails === true) throw new Error('simulated unreadable log')
        const target = writes.find((header) => header.id === id)
        const events = target === undefined ? [] : target.appended
        return {
          read: async (offset, limit) => ({ events: events.slice(offset, offset + limit) }),
          close: async () => {},
        }
      },
    },
    workspaceRegistry: {
      list: () => [
        { id: 'first', path: 'C:\\first', title: 'first', attachSession: async (id) => attached.push(['first', id]) },
        { id: 'second', path: 'Z:\\工作区', title: '工作区', attachSession: async (id) => attached.push(['second', id]) },
      ],
    },
    get: (name) => {
      if (name === 'attachments') {
        return {
          saveImage: async (input) => { attachments.push(['image', input.mediaType, input.name]); return { id: options.imageId ?? input.name.replace(/\.[^.]+$/, '') } },
          saveFile: async (input) => { attachments.push(['file', input.name, input.data.length]); return {} },
        }
      }
      if (name === 'agentPresets') return { list: async () => [{ id: 'standard' }] }
      return undefined
    },
  }
  apply(ctx)
  const post = routes.find((route) => route.path.endsWith('.import')).fetch
  const get = routes.find((route) => route.path.endsWith('.workspaces')).fetch
  return {
    post: async (query, body) => {
      const response = await post(new Request(`http://127.0.0.1/api/export-center.import?${query}`, { method: 'POST', body }))
      return { status: response.status, report: await response.json() }
    },
    get,
    writes,
    createOptions,
    attached,
    attachments,
  }
}

let failures = 0
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`ok   ${name}`)
  } else {
    failures += 1
    console.log(`FAIL ${name}${detail === '' ? '' : ` — ${detail}`}`)
  }
}

// 1. honest archive restores one Session with the original time and a rewritten delivery id
{
  const h = harness()
  const container = wrapContainer([['sessions/a.zip', packageFor('session-source', { attachments: [['media/pic.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], ['files/ab/abcd/report.txt', Buffer.from('body')]] })]])
  const { status, report } = await h.post('workspaceId=second&archiveId=archive-1', container)
  check('honest archive accepted', status === 200, JSON.stringify(report.failed))
  check('one Session restored', report.restored.length === 1)
  check('original createdAt kept', report.restored[0]?.createdAt === 1700000000000)
  check('requested workspace used', report.restored[0]?.workspace?.mode === 'requested' && report.restored[0]?.workspace?.id === 'second')
  check('image stored as image', report.attachments.images === 1)
  check('file stored as file', report.attachments.files === 1)
  check('Session attached', h.attached.length === 1)
  const written = h.writes[0]
  check('delivery marker names the new Session', JSON.stringify(written) !== '' && written.id !== 'session-source')
}

// 2. duplicate archive id is reported but still restored
{
  const h = harness()
  const container = wrapContainer([['sessions/a.zip', packageFor('session-source')]])
  await h.post('archiveId=same', container)
  const { report } = await h.post('archiveId=same', container)
  check('duplicate flagged', report.duplicate === true)
  check('duplicate still restored', report.restored.length === 1)
}

// 3. decompression bomb is rejected without killing the process
{
  const h = harness()
  const bomb = buildZip([{ name: 'session.v4.jsonl', raw: Buffer.alloc(70 * 1024 * 1024), deflate: true }], { 'session.v4.jsonl': 1 })
  const { status, report } = await h.post('', wrapContainer([['sessions/bomb.zip', bomb]]))
  check('bomb rejected', status === 422)
  check('bomb reason names the limit', String(report.failed[0]?.reason).includes('exceeds'))
}

// 4. bad CRC is rejected
{
  const h = harness()
  const bad = buildZip([{ name: 'session.v4.jsonl', raw: sessionLog('session-crc'), crc: 1 }])
  const { status, report } = await h.post('', wrapContainer([['sessions/bad.zip', bad]]))
  check('bad CRC rejected', status === 422)
  check('bad CRC reason', String(report.failed[0]?.reason).includes('CRC'))
}

// 5. truncated archive is rejected
{
  const h = harness()
  const good = packageFor('session-trunc')
  const { status, report } = await h.post('', wrapContainer([['sessions/t.zip', good.subarray(0, good.length - 10)]]))
  check('truncated rejected', status === 422)
  check('truncated reason', String(report.failed[0]?.reason).includes('central directory'))
}

// 6. subagent depth, parent link, and unknown preset
{
  const h = harness()
  const container = wrapContainer([['sessions/c.zip', packageFor('session-parent', {
    header: { agentPreset: 'unknown-preset' },
    child: { id: 'session-child', depth: 2 },
  })]])
  const { report } = await h.post('', container)
  check('unknown preset dropped', report.restored[0]?.presetDropped === true)
  check('child restored', report.restored[0]?.subagents === 1)
  const childHeader = h.writes.find((header) => header.origin === 'subagent')
  check('child keeps its depth', childHeader?.delegationDepth === 2)
  check('child parent is the new root', childHeader?.parentSession === report.restored[0]?.sessionId)
}

// 7. unsupported image format is stored as a file
{
  const h = harness()
  const container = wrapContainer([['sessions/d.zip', packageFor('session-avif', {
    attachments: [['media/pic.avif', Buffer.from([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])]],
  })]])
  const { report } = await h.post('', container)
  check('AVIF converted to file', report.attachments.files === 1 && report.attachments.converted.length === 1)
}

// 8. workspace listing route
{
  const h = harness()
  const response = await h.get(new Request('http://127.0.0.1/api/export-center.workspaces'))
  const body = await response.json()
  check('workspaces listed', response.status === 200 && body.workspaces.length === 2)
}

// 9. a forked Session keeps its seeded prefix and inherited cut
{
  const h = harness()
  const header = { type: 'session', version: 4, id: 'session-fork', createdAt: 1700000000000, cwd: 'C:\\source', isSeeded: true, delegationDepth: 0 }
  const events = [
    { type: 'session-log-deepseek/delivery-accepted', seq: 0, time: 1700000000001, data: { sessionId: 'session-fork' } },
    { type: 'session/end-seed', seq: 1, time: 1700000000002, data: { inherited: true } },
    { type: 'session-log-deepseek/delivery-accepted', seq: 2, time: 1700000000003, data: { sessionId: 'session-fork' } },
  ]
  const log = [header, ...events].map((value) => JSON.stringify(value)).join('\n') + '\n'
  const container = wrapContainer([['sessions/f.zip', buildZip([{ name: 'session.v4.jsonl', raw: log }])]])
  const { report } = await h.post('', container)
  check('fork restored', report.restored.length === 1)
  check('seeded header preserved', h.writes[0]?.isSeeded === true)
  check('inherited cut passed', h.createOptions[0]?.inheritedEventCount === 2)
  const appended = h.writes[0]?.appended ?? []
  check('inherited prefix keeps its session reference', appended[0]?.data?.sessionId === 'session-fork')
  check('own delivery marker follows the new Session', appended[2]?.data?.sessionId !== 'session-fork')
}

// 10. the package ships what its documents promise
{
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  check('tests are part of the package', Array.isArray(pkg.files) && pkg.files.includes('test'))
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  check('README documents encrypted exports', readme.includes('## Encrypted exports'))
  const index = JSON.parse(readFileSync(new URL('../market/index.json', import.meta.url), 'utf8'))
  check('market description names the DSH range', String(index.plugins[0].description.en).includes('0.2.2-rc.5'))
}

console.log(failures === 0 ? '\nall tests passed' : `\n${failures} test(s) failed`)
// 11. the container manifest is a gate, not decoration
{
  const h = harness()
  const missing = buildZip([['sessions/a.zip', packageFor('session-no-manifest')]])
  const { status, report } = await h.post('', missing)
  check('missing manifest rejected', status === 422 && String(report.failed[0]?.reason).includes('manifest'))
}
{
  const h = harness()
  const bad = wrapContainer([['sessions/a.zip', packageFor('session-future')]], { schema: 99 })
  const { status, report } = await h.post('', bad)
  check('newer schema rejected', status === 422 && String(report.failed[0]?.reason).includes('newer'))
}

// 12. a header without a usable createdAt fails alone instead of inventing "now"
{
  const h = harness()
  const bad = wrapContainer([['sessions/a.zip', packageFor('session-time', { header: { createdAt: 'yesterday' } })]])
  const { report } = await h.post('', bad)
  check('invalid createdAt reported', report.restored.length === 0 && String(report.failed[0]?.reason).includes('createdAt'))
}

// 13. the restored log is read back to its full length
{
  const h = harness()
  const { report } = await h.post('', wrapContainer([['sessions/a.zip', packageFor('session-verify')]]))
  check('full log verified', String(report.restored[0]?.verify).startsWith('readable:'))
}

// 14. an attachment id that changes is reported, not hidden
{
  const h = harness({ imageId: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' })
  const media = [['media/sha256:1111111111111111111111111111111111111111111111111111111111111111.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 1])]]
  const { report } = await h.post('', wrapContainer([['sessions/a.zip', packageFor('session-attach', { attachments: media })]]))
  check('attachment id mismatch reported', report.attachments.idMismatch.length === 1)
}

// 15. a child exported alone becomes a root, not a parentless child
{
  const h = harness()
  const orphan = packageFor('session-orphan', { header: { parentSession: 'missing-parent', delegationDepth: 2 } })
  const { report } = await h.post('', wrapContainer([['sessions/a.zip', orphan]]))
  check('orphan marked', report.restored[0]?.parentMissing === true)
  check('orphan depth reset', h.writes[0]?.delegationDepth === 0)
}

// 16. packages beyond the limit are reported, never dropped silently
{
  const h = harness()
  const pairs = []
  for (let index = 0; index < 501; index += 1) {
    pairs.push([`sessions/s${index}.zip`, packageFor(`session-limit-${index}`)])
  }
  const { report } = await h.post('', wrapContainer(pairs))
  check('limit reported', report.skipped.length === 1)
  check('limit restores the first 500', report.restored.length === 500)
}

// 17. archive ids survive the process
{
  const h = harness()
  const { report } = await h.post('archiveId=archive-persisted', wrapContainer([['sessions/a.zip', packageFor('session-persist')]]))
  check('persisted import happens', report.restored.length === 1)
  const state = JSON.parse(readFileSync(join(process.env.DSH_EXPORT_CENTER_STATE_DIR, 'imports.json'), 'utf8'))
  check('archive id persisted', state.entries.some(([id]) => id === 'archive-persisted'))
}

// 18. client-side guarantees that only exist in the browser bundle
{
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const match = client.match(/function sameSample\(left, right\) \{[\s\S]*?\n    \}/)
  check('sameSample shipped', match !== null)
  if (match !== null) {
    const sameSample = new Function(`${match[0]}\nreturn sameSample`)()
    const base = new Uint8Array(256)
    for (let index = 0; index < base.length; index += 1) base[index] = index % 251
    const copy = base.slice()
    const middle = base.slice()
    middle[128] = 0
    check('sameSample accepts equal bytes', sameSample(base, copy))
    check('sameSample rejects a middle change', !sameSample(base, middle))
    check('sameSample rejects a shorter array', !sameSample(base, base.subarray(0, 255)))
  }
  check('watermark advances only on a clean run', client.includes('if (failures.length === 0 && skipped.length === 0)'))
  check('password policy shipped', client.includes('encryptTooShort'))
  check('plaintext and untrusted notices shipped', client.includes('plaintextHint') && client.includes('importUntrusted'))
}

// 19. an unreadable restore is rolled back when the service can delete
{
  const h = harness({ verifyFails: true })
  const { report } = await h.post('', wrapContainer([['sessions/a.zip', packageFor('session-rollback')]]))
  check('unreadable restore reported', report.restored.length === 0 && String(report.failed[0]?.reason).startsWith('unreadable'))
  check('unreadable restore rolled back', report.failed[0]?.rolledBack === true && h.writes.length === 0)
}

// 20. a real archive from this machine parses, when one is offered
{
  const real = process.env.DSH_EXPORT_CENTER_REAL_ARCHIVE
  if (real === undefined || !existsSync(real)) {
    console.log('skip real archive (set DSH_EXPORT_CENTER_REAL_ARCHIVE to a container)')
  } else {
    const h = harness()
    const { status, report } = await h.post('', readFileSync(real))
    check('real archive accepted', status === 200, JSON.stringify(report.failed).slice(0, 200))
    check('real archive restores at least one Session', report.restored.length >= 1)
    check('real archive verified', report.restored.every((item) => String(item.verify).startsWith('readable:')))
    check('real archive manifest read', report.manifest !== null && report.manifest.schema === 2)
  }
}

// 21. client-side spec policy for imported inventories
{
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const match = client.match(/function classifySpec\(spec\) \{[\s\S]*?\n    \}/)
  check('classifySpec shipped', match !== null)
  if (match !== null) {
    const classifySpec = new Function(`${match[0]}\nreturn classifySpec`)()
    check('npm spec trusted', classifySpec('dsh-unlag@1.2.3').trust === 'known')
    check('scoped npm spec trusted', classifySpec('@scope/name@0.1.0').trust === 'known')
    check('gitee git spec trusted', classifySpec('git+https://gitee.com/owner/repo.git#abc').trust === 'known')
    check('github git spec trusted', classifySpec('git+https://github.com/owner/repo').trust === 'known')
    check('local link spec needs trust', classifySpec('link:../plugin').trust !== 'known')
    check('plain http spec needs trust', classifySpec('http://example.com/x.tgz').trust !== 'known')
  }
}

console.log(failures === 0 ? 'all tests passed' : `${failures} test(s) failed`)
process.exit(failures === 0 ? 0 : 1)
