import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkForUpdates, parseSemver, isNewerVersion, KISSA_RELEASES_URL } from '../updater'

describe('Updater utility', () => {
  describe('Semver utilities', () => {
    it('parses valid versions correctly', () => {
      expect(parseSemver('v1.0.0')).toEqual([1, 0, 0])
      expect(parseSemver('2.10.5')).toEqual([2, 10, 5])
      expect(parseSemver('3.0.0-beta')).toEqual([3, 0, 0])
    })

    it('correctly compares semantic versions', () => {
      expect(isNewerVersion('v2.0.0', 'v1.0.0')).toBe(true)
      expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(false)
      expect(isNewerVersion('v1.10.0', 'v1.9.0')).toBe(true)
      expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true)
      expect(isNewerVersion('4.0.0', '3.0.1')).toBe(true)
      expect(isNewerVersion('3.0.1', '4.0.0')).toBe(false)
    })
  })

  describe('checkForUpdates', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = vi.fn()
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('throws if no current version is provided', async () => {
      await expect(checkForUpdates('')).rejects.toThrow('Current version is required')
    })

    it('throws if the GitHub API request fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))
      await expect(checkForUpdates('1.0.0')).rejects.toThrow('Network error')
    })

    it('throws if the HTTP response is not OK', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403
      } as any)
      await expect(checkForUpdates('1.0.0')).rejects.toThrow('GitHub API returned 403')
    })

    it('throws if the JSON payload is malformed', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ some_other_field: 'value' }) // Missing tag_name
      } as any)
      await expect(checkForUpdates('1.0.0')).rejects.toThrow('Malformed release payload')
    })

    it('rejects draft and prerelease versions strictly', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v2.0.0',
          prerelease: true,
          draft: false
        })
      } as any)
      await expect(checkForUpdates('1.0.0')).rejects.toThrow('Latest release is a draft or prerelease.')
    })

    it('returns hasUpdate=false if remote version is older or same', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v1.0.0',
          prerelease: false,
          draft: false
        })
      } as any)

      const result = await checkForUpdates('v1.0.0')
      expect(result).toMatchObject({
        hasUpdate: false,
        version: 'v1.0.0',
        url: KISSA_RELEASES_URL,
        diagnostics: expect.objectContaining({
          remoteTag: 'v1.0.0',
          localVersion: 'v1.0.0',
          hasUpdate: false,
          comparison: 'current_or_older'
        })
      })
    })

    it('returns hasUpdate=true with safe URL if remote version is newer', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v2.0.0',
          html_url: 'http://malicious.com', // Should be ignored by our fixed URL logic
          prerelease: false,
          draft: false
        })
      } as any)

      const result = await checkForUpdates('v1.0.0')
      expect(result).toMatchObject({
        hasUpdate: true,
        version: 'v2.0.0',
        url: KISSA_RELEASES_URL,
        diagnostics: expect.objectContaining({
          remoteTag: 'v2.0.0',
          localVersion: 'v1.0.0',
          hasUpdate: true,
          comparison: 'newer'
        })
      })
    })
  })
})
