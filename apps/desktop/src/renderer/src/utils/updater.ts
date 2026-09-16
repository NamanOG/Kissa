const GITHUB_REPO = 'NamanOG/Kissa'
export const KISSA_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`

export interface UpdateCheckDiagnostics {
  timestamp: string
  requestStart: number
  requestEnd: number
  durationMs: number
  httpStatus: number
  remoteTag: string
  localVersion: string
  hasUpdate: boolean
  comparison: 'newer' | 'current_or_older'
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  version: string
  url: string
  diagnostics?: UpdateCheckDiagnostics
}

// Semver compare — returns array of numbers if valid, or empty array if invalid
export function parseSemver(ver: string): number[] {
  if (!ver || typeof ver !== 'string') return []
  const clean = ver.replace(/^v/i, '').split(/[-+]/)[0].trim()
  if (!clean) return []
  return clean.split('.').map((p) => {
    const num = parseInt(p, 10)
    return Number.isFinite(num) ? num : 0
  })
}

export function isNewerVersion(remote: string, local: string): boolean {
  if (!remote || !local) return false
  const cleanRemote = parseSemver(remote)
  const cleanLocal = parseSemver(local)
  if (cleanRemote.length === 0 || cleanLocal.length === 0) return false

  for (let i = 0; i < Math.max(cleanRemote.length, cleanLocal.length); i++) {
    const r = cleanRemote[i] || 0
    const l = cleanLocal[i] || 0
    if (r > l) return true
    if (r < l) return false
  }
  return false
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  if (!currentVersion) {
    throw new Error('Current version is required to check for updates.')
  }

  const requestStart = performance.now()
  const timestamp = new Date().toISOString()

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github.v3+json'
    },
    signal: AbortSignal.timeout(6_000)
  })

  const requestEnd = performance.now()
  const durationMs = Math.round(requestEnd - requestStart)

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error(`GitHub API returned ${response.status}`)
    }
    throw new Error(`GitHub API returned ${response.status}`)
  }

  let data: any
  try {
    data = await response.json()
  } catch {
    throw new Error('Malformed JSON received from GitHub API.')
  }

  // Validate release payload
  if (!data || typeof data !== 'object' || !data.tag_name || typeof data.tag_name !== 'string') {
    throw new Error('Malformed release payload from GitHub.')
  }

  // Reject drafts or prereleases
  if (data.draft || data.prerelease) {
    throw new Error('Latest release is a draft or prerelease.')
  }

  const parsedRemote = parseSemver(data.tag_name)
  if (parsedRemote.length === 0) {
    throw new Error(`Invalid semver in release tag: ${data.tag_name}`)
  }

  const hasUpdate = isNewerVersion(data.tag_name, currentVersion)

  const diagnostics: UpdateCheckDiagnostics = {
    timestamp,
    requestStart,
    requestEnd,
    durationMs,
    httpStatus: response.status,
    remoteTag: data.tag_name,
    localVersion: currentVersion,
    hasUpdate,
    comparison: hasUpdate ? 'newer' : 'current_or_older'
  }

  if (import.meta.env.DEV && typeof console !== 'undefined' && console.debug) {
    console.debug('[Kissa Updater Diagnostics]', diagnostics)
  }

  return {
    hasUpdate,
    version: data.tag_name,
    url: KISSA_RELEASES_URL,
    diagnostics
  }
}
