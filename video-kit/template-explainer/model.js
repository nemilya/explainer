/* {{TITLE}} — the model: the single source of truth for the figure, the video and the landing page.
 * Pure functions of time: state(t) remembers no past frames (the video renders frame by frame, with seeking).
 * Replace the stub ("a carriage moving between stops") with the real model from QUESTIONS.md. */
export const MODEL = { from: -60, to: 60, period: 6 };

const smooth = (k) => k * k * (3 - 2 * k);

/** carriage position at moment t: there and back over `period` seconds */
export function state(t, m = MODEL) {
  const phase = ((t % m.period) + m.period) % m.period / m.period;
  const k = phase < 0.5 ? smooth(phase * 2) : smooth(2 - phase * 2);
  const x = m.from + (m.to - m.from) * k;
  return { x, reading: Math.round(((x - m.from) / (m.to - m.from)) * 100) };
}
