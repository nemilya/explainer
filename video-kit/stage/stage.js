/* Сцена ролика и плеер. Кадр — функция времени: window.__video.seek(t) приводит все сцены и слои
 * к моменту t (сцены рисуются заново каждый кадр, состояния нет). scripts/render.mjs снимает
 * кадры подряд (?render); без него это интерактивный плеер: звук, главы, субтитры, перемотка.
 * Формат и язык — в адресе: ?v / ?lang=en или #v, #en, #en-v (v — вертикальный кадр 1080×1920,
 * иначе 1920×1080; язык — text/<язык>.js проекта, озвучка voice/<язык>.*; по умолчанию — первый язык
 * из LANGS в film.js).
 *
 * Контракт проекта (папка страницы): film.js — export default makeFilm(lang) → { title, ui, scenes, poster?,
 *   formats? (['v'] — только вертикальный кадр), captions? (true — субтитры в плеере включены сразу),
 *   layers? — постоянные слои под сценами (фигура, машина): [{ id, html({ v }), draw(t, tl, ctx) }],
 *     t — время от начала ролика, tl — { scenes (start, dur, q каждой сцены), events, duration };
 *   speakers? — участники диалога: [{ voice: '' | 'he' | …, name, role }] — плашки «кто говорит»
 *     (voice '' — основной голос; остальные — роли из s.say(…, { voice })) }
 * и export LANGS; voice/<язык>.json — манифест озвучки (без него длительности оцениваются по тексту).
 * ?captions — субтитры прямо в кадре (для вшитых в видео субтитров, render.mjs --captions).
 * Картинки в вёрстке сцен (<img>, например ИИ-кадры art/shots/…) декодируются до старта.
 * Клавиши: пробел/K — пауза, ←/→ — 5 с, N/P — глава, C — субтитры, M — звук, F — весь экран. */
import { E, clamp, seg } from '../lib/motion.js';
import { XF, compile } from '../lib/timeline.js';

// проект — папка страницы плеера: film.js, scenes.css, voice/ (video-kit — только движок)
const { default: makeFilm, LANGS } = await import(new URL('film.js', document.baseURI).href);
const PARAMS = new URLSearchParams(location.search);
const RENDER = PARAMS.has('render');
const HASH = location.hash.slice(1).split('-').filter(Boolean);
const LANG = [PARAMS.get('lang'), ...HASH].find((x) => LANGS.includes(x)) ?? LANGS[0];
const film = makeFilm(LANG);
const FORMATS = film.formats ?? ['h', 'v'];
const V = FORMATS.length === 1 ? FORMATS[0] === 'v' : PARAMS.has('v') || HASH.includes('v');
document.documentElement.lang = LANG;
document.title = film.ui.title;
if (RENDER) document.body.classList.add('render');

const W = V ? 1080 : 1920;
const H = V ? 1920 : 1080;
const $ = (id) => document.getElementById(id);
const stage = $('stage');
if (V) { stage.classList.add('v'); document.body.classList.add('vertical'); }

// ---------------------------------------------------------------- таймлайн
let voice = null;
try {
  const r = await fetch(new URL(`voice/${LANG}.json`, document.baseURI));
  if (r.ok) voice = await r.json();
} catch { /* без озвучки — длительности по оценке */ }
const TL = compile(film, voice);
const CUES = TL.events.filter((e) => e.type === 'voice');

// субтитры короткими фразами (как в Reels): фраза — до ~26 знаков или до знака препинания,
// время слова — по доле текста с паузами на знаках (как at() в таймлайне)
const weight = (x) => x.length + 5 * (x.match(/[,.:;!?—…]/g) || []).length;
const PHRASES = CUES.flatMap((c) => {
  const words = c.text.split(/\s+/).reduce((a, w) => {
    if (/^[—–-]$/.test(w) && a.length) a[a.length - 1] += ` ${w}`; else a.push(w);
    return a;
  }, []);
  const W = weight(c.text);
  let pos = 0;
  const timed = words.map((w) => {
    const i = c.text.indexOf(w.split(' ')[0], pos);
    pos = i + w.length;
    return { w, t: c.t + c.dur * (weight(c.text.slice(0, i)) / W) };
  });
  const out = [];
  let cur = [];
  const flush = () => { if (cur.length) out.push(cur); cur = []; };
  for (const x of timed) {
    const len = cur.reduce((n, y) => n + y.w.length + 1, 0);
    if (cur.length && len + x.w.length > 26) flush();
    cur.push(x);
    if (/[.,:;!?…—]$/.test(x.w) && len + x.w.length > 10) flush();
  }
  flush();
  return out.map((ws, k) => ({ words: ws, voice: c.voice ?? '', t0: ws[0].t, t1: k < out.length - 1 ? out[k + 1][0].t : c.t + c.dur + 0.25 }));
});
const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const SC = TL.scenes;

