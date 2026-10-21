# Watch Atelier guard: puts the wallpaper back when Lively skipped restoring it.
#
# Lively can start before a monitor has woken up (or while Windows still sees it as a
# "Generic Non-PnP Monitor" without its real identity). It then logs "Screen missing,
# skipping restoration", parks the wallpaper on its disconnected-screen list and never
# retries, so the desktop stays bare after a restart.
#
# This runs from a scheduled task (at sign-in, on unlock and every few minutes) and does
# nothing unless Lively's own saved layout says Watch Atelier should be on screen while no
# web wallpaper is playing. A wallpaper you pick yourself, or "close all wallpapers", is left
# alone, and so is Lively when you've quit it.
#
#   -Trace   also log why a run did nothing (for troubleshooting)
param([switch]$Trace)
$ErrorActionPreference = 'SilentlyContinue'

$base = Join-Path $env:LOCALAPPDATA 'Lively Wallpaper'
$logFile = Join-Path $base 'WatchAtelier\guard.log'

function Write-GuardLog([string]$msg) {
  try {
    if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 200KB) { Remove-Item $logFile -Force }
    Add-Content -Path $logFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" -Encoding utf8
  } catch { }
}

function Test-Playing { [bool](Get-Process -Name 'Lively.Player.WebView2' -ErrorAction SilentlyContinue) }
function Skip([string]$why) { if ($Trace) { Write-GuardLog "skip: $why" }; exit 0 }

$lively = Get-Process -Name 'Lively' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $lively) { Skip 'Lively is not running' }    # not started yet, or quit on purpose
$livelyExe = $lively.Path
if (-not $livelyExe) { $livelyExe = Join-Path $env:ProgramFiles 'Lively Wallpaper\Lively.exe' }
if (Test-Playing) { Skip 'a wallpaper is playing' }

# Which Watch Atelier folder does Lively's saved layout want? (script installs use
# wallpapers\watch-atelier; a .zip import gets a random folder name, so match the title)
$layout = Get-Content (Join-Path $base 'WallpaperLayout.json') -Raw -Encoding utf8 | ConvertFrom-Json
$folder = $null
foreach ($entry in @($layout)) {
  $info = Join-Path $entry.LivelyInfoPath 'LivelyInfo.json'
  if (Test-Path $info) {
    $title = (Get-Content $info -Raw -Encoding utf8 | ConvertFrom-Json).Title
    if ($title -like 'Watch Atelier*') { $folder = $entry.LivelyInfoPath; break }
  }
}
if (-not $folder) { Skip 'the saved layout has no Watch Atelier wallpaper' }

# Wait for a real display: while a monitor wakes, Windows briefly reports a 1024x768
# placeholder (or nothing at all).
Add-Type -AssemblyName System.Windows.Forms
$deadline = (Get-Date).AddSeconds(90)
do {
  $big = [System.Windows.Forms.Screen]::AllScreens | Where-Object { $_.Bounds.Width * $_.Bounds.Height -gt 1024 * 768 }
  if ($big) { break }
  Start-Sleep -Seconds 3
} while ((Get-Date) -lt $deadline)
Start-Sleep -Seconds 5   # let the display settle
if (Test-Playing) { Skip 'Lively restored it meanwhile' }

& $livelyExe setwp --file $folder
$screens = ([System.Windows.Forms.Screen]::AllScreens | ForEach-Object { "$($_.DeviceName) $($_.Bounds.Width)x$($_.Bounds.Height)" }) -join ', '
Write-GuardLog "restored $folder (screens: $screens)"
