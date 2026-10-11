/* «Почему API отвечает 429?» — ролик-объяснение token bucket (сценарий — SCENARIO.md).
 *
 * Под сценами — постоянный слой с фигурой anatomy (../figure.js): машина работает без остановок весь
 * ролик, её расписание (когда падают монеты, когда приходят запросы) строится по репликам — запросы
 * приезжают к словам, о которых говорят. Состояние машины в каждый момент — из модели ../model.js
 * (simulate → view), поэтому числа в кадре честные. Камера (video-kit/lib/figure.js) наезжает на
 * детали; сцены поверх — только заголовки, подписи-булавки, счётчики и график.
 *
 * Диалог: she — Вера (основной голос), he — Макс (voices.he в voice.config.json).
 * Тексты — text/<язык>.js, стили — scenes.css, движок — ../../../video-kit. */
import { E, css, lerp, pop, rise, seg } from '../../../video-kit/lib/motion.js';
import { camera, pinLabel, place, shown } from '../../../video-kit/lib/figure.js';
import { buildFigure, mountFigure } from '../figure.js';
import { MACHINE, simulate, ticksBetween, travel, view } from '../model.js';
import en from './text/en.js';
import ru from './text/ru.js';

export const TEXTS = { ru, en }; // первый язык — основной
export const LANGS = Object.keys(TEXTS);

const FIG = buildFigure();
const SIZE = { h: [1920, 1080], v: [1080, 1920] };
// где стоит фигура при zoom 1 (пиксели кадра)
const BOX = { h: { x: 40, y: 50, w: 1840, h: 980 }, v: { x: 30, y: 330, w: 1020, h: 760 } };

/** общее состояние кадра: слой фигуры пишет, сцены читают (слои рисуются раньше сцен) */
const G = { t: 0, pin: () => [0, 0], sim: null, marks: {} };

// ---------------------------------------------------------------- реплики
function talk(s, lines, first = {}) {
  return lines.map(([who, text], i) => s.say(text, { ...(i === 0 ? first : {}), ...(who === 'he' ? { voice: 'he' } : {}) }));
}
/** момент слова-якоря в любой из реплик сцены */
function cue(said, word, off = 0) {
  for (const a of said) if (a.text.includes(word)) return a.at(word, off);
  throw new Error(`нет «${word}» в репликах сцены`);
}

// ---------------------------------------------------------------- расписание машины по репликам
function plan(tl) {
  const S = Object.fromEntries(tl.scenes.map((s) => [s.id, s]));
  const g = (id, key) => S[id].start + S[id].q[key];
  const end = (id) => S[id].start + S[id].dur;
  const ticks = ticksBetween(0, tl.duration + 4, MACHINE.period);
  const run = (arr) => simulate({ ticks, arrivals: [...arr].sort((a, b) => a - b) });
  const arr = [];
  const every = (from, to, step) => { for (let t = from; t <= to; t += step) arr.push(Math.round(t * 100) / 100); };

  // вопрос: лёгкий поток чуть чаще пополнения — к концу запас тает
  every(1.2, end('hook') - 1.2, 1.6);
  // ведро: если к «падает» магазин почти полон — пара запросов заберёт монеты (чтобы было куда падать)
  const fall = g('refill', 'fall');
  for (let i = 0; i < 4 && run(arr).tokensAt(fall - 0.2) > 3; i++) arr.push(g('bucket', 'ask') + 0.5 * i);
  // запрос: первый доезжает, когда говорят «толкатель», дальше — каждые 2,6 с
  const req = [];
  for (let t = g('request', 'push') + 0.5; t < end('request') - 0.5; t += 2.6) req.push(Math.round(t * 100) / 100);
  // всплеск: 10 запросов через 0,35 с, сразу после монеты — за всплеск капнет ровно одна
  const want = g('burst', 'first') - 0.4;
  const B = ticks.find((t) => t >= want) + 0.05;
  const burst = Array.from({ length: 10 }, (_, i) => Math.round((B + i * 0.35) * 100) / 100);
  // к всплеску магазин полон: лишние запросы сцены «запрос» убираем с конца
  while (req.length > 1 && run([...arr, ...req, ...burst]).tokensAt(B - 0.01) < MACHINE.capacity) req.pop();
  arr.push(...req, ...burst);
  // в среднем: по запросу в секунду, 16 с
  const A = g('average', 'go');
  const N = Math.max(8, Math.min(16, Math.floor(end('average') - 1.5 - A)));
  every(A, A + N - 1, 1);
  // две ручки: пара запросов, чтобы машина жила
  arr.push(g('knobs', 'server'), g('knobs', 'server') + 2.4);
  const sim = run(arr);
  return { sim, marks: { burst: [B, B + 9 * 0.35], average: [A, A + N - 1] } };
}

