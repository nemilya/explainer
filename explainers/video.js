/* Ролик на лендинге темы (общее для всех тем): переключатель 16:9 / 9:16 и главы.
 * Разметку собирает explainers/build.mjs: .video[data-f="h"|"v"] с <video> (out/web/ или out/)
 * или с живым плеером <iframe>, .chapters button[data-t]. На телефоне в портретной ориентации,
 * если есть вертикальный ролик, сразу показываем 9:16. */
export function videoSection(root = document.getElementById('video')) {
  if (!root) return;
  const boxes = [...root.querySelectorAll('.video[data-f]')];
  const live = root.querySelector('[data-live-h]');
  let fmt = 'h';
  const show = (f) => {
    fmt = f;
    for (const b of boxes) {
      const on = b.dataset.f === f;
      b.hidden = !on;
      const v = b.querySelector('video');
      if (!on && v && !v.paused) v.pause();
    }
    root.querySelectorAll('.seg button[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    if (live) live.href = live.dataset[f === 'v' ? 'liveV' : 'liveH'];
  };
  root.querySelectorAll('.seg button[data-f]').forEach((b) => b.addEventListener('click', () => show(b.dataset.f)));
  if (matchMedia('(max-width: 700px) and (orientation: portrait)').matches && boxes.some((b) => b.dataset.f === 'v' && 'has' in b.dataset)) show('v');
  root.querySelectorAll('.chapters button[data-t]').forEach((b) => b.addEventListener('click', () => {
    const box = boxes.find((x) => x.dataset.f === fmt);
    const t = Number(b.dataset.t);
    const v = box?.querySelector('video');
    if (v) { v.currentTime = t; v.play().catch(() => {}); return; }
    const frame = box?.querySelector('iframe');
    if (frame) {
      const u = new URL(frame.src, location.href);
      u.searchParams.set('t', t.toFixed(1));
      frame.src = u.href;
    }
  }));
}
