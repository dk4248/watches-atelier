// Bundles the app (three.js included) into single self-contained HTML files:
//   dist/nomos-tangente.html  full document — open locally / use as a live wallpaper
//   dist/artifact.html        page fragment for publishing as a claude.ai Artifact
//   dist/index.html           copy of the full document for the dev server
// Usage: node build.mjs [--watch]
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { zipFiles } from './tools/zip.mjs';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

const FONT_FILES = [
  ['Jost', 300, 'node_modules/@fontsource/jost/files/jost-latin-300-normal.woff2'],
  ['Jost', 400, 'node_modules/@fontsource/jost/files/jost-latin-400-normal.woff2'],
  ['Jost', 500, 'node_modules/@fontsource/jost/files/jost-latin-500-normal.woff2'],
  ['Jost', 600, 'node_modules/@fontsource/jost/files/jost-latin-600-normal.woff2'],
  ['JetBrains Mono', 400, 'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'],
  ['JetBrains Mono', 500, 'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2'],
];

function fontCss() {
  return FONT_FILES.map(([family, weight, file]) => {
    const b64 = fs.readFileSync(path.join(root, file)).toString('base64');
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
  }).join('\n');
}

async function bundle(artifact) {
  const res = await esbuild.build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
    define: { __ARTIFACT__: artifact ? 'true' : 'false' },
    logLevel: 'warning',
  });
  // keep "</script>" sequences from ending the inline script early
  return res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

async function buildAll() {
  const t0 = Date.now();
  const page = fs.readFileSync(path.join(root, 'src/page.html'), 'utf8');
  const fonts = fontCss();
  const [jsLocal, jsArtifact] = await Promise.all([bundle(false), bundle(true)]);
  const fill = (js) => page.replace('/*FONTS*/', () => fonts).replace('<!--SCRIPT-->', () => `<script>${js}</script>`);

  const fragmentArtifact = fill(jsArtifact);
  const fragmentLocal = fill(jsLocal);
  // Full document: everything above <!--/head--> goes into <head>.
  const [headPart, bodyPart] = fragmentLocal.split('<!--/head-->');
  const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${headPart}\n</head>\n<body>\n${bodyPart}\n</body>\n</html>\n`;

  fs.writeFileSync(path.join(dist, 'nomos-tangente.html'), full);
  fs.writeFileSync(path.join(dist, 'index.html'), full);

  // Lively Wallpaper package (folder with LivelyInfo.json; zip it to import).
  // The page opens straight into the cinematic wallpaper loop unless a hash says otherwise.
  const lively = path.join(dist, 'lively');
  fs.mkdirSync(lively, { recursive: true });
  const boot = `<script>if(!location.hash)history.replaceState(null,'','#wallpaper')</script>`;
  const wallpaperHtml = full.replace('<script>', `${boot}\n<script>`);
  fs.writeFileSync(path.join(lively, 'index.html'), wallpaperHtml);
  // The collection, in order (index = value the Lively dropdown sends): dropdown names
  // and the full names for the description.
  let watchItems = ['NOMOS Tangente 139'], watchNames = ['NOMOS Glashütte Tangente 139'];
  try {
    const src = fs.readFileSync(path.join(root, 'src/watches/index.js'), 'utf8');
    const order = [...src.matchAll(/import\s+(\w+)\s+from\s+'\.\/([\w-]+)\/index\.js'/g)].map((m) => [m[1], m[2]]);
    const listed = (src.match(/WATCHES\s*=\s*\[([^\]]*)\]/) || [])[1]?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    const descs = listed.map((v) => {
      const dir = order.find(([n]) => n === v)?.[1];
      const d = dir ? fs.readFileSync(path.join(root, `src/watches/${dir}/index.js`), 'utf8') : '';
      const field = (k) => (d.match(new RegExp(`${k}:\\s*'([^']+)'`)) || [])[1] || '';
      return { dir, brand: field('brand'), label: field('boxLabel') || dir, model: field('model'), ref: field('ref') };
    });
    watchItems = descs.map((w) => `${w.brand} ${w.label}`.trim());
    watchNames = descs.map((w) => `${w.brand} ${w.model} ${w.ref}`.replace(/\s+/g, ' ').trim());
  } catch (e) { console.warn('[build] could not read watch list for Lively:', e.message); }
  fs.writeFileSync(path.join(lively, 'LivelyInfo.json'), JSON.stringify({
    AppVersion: '2.1.0.0',
    Title: 'Watch Atelier — live replicas',
    Thumbnail: fs.existsSync(path.join(lively, 'thumbnail.jpg')) ? 'thumbnail.jpg' : null,
    Preview: fs.existsSync(path.join(lively, 'preview.gif')) ? 'preview.gif' : null,
    Desc: `Real-time 3D replicas of your watches — ${watchNames.join(', ')} — every gear turning in sync with your clock. Click to take control; open the leather watch box to pick the watch of the day. Unofficial fan replicas.`,
    Author: 'Watch Atelier',
    License: null,
    Contact: null,
    Type: 1, // web
    FileName: 'index.html',
    Arguments: '--pause-event true',
    IsAbsolutePath: false,
  }, null, 2));
  fs.writeFileSync(path.join(lively, 'LivelyProperties.json'), JSON.stringify({
    watch: { type: 'dropdown', value: 0, text: 'Watch of the day', items: watchItems },
    view: { type: 'dropdown', value: 0, text: 'Wallpaper view', items: ['Cinematic loop', 'Dial', 'Movement', 'Exploded'] },
    idle: { type: 'dropdown', value: 2, text: 'Back to wallpaper after', items: ['30 seconds', '1 minute', '2 minutes', '5 minutes', '10 minutes', 'Never'] },
    labels: { type: 'checkbox', value: true, text: 'Part labels' },
    fps30: { type: 'checkbox', value: false, text: 'Save power (30 fps)' },
    fps60: { type: 'checkbox', value: false, text: 'Keep 60 fps while idle' },
    theme: { type: 'dropdown', value: 0, text: 'Background', items: ['Match the watch', 'Light', 'Dark'] },
  }, null, 2));
  fs.writeFileSync(path.join(dist, 'artifact.html'), fragmentArtifact.replace('<!--/head-->', ''));

  // GitHub Pages site (docs/, published from main): the live viewer, the wallpaper page
  // (also the single-file Linux download), and the Lively package as a .zip with
  // LivelyInfo.json at the zip root, as Lively's importer requires. docs/index.html (the
  // landing page) and docs/img/ are written by hand.
  const docs = path.join(root, 'docs');
  for (const d of ['app', 'wallpaper', 'download']) fs.mkdirSync(path.join(docs, d), { recursive: true });
  fs.writeFileSync(path.join(docs, 'app', 'index.html'), full);
  fs.writeFileSync(path.join(docs, 'wallpaper', 'index.html'), wallpaperHtml);
  const pkgFiles = fs.readdirSync(lively).filter((n) => fs.statSync(path.join(lively, n)).isFile()).sort();
  fs.writeFileSync(path.join(docs, 'download', 'watches-atelier-lively.zip'),
    zipFiles(pkgFiles.map((n) => ({ name: n, data: fs.readFileSync(path.join(lively, n)) }))));
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
  console.log(`[build] ${new Date().toLocaleTimeString()} ok in ${Date.now() - t0} ms — full ${kb(full)} KB, artifact ${kb(fragmentArtifact)} KB`);
}

