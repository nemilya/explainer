/* Ролик → MP4 1920×1080 (H.264 + AAC + субтитры): Chromium снимает кадры сцены, ffmpeg склеивает.
 * Запускается из папки проекта (film.js, index.html; результат — в её out/) или с --project <папка>;
 * обычно через make в проекте. <имя> — см. scripts/project.mjs.
 *
 *   node scripts/render.mjs                    # out/<имя>.mp4 (+ звук voice/<язык>.m4a и субтитры .vtt, если есть)
 *   node scripts/render.mjs --stills 3,20,41   # только PNG-кадры для проверки → out/still-*.png
 *   node scripts/render.mjs --poster           # только обложка out/poster.jpg
 *   node scripts/render.mjs --mute             # без звука
 *   node scripts/render.mjs --vertical         # вертикальная версия 1080×1920 → out/<имя>-vertical.mp4
 *   node scripts/render.mjs --lang en          # другой язык (text/en.js, voice/en.*) → out/<имя>-en.mp4
 *   node scripts/render.mjs --cover --lang en  # обложка для Reels 1080×1920 (cover.html) → out/cover-en.jpg
 *   node scripts/render.mjs --vertical --lang en --captions   # субтитры прямо в кадре → out/<имя>-en-vertical-captions.mp4
 *                                              # (флаги сочетаются между собой и с --stills / --poster)
 *   FPS=25 node scripts/render.mjs --from 30 --to 60   # кусок (для отладки)
 *   CRF=23 node scripts/render.mjs             # качество H.264 (по умолчанию 19; больше — меньше файл:
 *                                              # ИИ-картинкам с наездом хватает 22–24)
 *
 * Чтобы не перегревать ноутбук (x264 занимает все ядра, Chromium — ещё одно):
 *   на Mac по умолчанию — аппаратный кодек VideoToolbox, процессор почти свободен (ENC=sw — x264)
 *   ENC=hw      — аппаратный кодек и на Linux/Windows (NVIDIA NVENC)
 *   THREADS=2   — x264 не больше 2 потоков (preset medium)
 *   PAUSE=40    — пауза между кадрами, мс (меньше нагрев, дольше рендер)
 *   NICE=10     — пониженный приоритет ffmpeg и Chromium (по умолчанию 10; 0 — как есть)
 * Лёгкая версия для сайта (720p) — scripts/web.mjs (make web).
 *
 * Кадры детерминированы: index.html?render, на каждый кадр window.__video.seek(t) и скриншот.
 * Сеть не нужна: шрифты локальные, внешние запросы обрываются. */
import { spawn } from 'node:child_process';
import { setPriority } from 'node:os';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { chromium } from 'playwright';

import { SERVE_ROOT, project } from './project.mjs';

