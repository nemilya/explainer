/* Лендинг «Почему API отвечает 429?»: живая машина (figure.js + model.js), ролик (готовый MP4 из
 * video/out/ или живой плеер video/index.html), объяснение и код. Языки — ru / en (?lang=en или #en).
 *
 * Машина на странице — та же модель, что в ролике, но с живым расписанием: кнопка «запрос» ставит
 * карточку на ленту, «всплеск» — десять подряд, переключатель — период пополнения. Пока никто не
 * трогает, идёт тур: ровный поток и иногда всплеск. */
import { buildFigure, mountFigure } from './figure.js';
import { MACHINE, simulate, travel, view } from './model.js';
import { compile } from '../../video-kit/lib/timeline.js';
import makeFilm from './video/film.js';

// ---------------------------------------------------------------- тексты
const TX = {
  ru: {
    catalog: '← Explainer',
    eyebrow: 'Explainer · rate limiting',
    h1: 'Почему API отвечает <em>429</em>?',
    lede: 'Почти любой лимит запросов внутри устроен как <b>ведро с жетонами</b> — token bucket. Мы собрали его в железе: магазин монет, часы пополнения и лента запросов. Трогайте машину, смотрите ролик — и через пять минут правило <b>b + r·T</b> будет очевидным.',
    questions: ['Что значит 429 Too Many Requests?', 'Сколько запросов можно отправить разом?', 'Почему в среднем пропускают ровно r в секунду?', 'Что делать, получив 429?'],
    s1kicker: 'Машина', s1h: 'Token bucket в железе',
    s1sub: 'Магазин на 5 монет — ведро (ёмкость b). Часы бункера роняют монету раз в 2 секунды — пополнение (скорость r). Каждый запрос на ленте забирает одну монету; нет монеты — толкатель сбрасывает его в лоток 429.',
    figTitle: 'Token bucket', figHint: 'Пробел — запрос · B — всплеск',
    send: 'Отправить запрос', burst: 'Всплеск ×10', rate: 'пополнение',
    mTok: 'жетонов в ведре', mOk: 'пропущено · 200', mNo: 'отказ · 429',
    readout: (s, p) => `жетонов ${s.tokens}/5 · r = 1/${p} с · 200: ${s.ok} · 429: ${s.no}`,
    caption: 'Числа на счётчиках — из той же модели, что двигает детали: монета падает раз в период, лишняя уходит в стакан переполнения, запрос без монеты получает 429. Попробуйте всплеск при полном ведре, а потом — при пустом.',
    s2kicker: 'Ролик', s2h: 'Вера объясняет, Макс спрашивает',
    s2sub: 'Два с половиной минуты диалога над той же машиной: ведро, пополнение, запрос, всплеск, среднее и две ручки лимита. Есть вертикальная версия для Reels/Shorts и английская.',
    fmt: 'формат', live: 'Живой плеер ↗',
    s3kicker: 'Суть', s3h: 'Четыре факта о token bucket',
    facts: [
      ['b · ёмкость', 'Всплеск — не больше b', 'Полное ведро пропускает b запросов подряд, сколько бы их ни пришло разом.'],
      ['r · скорость', 'В среднем — не больше r', 'Когда запас кончился, проходит ровно столько, сколько капает: r запросов в секунду.'],
      ['переполнение', 'Копить нельзя', 'Ведро не растёт: лишние жетоны сгорают. Долгое молчание не даёт права на огромный всплеск.'],
      ['429', 'Отказ — это подсказка', 'Получили 429 — подождите Retry-After секунд: к этому времени капнет новый жетон.'],
    ],
    formula: 'за любые T секунд пройдёт не больше <b>b</b> + <b>r</b>·T запросов<small>В нашей машине b = 5, r = 0,5/с: за 10 секунд — не больше 5 + 0,5·10 = 10 запросов.</small>',
    s4kicker: 'Код', s4h: 'Тот же алгоритм — двенадцать строк',
    s4sub: 'В настоящих серверах жетоны не падают по одному: их число пересчитывают при каждом запросе по прошедшему времени. Результат тот же, что у машины.',
    code: `<span class="k">class</span> TokenBucket {
  constructor(b, r) { <span class="k">this</span>.b = b; <span class="k">this</span>.r = r; <span class="k">this</span>.tokens = b; <span class="k">this</span>.last = Date.now() / 1000; }
  take() {
    <span class="k">const</span> now = Date.now() / 1000;
    <span class="c">// пополнение: r жетонов в секунду, но не больше ёмкости b</span>
    <span class="k">this</span>.tokens = Math.min(<span class="k">this</span>.b, <span class="k">this</span>.tokens + (now - <span class="k">this</span>.last) * <span class="k">this</span>.r);
    <span class="k">this</span>.last = now;
    <span class="k">if</span> (<span class="k">this</span>.tokens >= 1) { <span class="k">this</span>.tokens -= 1; <span class="k">return</span> { ok: <span class="k">true</span> }; }             <span class="c">// 200</span>
    <span class="k">return</span> { ok: <span class="k">false</span>, retryAfter: Math.ceil((1 - <span class="k">this</span>.tokens) / <span class="k">this</span>.r) };  <span class="c">// 429</span>
  }
}`,
    foot: 'Сделано на <a href="../../anatomy/">anatomy</a> (изометрическая фигура) и <a href="../../video-kit/">video-kit</a> (ролик с озвучкой). Исходники машины — <code>figure.js</code>, модель — <code>model.js</code>, сценарий — <code>video/SCENARIO.md</code>.',
  },
  en: {
    catalog: '← Explainer',
    eyebrow: 'Explainer · rate limiting',
    h1: 'Why does an API answer <em>429</em>?',
    lede: 'Almost every rate limit is a <b>token bucket</b> inside. We built one as a machine: a coin magazine, a refill clock and a request belt. Play with it, watch the video, and in five minutes the rule <b>b + r·T</b> will feel obvious.',
    questions: ['What does 429 Too Many Requests mean?', 'How many requests can I send at once?', 'Why does the average settle at exactly r per second?', 'What should a client do after a 429?'],
    s1kicker: 'The machine', s1h: 'A token bucket you can touch',
    s1sub: 'A magazine of 5 coins is the bucket (capacity b). The hopper clock drops a coin every 2 seconds — the refill (rate r). Every request on the belt takes one coin; no coin, and the kicker pushes it into the 429 tray.',
    figTitle: 'Token bucket', figHint: 'Space — request · B — burst',
    send: 'Send a request', burst: 'Burst ×10', rate: 'refill',
    mTok: 'tokens in the bucket', mOk: 'passed · 200', mNo: 'rejected · 429',
    readout: (s, p) => `tokens ${s.tokens}/5 · r = 1/${p} s · 200: ${s.ok} · 429: ${s.no}`,
    caption: 'The counters come from the same model that moves the parts: a coin drops once per period, an extra one rolls into the overflow cup, a request without a coin gets 429. Try a burst with a full bucket, then with an empty one.',
    s2kicker: 'The video', s2h: 'Vera explains, Max asks',
    s2sub: 'Two and a half minutes of dialogue over the same machine: the bucket, refill, a request, a burst, the average and the two knobs of a limit. There is a vertical cut for Reels/Shorts and a Russian version.',
    fmt: 'format', live: 'Live player ↗',
    s3kicker: 'The gist', s3h: 'Four facts about a token bucket',
    facts: [
      ['b · capacity', 'A burst is at most b', 'A full bucket lets b requests through in a row, however many arrive at once.'],
      ['r · rate', 'The average is at most r', 'Once the reserve is gone, exactly as many get through as drip in: r requests per second.'],
      ['overflow', 'No hoarding', 'The bucket never grows: extra tokens are lost. A long silence doesn’t earn a giant burst.'],
      ['429', 'A rejection is a hint', 'Got a 429? Wait Retry-After seconds: by then a new token will have dropped.'],
    ],
    formula: 'in any T seconds, at most <b>b</b> + <b>r</b>·T requests get through<small>In our machine b = 5, r = 0.5/s: in 10 seconds at most 5 + 0.5·10 = 10 requests.</small>',
    s4kicker: 'Code', s4h: 'The same algorithm in twelve lines',
    s4sub: 'Real servers don’t drop tokens one by one: they recompute the count on every request from the elapsed time. The result is the same as the machine’s.',
    code: `<span class="k">class</span> TokenBucket {
  constructor(b, r) { <span class="k">this</span>.b = b; <span class="k">this</span>.r = r; <span class="k">this</span>.tokens = b; <span class="k">this</span>.last = Date.now() / 1000; }
  take() {
    <span class="k">const</span> now = Date.now() / 1000;
    <span class="c">// refill: r tokens per second, but never above capacity b</span>
    <span class="k">this</span>.tokens = Math.min(<span class="k">this</span>.b, <span class="k">this</span>.tokens + (now - <span class="k">this</span>.last) * <span class="k">this</span>.r);
    <span class="k">this</span>.last = now;
    <span class="k">if</span> (<span class="k">this</span>.tokens >= 1) { <span class="k">this</span>.tokens -= 1; <span class="k">return</span> { ok: <span class="k">true</span> }; }             <span class="c">// 200</span>
    <span class="k">return</span> { ok: <span class="k">false</span>, retryAfter: Math.ceil((1 - <span class="k">this</span>.tokens) / <span class="k">this</span>.r) };  <span class="c">// 429</span>
  }
}`,
    foot: 'Built with <a href="../../anatomy/">anatomy</a> (the isometric figure) and <a href="../../video-kit/">video-kit</a> (the narrated video). The machine is <code>figure.js</code>, the model is <code>model.js</code>, the script is <code>video/SCENARIO.md</code>.',
  },
};
const LANGS = Object.keys(TX);
const params = new URLSearchParams(location.search);
let LANG = [params.get('lang'), location.hash.slice(1)].find((x) => LANGS.includes(x))
  ?? (() => { try { return localStorage.getItem('explainer-lang'); } catch { return null; } })()
  ?? (navigator.language?.startsWith('ru') ? 'ru' : 'en');
