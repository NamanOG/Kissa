import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import snapshot from './src/data/release.json'
import faq from './src/data/faq.json'

const REPO = 'NamanOG/Kissa'

/**
 * Where the site is published. Everything that needs an absolute URL
 * (canonical link, social preview image, sitemap, structured data) and the
 * asset base path are derived from this one value.
 *
 * Defaults:
 * - If KISSA_SITE_URL is provided, use it.
 * - On Vercel (process.env.VERCEL), derive from VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL.
 * - Otherwise (e.g. GitHub Pages build), fall back to https://namanog.github.io/Kissa/
 *
 * Override with the KISSA_SITE_URL environment variable when deploying to a
 * custom domain, e.g. KISSA_SITE_URL=https://kissa.example.com/
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
const defaultSiteUrl = vercelHost
  ? `https://${vercelHost}/`
  : process.env.VERCEL
    ? 'https://localhost/'
    : 'https://namanog.github.io/Kissa/'

const SITE_URL = (process.env.KISSA_SITE_URL ?? defaultSiteUrl).replace(/\/?$/, '/')

interface GithubAsset {
  name: string
  browser_download_url: string
  size: number
}

type Release = typeof snapshot

/**
 * Resolve the newest GitHub release while building, so the direct installer
 * link is part of the shipped page and never depends on a visitor's browser
 * reaching the (rate-limited) GitHub API. Falls back to the committed
 * snapshot in src/data/release.json when GitHub can't be reached.
 */
async function resolveLatestRelease(): Promise<Release> {
  try {
    const token = process.env.GITHUB_TOKEN
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return snapshot

    const release = (await res.json()) as {
      tag_name: string
      published_at: string
      html_url: string
      assets: GithubAsset[]
    }
    const pick = (pattern: RegExp) => {
      const asset = release.assets.find((a) => pattern.test(a.name))
      return asset
        ? {
            name: asset.name,
            url: asset.browser_download_url,
            sizeMb: Math.round((asset.size / 1024 / 1024) * 10) / 10
          }
        : null
    }
    const setup = pick(/setup.*\.exe$/i)
    const portable = pick(/portable.*\.exe$/i)
    if (!setup) return snapshot

    return {
      version: release.tag_name.replace(/^v/, ''),
      publishedAt: release.published_at,
      notesUrl: release.html_url,
      setup,
      portable: portable ?? snapshot.portable
    }
  } catch {
    return snapshot
  }
}

/** schema.org data search engines use for rich results. */
function structuredData(release: Release) {
  const graph = [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}#software`,
      name: 'Kissa',
      alternateName: 'Kissa vinyl player',
      description:
        'A free vinyl player for Windows that turns whatever is playing in Spotify, Apple Music, TIDAL or a local player into a record on a desktop turntable, with a draggable tonearm, synced lyrics and eight listening rooms.',
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'Music player',
      operatingSystem: 'Windows 10, Windows 11',
      softwareVersion: release.version,
      datePublished: release.publishedAt,
      url: SITE_URL,
      downloadUrl: release.setup.url,
      installUrl: release.setup.url,
      fileSize: `${release.setup.sizeMb} MB`,
      releaseNotes: release.notesUrl,
      screenshot: `${SITE_URL}og.jpg`,
      image: `${SITE_URL}og.jpg`,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Turntable with real platter inertia at 33⅓ and 45 RPM',
        'Draggable tonearm for seeking',
        'Synced lyrics',
        'Eight listening rooms',
        'Fullscreen listening display',
        'Native Windows screensaver',
        'Record shelf of listening history'
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
      publisher: { '@id': `${SITE_URL}#author` }
    }
  ]
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

/** Fills the %PLACEHOLDERS% in index.html and writes robots.txt and sitemap.xml. */
function seo(release: Release): Plugin {
  return {
    name: 'kissa-seo',
    transformIndexHtml(html) {
      return html
        .replaceAll('%STRUCTURED_DATA%', structuredData(release))
        .replaceAll('%SITE_URL%', SITE_URL)
        .replaceAll('%DOWNLOAD_URL%', release.setup.url)
        .replaceAll('%VERSION%', release.version)
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
          `  <url>\n    <loc>${SITE_URL}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>\n` +
          `</urlset>\n`
      })
    }
  }
}

export default defineConfig(async ({ command }) => {
  const release = await resolveLatestRelease()

  return {
    // Root in development; the published path (e.g. /Kissa/) when building.
    base: command === 'build' ? new URL(SITE_URL).pathname : '/',
    plugins: [react(), seo(release)],
    define: {
      __KISSA_RELEASE__: JSON.stringify(release)
    },
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
      open: false,
      watch: {
        // Ignore large/locked media files in public/product (e.g. mp4 being played)
        ignored: ['**/public/product/**']
      }
    }
  }
})
