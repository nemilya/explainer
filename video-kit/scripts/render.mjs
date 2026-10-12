/* Video → MP4 1920×1080 (H.264 + AAC + subtitles): Chromium captures the frames, ffmpeg joins them.
 * Run from the project folder (film.js, index.html; output goes to its out/) or with --project <folder>;
 * usually via make in the project. <name> — see scripts/project.mjs.
 *
 *   node scripts/render.mjs                    # out/<name>.mp4 (+ audio voice/<lang>.m4a and subtitles .vtt, if present)
 *   node scripts/render.mjs --stills 3,20,41   # only PNG frames for checking → out/still-*.png
 *   node scripts/render.mjs --poster           # only the poster out/poster.jpg
 *   node scripts/render.mjs --mute             # no audio
 *   node scripts/render.mjs --vertical         # vertical version 1080×1920 → out/<name>-vertical.mp4
 *   node scripts/render.mjs --lang ru          # another language (text/ru.js, voice/ru.*) → out/<name>-ru.mp4
 *   node scripts/render.mjs --cover --lang ru  # Reels cover 1080×1920 (cover.html) → out/cover-ru.jpg
 *   node scripts/render.mjs --vertical --lang ru --captions   # captions burned into the frame → out/<name>-ru-vertical-captions.mp4
 *                                              # (flags combine with each other and with --stills / --poster)
 *   FPS=25 node scripts/render.mjs --from 30 --to 60   # a part (for debugging)
 *   CRF=23 node scripts/render.mjs             # H.264 quality (19 by default; higher — smaller file:
 *                                              # AI images with a slow zoom are fine at 22–24)
 *
 * To keep a laptop from overheating (x264 takes every core, Chromium one more):
 *   on a Mac by default — the hardware VideoToolbox encoder, the CPU stays almost free (ENC=sw — x264)
 *   ENC=hw      — a hardware encoder on Linux/Windows too (NVIDIA NVENC)
 *   THREADS=2   — x264 uses at most 2 threads (preset medium)
 *   PAUSE=40    — a pause between frames, ms (less heat, slower render)
 *   NICE=10     — lower priority for ffmpeg and Chromium (10 by default; 0 — unchanged)
 * A light version for the site (720p) — scripts/web.mjs (make web).
 *
 * Frames are deterministic: index.html?render, window.__video.seek(t) and a screenshot for every frame.
 * No network needed: fonts are local, external requests are aborted. */
import { spawn } from 'node:child_process';
import { setPriority } from 'node:os';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { chromium } from 'playwright';

import { SERVE_ROOT, project } from './project.mjs';

const args = process.argv.slice(2);
const P = await project(args);
const ROOT = P.dir; // project: index.html, cover.html, voice/, out/
const OUT = join(ROOT, 'out');
const FPS = Number(process.env.FPS || 30);
const CRF = String(process.env.CRF || 19);
const PAUSE = Number(process.env.PAUSE || 0);
const NICE = Number(process.env.NICE ?? 10);
/** hardware encoder: default on macOS (VideoToolbox is always there), ENC=hw — on Linux/Windows too (NVENC), ENC=sw — x264 */
const HW = process.env.ENC ? process.env.ENC === 'hw' : process.platform === 'darwin';
/** codec: hardware — bitrate by frame size (≈9 Mbit/s at 1920×1080), otherwise x264 with CRF */
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
/** lower the process priority (don't get in the way of other work on the laptop) */
const lower = (pid) => { if (NICE && pid) { try { setPriority(pid, NICE); } catch { /* no permission — leave as is */ } } };
const LANG = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : P.langs[0];
// a vertical-only video (film.formats = ['v']) — vertical frame even without the flag
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
  // the server serves the repo root: a project needs video-kit too (../../video-kit/…)
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
  // the cover is a separate page, always a vertical frame
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto(`${base}cover.html?lang=${LANG}`);
  await page.waitForFunction(() => window.__cover?.ready, null, { timeout: 60000 });
  const file = join(OUT, `cover${LANG !== P.langs[0] ? `-${LANG}` : ''}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log(`cover → ${file.replace(`${ROOT}/`, '')}`);
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
  // frames in time order: seeking backwards reloads the page
  const ts = String(stills).split(',').map(Number).sort((a, b) => a - b);
  for (const t of ts) {
    await seek(t);
    await page.screenshot({ path: join(OUT, `still${SUFFIX}-${String(t).replace('.', '_')}.png`) });
  }
  console.log(`${ts.length} frames → ${rel(OUT)}/still${SUFFIX}-*.png (video ${duration.toFixed(1)} s)`);
} else if (opt('poster')) {
  await seek(poster);
  await page.screenshot({ path: join(OUT, `poster${SUFFIX}.jpg`), type: 'jpeg', quality: 90 });
  console.log(`poster → ${rel(OUT)}/poster${SUFFIX}.jpg`);
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
  // subtitles as a separate track (turned on in the player), only for a whole video
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
  console.log(`codec: ${HW ? (process.platform === 'darwin' ? 'VideoToolbox (hardware)' : 'NVENC (hardware)') : `x264${process.env.THREADS ? `, ${process.env.THREADS} threads` : ''}`}${NICE ? `, priority +${NICE}` : ''}${PAUSE ? `, pause ${PAUSE} ms` : ''}`);
  const n = Math.ceil((to - from) * FPS);
  const t0 = Date.now();
  for (let i = 0; i <= n; i++) {
    await seek(from + i / FPS);
    const buf = await grab();
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (PAUSE) await new Promise((ok) => setTimeout(ok, PAUSE));
    if (i % (FPS * 5) === 0) process.stdout.write(`\r${Math.round((i / n) * 100)}%  (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  ff.stdin.end();
  await new Promise((ok, fail) => ff.on('close', (c) => (c ? fail(new Error(`ffmpeg ${c}`)) : ok())));
  console.log(`\r${n + 1} frames${withAudio ? ' + audio' : ''}${withSubs ? ' + subtitles' : ''} in ${Math.round((Date.now() - t0) / 1000)} s → ${rel(file)}`);
  if (!part) {
    await seek(poster);
    await page.screenshot({ path: join(OUT, `poster${SUFFIX}.jpg`), type: 'jpeg', quality: 90 });
  }
}
await browser.close();
server.close();