const args = process.argv.slice(2);
const P = await project(args);
const ROOT = P.dir; // проект: index.html, cover.html, voice/, out/
const OUT = join(ROOT, 'out');
const FPS = Number(process.env.FPS || 30);
const CRF = String(process.env.CRF || 19);
const PAUSE = Number(process.env.PAUSE || 0);
const NICE = Number(process.env.NICE ?? 10);
/** аппаратный кодек: на macOS по умолчанию (VideoToolbox есть всегда), ENC=hw — и на Linux/Windows (NVENC), ENC=sw — x264 */
const HW = process.env.ENC ? process.env.ENC === 'hw' : process.platform === 'darwin';
/** кодек: аппаратный — битрейт по размеру кадра (≈9 Мбит/с на 1920×1080), иначе x264 с CRF */
function videoCodec(pixels) {
  const threads = process.env.THREADS ? ['-threads', process.env.THREADS] : [];
  if (HW) {
    const rate = `${Math.round((pixels / 2073600) * 9)}M`;
    return process.platform === 'darwin'
      ? ['-c:v', 'h264_videotoolbox', '-b:v', rate, '-allow_sw', '1', '-realtime', '0']
      : ['-c:v', 'h264_nvenc', '-preset', 'p5', '-b:v', rate];
  }
  return ['-c:v', 'libx264', '-preset', process.env.THREADS ? 'medium' : 'slow', '-crf', CRF, ...threads];
}
/** пониженный приоритет процесса (не мешать остальной работе на ноутбуке) */
const lower = (pid) => { if (NICE && pid) { try { setPriority(pid, NICE); } catch { /* нет прав — как есть */ } } };
const LANG = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : P.langs[0];
// ролик только в вертикальном формате (film.formats = ['v']) — вертикальный кадр и без флага
const VERT = args.includes('--vertical') || P.makeFilm(LANG).formats?.join() === 'v';
const CAPS = args.includes('--captions');
const SUFFIX = `${LANG !== P.langs[0] ? `-${LANG}` : ''}${VERT ? '-vertical' : ''}${CAPS ? '-captions' : ''}`;
const ISO = { ru: 'rus', en: 'eng' };
const opt = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  // сервер отдаёт корень репозитория: проекту нужен и сам video-kit (../../video-kit/…)
  const p = join(SERVE_ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  try {
    if (!p.startsWith(SERVE_ROOT) || !statSync(p).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    createReadStream(p).pipe(res);
  } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/${P.url}/`;

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
lower(browser.process?.()?.pid);
const page = await browser.newPage({ viewport: VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
page.on('pageerror', (e) => { console.error(e); process.exitCode = 1; });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.error(m.text()); });
mkdirSync(OUT, { recursive: true });
if (opt('cover')) {
  // обложка — отдельная страница, кадр всегда вертикальный
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto(`${base}cover.html?lang=${LANG}`);
  await page.waitForFunction(() => window.__cover?.ready, null, { timeout: 60000 });
  const file = join(OUT, `cover${LANG !== P.langs[0] ? `-${LANG}` : ''}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log(`обложка → ${file.replace(`${ROOT}/`, '')}`);
  await browser.close();
  server.close();
  process.exit(process.exitCode ?? 0);
}
await page.goto(`${base}index.html?render${VERT ? '&v' : ''}${CAPS ? '&captions' : ''}&lang=${LANG}`);
await page.waitForFunction(() => window.__video?.ready, null, { timeout: 60000 });
const { duration, poster } = await page.evaluate(() => window.__video);
const seek = (t) => page.evaluate((x) => window.__video.seek(x), t);
mkdirSync(OUT, { recursive: true });
const rel = (p) => p.replace(`${ROOT}/`, '');

const stills = opt('stills');
if (stills) {
  // кадры по порядку времени: seek назад перезагружает страницу
  const ts = String(stills).split(',').map(Number).sort((a, b) => a - b);
  for (const t of ts) {
    await seek(t);
    await page.screenshot({ path: join(OUT, `still${SUFFIX}-${String(t).replace('.', '_')}.png`) });
  }
  console.log(`${ts.length} кадров → ${rel(OUT)}/still${SUFFIX}-*.png (ролик ${duration.toFixed(1)} с)`);
} else if (opt('poster')) {
  await seek(poster);
  await page.screenshot({ path: join(OUT, `poster${SUFFIX}.jpg`), type: 'jpeg', quality: 90 });
  console.log(`обложка → ${rel(OUT)}/poster${SUFFIX}.jpg`);
} else {
  const cdp = await page.context().newCDPSession(page);
  const grab = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true })).data, 'base64');
  const from = Number(opt('from') || 0);
  const to = Math.min(duration, Number(opt('to') || duration));
  const part = from > 0 || to < duration;
  const file = join(OUT, part ? `part${SUFFIX}-${from}-${to}.mp4` : `${P.name}${SUFFIX}.mp4`);
  const voice = join(ROOT, 'voice', `${LANG}.m4a`);
  const vtt = join(ROOT, 'voice', `${LANG}.vtt`);
  const withAudio = existsSync(voice) && !opt('mute');
  // субтитры — отдельной дорожкой (включаются в плеере), только для целого ролика
  const withSubs = withAudio && !part && existsSync(vtt);
  const inputs = [
    ...(withAudio ? ['-ss', String(from), '-t', String(to - from), '-i', voice] : []),
    ...(withSubs ? ['-i', vtt] : []),
  ];
  const outputs = [
    '-map', '0:v',
    ...(withAudio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad'] : []),
    ...(withSubs ? ['-map', '2:s', '-c:s', 'mov_text', '-metadata:s:s:0', `language=${ISO[LANG] ?? LANG}`] : []),
  ];
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    ...inputs, ...outputs, '-t', (to - from).toFixed(3), ...videoCodec(VERT ? 1080 * 1920 : 1920 * 1080), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  lower(ff.pid);
  console.log(`кодек: ${HW ? (process.platform === 'darwin' ? 'VideoToolbox (аппаратный)' : 'NVENC (аппаратный)') : `x264${process.env.THREADS ? `, потоков ${process.env.THREADS}` : ''}`}${NICE ? `, приоритет +${NICE}` : ''}${PAUSE ? `, пауза ${PAUSE} мс` : ''}`);
  const n = Math.ceil((to - from) * FPS);
  const t0 = Date.now();
  for (let i = 0; i <= n; i++) {
    await seek(from + i / FPS);
    const buf = await grab();
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (PAUSE) await new Promise((ok) => setTimeout(ok, PAUSE));
    if (i % (FPS * 5) === 0) process.stdout.write(`\r${Math.round((i / n) * 100)}%  (${Math.round((Date.now() - t0) / 1000)} с)`);
  }
  ff.stdin.end();
  await new Promise((ok, fail) => ff.on('close', (c) => (c ? fail(new Error(`ffmpeg ${c}`)) : ok())));
  console.log(`\r${n + 1} кадров${withAudio ? ' + звук' : ''}${withSubs ? ' + субтитры' : ''} за ${Math.round((Date.now() - t0) / 1000)} с → ${rel(file)}`);
  if (!part) {
    await seek(poster);
    await page.screenshot({ path: join(OUT, `poster${SUFFIX}.jpg`), type: 'jpeg', quality: 90 });
  }
}
await browser.close();
server.close();
