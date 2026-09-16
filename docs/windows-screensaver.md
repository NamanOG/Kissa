# Windows Screensaver Architecture & Packaging (`Kissa.scr`)

## 1. Overview

Kissa includes a dedicated Windows screensaver implementation that renders the full-fidelity **Listening Display** (spinning vinyl, tonearm, and typography) when triggered by the OS.

The architecture separates lifecycle supervision from visual rendering:
- **Supervisor (`Kissa.scr`)**: A lightweight native Windows executable (`apps/desktop/screensaver/KissaScreensaver.csproj`) that receives Windows screensaver arguments (`/s`, `/c`, `/p`), invokes `Kissa.exe --screensaver`, and blocks until the child exits.
- **Renderer (`Kissa.exe`)**: The Electron application which detects `--screensaver` on launch, isolates the render tree to `ListeningDisplay mode="screensaver"`, and exits via IPC upon user wake input.

---

## 2. Packaging Layout

During the Windows build (`npm run build:win`), the native supervisor is built via `dotnet publish` as a self-contained trimmed single-file executable (`PublishSingleFile=true`, `PublishTrimmed=true` matching `smtc-helper`) and bundled into the distribution.

The resulting installed directory structure is:

```text
<Install Directory>/
├── Kissa.exe
├── Kissa.scr
├── resources/
│   ├── app.asar
│   ├── smtc-helper.exe
│   └── ...
└── ...
```

`Kissa.scr` resides directly beside `Kissa.exe` in the application root directory.

---

## 3. Windows Registry Registration

Registration is **strictly user-driven** from the application Settings UI (**Configuration > System Integrations > Windows Screensaver**). Kissa is **never** silently or automatically registered during installation, startup, or background execution.

### Registry Location
- **Hive / Key**: `HKEY_CURRENT_USER\Control Panel\Desktop`
- **Value**: `SCRNSAVE.EXE` (Type: `REG_SZ`)
- **Data**: Absolute path to `Kissa.scr` (e.g. `C:\Users\<User>\AppData\Local\Programs\Kissa\Kissa.scr`)

### Strict Registry Invariants
1. **Scope Limit**: Only `SCRNSAVE.EXE` is managed. Kissa **never** modifies `ScreenSaveActive`, `ScreenSaveTimeOut`, or any other desktop/screensaver registry values. The operating system and user settings retain full control over timeouts and activation policies.
2. **Standard Elevation**: Registration operates entirely within `HKCU`. Administrator privileges and UAC elevation are never required.
3. **Safe, Conditional Unregister**: When the user clicks "Remove Kissa Screensaver", Kissa queries the current value of `SCRNSAVE.EXE` first:
   - If it matches `Kissa.scr` (with normalized path, slash, and quote handling), it removes the `SCRNSAVE.EXE` value.
   - If the user has selected a different screensaver in Windows Settings (e.g., `C:\Windows\System32\Mystify.scr`), Kissa **refuses** to delete or modify the registry, leaving the user's active choice intact.

---

## 4. NSIS Installer & Uninstaller Behavior

- **Installation**:
  - The installer extracts `Kissa.scr` alongside `Kissa.exe`.
  - The installer **does not** modify the Windows registry or set Kissa as the screensaver.
- **Uninstallation**:
  - Through a custom NSIS macro (`build/installer.nsh`), the uninstaller reads `HKCU\Control Panel\Desktop\SCRNSAVE.EXE`.
  - It only removes `SCRNSAVE.EXE` if it points specifically to `$INSTDIR\Kissa.scr`.
  - If `SCRNSAVE.EXE` points to another screensaver or is unset, it remains completely untouched.

---

## 5. Portable Build Characteristics

- In portable mode, `Kissa.scr` is packaged beside `Kissa.exe` within the extracted portable bundle.
- Portable Kissa is permitted to register its active runtime path to `Kissa.scr`.
- **Known Limitation**: Because portable applications can be moved or deleted by the user without an uninstaller, moving or deleting the portable directory while registered will leave Windows pointing to a nonexistent `.scr` file. In that scenario, the user can re-register from the new location or remove the entry via Windows Screen Saver Settings.
