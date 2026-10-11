/* Фигура «Token bucket» на ките anatomy (../../anatomy/kit/iso-kit.mjs): машина, чья работа и есть
 * алгоритм. Магазин на 5 монет — ведро (ёмкость b); бункер с часами роняет монету каждые 2 с —
 * пополнение (скорость r); когда магазин полон, верхняя монета закрывает заслонку, и лишняя монета
 * катится мимо в стакан переполнения. По ленте едут запросы: у магазина толкатель кладёт на карточку
 * нижнюю монету (пропущен → лоток «200»), а если монет нет — толкатель сбоку сбрасывает карточку
 * в лоток «429». Все числа и движения — из model.js.
 *
 * buildFigure() → { svg, P, W, H, anchors } — строка SVG (статичное + пустые слои движущихся деталей);
 * mountFigure(svgEl, fig) → { apply(view) } — расставить детали по view(sim, t) из model.js.
 * Модуль работает и в браузере, и в Node (без DOM при сборке). */
import * as k from '../../anatomy/kit/iso-kit.mjs';
import { BASE_Z, CARD_H, CARD_Z, CHUTE_Z, COIN, MACHINE } from './model.js';

export const W = 640;
export const H = 400;
const AZ = 58;

// ---------------------------------------------------------------- план мира (ед. ≈ мм машины)
const PLATE = { x: -128, y: -46, w: 270, d: 120, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const MAG = [0, -16]; // ось магазина
const COIN_R = 6;
const POST_R = 11; // радиус расстановки стоек магазина
const POST_TOP = 40;
const BASE = { x: -13, y: -29, w: 26, d: 26, r: 2 }; // основание магазина, верх — BASE_Z
const HOPPER = { x: -76, y: -31, w: 30, d: 30, r: 3 };
const HOPPER_Z = [34, 58];
const DIAL = [-61, -16];
const DIAL_R = 10;
const DIAL_TOP = HOPPER_Z[1] + 2.5;
const CHUTE = { from: -46, gap: 7.5, to: 11, y0: -23.5, y1: -8.5, z: CHUTE_Z - 1.5 };
const CUP = [24, -16];
const CUP_R = 7;
const CUP_H = 13;
const KICK = { x: 22, y: -6, w: 16, d: 8, r: 1.5 };
const KICK_TOP = 17;
const LAMP = [34, -2];
const RAIL_X = [-112, 96];
const BELT = { x: -110, y: 6, w: 204, d: 24, r: 4 };
const BELT_TOP = CARD_Z;
const BIN = { x: 10, y: 38, w: 52, d: 28 };
const TRAY = { x: 99, y: 4, w: 32, d: 28 };
const WALL = 1.5;
const BOX_H = 10;

export function buildFigure({ label } = {}) {
  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [DIAL[0], DIAL[1], DIAL_TOP + 2], [LAMP[0], LAMP[1], KICK_TOP + 8]],
    W, H, { pad: 26, azimuth: AZ },
  );
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const slab = (plan, z, h, style = {}, steps = 4, bevel = 0) => S(k.slabOf({ r: 0, ...plan }, z, h, P, steps, bevel), style);
  const cyl = (x, y, r, z, h, style = {}, steps = 28, bevel = 0) => S(k.cylinder(x, y, r, z, h, P, steps, bevel), style);
  const depth = ([x, y]) => k.depthOf([x, y, 0], P);
  const byDepth = (pts) => [...pts].sort((a, b) => depth(a) - depth(b));

  // ---------------------------------------------------------------- основание
  function plate() {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(cyl(x, y, 7, -PLATE_H - FOOT_H, 1.6, { tone: 'lo' }));
      out.push(cyl(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: 'mid' }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: 'mid' }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
    const screws = k.corners(PLATE, 10);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }));
    out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    // линейка вдоль переднего края
    const strip = { x: -96, y: PLATE.y + PLATE.d - 14, w: 100, d: 6, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
    const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.4], P);
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
    out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
    // табличка
    const label = { x: -116, y: PLATE.y + PLATE.d - 30, w: 34, d: 18, r: 1.5 };
    out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: 'mid' }));
    out.push(k.faceTextSvg(k.topMatrix([label.x + 3.5, label.y + 6.5], 0.8, P, 'x'), 'TOKEN BUCKET', { size: 2.6, tone: 'mid' }));
    out.push(L([10.5, 13.5].map((y) => k.lineOnTop([label.x + 3.5, label.y + y], [label.x + (y > 12 ? 20 : 26), label.y + y], 0.8, P)).join(''), { tone: 'faint', free: true }));
    out.push(D(k.corners(label, 1.6).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
    return out.join('');
  }

  // ---------------------------------------------------------------- бункер с часами: пополнение
  function feeder() {
    const out = [];
    const [x, y] = DIAL;
    out.push(cyl(x, y, 7, 0, 2, { tone: 'mid' }, 28, 0.4));
    out.push(D(byDepth([[x - 5, y], [x + 5, y], [x, y - 5], [x, y + 5]]).map(([a, b]) => at([a, b, 2])), { size: 0.4, tone: 'lo' }));
    out.push(cyl(x, y, 4.2, 2, HOPPER_Z[0] - 2, { tone: 'mid', crease: 'none' }));
    out.push(L([12, 24].map((z) => k.sideArc(x, y, 4.2, z, P, 16)).join(''), { tone: 'faint' }));
    out.push(cyl(x, y, 6, HOPPER_Z[0] - 3, 3, { tone: 'mid' }));
    out.push(S(k.slabOf(HOPPER, HOPPER_Z[0], HOPPER_Z[1] - HOPPER_Z[0], P, 4, 0.8), { tone: 'mid' }));
    out.push(L(k.sideSeam(HOPPER, HOPPER_Z[0] + 6, P, 4), { tone: 'faint' }));
    out.push(L(k.planOutline(k.insetPlan(HOPPER, 2.5), HOPPER_Z[1], P, 4), { tone: 'faint' }));
    out.push(D(k.corners(HOPPER, 3).map(([a, b]) => at([a, b, HOPPER_Z[1]])), { size: 0.45 }));
    // устье жёлоба на правой грани
    out.push(L(k.pathOf([[CHUTE.from, CHUTE.y0 + 1, HOPPER_Z[0] + 5], [CHUTE.from, CHUTE.y1 - 1, HOPPER_Z[0] + 5], [CHUTE.from, CHUTE.y1 - 1, HOPPER_Z[0] + 13], [CHUTE.from, CHUTE.y0 + 1, HOPPER_Z[0] + 13]].map(at), true), { tone: 'lo' }));
    // табличка скорости на передней грани
    const fy = HOPPER.y + HOPPER.d;
    out.push(k.faceTextSvg(k.sideMatrix([HOPPER.x + 5, fy, HOPPER_Z[1] - 8], 0, P, 'left'), 'r = 1 / 2 s', { size: 3, tone: 'mid' }));
    out.push(L([12, 15].map((dz) => k.segment([HOPPER.x + 5, fy, HOPPER_Z[1] - dz], [HOPPER.x + (dz > 13 ? 14 : 20), fy, HOPPER_Z[1] - dz], P)).join(''), { tone: 'faint', free: true }));
    // ручка темпа
    const kn = [HOPPER.x + HOPPER.w - 6, fy + 2.2];
    out.push(S(k.slabOf({ x: kn[0] - 1.4, y: fy, w: 2.8, d: 2.4, r: 0.6 }, HOPPER_Z[0] + 8, 3, P, 2), { tone: 'mid', crease: 'none' }));
    // часы на крышке
    out.push(cyl(x, y, DIAL_R + 1.5, HOPPER_Z[1], 1, { tone: 'mid' }, 48));
    out.push(cyl(x, y, DIAL_R, HOPPER_Z[1] + 1, 1.5, { tone: 'hi', crease: 'lo' }, 48, 0.4));
    out.push(L(k.knurl(x, y, DIAL_R, HOPPER_Z[1] + 1, DIAL_TOP, 60, P, 0.25), { tone: 'lo' }));
    out.push(L(k.ring(x, y, DIAL_R - 1.6, DIAL_TOP, P, 48), { tone: 'lo' }));
    const ticks = k.radialTicks(x, y, DIAL_R - 2.2, 20, 5, DIAL_TOP, [1, 2.2], P);
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
    out.push(L(k.ring(x, y, 1.2, DIAL_TOP, P, 12), { tone: 'mid' }));
    return out.join('');
  }
  const handAt = (turn) => {
    const a = turn * Math.PI * 2;
    const [x, y] = DIAL;
    return k.lineOnTop([x - Math.sin(a) * 2.4, y + Math.cos(a) * 2.4], [x + Math.sin(a) * (DIAL_R - 3), y - Math.cos(a) * (DIAL_R - 3)], DIAL_TOP + 0.2, P);
  };

  // ---------------------------------------------------------------- магазин: ведро на 5 монет
  const postAngles = [45, 135, 225, 315].map((a) => (a * Math.PI) / 180);
  const posts = postAngles.map((a) => [MAG[0] + POST_R * Math.cos(a), MAG[1] + POST_R * Math.sin(a)]);
  const [vx, vy] = k.towardViewer(P);
  const facing = (p) => (p[0] - MAG[0]) * vx + (p[1] - MAG[1]) * vy;
  const front = posts.filter((p) => facing(p) > 4);
  const back = byDepth(posts.filter((p) => facing(p) <= 4));
  const post = ([x, y]) => cyl(x, y, 1.1, BASE_Z, POST_TOP - BASE_Z, { tone: 'mid', crease: 'none' }, 16);
  function magazineBase() {
    const out = [];
    out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BASE, 2), 0, 1, P)}" style="filter:blur(4px)"/>`);
    // направляющая толкателя сзади
    out.push(slab({ x: -5, y: -38, w: 10, d: 9 }, 0, 14, { tone: 'mid' }, 3, 0.4));
    out.push(L(k.lineOnTop([-3, -36], [-3, -31], 14, P) + k.lineOnTop([3, -36], [3, -31], 14, P), { tone: 'faint' }));
    out.push(S(k.slabOf(BASE, 0, BASE_Z, P, 4, 0.8), { tone: 'mid' }));
    out.push(L(k.sideSeam(BASE, 5, P, 4), { tone: 'faint' }));
    out.push(L(k.ring(MAG[0], MAG[1], COIN_R + 1.4, BASE_Z, P, 36), { tone: 'lo' }));
    out.push(D(k.corners(BASE, 2.6).map(([x, y]) => at([x, y, BASE_Z])), { size: 0.45 }));
    return out.join('');
  }
  const pusherSvg = () => [
    slab({ x: -2.6, y: -36, w: 5.2, d: 8 }, BASE_Z, 3, { tone: 'mid' }, 2, 0.3),
    slab({ x: -3.4, y: -38.5, w: 6.8, d: 2.5 }, BASE_Z - 0.5, 4, { tone: 'mid' }, 2, 0.3),
  ].join('');
  function magazineFront() {
    const out = [];
    out.push(...front.map(post));
    for (const [x, y] of posts) out.push(cyl(x, y, 1.6, POST_TOP - 1.2, 1.2, { tone: 'mid' }, 16));
    out.push(L(k.ring(MAG[0], MAG[1], POST_R, POST_TOP, P, 48), { tone: 'lo' }));
    // язычок от магазина к ленте
    out.push(slab({ x: -6.5, y: BASE.y + BASE.d, w: 13, d: 5 }, BASE_Z - 1.2, 1.2, { tone: 'mid' }, 2, 0.2));
    // риски уровня на правой задней стойке: 5 монет — ёмкость b
    const [px, py] = posts.reduce((a, p) => (p[0] - p[1] > a[0] - a[1] ? p : a));
    const marks = [];
    for (let i = 1; i <= 5; i++) marks.push(k.segment([px + 1.1, py, BASE_Z + i * COIN], [px + (i === 5 ? 5 : 3), py, BASE_Z + i * COIN], P));
    out.push(L(marks.slice(0, 4).join(''), { tone: 'mid', free: true }), L(marks[4], { tone: 'hi', free: true }));
    out.push(k.faceTextSvg(k.sideMatrix([px + 2, py, BASE_Z + 5 * COIN + 1.2], 0, P, 'left'), 'b', { size: 2.8, tone: 'hi' }));
    return out.join('');
  }

  // ---------------------------------------------------------------- жёлоб с заслонкой
  const lip = (y) => ({ x: CHUTE.from, y, w: CHUTE.to - CHUTE.from, d: 1 });
  function chuteBack() {
    const out = [];
    out.push(slab({ x: CHUTE.from, y: CHUTE.y0, w: -CHUTE.gap - CHUTE.from, d: CHUTE.y1 - CHUTE.y0 }, CHUTE.z, 1.5, { tone: 'mid' }, 2, 0.2));
    out.push(slab(lip(CHUTE.y0), CHUTE.z, 3.2, { tone: 'mid', crease: 'none' }, 2));
    return out.join('');
  }
  const flapSvg = () => [
    slab({ x: -CHUTE.gap, y: CHUTE.y0 + 1, w: CHUTE.gap * 2, d: CHUTE.y1 - CHUTE.y0 - 2 }, CHUTE.z + 0.2, 1.3, { tone: 'hi', crease: 'lo' }, 2, 0.2),
    L(k.lineOnTop([CHUTE.gap - 2, CHUTE.y0 + 3], [CHUTE.gap - 2, CHUTE.y1 - 3], CHUTE.z + 1.5, P), { tone: 'lo' }),
  ].join('');
  function chuteFront() {
    const out = [slab(lip(CHUTE.y1 - 1), CHUTE.z, 3.2, { tone: 'mid', crease: 'none' }, 2)];
    out.push(D([-30, -16].map((x) => at([x, CHUTE.y1 - 0.5, CHUTE.z + 3.2])), { size: 0.4 }));
    return out.join('');
  }

  // ---------------------------------------------------------------- стакан переполнения
  function cup() {
    const [x, y] = CUP;
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - CUP_R, y: y - CUP_R, w: CUP_R * 2, d: CUP_R * 2, r: CUP_R }, 0, 1, P)}" style="filter:blur(3px)"/>`];
    out.push(cyl(x, y, CUP_R, 0, CUP_H, { tone: 'mid' }, 36, 0.5));
    out.push(`<path class="iso-shade" data-shade="0" d="${k.ring(x, y, CUP_R - 1.1, CUP_H, P, 36)}"/>`);
    out.push(L(k.ring(x, y, CUP_R - 1.1, CUP_H, P, 36), { tone: 'lo' }));
    out.push(L(k.sideArc(x, y, CUP_R, 4, P, 20), { tone: 'faint' }));
    return out.join('');
  }

  // ---------------------------------------------------------------- толкатель отказов и лампа
  function kicker() {
    const out = [slab(KICK, 0, KICK_TOP, { tone: 'mid' }, 4, 0.6)];
    out.push(L(k.sideSeam(KICK, 4, P, 4), { tone: 'faint' }));
    out.push(D([[KICK.x + 2.5, KICK.y + 2], [KICK.x + KICK.w - 2.5, KICK.y + 2]].map(([a, b]) => at([a, b, KICK_TOP])), { size: 0.4 }));
    const [x, y] = LAMP;
    out.push(cyl(x, y, 3.4, KICK_TOP, 4, { tone: 'mid' }, 24, 0.3));
    out.push(`<g data-l="lens">${cyl(x, y, 2.8, KICK_TOP + 4, 1.8, { tone: 'hi', crease: 'lo' }, 24, 0.3)}</g>`);
    return out.join('');
  }
  const paddleSvg = () => [
    slab({ x: 24, y: 3, w: 12, d: 2.5 }, 15, 6, { tone: 'hi', crease: 'lo' }, 2, 0.3),
    D([at([26.5, 5.5, 18]), at([33.5, 5.5, 18])], { size: 0.4 }),
  ].join('');
  const rodAt = (len) => (len > 0.3 ? slab({ x: 29, y: 2 - 0.01, w: 2, d: len + 1 }, 16.5, 2, { tone: 'mid', crease: 'none' }, 2) : '');

  // ---------------------------------------------------------------- лента
  function beltBack() {
    const out = [];
    for (const x of [-102, -36, 46, 86]) out.push(slab({ x: x - 3, y: 1, w: 6, d: 34 }, 0, 3, { tone: 'mid' }, 2, 0.3));
    out.push(slab({ x: RAIL_X[0], y: 2, w: RAIL_X[1] - RAIL_X[0], d: 4 }, 3, 11, { tone: 'mid' }, 2, 0.4));
    out.push(D([-106, -36, 46, 90].map((x) => at([x, 4, 14])), { size: 0.4 }));
    out.push(S(k.slabOf(BELT, BELT_TOP - 4, 4, P, 6, 0.3), { tone: 'mid' }));
    return out.join('');
  }
  const cleatsAt = (phase) => {
    const out = [];
    for (let x = BELT.x + 4 + phase; x < BELT.x + BELT.w - 4; x += 12) out.push(k.lineOnTop([x, BELT.y + 1.5], [x, BELT.y + BELT.d - 1.5], BELT_TOP, P));
    return out.join('');
  };
  function beltFront() {
    const out = [slab({ x: RAIL_X[0], y: 30, w: RAIL_X[1] - RAIL_X[0], d: 4 }, 3, 11, { tone: 'mid' }, 2, 0.4)];
    out.push(L(k.sideSeam({ x: RAIL_X[0], y: 30, w: RAIL_X[1] - RAIL_X[0], d: 4, r: 0 }, 7, P, 2), { tone: 'faint' }));
    for (const x of [RAIL_X[0] + 6, RAIL_X[1] - 6]) {
      out.push(L(k.sideRing([x, 34, 8.5], 3, 'y', P, 20), { tone: 'lo' }));
      out.push(D([at([x, 34, 8.5])], { size: 0.55, tone: 'hi' }));
    }
    return out.join('');
  }

  // ---------------------------------------------------------------- лотки: 429 и 200
  const walls = (box) => ({
    back: slab({ x: box.x, y: box.y, w: box.w, d: WALL }, 0, BOX_H, { tone: 'mid' }, 2, 0.2),
    left: slab({ x: box.x, y: box.y, w: WALL, d: box.d }, 0, BOX_H, { tone: 'mid' }, 2, 0.2),
    right: slab({ x: box.x + box.w - WALL, y: box.y, w: WALL, d: box.d }, 0, BOX_H, { tone: 'mid' }, 2, 0.2),
    front: slab({ x: box.x, y: box.y + box.d - WALL, w: box.w, d: WALL }, 0, BOX_H, { tone: 'mid' }, 2, 0.2),
  });
  function boxBack(box) {
    const w = walls(box);
    return [`<path class="iso-halo" d="${k.haloOf({ r: 0, ...box }, 0, 1, P)}" style="filter:blur(4px)"/>`, slab(box, 0, 1.6, { tone: 'lo' }, 2), w.back, w.left].join('');
  }
  function boxFront(box, code) {
    const w = walls(box);
    const fy = box.y + box.d;
    return [w.right, w.front, k.faceTextSvg(k.sideMatrix([box.x + 4, fy, 6.2], 0, P, 'left'), code, { size: 3.4, tone: 'hi' }),
      L(k.segment([box.x + 14, fy, 4.6], [box.x + box.w - 4, fy, 4.6], P), { tone: 'faint', free: true })].join('');
  }

  // ---------------------------------------------------------------- подвижные детали: монета, карточка
  const coinSvg = [
    S(k.cylinder(0, 0, COIN_R, 0, COIN - 0.3, P, 32, 0.4), { tone: 'hi', lit: true }),
    L(k.ring(0, 0, COIN_R - 1.5, COIN - 0.3, P, 32), { tone: 'lo' }),
    D([at([0, 0, COIN - 0.3])], { size: 0.5, tone: 'hi' }),
  ].join('');
  const CARD = { x: -9, y: -10, w: 18, d: 20, r: 1.5 };
  const cardBase = S(k.slabOf(CARD, 0, CARD_H, P, 3, 0.4), { tone: 'mid' });
  const rules = (tone) => L([-7.4, -5].map((y) => k.lineOnTop([-6.5, y], [y > -6 ? 0 : 5, y], CARD_H, P)).join(''), { tone, free: true });
  const cardSvg = {
    wait: cardBase + rules('lo') + L(k.ring(0, 3.5, COIN_R, CARD_H, P, 28), { tone: 'lo', dotted: true }),
    ok: cardBase + rules('lo'),
    no: cardBase + rules('red') + L(k.lineOnTop([-3, 0.5], [3, 6.5], CARD_H, P) + k.lineOnTop([3, 0.5], [-3, 6.5], CARD_H, P), { tone: 'red' }),
  };

  const svg = k.figureSvg({
    width: W, height: H,
    label: label ?? 'Машина token bucket: магазин на пять монет, бункер с часами роняет монету каждые 2 секунды, лента везёт запросы. Запрос, получивший монету, уходит в лоток 200; запрос без монеты толкатель сбрасывает в лоток 429.',
    body: [
      plate(),
      feeder(),
      `<path data-l="hand" class="iso-line" data-tone="lit" data-free="start" d="${handAt(0)}" style="stroke-width:1.1"/>`,
      magazineBase(),
      `<g data-l="pusher">${pusherSvg()}</g>`,
      ...back.map(post),
      '<g data-l="stack"></g>',
      magazineFront(),
      `<g data-l="flap">${flapSvg()}</g>`,
      chuteBack(),
      '<g data-l="chute"></g>',
      chuteFront(),
      cup(),
      '<g data-l="cup"></g>',
      kicker(),
      '<g data-l="glow"></g>',
      beltBack(),
      `<path data-l="cleats" class="iso-line" data-tone="lo" d="${cleatsAt(0)}"/>`,
      '<g data-l="rod"></g>',
      `<g data-l="paddle">${paddleSvg()}</g>`,
      '<g data-l="belt"></g>',
      beltFront(),
      boxBack(BIN), '<g data-l="bin"></g>', boxFront(BIN, '429'),
      boxBack(TRAY), '<g data-l="tray"></g>', boxFront(TRAY, '200'),
    ],
  });

  // точки для камеры и подписей ролика (координаты viewBox)
  const anchors = Object.fromEntries(Object.entries({
    machine: [-10, 10, 20],
    feeder: [DIAL[0], DIAL[1], HOPPER_Z[0] + 14],
    dial: [DIAL[0], DIAL[1], DIAL_TOP],
    chute: [-26, -16, CHUTE_Z + 2],
    magazine: [MAG[0], MAG[1], BASE_Z + 10],
    stackTop: [MAG[0], MAG[1], BASE_Z + 5 * COIN],
    flap: [0, -16, CHUTE_Z + 1],
    cup: [CUP[0], CUP[1], CUP_H],
    gate: [0, 18, CARD_Z + CARD_H],
    belt: [-70, 18, BELT_TOP],
    beltStart: [-104, 18, BELT_TOP],
    kicker: [30, 0, KICK_TOP],
    lamp: [LAMP[0], LAMP[1], KICK_TOP + 6],
    bin: [BIN.x + BIN.w / 2, BIN.y + BIN.d / 2, BOX_H],
    tray: [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, BOX_H],
  }).map(([name, p]) => [name, at(p)]));

  return {
    svg, P, W, H, anchors,
    parts: { coinSvg, cardSvg, handAt, cleatsAt, rodAt, lensTop: k.cylinder(LAMP[0], LAMP[1], 2.8, KICK_TOP + 4, 1.8, P, 24).top },
  };
}

