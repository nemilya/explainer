/* {{NAME}} — the AI-image bible of the video ({{KIT}}/AI-ART.md). make art DRY=1 — plan and price, make art — generate.
 *
 * refs — reference sheets (characters, places): generated first, worth approving by eye (art/index.html).
 * shots — scene shots: each gets the sheets from its refs attached, the legend "Image 1 — …" is written automatically.
 * No text on the images: captions and numbers are HTML on top (film.js: shot('id'), ken()). */
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
