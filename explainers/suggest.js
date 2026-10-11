/* Язык на странице (общее для каталога и тем). Автовыбор до отрисовки — explainers/lang.js в <head>.
 * Здесь: клик по EN/RU запоминается; пришли по прямой ссылке на «чужой» язык и выбора ещё не было —
 * ненавязчивая плашка «Эта страница есть на … → Открыть» (× — остаться и больше не предлагать). */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
};

export function suggestLanguage() {
  const KEY = window.exLang?.KEY ?? 'explainer-lang';
  const page = document.documentElement.lang;
  document.querySelectorAll('a[data-lang]').forEach((a) => a.addEventListener('click', () => store.set(KEY, a.dataset.lang)));
  const want = window.exLang?.current;
  if (store.get(KEY) || !want || want === page) return;
  const alt = document.querySelector(`link[rel="alternate"][hreflang="${want}"][data-suggest]`);
  if (!alt) return;
  const bar = document.createElement('div');
  bar.className = 'suggest';
  bar.lang = alt.hreflang;
  const text = document.createElement('span');
  text.textContent = alt.dataset.suggest;
  const go = document.createElement('a');
  go.href = alt.dataset.href;
  go.textContent = `${alt.dataset.go} →`;
  go.addEventListener('click', () => store.set(KEY, alt.hreflang));
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', '×');
  close.textContent = '×';
  close.addEventListener('click', () => { store.set(KEY, page); bar.remove(); });
  bar.append(text, go, close);
  document.body.prepend(bar);
}
