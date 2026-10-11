/* An anatomy figure in a video: camera (zooms, pans), pin labels on parts, converting figure points
 * to frame coordinates. All pure functions of time, like the rest of video-kit.
 *
 * The figure lives in a persistent layer of the video (film.layers, stage/stage.js) and stays between scenes:
 * the machine runs continuously, the camera glides, and the scenes on top add only text and labels.
 *
 *   const cam = camera([{ t: 0, at: 'machine', zoom: 1 }, { t: 12, at: 'magazine', zoom: 2.4, pos: [0.64, 0.5] }]);
 *   const view = place(wrap, fig, box, cam(t), anchors);   // sets the transform of the <svg> wrapper
 *   const [x, y] = view.pin('magazine');                    // a part's point → frame pixels
 *
 * The box is where the figure stands at zoom 1: { x, y, w, h } in frame pixels; the figure is fitted into it.
 * A shot: t — when the camera starts moving, d — how long it moves (1.4 s), at — a figure anchor name or [x, y]
 * in viewBox coordinates, zoom — magnification, pos — where in the frame the point at lands (fractions, [0.5, 0.5] — center). */
import { E, clamp, lerp, seg } from './motion.js';

/** camera from shots → (t) => { at: [x, y], zoom, pos: [fx, fy] } */
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
      // zoom along the log of the scale — an even magnification speed
      cur = {
        at: [lerp(cur.at[0], to[0], k), lerp(cur.at[1], to[1], k)],
        zoom: Math.exp(lerp(Math.log(cur.zoom), Math.log(s.zoom), k)),
        pos: [lerp(cur.pos[0], s.pos[0], k), lerp(cur.pos[1], s.pos[1], k)],
      };
    }
    return cur;
  };
}

/** place the figure (wrapper el with <svg viewBox="0 0 fig.W fig.H"> fig.W px wide) by the camera.
 * → { scale, pin(name | [x, y]) → [x, y] in frame pixels } */
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

/** a pin label: a dot on the part, a line, a tag. el — <div class="pin"> with <i class="dot">, <b class="lbl">;
 * line — a <line> in the full-frame svg of the label layer. side: [dx, dy] — where to put the tag relative to the dot (px).
 * k — visibility 0..1 (the line draws, the tag pops up); frame — [width, height] of the frame:
 * the tag never leaves it (and doesn't slide under the chapter label at the top). */
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
    // keep the tag inside the frame (frame — [width, height]): shift it, the line still leads to the dot
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
    // the line ends at the nearest point of the tag's box
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

/** label visibility: appears at a, leaves at b (scene seconds) */
export const shown = (t, a, b = null, fin = 0.7, fout = 0.4) => Math.min(seg(t, a, a + fin), b == null ? 1 : 1 - seg(t, b, b + fout));