// --solo <watchId>[:part,part]  → dist/solo-<watchId>[-parts].html with only that
// watch's listed part builders (no UI). Bare part names (no watch id) and "all"
// mean the Tangente 139, for backwards compatibility. Add ?lite to the URL to build
// in watch-box (lite) mode.
async function buildSolo(arg) {
  const watchDirs = fs.readdirSync(path.join(root, 'src/watches'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let watchId = 'tangente-139', list = arg;
  if (arg.includes(':')) [watchId, list] = arg.split(':');
  else if (watchDirs.includes(arg)) { watchId = arg; list = 'all'; }
  if (!watchDirs.includes(watchId)) throw new Error(`unknown watch "${watchId}" (known: ${watchDirs.join(', ')})`);
  const names = !list || list === 'all' ? null : list.split(',').map((s) => s.trim()).filter(Boolean);
  const contents = [
    "import { runSolo } from './dev/solo.js';",
    `import watch from './watches/${watchId}/index.js';`,
    `const pick = ${JSON.stringify(names)};`,
    'const known = watch.builders.map(([n]) => n);',
    'if (pick) for (const n of pick) if (!known.includes(n)) console.error(`unknown part builder ${n} (known: ${known.join(", ")})`);',
    'runSolo(watch, pick ? watch.builders.filter(([n]) => pick.includes(n)) : watch.builders);',
  ].join('\n');
  const res = await esbuild.build({
    stdin: { contents, resolveDir: path.join(root, 'src'), sourcefile: 'solo-entry.js' },
    bundle: true, format: 'iife', minify: false, write: false, target: ['es2020'],
    define: { __ARTIFACT__: 'false' }, logLevel: 'warning',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const label = `${watchId}${names ? '-' + names.join('-') : ''}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>solo ${label}</title><style>${fontCss()}\nhtml,body{margin:0;height:100%;overflow:hidden;background:#e9eaec}#stage{position:fixed;inset:0}</style></head><body><div id="stage"></div><script>${js}</script></body></html>`;
  const file = path.join(dist, `solo-${label}.html`);
  fs.writeFileSync(file, html);
  console.log(`[build] solo ok → ${path.relative(root, file)} (${(html.length / 1024).toFixed(0)} KB)`);
}

// --dev src/dev/<name>.js → dist/dev-<name>.html: bundle any development entry (it
// must create its own #stage content; fonts are embedded like the app).
async function buildDev(entry) {
  const abs = path.resolve(root, entry);
  const name = path.basename(abs, '.js');
  const res = await esbuild.build({
    entryPoints: [abs], bundle: true, format: 'iife', minify: false, write: false, target: ['es2020'],
    define: { __ARTIFACT__: 'false' }, logLevel: 'warning',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>dev ${name}</title><style>${fontCss()}\nhtml,body{margin:0;height:100%;overflow:hidden;background:#e9eaec}#stage{position:fixed;inset:0}</style></head><body><div id="stage"></div><script>${js}</script></body></html>`;
  const file = path.join(dist, `dev-${name}.html`);
  fs.writeFileSync(file, html);
  console.log(`[build] dev ok → ${path.relative(root, file)} (${(html.length / 1024).toFixed(0)} KB)`);
}

const soloIdx = process.argv.indexOf('--solo');
const devIdx = process.argv.indexOf('--dev');
if (soloIdx > 0) {
  await buildSolo(process.argv[soloIdx + 1] || 'all');
} else if (devIdx > 0) {
  await buildDev(process.argv[devIdx + 1]);
} else if (process.argv.includes('--watch')) {
  let timer = null;
  const run = () => buildAll().catch((e) => console.error('[build] FAILED\n', e.message));
  await run();
  fs.watch(path.join(root, 'src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
  console.log('[build] watching src/ …');
} else {
  await buildAll();
}
