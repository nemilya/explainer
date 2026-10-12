/* {{NAME}} — the video script. The video-kit stub: three scenes (title, three points, finale) — replace them
 * with your own. Texts — in text/<lang>.js, scene styles — in scenes.css, the engine — in {{KIT}}.
 *
 * A scene: { id, kicker?, num?, mood?, theme?, build(s), html, draw(t, q, ctx) }
 *   build(s) — time: s.say(text) → { t0, t1, at('word') }, s.sfx(t, sound), s.hold(t), s.p(pause);
 *              returns q — the moments the animation hangs on;
 *   html     — markup: a string or ({ v }) => string (v — the vertical frame 1080×1920);
 *   draw(t, q, ctx) — the frame at moment t (seconds from the scene start); ctx.$ / ctx.$$ — query inside the scene, ctx.v.
 * mood — music: calm | drive | dark | end; theme — scene background: dark | accent.
 * Sounds: whoosh swish pop tick strike impact riser bell chime (video-kit/lib/sound.mjs).
 * Everything is tied to the lines: after a new voice-over the timings adjust themselves. */
import { E, css, pop, rise, seg, words } from '{{KIT}}/lib/motion.js';
import en from './text/en.js';
import ru from './text/ru.js';

export const TEXTS = { en, ru }; // the first language is the main one (English)
export const LANGS = Object.keys(TEXTS);

const wordsOf = (list) => list.map((w) => (w === '<br>' ? '<br>' : `<span class="w">${w}</span>`)).join(' ').replace(/ <br> /g, '<br>');

export default function makeFilm(lang = LANGS[0]) {
  const T = TEXTS[lang];
  if (!T) throw new Error(`no texts for language "${lang}" (available: ${LANGS.join(', ')})`);
  return {
    lang,
    title: T.ui.title,
    ui: T.ui,
    poster: 3, // preview frame
    scenes: [
      // ---------------------------------------------------------------- title
      {
        id: 'title', mood: 'calm',
        build(s) {
          s.sfx(0.4, 'chime');
          const a = s.say(T.title.say[0], { at: s.p(1.6) });
          s.hold(a.t1 + s.p(1.0));
          return { by: a.t0 + 0.4 };
        },
        html: () => `
          <div class="t-eyebrow mono">${T.title.eyebrow}</div>
          <h1 class="t-h1">${wordsOf(T.title.h1)}</h1>
          <p class="t-by">${T.title.by}</p>`,
        draw(t, q, { $, $$ }) {
          rise($('.t-eyebrow'), t, 0.2, { dy: 20 });
          $$('.t-h1 .w').forEach((w, j) => rise(w, t, 0.35 + j * 0.14, { dy: 80, d: 0.9 }));
          rise($('.t-by'), t, q.by, { dy: 24 });
        },
      },

      // ---------------------------------------------------------------- three points: a card on every cue word
      {
        id: 'points', kicker: T.points.kicker, num: '01', mood: 'drive',
        build(s) {
          const L = T.points;
          const a = s.say(L.say[0]);
          const b = s.say(L.say[1]);
          const cards = L.cue.map((c) => b.at(c));
          cards.forEach((x, i) => s.sfx(x, 'pop', i));
          s.hold(b.t1 + s.p(1.4));
          return { h2: a.t0, cards };
        },
        html: () => `
          <h2 class="h2">${T.points.h2}</h2>
          ${T.points.cards.map(([m, h], i) => `<div class="pt-card c${i}"><span class="mono">${m}</span><h4>${h}</h4></div>`).join('')}`,
        draw(t, q, { $, $$ }) {
          rise($('.h2'), t, q.h2, { dy: 30 });
          $$('.pt-card').forEach((c, i) => pop(c, t, q.cards[i], { s0: 0.85, d: 0.6 }));
        },
      },

      // ---------------------------------------------------------------- the verdict on a colored background
      {
        id: 'verdict', mood: 'dark', theme: 'accent',
        build(s) {
          const a = s.say(T.verdict.say[0], { at: s.p(0.8) });
          s.sfx(a.t1 + 0.1, 'impact');
          s.hold(a.t1 + s.p(2.4));
          return { w0: a.t0, w1: a.t1 - 0.5 };
        },
        html: () => `<p class="vd-text">${T.verdict.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ')}</p>`,
        draw(t, q, { $$ }) {
          words($$('.vd-text .w'), t, q.w0, q.w1, { dy: 30, d: 0.5 });
        },
      },

      // ---------------------------------------------------------------- finale
      {
        id: 'end', mood: 'end',
        build(s) {
          const a = s.say(T.end.say[0], { at: s.p(0.8) });
          s.sfx(a.t1 + 0.3, 'chime');
          s.hold(a.t1 + s.p(3.5));
          return { foot: a.t1 + 0.3 };
        },
        html: () => `
          <h1 class="e-h1">${wordsOf(T.title.h1)}</h1>
          <div class="e-foot mono">${T.end.foot}</div>`,
        draw(t, q, { $, $$ }) {
          $$('.e-h1 .w').forEach((w, j) => rise(w, t, 0.3 + j * 0.12, { dy: 60, d: 0.8 }));
          const k = E.out(seg(t, q.foot, q.foot + 0.6));
          css($('.e-foot'), { o: k, y: (1 - k) * 16 });
        },
      },
    ],
  };
}