if (!LANGS.includes(LANG)) LANG = 'ru';
let T = TX[LANG];

function texts() {
  T = TX[LANG];
  document.documentElement.lang = LANG;
  document.title = `${T.h1.replace(/<[^>]+>/g, '')} — Token bucket · Explainer`;
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = T[el.dataset.t];
    if (el.dataset.t === 'questions') el.innerHTML = v.map((q) => `<li>${q}</li>`).join('');
    else if (el.dataset.t === 'facts') el.innerHTML = v.map(([k, h, p]) => `<div class="fact"><span class="mono">${k}</span><h3>${h}</h3><p>${p}</p></div>`).join('');
    else if (typeof v === 'string') el.innerHTML = v;
  });
  document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
}
document.querySelectorAll('.langs button').forEach((b) => b.addEventListener('click', () => {
  LANG = b.dataset.lang;
  try { localStorage.setItem('explainer-lang', LANG); } catch { /* приватный режим */ }
  history.replaceState(null, '', `#${LANG}`);
  texts();
  video();
}));
texts();

// ---------------------------------------------------------------- живая машина
const FIG = buildFigure();
const stage = document.querySelector('.iso-stage');
stage.innerHTML = FIG.svg;
stage.setAttribute('aria-label', FIG.svg.match(/aria-label="([^"]+)"/)?.[1] ?? 'Token bucket');
const fig = mountFigure(stage.querySelector('svg'), FIG);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');

