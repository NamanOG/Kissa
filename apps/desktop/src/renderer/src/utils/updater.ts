const GITHUB_REPO = 'NamanOG/Kissa'
export const KISSA_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`

export interface UpdateCheckResult {
  hasUpdate: boolean
  version: string
  url: string
}

// Semver compare — returns true if remote version is strictly greater than local
export function parseSemver(ver: string): number[] {
  const clean = ver.replace(/^v/i, '').split(/[-+]/)[0]
  return clean.split('.').map((p) => {
    const num = parseInt(p, 10)
    return Number.isFinite(num) ? num : 0
  })
}

export function isNewerVersion(remote: string, local: string): boolean {
  if (!remote || !local) return false
  const cleanRemote = parseSemver(remote)
  const cleanLocal = parseSemver(local)

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

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    },
    signal: AbortSignal.timeout(6_000)
  })
  
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`)
  }

  const data = await response.json()
  
  // Validate it is a valid release payload
  if (!data || !data.tag_name) {
    throw new Error('Malformed release payload from GitHub.')
  }

  // Reject drafts or prereleases (latest endpoint usually shouldn't return these, but strictly enforce)
  if (data.draft || data.prerelease) {
    throw new Error('Latest release is a draft or prerelease.')
  }

  const hasUpdate = isNewerVersion(data.tag_name, currentVersion)

  return {
    hasUpdate,
    version: data.tag_name,
    // Safely hardcode the official URL rather than trusting API html_url
    url: KISSA_RELEASES_URL
  }
}
