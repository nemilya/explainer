/* Локальный статический сервер для make preview (плеер ролика). Запуск из папки проекта:
 *   node <video-kit>/scripts/serve.mjs [порт=8790]
 * Отдаёт корень репозитория (проекту нужен и сам video-kit) и печатает адрес плеера проекта.
 * Отличие от python3 -m http.server — поддержка Range (206 Partial Content): без неё
 * Chrome не перематывает MP4 (плеер ролика).
 * Только для локального просмотра: слушает 127.0.0.1. */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PORT = Number(process.argv[2] || 8790);
const HERE = path.relative(ROOT, process.cwd());
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.vtt': 'text/vtt; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.zip': 'application/zip',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    let st = await stat(file);
    if (st.isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end(); return; }
      file = path.join(file, 'index.html');
      st = await stat(file);
    }
    const head = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    let start = 0;
    let end = st.size - 1;
    if (m && (m[1] || m[2])) {
      start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2])); // bytes=-N — последние N байт
      end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    } else {
      res.writeHead(200, { ...head, 'Content-Length': st.size });
    }
    if (req.method === 'HEAD' || st.size === 0) { res.end(); return; }
    createReadStream(file, { start, end }).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/${HERE && !HERE.startsWith('..') ? `${HERE}/` : ''}  (корень: ${ROOT})`));
