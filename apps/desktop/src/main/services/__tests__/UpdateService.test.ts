import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  UpdateService,
  parseSemver,
  isNewerVersion,
  isSafeDownloadUrl
} from '../UpdateService'

// Mock Electron APIs
vi.mock('electron', () => {
  return {
    app: {
      getVersion: vi.fn().mockReturnValue('4.0.0'),
      getPath: vi.fn().mockImplementation((name: string) => {
        if (name === 'temp') return 'C:\\mock-temp'
        if (name === 'downloads') return 'C:\\mock-downloads'
        return 'C:\\mock-dir'
      }),
      quit: vi.fn()
    },
    ipcMain: {
      handle: vi.fn()
    },
    shell: {
      showItemInFolder: vi.fn()
    }
  }
})

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    statSync: vi.fn().mockReturnValue({ size: 1000 }),
    unlinkSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn()
  }
})

const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn().mockReturnValue({
    unref: vi.fn()
  })
}))

// Mock child_process spawn
vi.mock('child_process', () => ({
  default: {
    spawn: mockSpawn
  },
  spawn: mockSpawn
}))

// Mock WindowManager
vi.mock('../../window/WindowManager', () => {
  return {
    WindowManager: {
      getInstance: vi.fn().mockReturnValue({
        isScreensaver: false,
        getMainWindow: vi.fn().mockReturnValue({
          isDestroyed: vi.fn().mockReturnValue(false),
          webContents: {
            send: vi.fn()
          }
        })
      })
    }
  }
})

