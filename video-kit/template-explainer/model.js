/* {{TITLE}} — модель: единственный источник правды для фигуры, ролика и лендинга.
 * Чистые функции времени: state(t) не помнит прошлых кадров (рендер ролика — покадровый, с перемоткой).
 * Замените заготовку («каретка ездит между упорами») настоящей моделью из QUESTIONS.md. */
export const MODEL = { from: -60, to: 60, period: 6 };

const smooth = (k) => k * k * (3 - 2 * k);

/** положение каретки в момент t: туда-обратно за period секунд */
export function state(t, m = MODEL) {
  const phase = ((t % m.period) + m.period) % m.period / m.period;
  const k = phase < 0.5 ? smooth(phase * 2) : smooth(2 - phase * 2);
  const x = m.from + (m.to - m.from) * k;
  return { x, reading: Math.round(((x - m.from) / (m.to - m.from)) * 100) };
}
