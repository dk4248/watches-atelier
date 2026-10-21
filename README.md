# Watch Atelier

Real-time 3D replicas of four mechanical watches, made to run as an interactive live wallpaper.
Every wheel really meshes and turns at its true rate, in sync with your clock: the escapements
tick beat by beat, the Spring Drive glides, rotors swing with gravity and wind the mainspring.

**Website: [dk4248.github.io/watches-atelier](https://dk4248.github.io/watches-atelier/)**.
Try the live replica in your browser and download the wallpaper for Windows or Linux.

| Watch | Calibre | Look for |
|---|---|---|
| NOMOS Glashütte Tangente ref. 139 | DUW 4001, hand-wound | blued hands, Glashütte ribbing, crown winding |
| Grand Seiko SBGA211 "Snowflake" | 9R65 Spring Drive | snow-textured dial, gliding seconds, glide wheel, Magic Lever |
| NOMOS Tangente neomatik 38 Update ref. 147 | DUW 6101, automatic | ring date with red markers, gold-lettered rotor |
| Tudor Black Bay Pro M79470-0004 | MT5652, automatic GMT | engraved 24-hour bezel, GMT hand, instantaneous date |

Every part is labelled, with a description and facts. There are dial, movement, X-ray and
exploded views, a cinematic wallpaper loop, and a leather watch box for choosing the watch of
the day. The background is themed to the watch you're wearing.

## Install

The whole replica is one offline HTML file. Once it's on your computer it needs no server and
no internet connection.

### Windows (Lively Wallpaper)

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/) from the Microsoft Store, or run:
   ```powershell
   winget install --id rocksdanister.LivelyWallpaper -e
   ```
