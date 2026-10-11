/* Таймлайн ролика: сцены из film.js → абсолютное время сцен, реплик и звуков.
 * Работает и в браузере (stage/), и в Node (scripts/): без DOM и без часов.
 *
 * Сцена — { id, kicker, num, mood, build(s), html, draw(t, q, ctx) }.
 * build описывает время сцены через s и возвращает q — моменты, которые потом читает draw:
 *   s.say(text, {at})   реплика голоса → { t0, t1, dur, at(фрагмент) }; длительность — из
 *                       манифеста озвучки (voice/<язык>.json), без него — оценка по длине текста.
 *                       at('фрагмент') — когда примерно звучит этот кусок реплики (по доле текста);
 *                       voice: 'роль' — другой голос (voices в voice.config.json), например персонажа
 *   s.sfx(t, kind, arg) звуковой эффект (lib/sound.mjs)
 *   s.hold(t)           сцена длится минимум до t
 *   s.p(сек)            пауза с поправкой на темп языка (манифест озвучки: pace; 1 — как написано)
 * Реплики задают темп: после новой озвучки все действия сами встают на место.
 * Пауза между репликами — gap из манифеста (по умолчанию GAP). */

export const GAP = 0.35; // пауза между репликами
export const XF = 0.7; // перекрёстная смена сцен
export const estimate = (text) => 0.4 + text.length / 14;

// паузы на знаках препинания — «весят» как несколько букв
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
          if (i < 0) throw new Error(`нет «${part}» в реплике: ${text}`);
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

/** film + манифест озвучки → { scenes, events, duration } */
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

/** реплики ролика (для озвучки и субтитров) */
export const voiceLines = (tl) => tl.events.filter((e) => e.type === 'voice');