let clock = 0;
let period = MACHINE.period;
let base = { t: -10, tokens: MACHINE.capacity };
let ticks = [];
let nextTick = period;
let arrivals = [];
let totals = { ok: 0, no: 0 };
const counted = new Set();
let touring = true;
let tourClock = 0;
let idleTimer = 0;

const lastArrival = () => (arrivals.length ? arrivals[arrivals.length - 1] : -Infinity);
function send(at = clock) {
  const t = Math.max(at + travel(), lastArrival() + 0.35);
  arrivals.push(Math.round(t * 1000) / 1000);
}
const burst = () => { for (let i = 0; i < 10; i++) send(); };
function setPeriod(p) {
  period = p;
  // монеты, уже выпущенные из бункера (до приземления < feed), оставляем; дальше — новый темп
  ticks = ticks.filter((t) => t <= clock + MACHINE.feed);
  nextTick = (ticks.length ? ticks[ticks.length - 1] : clock) + period;
  document.querySelectorAll('#rate button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.p) === p)));
}
setPeriod(MACHINE.period);

function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; tourClock = 0; }, 12000);
}
document.getElementById('send').addEventListener('click', () => { takeOver(); send(); });
document.getElementById('burst').addEventListener('click', () => { takeOver(); burst(); });
document.querySelectorAll('#rate button').forEach((b) => b.addEventListener('click', () => { takeOver(); setPeriod(Number(b.dataset.p)); }));
stage.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); takeOver(); send(); }
  if (e.code === 'KeyB') { takeOver(); burst(); }
});
stage.addEventListener('click', () => { takeOver(); send(); stage.focus(); });

// тур: ровный поток раз в 2,6 с, на 18-й секунде — всплеск, цикл 30 с
function tour(dt) {
  const before = tourClock;
  tourClock += dt;
  const hit = (x) => before < x && tourClock >= x;
  for (let x = 1; x < 16; x += 2.6) if (hit(x)) send();
  if (hit(18)) burst();
  if (tourClock > 30) tourClock = 0;
}

