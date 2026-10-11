/* ИИ-картинки ролика (AI-ART.md): art.js проекта → листы-референсы art/refs/*.jpg → кадры
 * art/shots/*.jpg (с приложенными референсами) + манифест art/art.json + галерея art/index.html.
 * Генерация — OpenRouter Image API (по умолчанию Seedream 5.0 Flash).
 *
 *   node scripts/art.mjs                    # новое и изменённое: сначала листы, потом кадры
 *   node scripts/art.mjs --dry              # только план и примерная цена
 *   node scripts/art.mjs --only hook,wolf   # только эти (и недостающие референсы к ним)
 *   node scripts/art.mjs --redo hook        # та же постановка, новая попытка (новый seed); старая — в art/takes/
 *   node scripts/art.mjs --takes 3 --only hook   # три варианта в art/takes/ (на выбор, текущий не трогается)
 *   node scripts/art.mjs --pick hook 123456      # взять вариант с этим seed из art/takes/
 *   node scripts/art.mjs --gallery          # только пересобрать галерею
 *
 * Запускается из папки проекта (art.js, film.js) или с --project <папка>; обычно через make art.
 *
 * Отпечаток картинки — модель, формат, полный промпт, seed и содержимое файлов её референсов:
 * изменили промпт или перегенерировали лист персонажа — устарели и перерисуются все кадры с ним.
 * lock: true у элемента — не перерисовывать (только предупредить, что устарел).
 * Ключ — OPENROUTER_API_KEY в окружении (или local.mk), прокси — OPENROUTER_PROXY. */
import { execFileSync } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { post } from '../lib/openrouter.mjs';
import { project } from './project.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const P = await project(args);
const ROOT = P.dir;
const ART = join(ROOT, 'art');
const TAKES = join(ART, 'takes');
const cfgFile = join(ROOT, 'art.js');
if (!existsSync(cfgFile)) throw new Error(`нет art.js в ${ROOT} (AI-ART.md)`);
const CFG = (await import(pathToFileURL(cfgFile).href)).default;
const MODEL = CFG.model ?? 'bytedance-seed/seedream-5-0-flash';
const PRICE = CFG.price ?? 0.018; // $ за картинку — только для плана; настоящая цена — из ответа API
const PARALLEL = CFG.parallel ?? 4;
const REF_PX = CFG.refPx ?? 1280; // референсы уходят в запрос уменьшенными до этой ширины

for (const d of ['refs', 'shots', 'takes']) mkdirSync(join(ART, d), { recursive: true });
const MANIFEST = join(ART, 'art.json');
const M = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { items: {} };
const TK = join(TAKES, 'takes.json');
const TAKEN = existsSync(TK) ? JSON.parse(readFileSync(TK, 'utf8')) : {};
const save = () => {
  writeFileSync(MANIFEST, `${JSON.stringify(M, null, 2)}\n`);
  writeFileSync(TK, `${JSON.stringify(TAKEN, null, 2)}\n`);
};

// ---------------------------------------------------------------- элементы и зависимости
const ITEMS = new Map();
for (const [dir, list] of [['refs', CFG.refs ?? {}], ['shots', CFG.shots ?? {}]]) {
  for (const [id, it] of Object.entries(list)) {
    if (ITEMS.has(id)) throw new Error(`id «${id}» встречается дважды (refs и shots — общее пространство имён)`);
    ITEMS.set(id, { id, dir, refs: [], ...it, file: join(ART, dir, `${id}.jpg`) });
  }
}
for (const it of ITEMS.values()) {
  for (const r of it.refs) if (!ITEMS.has(r)) throw new Error(`${it.id}: нет референса «${r}» в art.js`);
}
const order = [];
const seen = new Map();
const visit = (id, path = []) => {
  if (seen.get(id) === 'done') return;
  if (seen.get(id) === 'open') throw new Error(`цикл референсов: ${[...path, id].join(' → ')}`);
  seen.set(id, 'open');
  for (const r of ITEMS.get(id).refs) visit(r, [...path, id]);
  seen.set(id, 'done');
  order.push(id);
};
for (const id of ITEMS.keys()) visit(id);

const sha = (x) => createHash('sha256').update(x).digest('hex');
const defaultSeed = (id) => parseInt(sha(`seed:${id}`).slice(0, 8), 16) % 2147483647;
const seedOf = (it) => it.seed ?? M.items[it.id]?.seed ?? defaultSeed(it.id);

