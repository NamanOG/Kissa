import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'

const GITHUB_REPO = 'NamanOG/Kissa'
const CHECK_INTERVAL_MS = 1000 * 60 * 60 * 12 // 12 hours

// Semver compare — returns true if remote version is strictly greater than local
function parseSemver(ver: string): number[] {
  const clean = ver.replace(/^v/i, '').split(/[-+]/)[0]
  return clean.split('.').map((p) => {
    const num = parseInt(p, 10)
    return Number.isFinite(num) ? num : 0
  })
}

function isNewerVersion(remote: string, local: string): boolean {
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

export function useUpdateChecker(): void {
  useEffect(() => {
    let mounted = true

    async function checkForUpdates(): Promise<void> {
      try {
        if (!window.electron?.getAppVersion) return

        const localVersion = await window.electron.getAppVersion()
        const now = Date.now()
        const lastCheck = localStorage.getItem('kissa_last_update_check')

        // If checked recently, rely on cached result if it's still newer
        if (lastCheck && now - parseInt(lastCheck, 10) < CHECK_INTERVAL_MS) {
          const savedUpdate = localStorage.getItem('kissa_update_available')
          if (savedUpdate) {
            const parsed = JSON.parse(savedUpdate)
            if (isNewerVersion(parsed.version, localVersion)) {
              usePlayerStore.getState().setUpdateAvailable(parsed)
            } else {
              localStorage.removeItem('kissa_update_available')
            }
          }
          return
        }

        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          },
          signal: AbortSignal.timeout(6_000)
        })
        
        if (!response.ok) return

        const data = await response.json()
        if (!data || !data.tag_name || !data.html_url) return

        if (isNewerVersion(data.tag_name, localVersion)) {
          const updateInfo = { version: data.tag_name, url: data.html_url }
          if (mounted) {
            usePlayerStore.getState().setUpdateAvailable(updateInfo)
            localStorage.setItem('kissa_update_available', JSON.stringify(updateInfo))
          }
        } else {
          if (mounted) {
            usePlayerStore.getState().setUpdateAvailable(null)
            localStorage.removeItem('kissa_update_available')
          }
        }
        
        localStorage.setItem('kissa_last_update_check', now.toString())
      } catch (err) {
        console.warn('Failed to check for updates:', err)
      }
    }

    checkForUpdates()
    
    return (): void => {
      mounted = false
    }
  }, [])
}
