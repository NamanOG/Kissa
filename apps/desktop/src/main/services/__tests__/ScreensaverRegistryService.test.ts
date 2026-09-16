import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeWindowsPath,
  areWindowsPathsEqual,
  parseRegQueryOutput,
  ScreensaverRegistryService,
  type RegExecFile
} from '../ScreensaverRegistryService'

describe('ScreensaverRegistryService', () => {
  describe('normalizeWindowsPath', () => {
    it('normalizes slashes, trims whitespace, and lowercases paths', () => {
      const p1 = '  C:/Program Files/Kissa/Kissa.scr  '
      const p2 = 'c:\\program files\\kissa\\kissa.scr'
      expect(normalizeWindowsPath(p1)).toBe(normalizeWindowsPath(p2))
    })

    it('strips surrounding double and single quotes', () => {
      const rawQuoted = '"C:\\Users\\User\\AppData\\Local\\Programs\\Kissa\\Kissa.scr"'
      const rawSingle = "'C:\\Users\\User\\AppData\\Local\\Programs\\Kissa\\Kissa.scr'"
      const rawPlain = 'C:\\Users\\User\\AppData\\Local\\Programs\\Kissa\\Kissa.scr'
      expect(normalizeWindowsPath(rawQuoted)).toBe(normalizeWindowsPath(rawPlain))
      expect(normalizeWindowsPath(rawSingle)).toBe(normalizeWindowsPath(rawPlain))
    })

    it('handles empty or non-string inputs safely', () => {
      expect(normalizeWindowsPath('')).toBe('')
      expect(normalizeWindowsPath(null as any)).toBe('')
    })
  })

  describe('areWindowsPathsEqual', () => {
    it('identifies equivalent Windows paths despite casing, slashes, or quoting', () => {
      const pathA = '"C:\\Kissa\\Kissa.scr"'
      const pathB = 'c:/kissa/kissa.scr'
      expect(areWindowsPathsEqual(pathA, pathB)).toBe(true)
    })

    it('returns false for different paths', () => {
      const pathA = 'C:\\Kissa\\Kissa.scr'
      const pathB = 'C:\\Windows\\System32\\Mystify.scr'
      expect(areWindowsPathsEqual(pathA, pathB)).toBe(false)
    })

    it('returns false if either path is null or undefined', () => {
      expect(areWindowsPathsEqual(null, 'C:\\Kissa.scr')).toBe(false)
      expect(areWindowsPathsEqual('C:\\Kissa.scr', undefined)).toBe(false)
    })
  })

  describe('parseRegQueryOutput', () => {
    it('extracts unquoted SCRNSAVE.EXE path from standard reg query stdout', () => {
      const stdout = `
HKEY_CURRENT_USER\\Control Panel\\Desktop
    SCRNSAVE.EXE    REG_SZ    C:\\Users\\User\\AppData\\Local\\Programs\\Kissa\\Kissa.scr
`
      expect(parseRegQueryOutput(stdout)).toBe(
        'C:\\Users\\User\\AppData\\Local\\Programs\\Kissa\\Kissa.scr'
      )
    })

    it('extracts quoted SCRNSAVE.EXE path and unquotes it', () => {
      const stdout = `
HKEY_CURRENT_USER\\Control Panel\\Desktop
    SCRNSAVE.EXE    REG_SZ    "C:\\Program Files\\Kissa\\Kissa.scr"
`
      expect(parseRegQueryOutput(stdout)).toBe('C:\\Program Files\\Kissa\\Kissa.scr')
    })

    it('returns null if SCRNSAVE.EXE is not present in the output', () => {
      const stdout = `
HKEY_CURRENT_USER\\Control Panel\\Desktop
    ScreenSaveActive    REG_SZ    1
`
      expect(parseRegQueryOutput(stdout)).toBeNull()
    })

    it('returns null for empty stdout', () => {
      expect(parseRegQueryOutput('')).toBeNull()
    })
  })

  describe('ScreensaverRegistryService lifecycle', () => {
    let service: ScreensaverRegistryService
    let mockExecFile: ReturnType<typeof vi.fn>
    const originalPlatform = process.platform

    beforeEach(() => {
      mockExecFile = vi.fn()
      service = ScreensaverRegistryService.getInstance()
      service.setExecFileForTesting(mockExecFile as unknown as RegExecFile)
      Object.defineProperty(process, 'platform', { value: 'win32' })
    })

    afterEach(() => {
      service.resetExecFile()
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('getScreensaverPath resolves path ending in Kissa.scr', () => {
      const scrPath = service.getScreensaverPath()
      expect(scrPath.toLowerCase().endsWith('kissa.scr')).toBe(true)
    })

    it('registers screensaver by invoking reg add only for SCRNSAVE.EXE', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'The operation completed successfully.', stderr: '' })

      const res = await service.registerScreensaver()
      expect(res.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      const [cmd, args] = mockExecFile.mock.calls[0]
      expect(cmd).toBe('reg.exe')
      expect(args[0]).toBe('add')
      expect(args[1]).toBe('HKCU\\Control Panel\\Desktop')
      expect(args[2]).toBe('/v')
      expect(args[3]).toBe('SCRNSAVE.EXE')
      expect(args[4]).toBe('/t')
      expect(args[5]).toBe('REG_SZ')
      expect(args[6]).toBe('/d')
      expect(args[7].toLowerCase().endsWith('kissa.scr')).toBe(true)
      expect(args[8]).toBe('/f')
    })

    it('safely unregisters when SCRNSAVE.EXE matches Kissa.scr', async () => {
      const expectedPath = service.getScreensaverPath()

      // First call (reg query): returns Kissa.scr path
      // Second call (reg delete): succeeds
      mockExecFile
        .mockResolvedValueOnce({ stdout: `SCRNSAVE.EXE    REG_SZ    ${expectedPath}`, stderr: '' })
        .mockResolvedValueOnce({ stdout: 'The operation completed successfully.', stderr: '' })

      const res = await service.unregisterScreensaver()
      expect(res.success).toBe(true)
      expect(res.removed).toBe(true)
      expect(mockExecFile).toHaveBeenCalledTimes(2)

      const [deleteCmd, deleteArgs] = mockExecFile.mock.calls[1]
      expect(deleteCmd).toBe('reg.exe')
      expect(deleteArgs[0]).toBe('delete')
      expect(deleteArgs[1]).toBe('HKCU\\Control Panel\\Desktop')
      expect(deleteArgs[2]).toBe('/v')
      expect(deleteArgs[3]).toBe('SCRNSAVE.EXE')
      expect(deleteArgs[4]).toBe('/f')
    })

    it('REFUSES to unregister if SCRNSAVE.EXE points to another screensaver', async () => {
      // Query returns a different screensaver (e.g. Mystify.scr)
      mockExecFile.mockResolvedValueOnce({
        stdout: 'SCRNSAVE.EXE    REG_SZ    C:\\Windows\\System32\\Mystify.scr',
        stderr: ''
      })

      const res = await service.unregisterScreensaver()
      expect(res.success).toBe(false)
      expect(res.removed).toBe(false)
      expect(res.reason).toBe('points_to_other_screensaver')
      expect(res.currentPath).toBe('C:\\Windows\\System32\\Mystify.scr')

      // reg delete MUST NOT have been called!
      expect(mockExecFile).toHaveBeenCalledTimes(1)
      const [cmd, queryArgs] = mockExecFile.mock.calls[0]
      expect(cmd).toBe('reg.exe')
      expect(queryArgs[0]).toBe('query')
    })

    it('safely handles unregister when no screensaver is registered', async () => {
      // Query rejects because value is not found
      mockExecFile.mockRejectedValueOnce(
        new Error('ERROR: The system was unable to find the specified registry key or value.')
      )

      const res = await service.unregisterScreensaver()
      expect(res.success).toBe(true)
      expect(res.removed).toBe(false)
      expect(res.reason).toBe('not_registered')
      // reg delete was not invoked
      expect(mockExecFile).toHaveBeenCalledTimes(1)
    })

    it('guards against non-Windows platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      const regRes = await service.registerScreensaver()
      expect(regRes.success).toBe(false)
      expect(regRes.error).toContain('Windows')

      const unregRes = await service.unregisterScreensaver()
      expect(unregRes.success).toBe(false)
      expect(unregRes.reason).toBe('unsupported_platform')

      const isReg = await service.isScreensaverRegistered()
      expect(isReg).toBe(false)
    })

    it('opens native Windows screensaver settings dialog via control.exe', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      mockExecFile.mockResolvedValueOnce({ stdout: '', stderr: '' })

      const res = await service.openScreensaverSettings()
      expect(res.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        expect.stringContaining('control.exe'),
        ['desk.cpl,,@screensaver'],
        { windowsHide: false }
      )
    })

    it('guards openScreensaverSettings against non-Windows platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      const res = await service.openScreensaverSettings()
      expect(res.success).toBe(false)
      expect(res.error).toContain('Windows')
    })
  })
})
