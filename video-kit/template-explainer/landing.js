/* Лендинг «{{TITLE}}»: живая фигура (figure.js + model.js), ролик и язык. Страница собирается
 * explainers/build.mjs (make landing) из landing/index.html и landing/i18n/<code>.mjs; строки для скрипта —
 * в <script type="application/json" id="i18n">. Полный пример с кнопками и счётчиками — explainers/token-bucket. */
import { buildFigure, mountFigure } from './figure.js';
import { state } from './model.js';
import { suggestLanguage } from '../suggest.js';
import { videoSection } from '../video.js';

const T = JSON.parse(document.getElementById('i18n')?.textContent || '{}');
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
suggestLanguage();
videoSection();

// живая фигура: модель — функция времени
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
