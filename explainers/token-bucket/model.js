/* Token bucket — the honest model that the figure, the video and the landing page all stand on.
 *
 * A bucket of `capacity` tokens. Every `period` seconds one token drops into it (rate r = 1/period);
 * if the bucket is full the token is lost (overflow). Every request takes one token; no token —
 * a rejection (HTTP 429 Too Many Requests). Hence two promises: a burst is at most capacity requests in a row,
 * on average at most r requests per second; in any window T at most capacity + r·T get through.
 *
 * All pure functions of time: simulate() plays the events once, view(sim, t) returns
 * the position of every moving part of the machine at moment t (for frame-by-frame rendering and for the live page).
 * The machine's world is in figure units (figure.js): x runs along the belt, z is up. */

export const MACHINE = {
  capacity: 5, // coins in the magazine — the bucket capacity (b)
  period: 2, // seconds between coins — r = 0.5 tokens/s
  speed: 60, // belt speed, units/s
  beltFrom: -106, // start of the belt (a request appears there)
  beltTo: 92, // end of the belt (then the tray of passed requests)
  kickX: 30, // where the kicker pushes a rejected request off
  eject: 0.3, // s — the coin travels from the magazine onto the card
  feed: 1.0, // s — from releasing a coin from the hopper to its landing
};

export const COIN = 4; // coin thickness (stack step)
export const BASE_Z = 16; // top of the magazine base — the bottom of the stack
export const CHUTE_Z = 41.5; // chute floor
export const CARD_Z = 12; // bottom of a card on the belt
export const CARD_H = 3;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
const io = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const out = (k) => 1 - (1 - k) ** 3;
const lerp = (a, b, k) => a + (b - a) * k;

/** the time a request that reaches the magazine at `arrival` appears at the start of the belt */
export const travel = (m = MACHINE) => -m.beltFrom / m.speed;

/** coins every period s from `from` (the first at from + period · phase) to `to` */
export function ticksBetween(from, to, period = MACHINE.period, phase = 1) {
  const out = [];
  for (let t = from + period * phase; t <= to + 1e-9; t += period) out.push(Math.round(t * 1000) / 1000);
  return out;
}

/**
 * Play the events.  start — tokens at the start; ticks — coin landing times; arrivals — the times
 * requests reach the magazine. Simultaneous ones: the coin first, then the request.
 * → { capacity, start, ticks: [{ t, kept, n }], reqs: [{ t, ok, te, n }], tokensAt(t), stats(t) }
 */
export function simulate({ capacity = MACHINE.capacity, start = capacity, ticks = [], arrivals = [], m = MACHINE } = {}) {
  const ev = [
    ...ticks.map((t) => ({ t, kind: 'tick' })),
    ...arrivals.map((t, id) => ({ t, kind: 'req', id })),
  ].sort((a, b) => a.t - b.t || (a.kind === 'tick' ? -1 : 1));
  let n = start;
  let lastLand = -Infinity;
  const T = [];
  const R = [];
  const steps = [{ t: -Infinity, n }];
  for (const e of ev) {
    if (e.kind === 'tick') {
      const kept = n < capacity;
      if (kept) n++;
      T.push({ t: e.t, kept, n });
      if (kept) lastLand = e.t;
    } else {
      const ok = n >= 1;
      // the coin leaves `eject` s before the card arrives, but not before the last coin has landed
      const te = ok ? Math.max(e.t - m.eject, n === 1 ? Math.min(lastLand, e.t - 0.08) : -Infinity) : null;
      if (ok) n--;
      R.push({ t: e.t, ok, te, n, id: e.id });
    }
    steps.push({ t: e.t, n });
  }
  const tokensAt = (t) => {
    let lo = 0;
    let hi = steps.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (steps[mid].t <= t) lo = mid; else hi = mid - 1; }
    return steps[lo].n;
  };
  const stats = (t) => {
    let ok = 0;
    let no = 0;
    let lost = 0;
    for (const r of R) if (r.t <= t) (r.ok ? ok++ : no++);
    for (const k of T) if (k.t <= t && !k.kept) lost++;
    return { ok, no, lost, tokens: tokensAt(t) };
  };
  return { capacity, start, ticks: T, reqs: R, tokensAt, stats };
}

/**
 * Positions of all moving parts at moment t.
 * → { stack: { count, drop }, coins: [{ x, y, z, a }], cards: [{ x, y, z, a, coin, where }],
 *     flap, paddle, push, lamp: { ok, k }, dial, belt, stats }
 *   where — the card's layer: belt | bin | tray (for painter's order).
 */
