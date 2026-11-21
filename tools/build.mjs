/**
 * Build the release archive deterministically.
 *
 *   node tools/build.mjs [--out <directory>]
 *
 * The archive contains exactly what package.json `files` promises, with a
 * fixed timestamp, sorted entry order, and stored (uncompressed) entries, so
 * the same tree always yields the same bytes and the same SHA-256.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const outIndex = process.argv.indexOf('--out')
const outDir = outIndex >= 0 ? process.argv[outIndex + 1] : join(root, 'dist')

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

function walk(directory) {
  const out = []
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name)
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

const include = [
  'index.js', 'client.js', 'host', 'cordis.patch.yml', 'icon.svg', 'version.json',
  'package.json', 'README.md', 'LICENSE', 'CHANGELOG.md',
  'vendor', 'locale', 'docs', 'market', 'test',
]
const files = []
for (const item of include) {
  const path = join(root, item)
  const info = statSync(path, { throwIfNoEntry: false })
  if (info === undefined) throw new Error(`missing packaged path: ${item}`)
  if (info.isDirectory()) files.push(...walk(path))
  else files.push(path)
}
files.sort((left, right) => relative(root, left).localeCompare(relative(root, right)))

const localParts = []
const centralParts = []
let offset = 0
for (const file of files) {
  const name = relative(root, file).split('\\').join('/')
  const nameBytes = Buffer.from(name, 'utf8')
  const bytes = readFileSync(file)
  const checksum = crc32(bytes)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0x0800, 6)
  local.writeUInt16LE(0, 8)
  local.writeUInt16LE(0, 10)
  local.writeUInt16LE(0, 12)
  local.writeUInt32LE(checksum, 14)
  local.writeUInt32LE(bytes.length, 18)
  local.writeUInt32LE(bytes.length, 22)
  local.writeUInt16LE(nameBytes.length, 26)
  local.writeUInt16LE(0, 28)
  localParts.push(local, nameBytes, bytes)

  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(0x0800, 8)
  central.writeUInt16LE(0, 10)
  central.writeUInt16LE(0, 12)
  central.writeUInt16LE(0, 14)
  central.writeUInt32LE(checksum, 16)
  central.writeUInt32LE(bytes.length, 20)
  central.writeUInt32LE(bytes.length, 24)
  central.writeUInt16LE(nameBytes.length, 28)
  central.writeUInt16LE(0, 30)
  central.writeUInt16LE(0, 32)
  central.writeUInt16LE(0, 34)
  central.writeUInt16LE(0, 36)
  central.writeUInt32LE(0, 38)
  central.writeUInt32LE(offset, 42)
  centralParts.push(central, nameBytes)
  offset += local.length + nameBytes.length + bytes.length
}

const centralBytes = Buffer.concat(centralParts)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(centralBytes.length, 12)
end.writeUInt32LE(offset, 16)
const archive = Buffer.concat([...localParts, centralBytes, end])

mkdirSync(outDir, { recursive: true })
const target = join(outDir, `${pkg.name}-${pkg.version}.zip`)
writeFileSync(target, archive)
const digest = createHash('sha256').update(archive).digest('hex')
writeFileSync(`${target}.sha256`, `${digest}  ${pkg.name}-${pkg.version}.zip\n`)
console.log(`files ${files.length}`)
console.log(`zip   ${target}`)
console.log(`bytes ${archive.length}`)
console.log(`sha256 ${digest}`)
