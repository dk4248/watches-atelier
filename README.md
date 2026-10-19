# Watch Atelier

Real-time 3D replicas of four mechanical watches, made to run as an interactive live wallpaper.
Every wheel really meshes and turns at its true rate, in sync with your clock: the escapements
tick beat by beat, the Spring Drive glides, rotors swing with gravity and wind the mainspring.

| Watch | Calibre | Look for |
|---|---|---|
| NOMOS Glashütte Tangente ref. 139 | DUW 4001, hand-wound | blued hands, Glashütte ribbing, crown winding |
| Grand Seiko SBGA211 "Snowflake" | 9R65 Spring Drive | snow-textured dial, gliding seconds, glide wheel, Magic Lever |
| NOMOS Tangente neomatik 38 Update ref. 147 | DUW 6101, automatic | ring date with red markers, gold-lettered rotor |
| Tudor Black Bay Pro M79470-0004 | MT5652, automatic GMT | engraved 24-hour bezel, GMT hand, instantaneous date |

Every part is labelled, with a description and facts. There are dial, movement, X-ray and
exploded views, a cinematic wallpaper loop, and a leather watch box for choosing the watch of
the day. The background is themed to the watch you're wearing.

## Use it

The whole app is a single offline HTML file. No server or internet connection is needed.

- `dist/lively/index.html` opens straight into wallpaper mode. Use this one for wallpapers.
- `dist/index.html` opens in the interactive viewer.

**Controls**
- Click the wallpaper to stop the animation and bring the controls back. Drag to turn the watch.
- `+` / `−` zoom. The mouse wheel also works where the host passes it through.
- **Watch box** (or `B`) opens the box. Click a watch to wear it today; the choice is remembered.
- After 2 minutes without input the page goes back to the wallpaper loop.

### Windows (Lively Wallpaper)

With [Lively](https://www.rocksdanister.com/lively/) installed and running:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-lively.ps1
```

Add `-ResetProperties` when the watch list has changed, so Lively's settings dropdown picks up the
new watches. The settings (watch, view, idle time, labels, frame rate, background) are in Lively's
customise panel.

### Linux

Get the files (the built wallpaper is included, so there's nothing to build):

```bash
git clone https://github.com/dk4248/watches-wallpaper.git ~/watches-wallpaper
```

Then point any "web page as wallpaper" host at the file:

```
file:///home/<you>/watches-wallpaper/dist/lively/index.html
```

- **KDE Plasma.** Install the *HTML Wallpaper* plugin from the KDE Store. To get it, right-click
  the desktop and open the wallpaper settings, then choose *Get New Plugins*. Pick it as the
  wallpaper type and enter the `file://` URL above.
  - To click and drag the watch, switch the desktop layout from *Folder View* to *Desktop*. In
    Folder View the icons take the clicks.
- **Hyprland.** The official `hyprwinwrap` plugin (from `hyprland-plugins`) pins a window as the
  wallpaper. Run a Chromium-based browser in app mode on the file, for example
  `chromium --app="file://$HOME/watches-wallpaper/dist/lively/index.html"`, and add the window rule
  from hyprwinwrap's README.
- **Other X11 desktops** (i3, Openbox, Xfce, …). `xwinwrap` can run a browser window as the
  desktop background in the same way.
- **GNOME.** GNOME Shell can't use a web page as the wallpaper; its live-wallpaper extensions
  play videos only. The page still runs in a fullscreen browser window.

### URL options

Add these to the hash, separated by dots, for example `index.html#wallpaper.dial.taskbar0`:

| Token | Effect |
|---|---|
| `wallpaper` | wallpaper mode with the cinematic loop |
| `dial` / `movement` / `exploded` | a fixed view instead of the loop |
| `w-tangente-139`, `w-gs-sbga211`, `w-tangente-update-147`, `w-tudor-m79470` | start with that watch (overrides the last choice) |
| `idle30` … `idle600` / `idlenever` | seconds without input before returning to the wallpaper |
| `nolabels` | hide part labels in the wallpaper |
| `fps30` / `fps60` | always 30 fps (saves power) / never drop to 30 fps when idle |
| `light` / `dark` | background colour (default: matches the watch) |
| `taskbar0` / `taskbar<px>` | space kept free for a bottom panel (default 48 px; use `0` on Linux without a bottom panel) |

## Build from source

Needs Node 18 or newer.

```bash
npm install
npm run build
```

This writes `dist/index.html` and the Lively package in `dist/lively/`. The other commands:

- `npm run dev` rebuilds on every change.
- `npm run check` runs the geometry validators.
- `node build.mjs --solo gs-sbga211:dial,hands` builds a page with only those parts of one watch.

## Project layout

| Path | Contents |
|---|---|
| `src/core/` | kinematics (gear ratios, lever escapement, Spring Drive glide, rotor physics, power reserve), stage and lighting, procedural finishes, part registry |
| `src/watches/<id>/` | `spec.js` with measured dimensions and tooth counts, plus `parts/*.js` for the case, dial, hands, train, escapement and frame |
| `src/ui/` | HUD, labels, views, wallpaper modes, Lively integration |
| `src/box/` | the leather watch box |
| `research/` | measurements, build plans and validators (`check.mjs`) for each watch |
| `CONTRACT.md` | how a watch module plugs into the app |

## Notes

These are unofficial fan replicas for personal use. NOMOS Glashütte, Grand Seiko, Seiko and Tudor
names and logos belong to their owners. Hidden movement parts that no published photo or drawing
shows are estimates; their info panels say "estimated".
