/* Лендинг «Why does an API answer 429?»: живая машина (figure.js + model.js), ролик и язык.
 * Страница собрана explainers/build.mjs из landing/index.html и landing/i18n/<code>.mjs: тексты уже
 * в HTML, строки для скрипта — в <script type="application/json" id="i18n">. Один скрипт на все языки.
 *
 * Машина — та же модель, что в ролике, но с живым расписанием: «запрос» ставит карточку на ленту,
 * «всплеск» — десять подряд, переключатель — период пополнения. Пока никто не трогает, идёт тур:
 * ровный поток и иногда всплеск. */
import { buildFigure, mountFigure } from './figure.js';
import { MACHINE, simulate, travel, view } from './model.js';
import { suggestLanguage } from '../suggest.js';
import { videoSection } from '../video.js';

const T = JSON.parse(document.getElementById('i18n')?.textContent || '{}');
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);

// ---------------------------------------------------------------- язык: запомнить выбор, плашка «есть на …»
suggestLanguage();

// ---------------------------------------------------------------- живая машина
const FIG = buildFigure({ label: T.figLabel });
const stage = document.querySelector('.iso-stage');
stage.innerHTML = FIG.svg;
stage.setAttribute('aria-label', T.figLabel ?? 'Token bucket');
const fig = mountFigure(stage.querySelector('svg'), FIG);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');

let clock = 0;
let period = MACHINE.period;
let base = { t: -10, tokens: MACHINE.capacity };
let ticks = [];
let nextTick = period;
let arrivals = [];
const totals = { ok: 0, no: 0 };
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
  fig.apply(view(sim, clock));
  const s = { tokens: sim.tokensAt(clock), ok: totals.ok, no: totals.no, p: period };
  if (T.readout) readout.textContent = fill(T.readout, s);
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

// ---------------------------------------------------------------- ролик: 16:9 / 9:16 и главы
videoSection();
