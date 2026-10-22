import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import faq from './src/data/faq.json'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { featurePages } from './src/data/featurePages'
import { FeaturePage } from './src/components/FeaturePage'
import { SupportPage } from './src/components/SupportPage'
import { NotFoundPage } from './src/components/NotFoundPage'
import { support, supportIsConfigured, SUPPORT_PREVIEW_CONFIG } from './src/data/support'

const REPO = 'NamanOG/Kissa'
const STORE_URL = 'https://apps.microsoft.com/detail/9p3n4x4wm80j'

/**
 * Where the site is published. Everything that needs an absolute URL
 * (canonical link, social preview image, sitemap, structured data) and the
 * asset base path are derived from this one value. Set KISSA_SITE_URL to
 * build for a different address.
 */
const SITE_URL = (process.env.KISSA_SITE_URL ?? 'https://kissa.glyphcode.studio/').replace(/\/?$/, '/')

/** schema.org data search engines use for rich results. */
function structuredData() {
  const graph = [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}#software`,
      name: 'Kissa',
      alternateName: ['Kissa vinyl player', 'Kissa: Vinyl Player for Windows'],
      description:
        'A free vinyl player for Windows that turns whatever is playing in Spotify, Apple Music, TIDAL or a local player into a record on a desktop turntable, with a draggable tonearm, synced lyrics, eight listening rooms and a Focus Room for studying, writing or any focused work.',
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'Music player',
      operatingSystem: 'Windows 10, Windows 11',
      url: SITE_URL,
      downloadUrl: STORE_URL,
      installUrl: STORE_URL,
      screenshot: `${SITE_URL}og-kissa-deck.png`,
      image: `${SITE_URL}og-kissa-deck.png`,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Turntable with real platter inertia at 33⅓ and 45 RPM',
        'Draggable tonearm for seeking',
        'Synced lyrics',
        'Eight listening rooms',
        'Match Album lighting with optional Moving light',
        'Turntable finishes and special pressings, with an optional album-matched record',
        'Recorded turntable sounds',
        'Fullscreen listening display',
        'Native Windows screensaver',
        'Record shelf of listening history',
        'Focus Room with five calm rooms, real nature recordings and a focus timer',
        'Weekly focus view with a daily goal',
        'Optional Discord status for music and focus sessions'
      ],
      author: { '@id': `${SITE_URL}#author` }
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}#faq`,
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}#author`,
      name: 'Naman Bagdiya',
      alternateName: ['NamanOG', 'GlyphCode'],
      url: 'https://github.com/NamanOG',
      sameAs: ['https://github.com/NamanOG', `https://github.com/${REPO}`]
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      url: SITE_URL,
      name: 'Kissa',
      alternateName: ['Kissa Vinyl Player', 'Kissa for Windows'],
      publisher: { '@id': `${SITE_URL}#author` }
    }
  ]
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

/** Fills the %PLACEHOLDERS% in index.html and writes robots.txt and sitemap.xml. */
function seo(): Plugin {
  return {
    name: 'kissa-seo',
    transformIndexHtml(html) {
      return html
        .replaceAll('%STRUCTURED_DATA%', structuredData())
        .replaceAll('%SITE_URL%', SITE_URL)
        .replaceAll('%DOWNLOAD_URL%', STORE_URL)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `  <url><loc>${SITE_URL}</loc></url>\n` +
          featurePages.map((page) => `  <url><loc>${SITE_URL}${page.slug}/</loc></url>\n`).join('') +
          (supportIsConfigured() ? `  <url><loc>${SITE_URL}support/</loc></url>\n` : '') +
          `</urlset>\n`
      })
    },
    writeBundle(output) {
      const directory = output.dir ?? resolve(__dirname, 'dist')
      const template = readFileSync(resolve(directory, 'index.html'), 'utf8')
      const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
      for (const page of featurePages) {
        const url = `${SITE_URL}${page.slug}/`
        const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, description: page.description, url, isPartOf: { '@id': `${SITE_URL}#website` }, about: { '@id': `${SITE_URL}#software` } }).replace(/</g, '\\u003c')
        const html = template
          .replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>`)
          .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*"/g, `$1${escape(page.description)}"`)
          .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*"/g, `$1${escape(page.title)}"`)
          .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
          .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
          .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${schema}</script>`)
          .replace('<div id="root"></div>', `<div id="root">${renderToStaticMarkup(createElement(FeaturePage, { page, base: new URL(SITE_URL).pathname }))}</div>`)
          .replace(/<noscript>[\s\S]*?<\/noscript>/, '')
        mkdirSync(resolve(directory, page.slug), { recursive: true })
        writeFileSync(resolve(directory, page.slug, 'index.html'), html)
      }

      // /support/ is published only with real payment details; a preview build marks itself.
      const supportPreview = process.env.KISSA_SUPPORT_PREVIEW === '1' && !supportIsConfigured()
      if (supportIsConfigured() || supportPreview) {
        const url = `${SITE_URL}support/`
        const title = 'Support Kissa | Kissa'
        const description = 'Kissa is free and stays free. If you would like to help keep it going, you can support it here. Entirely optional.'
        let html = template
          .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
          .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*"/g, `$1${escape(description)}"`)
          .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*"/g, `$1${escape(title)}"`)
          .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
          .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
          .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
          .replace(
            '<div id="root"></div>',
            `<div id="root">${renderToStaticMarkup(createElement(SupportPage, { base: new URL(SITE_URL).pathname, config: supportPreview ? SUPPORT_PREVIEW_CONFIG : support, preview: supportPreview }))}</div>`
          )
          .replace(/<noscript>[\s\S]*?<\/noscript>/, '')
        if (supportPreview) {
          html = html.replace(/\s*<meta\s+name="robots"[^>]*>/, '').replace('<head>', '<head><meta name="robots" content="noindex">')
        }
        mkdirSync(resolve(directory, 'support'), { recursive: true })
        writeFileSync(resolve(directory, 'support', 'index.html'), html)
      }

      // 404.html at the output root: Vercel serves it, with a 404 status, for any unknown path.
      // Asset URLs are absolute (the base path), so it renders correctly at any depth.
      const notFoundTitle = 'Page not found | Kissa'
      const notFound = template
        .replace(/<title>[^<]*<\/title>/, `<title>${escape(notFoundTitle)}</title>`)
        .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*"/g, `$1${escape(notFoundTitle)}"`)
        .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, '')
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
        // One robots directive only: drop the homepage's "index, follow" before adding noindex.
        .replace(/\s*<meta\s+name="robots"[^>]*>/, '')
        .replace('<head>', '<head><meta name="robots" content="noindex">')
        .replace('<div id="root"></div>', `<div id="root">${renderToStaticMarkup(createElement(NotFoundPage, { base: new URL(SITE_URL).pathname, showSupport: supportIsConfigured() }))}</div>`)
        .replace(/<noscript>[\s\S]*?<\/noscript>/, '')
      writeFileSync(resolve(directory, '404.html'), notFound)
    }
  }
}

export default defineConfig(({ command }) => {
  return {
    // Root in development; the published path (e.g. /Kissa/) when building.
    base: command === 'build' ? new URL(SITE_URL).pathname : '/',
    plugins: [react(), seo()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Inline assets under 4kb, externalize larger ones
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          // Stable chunk naming for long-term caching
          manualChunks: undefined
        }
      }
    },
    // Development server
    server: {
      port: 5174,
      open: false
    }
  }
})
