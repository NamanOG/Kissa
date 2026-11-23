import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'dist/index.html')
const template = await readFile(output, 'utf8')
const canonical = template.match(/rel="canonical" href="([^"]+)"/)?.[1]
assert.ok(canonical, 'Homepage must have a canonical URL before prerendering')
assert.ok(template.includes('<div id="root"></div>'), 'Homepage render target must be empty before prerendering')

/* The server render sees source paths for imported images; the page must carry the built files. */
async function withBuiltAssets(html) {
  const sources = [...new Set(html.match(/\/src\/[\w/.-]+\.webp/g) ?? [])]
  if (!sources.length) return html
  const directory = resolve(root, 'dist/assets')
  const built = await Promise.all(
    (await readdir(directory)).filter((name) => name.endsWith('.webp')).map(async (name) => ({ name, bytes: await readFile(resolve(directory, name)) }))
  )
  const base = new URL(canonical).pathname
  let result = html
  for (const source of sources) {
    const bytes = await readFile(resolve(root, source.slice(1)))
    const match = built.find((file) => file.bytes.equals(bytes))
    assert.ok(match, `Prerender: no built asset for ${source}`)
    result = result.replaceAll(source, `${base}assets/${match.name}`)
  }
  return result
}

const server = await createServer({
  configFile: false,
  root,
  base: new URL(canonical).pathname,
  plugins: [react()],
  resolve: { alias: { '@': resolve(root, 'src'), '@reserve': resolve(root, process.env.KISSA_RESERVE_LIVE === '1' && existsSync(resolve(root, 'src/reserve/index.tsx')) ? 'src/reserve/index.tsx' : 'src/reserve/off.tsx') } },
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const markup = await withBuiltAssets(renderToString(createElement(App)))
  assert.ok(markup.includes('id="main-content"'), 'Homepage must render its real content')
  assert.ok(markup.includes('href='), 'Homepage must render crawlable links')
  await writeFile(output, template.replace('<div id="root"></div>', `<div id="root">${markup}</div>`))
  console.log('Homepage: existing React content prerendered into the initial HTML.')
} finally {
  await server.close()
}
