/* Лёгкие версии роликов для сайта: out/web/ — те же имена, что в out/, но 720p и в разы меньше.
 *
 *   out/web/<имя>[-<язык>][-vertical][-captions].mp4   H.264 720p (вертикальный — 720×1280), CRF 28,
 *                                                      AAC 96 кбит/с стерео, +faststart (играет до загрузки)
 *   out/web/poster*.jpg                                обложки того же размера (poster у <video>)
 *
 * Исходники — готовые MP4 из out/ (make video / video-v / video-cc); они не меняются. Лендинг
 * (explainers/build.mjs) берёт out/web/, а если их нет — полные из out/.
 *
 *   node scripts/web.mjs                   # все языки и форматы, что есть в out/
 *   node scripts/web.mjs --lang en         # один язык
 *   CRF=31 HEIGHT=540 node scripts/web.mjs # ещё легче
 *
 * Не перегревать ноутбук: x264 с пониженным приоритетом (NICE=10 по умолчанию), THREADS=2 — не больше
 * 2 потоков; ENC=hw — аппаратный кодек (на Mac VideoToolbox: процессор свободен, но на низком
 * битрейте картинка хуже, чем у x264 — поэтому по умолчанию x264 и на Mac). */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { setPriority } from 'node:os';
import { join } from 'node:path';

import { project } from './project.mjs';

const args = process.argv.slice(2);
const P = await project(args);
const OUT = join(P.dir, 'out');
const WEB = join(OUT, 'web');
const ONLY = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const CRF = String(process.env.CRF || 28);
const HEIGHT = Number(process.env.HEIGHT || 720);
const NICE = Number(process.env.NICE ?? 10);
const HW = process.env.ENC === 'hw';
const THREADS = process.env.THREADS ? ['-threads', process.env.THREADS] : [];

const mb = (f) => `${(statSync(f).size / 2 ** 20).toFixed(1)} МБ`;
const duration = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const rel = (p) => p.replace(`${P.dir}/`, '');

/** ffmpeg с процентом готовности (по -progress и длительности исходника) и пониженным приоритетом */
function ffmpeg(argv, dur, label) {
  return new Promise((done, fail) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y', ...argv], { stdio: ['ignore', 'pipe', 'inherit'] });
    if (NICE) { try { setPriority(p.pid, NICE); } catch { /* нет прав — как есть */ } }
    const t0 = Date.now();
    let buf = '';
    p.stdout.on('data', (d) => {
      buf += d;
      const us = [...buf.matchAll(/out_time_us=(\d+)/g)].at(-1)?.[1];
      buf = buf.slice(-200);
      if (!us || !dur) return;
      const k = Math.min(1, us / 1e6 / dur);
      const left = k > 0.02 ? Math.round(((Date.now() - t0) / 1000) * (1 / k - 1)) : null;
      process.stdout.write(`\r${label}: ${Math.round(k * 100)}%${left !== null ? `, осталось ~${left} с` : ''}   `);
    });
    p.on('close', (code) => { process.stdout.write('\n'); code ? fail(new Error(`ffmpeg: код ${code}`)) : done(); });
  });
}

// ролики проекта: <имя>[-язык][-vertical][-captions].mp4 (без part-*)
const sources = (existsSync(OUT) ? readdirSync(OUT) : [])
  .filter((f) => f.endsWith('.mp4') && f.startsWith(`${P.name}`) && !f.startsWith('part-'))
  .filter((f) => {
    const lang = f.slice(P.name.length).match(/^-([a-z]{2})(?=-|\.)/)?.[1] ?? P.langs[0];
    return !ONLY || lang === ONLY;
  });
if (!sources.length) { console.error(`нет готовых MP4 в ${rel(OUT)}/ — сначала make video / video-cc`); process.exit(1); }
mkdirSync(WEB, { recursive: true });

for (const f of sources) {
  const src = join(OUT, f);
  const vertical = f.includes('-vertical');
  // 720p: горизонтальный — 1280×720, вертикальный — 720×1280
  const scale = vertical ? `scale=${HEIGHT}:-2:flags=lanczos` : `scale=-2:${HEIGHT}:flags=lanczos`;
  const codec = HW
    ? (process.platform === 'darwin' ? ['-c:v', 'h264_videotoolbox', '-b:v', '2M', '-allow_sw', '1'] : ['-c:v', 'h264_nvenc', '-preset', 'p5', '-b:v', '2M'])
    : ['-c:v', 'libx264', '-preset', THREADS.length ? 'medium' : 'slow', '-crf', CRF, '-tune', 'animation', ...THREADS];
  await ffmpeg(['-i', src, '-map', '0:v', '-map', '0:a?', '-map', '0:s?', '-vf', scale, ...codec, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-c:s', 'copy', '-movflags', '+faststart', join(WEB, f)], duration(src), f);
  // обложка того же размера: poster[-язык][-vertical][-captions].jpg
  const poster = join(OUT, f.replace(P.name, 'poster').replace(/\.mp4$/, '.jpg'));
  if (existsSync(poster)) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', poster, '-vf', scale, '-q:v', '4', join(WEB, poster.split('/').pop())]);
  console.log(`  ${f}: ${mb(src)} → ${rel(join(WEB, f))} ${mb(join(WEB, f))}`);
}