2. Download [`watches-atelier-lively.zip`](https://dk4248.github.io/watches-atelier/download/watches-atelier-lively.zip).
   It's also in this repository at `docs/download/`.
3. Open Lively, click **+** (Add wallpaper) and drop the zip in, or browse to it.
4. Click the new **Watch Atelier** tile to set it as your wallpaper. Lively doesn't apply imported
   zips automatically.
5. Optional: right-click the tile and choose **Customise** to set the watch of the day, view, idle
   time, labels, power saving and background.

Tips:
- Clicks reach the watch only on empty desktop. To keep icons out of the way, right-click the
  desktop and turn off **View → Show desktop icons**.
- Lively pauses the wallpaper behind full-screen and maximised apps.
- **Wallpaper missing after a restart?** Lively sometimes starts before your monitor has woken
  up, and then skips the wallpaper and never retries. The install script below also installs a
  small guard: a scheduled task that runs as you, with no admin rights and no window. After
  sign-in, on unlock and every 5 minutes it puts Watch Atelier back if Lively's saved layout wants
  it but nothing is playing. A wallpaper you pick yourself is left alone. If you imported the zip
  instead, download [`watches-atelier-guard.zip`](https://dk4248.github.io/watches-atelier/download/watches-atelier-guard.zip),
  unzip it and run this in that folder (add `-Remove` to take it out again):
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File install-guard.ps1
  ```
- To update, delete the old tile and import the new zip. From a clone of this repository, the
  install script updates in place and keeps your settings:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-lively.ps1
  ```
  Add `-ResetProperties` when the watch list has changed, so Lively's settings dropdown shows the
  new watches.

### Linux

1. Download the wallpaper file and keep it somewhere permanent:
   ```bash
   curl -L -o ~/watches-atelier.html https://dk4248.github.io/watches-atelier/wallpaper/index.html
   ```
   Or clone this repository; the same file is at `docs/wallpaper/index.html`.
2. Set it as your wallpaper, using the steps for your desktop below.

**KDE Plasma (recommended)**

1. Right-click the desktop and open **Desktop and Wallpaper…**.
2. Next to **Wallpaper type**, click **Get New Plugins…**, search for **HTML Wallpaper** and install it.
3. Choose **HTML Wallpaper** as the wallpaper type and set its URL to
   `file:///home/<you>/watches-atelier.html`.
4. To click and drag the watch, change **Layout** at the top of the same dialog from
   **Folder View** to **Desktop**. In Folder View the icons take the clicks.

If the wallpaper stays blank, install Qt WebEngine: `sudo pacman -S qt6-webengine` (Arch),
`sudo dnf install qt6-qtwebengine` (Fedora) or `sudo apt install qml6-module-qtwebengine`
(Debian, Ubuntu).

**Hyprland**

The `hyprwinwrap` plugin from `hyprland-plugins` pins a window as the wallpaper. Open the file in
a Chromium-based browser in app mode and add the window rule from hyprwinwrap's README:

```bash
chromium --app=file://$HOME/watches-atelier.html
```

**GNOME**

GNOME can't use a web page as its wallpaper; its live-wallpaper extensions play videos only. You
can still run the replica full screen on a workspace of its own:

```bash
chromium --kiosk file://$HOME/watches-atelier.html
```

**Online instead**

Any host that accepts a web address can load the hosted copy. It needs an internet connection when
the wallpaper starts: `https://dk4248.github.io/watches-atelier/wallpaper/`

## Controls

- Click the wallpaper to stop the animation and bring the controls back. Drag to turn the watch.
- `+` / `−` zoom. The mouse wheel also works where the host passes it through.
- **Watch box** (or `B`) opens the box. Click a watch to wear it today; the choice is remembered.
- **Wind** turns the crown. On the automatics, turning the watch swings the rotor too.
- After 2 minutes without input the page goes back to the wallpaper loop.

### URL options

Add these to the address after `#wallpaper`, separated by dots, for example
`watches-atelier.html#wallpaper.dial.taskbar0`:

| Token | Effect |
|---|---|
| `wallpaper` | wallpaper mode with the cinematic loop |
| `dial` / `movement` / `exploded` | a fixed view instead of the loop |
| `w-tangente-139`, `w-gs-sbga211`, `w-tangente-update-147`, `w-tudor-m79470` | start with that watch (overrides the last choice) |
| `idle30` … `idle600` / `idlenever` | seconds without input before returning to the wallpaper |
| `nolabels` | hide part labels in the wallpaper |
| `fps30` / `fps60` | always 30 fps (saves power) / never drop to 30 fps when idle |
| `light` / `dark` | background colour (default: matches the watch) |
| `taskbar0` / `taskbar<px>` | space kept free for a bottom panel (default 48 px; use `0` without one) |

## Build from source

Needs Node 18 or newer.

```bash
npm install
npm run build
```

This writes the Lively package to `dist/lively/` and the website's pages and downloads to
`docs/` (`app/`, `wallpaper/`, `download/`). The landing page `docs/index.html` and its images
in `docs/img/` are edited by hand. The other commands:

- `npm run dev` rebuilds on every change.
- `npm run check` runs the geometry validators.
- `node build.mjs --solo gs-sbga211:dial,hands` builds a page with only those parts of one watch.

The website is published by GitHub Pages from the `docs/` folder on `main`.

## Project layout

| Path | Contents |
|---|---|
| `src/core/` | kinematics (gear ratios, lever escapement, Spring Drive glide, rotor physics, power reserve), stage and lighting, procedural finishes, part registry |
| `src/watches/<id>/` | `spec.js` with measured dimensions and tooth counts, plus `parts/*.js` for the case, dial, hands, train, escapement and frame |
| `src/ui/` | HUD, labels, views, wallpaper modes, Lively integration |
| `src/box/` | the leather watch box |
| `docs/` | the website (GitHub Pages) |
| `research/` | measurements, build plans and validators (`check.mjs`) for each watch |
| `tools/` | Lively install script, zip writer, capture helper |
| `CONTRACT.md` | how a watch module plugs into the app |

## Notes

These are unofficial fan replicas for personal use. NOMOS Glashütte, Grand Seiko, Seiko and Tudor
names and logos belong to their owners. Hidden movement parts that no published photo or drawing
shows are estimates; their info panels say "estimated".
