// Unpacks the Store package (dist/Kissa-Store-<version>.appx) into dist/store-layout
// so it can be registered locally for testing without signing it.
// Run via `npm run store:layout` after `npm run build:store`.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const layout = join(dist, 'store-layout')

const packages = existsSync(dist)
  ? readdirSync(dist)
      .filter((f) => /^Kissa-Store-.*\.appx$/i.test(f))
      .map((f) => join(dist, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  : []

if (packages.length === 0) {
  console.error('[store-layout] No dist/Kissa-Store-*.appx found. Run `npm run build:store` first.')
  process.exit(1)
}

/** makeappx.exe ships in the Windows kit that electron-builder downloads for the appx target. */
function findMakeAppx() {
  const cache = join(
    process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'),
    'electron-builder',
    'Cache'
  )
  const stack = existsSync(cache) ? [cache] : []
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.name.toLowerCase() === 'makeappx.exe' && /x64/i.test(full)) return full
    }
  }
  return null
}

const makeAppx = findMakeAppx()
if (!makeAppx) {
  console.error(
    '[store-layout] makeappx.exe not found in the electron-builder cache. Run `npm run build:store` first.'
  )
  process.exit(1)
}

rmSync(layout, { recursive: true, force: true })
execFileSync(makeAppx, ['unpack', '/p', packages[0], '/d', layout, '/o'], {
  stdio: ['ignore', 'ignore', 'inherit']
})
console.log(`[store-layout] Unpacked ${packages[0]}\n               -> ${layout}`)