// ---------------------------------------------------------------- камера по сценам
function shots(tl, v) {
  const S = Object.fromEntries(tl.scenes.map((s) => [s.id, s]));
  const g = (id, key) => S[id].start + (key ? S[id].q[key] : 0);
  const P = (h, vv) => (v ? vv : h);
  return [
    { t: 0, at: 'machine', zoom: P(1.12, 1.0), pos: P([0.6, 0.64], [0.5, 0.56]) },
    { t: g('hook', 'out') - 0.4, d: 1.6, at: 'machine', zoom: P(1.0, 1.02), pos: P([0.5, 0.52], [0.5, 0.5]) },
    { t: g('bucket') - 0.2, d: 1.6, at: 'magazine', zoom: P(2.8, 2.6), pos: P([0.62, 0.56], [0.55, 0.5]) },
    { t: g('refill') - 0.2, d: 1.6, at: 'chute', zoom: P(2.3, 2.1), pos: P([0.56, 0.52], [0.5, 0.5]) },
    { t: g('refill', 'flap') - 0.6, d: 1.4, at: 'flap', zoom: P(2.5, 2.3), pos: P([0.55, 0.5], [0.5, 0.44]) },
    { t: g('request') - 0.2, d: 1.6, at: 'gate', zoom: P(2.0, 1.9), pos: P([0.5, 0.56], [0.5, 0.5]) },
    { t: g('burst') - 0.2, d: 1.6, at: 'machine', zoom: P(1.14, 1.1), pos: P([0.5, 0.52], [0.5, 0.5]) },
    { t: g('average') - 0.2, d: 1.6, at: 'machine', zoom: P(0.9, 1.0), pos: P([0.33, 0.52], [0.5, 0.4]) },
    { t: g('knobs') - 0.2, d: 1.6, at: 'feeder', zoom: P(1.9, 1.7), pos: P([0.6, 0.55], [0.56, 0.52]) },
    { t: g('end') - 0.2, d: 2.4, at: 'machine', zoom: P(0.8, 0.86), pos: P([0.66, 0.66], [0.5, 0.42]) },
  ];
}

// ---------------------------------------------------------------- подписи-булавки
/** куда относить ярлык от точки, px: { h: [dx, dy], v: [dx, dy] } */
const SIDE = {
  magazine: { h: [-330, -40], v: [-260, -250] },
  stackTop: { h: [-300, -170], v: [210, -240] },
  dial: { h: [-280, -110], v: [-150, -170] },
  chute: { h: [-60, -200], v: [40, -230] },
  feeder: { h: [-330, 90], v: [-200, 260] },
  flap: { h: [300, -150], v: [140, -250] },
  cup: { h: [300, 120], v: [120, 260] },
  gate: { h: [-260, 240], v: [-140, 330] },
  tray: { h: [-10, 200], v: [-160, 220] },
  bin: { h: [-260, 170], v: [-120, 240] },
};
const pinHtml = (list) => list.map(([id, text]) => `<div class="pin p-${id}"><i class="dot"></i><b class="lbl">${text}</b></div>`).join('');
const linesHtml = (list, v) => `<svg class="pl" viewBox="0 0 ${SIZE[v ? 'v' : 'h'].join(' ')}">${list.map(([id]) => `<line class="l-${id}"/>`).join('')}</svg>`;
/** pins: [[id, anchor, a, b?]] — показать булавку id у якоря фигуры с a до b (секунды сцены) */
function drawPins(ctx, t, pins) {
  for (const [id, anchor, a, b] of pins) {
    pinLabel(ctx.$(`.p-${id}`), ctx.$(`.l-${id}`), G.pin(anchor), shown(t, a, b), { side: SIDE[anchor]?.[ctx.v ? 'v' : 'h'] ?? [200, -120], frame: SIZE[ctx.v ? 'v' : 'h'] });
  }
}