// ---------------------------------------------------------------- постоянные слои и сцены: вёрстка один раз
const host = $('scenes');
const LAYERS = (film.layers ?? []).map((ly) => {
  const el = document.createElement('div');
  el.className = `layer l-${ly.id}`;
  el.innerHTML = (typeof ly.html === 'function' ? ly.html({ v: V }) : ly.html) ?? '';
  host.parentNode.insertBefore(el, host);
  return { ly, ctx: { root: el, v: V, $: (q) => el.querySelector(q), $$: (q) => [...el.querySelectorAll(q)] } };
});
// участники диалога: плашки, подсвечивается тот, кто сейчас говорит
const SPEAKERS = film.speakers ?? [];
let speakersEl = null;
if (SPEAKERS.length) {
  speakersEl = document.createElement('div');
  speakersEl.id = 'speakers';
  speakersEl.innerHTML = SPEAKERS.map((p) => `<div class="spk" data-voice="${p.voice ?? ''}"><i class="ava">${p.name.slice(0, 1)}<b class="wave">${'<s></s>'.repeat(4)}</b></i><span><b>${p.name}</b><small>${p.role ?? ''}</small></span></div>`).join('');
  $('chrome').appendChild(speakersEl);
}
const roots = film.scenes.map((sc) => {
  const el = document.createElement('section');
  el.className = `scene s-${sc.id}${sc.theme ? ` ${sc.theme}` : ''}`;
  el.innerHTML = (typeof sc.html === 'function' ? sc.html({ v: V }) : sc.html) ?? '';
  host.appendChild(el);
  return el;
});
const ctxs = roots.map((root, i) => ({
  root,
  dur: SC[i].dur,
  v: V,
  $: (s) => root.querySelector(s),
  $$: (s) => [...root.querySelectorAll(s)],
}));

// главы: подряд идущие сцены с одной подписью — одна глава
const NAMES = film.ui.chapters;
$('brand').textContent = film.ui.brand;
const CHAPTERS = [];
SC.forEach((s, i) => {
  const name = s.kicker ?? NAMES[s.id] ?? s.id;
  const prev = CHAPTERS.at(-1);
  if (prev && prev.name === name) { prev.end = s.start + s.dur; return; }
  CHAPTERS.push({ name, num: s.num ?? '', start: s.start, end: s.start + s.dur, scene: i });
});

// ---------------------------------------------------------------- кадр
const sceneAt = (t) => SC.reduce((a, s, i) => (t >= s.start ? i : a), 0);
const chapterAt = (t) => CHAPTERS.reduce((a, c, i) => (t >= c.start ? i : a), 0);
const kick = $('kicker');
const chrome = $('chrome');
const cc = $('cc');
let ccKey = '';
if (PARAMS.has('captions')) cc.hidden = false;
let shown = new Set();

function drawScene(i, t) {
  const sc = film.scenes[i];
  try { sc.draw?.(t - SC[i].start, SC[i].q, ctxs[i]); } catch (e) { console.error(`сцена ${sc.id} @${t.toFixed(2)}: ${e.stack}`); }
}

