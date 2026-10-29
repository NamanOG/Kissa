import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const site = (process.env.KISSA_SITE_URL ?? 'https://kissa.glyphcode.studio/').replace(/\/?$/, '/')
const sitemap = readFileSync(resolve(root, 'dist/sitemap.xml'), 'utf8')
const titles = new Set()
const home = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
assert.equal((home.match(/<title>/g) ?? []).length, 1, 'home: one title')
assert.equal((home.match(/rel="canonical"/g) ?? []).length, 1, 'home: one canonical')
assert.ok(home.includes(`rel="canonical" href="${site}"`), 'home: canonical')
assert.ok(sitemap.includes(`<loc>${site}</loc>`), 'home: sitemap entry')
assert.ok(!sitemap.includes('<lastmod>'), 'sitemap: no fabricated build-time modification date')
const homeRoot = home.match(/<div id="root">([\s\S]*?)<\/div>\s*<!--/)?.[1]
assert.ok(homeRoot, 'home: real app content is present before JavaScript')
assert.equal((homeRoot.match(/<h1\b/g) ?? []).length, 1, 'home: one primary heading in the prerendered app')
assert.ok(homeRoot.includes('vinyl player for Windows'), 'home: descriptive main heading')
assert.ok(homeRoot.includes('Windows 10 and 11'), 'home: supported systems in visible copy')
assert.ok(homeRoot.includes('href="https://apps.microsoft.com/detail/9p3n4x4wm80j"'), 'home: Store link without JavaScript')
assert.ok(homeRoot.includes(`href="${new URL(site).pathname}study-room/"`), 'home: crawlable Focus Room link')
assert.ok(homeRoot.includes(`href="${new URL(site).pathname}discord-music-status/"`), 'home: crawlable Discord guide link')
assert.ok(homeRoot.includes('It does not stream songs or record physical vinyl.'), 'home: honest product scope')
const homeSchema = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
const faqSchema = homeSchema['@graph'].find((entry) => entry['@type'] === 'FAQPage')
const unescapeHtml = (value) => value.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
for (const question of faqSchema.mainEntity) {
  assert.ok(unescapeHtml(homeRoot).includes(question.name), `home: schema question exists in the app: ${question.name}`)
  assert.ok(unescapeHtml(homeRoot).includes(question.acceptedAnswer.text), `home: schema answer exists in the app: ${question.name}`)
}
const fallback = home.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1]
assert.ok(fallback, 'home: no-JS fallback')
assert.ok(fallback.includes('#root { display: none; }'), 'home: no duplicate app when JavaScript is disabled')
const fallbackItems = [...fallback.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((item) => item[1].trim())
assert.equal(new Set(fallbackItems).size, fallbackItems.length, 'home: no duplicate fallback features')
console.log('Homepage: real initial HTML, main heading, Store/internal links, matching FAQ schema and no-JS fallback passed.')
for (const slug of ['study-room', 'discord-music-status']) {
  const html = readFileSync(resolve(root, 'dist', slug, 'index.html'), 'utf8')
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
  assert.equal((html.match(/<title>/g) ?? []).length, 1, `${slug}: one title`)
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, `${slug}: one canonical`)
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

const notFound = readFileSync(resolve(root, 'dist/404.html'), 'utf8')
const errorHeading = notFound.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
assert.equal((notFound.match(/<h1\b/g) ?? []).length, 1, '404: one primary heading')
assert.ok(errorHeading?.includes('404') && errorHeading.includes('Error'), '404: visible error code is the primary heading')
assert.ok(notFound.includes('Page not found.'), '404: plain-language explanation')
assert.ok(notFound.includes('name="robots" content="noindex"'), '404: excluded from indexing')
assert.equal((notFound.match(/name="robots"/g) || []).length, 1, '404: exactly one robots directive')
assert.ok(!notFound.includes('rel="canonical"'), '404: no homepage canonical')
assert.ok(!notFound.includes('application/ld+json'), '404: no homepage schema')
assert.ok(!notFound.includes('<noscript>'), '404: no duplicate homepage copy')
assert.ok(notFound.includes(`href="${new URL(site).pathname}"`), '404: working way home')
assert.ok(!/[↗→]/u.test(notFound), '404: no decorative action arrows')
for (const match of notFound.matchAll(/<img[^>]+src="([^"]+)"/g)) {
  const path = match[1].replace(new URL(site).pathname, '')
  assert.ok(existsSync(resolve(root, 'dist', path)), `404: bundled image ${path}`)
}
console.log('404 page: primary error code, recovery link, images and noindex prerender passed.')

const supportPath = resolve(root, 'dist/support/index.html')
if (sitemap.includes(`<loc>${site}support/</loc>`)) {
  assert.ok(existsSync(supportPath), 'support: configured route is prerendered')
  const support = readFileSync(supportPath, 'utf8')
  assert.equal((support.match(/<h1\b/g) ?? []).length, 1, 'support: one visible heading without JS')
  assert.ok(support.includes(`rel="canonical" href="${site}support/"`), 'support: canonical')
  assert.ok(support.includes('support-page-page'), 'support: dedicated page layout')
  assert.ok(support.includes('Always free. No ads, no locked features.'), 'support: free-app promise')
  assert.ok(support.includes('Thank you for making Kissa part of your day.'), 'support: personal thank-you')
  assert.ok(support.includes('support-page-signature') && support.includes('Creator of Kissa'), 'support: signed creator note')
  assert.ok(!support.includes('<noscript>'), 'support: no duplicate homepage copy')
  assert.ok(!/[↗←]/u.test(support), 'support: no decorative navigation arrows')
  assert.ok(!support.includes('support-page-textLink'), 'support: actions use button styling')
  assert.ok(!support.includes('button.prod.min.js'), 'support: no third-party button loader')
  for (const match of support.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    const path = match[1].replace(new URL(site).pathname, '')
    assert.ok(existsSync(resolve(root, 'dist', path)), `support: bundled image ${path}`)
  }
  const upiHref = support.match(/href="(upi:\/\/pay\?[^"]+)"/)?.[1]
  if (upiHref) {
    const payment = new URL(upiHref.replaceAll('&amp;', '&'))
    assert.ok(payment.searchParams.get('pa'), 'support: UPI recipient present')
    assert.equal(payment.searchParams.has('am'), false, 'support: no preset payment amount')
    assert.ok(support.includes('id="upi-copy-feedback"') && support.includes('role="status"'), 'support: copy feedback')
  }
  console.log('Support page: prerendered content, canonical, images, copy feedback and amount-free UPI link passed.')
}
