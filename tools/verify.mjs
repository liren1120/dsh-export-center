/**
 * Repository / package consistency gate.
 *
 *   node tools/verify.mjs
 *
 * Runs the Host suite and checks that the version, the package contents, the
 * documents, and the market index all agree. Exit code 1 on any mismatch.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || detail === '' ? '' : ` — ${detail}`}`)
  if (!ok) problems.push(name)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const versionFile = JSON.parse(readFileSync(join(root, 'version.json'), 'utf8'))
const client = readFileSync(join(root, 'client.js'), 'utf8')
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const market = JSON.parse(readFileSync(join(root, 'market/index.json'), 'utf8'))

const buildVersion = client.match(/const BUILD_VERSION = '([^']+)'/)?.[1]
check('package.json version', typeof pkg.version === 'string' && /^\d+\.\d+\.\d+$/.test(pkg.version), pkg.version)
check('version.json agrees', versionFile.version === pkg.version, `${versionFile.version} vs ${pkg.version}`)
check('client BUILD_VERSION agrees', buildVersion === pkg.version, `${buildVersion} vs ${pkg.version}`)
check('CHANGELOG has this version', changelog.includes(`## ${pkg.version}`))
check('README documents tests', readme.includes('## Tests'))
check('README documents encryption', readme.includes('## Encrypted exports'))
check('license is MIT', readFileSync(join(root, 'LICENSE'), 'utf8').includes('MIT'))

for (const item of ['index.js', 'client.js', 'vendor/fflate.mjs', 'test/run.mjs', 'docs/DETAIL.md', 'market/index.json', 'locale/zh.json', 'locale/en.json']) {
  check(`packaged file ${item}`, existsSync(join(root, item)))
}
check('files lists test', Array.isArray(pkg.files) && pkg.files.includes('test'))
check('files lists vendor', Array.isArray(pkg.files) && pkg.files.includes('vendor'))

const entry = market.plugins?.[0]
const categories = market.metadata?.categories ?? {}
check('market entry declares a category', typeof entry?.metadata?.category === 'string')
if (typeof entry?.metadata?.category === 'string') {
  check('market category is declared', Object.hasOwn(categories, entry.metadata.category))
  check('market category has an English title', typeof categories[entry.metadata.category]?.title?.en === 'string')
}
const latest = market.plugins?.[0]?.versions?.[0]
if (process.env.RELEASE === '1') {
  check('market lists this version', latest?.version === pkg.version, `${latest?.version} vs ${pkg.version}`)
} else {
  console.log(`info market is at ${latest?.version}; set RELEASE=1 after updating it`)
}
check('market commit is pinned', typeof latest?.source?.commit === 'string' && /^[0-9a-f]{40}$/.test(latest.source.commit))
check('market engine range stated', String(market.plugins?.[0]?.description?.en ?? '').includes('0.2.2-rc.5'))

try {
  execFileSync(process.execPath, [join(root, 'tools/build-plugin.mjs'), '--check'], { cwd: root, stdio: 'inherit' })
  check('host build is current', true)
} catch (error) {
  check('host build is current', false, 'index.js does not match index.ts')
}
const tsc = join(root, 'node_modules/typescript/bin/tsc')
if (existsSync(tsc)) {
  try {
    execFileSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' })
    execFileSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.client.json')], { cwd: root, stdio: 'inherit' })
    check('typecheck', true)
  } catch (error) {
    check('typecheck', false, 'tsc reported errors')
  }
} else {
  console.log('info dev dependencies are absent; skipping typecheck')
}
const workspace = join(root, '..', '..')
let realArchive = process.env.DSH_EXPORT_CENTER_REAL_ARCHIVE
if (realArchive === undefined) {
  try {
    const candidate = readdirSync(workspace).find((name) => /^会话备份-.*\.zip$/.test(name))
    if (candidate !== undefined) realArchive = join(workspace, candidate)
  } catch (error) {
    // A checkout without a neighbouring export is normal.
  }
}
try {
  execFileSync(process.execPath, [join(root, 'test/run.mjs')], { cwd: root, stdio: 'inherit', env: { ...process.env, ...(realArchive === undefined ? {} : { DSH_EXPORT_CENTER_REAL_ARCHIVE: realArchive }) } })
  check('host suite', true)
} catch (error) {
  check('host suite', false, 'test/run.mjs failed')
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s): ${problems.join(', ')}`)
  process.exit(1)
}
console.log('\nrepository verified')
