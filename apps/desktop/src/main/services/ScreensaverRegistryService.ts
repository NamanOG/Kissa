import { app, shell } from 'electron'
import { execFile } from 'node:child_process'
import { dirname, join, normalize, resolve } from 'node:path'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { StorePackageService } from './StorePackageService'

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
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1).trim()
  }
  p = normalize(p.replace(/\//g, '\\'))
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
  /**
   * Store build: Kissa cannot change the setting itself, so it has opened the folder
   * holding Kissa.scr for the listener to right-click and choose Install.
   */
  manual?: boolean
}

export interface UnregisterScreensaverResult {
  success: boolean
  removed: boolean
  reason?: 'not_registered' | 'points_to_other_screensaver' | 'unregistered' | 'unsupported_platform' | 'manual'
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
   * The path Windows should run as the screensaver.
   *
   * Classic builds register the Kissa.scr that sits beside Kissa.exe. A
   * Microsoft Store package can't do that: its install folder is versioned
   * (the path changes with every update) and is not meant to be launched
   * from outside the package. So the Store build keeps a copy of Kissa.scr in
   * the package's LocalState folder — a real, stable, user-owned location that
   * Windows can run, and that is removed with the app — and registers that.
   */
  public async resolveScreensaverPath(): Promise<string> {
    const store = StorePackageService.getInstance()
    if (!store.isStorePackage()) return this.getScreensaverPath()

    const localState = await store.getLocalStatePath()
    return localState ? join(localState, 'Kissa.scr') : this.getScreensaverPath()
  }

  /**
   * Store build only: makes sure the LocalState copy of Kissa.scr exists and
   * matches the one shipped in this version of the package.
   * Returns the copy's path, or null when not a Store package or on failure.
   */
  public async ensureStoreScreensaverCopy(): Promise<string | null> {
    const store = StorePackageService.getInstance()
    if (!store.isStorePackage()) return null

    const localState = await store.getLocalStatePath()
    if (!localState) return null

    const source = this.getScreensaverPath()
    const target = join(localState, 'Kissa.scr')
    try {
      const sourceStat = statSync(source)
      const current = existsSync(target) ? statSync(target) : null
      const upToDate =
        current !== null && current.size === sourceStat.size && current.mtimeMs >= sourceStat.mtimeMs
      if (!upToDate) {
        mkdirSync(localState, { recursive: true })
        copyFileSync(source, target)
      }
      return target
    } catch {
      return null
    }
  }

  /**
   * Store build only: after a Store update the bundled Kissa.scr may be newer
   * than the registered copy. Refresh it, but only if Kissa is the screensaver.
   */
  public async refreshStoreCopyIfRegistered(): Promise<void> {
    if (!StorePackageService.getInstance().isStorePackage()) return
    try {
      if (await this.isScreensaverRegistered()) {
        await this.ensureStoreScreensaverCopy()
      }
    } catch {
    }
  }

  /**
   * Resolves the absolute path to the Kissa.scr shipped beside Kissa.exe.
   */
  public getScreensaverPath(): string {
    if (app && app.isPackaged) {
      return resolve(dirname(app.getPath('exe')), 'Kissa.scr')
    }

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

    const expectedPath = await this.resolveScreensaverPath()
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

    const store = StorePackageService.getInstance()
    const scrPath = this.getScreensaverPath()
    if (store.isStorePackage()) {
      const copied = await this.ensureStoreScreensaverCopy()
      if (!copied) {
        return { success: false, error: 'Could not prepare the screensaver file for Windows.' }
      }
      // A Store package's registry writes are redirected to a private copy that Windows
      // never reads, and Microsoft does not grant Kissa the capability that lifts this.
      // So Windows does it instead: show the file, and the listener chooses Install.
      shell.showItemInFolder(copied)
      return { success: false, manual: true, path: copied }
    }

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

    const expectedPath = await this.resolveScreensaverPath()
    if (!areWindowsPathsEqual(currentRegistered, expectedPath)) {
      // The current screensaver is someone else's; leave it alone.
      return {
        success: false,
        removed: false,
        reason: 'points_to_other_screensaver',
        currentPath: currentRegistered
      }
    }

    if (StorePackageService.getInstance().isStorePackage()) {
      // Same limit as registering: only Windows can change it. Open its settings.
      await this.openScreensaverSettings()
      return { success: false, removed: false, reason: 'manual' }
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
