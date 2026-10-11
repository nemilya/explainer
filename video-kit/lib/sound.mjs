/* Музыка и звуковые эффекты — синтез в коде, без сэмплов и лицензий (Node).
 *
 * Музыка: спокойный эмбиент ~76 BPM в ре миноре (Dm – B♭ – F – C): пэд всё время, «фортепианное»
 * арпеджио, мягкий бас; настроение задаёт сцена (mood в film.js):
 *   calm  — пэд и редкое арпеджио;  drive — восьмые, бас, тихий пульс «часов»;
 *   dark  — пэд, гул и редкие колокольчики;  end — пэд и арпеджио, затухание.
 * Под голосом музыка приседает (это делает ffmpeg в scripts/voice.mjs).
 * Звуки — по событиям таймлайна (sfx). Детерминировано: шум из ГПСЧ с зерном. */
import { writeFileSync } from 'node:fs';

export const SR = 48000;
const TAU = Math.PI * 2;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** тон с огибающей: f→f1 (глайд), вибрато, обертоны */
function tone(buf, t0, { f, f1 = f, dur, a = 0.1, att = 0.004, dec = dur / 4, parts = [1], vib = 0, vibf = 6, curve = 'exp' }) {
  const i0 = Math.max(0, Math.round(t0 * SR));
  const n = Math.min(buf.length - i0, Math.round(dur * SR));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = t / dur;
    let fr = curve === 'exp' ? f * (f1 / f) ** k : f + (f1 - f) * k;
    if (vib) fr *= 1 + vib * Math.sin(TAU * vibf * t);
    ph += TAU * fr / SR;
    const env = clamp(t / att) * Math.exp(-t / dec) * clamp((dur - t) / 0.02);
    let v = 0;
    for (let p = 0; p < parts.length; p++) if (parts[p]) v += parts[p] * Math.sin(ph * (p + 1));
    buf[i0 + i] += a * env * v;
  }
}
/** шум: bright 0..1 (или функция от k), shape: hit (удар) | swell (нарастание-спад) | rise (нарастание) */
function noise(buf, t0, { dur, a = 0.05, att = 0.002, dec = dur / 5, shape = 'hit', bright = 0.5, seed = 1 }) {
  const r = rng(seed);
  const i0 = Math.max(0, Math.round(t0 * SR));
  const n = Math.min(buf.length - i0, Math.round(dur * SR));
  let lp = 0;
  let lp2 = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = t / dur;
    const w = r() * 2 - 1;
    lp += (w - lp) * 0.09;
    lp2 += (lp - lp2) * 0.09;
    const hp = w - prev;
    prev = w;
    const b = typeof bright === 'function' ? bright(k) : bright;
    let env;
    if (shape === 'swell') env = Math.sin(Math.PI * k) ** 2;
    else if (shape === 'rise') env = k ** 2.2 * clamp((1 - k) / 0.04);
    else env = clamp(t / att) * Math.exp(-t / dec);
    env *= clamp((dur - t) / 0.01);
    buf[i0 + i] += a * env * ((1 - b) * lp2 * 6 + b * hp * 0.5);
  }
}

// ---------------------------------------------------------------- эффекты (buf, t, arg, seed)
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const FX = {
  // смена сцены: мягкий воздушный «вжух»
  whoosh: (b, t, _, s) => noise(b, t - 0.15, { dur: 0.8, a: 0.075, shape: 'swell', bright: (k) => 0.15 + 0.55 * Math.sin(Math.PI * k), seed: s }),
  swish: (b, t, _, s) => { noise(b, t, { dur: 0.45, a: 0.07, shape: 'swell', bright: (k) => 0.3 + 0.6 * k, seed: s }); tone(b, t + 0.2, { f: mtof(86), dur: 0.4, a: 0.02, dec: 0.12 }); },
  // появление элемента: мягкий тон, высота растёт с номером
  pop: (b, t, i = 0) => { const m = 74 + PENTA[i % PENTA.length]; tone(b, t, { f: mtof(m) * 0.75, f1: mtof(m), dur: 0.22, a: 0.08, dec: 0.07, parts: [1, 0.25] }); tone(b, t, { f: mtof(m + 12), dur: 0.5, a: 0.012, dec: 0.15 }); },
  // «тик» деревянной палочкой
  tick: (b, t, i = 0) => tone(b, t, { f: mtof(84 + PENTA[i % PENTA.length]), dur: 0.1, a: 0.05, dec: 0.03, parts: [1, 0, 0.3] }),
  // росчерк маркером (зачёркивание)
  strike: (b, t, _, s) => { noise(b, t, { dur: 0.34, a: 0.09, shape: 'swell', bright: (k) => 0.55 + 0.35 * k, seed: s }); tone(b, t, { f: 260, f1: 180, dur: 0.3, a: 0.025, dec: 0.12 }); },
  // мягкий глубокий удар — смысловой акцент
  impact: (b, t, _, s) => {
    tone(b, t, { f: 78, f1: 38, dur: 1.4, a: 0.32, att: 0.006, dec: 0.38, parts: [1, 0.35, 0.1] });
    noise(b, t, { dur: 0.4, a: 0.1, dec: 0.08, bright: 0.12, seed: s });
    noise(b, t + 0.02, { dur: 1.6, a: 0.025, dec: 0.6, bright: 0.05, seed: s + 1 });
    tone(b, t, { f: mtof(62), dur: 2.2, a: 0.025, att: 0.01, dec: 0.8, parts: [1, 0, 0.3] });
  },
  // нарастание перед переломом (arg — длительность)
  riser: (b, t, d = 2, s) => {
    noise(b, t, { dur: d, a: 0.07, shape: 'rise', bright: (k) => 0.1 + 0.75 * k, seed: s });
    tone(b, t, { f: 180, f1: 720, dur: d, a: 0.018, att: d * 0.7, dec: 9, vib: 0.006, vibf: 5 });
  },
  // колокольчик (вопросы)
  bell: (b, t, i = 0) => { const m = 74 + [0, 3, 7, 10][i % 4]; tone(b, t, { f: mtof(m), dur: 2.6, a: 0.06, att: 0.003, dec: 0.8, parts: [1, 0, 0.32, 0, 0.12, 0, 0.05] }); tone(b, t, { f: mtof(m + 12) * 1.003, dur: 1.6, a: 0.015, dec: 0.4 }); },
  chime: (b, t) => [62, 69, 74, 77, 81].forEach((m, i) => tone(b, t + i * 0.09, { f: mtof(m), dur: 3.4, a: 0.032, att: 0.01, dec: 1.3, parts: [1, 0.2, 0.05] })),
};
export const FX_KINDS = Object.keys(FX);