// ---------------------------------------------------------------- график «в среднем»
const CH = { w: 560, h: 330, T: 16, Y: 16 };
function chartHtml(T) {
  const L = T.average.chart;
  const X = (x) => 50 + (x / CH.T) * (CH.w - 70);
  const Y = (y) => CH.h - 40 - (y / CH.Y) * (CH.h - 70);
  const grid = [0, 4, 8, 12, 16].map((x) => `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(CH.Y)}"/><text x="${X(x)}" y="${Y(0) + 24}" text-anchor="middle">${x}</text>`).join('')
    + [0, 4, 8, 12, 16].map((y) => `<line x1="${X(0)}" y1="${Y(y)}" x2="${X(CH.T)}" y2="${Y(y)}"/><text x="${X(0) - 12}" y="${Y(y) + 6}" text-anchor="end">${y}</text>`).join('');
  return `<div class="chart"><div class="ch-t mono">${L.title}</div>
    <svg viewBox="0 0 ${CH.w} ${CH.h}"><g class="grid">${grid}</g>
      <path class="bound" d="M${X(0)} ${Y(5)} L${X(CH.T)} ${Y(5 + 0.5 * CH.T)}"/>
      <path class="sent" d=""/><path class="passed" d=""/>
      <text class="ax" x="${X(CH.T)}" y="${Y(0) + 48}" text-anchor="end">${L.x}</text>
      <text class="lb-bound" x="${X(CH.T) - 8}" y="${Y(5 + 0.5 * CH.T) - 12}" text-anchor="end">${L.bound}</text>
    </svg>
    <div class="ch-k"><span class="k-sent">${L.sent}</span><span class="k-passed">${L.passed}: <b class="n">0</b></span></div></div>`;
}
function drawChart(ctx, A) {
  const X = (x) => 50 + (x / CH.T) * (CH.w - 70);
  const Y = (y) => CH.h - 40 - (y / CH.Y) * (CH.h - 70);
  const now = Math.min(G.t - A + 0.5, CH.T);
  const reqs = G.sim.reqs.filter((r) => r.t >= A - 0.01 && r.t <= A + CH.T);
  const stairs = (pick) => {
    let n = 0;
    let d = `M${X(0)} ${Y(0)}`;
    for (const r of reqs) {
      const x = r.t - A + 0.5;
      if (x > now) break;
      if (!pick(r)) continue;
      d += ` L${X(x).toFixed(1)} ${Y(n).toFixed(1)} L${X(x).toFixed(1)} ${Y(++n).toFixed(1)}`;
    }
    if (now > 0) d += ` L${X(now).toFixed(1)} ${Y(n).toFixed(1)}`;
    return { d, n };
  };
  const sent = stairs(() => true);
  const passed = stairs((r) => r.ok);
  ctx.$('.chart .sent').setAttribute('d', sent.d);
  ctx.$('.chart .passed').setAttribute('d', passed.d);
  ctx.$('.chart .n').textContent = String(passed.n);
}

