import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const source = resolve(root, 'screensaver/publish/Kissa.exe')
const destination = resolve(root, 'resources/Kissa.scr')

if (!existsSync(source)) {
  console.error(`[copy-screensaver] Source file does not exist: ${source}`)
  process.exit(1)
}

const resourcesDir = resolve(root, 'resources')
if (!existsSync(resourcesDir)) {
  mkdirSync(resourcesDir, { recursive: true })
}

copyFileSync(source, destination)
const stats = statSync(destination)
console.log(
  `[copy-screensaver] Successfully copied ${source} -> ${destination} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
)