// ---------------------------------------------------------------- музыка
const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
// i – VI – III – VII в ре миноре; bass — нота баса (3-я октава), ch — аккорд
const PROG = [
  { bass: 50, ch: [62, 65, 69] }, // Dm
  { bass: 46, ch: [62, 65, 70] }, // B♭
  { bass: 53, ch: [60, 65, 69] }, // F
  { bass: 48, ch: [60, 64, 67] }, // C
];
const piano = (buf, t, m, a) => tone(buf, t, { f: mtof(m), dur: 1.6, a, att: 0.004, dec: 0.42, parts: [1, 0.5, 0.22, 0.1, 0.05] });

function music(buf, scenes, duration) {
  const sceneAt = (t) => scenes.reduce((a, s, i) => (t >= s.start ? i : a), 0);
  const moodAt = (t) => scenes[sceneAt(t)].mood;
  const end = duration - 0.5;
  // восьмые: арпеджио, бас, пульс
  for (let step = 0, t = 0.1; t < end - 0.4; step++, t += BEAT / 2) {
    const mood = moodAt(t);
    const bar = Math.floor(step / 8);
    const c = PROG[bar % PROG.length];
    const pos = step % 8;
    const top = [c.ch[0], c.ch[1], c.ch[2], c.ch[0] + 12];
    if (mood === 'calm' || mood === 'end') {
      if (pos % 2 === 0) piano(buf, t, top[[0, 2, 1, 3][pos / 2]], 0.028);
      if (pos === 0) tone(buf, t, { f: mtof(c.bass - 12), dur: BAR, a: 0.05, att: 0.02, dec: 1.4, parts: [1, 0.4, 0.15] });
    } else if (mood === 'drive') {
      const pat = [0, 1, 2, 3, 2, 1, 2, 1];
      piano(buf, t, top[pat[pos]] + (bar % 2 && pos === 3 ? 2 : 0), pos % 2 ? 0.017 : 0.026);
      if (pos === 0 || pos === 4) tone(buf, t, { f: mtof(c.bass - 12), dur: 1.4, a: 0.07, att: 0.01, dec: 0.5, parts: [1, 0.5, 0.2] });
      if (pos === 0 || pos === 4) tone(buf, t, { f: 92, f1: 44, dur: 0.28, a: 0.1, dec: 0.08 });
      if (pos % 2) noise(buf, t, { dur: 0.05, a: 0.012, dec: 0.012, bright: 0.95, seed: step });
    } else if (mood === 'dark') {
      if (pos === 0) tone(buf, t, { f: mtof(38), dur: BAR + 0.4, a: 0.06, att: 0.6, dec: 6, parts: [1, 0.6, 0.3, 0.1] });
      if (pos === 0 && bar % 2 === 0) tone(buf, t, { f: mtof(c.ch[2] + 12), dur: 3, a: 0.02, dec: 1.0, parts: [1, 0, 0.3, 0, 0.1] });
    }
  }
  // пэд: по такту, тихо, всё время
  for (let bar = 0, t = 0; t < end; bar++, t += BAR) {
    const c = PROG[bar % PROG.length];
    const dark = moodAt(t + 0.1) === 'dark';
    c.ch.forEach((m) => [-6, 6].forEach((cents) => tone(buf, t, {
      f: mtof(m - 12) * 2 ** (cents / 1200), dur: BAR + 0.6, a: dark ? 0.013 : 0.01, att: 0.9, dec: 8, parts: [1, 0.3, 0.08],
    })));
  }
  for (let s = 0; s < buf.length; s++) {
    const t = s / SR;
    buf[s] *= clamp(t / 2) * clamp((duration - t) / 3.5);
  }
}

/** → { music, fx } — Float32Array моно SR Гц. tl — compile(film, voice) */
export function synth(tl) {
  const n = Math.ceil(tl.duration * SR) + SR;
  const mus = new Float32Array(n);
  music(mus, tl.scenes, tl.duration);
  const fx = new Float32Array(n);
  tl.events.filter((e) => e.type === 'sfx').forEach((e, k) => {
    const f = FX[e.kind];
    if (!f) throw new Error(`неизвестный звук: ${e.kind}`);
    f(fx, e.t, e.arg, 1000 + k);
  });
  return { music: mus, fx };
}

/** Float32 [-1..1] → WAV 16 бит моно (мягкое ограничение) */
export function wav(path, data) {
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) buf.writeInt16LE(Math.round(Math.tanh(data[i]) * 32000), 44 + i * 2);
  writeFileSync(path, buf);
}
