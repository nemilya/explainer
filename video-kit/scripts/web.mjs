/* Light versions of the videos for the site: out/web/ — the same names as in out/, but 720p and several times smaller.
 *
 *   out/web/<name>[-<lang>][-vertical][-captions].mp4   H.264 720p (vertical — 720×1280), CRF 28,
 *                                                       AAC 96 kbit/s stereo, +faststart (plays before it has loaded)
 *   out/web/poster*.jpg                                 posters of the same size (poster on <video>)
 *
 * Sources — finished MP4s in out/ (make video / video-v / video-cc); they are not changed. The landing page
 * (explainers/build.mjs) uses out/web/, and the full ones from out/ if there are none.
 *
 *   node scripts/web.mjs                   # every language and format present in out/
 *   node scripts/web.mjs --lang ru         # one language
 *   CRF=31 HEIGHT=540 node scripts/web.mjs # lighter still
 *
 * Don't overheat a laptop: x264 at lower priority (NICE=10 by default), THREADS=2 — at most
 * 2 threads; ENC=hw — a hardware encoder (VideoToolbox on a Mac: the CPU is free, but at a low
 * bitrate the picture is worse than x264's — so x264 is the default on a Mac too). */
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

const mb = (f) => `${(statSync(f).size / 2 ** 20).toFixed(1)} MB`;
const duration = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const rel = (p) => p.replace(`${P.dir}/`, '');

/** ffmpeg with a progress percentage (from -progress and the source duration) and lower priority */
function ffmpeg(argv, dur, label) {
  return new Promise((done, fail) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y', ...argv], { stdio: ['ignore', 'pipe', 'inherit'] });
    if (NICE) { try { setPriority(p.pid, NICE); } catch { /* no permission — leave as is */ } }
    const t0 = Date.now();
    let buf = '';
    p.stdout.on('data', (d) => {
      buf += d;
      const us = [...buf.matchAll(/out_time_us=(\d+)/g)].at(-1)?.[1];
      buf = buf.slice(-200);
      if (!us || !dur) return;
      const k = Math.min(1, us / 1e6 / dur);
      const left = k > 0.02 ? Math.round(((Date.now() - t0) / 1000) * (1 / k - 1)) : null;
      process.stdout.write(`\r${label}: ${Math.round(k * 100)}%${left !== null ? `, ~${left} s left` : ''}   `);
    });
    p.on('close', (code) => { process.stdout.write('\n'); code ? fail(new Error(`ffmpeg: exit code ${code}`)) : done(); });
  });
}

// the project's videos: <name>[-lang][-vertical][-captions].mp4 (without part-*)
const sources = (existsSync(OUT) ? readdirSync(OUT) : [])
  .filter((f) => f.endsWith('.mp4') && f.startsWith(`${P.name}`) && !f.startsWith('part-'))
  .filter((f) => {
    const lang = f.slice(P.name.length).match(/^-([a-z]{2})(?=-|\.)/)?.[1] ?? P.langs[0];
    return !ONLY || lang === ONLY;
  });
if (!sources.length) { console.error(`no finished MP4s in ${rel(OUT)}/ — run make video / video-cc first`); process.exit(1); }
mkdirSync(WEB, { recursive: true });

for (const f of sources) {
  const src = join(OUT, f);
  const vertical = f.includes('-vertical');
  // 720p: horizontal — 1280×720, vertical — 720×1280
  const scale = vertical ? `scale=${HEIGHT}:-2:flags=lanczos` : `scale=-2:${HEIGHT}:flags=lanczos`;
  const codec = HW
    ? (process.platform === 'darwin' ? ['-c:v', 'h264_videotoolbox', '-b:v', '2M', '-allow_sw', '1'] : ['-c:v', 'h264_nvenc', '-preset', 'p5', '-b:v', '2M'])
    : ['-c:v', 'libx264', '-preset', THREADS.length ? 'medium' : 'slow', '-crf', CRF, '-tune', 'animation', ...THREADS];
  await ffmpeg(['-i', src, '-map', '0:v', '-map', '0:a?', '-map', '0:s?', '-vf', scale, ...codec, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-c:s', 'copy', '-movflags', '+faststart', join(WEB, f)], duration(src), f);
  // a poster of the same size: poster[-lang][-vertical][-captions].jpg
  const poster = join(OUT, f.replace(P.name, 'poster').replace(/\.mp4$/, '.jpg'));
  if (existsSync(poster)) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', poster, '-vf', scale, '-q:v', '4', join(WEB, poster.split('/').pop())]);
  console.log(`  ${f}: ${mb(src)} → ${rel(join(WEB, f))} ${mb(join(WEB, f))}`);
}
