import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * Kissa ships two ways: the classic installer/portable build, and a Microsoft
 * Store (MSIX) package. Inside a package Windows gives the app an identity and
 * changes a few rules:
 *
 *  - registry and AppData writes are redirected to a private per-app copy,
 *  - "start with Windows" is a StartupTask rather than a Run registry value,
 *  - updates are delivered by the Store, so the app must not update itself.
 *
 * This service answers "are we a Store package?" and wraps the native helper
 * commands (see smtc-helper/HostCommands.cs) for the APIs Electron lacks.
 */

export type HelperExecFile = (file: string, args: ReadonlyArray<string>) => Promise<string>

export interface StartupTaskResult {
  ok: boolean
  /** StartupTaskState name from Windows, or 'unavailable' / 'error'. */
  state: string
  enabled: boolean
  error?: string
}

function runHelperProcess(file: string, args: ReadonlyArray<string>): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(file, args as string[], { windowsHide: true, timeout: 8000 }, (error, stdout) => {
      if (error) reject(error)
      else resolvePromise(String(stdout))
    })
  })
}

/** Last non-empty line of the helper's output, parsed as JSON. */
export function parseHelperJson<T>(stdout: string): T | null {
  const line = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .pop()
  if (!line) return null
  try {
    return JSON.parse(line) as T
  } catch {
    return null
  }
}

export class StorePackageService {
  private static instance: StorePackageService
  private execFn: HelperExecFile = runHelperProcess
  private storePackage: boolean | null = null
  private familyName: Promise<string | null> | null = null

  private constructor() {}

  public static getInstance(): StorePackageService {
    if (!StorePackageService.instance) {
      StorePackageService.instance = new StorePackageService()
    }
    return StorePackageService.instance
  }

  public setExecFileForTesting(fn: HelperExecFile): void {
    this.execFn = fn
    this.familyName = null
  }

  public setStorePackageForTesting(value: boolean | null): void {
    this.storePackage = value
    this.familyName = null
  }

  /**
   * True when running from an MSIX package layout. Cheap and synchronous:
   * Electron's own flag, or the package manifest sitting above the executable
   * (electron-builder places the app in `<package>\app\`).
   */
  public isStorePackage(): boolean {
    if (this.storePackage !== null) return this.storePackage
    if (process.platform !== 'win32' || !app?.isPackaged) {
      this.storePackage = false
      return false
    }

    const exeDir = dirname(app.getPath('exe'))
    this.storePackage =
      process.windowsStore === true ||
      existsSync(resolve(exeDir, '..', 'AppxManifest.xml')) ||
      existsSync(join(exeDir, 'AppxManifest.xml'))
    return this.storePackage
  }

  public getHelperPath(): string {
    if (app?.isPackaged) {
      // resourcesPath is always set in a packaged Electron app; fall back to the
      // conventional location beside the executable rather than throwing.
      return join(process.resourcesPath || join(dirname(app.getPath('exe')), 'resources'), 'smtc-helper.exe')
    }
    return join(app ? app.getAppPath() : process.cwd(), 'resources', 'smtc-helper.exe')
  }

  private async runHelper<T>(args: ReadonlyArray<string>): Promise<T | null> {
    try {
      return parseHelperJson<T>(await this.execFn(this.getHelperPath(), args))
    } catch {
      return null
    }
  }

  /** The package family name Windows assigned, or null outside a package. */
  public getPackageFamilyName(): Promise<string | null> {
    if (!this.isStorePackage()) return Promise.resolve(null)
    this.familyName ??= this.runHelper<{ packaged: boolean; familyName: string | null }>(['--package-info']).then(
      (info) => (info?.packaged && info.familyName ? info.familyName : null)
    )
    return this.familyName
  }

  /**
   * The package's real LocalState folder. Unlike the rest of AppData it is not
   * redirected, so files placed here are visible to Windows itself — which is
   * what a screensaver needs — and are removed when the app is uninstalled.
   */
  public async getLocalStatePath(): Promise<string | null> {
    const family = await this.getPackageFamilyName()
    const localAppData = process.env.LOCALAPPDATA
    if (!family || !localAppData) return null
    return join(localAppData, 'Packages', family, 'LocalState')
  }

  public async getStartupTask(): Promise<StartupTaskResult> {
    return (
      (await this.runHelper<StartupTaskResult>(['--startup-task', 'get'])) ?? {
        ok: false,
        state: 'error',
        enabled: false,
        error: 'helper_unavailable'
      }
    )
  }

  public async setStartupTask(enabled: boolean): Promise<StartupTaskResult> {
    return (
      (await this.runHelper<StartupTaskResult>(['--startup-task', enabled ? 'enable' : 'disable'])) ?? {
        ok: false,
        state: 'error',
        enabled: false,
        error: 'helper_unavailable'
      }
    )
  }
}
