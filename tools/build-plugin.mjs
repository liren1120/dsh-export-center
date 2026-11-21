/**
 * Compile the TypeScript host source into the shipped `index.js`.
 *
 *   node tools/build-plugin.mjs          emit and write index.js
 *   node tools/build-plugin.mjs --check  fail when index.js is out of date
 *
 * The compiler is the repository's dev dependency; the emitted file is
 * committed so an install never needs a build step.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsc = join(root, 'node_modules/typescript/bin/tsc')
if (!existsSync(tsc)) {
  console.error('typescript is not installed; run npm install first')
  process.exit(1)
}

const outDir = mkdtempSync(join(tmpdir(), 'export-center-build-'))
try {
  execFileSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.build.json'), '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
  })
  const emitted = readFileSync(join(outDir, 'index.js'))
  const target = join(root, 'index.js')
  if (process.argv.includes('--check')) {
    const current = existsSync(target) ? readFileSync(target) : undefined
    if (current === undefined || !current.equals(emitted)) {
      console.error('index.js is out of date; run node tools/build-plugin.mjs')
      process.exit(1)
    }
    console.log('index.js matches index.ts')
  } else {
    copyFileSync(join(outDir, 'index.js'), target)
    console.log(`index.js emitted (${emitted.length} bytes)`)
  }
} finally {
  rmSync(outDir, { recursive: true, force: true })
}