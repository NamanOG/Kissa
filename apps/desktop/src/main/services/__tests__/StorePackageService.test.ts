import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getPath: vi.fn().mockReturnValue('C:\\Program Files\\WindowsApps\\Kissa_4.1.0.0_x64__abc123\\app\\Kissa.exe'),
    getAppPath: vi.fn().mockReturnValue('C:\\mock-app'),
    getVersion: vi.fn().mockReturnValue('4.1.0'),
    quit: vi.fn()
  },
  ipcMain: { handle: vi.fn() },
  shell: { showItemInFolder: vi.fn() }
}))

import { shell } from 'electron'
import { StorePackageService, parseHelperJson, type HelperExecFile } from '../StorePackageService'
import { ScreensaverRegistryService, type RegExecFile } from '../ScreensaverRegistryService'
import { UpdateService } from '../UpdateService'

const FAMILY = 'GlyphCode.Kissa_abc123xyz'

describe('parseHelperJson', () => {
  it('parses the last non-empty line', () => {
    expect(parseHelperJson<{ packaged: boolean }>('noise\r\n{"packaged":true}\r\n\r\n')).toEqual({ packaged: true })
  })

  it('returns null for empty or malformed output', () => {
    expect(parseHelperJson('')).toBeNull()
    expect(parseHelperJson('not json')).toBeNull()
  })
})

describe('StorePackageService', () => {
  const store = StorePackageService.getInstance()
  let helper: ReturnType<typeof vi.fn>
  const originalLocalAppData = process.env.LOCALAPPDATA

  beforeEach(() => {
    helper = vi.fn()
    store.setExecFileForTesting(helper as unknown as HelperExecFile)
    process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local'
  })

  afterEach(() => {
    store.setStorePackageForTesting(null)
    process.env.LOCALAPPDATA = originalLocalAppData
  })

  it('reports no family name and never calls the helper outside a Store package', async () => {
    store.setStorePackageForTesting(false)
    expect(await store.getPackageFamilyName()).toBeNull()
    expect(await store.getLocalStatePath()).toBeNull()
    expect(helper).not.toHaveBeenCalled()
  })

  it('resolves the real LocalState folder from the package family name', async () => {
    store.setStorePackageForTesting(true)
    helper.mockResolvedValue(`{"packaged":true,"familyName":"${FAMILY}"}\n`)

    expect(await store.getLocalStatePath()).toBe(`C:\\Users\\Test\\AppData\\Local\\Packages\\${FAMILY}\\LocalState`)
    await store.getPackageFamilyName()
    expect(helper).toHaveBeenCalledTimes(1)
    expect(helper.mock.calls[0][1]).toEqual(['--package-info'])
  })

  it('treats a helper that reports "not packaged" as no identity', async () => {
    store.setStorePackageForTesting(true)
    helper.mockResolvedValue('{"packaged":false,"familyName":null}')
    expect(await store.getLocalStatePath()).toBeNull()
  })

  it('enables and disables the startup task through the helper', async () => {
    store.setStorePackageForTesting(true)
    helper.mockResolvedValue('{"ok":true,"state":"Enabled","enabled":true}')
    expect(await store.setStartupTask(true)).toEqual({ ok: true, state: 'Enabled', enabled: true })
    expect(helper.mock.calls[0][1]).toEqual(['--startup-task', 'enable'])

    helper.mockResolvedValue('{"ok":true,"state":"Disabled","enabled":false}')
    expect((await store.setStartupTask(false)).enabled).toBe(false)
    expect(helper.mock.calls[1][1]).toEqual(['--startup-task', 'disable'])
  })

  it('degrades to an error result when the helper cannot run', async () => {
    store.setStorePackageForTesting(true)
    helper.mockRejectedValue(new Error('spawn failed'))
    expect(await store.getStartupTask()).toMatchObject({ ok: false, enabled: false })
  })
})

