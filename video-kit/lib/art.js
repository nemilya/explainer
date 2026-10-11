/* AI images for a video (AI-ART.md): prompt builders for reference sheets in the project's art.js
 * and helpers for film.js scenes. Works both in Node (scripts/art.mjs) and in the browser.
 *
 *   character({ name, look })  a character turnaround sheet: four angles on a flat background
 *   place({ name, look })      a location or object sheet: one clean ¾ view, no characters
 *   shot('hook')               <img class="shot" src="art/shots/hook.jpg"> for scene markup */

const NO_TEXT = 'No text, no labels, no letters, no numbers, no logos, no watermark.';

/** a character turnaround sheet; look — the canonical appearance (it also goes into the shots' legend) */
export function character({ name, look, pose = 'neutral standing pose, arms relaxed', bg = 'plain flat light background', aspect = '3:2', ...rest }) {
  return {
    kind: 'character', name, look, aspect, ...rest,
    prompt: `Character reference sheet (turnaround) of ONE character — ${name}: ${look}. `
      + `Show the same character four times in a row, full body, evenly spaced, same scale: front view, three-quarter view, side profile, back view. `
      + `${pose}. ${bg}, soft even light, soft contact shadows. Nothing else in the picture. ${NO_TEXT}`,
  };
}

/** a location or object sheet: one ¾ view, fully in frame, no characters */
export function place({ name, look, view = 'three-quarter view from slightly above eye level, the whole object in frame', bg = 'plain flat light background', aspect = '3:2', ...rest }) {
  return {
    kind: 'place', name, look, aspect, ...rest,
    prompt: `Reference sheet of ONE ${rest.object ? 'object' : 'location'} — ${name}: ${look}. ${view}. `
      + `No characters, no people, no animals. ${bg}, soft even light. ${NO_TEXT}`,
  };
}

/** image path: refs/<id>.jpg or shots/<id>.jpg relative to the project folder */
export const artSrc = (id, dir = 'shots') => `art/${dir}/${id}.jpg`;

/** a shot's <img> for scene markup; cls — extra classes (position: .shot styles in base.css) */
export const shot = (id, cls = '', dir = 'shots') => `<img class="shot${cls ? ` ${cls}` : ''}" src="${artSrc(id, dir)}" alt="" decoding="sync">`;
