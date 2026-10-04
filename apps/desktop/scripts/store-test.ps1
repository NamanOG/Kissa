<#
.SYNOPSIS
  Installs the Kissa Store package locally and checks the things that differ
  from the classic installer.

.DESCRIPTION
  A Microsoft Store (MSIX) app runs with a package identity. Windows redirects
  its registry and AppData writes and starts it at sign-in differently. This
  script registers the unpacked package for the current user and verifies, from
  OUTSIDE the package, that Kissa's Store-specific paths really work:

    1. the package installs (Windows accepts the manifest)
    2. Kissa has a package identity
    3. a write to the screensaver registry key reaches the REAL registry
    4. a file placed in LocalState is a real file Windows can run
    5. the "start with Windows" task can be read, enabled and disabled

  It then launches Kissa so you can check the app by hand.

  Your current screensaver setting is saved first and restored at the end.

  Requires Developer Mode:
    Settings > System > For developers > Developer Mode > On

.PARAMETER Remove
  Uninstall the test package and exit.

.EXAMPLE
  npm run build:store
  npm run store:layout
  powershell -ExecutionPolicy Bypass -File scripts\store-test.ps1
#>
param([switch]$Remove)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$layout = Join-Path $root 'dist\store-layout'
$manifest = Join-Path $layout 'AppxManifest.xml'
$resultsFile = Join-Path $root 'dist\store-test-results.txt'
$work = Join-Path $root 'dist\store-test-work'
$savedScreensaverFile = Join-Path $root 'dist\store-test-original-screensaver.txt'
$packageName = 'GlyphCode.Kissa'
# Test installs made before the Store identity was assigned used this name.
Get-AppxPackage -Name 'NamanOG.Kissa' | Remove-AppxPackage -ErrorAction SilentlyContinue
$regKey = 'HKCU:\Control Panel\Desktop'
$results = New-Object System.Collections.Generic.List[string]

function Report([string]$name, [bool]$ok, [string]$detail) {
  $mark = if ($ok) { 'PASS' } else { 'FAIL' }
  $line = "[$mark] $name" + $(if ($detail) { " - $detail" } else { '' })
  $results.Add($line)
  Write-Host $line -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}

function Note([string]$text) {
  $results.Add("       $text")
  Write-Host "       $text" -ForegroundColor DarkGray
}

