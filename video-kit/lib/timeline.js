/* Video timeline: scenes from film.js → absolute times of scenes, lines and sound effects.
 * Works both in the browser (stage/) and in Node (scripts/): no DOM and no clocks.
 *
 * A scene — { id, kicker, num, mood, build(s), html, draw(t, q, ctx) }.
 * build describes the scene's time through s and returns q — the moments draw reads later:
 *   s.say(text, {at})   a voice line → { t0, t1, dur, at(fragment) }; duration — from
 *                       the voice-over manifest (voice/<lang>.json), without it — estimated from the text length.
 *                       at('fragment') — roughly when this piece of the line is heard (by its share of the text);
 *                       voice: 'role' — another voice (voices in voice.config.json), e.g. a character
 *   s.sfx(t, kind, arg) a sound effect (lib/sound.mjs)
 *   s.hold(t)           the scene lasts at least until t
 *   s.p(sec)            a pause adjusted for the language's pace (voice-over manifest: pace; 1 — as written)
 * The lines set the pace: after a new voice-over every action falls into place by itself.
 * Pause between lines — gap from the manifest (GAP by default). */

export const GAP = 0.35; // pause between lines
export const XF = 0.7; // scene crossfade
export const estimate = (text) => 0.4 + text.length / 14;

// pauses on punctuation "weigh" as several letters
const weight = (s) => s.length + 5 * (s.match(/[,.:;!?—…]/g) || []).length;

function builder(durOf, { gap = GAP, pace = 1 } = {}) {
  const ev = [];
  let voiceEnd = 0;
  let last = 0;
  const push = (e) => { ev.push(e); last = Math.max(last, e.t + (e.dur || 0)); return e; };
  const s = {
    events: ev,
    get last() { return last; },
    say(text, { at = 0.5, voice } = {}) {
      const t0 = Math.max(at, voiceEnd ? voiceEnd + gap : at);
      const dur = durOf(text);
      push({ type: 'voice', t: t0, dur, text, ...(voice ? { voice } : {}) });
      voiceEnd = t0 + dur;
      const W = weight(text);
      return {
        t0, t1: t0 + dur, dur, text,
        at(part, off = 0) {
          const i = text.indexOf(part);
          if (i < 0) throw new Error(`no "${part}" in the line: ${text}`);
          return t0 + dur * (weight(text.slice(0, i)) / W) + off;
        },
      };
    },
    sfx(t, kind, arg) { push({ type: 'sfx', t, kind, arg }); return t; },
    hold(t) { last = Math.max(last, t); return t; },
    p: (x) => x * pace,
  };
  return s;
}

/** film + voice-over manifest → { scenes, events, duration } */
export function compile(film, voice = null) {
  const lines = voice?.lines ?? {};
  const durOf = (text) => lines[text]?.dur ?? estimate(text);
  const scenes = [];
  const events = [];
  let start = 0;
  const pacing = { gap: voice?.gap ?? GAP, pace: voice?.pace ?? 1 };
  film.scenes.forEach((sc, i) => {
    const s = builder(durOf, pacing);
    const q = sc.build ? sc.build(s) ?? {} : {};
    const dur = Math.max(sc.min ?? 0, s.last + s.p(sc.tail ?? 0.8));
    scenes.push({ id: sc.id, kicker: sc.kicker ?? null, num: sc.num ?? null, mood: sc.mood ?? 'calm', start, dur, q });
    for (const e of s.events) events.push({ ...e, scene: i, t: start + e.t });
    if (i > 0) events.push({ type: 'sfx', t: start + 0.02, kind: 'whoosh', scene: i });
    start += dur;
  });
  events.sort((a, b) => a.t - b.t);
  return { scenes, events, duration: start };
}

/** the video's lines (for voice-over and subtitles) */
export const voiceLines = (tl) => tl.events.filter((e) => e.type === 'voice');
