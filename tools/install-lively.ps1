# Installs (or updates) the "Watch Atelier" wallpaper in Lively Wallpaper and makes it
# the active wallpaper. Safe to re-run after every rebuild (node build.mjs).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-lively.ps1
#   ... -NoActivate        copy into Lively's library only (pick it in Lively yourself)
#   ... -ResetProperties   also reset this wallpaper's saved Lively settings (needed
#                          when LivelyProperties.json gained new options)
#   ... -NoGuard           skip installing the restart guard (tools\install-guard.ps1), the
#                          scheduled task that puts the wallpaper back when Lively skips it
#                          after a restart
#
# Lively must be installed and running. Nothing outside this wallpaper's own library
# folder (and the guard's Lively Wallpaper\WatchAtelier folder) is touched; other wallpapers
# in your library are left exactly as they are.
param([switch]$NoActivate, [switch]$ResetProperties, [switch]$NoGuard)
$ErrorActionPreference = 'Stop'

$src = Join-Path $PSScriptRoot '..\dist\lively' | Resolve-Path
if (-not (Test-Path (Join-Path $src 'LivelyInfo.json'))) { throw "Build first: node build.mjs (missing $src\LivelyInfo.json)" }

# The library folder name is fixed on purpose: Lively derives the page's storage origin
# from this exact path, so your chosen watch and settings survive updates.
$libRoot = Join-Path $env:LOCALAPPDATA 'Lively Wallpaper\Library'
$dest = Join-Path $libRoot 'wallpapers\watch-atelier'
New-Item -ItemType Directory -Force $dest | Out-Null
robocopy $src $dest /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
Write-Host "Copied wallpaper to $dest"

if ($ResetProperties) {
  $saved = Join-Path $libRoot 'SaveData\wpdata\watch-atelier'
  if (Test-Path $saved) { Remove-Item -Recurse -Force $saved; Write-Host 'Reset saved Lively settings for this wallpaper.' }
}

if (-not $NoGuard) { & (Join-Path $PSScriptRoot 'install-guard.ps1') }

if ($NoActivate) { Write-Host 'Installed (not activated). Pick "Watch Atelier" in Lively.'; return }

$proc = Get-Process -Name 'Lively' -ErrorAction SilentlyContinue | Select-Object -First 1
$lively = if ($proc -and $proc.Path) { $proc.Path } else { Join-Path $env:ProgramFiles 'Lively Wallpaper\Lively.exe' }
if (-not (Test-Path $lively)) { throw 'Lively.exe not found. Install Lively Wallpaper, start it, then run this again.' }
if (-not $proc) { Write-Warning 'Lively is not running; start it, then run this script again to activate.'; return }

& $lively setwp --file $dest
Write-Host 'Activated "Watch Atelier" in Lively.'