const TLX = { scenes: SC, events: TL.events, duration: TL.duration };
function frame(t) {
  t = clamp(t, 0, TL.duration);
  for (const { ly, ctx } of LAYERS) {
    try { ly.draw?.(t, TLX, ctx); } catch (e) { console.error(`слой ${ly.id} @${t.toFixed(2)}: ${e.stack}`); }
  }
  if (speakersEl) {
    const on = CUES.find((c) => t >= c.t - 0.05 && t < c.t + c.dur + 0.1);
    const who = on ? on.voice ?? '' : null;
    speakersEl.querySelectorAll('.spk').forEach((el, j) => {
      const me = who === (SPEAKERS[j].voice ?? '');
      el.classList.toggle('on', me);
      el.querySelectorAll('.wave s').forEach((b, n) => {
        const h = me ? 0.35 + 0.65 * Math.abs(Math.sin(t * (7 + n * 2.3) + n * 1.7)) : 0.2;
        b.style.transform = `scaleY(${h.toFixed(3)})`;
      });
    });
  }
  const i = sceneAt(t);
  const k = i > 0 ? E.io(seg(t, SC[i].start, SC[i].start + XF)) : 1;
  const on = new Set(k < 1 ? [i - 1, i] : [i]);
  for (const j of shown) if (!on.has(j)) roots[j].style.display = 'none';
  for (const j of on) {
    const r = roots[j];
    r.style.display = 'block';
    if (j === i) {
      r.style.opacity = k;
      r.style.transform = k < 1 ? `translateY(${(1 - k) * 26}px)` : '';
    } else {
      r.style.opacity = 1 - k;
      r.style.transform = `translateY(${-k * 18}px)`;
    }
    drawScene(j, t);
  }
  shown = on;

  // фон: медленно плывущие пятна
  const b = stage.querySelectorAll('.blob');
  const pos = [
    [1300 + 80 * Math.sin(t * 0.11), -380 + 60 * Math.cos(t * 0.13)],
    [-220 + 70 * Math.cos(t * 0.09), 560 + 50 * Math.sin(t * 0.12)],
    [1580 + 50 * Math.sin(t * 0.15 + 1), 820 + 40 * Math.cos(t * 0.1)],
  ];
  b.forEach((el, j) => { el.style.transform = `translate(${(pos[j][0] * W) / 1920}px, ${(pos[j][1] * H) / 1080}px)`; });

  // подпись главы: въезжает в начале серии сцен с одной подписью, уходит в конце
  const s = SC[i];
  if (s.kicker) {
    let f = i;
    while (f > 0 && SC[f - 1].kicker === s.kicker) f--;
    let l = i;
    while (l < SC.length - 1 && SC[l + 1].kicker === s.kicker) l++;
    const p = E.out(seg(t, SC[f].start + 0.25, SC[f].start + 0.85));
    const end = SC[l].start + SC[l].dur;
    const o = p * (1 - seg(t, end - 0.35, end - 0.05));
    kick.querySelector('.num').textContent = s.num ?? '';
    kick.querySelector('.txt').textContent = s.kicker;
    kick.style.opacity = o;
    kick.style.transform = `translateX(${(1 - p) * -50}px)`;
  } else kick.style.opacity = 0;
  const theme = film.scenes[k < 0.5 && i > 0 ? i - 1 : i].theme ?? '';
  chrome.className = theme;
  const plain = (x) => !SC[x].kicker;
  $('brand').style.opacity = plain(i) ? (i > 0 && !plain(i - 1) ? 1 - k : 0) : (i > 0 && plain(i - 1) ? k : 1);
  $('progress').firstChild.style.transform = `scaleX(${t / TL.duration})`;

  // субтитры (только в плеере)
  stage.classList.toggle('cc', !cc.hidden);
  if (!cc.hidden) {
    const ph = PHRASES.find((p) => t >= p.t0 && t < p.t1);
    const on = ph ? ph.words.filter((w) => w.t <= t).length - 1 : -1;
    const key = ph ? `${ph.t0}:${on}` : '';
    if (key !== ccKey) {
      ccKey = key;
      cc.firstChild.innerHTML = ph ? ph.words.map((w, j) => `<i${j === on ? ' class="on"' : ''}>${esc(w.w)}</i>`).join(' ') : '';
      cc.dataset.voice = ph?.voice ?? ''; // реплика персонажа (s.say(…, { voice })) — можно покрасить в scenes.css
    }
    cc.style.opacity = ph ? 1 : 0;
  }
}

