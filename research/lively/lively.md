# Lively Wallpaper: interactive WebGL web wallpaper (research, 2026-10-16)

Research only. Nothing was installed, launched, or changed. Machine facts in section 0 come from read-only checks (registry reads, directory listings, reading Settings.json and logs).

## Quick reference: exact keys and commands

| What | Value |
|---|---|
| Settings file | `%LOCALAPPDATA%\Lively Wallpaper\Settings.json` (Store build: `%LOCALAPPDATA%\Packages\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy\LocalCache\Local\Lively Wallpaper\Settings.json`) |
| Mouse forwarding | `"InputForward": 1`. The enum is `off=0, mouse=1, mousekeyboard=2`. Default is `1`. In the UI: Settings > Wallpaper > *Wallpaper input* = Off / Mouse / Keyboard. |
| Mouse moves while another app is focused | `"MouseInputMovAlways": true` (default `true`). In the UI this is the checkbox *Mouse interaction when application focused*. It affects mouse moves only. Clicks always require the desktop to be the foreground window. |
| Persistent localStorage | `"CefDiskCache": true` (default `false`). In the UI: Settings > Wallpaper > Web browser > *Disk cache*. |
| Web engine | `"WebBrowser": 1` (`cef=0, webview2=1`). WebView2 has been the default since v2.2.0. |
| CLI (no extra download) | `"<install>\Lively.exe" <verb> ...`. This only works while Lively is already running. On a first launch the args are ignored. |
| CLI utility | `Livelycu.exe`, from release asset `lively_command_utility.zip`. The installer does not include it. |
| Set wallpaper | `Lively.exe setwp --file "%LOCALAPPDATA%\Lively Wallpaper\Library\wallpapers\<folder>" [--monitor N]`. The folder must be inside the library. |
| Set property | `Lively.exe setprop --property "name=value" [--monitor N]` |
| Hide desktop icons | `Lively.exe --showIcons false` (the `app` verb is the default) |
| winget (default) | `winget install --id rocksdanister.LivelyWallpaper -e`. This is the GitHub build v2.2.1.0, installed machine-wide with UAC into `%ProgramFiles%\Lively Wallpaper`. |
| winget per-user, silent | `winget install --id rocksdanister.LivelyWallpaper -e --source winget --override "/SP- /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CURRENTUSER /NOAUTOLAUNCH /MERGETASKS=!desktopicon" --skip-dependencies --accept-package-agreements --accept-source-agreements`. This installs to `%LOCALAPPDATA%\Programs\Lively Wallpaper`. There is no UAC prompt only if the prerequisites are already installed (section 4). |
| Store build | `winget install --id 9NTM2QC6QWS7 --source msstore` (per-user MSIX, no UAC, sandboxed paths) |

---

## 0. Which code applies, and the state of this machine

- **Repository:** `rocksdanister/lively` now redirects to **`lively-community/lively`**. The default branch is `core-separation`, HEAD `25a0a5f4ed1988ff42117d3a17feb321062237fe` (2026-09-29).
- **Stable release:** v2.2.1.0 (2025-09-18), tag commit `6860a40...`. This is what winget installs: https://github.com/lively-community/lively/releases/tag/v2.2.1.0
- **Beta channel:** v2.2.1.4 (2025-11-29), in https://github.com/lively-community/lively-beta/releases
- **Store package:** latest is `2026.929.1548.0`, updated 2026-10-02, so it is newer than the GitHub stable build.
- I diffed `v2.2.1.0...core-separation` (GitHub compare API). The following files are unchanged: `RawInputMsgWindow.xaml.cs`, `InputUtil.cs`, `CommandHandler.cs`, `CommandlineArgs.cs`, `WebView2UserDataFactory.cs`, `LivelyPropertyFactory.cs`, `WallpaperExtensions.cs`, `ZipExtract.cs`, `FileTypes.cs`, `WallpaperLibraryFactory.cs`, `Playback.cs`. The input handlers in `WinDesktopCore.cs` are also unchanged; only the line numbers moved. The behaviour below therefore holds for v2.2.1.0, the beta, and HEAD/Store unless a difference is noted.

**This machine (read-only checks):**
- Lively **2.2.1.0 is already installed machine-wide** at `C:\Program Files\Lively Wallpaper`.
  - HKLM uninstall key `{E3E43E1B-DEC8-44BF-84A6-243DBA3F2CB1}}_is1`; Inno Setup 6.2.2; InstallDate 20261015.
  - HKCU Run value `Lively` points to that exe.
  - It is **currently running**: `Lively.exe` (core), 2x `Lively.Player.WebView2.exe`, `Lively.UI.WinUI.exe`, `Lively.Watchdog.exe`.
  - The `plugins` folder contains `Mpv, UI, Watchdog, WebView2`. There is no Cef plugin and no `Livelycu.exe`.
- Prerequisites are present:
  - VC++ x64 runtime v14.50.35719
  - .NET WindowsDesktop runtimes 8.0.22, **9.0.8**, 10.0.10
  - WebView2 Runtime 155.0.4283.45
  - winget is available.
- OS: Windows 11 **26H2**, build 26300.9711. This is the "raised desktop / layered ShellView" path that applies from 24H2 onward.
- Current `Settings.json`:
  - `InputForward=1`, `MouseInputMovAlways=true`, `WebBrowser=1`, **`CefDiskCache=true`**
  - `WallpaperArrangement=2` (**duplicate**)
  - `IsFirstRun=true`, which makes the UI pop up on every start until the main window is closed once.
  - `AppFullscreenPause=0`, `AppFocusPause=1`, `ProcessMonitorAlgorithm=3` (grid), `DisplayPauseSettings=0`, `AudioOnlyOnDesktop=true`.
- Desktop icons are **visible** (`HideIcons=0`).
- The active wallpaper on both displays (per `WallpaperLayout.json`) is `Library\wallpapers\tangente-observatory`:
  - `Type 1`, `FileName "dist/wallpaper.html"`, `Arguments "--pause-event true"`.
  - Displays: DISPLAY1 is 2560x1600, primary. DISPLAY2 is 5120x1440 at (-717,-1440).
  - The log shows WebView2 user data `...\WebView2\Lively.Player.WebView2\Duplicate` and scale 1.5.
  - `wallpaper.html` does `location.replace('./index.html?...')`, so NavigationCompleted fires twice per instance (visible in the log).

---

## 1. Mouse and keyboard input to web wallpapers

### 1.1 Settings

