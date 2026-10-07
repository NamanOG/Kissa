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
| **Windows screensaver** | One click: registers the `Kissa.scr` beside `Kissa.exe` | Guided: copies `Kissa.scr` into the package's `LocalState` folder and shows it in Explorer for the listener to Install. See below. |
| **Start with Windows** | `Run` registry value via Electron | A `StartupTask` declared in the manifest, switched on and off through `smtc-helper.exe --startup-task …`. Starts with `--hidden`, as before. |
| **Updates** | In-app check, download and install | Disabled. Settings shows "Updated by Microsoft Store"; the tray menu has no "Check for Updates". Store policy forbids an app replacing itself. |
| **App user model ID** | Set explicitly | Left alone; the package identity provides it. |

Uninstalling the Store build removes `LocalState`, and with it the screensaver copy. The registry value is left pointing at a file that no longer exists, which Windows treats as "no screensaver". (The classic uninstaller clears the value itself; a Store uninstall cannot run code.)

## The screensaver in the Store build

Windows reads the active screensaver from `HKCU\Control Panel\Desktop\SCRNSAVE.EXE`. A packaged app's writes to that key go to a private copy Windows never reads. The restricted capability `unvirtualizedResources` lifts this, and **Microsoft declined it for Kissa on 2026-10-07** (policy 10.6.3). Kissa does not try to work around that.

So in the Store build Windows makes the change, not Kissa:

1. *Settings → System → Set Up Screensaver…* copies `Kissa.scr` to the package's `LocalState` folder and opens that folder with the file selected.
2. The listener right-clicks `Kissa.scr` and chooses **Install**. Windows registers it and opens its Screen Saver Settings.
3. To remove it, the button opens Windows' Screen Saver Settings.

Kissa can still *read* the setting, so Settings shows when Kissa is the screensaver. The classic installer keeps its one-click button.

Tested and ruled out: starting `reg.exe` (or anything else) through an Explorer shortcut from inside the package. It reaches the real registry from a test harness, but not from an app started the normal way.

To ask Microsoft again later, add the capability back to `appx.capabilities` and the two `RegistryWriteVirtualization` blocks to `build/appx-manifest.xml` (see git history), and submit it as an update with a fuller business justification and a support contact filled in under Properties.

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