export function view(sim, t, m = MACHINE) {
  const cap = sim.capacity;
  // ---- stack: the model's tokens, but a coin leaves the stack as soon as it starts moving out (te)
  let count = sim.start;
  let lastTe = -Infinity;
  for (const k of sim.ticks) if (k.kept && k.t <= t) count++;
  for (const r of sim.reqs) if (r.ok && r.te <= t) { count--; lastTe = Math.max(lastTe, r.te); }
  count = clamp(count, 0, cap);
  const drop = t < lastTe + 0.34 ? 1 - io(seg(t, lastTe + 0.1, lastTe + 0.34)) : 0;

  const coins = [];
  // ---- coins from the hopper: chute → magazine (or over the flap → the overflow cup)
  for (const k of sim.ticks) {
    const t0 = k.t - m.feed;
    if (t < t0 || t > k.t + 0.05) continue;
    const slide = 0.55;
    if (k.kept) {
      if (t < t0 + slide) {
        const s = seg(t, t0, t0 + slide);
        coins.push({ x: lerp(-40, 0, s * s * (1.6 - 0.6 * s)), y: -16, z: CHUTE_Z, a: seg(t, t0, t0 + 0.1), where: 'chute' });
      } else {
        const s = seg(t, t0 + slide, k.t);
        const slot = BASE_Z + (k.n - 1) * COIN;
        coins.push({ x: 0, y: -16, z: lerp(CHUTE_Z, slot, s * s), a: 1, where: 'mag' });
      }
    } else {
      const s = seg(t, t0, k.t - 0.3);
      if (t < k.t - 0.3) coins.push({ x: lerp(-40, 13, s * s * (1.6 - 0.6 * s)), y: -16, z: CHUTE_Z, a: seg(t, t0, t0 + 0.1), where: 'chute' });
      else {
        const f = seg(t, k.t - 0.3, k.t);
        coins.push({ x: lerp(13, 24, f), y: -16, z: lerp(CHUTE_Z, 6, f * f), a: 1 - seg(t, k.t - 0.1, k.t + 0.02), where: 'cup' });
      }
    }
  }
  // ---- a coin from the magazine onto a card
  for (const r of sim.reqs) {
    if (!r.ok || t < r.te || t >= r.t) continue;
    const s = io(seg(t, r.te, r.t));
    coins.push({ x: 0, y: lerp(-16, 21.5, s), z: lerp(BASE_Z, CARD_Z + CARD_H, seg(s, 0.8, 1)), a: 1, where: 'eject' });
  }

  // ---- request cards
  const cards = [];
  let inTray = 0;
  let inBin = 0;
  for (const r of sim.reqs) {
    const born = r.t + m.beltFrom / m.speed;
    if (t < born) continue;
    const x = m.speed * (t - r.t);
    if (r.ok) {
      const off = r.t + m.beltTo / m.speed; // left the belt
      if (t < off) cards.push({ x, y: 18, z: CARD_Z, a: seg(t, born, born + 0.25), coin: t >= r.t, where: 'belt' });
      else {
        const f = seg(t, off, off + 0.3);
        const gone = seg(t, off + 2.2, off + 2.8);
        if (gone >= 1) continue;
        const slot = inTray++ % 4;
        cards.push({ x: lerp(m.beltTo, 110 + slot * 1.5, out(f)), y: 18 + (slot - 1.5) * 1.2, z: lerp(CARD_Z, 2.2, f * f), a: 1 - gone, coin: true, where: 'tray' });
      }
    } else {
      const tk = r.t + m.kickX / m.speed;
      if (t < tk) cards.push({ x, y: 18, z: CARD_Z, a: seg(t, born, born + 0.25), coin: false, where: 'belt', no: true });
      else {
        const f = seg(t, tk, tk + 0.5);
        const gone = seg(t, tk + 2.6, tk + 3.2);
        if (gone >= 1) continue;
        const slot = inBin++ % 4;
        const y = lerp(18, 50 + (slot - 1.5) * 2, out(f));
        const lift = Math.sin(Math.PI * seg(f, 0, 0.85)) * 5;
        cards.push({
          x: m.kickX + 14 * out(f) + slot * 3, y, z: lerp(CARD_Z, 2.2, seg(f, 0.55, 1) ** 2) + lift, a: 1 - gone, coin: false,
          where: y > 33 ? 'bin' : 'belt', no: true,
        });
      }
    }
  }

  // ---- rejection kicker, magazine pusher, lamp
  let paddle = 0;
  let push = 0;
  let lamp = { ok: true, k: 0 };
  for (const r of sim.reqs) {
    if (!r.ok) {
      const tk = r.t + m.kickX / m.speed;
      if (t > tk - 0.08 && t < tk + 0.6) paddle = Math.max(paddle, out(seg(t, tk - 0.08, tk + 0.12)) * (1 - io(seg(t, tk + 0.2, tk + 0.6))));
    } else if (t > r.te && t < r.t + 0.3) push = Math.max(push, io(seg(t, r.te, r.te + 0.15)) * (1 - io(seg(t, r.t, r.t + 0.3))));
    const age = t - r.t;
    if (age > -0.05 && age < 0.9) {
      const k = seg(age, -0.05, 0.03) * Math.exp(-Math.max(0, age) / 0.35);
      if (k > lamp.k) lamp = { ok: r.ok, k };
    }
  }

  // ---- flap: closed while the magazine is full (smoothly — the share of the last 0.25 s it was full)
  let full = 0;
  for (let i = 0; i < 6; i++) full += sim.tokensAt(t - (i / 5) * 0.25) >= cap ? 1 / 6 : 0;

  // ---- hopper clock hand: one turn between neighbouring coins
  let prev = null;
  let next = null;
  for (const k of sim.ticks) { if (k.t <= t) prev = k.t; else { next = k.t; break; } }
  const dial = prev !== null && next !== null ? (t - prev) / (next - prev) : next !== null ? 1 - (next - t) / m.period : ((t - (prev ?? 0)) / m.period) % 1;

  return {
    stack: { count, drop }, coins, cards, flap: io(full), paddle, push, lamp, dial,
    belt: (m.speed * t) % 12, stats: sim.stats(t),
  };
}
