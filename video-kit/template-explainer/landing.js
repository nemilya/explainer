/* Лендинг «{{TITLE}}»: живая фигура (figure.js + model.js), ролик (MP4 из video/out/ или живой плеер)
 * и факты. Языки — ru / en. Полный пример с кнопками, счётчиками и главами — explainers/token-bucket. */
import { buildFigure, mountFigure } from './figure.js';
import { state } from './model.js';

const TX = {
  ru: {
    catalog: '← Explainer', eyebrow: 'Explainer', h1: '{{TITLE}}', lede: 'Одним абзацем: что объясняем и почему это важно.',
    questions: ['Вопрос 1?', 'Вопрос 2?'], s1kicker: 'Машина', s1h: 'Как это устроено', figTitle: '{{TITLE}}', figHint: 'наведите', caption: 'Подпись с настоящими числами.',
    readout: (s) => `показание ${s.reading}`, s2kicker: 'Ролик', s2h: 'Объяснение в диалоге', live: 'Живой плеер ↗', s3kicker: 'Суть', s3h: 'Главное',
    facts: [['факт', 'Заголовок', 'Пояснение.']],
  },
  en: {
    catalog: '← Explainer', eyebrow: 'Explainer', h1: '{{TITLE}}', lede: 'One paragraph: what we explain and why it matters.',
    questions: ['Question 1?', 'Question 2?'], s1kicker: 'The machine', s1h: 'How it works', figTitle: '{{TITLE}}', figHint: 'hover', caption: 'A caption with real numbers.',
    readout: (s) => `reads ${s.reading}`, s2kicker: 'The video', s2h: 'Explained as a dialogue', live: 'Live player ↗', s3kicker: 'The gist', s3h: 'Key points',
    facts: [['fact', 'Heading', 'Explanation.']],
  },
};
const LANGS = Object.keys(TX);
let LANG = [new URLSearchParams(location.search).get('lang'), location.hash.slice(1)].find((x) => LANGS.includes(x)) ?? (navigator.language?.startsWith('ru') ? 'ru' : 'en');
let T = TX[LANG];
let FMT = 'h';

function texts() {
  T = TX[LANG];
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = T[el.dataset.t];
    if (el.dataset.t === 'questions') el.innerHTML = v.map((q) => `<li>${q}</li>`).join('');
    else if (el.dataset.t === 'facts') el.innerHTML = v.map(([k, h, p]) => `<div class="fact"><span class="mono">${k}</span><h3>${h}</h3><p>${p}</p></div>`).join('');
    else if (typeof v === 'string') el.innerHTML = v;
  });
  document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
}
document.querySelectorAll('.langs button').forEach((b) => b.addEventListener('click', () => { LANG = b.dataset.lang; texts(); video(); }));
texts();

// живая фигура: модель — функция времени
const FIG = buildFigure();
const stage = document.querySelector('.iso-stage');
stage.innerHTML = FIG.svg;
const fig = mountFigure(stage.querySelector('svg'), FIG);
const readout = document.querySelector('[data-readout]');
let clock = 0;
let last = 0;
const loop = (now) => {
  clock += last ? Math.min((now - last) / 1000, 1 / 20) : 0;
  last = now;
  const s = state(clock);
  fig.apply(s);
  readout.textContent = T.readout(s);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// ролик: готовый MP4 (make video / video-cc) или живой плеер
async function video() {
  const suffix = `${LANG !== 'ru' ? `-${LANG}` : ''}${FMT === 'v' ? '-vertical-captions' : ''}`;
  const mp4 = `video/out/{{NAME}}${suffix}.mp4`;
  const hash = [LANG !== 'ru' ? LANG : '', FMT === 'v' ? 'v' : ''].filter(Boolean).join('-');
  // без пустого «#»: переход к якорю в iframe прокручивает и родительскую страницу
  const live = `video/index.html${hash ? `#${hash}` : ''}`;
  document.getElementById('live').href = live;
  document.querySelectorAll('#fmt button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === FMT)));
  const box = document.getElementById('player');
  box.classList.toggle('v', FMT === 'v');
  const ok = await fetch(mp4, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
  box.innerHTML = ok
    ? `<video controls preload="metadata" playsinline poster="video/out/poster${suffix}.jpg" src="${mp4}"></video>`
    : `<iframe src="${live}" title="{{TITLE}}" allow="fullscreen; autoplay" loading="lazy"></iframe>`;
}
document.querySelectorAll('#fmt button').forEach((b) => b.addEventListener('click', () => { FMT = b.dataset.f; video(); }));
video();
