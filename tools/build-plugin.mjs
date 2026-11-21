/**
 * Compile the TypeScript host source into the shipped JavaScript.
 *
 *   node tools/build-plugin.mjs          emit index.js, host/*.js, vendor/fflate.mjs
 *   node tools/build-plugin.mjs --check  fail when any committed artifact is stale
 *
 * The compiler is a dev dependency; the emitted files are committed so an
 * install never needs a build step.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsc = join(root, 'node_modules/typescript/bin/tsc')
if (!existsSync(tsc)) {
  console.error('typescript is not installed; run npm install first')
  process.exit(1)
}

const checkOnly = process.argv.includes('--check')
const outDir = mkdtempSync(join(tmpdir(), 'export-center-build-'))
let stale = 0
let written = 0

function compareOrCopy(source, target) {
  const bytes = readFileSync(source)
  if (checkOnly) {
    const current = existsSync(target) ? readFileSync(target) : undefined
    if (current === undefined || !current.equals(bytes)) {
      console.error(`stale ${relative(root, target)}`)
      stale += 1
    }
    return
  }
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(source, target)
  written += 1
}

try {
  execFileSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.build.json'), '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
  })
  for (const name of readdirSync(outDir).sort()) {
    const path = join(outDir, name)
    if (name.endsWith('.js')) compareOrCopy(path, join(root, name))
    else if (name === 'host') {
      for (const entry of readdirSync(path).sort()) {
        if (entry.endsWith('.js')) compareOrCopy(join(path, entry), join(root, 'host', entry))
      }
    }
  }
  compareOrCopy(join(root, 'src', 'vendor', 'fflate.mjs'), join(root, 'vendor', 'fflate.mjs'))
  compareOrCopy(join(root, 'src', 'client', 'client.js'), join(root, 'client.js'))

  if (checkOnly) {
    if (stale > 0) {
      console.error(`${stale} artifact(s) are out of date; run node tools/build-plugin.mjs`)
      process.exit(1)
    }
    console.log('committed artifacts match src/')
  } else {
    console.log(`emitted ${written} artifact(s)`)
  }
} finally {
  rmSync(outDir, { recursive: true, force: true })
}