let frame = 0;
let last = 0;
let visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  clock += dt;
  if (touring) tour(dt);
  while (nextTick <= clock + 3) { ticks.push(Math.round(nextTick * 1000) / 1000); nextTick += period; }
  let sim = simulate({ start: base.tokens, ticks: ticks.filter((t) => t > base.t), arrivals: arrivals.filter((t) => t > base.t) });
  // счётчики — по решениям, которые уже случились
  for (const r of sim.reqs) {
    const key = `${r.t}`;
    if (r.t <= clock && !counted.has(key)) { counted.add(key); r.ok ? totals.ok++ : totals.no++; }
  }
  // раз в 10 с забываем старое: состояние ведра на момент clock − 6 становится началом
  if (clock - base.t > 16) {
    const t0 = clock - 6;
    base = { t: t0, tokens: sim.tokensAt(t0) };
    ticks = ticks.filter((t) => t > t0);
    arrivals = arrivals.filter((t) => t > t0);
    for (const k of counted) if (Number(k) <= t0) counted.delete(k);
    sim = simulate({ start: base.tokens, ticks, arrivals });
  }
  const v = view(sim, clock);
  fig.apply(v);
  const s = { tokens: sim.tokensAt(clock), ok: totals.ok, no: totals.no };
  readout.textContent = T.readout(s, period);
  document.getElementById('m-tok').textContent = `${s.tokens} / ${MACHINE.capacity}`;
  document.getElementById('m-ok').textContent = s.ok;
  document.getElementById('m-no').textContent = s.no;
  frame = visible ? requestAnimationFrame(tick) : 0;
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible && !frame) { last = 0; frame = requestAnimationFrame(tick); }
}, { rootMargin: '120px 0px' }).observe(stage);
if (still.matches) touring = false;

// ---------------------------------------------------------------- ролик
let FMT = 'h';
async function exists(url) {
  try { return (await fetch(url, { method: 'HEAD' })).ok; } catch { return false; }
}
async function video() {
  const first = 'ru';
  const suffix = `${LANG !== first ? `-${LANG}` : ''}${FMT === 'v' ? '-vertical-captions' : ''}`;
  const mp4 = `video/out/token-bucket${suffix}.mp4`;
  const poster = `video/out/poster${suffix}.jpg`;
  const hash = [LANG !== first ? LANG : '', FMT === 'v' ? 'v' : ''].filter(Boolean).join('-');
  // без пустого «#»: переход к якорю в iframe прокручивает и родительскую страницу
  const live = `video/index.html${hash ? `#${hash}` : ''}`;
  document.getElementById('live').href = live;
  document.querySelectorAll('#fmt button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === FMT)));
  const box = document.getElementById('player');
  box.classList.toggle('v', FMT === 'v');
  const vtt = `video/voice/${LANG}.vtt`;
  if (await exists(mp4)) {
    const track = FMT === 'h' && (await exists(vtt)) ? `<track kind="subtitles" srclang="${LANG}" label="${LANG.toUpperCase()}" src="${vtt}">` : '';
    box.innerHTML = `<video controls preload="metadata" playsinline poster="${poster}" src="${mp4}">${track}</video>`;
  } else {
    box.innerHTML = `<iframe src="${live}" title="Token bucket" allow="fullscreen; autoplay" loading="lazy"></iframe>`;
  }
  // главы — из того же таймлайна, что у ролика (длительности — из манифеста озвучки)
  let manifest = null;
  try { const r = await fetch(`video/voice/${LANG}.json`); if (r.ok) manifest = await r.json(); } catch { /* нет озвучки */ }
  const film = makeFilm(LANG);
  const tl = compile(film, manifest);
  const chapters = [];
  tl.scenes.forEach((s) => {
    const name = s.kicker ?? film.ui.chapters[s.id] ?? s.id;
    if (chapters.at(-1)?.name !== name) chapters.push({ name, num: s.num ?? '', start: s.start });
  });
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const list = document.getElementById('chapters');
  list.innerHTML = chapters.map((c, i) => `<li><button type="button" data-i="${i}"><span class="mono">${c.num || '·'} · ${fmt(c.start)}</span>${c.name}</button></li>`).join('');
  list.onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const c = chapters[Number(b.dataset.i)];
    const el = box.querySelector('video');
    if (el) { el.currentTime = c.start + 0.05; el.play(); } else box.querySelector('iframe').src = `video/index.html?t=${c.start.toFixed(1)}${LANG !== first ? `&lang=${LANG}` : ''}${FMT === 'v' ? '&v' : ''}`;
  };
}
document.querySelectorAll('#fmt button').forEach((b) => b.addEventListener('click', () => { FMT = b.dataset.f; video(); }));
video();
