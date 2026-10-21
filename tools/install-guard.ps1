# Installs (or updates) the Watch Atelier guard: a scheduled task that puts the wallpaper back
# when Lively skipped restoring it after a restart or wake (see lively-guard.ps1). It runs as
# you, needs no admin rights, and shows no window.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-guard.ps1
#   ... -Remove    remove the task and its files again
param([switch]$Remove)
$ErrorActionPreference = 'Stop'

$taskName = 'Watch Atelier wallpaper guard'
$dir = Join-Path $env:LOCALAPPDATA 'Lively Wallpaper\WatchAtelier'
$guard = Join-Path $dir 'lively-guard.ps1'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
  Write-Host 'Removed the Watch Atelier wallpaper guard.'
  return
}

New-Item -ItemType Directory -Force $dir | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'lively-guard.ps1') $guard -Force

$user = "$env:USERDOMAIN\$env:USERNAME"
# conhost --headless runs PowerShell without flashing a console window.
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\conhost.exe" `
  -Argument "--headless powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$guard`""

# after sign-in (monitors may still be waking), after unlock (wake from sleep), and every
# 5 minutes (docking, a monitor switched on later); each run is a quick check
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$logon.Delay = 'PT40S'
$unlockClass = Get-CimClass -Namespace 'Root/Microsoft/Windows/TaskScheduler' -ClassName 'MSFT_TaskSessionStateChangeTrigger'
$unlock = New-CimInstance -CimClass $unlockClass -ClientOnly -Property @{
  StateChange = [uint32]8   # session unlock
  UserId = $user
  Delay = 'PT15S'
  Enabled = $true
}
$every = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 3)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logon, $unlock, $every) `
  -Settings $settings -Principal $principal -Force `
  -Description 'Puts the Watch Atelier live wallpaper back when Lively skips restoring it after a restart (monitor not ready yet). Does nothing while a wallpaper is playing or when you picked another one.' | Out-Null
Write-Host "Installed '$taskName': checks at sign-in, on unlock and every 5 minutes."
Write-Host "Log of restores: $dir\guard.log"
