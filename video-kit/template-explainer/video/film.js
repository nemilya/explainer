/* {{TITLE}} — an explainer video. The explainer stub (video-kit/template-explainer): the anatomy figure
 * in a persistent layer (the machine runs through the whole video), the camera moves onto parts, the scenes on top — titles
 * and pin labels. Dialogue: she — explains (the main voice), he — asks (voices.he).
 * A full example — explainers/token-bucket/video/film.js. Texts — text/<lang>.js, styles — scenes.css. */
import { css, E, rise, seg } from '{{KIT}}/lib/motion.js';
import { camera, pinLabel, place, shown } from '{{KIT}}/lib/figure.js';
import { buildFigure, mountFigure } from '../figure.js';
import { state } from '../model.js';
import en from './text/en.js';
import ru from './text/ru.js';

export const TEXTS = { en, ru }; // the first language is the main one (English)
export const LANGS = Object.keys(TEXTS);

const FIG = buildFigure();
const SIZE = { h: [1920, 1080], v: [1080, 1920] };
const BOX = { h: { x: 40, y: 50, w: 1840, h: 980 }, v: { x: 30, y: 330, w: 1020, h: 760 } };
const G = { t: 0, pin: () => [0, 0], fig: null };

const talk = (s, lines, first = {}) => lines.map(([who, text], i) => s.say(text, { ...(i === 0 ? first : {}), ...(who === 'he' ? { voice: 'he' } : {}) }));
function cue(said, word) {
  for (const a of said) if (a.text.includes(word)) return a.at(word);
  throw new Error(`нет «${word}» в репликах сцены`);
}

/** camera: shots in the video's global time, from scene starts and their q */
function shots(tl, v) {
  const S = Object.fromEntries(tl.scenes.map((s) => [s.id, s]));
  const g = (id, key) => S[id].start + (key ? S[id].q[key] : 0);
  const P = (h, vv) => (v ? vv : h);
  return [
    { t: 0, at: 'machine', zoom: 1, pos: P([0.62, 0.6], [0.5, 0.5]) },
    { t: g('part') - 0.2, d: 1.6, at: 'carriage', zoom: P(2.2, 2), pos: P([0.6, 0.55], [0.5, 0.5]) },
    { t: g('end') - 0.2, d: 2, at: 'machine', zoom: 0.85, pos: P([0.66, 0.64], [0.5, 0.42]) },
  ];
}

export default function makeFilm(lang = LANGS[0]) {
  const T = TEXTS[lang];
  if (!T) throw new Error(`нет текстов для языка «${lang}» (есть: ${LANGS.join(', ')})`);
  let fig = null;
  let cam = null;
  return {
    lang,
    title: T.ui.title,
    ui: T.ui,
    poster: 3,
    speakers: [
      { voice: '', name: T.speakers.she.name, role: T.speakers.she.role },
      { voice: 'he', name: T.speakers.he.name, role: T.speakers.he.role },
    ],
    layers: [{
      id: 'machine',
      html: () => `<div class="fig iso" data-theme="light">${FIG.svg}</div>`,
      draw(t, tl, ctx) {
        if (!fig) fig = mountFigure(ctx.$('.fig svg'), FIG);
        if (!cam) cam = camera(shots(tl, ctx.v), FIG.anchors);
        const s = state(t);
        fig.apply(s);
        G.t = t;
        // a moving part — an anchor that travels with it
        const anchors = { ...FIG.anchors, carriage: fig.carriage(s) };
        G.pin = place(ctx.$('.fig'), FIG, BOX[ctx.v ? 'v' : 'h'], cam(t, anchors), anchors).pin;
      },
    }],
    scenes: [
      {
        id: 'hook', mood: 'calm',
        build(s) {
          s.sfx(0.3, 'chime');
          const said = talk(s, T.hook.say, { at: s.p(1.2) });
          s.hold(said.at(-1).t1 + s.p(0.8));
          return { out: said.at(-1).t0 };
        },
        html: () => `<div class="ttl"><div class="eyebrow mono">${T.hook.eyebrow}</div><h1>${T.hook.h1}</h1></div>`,
        draw(t, q, { $ }) {
          rise($('.ttl .eyebrow'), t, 0.2, { dy: 20, out: q.out });
          rise($('.ttl h1'), t, 0.4, { dy: 50, d: 0.9, out: q.out });
        },
      },
      {
        id: 'part', kicker: T.part.kicker, num: '01', mood: 'drive',
        build(s) {
          const said = talk(s, T.part.say, { at: s.p(0.8) });
          const show = cue(said, T.part.cue[0]);
          s.sfx(show, 'pop', 2);
          s.hold(said.at(-1).t1 + s.p(1));
          return { show };
        },
        html: ({ v }) => `<svg class="pl" viewBox="0 0 ${SIZE[v ? 'v' : 'h'].join(' ')}"><line class="l-car"/></svg>
          <div class="pin p-car"><i class="dot"></i><b class="lbl">${T.part.pin}</b></div>`,
        draw(t, q, ctx) {
          pinLabel(ctx.$('.p-car'), ctx.$('.l-car'), G.pin('carriage'), shown(t, q.show), { side: ctx.v ? [-160, -240] : [-320, -160], frame: SIZE[ctx.v ? 'v' : 'h'] });
        },
      },
      {
        id: 'end', mood: 'end',
        build(s) {
          const said = talk(s, T.end.say, { at: s.p(0.6) });
          s.sfx(said.at(-1).t1 + 0.4, 'chime');
          s.hold(said.at(-1).t1 + s.p(3.5));
          return { cta: said.at(-1).t1 };
        },
        html: () => `<div class="fin"><h1>${T.end.h1}</h1><div class="cta mono">${T.end.cta}</div></div>`,
        draw(t, q, { $ }) {
          rise($('.fin h1'), t, 0.5, { dy: 50, d: 0.9 });
          const k = E.out(seg(t, q.cta, q.cta + 0.6));
          css($('.fin .cta'), { o: k, y: (1 - k) * 14 });
        },
      },
    ],
  };
}
