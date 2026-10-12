/* Animation helpers: all are pure functions of time (frame = f(t)), no clocks and no DOM state.
 * Used in film.js (scene draw) and stage/stage.js. Work in Node too (import without a DOM). */

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
/** progress 0..1 on the interval [a, b] */
export const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
/** visibility of the interval [a, b) with a smooth fade in/out */
export const vis = (t, a, b, fin = 0.3, fout = 0.3) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));

export const E = {
  io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  in: (k) => k * k * k,
  out: (k) => 1 - (1 - k) ** 3,
  back: (k) => { const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  spring: (k) => 1 - Math.exp(-7 * k) * Math.cos(11 * k),
};

/** deterministic PRNG (mulberry32) */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- element styles
/** opacity + transform in one call; o — opacity, the rest — offset/scale/rotation */
export function css(el, { o, x = 0, y = 0, s = 1, r = 0 } = {}) {
  if (!el) return;
  if (o !== undefined) {
    el.style.opacity = o;
    el.style.visibility = o <= 0.001 ? 'hidden' : '';
  }
  el.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
}
/** rise from below: from t0 over d seconds */
export function rise(el, t, t0, { d = 0.7, dy = 40, out } = {}) {
  const k = E.out(seg(t, t0, t0 + d));
  const q = out === undefined ? 1 : 1 - seg(t, out, out + 0.4);
  css(el, { o: k * q, y: (1 - k) * dy - (1 - q) * 20 });
  return k;
}
/** "pop" with a little spring */
export function pop(el, t, t0, { d = 0.55, s0 = 0.6, out } = {}) {
  const k = E.back(seg(t, t0, t0 + d));
  const q = out === undefined ? 1 : 1 - seg(t, out, out + 0.35);
  css(el, { o: seg(t, t0, t0 + 0.15) * q, s: s0 + (1 - s0) * k });
  return k;
}
export function fade(el, t, t0, d = 0.5, out) {
  const q = out === undefined ? 1 : 1 - seg(t, out, out + 0.4);
  const o = seg(t, t0, t0 + d) * q;
  if (el) { el.style.opacity = o; el.style.visibility = o <= 0.001 ? 'hidden' : ''; }
  return o;
}
/** draw an SVG line (needs pathLength="1") */
export function stroke(el, k) {
  if (!el) return;
  el.style.strokeDasharray = '1 1';
  el.style.strokeDashoffset = String(1 - clamp(k));
  el.style.opacity = k > 0 ? 1 : 0;
}
/** CSS variable --k (strike-throughs, underlines) */
export const setK = (el, k, name = '--k') => el?.style.setProperty(name, String(clamp(k)));

/** words one by one: .w elements inside el appear from t0 to t1 */
export function words(els, t, t0, t1, { dy = 26, d = 0.45 } = {}) {
  const n = els.length;
  els.forEach((w, j) => rise(w, t, lerp(t0, t1, n > 1 ? j / (n - 1) : 0), { d, dy }));
}
/** text → <span class="w">word</span> … (for word-by-word appearance) */
export const split = (text) => text.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? ' ' : `<span class="w">${w}</span>`)).join('');

// ---------------------------------------------------------------- images (AI shots)
/** "Ken Burns": a slow zoom in / zoom out / pan of an image over [t0, t1].
 * from, to — { s, x, y }: scale (≥ 1) and offset in % of the element size; the offset must not exceed the
 * scale margin ((s − 1) / 2 · 100 %), or an edge shows. Nearly uniform motion, slightly softer at the ends.
 * extra — added to transform (e.g. shake()). */
export function ken(el, t, t0, t1, { from = {}, to = {}, extra = '' } = {}) {
  if (!el) return 0;
  const k = seg(t, t0, t1);
  const e = 0.7 * k + 0.3 * k * k * (3 - 2 * k);
  const v = (p, d) => lerp(from[p] ?? d, to[p] ?? from[p] ?? d, e);
  el.style.transform = `translate(${v('x', 0).toFixed(3)}%, ${v('y', 0).toFixed(3)}%) scale(${v('s', 1).toFixed(4)})${extra ? ` ${extra}` : ''}`;
  return e;
}
/** a decaying shake after t0 (a hit, a gust of wind): a transform string for ken(…, { extra }) or css */
export function shake(t, t0, { amp = 14, d = 0.6, f = 31, seed = 1 } = {}) {
  if (t < t0 || t > t0 + d) return '';
  const k = 1 - (t - t0) / d;
  const x = amp * k * Math.sin((t - t0) * f + seed);
  const y = amp * 0.6 * k * Math.cos((t - t0) * f * 1.3 + seed * 2);
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}
