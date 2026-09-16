import { app } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join, normalize, resolve } from 'node:path'
import { existsSync } from 'node:fs'

export type RegExecFile = (
  file: string,
  args: ReadonlyArray<string>,
  options?: { windowsHide?: boolean }
) => Promise<{ stdout: string; stderr: string }>

export function runExecFile(
  file: string,
  args: ReadonlyArray<string>,
  options: { windowsHide?: boolean } = { windowsHide: true }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args as string[], options, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout: String(stdout), stderr: String(stderr) })
      }
    })
  })
}

const REG_KEY = 'HKCU\\Control Panel\\Desktop'
const REG_VALUE = 'SCRNSAVE.EXE'

/**
 * Normalizes a Windows filesystem or registry path for strict equivalence checks.
 * Strips surrounding quotes, trims whitespace, standardizes slashes and casing.
 */
export function normalizeWindowsPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') return ''
  let p = rawPath.trim()
  // Strip surrounding quotes
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1).trim()
  }
  // Replace slashes and normalize
  p = normalize(p.replace(/\//g, '\\'))
  // Strip any trailing backslash unless it's a root drive like C:\
  if (p.length > 3 && p.endsWith('\\')) {
    p = p.slice(0, -1)
  }
  return p.toLowerCase()
}

/**
 * Checks if two Windows paths are functionally equivalent.
 */
export function areWindowsPathsEqual(pathA: string | null | undefined, pathB: string | null | undefined): boolean {
  if (!pathA || !pathB) return false
  return normalizeWindowsPath(pathA) === normalizeWindowsPath(pathB)
}

/**
 * Parses stdout from `reg query "HKCU\Control Panel\Desktop" /v SCRNSAVE.EXE`.
 */
export function parseRegQueryOutput(stdout: string): string | null {
  if (!stdout) return null
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/SCRNSAVE\.EXE\s+REG_SZ\s+(.+)$/i)
    if (match && match[1]) {
      let val = match[1].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim()
      }
      return val
    }
  }
  return null
}

export interface RegisterScreensaverResult {
  success: boolean
  error?: string
  path?: string
}

export interface UnregisterScreensaverResult {
  success: boolean
  removed: boolean
  reason?: 'not_registered' | 'points_to_other_screensaver' | 'unregistered' | 'unsupported_platform'
  currentPath?: string
  error?: string
}

export class ScreensaverRegistryService {
  private static instance: ScreensaverRegistryService
  private execFn: RegExecFile = runExecFile

  private constructor() {}

  public static getInstance(): ScreensaverRegistryService {
    if (!ScreensaverRegistryService.instance) {
      ScreensaverRegistryService.instance = new ScreensaverRegistryService()
    }
    return ScreensaverRegistryService.instance
  }

  public setExecFileForTesting(fn: RegExecFile): void {
    this.execFn = fn
  }

  public resetExecFile(): void {
    this.execFn = runExecFile
  }

  /**
   * Resolves the absolute path to Kissa.scr beside Kissa.exe.
   */
  public getScreensaverPath(): string {
    if (app && app.isPackaged) {
      // In production (NSIS or Portable), Kissa.scr is beside Kissa.exe
      return resolve(dirname(app.getPath('exe')), 'Kissa.scr')
    }

    // In development mode, check resources/Kissa.scr or root resources
    const devPath = resolve(app ? app.getAppPath() : process.cwd(), 'resources', 'Kissa.scr')
    if (existsSync(devPath)) {
      return devPath
    }

    return resolve(process.cwd(), 'resources', 'Kissa.scr')
  }

  /**
   * Queries the current value of SCRNSAVE.EXE in HKCU\Control Panel\Desktop.
   * Returns null if unset or on error.
   */
  public async getRegisteredScreensaverPath(): Promise<string | null> {
    if (process.platform !== 'win32') return null

    try {
      const { stdout } = await this.execFn('reg.exe', ['query', REG_KEY, '/v', REG_VALUE], {
        windowsHide: true
      })
      return parseRegQueryOutput(stdout)
    } catch {
      // Non-zero exit code means key or value does not exist
      return null
    }
  }

  /**
   * Returns true if Kissa.scr is currently registered as the active screensaver.
   */
  public async isScreensaverRegistered(): Promise<boolean> {
    if (process.platform !== 'win32') return false

    const currentRegistered = await this.getRegisteredScreensaverPath()
    if (!currentRegistered) return false

    const expectedPath = this.getScreensaverPath()
    return areWindowsPathsEqual(currentRegistered, expectedPath)
  }

  /**
   * Sets HKCU\Control Panel\Desktop\SCRNSAVE.EXE to the absolute path of Kissa.scr.
   * Strictly touches only SCRNSAVE.EXE; does not modify ScreenSaveActive,
   * ScreenSaveTimeOut, or any other desktop values.
   */
  public async registerScreensaver(): Promise<RegisterScreensaverResult> {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Windows screensavers are only supported on Windows.' }
    }

    const scrPath = this.getScreensaverPath()

    try {
      await this.execFn(
        'reg.exe',
        ['add', REG_KEY, '/v', REG_VALUE, '/t', 'REG_SZ', '/d', scrPath, '/f'],
        { windowsHide: true }
      )
      return { success: true, path: scrPath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Safely unregisters Kissa.scr.
   * Strictly reads the current value first. If SCRNSAVE.EXE points to another screensaver
   * (e.g. C:\Windows\System32\Mystify.scr), it leaves the registry completely untouched.
   */
  public async unregisterScreensaver(): Promise<UnregisterScreensaverResult> {
    if (process.platform !== 'win32') {
      return { success: false, removed: false, reason: 'unsupported_platform' }
    }

    const currentRegistered = await this.getRegisteredScreensaverPath()
    if (!currentRegistered) {
      return { success: true, removed: false, reason: 'not_registered' }
    }

    const expectedPath = this.getScreensaverPath()
    if (!areWindowsPathsEqual(currentRegistered, expectedPath)) {
      // Mandatory safety guard: current screensaver points elsewhere. DO NOT TOUCH.
      return {
        success: false,
        removed: false,
        reason: 'points_to_other_screensaver',
        currentPath: currentRegistered
      }
    }

    try {
      await this.execFn('reg.exe', ['delete', REG_KEY, '/v', REG_VALUE, '/f'], {
        windowsHide: true
      })
      return { success: true, removed: true, reason: 'unregistered' }
    } catch (err) {
      return { success: false, removed: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Safely opens the native Windows screensaver settings dialog (control.exe desk.cpl,,@screensaver).
   * Allows users to configure Windows idle timeout directly in Windows without third-party overrides.
   */
  public async openScreensaverSettings(): Promise<{ success: boolean; error?: string }> {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Windows screensaver settings are only available on Windows.' }
    }

    const systemRoot = process.env.SystemRoot || 'C:\\Windows'
    const controlExe = join(systemRoot, 'System32', 'control.exe')

    try {
      await this.execFn(controlExe, ['desk.cpl,,@screensaver'], { windowsHide: false })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
