import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const source = resolve(root, 'smtc-helper/publish/smtc-helper.exe')
const destination = resolve(root, 'resources/smtc-helper.exe')

if (!existsSync(source)) {
  console.error(`[copy-smtc] Source file does not exist: ${source}`)
  process.exit(1)
}

const resourcesDir = resolve(root, 'resources')
if (!existsSync(resourcesDir)) {
  mkdirSync(resourcesDir, { recursive: true })
}

copyFileSync(source, destination)
const stats = statSync(destination)
console.log(
  `[copy-smtc] Successfully copied ${source} -> ${destination} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
)
