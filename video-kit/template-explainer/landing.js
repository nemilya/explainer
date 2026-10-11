/* Landing page "{{TITLE}}": the live figure (figure.js + model.js), the video and the language. The page is built by
 * explainers/build.mjs (make landing) from landing/index.html and landing/i18n/<code>.mjs; strings for the script —
 * in <script type="application/json" id="i18n">. A full example with buttons and counters — explainers/token-bucket. */
import { buildFigure, mountFigure } from './figure.js';
import { state } from './model.js';
import { suggestLanguage } from '../suggest.js';
import { videoSection } from '../video.js';

const T = JSON.parse(document.getElementById('i18n')?.textContent || '{}');
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
suggestLanguage();
videoSection();

// live figure: the model is a function of time
const FIG = buildFigure();
const stage = document.querySelector('.iso-stage');
stage.innerHTML = FIG.svg;
stage.setAttribute('aria-label', T.figLabel ?? '');
const fig = mountFigure(stage.querySelector('svg'), FIG);
const readout = document.querySelector('[data-readout]');
let clock = 0;
let last = 0;
const loop = (now) => {
  clock += last ? Math.min((now - last) / 1000, 1 / 20) : 0;
  last = now;
  const s = state(clock);
  fig.apply(s);
  if (T.readout) readout.textContent = fill(T.readout, s);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
