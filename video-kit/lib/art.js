/* ИИ-картинки ролика (AI-ART.md): сборщики промптов листов-референсов для art.js проекта
 * и помощники для сцен film.js. Работает и в Node (scripts/art.mjs), и в браузере.
 *
 *   character({ name, look })  лист разворота персонажа: четыре ракурса на плоском фоне
 *   place({ name, look })      лист локации или предмета: один чистый ракурс ¾, без героев
 *   shot('hook')               <img class="shot" src="art/shots/hook.jpg"> для вёрстки сцены */

const NO_TEXT = 'No text, no labels, no letters, no numbers, no logos, no watermark.';

/** лист разворота (turnaround) персонажа; look — канон внешности (он же попадает в легенду кадров) */
export function character({ name, look, pose = 'neutral standing pose, arms relaxed', bg = 'plain flat light background', aspect = '3:2', ...rest }) {
  return {
    kind: 'character', name, look, aspect, ...rest,
    prompt: `Character reference sheet (turnaround) of ONE character — ${name}: ${look}. `
      + `Show the same character four times in a row, full body, evenly spaced, same scale: front view, three-quarter view, side profile, back view. `
      + `${pose}. ${bg}, soft even light, soft contact shadows. Nothing else in the picture. ${NO_TEXT}`,
  };
}

/** лист локации или предмета: один ракурс ¾, целиком в кадре, без персонажей */
export function place({ name, look, view = 'three-quarter view from slightly above eye level, the whole object in frame', bg = 'plain flat light background', aspect = '3:2', ...rest }) {
  return {
    kind: 'place', name, look, aspect, ...rest,
    prompt: `Reference sheet of ONE ${rest.object ? 'object' : 'location'} — ${name}: ${look}. ${view}. `
      + `No characters, no people, no animals. ${bg}, soft even light. ${NO_TEXT}`,
  };
}

/** путь к картинке: refs/<id>.jpg или shots/<id>.jpg относительно папки проекта */
export const artSrc = (id, dir = 'shots') => `art/${dir}/${id}.jpg`;

/** <img> кадра для вёрстки сцены; cls — дополнительные классы (позиция: стили .shot в base.css) */
export const shot = (id, cls = '', dir = 'shots') => `<img class="shot${cls ? ` ${cls}` : ''}" src="${artSrc(id, dir)}" alt="" decoding="sync">`;
