#!/usr/bin/env node
/* Builds the site's pages: template + dictionaries → static HTML for every language (as in nemilya/scantunnel).
 *
 *   node explainers/build.mjs              build (make landing)
 *   node explainers/build.mjs --check      only check that the built pages are up to date (test)
 *
 * Pages:
 *   catalog  explainers/catalog/index.html + i18n/<code>.mjs            → /index.html, /ru/index.html
 *   topic    explainers/<slug>/landing/index.html + i18n/<code>.mjs     → explainers/<slug>/index.html,
 *                                                                          explainers/<slug>/ru/index.html
 * Languages and the site address — site.mjs in the root (the first locale is the main one, at the root of the page's folder).
 *
 * Template:  {{key}} — a dictionary string (HTML allowed) or a service value (see vars);
 *          <!--if flag-->…<!--else-->…<!--end-->;
 *          <!--each key-->…{{.}} or {{.0}} {{.1}}…<!--/each--> — over a dictionary array.
 * The dictionary's `js` object goes into the page as JSON (<script type="application/json" id="i18n">) —
 * strings for scripts. Every language must have the same set of keys — otherwise the build fails.
 * A topic's video (video/): MP4s from video/out/ for every language and format, chapters — from the video's timeline
 * with the voice-over durations; no MP4 — the live player video/index.html. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GENERATED = '<!-- Built by explainers/build.mjs from the template and i18n/ — do not edit by hand: make landing -->';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const imp = (p) => import(`${pathToFileURL(p).href}?v=${fs.statSync(p).mtimeMs}`);
const rel = (from, to) => { const r = path.posix.relative(from, to); return r ? `${r}/` : ''; };
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** All dictionaries of a page have the same set of keys (and value types, list lengths). */
export function checkKeys(dicts, where) {
  const sig = (d, pre = '') => Object.entries(d).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v)
    ? sig(v, `${pre}${k}.`) : [`${pre}${k}:${Array.isArray(v) ? `arr${v.length}` : typeof v}`])).sort();
  const [base, ...rest] = Object.keys(dicts);
  const want = sig(dicts[base]);
  for (const code of rest) {
    const got = sig(dicts[code]);
    const missing = want.filter((k) => !got.includes(k));
    const extra = got.filter((k) => !want.includes(k));
    if (missing.length || extra.length) throw new Error(`${where}/i18n/${code}.mjs расходится с ${base}: нет [${missing}] лишние [${extra}]`);
  }
}

/** A link from page from to page to: relative on the same domain, absolute otherwise. */
export function linkBetween(fromUrl, toUrl) {
  const a = new URL(fromUrl);
  const b = new URL(toUrl);
  if (a.origin !== b.origin) return b.href;
  return path.posix.relative(a.pathname, b.pathname) ? `${path.posix.relative(a.pathname, b.pathname)}/` : './';
}

