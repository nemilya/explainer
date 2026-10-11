/* {{NAME}} — библия ИИ-картинок ролика ({{KIT}}/AI-ART.md). make art DRY=1 — план и цена, make art — генерация.
 *
 * refs — листы-референсы (герои, места): генерируются первыми, их стоит одобрить глазами (art/index.html).
 * shots — кадры сцен: к каждому прикладываются листы из его refs, легенда «Image 1 — …» пишется сама.
 * Текста на картинках нет: надписи и цифры — HTML поверх (film.js: shot('id'), ken()). */
import { character, place } from '{{KIT}}/lib/art.js';

const STYLE = 'cute 3D clay / plasticine look, soft warm studio lighting, pastel palette, kind and playful. '
  + 'No text, no letters, no numbers, no logos.';
const VERTICAL = 'Vertical 9:16 composition: the action in the lower two thirds, the upper third calm and uncluttered.';

export default {
  model: 'bytedance-seed/seedream-5-0-flash',
  resolution: '2K',
  style: STYLE,
  refs: {
    hero: character({ name: 'the Hero', look: 'describe the character: species, build, clothes, accessories, colours' }),
    home: place({ name: 'the house', look: 'describe the place or object' }),
  },
  shots: {
    opening: { refs: ['hero', 'home'], prompt: `The Hero (image 1) waves in front of the house (image 2). ${VERTICAL}` },
  },
};
