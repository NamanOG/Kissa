import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
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

const server = await createServer({
  configFile: false,
  root,
  base: new URL(canonical).pathname,
  plugins: [react()],
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const markup = renderToString(createElement(App))
  assert.ok(markup.includes('id="main-content"'), 'Homepage must render its real content')
  assert.ok(markup.includes('href='), 'Homepage must render crawlable links')
  await writeFile(output, template.replace('<div id="root"></div>', `<div id="root">${markup}</div>`))
  console.log('Homepage: existing React content prerendered into the initial HTML.')
} finally {
  await server.close()
}
