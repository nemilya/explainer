/* Language on the page (shared by the catalog and topics). The auto-choice before paint — explainers/lang.js in <head>.
 * Here: a click on EN/RU is remembered; arriving by a direct link in "another" language with no choice made yet —
 * an unobtrusive banner "This page is available in … → Open" (× — stay and don't offer again). */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
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