/** полный промпт: легенда референсов + постановка + стиль */
function promptOf(it) {
  const legend = it.refs.length
    ? `Reference images: ${it.refs.map((r, i) => {
      const x = ITEMS.get(r);
      return `Image ${i + 1} — ${x.name ?? r}${x.look ? ` (${x.look})` : ''}`;
    }).join('; ')}. Keep every character and object exactly as in its reference image: face, proportions, clothes, accessories, colours. `
      + 'Character sheets show one character from several angles — draw each character only once in the scene. '
    : '';
  return `${legend}${it.prompt.trim()}${CFG.style ? ` Style: ${CFG.style.trim()}` : ''}`;
}

/** отпечаток: всё, от чего зависит картинка (у референсов — содержимое их файлов) */
const fileHash = (f) => sha(readFileSync(f)).slice(0, 12);
function hashOf(it, seed = seedOf(it)) {
  const refs = it.refs.map((r) => {
    const x = ITEMS.get(r);
    return existsSync(x.file) ? fileHash(x.file) : `pending:${hashOf(x)}`;
  });
  return sha(JSON.stringify([MODEL, it.resolution ?? CFG.resolution ?? '2K', it.aspect ?? '9:16', promptOf(it), seed, refs])).slice(0, 12);
}

/** уменьшенный референс как data-URL */
function refData(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale='min(${REF_PX},iw)':-2`, '-q:v', '3', '-f', 'mjpeg', 'pipe:1'], { maxBuffer: 1 << 26 });
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

/** один запрос к API → JPEG в out; → { cost, w, h } */
async function generate(it, seed, out) {
  const body = {
    model: MODEL, prompt: promptOf(it), n: 1, seed,
    resolution: it.resolution ?? CFG.resolution ?? '2K', aspect_ratio: it.aspect ?? '9:16',
    ...(it.refs.length ? { input_references: it.refs.map((r) => ({ type: 'image_url', image_url: { url: refData(ITEMS.get(r).file) } })) } : {}),
  };
  const res = await post('/images', body, { timeout: 300 });
  const json = JSON.parse(res.body.toString('utf8'));
  const img = json.data?.[0];
  if (!img?.b64_json) throw new Error(`${it.id}: в ответе нет картинки: ${res.body.toString('utf8').slice(0, 300)}`);
  const buf = Buffer.from(img.b64_json, 'base64');
  if (/jpe?g/.test(img.media_type ?? 'image/jpeg')) writeFileSync(out, buf);
  else {
    const raw = `${out}.src`;
    writeFileSync(raw, buf);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-q:v', '2', out]);
    execFileSync('rm', [raw]);
  }
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out]).toString().trim().split(',').map(Number);
  return { cost: json.usage?.cost ?? null, w, h };
}

const rel = (f) => f.replace(`${ART}/`, '');
// черновик: seed и отпечаток в имени (тот же seed с другим промптом — другая картинка)
const takeName = (id, x) => `${id}@${x.seed}.${x.hash}.jpg`;
const takeFile = (id, x) => join(TAKES, takeName(id, x));
/** текущую картинку — в черновики (чтобы можно было вернуть: --pick id seed) */
function shelve(it) {
  const m = M.items[it.id];
  if (!existsSync(it.file) || !m) return;
  const x = { seed: m.seed, hash: m.hash, cost: m.cost ?? null };
  renameSync(it.file, takeFile(it.id, x));
  TAKEN[it.id] = [...(TAKEN[it.id] ?? []).filter((y) => takeName(it.id, y) !== takeName(it.id, x)), x];
}

// ---------------------------------------------------------------- очередь с ограничением параллельности
let running = 0;
const waiting = [];
const slot = async (fn) => {
  if (running >= PARALLEL) await new Promise((ok) => waiting.push(ok));
  running++;
  try { return await fn(); } finally { running--; waiting.shift()?.(); }
};

// ---------------------------------------------------------------- режимы
const only = typeof opt('only') === 'string' ? opt('only').split(',') : null;
const redo = typeof opt('redo') === 'string' ? opt('redo').split(',') : [];
for (const id of [...(only ?? []), ...redo]) if (!ITEMS.has(id)) throw new Error(`нет «${id}» в art.js`);
let spent = 0;

if (opt('pick')) {
  const id = opt('pick');
  const seed = Number(args[args.indexOf('--pick') + 2]);
  const it = ITEMS.get(id);
  // последний черновик с этим seed
  const take = (TAKEN[id] ?? []).filter((x) => x.seed === seed && existsSync(takeFile(id, x))).at(-1);
  if (!it || !take) throw new Error(`нет черновика ${id} с seed ${seed} в art/takes/`);
  if (it.seed !== undefined) console.warn(`  ⚠ в art.js у «${id}» задан seed: ${it.seed} — уберите его, иначе выбор не удержится`);
  const hash = hashOf(it, seed);
  if (take.hash !== hash) console.warn('  ⚠ черновик сделан по другой постановке (промпт или референсы с тех пор менялись) — беру как есть');
  const buf = readFileSync(takeFile(id, take));
  shelve(it);
  writeFileSync(it.file, buf);
  M.items[id] = { ...M.items[id], file: rel(it.file), seed, hash, cost: take?.cost ?? null, at: new Date().toISOString() };
  console.log(`${id}: взят вариант seed ${seed} → ${rel(it.file)}`);
} else if (opt('takes')) {
  const n = Number(opt('takes'));
  if (!only) throw new Error('--takes N --only id[,id]');
  for (const id of only) {
    const it = ITEMS.get(id);
    for (const r of it.refs) if (!existsSync(ITEMS.get(r).file)) throw new Error(`${id}: сначала сгенерируйте референс «${r}» (make art)`);
    await Promise.all(Array.from({ length: n }, () => slot(async () => {
      const seed = randomInt(1, 2147483647);
      const x = { seed, hash: hashOf(it, seed) };
      const out = takeFile(id, x);
      console.log(`take ${id} seed ${seed}…`);
      const r = await generate(it, seed, out);
      spent += r.cost ?? 0;
      (TAKEN[id] ??= []).push({ ...x, cost: r.cost });
      console.log(`  → ${rel(out)} ${r.w}×${r.h}${r.cost !== null ? ` $${r.cost}` : ''}`);
    })));
  }
  console.log(`выбрать: make art-pick ID=<id> SEED=<seed> (варианты — в art/index.html)`);
} else if (!opt('gallery')) {
  // нужные элементы: --only и их недостающие референсы, иначе все
  const want = new Set(only ?? ITEMS.keys());
  if (only) {
    const add = (id) => { for (const r of ITEMS.get(id).refs) { if (!existsSync(ITEMS.get(r).file)) { want.add(r); add(r); } } };
    only.forEach(add);
  }
  // план (по текущим файлам; референсы, которые перерисуются, меняют отпечатки зависимых)
  const plan = [];
  const will = new Set();
  for (const id of order) {
    if (!want.has(id)) continue;
    const it = ITEMS.get(id);
    const m = M.items[id];
    const depChanged = it.refs.some((r) => will.has(r));
    let why = null;
    if (redo.includes(id)) why = 'новая попытка';
    else if (!existsSync(it.file)) why = 'новая';
    else if (depChanged || m?.hash !== hashOf(it)) why = depChanged ? 'изменился референс' : 'изменилась постановка';
    if (why && it.lock && why !== 'новая' && why !== 'новая попытка') { console.warn(`  🔒 ${id}: ${why}, но lock — оставляю как есть`); continue; }
    if (why) { plan.push({ id, why }); will.add(id); }
  }
  if (!plan.length) console.log('все картинки на месте и актуальны');
  else {
    console.log(`план: ${plan.length} шт. ≈ $${(plan.length * PRICE).toFixed(2)} (${MODEL})`);
    for (const p of plan) console.log(`  ${ITEMS.get(p.id).dir}/${p.id} — ${p.why}`);
  }
  if (!opt('dry') && plan.length) {
    const done = new Map();
    const fail = [];
    const job = (id) => {
      if (!done.has(id)) {
        done.set(id, (async () => {
          const it = ITEMS.get(id);
          await Promise.all(it.refs.filter((r) => plan.some((p) => p.id === r)).map(job));
          if (it.refs.some((r) => !existsSync(ITEMS.get(r).file))) { fail.push(id); return; }
          await slot(async () => {
            const seed = redo.includes(id) && it.seed === undefined ? randomInt(1, 2147483647) : seedOf(it);
            const tmp = `${it.file}.new`;
            const t0 = Date.now();
            console.log(`${it.dir}/${id} (seed ${seed})…`);
            try {
              const r = await generate(it, seed, tmp);
              shelve(it);
              renameSync(tmp, it.file);
              spent += r.cost ?? 0;
              M.items[id] = { file: rel(it.file), seed, hash: hashOf(it, seed), cost: r.cost, w: r.w, h: r.h, model: MODEL, refs: it.refs, at: new Date().toISOString() };
              save();
              console.log(`  ✓ ${rel(it.file)} ${r.w}×${r.h}${r.cost !== null ? ` $${r.cost}` : ''} за ${Math.round((Date.now() - t0) / 1000)} с`);
            } catch (e) {
              console.error(`  ✗ ${id}: ${e.message}`);
              fail.push(id);
            }
          });
        })());
      }
      return done.get(id);
    };
    await Promise.all(plan.map((p) => job(p.id)));
    if (fail.length) { console.error(`не получилось: ${fail.join(', ')}`); process.exitCode = 1; }
  }
}
if (spent) console.log(`потрачено: $${spent.toFixed(3)}`);
save();

// ---------------------------------------------------------------- галерея art/index.html
const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// потрачено всего: текущие картинки + черновики (в том числе заменённые)
const total = [...Object.values(M.items), ...Object.values(TAKEN).flat()].reduce((a, m) => a + (m.cost ?? 0), 0);
const card = (it) => {
  const m = M.items[it.id];
  const has = existsSync(it.file);
  const stale = has && m && m.hash !== hashOf(it);
  const takes = (TAKEN[it.id] ?? []).filter((x) => existsSync(takeFile(it.id, x)));
  return `<article id="${it.id}" class="${it.dir}${stale ? ' stale' : ''}">
  <a href="${it.dir}/${it.id}.jpg?v=${m?.hash ?? ''}"><img loading="lazy" src="${it.dir}/${it.id}.jpg?v=${m?.hash ?? ''}" alt="${esc(it.id)}"></a>
  <h3>${esc(it.id)}${it.name ? ` <small>${esc(it.name)}</small>` : ''}${it.lock ? ' 🔒' : ''}${stale ? ' <b>устарел</b>' : ''}${has ? '' : ' <b>нет файла</b>'}</h3>
  <p class="meta">${esc(it.aspect ?? '9:16')} · seed ${m?.seed ?? '—'}${m?.w ? ` · ${m.w}×${m.h}` : ''}${m?.cost ? ` · $${m.cost}` : ''}${it.refs.length ? ` · refs: ${it.refs.map((r) => `<a href="#${r}">${esc(r)}</a>`).join(', ')}` : ''}</p>
  ${it.n ? `<p class="note">${esc(it.n)}</p>` : ''}
  <details><summary>промпт</summary><p>${esc(promptOf(it))}</p></details>
  ${takes.length ? `<div class="takes">${takes.map((x) => `<a href="takes/${takeName(it.id, x)}" title="make art-pick ID=${it.id} SEED=${x.seed}"><img loading="lazy" src="takes/${takeName(it.id, x)}" alt=""><span>${x.seed}</span></a>`).join('')}</div>` : ''}
</article>`;
};
const section = (dir, title) => {
  const list = order.map((id) => ITEMS.get(id)).filter((it) => it.dir === dir);
  return list.length ? `<h2>${title}</h2><div class="grid ${dir}">${list.map(card).join('\n')}</div>` : '';
};
writeFileSync(join(ART, 'index.html'), `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Картинки · ${esc(P.name)}</title>
<style>
  :root { color-scheme: light dark; --bg: #F4EDE4; --fg: #1F1F1F; --card: #fff; --muted: #7a7166; --warn: #E2583E; }
  @media (prefers-color-scheme: dark) { :root { --bg: #181614; --fg: #EEE7DE; --card: #24211E; --muted: #A39A8F; } }
  body { margin: 0; padding: 24px 16px 60px; background: var(--bg); color: var(--fg); font: 15px/1.45 system-ui, sans-serif; }
  main { max-width: 1400px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 26px; } .sub { color: var(--muted); margin: 0 0 20px; }
  h2 { margin: 34px 0 12px; font-size: 19px; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .grid.refs { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); }
  article { background: var(--card); border-radius: 14px; padding: 10px; min-width: 0; }
  article.stale { outline: 2px solid var(--warn); }
  article > a img { display: block; width: 100%; border-radius: 8px; background: #0001; }
  h3 { margin: 10px 2px 2px; font-size: 16px; } h3 small { color: var(--muted); font-weight: 400; } h3 b { color: var(--warn); font-size: 12px; }
  .meta, .note { margin: 2px; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
  .note { color: inherit; }
  details { margin: 6px 2px 0; font-size: 13px; } details p { margin: 6px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .takes { display: flex; gap: 6px; margin-top: 8px; overflow-x: auto; }
  .takes a { flex: none; width: 76px; text-align: center; color: var(--muted); font-size: 11px; text-decoration: none; }
  .takes img { width: 100%; border-radius: 6px; display: block; }
  a { color: inherit; }
</style></head><body><main>
<h1>Картинки ролика «${esc(P.name)}»</h1>
<p class="sub">${esc(MODEL)} · ${Object.keys(M.items).length} шт. · всего потрачено $${total.toFixed(3)}. Перерисовать: <code>make art-redo ID=…</code>, варианты: <code>make art-takes ID=… N=3</code>, выбрать: <code>make art-pick ID=… SEED=…</code></p>
${section('refs', 'Листы-референсы')}
${section('shots', 'Кадры')}
</main></body></html>
`);
console.log(`галерея → art/index.html`);
