import { useEffect, useState } from 'react'

export const REPO = 'NamanOG/Kissa'
export const GITHUB_URL = `https://github.com/${REPO}`
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`

export interface ReleaseAsset {
  name: string
  url: string
  sizeMb: number
}

export interface LatestRelease {
  version: string
  publishedAt: string
  notesUrl: string
  setup: ReleaseAsset
  portable: ReleaseAsset | null
}

interface GithubAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GithubRelease {
  tag_name: string
  published_at: string
  html_url: string
  assets: GithubAsset[]
}

/** The release that was newest when the site was built (see vite.config.ts). */
const BUILT_IN: LatestRelease = __KISSA_RELEASE__

const CACHE_KEY = 'kissa:latest-release'
const CACHE_TTL_MS = 10 * 60 * 1000

function toAsset(assets: GithubAsset[], pattern: RegExp): ReleaseAsset | null {
  const match = assets.find((a) => pattern.test(a.name))
  if (!match) return null
  return {
    name: match.name,
    url: match.browser_download_url,
    sizeMb: Math.round((match.size / 1024 / 1024) * 10) / 10
  }
}

function readCache(): LatestRelease | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { at, data } = JSON.parse(raw) as { at: number; data: LatestRelease }
    return Date.now() - at < CACHE_TTL_MS && data?.setup?.url ? data : null
  } catch {
    return null
  }
}

function writeCache(data: LatestRelease) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Storage can be unavailable (private mode) — the fetch result is still used.
  }
}

/** True when version `a` is newer than `b` (numeric, dot-separated). */
function isNewer(a: string, b: string) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d > 0
  }
  return false
}

/** Whichever is newer: what this browser last saw, or what the site was built with. */
function initialRelease(): LatestRelease {
  const cached = readCache()
  return cached && isNewer(cached.version, BUILT_IN.version) ? cached : BUILT_IN
}

let pending: Promise<LatestRelease | null> | null = null

function fetchLatestRelease(): Promise<LatestRelease | null> {
  pending ??= fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then((res) => (res.ok ? (res.json() as Promise<GithubRelease>) : null))
    .then((release) => {
      const setup = release && toAsset(release.assets, /setup.*\.exe$/i)
      if (!release || !setup) return null
      const data: LatestRelease = {
        version: release.tag_name.replace(/^v/, ''),
        publishedAt: release.published_at,
        notesUrl: release.html_url,
        setup,
        portable: toAsset(release.assets, /portable.*\.exe$/i)
      }
      writeCache(data)
      return data
    })
    .catch(() => null)

  return pending
}

/**
 * The latest release, always with a direct installer URL.
 *
 * Starts from the release baked in at build time, so a click downloads the
 * .exe immediately with no lookup and no trip to GitHub's release page. In
 * the background it asks GitHub whether something newer has shipped since
 * the site was built and upgrades the link if so; if that request fails or
 * is rate limited, the built-in link simply stays.
 */
export function useLatestRelease(): LatestRelease {
  const [release, setRelease] = useState<LatestRelease>(initialRelease)

  useEffect(() => {
    if (readCache()) return
    let active = true
    fetchLatestRelease().then((data) => {
      if (active && data && !isNewer(BUILT_IN.version, data.version)) setRelease(data)
    })
    return () => {
      active = false
    }
  }, [])

  return release
}
