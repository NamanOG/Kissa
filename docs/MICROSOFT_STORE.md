# Kissa on the Microsoft Store

Kissa ships two ways from the same code:

| Channel | Package | Updates | Signed by |
| :--- | :--- | :--- | :--- |
| GitHub / website | `Kissa-Setup-x.y.z.exe`, `Kissa-Portable-x.y.z.exe` | Built-in updater | Nobody (unsigned) |
| Microsoft Store | `Kissa-Store-x.y.z.appx` (MSIX) | The Store | Microsoft, after certification |

The Store package is built by `npm run build:store`. It is **not** part of the normal `build:win` release, so nothing about the existing installers changes.

## What is different inside a Store package

A Store app runs with a *package identity*. Windows then redirects its registry and AppData writes to a private copy, starts it at sign-in through a different mechanism, and expects the Store to deliver updates. Kissa detects this at runtime (`StorePackageService.isStorePackage()`) and takes a different path in four places. Everything else — the deck, lyrics, rooms, shelf, tray, media detection — is the same code.

| Feature | Classic build | Store build |
| :--- | :--- | :--- |
| **Set as Windows Screensaver** | Registers the `Kissa.scr` beside `Kissa.exe` | Copies `Kissa.scr` into the package's `LocalState` folder and registers that copy. The install folder can't be used: its path changes with every update. The registry write is exempted from redirection in the manifest. |
| **Start with Windows** | `Run` registry value via Electron | A `StartupTask` declared in the manifest, switched on and off through `smtc-helper.exe --startup-task …`. Starts with `--hidden`, as before. |
| **Updates** | In-app check, download and install | Disabled. Settings shows "Updated by Microsoft Store"; the tray menu has no "Check for Updates". Store policy forbids an app replacing itself. |
| **App user model ID** | Set explicitly | Left alone; the package identity provides it. |

Uninstalling the Store build removes `LocalState`, and with it the screensaver copy. The registry value is left pointing at a file that no longer exists, which Windows treats as "no screensaver". (The classic uninstaller clears the value itself; a Store uninstall cannot run code.)

## The one thing that needs Microsoft's approval

To let the screensaver setting reach the real registry, the manifest declares the **restricted capability `unvirtualizedResources`**:

- On **Windows 11** only one key is exempted: `HKEY_CURRENT_USER\Control Panel\Desktop`.
- **Windows 10** has no per-key control, so registry write virtualization is switched off for the app.

Restricted capabilities are reviewed at submission. In Partner Center, under *Submission options → Restricted capabilities*, use a justification along these lines:

> Kissa includes an optional Windows screensaver. Windows reads the active screensaver from `HKCU\Control Panel\Desktop\SCRNSAVE.EXE`, and only that value. When the user chooses "Set as Windows Screensaver" in Kissa's settings, Kissa writes that single value so Windows can launch it; when the user turns it off, Kissa removes the value only if it still points to Kissa. No other unvirtualized registry or file system location is written. On Windows 11 the exemption is limited to that key via `virtualization:ExcludedKeys`.

**If Microsoft declines it**, remove `unvirtualizedResources` from `appx.capabilities` and the two `RegistryWriteVirtualization` blocks from `build/appx-manifest.xml`, and hide the "Set as Windows Screensaver" row in the Store build (the manual fullscreen Listening Display is unaffected). An alternative that needs no approval: keep copying `Kissa.scr` to `LocalState`, open that folder in Explorer, and ask the user to right-click the file and choose *Install*.

## Testing the package locally

This needs Developer Mode, a system setting. It was run end to end on 2026-10-04 and every check passed.

1. Settings → System → For developers → **Developer Mode: On**.
2. Close your installed Kissa.
3. From `apps/desktop`:

   ```bash
   npm run build:store
   npm run store:layout
   npm run test:store
   ```

The script installs the unpacked package for your user, then checks from *outside* the package that:

- Windows accepts the manifest,
- Kissa has a package identity,
- a write to the screensaver key reaches the real registry,
- the `LocalState` copy of `Kissa.scr` is a real file Windows can run,
- the startup task can be read, enabled and disabled.

It saves your current screensaver setting first and restores it afterwards, writes the results to `dist/store-test-results.txt`, and launches the Store build so you can try it by hand (the on-screen checklist covers media detection, the settings page, the screensaver button and the tray menu).

To uninstall the test package:

```bash
npm run test:store -- -Remove
```

## Submitting to the Store

The full walk-through, from developer account to live listing, is in `PUBLISHING.md`.