/** Навесить движение на вставленный в страницу <svg> фигуры. */
export function mountFigure(svgEl, fig) {
  const { P, parts } = fig;
  const $ = (name) => svgEl.querySelector(`[data-l="${name}"]`);
  const L = Object.fromEntries(['hand', 'pusher', 'stack', 'flap', 'chute', 'cup', 'glow', 'cleats', 'rod', 'paddle', 'belt', 'bin', 'tray'].map((n) => [n, $(n)]));
  const tr = (p) => k.translateAlong(P, p);
  const cache = new Map();
  const set = (el, html) => { if (cache.get(el) !== html) { cache.set(el, html); el.innerHTML = html; } };
  const attr = (el, name, value) => { const key = `${name}@`; if (el[key] !== value) { el[key] = value; el.setAttribute(name, value); } };
  const op = (a) => (a < 0.999 ? ` opacity="${Math.max(0, a).toFixed(3)}"` : '');
  const coin = (p, a = 1) => `<g transform="${tr(p)}"${op(a)}>${parts.coinSvg}</g>`;
  const depth = (c) => k.depthOf([c.x, c.y, 0], P);

  return {
    apply(v) {
      attr(L.hand, 'd', parts.handAt(v.dial));
      attr(L.pusher, 'transform', tr([0, v.push * 12, 0]));
      attr(L.flap, 'transform', tr([-(1 - v.flap) * 16, 0, 0]));
      attr(L.cleats, 'd', parts.cleatsAt(v.belt));
      attr(L.paddle, 'transform', tr([0, v.paddle * 22, 0]));
      set(L.rod, parts.rodAt(v.paddle * 22));

      const stack = [];
      for (let i = 0; i < v.stack.count; i++) stack.push(coin([MAG[0], MAG[1], BASE_Z + (i + v.stack.drop) * COIN]));
      const ejecting = v.coins.filter((c) => c.where === 'eject');
      for (const c of ejecting) if (c.y <= -1) stack.unshift(coin([c.x, c.y, c.z], c.a));
      for (const c of v.coins) if (c.where === 'mag') stack.push(coin([c.x, c.y, c.z], c.a));
      set(L.stack, stack.join(''));
      set(L.chute, v.coins.filter((c) => c.where === 'chute').map((c) => coin([c.x, c.y, c.z], c.a)).join(''));
      set(L.cup, v.coins.filter((c) => c.where === 'cup').map((c) => coin([c.x, c.y, c.z], c.a)).join(''));

      const card = (c) => `<g transform="${tr([c.x, c.y, c.z])}"${op(c.a)}>${c.no && c.where !== 'belt' ? parts.cardSvg.no : c.coin ? parts.cardSvg.ok : parts.cardSvg.wait}${c.coin ? `<g transform="${tr([0, 3.5, CARD_H])}">${parts.coinSvg}</g>` : ''}</g>`;
      const onBelt = [
        ...v.cards.filter((c) => c.where === 'belt').map((c) => ({ d: depth(c), html: card(c) })),
        ...ejecting.filter((c) => c.y > -1).map((c) => ({ d: depth(c) + 0.5, html: coin([c.x, c.y, c.z], c.a) })),
      ].sort((a, b) => a.d - b.d);
      set(L.belt, onBelt.map((x) => x.html).join(''));
      const sorted = (where) => v.cards.filter((c) => c.where === where).sort((a, b) => a.z - b.z || depth(a) - depth(b)).map(card).join('');
      set(L.bin, sorted('bin'));
      set(L.tray, sorted('tray'));

      const g = v.lamp.k;
      set(L.glow, g > 0.01
        ? `<path d="${parts.lensTop}" style="fill:var(--anatomy-${v.lamp.ok ? 'green' : 'red'});opacity:${g.toFixed(3)}"/><path d="${parts.lensTop}" style="fill:var(--anatomy-${v.lamp.ok ? 'green' : 'red'});opacity:${(g * 0.55).toFixed(3)};filter:blur(3px);transform-box:fill-box;transform-origin:center;transform:scale(2.4)"/>`
        : '');
    },
  };
}