describe('UpdateService', () => {
  describe('Semver utilities', () => {
    it('parses semver versions correctly', () => {
      expect(parseSemver('v4.1.0')).toEqual([4, 1, 0])
      expect(parseSemver('4.0.0')).toEqual([4, 0, 0])
      expect(parseSemver('v1.10.2-beta')).toEqual([1, 10, 2])
      expect(parseSemver('')).toEqual([])
      expect(parseSemver('invalid')).toEqual([])
    })

    it('correctly compares local and remote versions', () => {
      expect(isNewerVersion('v4.1.0', '4.0.0')).toBe(true)
      expect(isNewerVersion('v4.1.0', '4.1.0')).toBe(false)
      expect(isNewerVersion('4.0.0', '4.1.0')).toBe(false)
      expect(isNewerVersion('v5.0.0', '4.9.9')).toBe(true)
      expect(isNewerVersion('v4.0.1', '4.0.0')).toBe(true)
      expect(isNewerVersion('', '4.0.0')).toBe(false)
    })
  })

  describe('Download URL safety validation', () => {
    it('approves trusted GitHub release and CDN asset URLs', () => {
      expect(
        isSafeDownloadUrl(
          'https://github.com/NamanOG/Kissa/releases/download/v4.1.0/Kissa-Setup-4.1.0.exe'
        )
      ).toBe(true)
      expect(
        isSafeDownloadUrl(
          'https://objects.githubusercontent.com/github-production-release-asset-2e65be/123/456'
        )
      ).toBe(true)
      expect(
        isSafeDownloadUrl('https://api.github.com/repos/NamanOG/Kissa/releases/assets/123')
      ).toBe(true)
    })

    it('rejects insecure HTTP protocols and untrusted domains', () => {
      expect(
        isSafeDownloadUrl('http://github.com/NamanOG/Kissa/releases/download/v4.1.0/Kissa-Setup-4.1.0.exe')
      ).toBe(false)
      expect(isSafeDownloadUrl('https://malicious-site.com/Kissa-Setup-4.1.0.exe')).toBe(false)
      expect(isSafeDownloadUrl('https://github.com.attacker.com/malware.exe')).toBe(false)
      expect(isSafeDownloadUrl('not-a-valid-url')).toBe(false)
    })
  })

  describe('checkForUpdates lifecycle', () => {
    let originalFetch: typeof global.fetch
    let service: UpdateService

    beforeEach(() => {
      originalFetch = global.fetch
      global.fetch = vi.fn()
      service = UpdateService.getInstance()
      // Reset private fields
      ;(service as any).state = 'idle'
      ;(service as any).updateInfo = null
      ;(service as any).errorMessage = null
      ;(service as any).progress = null
      ;(service as any).downloadedFilePath = null
      delete process.env.PORTABLE_EXECUTABLE_DIR
    })

    afterEach(() => {
      global.fetch = originalFetch
      vi.clearAllMocks()
    })

    it('detects available update when remote version is newer', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v4.1.0',
          name: 'Kissa v4.1.0 — The Deliberate Listening Update',
          published_at: '2026-09-17T02:44:37Z',
          body: 'Release notes here',
          draft: false,
          prerelease: false,
          assets: [
            {
              name: 'Kissa-Setup-4.1.0.exe',
              size: 267336266,
              browser_download_url:
                'https://github.com/NamanOG/Kissa/releases/download/v4.1.0/Kissa-Setup-4.1.0.exe'
            },
            {
              name: 'Kissa-Portable-4.1.0.exe',
              size: 266731891,
              browser_download_url:
                'https://github.com/NamanOG/Kissa/releases/download/v4.1.0/Kissa-Portable-4.1.0.exe'
            }
          ]
        })
      } as any)

      const payload = await service.checkForUpdates()
      expect(payload.state).toBe('available')
      expect(payload.updateInfo).not.toBeNull()
      expect(payload.updateInfo?.version).toBe('v4.1.0')
      expect(payload.updateInfo?.assetName).toBe('Kissa-Setup-4.1.0.exe')
      expect(payload.updateInfo?.assetSize).toBe(267336266)
      expect(payload.updateInfo?.isPortable).toBe(false)
    })

    it('selects portable asset when running in portable mode', async () => {
      process.env.PORTABLE_EXECUTABLE_DIR = 'D:\\PortableApps'

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v4.1.0',
          draft: false,
          prerelease: false,
          assets: [
            {
              name: 'Kissa-Setup-4.1.0.exe',
              size: 267336266,
              browser_download_url:
                'https://github.com/NamanOG/Kissa/releases/download/v4.1.0/Kissa-Setup-4.1.0.exe'
            },
            {
              name: 'Kissa-Portable-4.1.0.exe',
              size: 266731891,
              browser_download_url:
                'https://github.com/NamanOG/Kissa/releases/download/v4.1.0/Kissa-Portable-4.1.0.exe'
            }
          ]
        })
      } as any)

      const payload = await service.checkForUpdates()
      expect(payload.state).toBe('available')
      expect(payload.updateInfo?.assetName).toBe('Kissa-Portable-4.1.0.exe')
      expect(payload.updateInfo?.isPortable).toBe(true)
    })

    it('reports up-to-date when local version equals remote version', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v4.0.0',
          draft: false,
          prerelease: false,
          assets: []
        })
      } as any)

      const payload = await service.checkForUpdates()
      expect(payload.state).toBe('up-to-date')
      expect(payload.updateInfo).toBeNull()
    })

    it('rejects drafts and prerelease versions', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v4.2.0-pre',
          draft: false,
          prerelease: true,
          assets: []
        })
      } as any)

      const payload = await service.checkForUpdates()
      expect(payload.state).toBe('error')
      expect(payload.error).toContain('draft or prerelease')
    })

    it('handles network failure gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network connection offline'))

      const payload = await service.checkForUpdates()
      expect(payload.state).toBe('error')
      expect(payload.error).toContain('Network connection offline')
    })

    it('blocks checking when screensaver is active', async () => {
      const { WindowManager } = await import('../../window/WindowManager')
      vi.mocked(WindowManager.getInstance).mockReturnValueOnce({
        isScreensaver: true
      } as any)

      const payload = await service.checkForUpdates()
      expect(payload.state).toBe('error')
      expect(payload.error).toContain('screensaver')
    })
  })

  describe('cancelDownload and installation', () => {
    let service: UpdateService

    beforeEach(() => {
      service = UpdateService.getInstance()
      ;(service as any).state = 'idle'
      ;(service as any).updateInfo = null
      ;(service as any).downloadedFilePath = null
      delete process.env.PORTABLE_EXECUTABLE_DIR
    })

    it('cancels active download and resets state', () => {
      const mockAbort = vi.fn()
      ;(service as any).activeAbortController = { abort: mockAbort }
      ;(service as any).state = 'downloading'

      const payload = service.cancelDownload()
      expect(mockAbort).toHaveBeenCalled()
      expect(payload.state).toBe('cancelled')
    })

    it('refuses installation if no file has been downloaded', async () => {
      const result = await service.installUpdate()
      expect(result.success).toBe(false)
      expect(result.error).toContain('No downloaded update file')
    })

    it('refuses installation if screensaver is active', async () => {
      ;(service as any).state = 'downloaded'
      ;(service as any).downloadedFilePath = 'C:\\mock-temp\\Kissa-Setup-4.1.0.exe'

      const { WindowManager } = await import('../../window/WindowManager')
      vi.mocked(WindowManager.getInstance).mockReturnValueOnce({
        isScreensaver: true
      } as any)

      const result = await service.installUpdate()
      expect(result.success).toBe(false)
      expect(result.error).toContain('screensaver')
    })

    it('reveals downloaded portable file in explorer', async () => {
      process.env.PORTABLE_EXECUTABLE_DIR = 'D:\\Portable'
      ;(service as any).state = 'downloaded'
      ;(service as any).downloadedFilePath = 'C:\\mock-downloads\\Kissa-Portable-4.1.0.exe'

      const { shell } = await import('electron')
      const result = await service.installUpdate()

      expect(result.success).toBe(true)
      expect(result.action).toBe('revealed')
      expect(shell.showItemInFolder).toHaveBeenCalledWith(
        'C:\\mock-downloads\\Kissa-Portable-4.1.0.exe'
      )
    })

    it('spawns installer and quits app for installed version', async () => {
      ;(service as any).state = 'downloaded'
      ;(service as any).downloadedFilePath = 'C:\\mock-temp\\Kissa-Setup-4.1.0.exe'

      const { spawn } = await import('child_process')
      const result = await service.installUpdate()

      expect(result.success).toBe(true)
      expect(result.action).toBe('restarting')
      expect(mockSpawn).toHaveBeenCalledWith('C:\\mock-temp\\Kissa-Setup-4.1.0.exe', [], {
        detached: true,
        stdio: 'ignore'
      })
    })
  })
})
