# Packs Kissa for YouTube Music for the Chrome Web Store and Edge Add-ons (the same zip
# works for both). Only the files the add-on runs are included.
#   pwsh -File (PowerShell 7: Windows PowerShell 5.1 writes backslash paths stores reject) extensions/kissa-youtube-music/store/package.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$out = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $out | Out-Null
$zip = Join-Path $out ("kissa-youtube-music-{0}.zip" -f $manifest.version)
if (Test-Path $zip) { Remove-Item $zip }

$files = @('manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js', 'icons')
$stage = Join-Path ([IO.Path]::GetTempPath()) ("kissa-ytm-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $stage | Out-Null
try {
  foreach ($f in $files) { Copy-Item (Join-Path $root $f) $stage -Recurse }
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
} finally {
  Remove-Item $stage -Recurse -Force
}
Get-Item $zip | ForEach-Object { '{0}  {1:N0} KB' -f $_.FullName, ($_.Length / 1KB) }
