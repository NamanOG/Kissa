import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const site = (process.env.KISSA_SITE_URL ?? 'https://kissa.glyphcode.studio/').replace(/\/?$/, '/')
const sitemap = readFileSync(resolve(root, 'dist/sitemap.xml'), 'utf8')
const titles = new Set()
for (const slug of ['study-room', 'discord-music-status']) {
  const html = readFileSync(resolve(root, 'dist', slug, 'index.html'), 'utf8')
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
  assert.ok(title && !titles.has(title), `${slug}: unique title`)
  titles.add(title)
  assert.ok(html.includes(`rel="canonical" href="${site}${slug}/"`), `${slug}: canonical`)
  assert.ok(html.includes(`property="og:url" content="${site}${slug}/"`), `${slug}: social URL`)
  assert.ok(html.match(/name="description"\s+content="[^"]{50,}"/), `${slug}: description`)
  assert.equal((html.match(/<h1>/g) ?? []).length, 1, `${slug}: one visible heading without JS`)
  assert.ok(html.includes('id="main-content"') && html.includes('Get Kissa from Microsoft Store'), `${slug}: real rendered content`)
  assert.ok(!html.includes('<noscript>'), `${slug}: no duplicate homepage copy`)
  assert.ok(!html.includes('—'), `${slug}: no em dash`)
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  assert.equal(schema.url, `${site}${slug}/`)
  assert.equal(schema['@type'], 'WebPage')
  assert.ok(sitemap.includes(`<loc>${site}${slug}/</loc>`), `${slug}: sitemap entry`)
  for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    const path = match[1].replace(new URL(site).pathname, '')
    assert.ok(existsSync(resolve(root, 'dist', path)), `${slug}: bundled image ${path}`)
  }
}
console.log('Feature pages: titles, metadata, canonicals, schema, sitemap, images and no-JS content passed.')