describe('Store build: screensaver registration', () => {
  const store = StorePackageService.getInstance()
  const registry = ScreensaverRegistryService.getInstance()
  let helper: ReturnType<typeof vi.fn>
  let reg: ReturnType<typeof vi.fn>
  let tmp: string
  let bundled: string
  const originalPlatform = process.platform
  const originalLocalAppData = process.env.LOCALAPPDATA

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kissa-store-'))
    bundled = path.join(tmp, 'package', 'Kissa.scr')
    fs.mkdirSync(path.dirname(bundled), { recursive: true })
    fs.writeFileSync(bundled, 'scr-v1')

    process.env.LOCALAPPDATA = path.join(tmp, 'Local')
    Object.defineProperty(process, 'platform', { value: 'win32' })

    helper = vi.fn().mockResolvedValue(`{"packaged":true,"familyName":"${FAMILY}"}`)
    store.setExecFileForTesting(helper as unknown as HelperExecFile)
    store.setStorePackageForTesting(true)

    reg = vi.fn().mockResolvedValue({ stdout: '', stderr: '' })
    registry.setExecFileForTesting(reg as unknown as RegExecFile)
    vi.spyOn(registry, 'getScreensaverPath').mockReturnValue(bundled)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    registry.resetExecFile()
    store.setStorePackageForTesting(null)
    process.env.LOCALAPPDATA = originalLocalAppData
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  const localCopy = () => path.join(tmp, 'Local', 'Packages', FAMILY, 'LocalState', 'Kissa.scr')

  it('copies Kissa.scr into LocalState and shows it to the listener, never writing the registry', async () => {
    reg.mockImplementation(async (_file: string, args: string[]) => {
      if (args[0] !== 'query' && !String(_file).endsWith('control.exe')) {
        throw new Error('the Store build must not write the registry')
      }
      return { stdout: '', stderr: '' }
    })

    const result = await registry.registerScreensaver()
    expect(result).toEqual({ success: false, manual: true, path: localCopy() })
    expect(fs.readFileSync(localCopy(), 'utf8')).toBe('scr-v1')
    expect(shell.showItemInFolder).toHaveBeenCalledWith(localCopy())
  })

  it('opens Windows settings instead of clearing the value itself', async () => {
    reg.mockImplementation(async (file: string, args: string[]) => {
      if (args[0] === 'query') return { stdout: `    SCRNSAVE.EXE    REG_SZ    ${localCopy()}
`, stderr: '' }
      if (String(file).endsWith('control.exe')) return { stdout: '', stderr: '' }
      throw new Error('the Store build must not write the registry')
    })
    expect(await registry.unregisterScreensaver()).toEqual({ success: false, removed: false, reason: 'manual' })
  })

  it('recognises its own registration by the LocalState path', async () => {
    reg.mockResolvedValue({
      stdout: `HKEY_CURRENT_USER\\Control Panel\\Desktop\n    SCRNSAVE.EXE    REG_SZ    ${localCopy()}\n`,
      stderr: ''
    })
    expect(await registry.isScreensaverRegistered()).toBe(true)
  })

  it('does not treat the versioned package path as its registration', async () => {
    reg.mockResolvedValue({
      stdout: `HKEY_CURRENT_USER\\Control Panel\\Desktop\n    SCRNSAVE.EXE    REG_SZ    ${bundled}\n`,
      stderr: ''
    })
    expect(await registry.isScreensaverRegistered()).toBe(false)
  })

  it('refreshes the copy when the bundled file changes after an update', async () => {
    await registry.ensureStoreScreensaverCopy()
    fs.writeFileSync(bundled, 'scr-v2-longer')

    await registry.ensureStoreScreensaverCopy()
    expect(fs.readFileSync(localCopy(), 'utf8')).toBe('scr-v2-longer')
  })

  it('fails registration cleanly, without touching the registry, when there is no package identity', async () => {
    helper.mockResolvedValue('{"packaged":false,"familyName":null}')
    store.setStorePackageForTesting(true) // clears the cached family name

    const result = await registry.registerScreensaver()
    expect(result.success).toBe(false)
    expect(reg).not.toHaveBeenCalled()
  })
})

describe('Store build: updates are left to the Store', () => {
  const store = StorePackageService.getInstance()

  afterEach(() => store.setStorePackageForTesting(null))

  it('marks the status as Store-managed and never checks, downloads or installs', async () => {
    store.setStorePackageForTesting(true)
    const updates = UpdateService.getInstance()

    const status = await updates.checkForUpdates()
    expect(status.isStoreManaged).toBe(true)
    expect(status.state).toBe('idle')
    expect((await updates.downloadUpdate()).state).toBe('idle')
    expect(await updates.installUpdate()).toMatchObject({ success: false })
  })

  it('leaves the classic build self-updating', () => {
    store.setStorePackageForTesting(false)
    expect(UpdateService.getInstance().getStatusPayload().isStoreManaged).toBe(false)
  })
})
