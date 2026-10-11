/* A new explainer topic or a new video.
 *
 *   node video-kit/scripts/new.mjs explainers/<slug> --title "How … works"
 *       a whole topic from template-explainer/: QUESTIONS.md (brief), model.js, figure.js (anatomy),
 *       landing/ + landing.js (landing page), video/ (film.js, text/, scenes.css, voice.config.json, …).
 *       Next: cd explainers/<slug>/video && make preview; make landing in the repo root.
 *
 *   node video-kit/scripts/new.mjs <folder> --plain [--name name] [--art]
 *       only a video <folder>/video from template/ (as in infographics: title, points, finale);
 *       --art — also art.js for videos made of AI images (AI-ART.md).
 *
 * Paths to video-kit and to the repo root are filled in automatically ({{KIT}}, {{ROOT}}). */
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

const KIT = resolve(import.meta.dirname, '..');
const ROOT = resolve(KIT, '..');
const args = process.argv.slice(2);
const opt = (k) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : null);
const src = args.find((a, i) => !a.startsWith('--') && !['--name', '--title'].includes(args[i - 1]));
if (!src) {
  console.error('usage: node video-kit/scripts/new.mjs explainers/<slug> --title "…"   |   <folder> --plain [--name name] [--art]');
  process.exit(1);
}
const target = resolve(src);
if (!target.startsWith(ROOT + sep)) { console.error(`the folder must be inside ${ROOT}`); process.exit(1); }
const plain = args.includes('--plain');
const dir = plain ? join(target, 'video') : target;
const name = opt('name') ?? basename(target);
const title = opt('title') ?? name;
if (existsSync(join(dir, plain ? 'film.js' : 'model.js'))) { console.error(`already exists: ${dir}`); process.exit(1); }

if (plain) {
  cpSync(join(KIT, 'template'), dir, { recursive: true });
  if (args.includes('--art')) cpSync(join(KIT, 'template-art'), dir, { recursive: true });
} else {
  cpSync(join(KIT, 'template-explainer'), dir, { recursive: true });
}
const gi = join(plain ? dir : join(dir, 'video'), 'gitignore');
if (existsSync(gi)) renameSync(gi, gi.replace(/gitignore$/, '.gitignore'));

const fill = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { fill(p); continue; }
    const s = readFileSync(p, 'utf8');
    if (!s.includes('{{')) continue;
    const kitRel = relative(dirname(p), KIT).split(sep).join('/');
    const rootRel = relative(dirname(p), ROOT).split(sep).join('/') || '.';
    writeFileSync(p, s.replaceAll('{{KIT}}', kitRel).replaceAll('{{ROOT}}', rootRel).replaceAll('{{NAME}}', name).replaceAll('{{TITLE}}', title));
  }
};
function dirname(p) { return p.slice(0, p.lastIndexOf(sep)); }
fill(dir);

const rel = relative(process.cwd(), dir) || '.';
console.log(plain
  ? `→ ${rel}  (engine: ${relative(dir, KIT)})\n  next: cd ${rel} && make preview`
  : `→ ${rel}: QUESTIONS.md, model.js, figure.js, landing/, video/\n  1) fill in QUESTIONS.md  2) model.js and figure.js (anatomy/SKILL.md)  3) video/: the script\n  look: cd ${rel}/video && make preview; make landing in the repo root → ${rel}/index.html`);