| UI (Settings > Wallpaper > Appearance & behavior) | Settings.json key | Values | Default |
|---|---|---|---|
| *Wallpaper input* combobox: Off / Mouse / Keyboard | `InputForward` (`InputForwardMode`) | `0`=off, `1`=mouse, `2`=mousekeyboard (the UI calls it "Keyboard"; it still includes mouse) | `1` |
| Checkbox *Mouse interaction when application focused* | `MouseInputMovAlways` (bool) | true: forward mouse moves even when another app is foreground. false: only when the desktop is foreground. | `true` |

Sources:
- SettingsModel.cs v2.2.1.0: L51/L56 (properties), L184-185 (defaults `InputForward = InputForwardMode.mouse; MouseInputMovAlways = true;`). https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Models/SettingsModel.cs
- `InputForwardMode.cs`: `off, mouse, mousekeyboard`.
- XAML: `SettingsWallpaperView.xaml` L57-70.
- Strings in `Strings/en-US/Resources.resw`: `WallpaperInput.Header` = "Wallpaper input", `MouseInteractOnDesktop.Content` = "Mouse interaction when application focused".
- The developer confirms the checkbox affects MOUSEMOVE only: https://github.com/rocksdanister/lively/issues/321

### 1.2 How forwarding works (code path)

The desktop layer cannot receive input. In the developer's words: "desktop wallpaper does not receive input otherwise" (https://github.com/rocksdanister/lively/issues/3042). The Lively **core** process (`Lively.exe`) therefore does the following:

1. **Raw input hook.** `RawInputMsgWindow` always registers HID mouse *and* keyboard with `RIDEV_INPUTSINK` (`ExInputSink`), because its `InputMode` is hard-coded to `mousekeyboard`. Filtering by setting happens per event, so changing `InputForward` in the UI applies immediately.
   - It handles `LeftButtonDown/Up`, `RightButtonDown/Up`, and `None` (move).
   - It reads the position with `GetCursorPos` (physical px; the core is PerMonitorV2 DPI-aware per `Lively/app.manifest`).
   - **The `MouseWheel` case is commented out ("Disabled, not tested yet")**, L123-151.
   - Source: https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively/Views/WindowMsg/RawInputMsgWindow.xaml.cs
2. **Filters** in `WinDesktopCore.cs` (v2.2.1.0 L1124-1269; HEAD L1157-1356):
   ```csharp
   // move
   if (InputForward == off || !IsDesktop() && !MouseInputMovAlways) return;
   // down / up
   if (InputForward == off || !IsDesktop()) return;
   // left forwarded unless buttons swapped; right forwarded only if swapped -> always sent as WM_LBUTTON*
   // keyboard
   if (InputForward != mousekeyboard || !IsDesktop()) return;
   private bool IsDesktop() {
       IntPtr hWnd = GetForegroundWindow();
       return hWnd == original_WorkerW || hWnd == progman;   // original_WorkerW = DesktopUtil.GetDesktopWorkerW()
   }
   ```
   On 24H2 and later, `GetDesktopWorkerW()` returns Progman itself, because `SHELLDLL_DefView` is a child of Progman (`DesktopUtil.cs`).
3. **Delivery** (`ForwardMouseToWallpapers`):
   - Coordinates are converted to display-local (`per`/`duplicate`) or virtual-screen-local (`span`).
   - Messages go only to wallpapers on the display under the cursor (all wallpapers in span mode), and only if `Category.IsDeviceInputAllowed()`. This is true for `web(1)`, `webaudio(2)`, `url(3)` and app types, and false for video/gif/picture (`WallpaperExtensions.cs` L34-52).
   - `InputUtil.cs` then calls `PostMessageW(InputHandle, WM_MOUSEMOVE | WM_LBUTTONDOWN | WM_LBUTTONUP, wParam, MAKELPARAM(x,y))`.
   - `wParam` is `MK_LBUTTON` (0x1) for down and up, but **`MK_MOVE = 0x0020` for moves**. That value is `MK_XBUTTON1` in WinUser.h. https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Common/Helpers/InputUtil.cs (L9-47)
   - For WebView2, `InputHandle` is the `Chrome_WidgetWin_1` child of `Chrome_WidgetWin_0` inside the player's WebView2 control. Source: `WebWebView2.cs` v2.2.1.0 L284-287.
4. **Chromium** turns these posted messages into ordinary, trusted browser mouse input:
   - `pointerdown/mousedown`, `pointerup/mouseup`, `click`, `pointermove/mousemove`, with `pointerType "mouse"` and `button 0`.
   - Chromium's `MouseStateFlags()` maps only `MK_LBUTTON / MK_MBUTTON / MK_RBUTTON` from wParam (https://github.com/chromium/chromium/blob/main/ui/events/win/events_win_utils.cc, `MouseStateFlags`). The 0x20 on forwarded moves is therefore ignored, so **`pointermove.buttons === 0` even during a drag**.

### 1.3 What reaches the page

