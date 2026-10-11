/* Фигура anatomy в ролике: камера (наезды, панорамы), булавки-подписи к деталям, пересчёт точек
 * фигуры в координаты кадра. Всё — чистые функции времени, как и остальной video-kit.
 *
 * Фигура живёт в постоянном слое ролика (film.layers, stage/stage.js) и не пропадает между сценами:
 * машина работает непрерывно, камера плавно переезжает, а сцены поверх — только текст и подписи.
 *
 *   const cam = camera([{ t: 0, at: 'machine', zoom: 1 }, { t: 12, at: 'magazine', zoom: 2.4, pos: [0.64, 0.5] }]);
 *   const view = place(wrap, fig, box, cam(t), anchors);   // ставит transform обёртке <svg>
 *   const [x, y] = view.pin('magazine');                    // точка детали → пиксели кадра
 *
 * Кадр (box) — где фигура стоит при zoom 1: { x, y, w, h } в пикселях кадра; фигура вписывается в него.
 * Шот: t — когда камера начинает ехать, d — сколько едет (1.4 с), at — имя якоря фигуры или [x, y]
 * в координатах viewBox, zoom — увеличение, pos — куда в кадре встаёт точка at (доли, [0.5, 0.5] — центр). */
import { E, clamp, lerp, seg } from './motion.js';

/** камера по шотам → (t) => { at: [x, y], zoom, pos: [fx, fy] } */
export function camera(shots, anchors = {}) {
  const pt = (a) => (Array.isArray(a) ? a : anchors[a] ?? (() => { throw new Error(`нет якоря «${a}»`); })());
  const list = [...shots].sort((a, b) => a.t - b.t).map((s) => ({ d: 1.4, zoom: 1, pos: [0.5, 0.5], ...s }));
  return (t, extra = anchors) => {
    const P = (a) => (Array.isArray(a) ? a : extra[a] ?? pt(a));
    let cur = { at: P(list[0].at), zoom: list[0].zoom, pos: list[0].pos };
    for (let i = 1; i < list.length; i++) {
      const s = list[i];
      if (t < s.t) break;
      const k = E.io(seg(t, s.t, s.t + s.d));
      const to = P(s.at);
      // наезд по логарифму масштаба — скорость увеличения ровная
      cur = {
        at: [lerp(cur.at[0], to[0], k), lerp(cur.at[1], to[1], k)],
        zoom: Math.exp(lerp(Math.log(cur.zoom), Math.log(s.zoom), k)),
        pos: [lerp(cur.pos[0], s.pos[0], k), lerp(cur.pos[1], s.pos[1], k)],
      };
    }
    return cur;
  };
}

/** поставить фигуру (обёртку el с <svg viewBox="0 0 fig.W fig.H"> шириной fig.W px) по камере.
 * → { scale, pin(name | [x, y]) → [x, y] в пикселях кадра } */
export function place(el, fig, box, cam, anchors = fig.anchors) {
  const fit = Math.min(box.w / fig.W, box.h / fig.H);
  const S = fit * cam.zoom;
  const fx = box.x + box.w * cam.pos[0];
  const fy = box.y + box.h * cam.pos[1];
  const tx = fx - cam.at[0] * S;
  const ty = fy - cam.at[1] * S;
  if (el) {
    el.style.width = `${fig.W}px`;
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${S.toFixed(4)})`;
  }
  const pin = (a) => {
    const p = Array.isArray(a) ? a : anchors[a];
    if (!p) throw new Error(`нет якоря «${a}»`);
    return [tx + p[0] * S, ty + p[1] * S];
  };
  return { scale: S, pin };
}

/** подпись-булавка: точка на детали, линия, ярлык. el — <div class="pin"> с <i class="dot">, <b class="lbl">;
 * line — <line> в полноэкранном svg слоя подписей. side: [dx, dy] — куда отнести ярлык от точки (px).
 * k — видимость 0..1 (линия прорисовывается, ярлык всплывает); frame — [ширина, высота] кадра:
 * ярлык не выходит за его края (и не залезает под подпись главы сверху). */
export function pinLabel(el, line, [x, y], k, { side = [120, -80], frame = null, margin = 40 } = {}) {
  if (!el) return;
  const [dx, dy] = side;
  const kl = E.out(seg(k, 0, 0.55));
  const kt = E.out(seg(k, 0.35, 1));
  el.style.opacity = k > 0.001 ? 1 : 0;
  el.style.visibility = k > 0.001 ? '' : 'hidden';
  const dot = el.querySelector('.dot');
  const lbl = el.querySelector('.lbl');
  if (dot) dot.style.transform = `translate(${x}px, ${y}px) scale(${clamp(k * 2)})`;
  if (lbl) {
    // ярлык держим в кадре (frame — [ширина, высота] кадра): сдвигаем вдоль, линия всё равно ведёт к точке
    const w = lbl.offsetWidth;
    const h = lbl.offsetHeight;
    let left = dx < 0 ? x + dx - w : x + dx;
    let top = y + dy - h / 2;
    if (frame) {
      left = Math.min(Math.max(left, margin), frame[0] - margin - w);
      top = Math.min(Math.max(top, margin + 140), frame[1] - margin - h);
    }
    lbl.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) translateY(${(1 - kt) * 14}px)`;
    lbl.style.opacity = kt;
    // конец линии — ближайшая точка рамки ярлыка
    if (line) {
      const ex = Math.min(Math.max(x, left), left + w);
      const ey = Math.min(Math.max(y, top), top + h);
      line.setAttribute('x1', x.toFixed(1));
      line.setAttribute('y1', y.toFixed(1));
      line.setAttribute('x2', lerp(x, ex, kl).toFixed(1));
      line.setAttribute('y2', lerp(y, ey, kl).toFixed(1));
      line.style.opacity = k > 0.001 ? 1 : 0;
      return;
    }
  }
  if (line) {
    const ex = x + dx * kl;
    const ey = y + dy * kl;
    line.setAttribute('x1', x.toFixed(1));
    line.setAttribute('y1', y.toFixed(1));
    line.setAttribute('x2', ex.toFixed(1));
    line.setAttribute('y2', ey.toFixed(1));
    line.style.opacity = k > 0.001 ? 1 : 0;
  }
}

/** видимость подписи: появляется в a, уходит в b (секунды сцены) */
export const shown = (t, a, b = null, fin = 0.7, fout = 0.4) => Math.min(seg(t, a, a + fin), b == null ? 1 : 1 - seg(t, b, b + fout));
