/* {{TITLE}} — фигура на ките anatomy ({{ROOT}}/anatomy/kit/iso-kit.mjs). Заготовка: плита на ножках,
 * две направляющие и каретка, которая ездит по модели. Замените её своей машиной: правила — в
 * {{ROOT}}/anatomy/SKILL.md (объект вместо схемы, 40–80 деталей, порядок отрисовки, одна lit-деталь).
 *
 * buildFigure() → { svg, P, W, H, anchors, parts }; mountFigure(svgEl, fig) → { apply(state) }.
 * anchors — точки деталей в координатах viewBox: к ним едет камера ролика и цепляются подписи. */
import * as k from '{{ROOT}}/anatomy/kit/iso-kit.mjs';
import { MODEL } from './model.js';

export const W = 640;
export const H = 400;
const PLATE = { x: -110, y: -50, w: 220, d: 100, r: 8 };
const CAR = { x: -16, y: -18, w: 32, d: 36, r: 3 };

export function buildFigure() {
  const P = k.fitProjection([...k.boxCorners(PLATE, -15, 40)], W, H, { pad: 30, azimuth: 52 });
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const base = [`<path class="iso-halo" d="${k.haloOf(PLATE, -15, 10, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 20).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    base.push(S(k.cylinder(x, y, 6, -15, 5, P, 24), { tone: 'mid' }));
  }
  base.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), { tone: 'mid' }));
  base.push(k.lineSvg(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
  base.push(k.dotsSvg(k.corners(PLATE, 10).map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  for (const y of [-14, 10]) base.push(S(k.slabOf({ x: MODEL.from - 24, y, w: MODEL.to - MODEL.from + 48, d: 4, r: 1 }, 0, 3, P, 2, 0.3), { tone: 'mid' }));
  const carriage = [
    S(k.slabOf(CAR, 3, 8, P, 4, 0.6), { tone: 'hi', lit: true }),
    k.lineSvg(k.planOutline(k.insetPlan(CAR, 3), 11, P, 4), { tone: 'faint' }),
  ].join('');
  const svg = k.figureSvg({
    width: W, height: H, label: '{{TITLE}}: заготовка фигуры — каретка на направляющих.',
    body: [...base, `<g data-l="carriage">${carriage}</g>`],
  });
  const anchors = { machine: at([0, 0, 0]), carriage: at([0, 0, 11]), left: at([MODEL.from, 0, 3]), right: at([MODEL.to, 0, 3]) };
  return { svg, P, W, H, anchors, parts: {} };
}

export function mountFigure(svgEl, fig) {
  const car = svgEl.querySelector('[data-l="carriage"]');
  return {
    apply(s) { car.setAttribute('transform', k.translateAlong(fig.P, [s.x, 0, 0])); },
    /** якорь движущейся детали в текущем положении (для подписей ролика) */
    carriage: (s) => k.iso([s.x, 0, 11], fig.P),
  };
}