| Input | Reaches page? | Details |
|---|---|---|
| Left click | **Yes**, as `pointerdown/mousedown`, `pointerup/mouseup`, `click` | Only while the **desktop is the foreground window**. Swapped mouse buttons: the physical right button is sent as left. `IsMouseButtonsSwapped` is read once at startup, so restart Lively after changing it (issue #2835 reports problems with swapped buttons). |
| Mouse move / hover | **Yes**, as `pointermove/mousemove` | Sent when the desktop is foreground, or always if `MouseInputMovAlways=true`. In that case moves are forwarded even while the cursor is over another app's window; Lively only checks which display the cursor is on. |
| Drag (down, moves, up) | **Yes, as a sequence** | Works for JS drags driven by pointerdown/pointerup state, such as three.js OrbitControls-style code. Users report it working (issues #853, #3042). **Do not test `e.buttons`/`e.which` on moves** (always 0, see 1.2). Browser-native drags may fail: scrollbar thumb drag fails per #853. Text selection, `<input type=range>` thumb drag and HTML5 DnD probably fail for the same reason (not runtime-verified). |
| Mouse wheel | **No** | Code is disabled. Open issue #3042 (2025-12, v2.2.1.0): "I haven't been able to make mouse wheel work". Open PR #3311 (2026-10-12) proposes `WM_MOUSEWHEEL` forwarding. https://github.com/rocksdanister/lively/issues/3042 , https://github.com/lively-community/lively/issues/3311 |
| Right / middle / X buttons | **No** | Right-click on the desktop opens Explorer's desktop context menu instead. The developer said in 2021 that only left-click and moves are handled (#853). |
| Touch / pen | Not forwarded (inference) | Raw input registers only HID mouse and keyboard. |
| Keyboard | **Optional** (`InputForward=2`) | See 1.5. |

**Hover and leave noise (inferred from Chromium source, not runtime-verified).**
- On each forwarded `WM_MOUSEMOVE`, Chromium calls `TrackMouseEvent(TME_LEAVE)`.
- The real cursor is over Explorer's desktop window, so Windows posts `WM_MOUSELEAVE` immediately.
- Chromium converts it into a mouse-exit because `WindowFromPoint(cursor)` is not its own HWND (https://github.com/chromium/chromium/blob/main/ui/views/win/hwnd_message_handler.cc, `HandleMouseEventInternal`, around L3450-3477).
- Expect spurious `pointerout/pointerleave/mouseleave`, and `:hover` styles that drop when the mouse stops. Do not end drags on leave events, and drive hover highlights from JS raycasts on `pointermove`.

### 1.4 "Only when the desktop is foreground", and desktop icons

- **Clicks are forwarded only when `GetForegroundWindow()` is Progman or the WorkerW that hosts the desktop icons.** The developer calls this "by design" (#321): otherwise clicks on a foreground app would also click the wallpaper behind it. Consequences:
  - The **first click after another window had focus usually only activates the desktop**; the second click registers (#321 describes exactly this "requires two clicks").
  - Clicking the taskbar, Start, widgets, notifications, or any app window moves the foreground away, and no clicks are forwarded until the empty desktop is clicked again (or Win+D is pressed).
  - The check is the foreground window, not the window under the cursor. While the desktop is foreground, clicks are forwarded wherever the cursor is.
- **Desktop icons interfere.**
  - Lively observes input passively via raw input and does not block it, so Explorer still receives every click. Clicking an icon both selects or launches it *and* is forwarded to the page.
  - A drag on the desktop draws Explorer's rubber-band selection (or drags icons) while the page also sees the drag.
  - Fix: hide the icons with desktop right-click > View > Show desktop icons, or `Lively.exe --showIcons false`, which sends `WM_COMMAND 0x7402` to `SHELLDLL_DefView` (`DesktopUtil.SetDesktopIconVisibility`).
  - Choosing **Keyboard** in Lively's UI automatically hides the icons, and leaving Keyboard mode shows them again (`SettingsWallpaperViewModel.cs` HEAD L117-138, same in v2.2.1.0 L120-135). **Editing `InputForward` in the JSON does not hide them.**
  - Wiki: https://github.com/rocksdanister/lively/wiki/Common-Problems ("Desktop icons are hidden when keyboard input enabled?")

### 1.5 Keyboard forwarding

- **Yes:** set `"InputForward": 2` (UI: "Keyboard").
- Raw keyboard events are re-posted as `WM_KEYDOWN/WM_KEYUP` (vkey and scan code) to the wallpaper on the display under the mouse cursor, only when the desktop is foreground (`InputUtil.ForwardMessageKeyboard`).
- Limitations:
  - The code comment says Alt combos won't work (context bit = 0).
  - IME input (e.g. Chinese) does not work (#316).
  - v2.2.0 release notes, known issue: key presses may be duplicated when the wallpaper itself has focus.
  - The UI choice hides desktop icons.
- Wiki: https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-:-Interaction#mouse--keyboard

---

## 2. Settings storage

- **Installer build:** `%LOCALAPPDATA%\Lively Wallpaper\Settings.json`. Other files in the same folder: `WallpaperLayout.json` (what runs on which display), `AppRules.json`, `logs\`, `WebView2\`, `Library\`.
  - Paths come from `Constants.cs` L12-30: `AppDataDir = LocalApplicationData\"Lively Wallpaper"`, `UserSettingsPath = AppDataDir\Settings.json`. https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Common/Constants.cs
  - These are per-user paths even for a machine-wide install (confirmed on this machine).
- **Store build:** `%LOCALAPPDATA%\Packages\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy\LocalCache\Local\Lively Wallpaper\` (MSIX redirection). Wiki *Getting Started > Storage*: https://github.com/rocksdanister/lively/wiki/Getting-Started
- **Format:** Newtonsoft.Json, indented. Property names are PascalCase and match `SettingsModel`. **Enums are integers** (no `StringEnumConverter`; `JsonStorage.cs`). Example: `"InputForward": 1, "WebBrowser": 1, "WallpaperArrangement": 0`. Save the file as UTF-8.
- **Is editing while Lively is closed honoured? Yes.**
  - The core reads the file once, in the `UserSettingsService` constructor at startup (`UserSettingsService.cs` L24-61, L87-96).
  - Newtonsoft calls the `SettingsModel()` constructor first, so a partial file is fine: missing keys keep their defaults.
  - Caveats:
    - **Fully exit Lively first.** Use tray > Exit or `Lively.exe --shutdown true`. Closing the UI window does not stop the core. While the core runs it keeps settings in memory and rewrites the file on every settings change, which overwrites manual edits.
    - **Invalid JSON is replaced by defaults.** `LoadOrInitialize` logs the error, then saves a fresh `SettingsModel`, overwriting your file (L119-138).
    - **Do not write an old `AppVersion`.** If `AppVersion` differs from the running build, the update path runs. If the previous version is < 2.2.0.0, `MigrateFromOlderVersions` resets `WebBrowser`, **`CefDiskCache=false`**, `WebDebugPort`, the pause algorithm and app rules (`AppInitializer.cs` L134-200). Omit `AppVersion` or set it to the installed version (`2.2.1.0`).
    - `IsFirstRun=true` makes the UI open on each start until the main window has been closed once. Set it to `false` to suppress this.
- Minimal file for this use case (with Lively stopped): `{ "InputForward": 1, "MouseInputMovAlways": true, "CefDiskCache": true, "WebBrowser": 1 }`.
- There is **no CLI command** to change `InputForward`, `MouseInputMovAlways` or `CefDiskCache`. Use the UI or the JSON.

---

## 3. Command-line control

**Executables:**
- **`Lively.exe`** (main exe). Examples: `C:\Program Files\Lively Wallpaper\Lively.exe` on this machine; `%LOCALAPPDATA%\Programs\Lively Wallpaper\Lively.exe` for a per-user install.
  - If Lively is already running, the new process sends its args over the gRPC named pipe `Grpc_LIVELY:DESKTOPWALLPAPERSYSTEM<UserName>` and exits (`App.xaml.cs` L64-84, which calls `CommandsServer.AutomationCommand` and then `CommandHandler.ParseArgs`).
  - **If Lively is not running, the args are ignored** (only `screensaver --showExclusive` is honoured; L96-105). Lively just starts and restores `WallpaperLayout.json`. Start Lively first, then send the command.
- **`Livelycu.exe`** is the separate "command utility": release asset `lively_command_utility.zip` (v2.2.1.0, 9,824,807 bytes), https://github.com/lively-community/lively/releases/tag/v2.2.1.0
  - It is not in the installer (verified on this machine).
  - Source: `src/Lively/Lively.Utility.Commandline/Program.cs`. It parses the same verbs (gives `--help`), then forwards the raw args through the same pipe. It prints `WARNING: Lively core is currently not running!` if the core mutex is absent.
  - Wiki usage: `livelycu app --volume 0`. https://github.com/rocksdanister/lively/wiki/Command-Line-Controls

**Verbs** (`CommandlineArgs.cs`): https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Common/CommandlineArgs.cs
```
app (default verb): --showApp true|false  --showIcons true|false  --volume 0-100|+N|-N  --play true|false
                    --startup true|false  --shutdown true  --layout per|span|duplicate
setwp      --file <folder|file|random|reload>  [--monitor N]
setprop    --property "name=value"             [--monitor N]
closewp    --monitor N|-1
seekwp     --value P|+P|-P                     [--monitor N]
screenshot --file out.jpg                      [--monitor N]
screensaver --show|--showExclusive|--configure|--preview <hwnd>|--fadeIn
```
`--monitor N` is 1-based, as in Lively's control panel (`DisplayManager`: `Index = i + 1`). If omitted, the primary display is used.

**`setwp` exact semantics** (`CommandHandler.cs` L146-287): https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively/Commandline/CommandHandler.cs
- **Folder with LivelyInfo.json:** works only if the folder's parent path contains `Settings.WallpaperDir`, i.e. it is `<Library>\wallpapers\<x>` or `<Library>\SaveData\wptmp\<x>`. Any other folder is **silently ignored** (L233-249).
  ```powershell
  & "C:\Program Files\Lively Wallpaper\Lively.exe" setwp --file "%LOCALAPPDATA%\Lively Wallpaper\Library\wallpapers\tangente-observatory"
  ```
- **`.html` file:** works only if it equals the `FilePath` of an existing library item. Example: `...\Library\wallpapers\<x>\index.html`, or for the current watch `...\tangente-observatory\dist/wallpaper.html` (that is how the library stores it). Otherwise Lively tries to auto-import, which only supports **media files** (video, picture, gif), so for HTML it logs "Unsupported command import file" and does nothing (L250-285). The wiki confirms: "this command will automatically import new wallpapers - provided they are media files ... only".
- **`.zip`: not supported by the CLI.** Import it via the UI, or extract it yourself into `<Library>\wallpapers\<name>\` (section 5) and run `setwp` on that folder.
- In **duplicate/span** layout, `setwp` applies to all displays.
- The result is saved to `WallpaperLayout.json` and restored on the next start (`WinDesktopCore.SaveWallpaperLayout`/`RestoreWallpaper`).

**`setprop`** (L363-486):
- Targets the wallpaper currently running on `--monitor` (default primary). How it was imported (zip, html, manual folder) does not matter.
- It edits the per-display copy `SaveData\wpdata\<folder>\<index|span|duplicate>\LivelyProperties.json` and sends the value to the page, which calls `livelyPropertyListener`. In duplicate/span it goes to every instance of that wallpaper.
- Value parsing:
  - `checkbox`: `name=true|false`
  - `slider`: number, or `++N` / `--N` relative to the current value, clamped to min/max
  - `dropdown`: index, or `++N` / `--N`
  - `color`: `name=#RRGGBB`
  - `textbox`: text (the arg is `Split("=")`, so a value containing `=` gets truncated)
  - `folderDropdown`: file name inside `folder`
- Special arguments:
  - button press: `setprop --property "myButton=true"`
  - reset to defaults: `setprop --property "lively_default_settings_reload=true"`
- Requires that the wallpaper has a `LivelyProperties.json`; otherwise nothing happens.
```powershell
$lively = "C:\Program Files\Lively Wallpaper\Lively.exe"
& $lively setprop --property "zoom=1.25" --monitor 1
& $lively setprop --property "resetView=true"
& $lively --showIcons false
& $lively setwp --file reload          # restart the running wallpaper(s)
& $lively --shutdown true              # exit core (needed before editing Settings.json / installing)
```
**Store build:** pass the *virtual* path `%LOCALAPPDATA%\Lively Wallpaper\Library\wallpapers\<x>`, not the `...\Packages\...\LocalCache\...` path. The check compares against the virtual `WallpaperDir` (wiki note under *Set Wallpaper*).

---

## 4. Installation

**winget package `rocksdanister.LivelyWallpaper` = the GitHub build.** Manifest 2.2.1.0: https://github.com/microsoft/winget-pkgs/blob/master/manifests/r/rocksdanister/LivelyWallpaper/2.2.1.0/rocksdanister.LivelyWallpaper.installer.yaml
- `InstallerType: inno`, `Scope: machine`, `InstallerSwitches.Custom: /ALLUSERS`, `ElevationRequirement: elevatesSelf`.
- `DefaultInstallLocation: %ProgramFiles%\Lively Wallpaper`.
- Dependencies: `Microsoft.VCRedist.2015+.x64` and `Microsoft.EdgeWebView2Runtime`.
- `Architecture: x64`; InstallerUrl `.../v2.2.1.0/lively_setup_x86_full_v2210.exe`. The "x86" in the name is legacy: the tag's `src/installer/Script_x64.iss` uses `ArchitecturesInstallIn64BitMode=x64`.
- A plain `winget install` therefore produces a **machine-wide install with a UAC prompt**. This is what is on this machine now.
- `--scope user` will not find an applicable installer, because only a machine installer is declared.

**The Inno installer itself supports per-user mode** (`Script_x64.iss` at v2.2.1.0): https://github.com/lively-community/lively/blob/v2.2.1.0/src/installer/Script_x64.iss
- `PrivilegesRequired=lowest`, `PrivilegesRequiredOverridesAllowed=dialog`, so `/CURRENTUSER` and `/ALLUSERS` are honoured. `DefaultDirName={autopf}\Lively Wallpaper`, which in non-admin mode is **`%LOCALAPPDATA%\Programs\Lively Wallpaper`**.
- It writes HKCU `...\Run` value `Lively`.
- `AppMutex=LIVELY:DESKTOPWALLPAPERSYSTEM`: setup and uninstall require Lively to be closed.
- The `postinstall` launch is skipped with the custom `/NOAUTOLAUNCH`.
- **UAC caveat:** the installer runs `VC_redist.x64.exe /install /quiet /norestart` if the VC++ 2015-2022 x64 runtime (MSI upgrade code `{36F68A90-239C-34DF-B58C-64B30153CE35}`) is below 14.30.30704. It runs `windowsdesktop-runtime-9.0.8-win-x64.exe /install /quiet /norestart` if .NET Desktop Runtime 9.0.8 or later is missing. Both are machine-wide and **trigger UAC**. A per-user install is UAC-free only when both are already present, as they are on this machine. The wiki says the installer build "Require[s] installation of .NET runtime and other dependencies (admin account is required during installation.)": https://github.com/rocksdanister/lively/wiki/Differences-Between-Distributions
- **Silent per-user via winget.** `--override` replaces all manifest switches, including `/ALLUSERS`:
  ```
  winget install --id rocksdanister.LivelyWallpaper --exact --source winget ^
    --override "/SP- /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CURRENTUSER /NOAUTOLAUNCH /MERGETASKS=!desktopicon" ^
    --skip-dependencies --accept-package-agreements --accept-source-agreements --disable-interactivity
  ```
  - Drop `--skip-dependencies` if VC++ x64 or WebView2 might be missing; those dependency installs need UAC.
  - Repeat the same `--override` on `winget upgrade`. Otherwise the manifest's `/ALLUSERS` is used again.
  - **On this machine a per-user install is unnecessary.** It would also clash with the existing machine install: the setup's `UnInstallOldVersion()` finds the HKLM uninstall string and runs the admin uninstaller, which needs UAC.
- **Microsoft Store build `9NTM2QC6QWS7`** (Store API: `InstallerType msstore`, **`Scope user`**, PFN `12030rocksdanister.LivelyWallpaper_97hta09mmv6hy`):
  - Install: `winget install --id 9NTM2QC6QWS7 --source msstore --accept-package-agreements --accept-source-agreements`. Per-user MSIX, no UAC, no prerequisite installers.
  - Differences:
    - Data and library live under `%LOCALAPPDATA%\Packages\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy\LocalCache\Local\Lively Wallpaper\`. The app itself sees `%LOCALAPPDATA%\Lively Wallpaper\...`; use the virtual path in the CLI.
    - No application/game wallpapers (`MsixNotAllowedException`).
    - Cannot add plugins (no CefSharp).
    - The beta channel switch is unavailable.
    - Data is deleted automatically on uninstall.
    - Startup uses an MSIX StartupTask.
    - The Store build is currently newer (2026.929) than GitHub stable. The input code is the same.

---

## 5. Library location and import

Default library is `Settings.WallpaperDir` = `%LOCALAPPDATA%\Lively Wallpaper\Library` (changeable in Settings > General; existing wallpapers are moved when `WallpaperDirMoveExistingWallpaperNewDir=true`). Subfolders (`Constants.CommonPartialPaths`):
- `wallpapers\<folder>`: zip imports, bundled wallpapers, gallery downloads.
- `SaveData\wptmp\<folder>`: wallpapers created from a single file or URL via *Add wallpaper*, and media imported by CLI.
- `SaveData\wpdata\<folderName>\<displayIndex | span | duplicate>\LivelyProperties.json`: the per-display customisation **copy** (`LivelyPropertyFactory.cs`).

The library UI and the CLI scan only `wallpapers\*` and `SaveData\wptmp\*` subfolders that contain `LivelyInfo.json` (`LibraryViewModel` L77-78, `CommandHandler.GetWallpapers`).

**Survives deletion of the original?**
- **.zip import:** yes. It is extracted to `wallpapers\<Path.GetRandomFileName()>` (e.g. `xn0quq52.bq2`).
- **.html import via UI (v2.2.0 and later):** yes. After you confirm the "project folder" dialog and the preview dialog, the **entire folder containing the .html is copied recursively** into `SaveData\wptmp\<random>`, and LivelyInfo.json is rewritten with `IsAbsolutePath=false` (`WinDesktopCoreServer.CreateWallpaper`, `LibraryPreviewViewModel` L93-98, `WallpaperLibraryFactory.ConvertAbsoluteToRelativePathAsync`).
  - Release notes v2.2.0: "copies wallpaper file(s) to the wallpaper library location instead of just referencing the original path".
  - Imports made before 2.2 still reference the original path; use *Edit* to migrate them.
  - The HTML import refuses a folder that already contains a `LivelyInfo.json` ("It looks like this project is already packaged"). Import packaged projects as a .zip, or copy them manually.
- **Manual install (works, and equals what a zip import does):** copy the project to `%LOCALAPPDATA%\Lively Wallpaper\Library\wallpapers\<fixed-name>\`. It shows in the library after the UI rescans (UI restart), and `setwp --file` works on it. A **fixed folder name** keeps both the property-copy path and the WebView2 origin stable (section 6.2). The current watch already uses `wallpapers\tangente-observatory`.

**.zip import rules:**
- **`LivelyInfo.json` must be at the zip root.** `ZipFile.FindEntry("LivelyInfo.json", ignoreCase: true)` matches the exact entry name, so `watch/LivelyInfo.json` inside a top-level folder is rejected with "Not Lively .zip" (`FileTypes.IsWallpaperPackage`, `ZipExtract.cs` L28). https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Common/Helpers/Archive/ZipExtract.cs
- All entries are extracted with their relative paths.
- **Zip imports are not auto-applied** ("We do not autoSetWallpaper for .zip", `LibraryViewModel.cs` v2.2.1.0 L568). Click the tile, or run `setwp` on the new folder.
- The `.zip` extension is required (`IsWallpaperPackageExtension`).
- In LivelyInfo.json use `IsAbsolutePath:false` and relative `FileName`, `Thumbnail` and `Preview`.
- UI path: + (Add wallpaper) > browse or drag-drop the .zip. Bulk drag-drop accepts zips and media.

---

## 6. Web wallpaper runtime

### 6.1 Engine
- **WebView2 (Edge Chromium) is the default since v2.2.0**: `WebBrowser = webview2` and `Constants.AppDefaults.WebBrowser`. Player: `<install>\plugins\webview2\Lively.Player.WebView2.exe`.
- CefSharp is an optional plugin (`lively_player_cefsharp.zip` into `plugins\cef\`; not available in the Store build). Release notes v2.2.0: https://github.com/lively-community/lively/releases/tag/v2.2.0.0 . Wiki: https://github.com/rocksdanister/lively/wiki/Web-Player
- WebView2 options:
  - `--autoplay-policy=no-user-gesture-required`. HEAD also adds `--disable-features=HardwareMediaKeyHandling`.
  - Context menu and browser accelerator keys are disabled.
  - User-initiated new-window requests (e.g. `target=_blank` links) open in the default browser.
  - Downloads are cancelled.
  - The window is `WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE`.
  - Source: `Lively.Player.WebView2/Form1.cs` v2.2.1.0 L111-120, L137-144, L183-189.
- **Local pages are served over a virtual HTTPS host.** `SetVirtualHostNameToFolderMapping("<hash>.localhost", <folder of the html>)`, then navigate to `https://<hash>.localhost/<file>.html` (`CoreWebView2Extensions.NavigateToLocalPath`).
  - The page is a secure context: ES modules, `fetch()` of local GLB/texture files, WASM and workers all work, with no `file://` CORS problems.
  - **Only files under the html's folder are reachable.** For `FileName "dist/wallpaper.html"` the host root is `dist\`.
- **Debugging:** Settings > Wallpaper > Web browser > *Debugging port* toggle (`WebDebugPort="9223"`). WebView2 ignores the port and opens a **DevTools window** for each web wallpaper (Form1 L189-195).

### 6.2 localStorage persistence
- WebView2 user-data folder (`WallpaperPluginFactory.GetWebView2UserDataDir`, v2.2.1.0 L199-200; `WebView2UserDataFactory.cs`):
  - **`CefDiskCache=false` (default):** `%TEMP%\Lively Wallpaper\CEF\<random>`. This is a new profile for every wallpaper start, and the folder is emptied at the next Lively start (`AppInitializer.CleanTempFiles` empties `CefRootCacheDir`). **localStorage, IndexedDB and cookies are lost.** Wiki: "Uses memory cache, settings and cookie gets removed on exit (disk cache can be configured in lively settings.)"
  - **`CefDiskCache=true`:** `%LOCALAPPDATA%\Lively Wallpaper\WebView2\Lively.Player.WebView2\` + `PerScreen\Monitor_<index>` (per layout), `Span`, or `Duplicate`. Persistent. In duplicate mode both instances share one profile, and therefore one localStorage.
  - The windowed preview always uses a temp profile.
  - Release notes v2.2.0: "Fixed website login not persisting across wallpaper restarts, requires disk cache to be enabled in settings."
- **The origin depends on the path.** The host is the first 8 bytes of SHA1 of the html's **folder path string** (`LinkUtil.GetStableHostName`). The origin, and so localStorage, changes if:
  - the wallpaper is re-imported into a new random folder,
  - the library moves,
  - the layout changes (per vs duplicate vs span use different profiles),
  - `setwp` is called with a **differently-cased path**. Always use the same exact path string.
- The officially recommended persistent alternative is LivelyProperties: values are saved by Lively per display and layout, independent of the disk cache.

### 6.3 WebGL2 and GPU
- Same Chromium as Edge. WebGL2 is available whenever Edge's GPU path is (check `chrome://gpu` or `getContext('webgl2')` in the DevTools window).
- Lively passes no GPU-disabling flags.
- Lively's *Hardware decode* toggle (`VideoPlayerHwAccel`) affects only mpv/VLC video wallpapers, not web.
- In multi-monitor setups Lively sets WebView2 `RasterizationScale` to the display's DPI scale ("Attempt to set scale: 1.5" in this machine's log).

### 6.4 Pause rules and what the page sees
- **Defaults:**
  - `AppFullscreenPause=0` (pause)
  - `AppFocusPause=1` (ignore)
  - `BatteryPause=1` (ignore)
  - `PowerSaveModePause=1` (ignore)
  - `RemoteDesktopPause=0` (pause)
  - `ProcessMonitorAlgorithm=3` (**grid**)
  - `DisplayPauseSettings=0` (per display)
  - Timer 500 ms
  - Lock screen pauses.
- **Grid rule:** a display counts as covered if any **maximized** window is on it, any window covers 95% or more of the working area, or the grid tiles are 95% or more covered (`WindowUtil.IsDisplayCoveredByWindowGrid`; `Playback.cs` L358-368). https://github.com/rocksdanister/lively/wiki/Performance#pause-algorithms
- **Duplicate layout forces "all screens":** a maximized app on *either* monitor pauses the watch on *both* (`Playback.cs` `effectiveDisplayPauseSetting`; v2.2.0 notes). Use the `per` layout (`WallpaperArrangement=0`) with the same wallpaper set on each monitor if one screen should keep running.
- **When paused (WebView2):**
  - The GPU process (owner of the "Intermediate D3D Window") is frozen with `DebugActiveProcess`. In v2.2.1.0 the core does this (`WebWebView2.cs` L128-138); in HEAD the player does it.
  - **Rendering and `requestAnimationFrame` stop, but JavaScript (timers, input handlers) keeps running.** Wiki: "Only rendering is paused ... JavaScript code can be still executed during pause."
  - **No `visibilitychange`.** Lively never sets WebView2 `IsVisible=false` or calls `TrySuspendAsync`, so `document.hidden` stays false (code inspection).
  - All `<video>/<audio>` elements are paused. **On resume, `.play()` is called on all of them**, including ones the page had paused itself (`TryPauseMedia` / `TryPlayMedia`; the player always gets `--wallpaper-pause-media`). Use Web Audio for sound effects.
  - With `"Arguments": "--pause-event true"` in LivelyInfo.json, the page gets `livelyWallpaperPlaybackChanged(data)` where `data` is a JSON **string** `{"IsPaused":true|false}`. A stray second argument `1` is passed because of a `Formatting.Indented` slip. https://github.com/rocksdanister/lively/wiki/Web-Guide-V-:-System-Data#--pause-event
  - Clamp the frame delta after resume.
- **Audio:**
  - WebView2 has no volume control, only mute: `AudioVolumeGlobal==0` mutes, otherwise the page plays at full volume.
  - `AudioOnlyOnDesktop=true` (default) mutes when any window is on that display.
  - In duplicate layout non-primary instances are muted.
  - Autoplay is allowed without a gesture.
  - WebView2 plays H.264 (CefSharp does not).

---

## 7. LivelyInfo.json and LivelyProperties.json

**LivelyInfo.json** (`LivelyInfoModel.cs`; Newtonsoft, case-insensitive). Fields:
- `AppVersion` (string)
- `Title`, `Thumbnail`, `Preview`, `Desc`, `Author`, `License`, `Contact`
- **`Type`** (int)
- **`FileName`**
- `Arguments`
- **`IsAbsolutePath`**
- `Id` (gallery)
- `Tags` (string[])
- `Version` (int)

`WallpaperType` values: `0 app, 1 web, 2 webaudio (adds --audio), 3 url, 4 bizhawk, 5 unity, 6 godot, 7 video, 8 gif, 9 unityaudio, 10 videostream, 11 picture`.

Notes:
- With `IsAbsolutePath=false`, `FileName`, `Thumbnail` and `Preview` are relative to the LivelyInfo folder. `FileName` may include a subfolder (`"dist/wallpaper.html"`).
- **`LivelyProperties.json` must sit next to LivelyInfo.json** (the wallpaper root), not next to the html.
- Optional `LivelyInfo.loc.json` and `LivelyProperties.loc.json` for localisation (v2.2.0 and later).
- `Arguments` (space-separated) are rewritten from `--x` to `--wallpaper-x` and passed to the player. Valid values: `--audio`, `--system-information`, `--system-nowplaying`, `--pause-event true`. **Any unknown option makes the player exit with code 87** ("Unknown options are passed").

```json
{
  "AppVersion": "2.2.1.0",
  "Title": "3D Watch",
  "Thumbnail": "thumbnail.jpg",
  "Preview": "preview.gif",
  "Desc": "Drag to rotate, click to interact",
  "Author": "me",
  "License": "",
  "Contact": "",
  "Type": 1,
  "FileName": "index.html",
  "Arguments": "--pause-event true",
  "IsAbsolutePath": false
}
```
Official sample (`rocksdanister/shadertoy-heartfelt` LivelyInfo.json) uses exactly these fields: `Type: 1`, `FileName: "index.html"`, `Arguments: "--pause-event true"`, `IsAbsolutePath: false`.

**LivelyProperties.json:**
- The root object maps control names to control objects. Names should start with a lowercase letter.
- Schema: https://github.com/lively-community/lively/blob/core-separation/schemas/livelyPropertiesSchema.json . The schema requires `type` and `value`. Wiki: https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-:-Interaction
- The parser is `LivelyControlModelConverter`. **An unknown `type` throws**, and the whole file is then unusable.
- Common optional key: `"help"` (tooltip).

| `type` | Required keys | `val` passed to `livelyPropertyListener` |
|---|---|---|
| `slider` | `text, min, max, step, value` (number) | **number** (C# `double`; fractional if `step`<1). The wiki says "Integer" but the code uses double. |
| `dropdown` | `text, items[], value` (index) | **integer** index (0-based) |
| `checkbox` | `text, value` (bool) | **boolean** |
| `color` | `text, value` ("#RRGGBB") | **string** `"#RRGGBB"` (the UI emits uppercase, no alpha) |
| `textbox` | `text, value` (string) | **string**; sent on every keystroke |
| `button` | `text, value` (button caption) | **`true`** on press; not sent on load |
| `folderDropdown` | `text, folder, filter ("*.jpg\|*.png"), value` (file name) | **string** relative path `folder\file` (backslash), or `null` if the file is missing. `folder` is relative to the html's directory. |
| `label` | `value` (text) | never sent |
| (`scalerDropdown`) | internal, for media wallpapers | integer |

```json
{
  "zoom":      { "type": "slider",   "text": "Zoom", "min": 0.5, "max": 2, "step": 0.05, "value": 1 },
  "watch":     { "type": "dropdown", "text": "Watch", "items": ["A", "B", "C"], "value": 0 },
  "mechanics": { "type": "checkbox", "text": "Show movement", "value": true },
  "accent":    { "type": "color",    "text": "Accent", "value": "#C0C0C0" },
  "hdr":       { "type": "label",    "value": "Camera" },
  "resetView": { "type": "button",   "text": "Reset camera", "value": "Reset" }
}
```

**How `livelyPropertyListener(name, val)` is called (WebView2 player):**
- Calls go through `ExecuteScriptAsync("livelyPropertyListener(" + JSON(name) + ", " + JSON(val) + ");")` in the **top-level document** (`CoreWebView2Extensions.ExecuteScriptFunctionAsync`).
- It must be a **global**. Inside an ES module, assign `window.livelyPropertyListener = (name, val) => {...}`. A missing function just throws inside the page and the call is lost.
- **On load:** after **every main-frame `NavigationCompleted`** (about the window `load` event), Lively calls it **once for every property except `button` and `label`**, in file order. Values come from the per-display copy `SaveData\wpdata\...\LivelyProperties.json` (the user's last values), not from the original file (`Form1.cs` v2.2.1.0 L283; `LivelyPropertyUtil.LoadProperty`).
  - A redirect page such as `wallpaper.html` triggers the calls twice; the final page gets its own round.
  - If the listener is attached only after async loading (for example after top-level `await`), buffer: define it synchronously early and apply values later.
- **On change:** customise-panel edits or CLI `setprop` call it with the new value. *Restore default* re-copies the original file and re-sends every value.
- **The copy is created only once.** After editing the wallpaper's own `LivelyProperties.json` (e.g. adding a control), press *Restore default*, run `setprop --property "lively_default_settings_reload=true"`, or delete `SaveData\wpdata\<folder>\`.

---

## 8. Checklist so that clicks reliably reach the page on Windows 11

1. The **Lively core is running.** Tray icon / `Lively.exe` process; this machine also has HKCU Run registered. Input forwarding lives in the core, not the UI.
2. Use **`InputForward = 1` (Mouse)**, or `2` if keys are needed. Use wallpaper `Type` 1, 2 or 3; video, gif and picture never receive input.
3. **The desktop must be the foreground window.** Click an empty desktop spot once, or press Win+D. The first click after another app had focus is normally swallowed (#321, by design). Taskbar, Start, widgets, and overlays such as Fences or Rainmeter skins take the foreground when clicked; then clicks are not forwarded until the desktop is clicked again. Keep interactive UI out of the taskbar strip: the page covers the full display `Bounds`, including under the taskbar (#311).
4. **Hide desktop icons** (`Lively.exe --showIcons false`, or desktop right-click > View). Otherwise every click and drag also selects, drags or launches icons. Icons are currently visible on this machine.
5. **Left button only.** Right, middle and wheel never arrive. Provide on-page buttons or LivelyProperties sliders for zoom. The watch project's `wheel` zoom and right/middle-button "move"/"roll" modes will not fire under Lively.
6. **Page-side input handling:**
   - Track the drag from `pointerdown` to `pointerup`, with window-level move/up listeners and pointer capture in a try/catch.
   - Never read `e.buttons` on moves (it is 0).
   - Don't end drags on `pointerleave/out`.
   - Don't rely on native drags (scrollbars, range thumbs, HTML5 DnD) or on persistent `:hover`.
   - `free-orbit.js` in the installed watch already follows the first three rules.
7. **Not paused.** A maximized window on either monitor pauses both instances in duplicate layout. Rendering freezes, but input events still reach JS. To see what Lively thinks covers the screen: tray > Report Bug > Grid Detection Overlay.
8. **Multi-monitor:** input goes only to the instance on the display under the cursor, in display-local physical pixels that Chromium maps to CSS px.
9. **Swapped mouse buttons:** restart Lively after changing them.
10. **Keep Lively at normal integrity.** Launch it normally, not from an elevated shell. The Inno postinstall launch runs as the original user by default; `/NOAUTOLAUNCH` avoids it entirely.
11. **Logs:** `%LOCALAPPDATA%\Lively Wallpaper\logs\*.txt`, or tray > Report Bug > Create log report file. With the debugging-port toggle on, a DevTools window lets you `addEventListener('pointerdown', console.log)` to confirm delivery.

---

## Source index
- Repo (moved): https://github.com/lively-community/lively (old URL https://github.com/rocksdanister/lively redirects). Tag v2.2.1.0 = `6860a4093fc50058c4815908658a4391c4449935`; HEAD = `25a0a5f4ed1988ff42117d3a17feb321062237fe`.
- Key files (prefix `https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/`):
  - `Lively.Models/SettingsModel.cs`
  - `Lively.Models/Enums/InputForwardMode.cs`
  - `Lively.Models/Enums/WallpaperType.cs`
  - `Lively.Models/LivelyInfoModel.cs`
  - `Lively.Models/LivelyControls/*.cs`
  - `Lively/Views/WindowMsg/RawInputMsgWindow.xaml.cs`
  - `Lively/Core/WinDesktopCore.cs` (L1124-1269)
  - `Lively.Common/Helpers/InputUtil.cs`
  - `Lively.Common/Extensions/WallpaperExtensions.cs`
  - `Lively.Common/Helpers/Shell/DesktopUtil.cs`
  - `Lively/Core/Wallpapers/WebWebView2.cs`
  - `Lively.Player.WebView2/Form1.cs`
  - `Lively.Player.WebView2/Extensions/WebView2/CoreWebView2Extensions.cs`
  - `Lively.Player.WebView2/StartArgs.cs`
  - `Lively/Factories/WallpaperPluginFactory.cs`
  - `Lively/Factories/WebView2UserDataFactory.cs`
  - `Lively/Factories/LivelyPropertyFactory.cs`
  - `Lively/Services/UserSettingsService.cs`
  - `Lively.Common/Helpers/Storage/JsonStorage.cs`
  - `Lively.Common/Constants.cs`
  - `Lively/AppInitializer.cs`
  - `Lively/App.xaml.cs`
  - `Lively/Commandline/CommandHandler.cs`
  - `Lively.Common/CommandlineArgs.cs`
  - `Lively.Utility.Commandline/Program.cs`
  - `Lively/RPC/CommandsServer.cs`
  - `Lively/RPC/WinDesktopCoreServer.cs`
  - `Lively.Common/Factories/WallpaperLibraryFactory.cs`
  - `Lively.UI.Shared/ViewModels/LibraryViewModel.cs`
  - `Lively.Common/Helpers/Archive/ZipExtract.cs`
  - `Lively.Common/FileTypes.cs`
  - `Lively.Common/Helpers/LivelyPropertyUtil.cs`
  - `Lively.Common/JsonConverters/LivelyControlModelConverter.cs`
  - `Lively.Common/Helpers/LinkUtil.cs`
  - `Lively/Core/Suspend/Playback.cs`
  - `Lively.Common/Helpers/WindowUtil.cs`
  - `Lively.UI.Shared/ViewModels/Settings/SettingsWallpaperViewModel.cs`
  - `Lively.UI.WinUI/Views/Pages/Settings/SettingsWallpaperView.xaml`
  - `Lively.UI.WinUI/Strings/en-US/Resources.resw`
  - `../installer/Script_x64.iss`
  - `../../schemas/livelyPropertiesSchema.json`
- Wiki pages:
  - https://github.com/rocksdanister/lively/wiki/Command-Line-Controls
  - https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-:-Interaction
  - https://github.com/rocksdanister/lively/wiki/Web-Guide-V-:-System-Data
  - https://github.com/rocksdanister/lively/wiki/Web-Player
  - https://github.com/rocksdanister/lively/wiki/Performance
  - https://github.com/rocksdanister/lively/wiki/Getting-Started
  - https://github.com/rocksdanister/lively/wiki/Differences-Between-Distributions
  - https://github.com/rocksdanister/lively/wiki/Common-Problems
- Releases: https://github.com/lively-community/lively/releases (v2.2.0.0 and v2.2.1.0 notes), https://github.com/lively-community/lively-beta/releases
- Issues: #321 (first click / foreground by design), #853 (wheel and drag), #3042 (wheel, v2.2.1.0, Win11 25H2), PR #3311 (wheel forwarding, open), #2835 (swapped buttons), #683 (desktop icon clicks), #1304 (right click), #316 (IME), #311 (taskbar overlap).
- winget: https://github.com/microsoft/winget-pkgs/tree/master/manifests/r/rocksdanister/LivelyWallpaper/2.2.1.0
- Store: https://apps.microsoft.com/detail/9NTM2QC6QWS7 ; API used: `https://storeedgefd.dsx.mp.microsoft.com/v9.0/packageManifests/9NTM2QC6QWS7?Market=US`, `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=9NTM2QC6QWS7&market=US&languages=en-US`
- Chromium input mapping:
  - https://github.com/chromium/chromium/blob/main/ui/events/win/events_win_utils.cc (`MouseStateFlags`)
  - https://github.com/chromium/chromium/blob/main/ui/views/win/hwnd_message_handler.cc (`HandleMouseEventInternal`)

**Verification levels:**
- **From source and docs:** everything above, except the items listed next.
- **Inferred from source, not tested at runtime:** spurious leave/hover events; native drags failing; touch not being forwarded.
- **Not run by me:** Lively, winget, the CLI. No settings were changed.