// ---------------------------------------------------------------- запуск
// картинки сцен (ИИ-кадры art/…) должны быть декодированы до первого кадра: рендер покадровый
await Promise.all([...document.images].map((img) => img.decode().catch(() => console.error(`нет картинки: ${img.getAttribute('src')}`))));
// все шрифты (@font-face движка и проекта) — заранее: в скрытых сценах браузер сам их не грузит
await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
await document.fonts.ready;
frame(0);
const seek = async (t) => frame(t);
window.__video = {
  ready: true, seek, duration: TL.duration, scenes: SC, chapters: CHAPTERS, width: W, height: H,
  poster: film.poster ?? 3.2, // кадр для обложки плеера и poster.jpg
};

if (!RENDER) player();

// ---------------------------------------------------------------- плеер
function player() {
  const frameEl = $('frame');
  const audio = $('audio');
  const track = $('track');
  const fill = track.querySelector('.fill');
  const knob = track.querySelector('.knob');
  const tip = track.querySelector('.tip');
  const menu = $('menu');
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>';
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  audio.src = audio.dataset.src.replace('{lang}', LANG);
  $('watch').textContent = film.ui.watch;
  $('menu-btn').textContent = film.ui.menu;
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* приватный режим */ } return null; };

  const fit = () => {
    const r = frameEl.getBoundingClientRect();
    const k = Math.min(r.width / W, r.height / H);
    stage.style.transform = `translate(${(r.width - W * k) / 2}px, ${(r.height - H * k) / 2}px) scale(${k})`;
  };
  addEventListener('resize', fit);
  new ResizeObserver(fit).observe(frameEl);
  fit();

  // главы: отметки на дорожке и меню
  track.querySelector('.ticks').innerHTML = CHAPTERS.slice(1).map((c) => `<i class="tick" style="left:${(c.start / TL.duration) * 100}%"></i>`).join('');
  menu.innerHTML = CHAPTERS.map((c, i) => `<button type="button" role="menuitem" data-i="${i}"><span class="n">${c.num || '·'}</span><span>${c.name}</span><span class="tm">${fmt(c.start)}</span></button>`).join('');
  $('dur').textContent = fmt(TL.duration);

  let playing = false;
  let t0 = 0;
  let wall = 0;
  let hasAudio = true;
  audio.addEventListener('error', () => { hasAudio = false; });
  const now = () => (hasAudio && playing && !audio.paused ? audio.currentTime : t0 + (playing ? (performance.now() - wall) / 1000 : 0));
  const go = (x) => {
    x = clamp(x, 0, TL.duration);
    t0 = x; wall = performance.now();
    if (hasAudio) { try { audio.currentTime = x; } catch { /* ещё не загружено */ } }
    frame(x);
  };
  const setPlaying = (v) => {
    playing = v;
    $('play').innerHTML = v ? ICON_PAUSE : ICON_PLAY;
    $('cover').style.display = 'none';
    t0 = clamp(t0, 0, TL.duration); wall = performance.now();
    if (hasAudio) {
      if (v) { audio.currentTime = t0; audio.play().catch(() => { hasAudio = false; }); } else audio.pause();
    }
  };
  const toggle = () => {
    if (playing) { t0 = now(); setPlaying(false); return; }
    if (t0 >= TL.duration - 0.05) t0 = 0;
    setPlaying(true);
  };
  const jumpChapter = (d) => {
    const x = now();
    let i = chapterAt(x);
    if (d < 0 && x - CHAPTERS[i].start > 2) d = 0;
    i = clamp(i + d, 0, CHAPTERS.length - 1);
    go(CHAPTERS[i].start + (i ? 0.05 : 0));
  };
  const setCC = (v) => {
    cc.hidden = !v;
    $('cc-btn').setAttribute('aria-pressed', String(v));
    store('cc', v ? '1' : '0');
    frame(now());
  };
  const setMute = (v) => { audio.muted = v; $('mute').setAttribute('aria-pressed', String(v)); };
  const openMenu = (v) => { menu.classList.toggle('open', v); $('menu-btn').setAttribute('aria-expanded', String(v)); };

  $('play').innerHTML = ICON_PLAY;
  $('play').onclick = toggle;
  $('cover').onclick = () => { t0 = 0; setPlaying(true); };
  $('prev').onclick = () => jumpChapter(-1);
  $('next').onclick = () => jumpChapter(1);
  $('cc-btn').onclick = () => setCC(cc.hidden);
  // формат кадра: 16:9 ↔ 9:16 (страница перезагружается в другом формате)
  // формат кадра и язык: страница перезагружается с новым #хешем (#en-v, #v, #en …)
  const reopen = ({ v = V, lang = LANG }) => {
    const u = new URL(location.href);
    const hadParams = u.searchParams.has('v') || u.searchParams.has('lang');
    u.searchParams.delete('v');
    u.searchParams.delete('lang');
    u.hash = [lang !== LANGS[0] ? lang : '', v ? 'v' : ''].filter(Boolean).join('-');
    if (hadParams) location.replace(u);
    else { location.hash = u.hash; location.reload(); }
  };
  $('fmt').textContent = V ? '16:9' : '9:16';
  $('fmt').title = V ? 'Horizontal / Горизонтальная версия' : 'Vertical / Вертикальная версия';
  $('fmt').onclick = () => reopen({ v: !V });
  $('fmt').hidden = FORMATS.length < 2;
  const other = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
  $('lang').textContent = other.toUpperCase();
  $('lang').title = other.toUpperCase();
  $('lang').hidden = LANGS.length < 2;
  $('lang').onclick = () => reopen({ lang: other });
  $('mute').onclick = () => setMute(!audio.muted);
  $('menu-btn').onclick = (e) => { e.stopPropagation(); openMenu(!menu.classList.contains('open')); };
  menu.onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    go(CHAPTERS[Number(b.dataset.i)].start + 0.05);
    openMenu(false);
    if (!playing) setPlaying(true);
  };
  addEventListener('click', (e) => { if (!menu.contains(e.target)) openMenu(false); });
  $('fs').onclick = () => {
    const el = $('player');
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
  };
  // щелчок по кадру — пауза
  stage.addEventListener('click', () => { if ($('cover').style.display === 'none') toggle(); });

  // перемотка по дорожке
  const posAt = (e) => { const r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * TL.duration; };
  let drag = false;
  track.addEventListener('pointerdown', (e) => { drag = true; track.setPointerCapture(e.pointerId); go(posAt(e)); });
  track.addEventListener('pointermove', (e) => {
    const x = posAt(e);
    tip.textContent = `${fmt(x)} · ${CHAPTERS[chapterAt(x)].name}`;
    tip.style.left = `${(x / TL.duration) * 100}%`;
    if (drag) go(x);
  });
  track.addEventListener('pointerup', () => { drag = false; });
  track.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(now() + (e.code === 'ArrowRight' ? 5 : -5)); }
  });

  addEventListener('keydown', (e) => {
    if (e.target.closest?.('button') && (e.code === 'Space' || e.code === 'Enter')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.code;
    if (k === 'Space' || k === 'KeyK') { e.preventDefault(); toggle(); }
    else if (k === 'ArrowRight') go(now() + 5);
    else if (k === 'ArrowLeft') go(now() - 5);
    else if (k === 'KeyN') jumpChapter(1);
    else if (k === 'KeyP') jumpChapter(-1);
    else if (k === 'KeyC') setCC(cc.hidden);
    else if (k === 'KeyM') setMute(!audio.muted);
    else if (k === 'KeyF') $('fs').onclick();
    else if (k === 'Escape') openMenu(false);
  });

  if (store('cc') === '1' || (film.captions && store('cc') !== '0')) setCC(true);
  const q = new URLSearchParams(location.search).get('t');
  go(q ? Number(q) : window.__video.poster);
  if (q) $('cover').style.display = 'none';
  else t0 = 0;

  const loop = () => {
    let x = now();
    if (playing && x >= TL.duration) { x = TL.duration; t0 = x; setPlaying(false); }
    if (playing) frame(x);
    const shownT = playing ? x : t0;
    const p = (shownT / TL.duration) * 100;
    fill.style.width = `${p}%`;
    knob.style.left = `${p}%`;
    $('time').textContent = `${fmt(shownT)} / ${fmt(TL.duration)}`;
    const ci = chapterAt(shownT);
    const c = CHAPTERS[ci];
    $('chap').textContent = `${c.num ? `${c.num} · ` : ''}${c.name}`;
    menu.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === ci));
    requestAnimationFrame(loop);
  };
  loop();
}