// ---------------------------------------------------------------- фильм
export default function makeFilm(lang = LANGS[0]) {
  const T = TEXTS[lang];
  if (!T) throw new Error(`нет текстов для языка «${lang}» (есть: ${LANGS.join(', ')})`);
  let fig = null;
  let planned = null;
  let cam = null;

  return {
    lang,
    title: T.ui.title,
    ui: T.ui,
    poster: 4,
    speakers: [
      { voice: '', name: T.speakers.she.name, role: T.speakers.she.role },
      { voice: 'he', name: T.speakers.he.name, role: T.speakers.he.role },
    ],

    // ---------------------------------------------------------------- машина: постоянный слой
    layers: [{
      id: 'machine',
      html: () => `<div class="fig iso" data-theme="light">${FIG.svg}</div>`,
      draw(t, tl, ctx) {
        if (!fig) fig = mountFigure(ctx.$('.fig svg'), FIG);
        if (!planned) { planned = plan(tl); G.sim = planned.sim; G.marks = planned.marks; }
        if (!cam) cam = camera(shots(tl, ctx.v), FIG.anchors);
        G.t = t;
        fig.apply(view(planned.sim, t));
        const box = BOX[ctx.v ? 'v' : 'h'];
        G.pin = place(ctx.$('.fig'), FIG, box, cam(t)).pin;
      },
    }],

    scenes: [
      // ---------------------------------------------------------------- вопрос
      {
        id: 'hook', mood: 'calm',
        build(s) {
          s.sfx(0.3, 'chime');
          const said = talk(s, T.hook.say, { at: s.p(1.2) });
          const code = cue(said, T.hook.cue[0]);
          s.sfx(code, 'pop', 2);
          s.hold(said.at(-1).t1 + s.p(0.8));
          return { by: said[0].t0, code, out: cue(said, T.hook.cue[1]) };
        },
        html: () => `
          <div class="ttl"><div class="eyebrow mono">${T.hook.eyebrow}</div><h1>${T.hook.h1}</h1>
          <div class="code-chip mono">${T.hook.code}</div></div>`,
        draw(t, q, { $ }) {
          const out = q.out + 0.2;
          rise($('.ttl .eyebrow'), t, 0.2, { dy: 20, out });
          rise($('.ttl h1'), t, 0.4, { dy: 50, d: 0.9, out });
          pop($('.code-chip'), t, q.code, { s0: 0.8, out });
        },
      },

      // ---------------------------------------------------------------- 01 ведро
      {
        id: 'bucket', kicker: T.bucket.kicker, num: '01', mood: 'calm',
        build(s) {
          const said = talk(s, T.bucket.say, { at: s.p(1.4) });
          const mag = cue(said, T.bucket.cue[0]);
          const cap = cue(said, T.bucket.cue[1]);
          s.sfx(mag, 'pop', 0);
          s.sfx(cap, 'pop', 2);
          s.hold(said.at(-1).t1 + s.p(0.7));
          return { mag, cap, ask: said[1].t0 };
        },
        html: ({ v }) => {
          const P = [['magazine', T.bucket.pins.magazine], ['stackTop', T.bucket.pins.stackTop]];
          return linesHtml(P, v) + pinHtml(P);
        },
        draw(t, q, ctx) {
          drawPins(ctx, t, [['magazine', 'magazine', q.mag], ['stackTop', 'stackTop', q.cap]]);
        },
      },

      // ---------------------------------------------------------------- 02 пополнение
      {
        id: 'refill', kicker: T.refill.kicker, num: '02', mood: 'calm',
        build(s) {
          const said = talk(s, T.refill.say, { at: s.p(0.6) });
          const [clock, fall, rate, flap, cupT] = T.refill.cue.map((w) => cue(said, w));
          [clock, fall, rate, flap, cupT].forEach((x, i) => s.sfx(x, 'tick', i));
          s.hold(said.at(-1).t1 + s.p(0.8));
          return { clock, fall, rate, flap, cup: cupT };
        },
        html: ({ v }) => {
          const L = T.refill.pins;
          const P = [['dial', L.dial], ['chute', L.chute], ['feeder', L.rate], ['flap', L.flap], ['cup', L.cup]];
          return linesHtml(P, v) + pinHtml(P);
        },
        draw(t, q, ctx) {
          const away = q.flap - 0.9;
          drawPins(ctx, t, [['dial', 'dial', q.clock, away], ['chute', 'chute', q.fall, away], ['feeder', 'feeder', q.rate, away], ['flap', 'flap', q.flap], ['cup', 'cup', q.cup]]);
        },
      },

      // ---------------------------------------------------------------- 03 запрос
      {
        id: 'request', kicker: T.request.kicker, num: '03', mood: 'drive',
        build(s) {
          const said = talk(s, T.request.say, { at: s.p(0.6) });
          const [, push, ok, one] = T.request.cue.map((w) => cue(said, w));
          s.sfx(push, 'pop', 1);
          s.sfx(ok, 'pop', 4);
          s.hold(said.at(-1).t1 + s.p(1.0));
          return { push, ok, one };
        },
        html: ({ v }) => {
          const P = [['gate', T.request.pins.gate], ['tray', T.request.pins.tray]];
          return linesHtml(P, v) + pinHtml(P);
        },
        draw(t, q, ctx) {
          drawPins(ctx, t, [['gate', 'gate', q.push + 0.4], ['tray', 'tray', q.ok]]);
        },
      },

      // ---------------------------------------------------------------- 04 всплеск
      {
        id: 'burst', kicker: T.burst.kicker, num: '04', mood: 'drive',
        build(s) {
          const said = talk(s, T.burst.say, { at: s.p(0.5) });
          const [ten, first, , short, code] = T.burst.cue.map((w) => cue(said, w));
          s.sfx(ten, 'riser', 1.2);
          s.sfx(short, 'strike');
          s.hold(said.at(-1).t1 + s.p(1.6));
          return { ten, first, short, code, sum: said.at(-1).t1 };
        },
        html: ({ v }) => {
          const P = [['bin', T.burst.pins.bin]];
          return `${linesHtml(P, v)}${pinHtml(P)}
            <div class="count"><div class="c-ok"><b>0</b><span>${T.burst.count.ok} · 200</span></div><div class="c-no"><b>0</b><span>${T.burst.count.no} · 429</span></div>
            <div class="c-sum mono">${T.burst.sum}</div></div>`;
        },
        draw(t, q, ctx) {
          drawPins(ctx, t, [['bin', 'bin', q.code]]);
          const [B0, B1] = G.marks.burst;
          let ok = 0;
          let no = 0;
          for (const r of G.sim.reqs) if (r.t >= B0 - 0.01 && r.t <= B1 + 0.01 && r.t <= G.t) (r.ok ? ok++ : no++);
          ctx.$('.c-ok b').textContent = ok;
          ctx.$('.c-no b').textContent = no;
          rise(ctx.$('.count'), t, q.first - 0.3, { dy: 30 });
          rise(ctx.$('.c-sum'), t, q.sum, { dy: 16 });
        },
      },

      // ---------------------------------------------------------------- 05 в среднем
      {
        id: 'average', kicker: T.average.kicker, num: '05', mood: 'drive',
        build(s) {
          const said = talk(s, T.average.say, { at: s.p(0.5) });
          const [go, , dry, sum, formula] = T.average.cue.map((w) => cue(said, w));
          s.sfx(formula, 'impact');
          s.hold(Math.max(said.at(-1).t1 + s.p(1.4), said[1].t0 + 17.5));
          return { go: said[1].t0, ask: go, dry, sum, formula };
        },
        html: () => `${chartHtml(T)}<div class="formula">${T.average.formula}</div>`,
        draw(t, q, ctx) {
          rise(ctx.$('.chart'), t, q.go - 0.6, { dy: 30 });
          drawChart(ctx, G.marks.average[0]);
          pop(ctx.$('.formula'), t, q.formula, { s0: 0.85 });
        },
      },

      // ---------------------------------------------------------------- 06 две ручки
      {
        id: 'knobs', kicker: T.knobs.kicker, num: '06', mood: 'calm',
        build(s) {
          const said = talk(s, T.knobs.say, { at: s.p(0.5) });
          const [cap, rate, server, retry] = T.knobs.cue.map((w) => cue(said, w));
          s.sfx(cap, 'pop', 0);
          s.sfx(rate, 'pop', 3);
          s.sfx(retry, 'pop', 5);
          s.hold(said.at(-1).t1 + s.p(1.0));
          return { cap, rate, server, retry };
        },
        html: ({ v }) => {
          const P = [['stackTop', T.knobs.pins.stackTop], ['dial', T.knobs.pins.dial]];
          return `${linesHtml(P, v)}${pinHtml(P)}<div class="code">${T.knobs.code.map((l, i) => `<div class="ln l${i}">${l}</div>`).join('')}</div>`;
        },
        draw(t, q, ctx) {
          drawPins(ctx, t, [['stackTop', 'stackTop', q.cap], ['dial', 'dial', q.rate]]);
          rise(ctx.$('.code'), t, q.retry - 1.0, { dy: 24 });
          rise(ctx.$('.code .l0'), t, q.retry - 0.8, { dy: 20 });
          rise(ctx.$('.code .l1'), t, q.retry, { dy: 20 });
        },
      },

      // ---------------------------------------------------------------- финал
      {
        id: 'end', mood: 'end',
        build(s) {
          const said = talk(s, T.end.say, { at: s.p(0.6) });
          s.sfx(said[0].t1 + 0.4, 'chime');
          s.hold(said[0].t1 + s.p(4.2));
          return { lines: said[0].t1 - 0.4, cta: said[0].t1 + 1.2 };
        },
        html: () => `<div class="fin"><h1>${T.end.h1}</h1>${T.end.lines.map((l) => `<p class="ln">${l}</p>`).join('')}<div class="cta mono">${T.end.cta}</div></div>`,
        draw(t, q, { $, $$ }) {
          rise($('.fin h1'), t, 0.5, { dy: 50, d: 0.9 });
          $$('.fin .ln').forEach((el, i) => rise(el, t, q.lines + i * 0.35, { dy: 24 }));
          const k = E.out(seg(t, q.cta, q.cta + 0.6));
          css($('.fin .cta'), { o: k, y: (1 - k) * 14 });
        },
      },
    ],
  };
}

// для отладки в Node: node -e "import('./film.js').then(m => m.debug('ru'))"
export async function debug(lang = 'ru') {
  const { compile } = await import('../../../video-kit/lib/timeline.js');
  const tl = compile(makeFilm(lang));
  const { sim, marks } = plan(tl);
  console.log('длительность', tl.duration.toFixed(1), 'сцены', tl.scenes.map((s) => `${s.id}@${s.start.toFixed(1)}`).join(' '));
  console.log('отметки', JSON.stringify(marks), 'карточка едет', travel().toFixed(2), 'с');
  console.log(sim.reqs.map((r) => `${r.t.toFixed(1)}${r.ok ? '✓' : '✗'}`).join(' '));
  for (const s of tl.scenes) console.log(s.id.padEnd(8), 'жетонов в начале:', sim.tokensAt(s.start), ' q:', JSON.stringify(Object.fromEntries(Object.entries(s.q).map(([k, x]) => [k, Math.round(x * 10) / 10]))));
  console.log('всплеск:', JSON.stringify(sim.reqs.filter((r) => r.t >= marks.burst[0] - 0.01 && r.t <= marks.burst[1] + 0.01).map((r) => r.ok)));
  return lerp(0, 0, 0);
}
