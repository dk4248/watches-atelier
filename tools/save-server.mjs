// Dev helper: saves images POSTed from the browser (canvas.toBlob) into ./captures or
// ./dist/lively, so renders can be checked or used as Lively thumbnails.
//   node tools/save-server.mjs   → http://localhost:5174/save?file=captures/x.jpg
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const allowed = [path.join(root, 'captures'), path.join(root, 'dist', 'lively')];
fs.mkdirSync(allowed[0], { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, url.searchParams.get('file') || '');
  if (req.method !== 'POST' || url.pathname !== '/save' || !allowed.some((d) => file.startsWith(d + path.sep))) {
    res.statusCode = 400; res.end('bad request'); return;
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.concat(chunks));
    res.end(`saved ${path.relative(root, file)} (${Buffer.concat(chunks).length} bytes)`);
  });
}).listen(5174, () => console.log('[save-server] http://localhost:5174/save?file=captures/<name>'));