# Runs a command INSIDE the package (with its identity and virtualization) and
# returns what it printed. Output goes to a file on this drive, which is not
# redirected, so it can be read back from outside.
function Invoke-InPackage([string]$familyName, [string]$commandLine, [int]$timeoutSeconds = 20) {
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $out = Join-Path $work ("out-" + [guid]::NewGuid().ToString('N') + '.txt')
  $done = "$out.done"
  # The whole line is wrapped in one more pair of quotes: `cmd /c` strips the
  # first and last quote, which otherwise breaks commands that start with one.
  $inner = "`"$commandLine > `"$out`" 2>&1 & echo done > `"$done`"`""
  Invoke-CommandInDesktopPackage -PackageFamilyName $familyName -AppId 'Kissa' -Command 'cmd.exe' -Args "/c $inner" -PreventBreakaway | Out-Null
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while (-not (Test-Path $done) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  if (Test-Path $out) { return (Get-Content -Raw -Path $out) } else { return '' }
}

# ── Remove ────────────────────────────────────────────────────────────────────
if ($Remove) {
  $existing = Get-AppxPackage -Name $packageName
  if ($existing) {
    Get-Process Kissa -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$layout*" } | Stop-Process -Force
    $existing | Remove-AppxPackage
    Write-Host "Removed $($existing.PackageFullName)."
  } else {
    Write-Host 'The Kissa test package is not installed.'
  }

  # If the manual check left the test build registered as the screensaver, its
  # file is gone now. Put back whatever was set before the test.
  $current = (Get-ItemProperty $regKey -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
  if ($current -like "*\Packages\$packageName*") {
    $saved = if (Test-Path $savedScreensaverFile) { (Get-Content -Raw $savedScreensaverFile).Trim() } else { '' }
    if ($saved) {
      Set-ItemProperty -Path $regKey -Name 'SCRNSAVE.EXE' -Value $saved
      Write-Host "Screensaver restored to: $saved"
    } else {
      Remove-ItemProperty -Path $regKey -Name 'SCRNSAVE.EXE' -ErrorAction SilentlyContinue
      Write-Host 'Screensaver setting cleared (none was set before the test).'
    }
  }
  Remove-Item $savedScreensaverFile -ErrorAction SilentlyContinue
  return
}

# ── Preconditions ─────────────────────────────────────────────────────────────
if (-not (Test-Path $manifest)) {
  Write-Host 'dist\store-layout not found. Run:  npm run build:store  then  npm run store:layout' -ForegroundColor Yellow
  exit 1
}

$unlock = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -ErrorAction SilentlyContinue
if ($unlock.AllowDevelopmentWithoutDevLicense -ne 1) {
  Write-Host 'Developer Mode is off. Turn it on, then run this script again:' -ForegroundColor Yellow
  Write-Host '  Settings > System > For developers > Developer Mode > On'
  exit 1
}

$results.Add("Kissa Store package test - $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
$results.Add("Windows $([System.Environment]::OSVersion.Version)")
$results.Add('')

$originalScreensaver = (Get-ItemProperty $regKey -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
# Keep the first value seen across repeated runs; a re-run must not overwrite it
# with the test build's own path.
if (-not (Test-Path $savedScreensaverFile) -and $originalScreensaver -notlike "*\Packages\$packageName*") {
  New-Item -ItemType Directory -Force -Path (Split-Path $savedScreensaverFile) | Out-Null
  Set-Content -Path $savedScreensaverFile -Value "$originalScreensaver" -Encoding UTF8
}
Note "Screensaver before the test: $(if ($originalScreensaver) { $originalScreensaver } else { '(none)' })"

try {
  # ── 1. Install ──────────────────────────────────────────────────────────────
  try {
    Get-AppxPackage -Name $packageName | Remove-AppxPackage -ErrorAction SilentlyContinue
    Add-AppxPackage -Register $manifest
    $package = Get-AppxPackage -Name $packageName
    Report 'Package installs (Windows accepts the manifest)' ($null -ne $package) $package.PackageFullName
  } catch {
    Report 'Package installs (Windows accepts the manifest)' $false $_.Exception.Message
    throw
  }
  $family = $package.PackageFamilyName
  $helper = Join-Path $layout 'app\resources\smtc-helper.exe'
  $bundledScr = Join-Path $layout 'app\Kissa.scr'
  $localState = Join-Path $env:LOCALAPPDATA "Packages\$family\LocalState"

  # ── 2. Identity ─────────────────────────────────────────────────────────────
  $info = Invoke-InPackage $family "`"$helper`" --package-info"
  Report 'Kissa has a package identity' ($info -match '"packaged":true' -and $info -match [regex]::Escape($family)) $info.Trim()

  # ── 3. Screensaver registry write reaches the real registry ─────────────────
  $probe = Join-Path $localState 'Kissa.scr'
  Invoke-InPackage $family "reg.exe add `"HKCU\Control Panel\Desktop`" /v SCRNSAVE.EXE /t REG_SZ /d `"$probe`" /f" | Out-Null
  $seenOutside = (Get-ItemProperty $regKey -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
  Report 'Screensaver registry write is visible to Windows' ($seenOutside -eq $probe) "real value: $seenOutside"

  # ── 4. LocalState copy is a real, runnable file ─────────────────────────────
  Invoke-InPackage $family "(if not exist `"$localState`" mkdir `"$localState`") & copy /y `"$bundledScr`" `"$probe`"" | Out-Null
  $copied = Test-Path $probe
  Report 'Kissa.scr copied into LocalState is a real file' $copied $probe
  if ($copied) {
    # /p is the screensaver "preview" switch: Kissa.scr exits immediately with code 0.
    $proc = Start-Process -FilePath $probe -ArgumentList '/p' -PassThru -Wait
    Report 'Windows can run that copy from outside the package' ($proc.ExitCode -eq 0) "exit code $($proc.ExitCode)"
  }

  # ── 5. Startup task ─────────────────────────────────────────────────────────
  $get = Invoke-InPackage $family "`"$helper`" --startup-task get"
  Report 'Startup task can be read' ($get -match '"ok":true') $get.Trim()
  $enable = Invoke-InPackage $family "`"$helper`" --startup-task enable"
  Report 'Startup task can be enabled' ($enable -match '"enabled":true') $enable.Trim()
  $disable = Invoke-InPackage $family "`"$helper`" --startup-task disable"
  Report 'Startup task can be disabled' ($disable -match '"ok":true' -and $disable -match '"enabled":false') $disable.Trim()
}
finally {
  # ── Restore the screensaver setting exactly as it was ───────────────────────
  if ($originalScreensaver) {
    Set-ItemProperty -Path $regKey -Name 'SCRNSAVE.EXE' -Value $originalScreensaver
  } else {
    Remove-ItemProperty -Path $regKey -Name 'SCRNSAVE.EXE' -ErrorAction SilentlyContinue
  }
  $restored = (Get-ItemProperty $regKey -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
  Note "Screensaver restored to: $(if ($restored) { $restored } else { '(none)' })"
  Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue

  $results | Set-Content -Path $resultsFile -Encoding UTF8
  Write-Host ''
  Write-Host "Results saved to $resultsFile"
}

# ── Manual checks ─────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Launching the Store build of Kissa. Close your installed Kissa first if it is running.' -ForegroundColor Cyan
Write-Host 'Please check by hand:'
Write-Host '  a. Play music in Spotify / Apple Music: the record picks it up, artwork and lyrics load.'
Write-Host '  b. Settings > Application: shows "Updated by Microsoft Store" and no update button.'
Write-Host '  c. Settings > Set as Windows Screensaver: click it, then open Windows Screen Saver Settings'
Write-Host '     and confirm Kissa is selected. Use Preview.'
Write-Host '  d. Settings > Start with Windows: toggle it, then look in Task Manager > Startup apps.'
Write-Host '  e. Tray icon menu has no "Check for Updates".'
Write-Host ''
Write-Host 'When finished:  powershell -ExecutionPolicy Bypass -File scripts\store-test.ps1 -Remove'
Start-Process "shell:AppsFolder\$family!Kissa"