function render(template, vars, dict, where) {
  const get = (key, item) => {
    if (key === '.') return item;
    if (key.startsWith('.')) return item?.[Number(key.slice(1))];
    if (key in vars) return vars[key];
    return key.split('.').reduce((o, k) => o?.[k], dict);
  };
  let html = template.replace(/<!--each ([\w.]+)-->([\s\S]*?)<!--\/each-->/g, (_, key, body) => {
    const list = get(key);
    if (!Array.isArray(list)) throw new Error(`${where}: <!--each ${key}--> — не список`);
    return list.map((item) => body.replace(/\{\{(\.\d*)\}\}/g, (m, k) => String(get(k, item)))).join('');
  });
  html = html.replace(/<!--if (!?)(\w+)-->\n?([\s\S]*?)(?:<!--else-->\n?([\s\S]*?))?<!--end-->\n?/g, (_, neg, name, yes, no = '') => {
    if (!(name in vars.flags)) throw new Error(`${where}: неизвестный флаг шаблона ${name}`);
    return (neg ? !vars.flags[name] : vars.flags[name]) ? yes : no;
  });
  return html.replace(/(="?)?\{\{([\w.]+)\}\}/g, (m, attr, key) => {
    const v = get(key);
    if (typeof v !== 'string') throw new Error(`${where}: нет строки для {{${key}}}`);
    return (attr || '') + (attr ? v.replace(/"/g, '&quot;') : v);
  });
}

// ---------------------------------------------------------------- a topic's video
async function videoOf(topicDir, code, t, up) {
  const vdir = path.join(topicDir, 'video');
  if (!fs.existsSync(path.join(vdir, 'film.js'))) return null;
  const { default: makeFilm, LANGS } = await imp(path.join(vdir, 'film.js'));
  if (!LANGS.includes(code)) return null;
  const cfg = JSON.parse(fs.readFileSync(path.join(vdir, 'voice.config.json'), 'utf8'));
  const name = cfg.name ?? path.basename(topicDir);
  const sfx = code === LANGS[0] ? '' : `-${code}`;
  const exists = (p) => fs.existsSync(path.join(vdir, p));
  let manifest = null;
  if (exists(`voice/${code}.json`)) manifest = JSON.parse(fs.readFileSync(path.join(vdir, `voice/${code}.json`), 'utf8'));
  const { compile } = await imp(path.join(ROOT, 'video-kit/lib/timeline.js'));
  const film = makeFilm(code);
  const tl = compile(film, manifest);
  const chapters = [];
  for (const s of tl.scenes) {
    const label = s.kicker ?? film.ui.chapters?.[s.id] ?? s.id;
    if (chapters.at(-1)?.label !== label) chapters.push({ label, num: s.num ?? '', start: s.start });
  }
  const hash = (v) => [code !== LANGS[0] ? code : '', v ? 'v' : ''].filter(Boolean).join('-');
  const live = (v) => `${up}video/index.html${hash(v) ? `#${hash(v)}` : ''}`;
  // the light version for the site (make web → out/web/), otherwise the full one from out/
  const pickFile = (f) => (exists(`out/web/${f}`) ? `out/web/${f}` : exists(`out/${f}`) ? `out/${f}` : null);
  const one = (v) => {
    const mp4 = pickFile(`${name}${sfx}${v ? '-vertical-captions' : ''}.mp4`);
    const poster = pickFile(`poster${sfx}${v ? '-vertical-captions' : ''}.jpg`) ?? pickFile(`poster${sfx}.jpg`);
    if (!mp4) return `<iframe src="${live(v)}" title="${esc(film.ui.title)}" allow="fullscreen; autoplay" loading="lazy"></iframe>`;
    const track = !v && exists(`voice/${code}.vtt`) ? `<track kind="subtitles" srclang="${code}" label="${code.toUpperCase()}" src="${up}video/voice/${code}.vtt">` : '';
    return `<video controls preload="none" playsinline${poster ? ` poster="${up}video/${poster}"` : ''}><source src="${up}video/${mp4}" type="video/mp4">${track}</video>`;
  };
  const block = `<div class="vtabs">
      <div class="seg" role="group" aria-label="${esc(t.video.format)}"><span>${t.video.format}</span><button type="button" data-f="h" aria-pressed="true">16:9</button><button type="button" data-f="v" aria-pressed="false">9:16</button></div>
      <a class="btn ghost" href="${live(false)}" target="_blank" rel="noopener" data-live-h="${live(false)}" data-live-v="${live(true)}">${t.video.live}</a>
    </div>
    <div class="video" data-f="h">${one(false)}</div>
    <div class="video v" data-f="v"${pickFile(`${name}${sfx}-vertical-captions.mp4`) ? ' data-has' : ''} hidden>${one(true)}</div>
    <ul class="chapters">${chapters.map((c) => `<li><button type="button" data-t="${(c.start + 0.05).toFixed(2)}"><span class="mono">${c.num || '·'} · ${fmt(c.start)}</span>${c.label}</button></li>`).join('')}</ul>`;
  const poster = pickFile(`poster${sfx}.jpg`);
  return { block, duration: fmt(tl.duration), poster: poster ? `video/${poster}` : '' };
}

// ---------------------------------------------------------------- pages
export async function pages() {
  const site = (await imp(path.join(ROOT, 'site.mjs'))).default;
  const codes = site.locales.map((l) => l.code);
  const load = async (dir) => Object.fromEntries(await Promise.all(codes.map(async (c) => [c, (await imp(path.join(dir, 'i18n', `${c}.mjs`))).default])));
  const topics = fs.readdirSync(HERE).filter((d) => fs.existsSync(path.join(HERE, d, 'landing', 'index.html'))).sort();
  const list = [{ id: 'catalog', src: path.join(HERE, 'catalog'), base: '' }]
    .concat(topics.map((slug) => ({ id: slug, src: path.join(HERE, slug, 'landing'), base: `explainers/${slug}/`, topic: path.join(HERE, slug) })));
  for (const p of list) { p.dicts = await load(p.src); checkKeys(p.dicts, path.relative(ROOT, p.src)); }

  const out = [];
  for (const p of list) {
    const template = fs.readFileSync(path.join(p.src, 'index.html'), 'utf8');
    const urlOf = (l) => `${site.url}${p.base}${l.dir ? `${l.dir}/` : ''}`;
    for (const locale of site.locales) {
      const t = p.dicts[locale.code];
      const dir = `${p.base}${locale.dir ? `${locale.dir}/` : ''}`;
      const url = urlOf(locale);
      const alternates = site.locales.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${urlOf(l)}" data-href="${linkBetween(url, urlOf(l))}" data-suggest="${esc(p.dicts[l.code].suggest)}" data-go="${esc(p.dicts[l.code].suggestGo)}">`)
        .concat(`<link rel="alternate" hreflang="x-default" href="${urlOf(site.locales[0])}">`).join('\n');
      // the current language first, the rest in site.locales order
      const order = [locale, ...site.locales.filter((l) => l !== locale)];
      const langSwitch = order.map((l) => `<a href="${linkBetween(url, urlOf(l))}" hreflang="${l.code}" lang="${l.code}" data-lang="${l.code}" title="${esc(p.dicts[l.code].langName)}"${l === locale ? ' aria-current="page"' : ''}>${l.code.toUpperCase()}</a>`).join('');
      const root = rel(dir.replace(/\/$/, ''), '') || './';
      const up = rel(dir.replace(/\/$/, ''), p.base.replace(/\/$/, ''));
      const vars = {
        lang: locale.code, canonical: url, alternates, langSwitch, root, up,
        home: linkBetween(url, `${site.url}${locale.dir ? `${locale.dir}/` : ''}`), // the catalog in the same language
        generated: GENERATED,
        js: `<script type="application/json" id="i18n">${JSON.stringify(t.js ?? {}).replace(/</g, '\\u003c')}</script>`,
        flags: { video: false, main: locale === site.locales[0] },
      };
      if (p.topic) {
        const v = await videoOf(p.topic, locale.code, t, up);
        vars.flags.video = !!v;
        vars.videoBlock = v?.block ?? '';
        vars.videoDuration = v?.duration ?? '';
        vars.ogImage = v?.poster ? `${site.url}${p.base}${v.poster}` : '';
      } else {
        // catalog: topic cards in the page's language
        const cards = [];
        for (const q of list.filter((x) => x.topic)) {
          const c = q.dicts[locale.code].card;
          const v = await videoOf(q.topic, locale.code, q.dicts[locale.code], '');
          const href = linkBetween(url, `${site.url}${q.base}${locale.dir ? `${locale.dir}/` : ''}`);
          const img = v?.poster ? `<img src="${root}${q.base}${v.poster}" alt="${esc(c.alt)}" loading="lazy">` : '';
          cards.push(`<a class="card" href="${href}">${img}<div><span class="mono">${c.meta}${v ? ` · ${v.duration}` : ''}</span><h3>${c.title}</h3><p>${c.text}</p></div></a>`);
        }
        vars.cards = cards.join('\n      ');
        vars.ogImage = '';
      }
      vars.flags.og = !!vars.ogImage;
      out.push({ file: path.join(ROOT, dir, 'index.html'), html: render(template, vars, t, `${p.id}/${locale.code}`) });
    }
  }
  // sitemap: every page in every language
  const urls = list.map((p) => site.locales.map((l) => `${site.url}${p.base}${l.dir ? `${l.dir}/` : ''}`));
  const sm = urls.map((group) => group.map((u) => `  <url>\n    <loc>${esc(u)}</loc>\n${group.map((a, i) => `    <xhtml:link rel="alternate" hreflang="${site.locales[i].code}" href="${esc(a)}"/>`).join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(group[0])}"/>\n  </url>`).join('\n')).join('\n');
  out.push({ file: path.join(ROOT, 'sitemap.xml'), html: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sm}\n</urlset>\n` });
  out.push({ file: path.join(ROOT, 'robots.txt'), html: `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n` });
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const list = await pages();
  const check = process.argv.includes('--check');
  const stale = [];
  for (const { file, html } of list) {
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (now === html) continue;
    stale.push(path.relative(ROOT, file));
    if (!check) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, html); }
  }
  if (check && stale.length) { console.error(`устарело (make landing): ${stale.join(', ')}`); process.exit(1); }
  console.log(`${list.length} файлов${stale.length ? `, ${check ? 'устарели' : 'обновлены'}: ${stale.join(', ')}` : ', всё актуально'}`);
}
