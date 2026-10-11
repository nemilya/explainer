# Videos made of AI images with recurring characters

**English** · [Русский](AI-ART.ru.md)

The concept and a how-to for videos whose frames are generated illustrations (a story with characters),
not only code-drawn infographics. The first such project is karkas-house in nemilya/infographics
("The Three Little Pigs 2.0").

## What changes compared with an infographic

| | Infographic | A video made of AI images |
|---|---|---|
| Frame | HTML/SVG drawn by code | an AI illustration + an HTML layer on top |
| Motion | every detail is animated | a slow zoom/pan (Ken Burns), a light shake, crossfades; details live in the HTML layer |
| Text in the frame | part of the layout | only HTML over the image: AI doesn't write Cyrillic reliably, and text must match the voice and be translatable |
| Source of truth | code | code + image files in git (generation is not deterministic: a good shot is an asset) |

Sound, subtitles, the player and rendering stay the same. Images are one more "cache" next to the voiced lines.

## The main problem — the same characters in every shot

The model draws every shot from scratch. If you just describe "a pink piglet in a hard hat", every shot gets a new
piglet. The fix is a **project bible** and **references**:

1. **Style** — one text fragment (technique, light, palette, "no text") appended to every prompt.
2. **Reference sheets (refs)** are generated first and approved by eye:
   - **a character** — a turnaround sheet: one character four times — front, ¾, side, back, on a neutral background.
     Plus a short canonical description `look` ("a pink piglet, a yellow hard hat, ginger overalls…");
   - **a location / object** — a "sheet" of the object from 2–3 angles (a timber-frame house, a brick building site).
3. **Shots** are generated with references: the sheet images are attached to the request, and a legend is written
   at the start of the prompt automatically: "Image 1 — Naf-Naf: <look>; Image 2 — … Keep their appearance exactly as
   in the references". A double binding — by image and by words.
4. **Dependencies.** A shot's fingerprint includes the contents of its reference files: regenerate a character sheet,
   and every shot with that character becomes stale (that is the consistency). A good shot that must not change is
   marked `lock: true` — then it is never regenerated, only flagged as stale.

Tested with Seedream 5.0 Flash (OpenRouter): a turnaround sheet 2048×1366 and a 9:16 shot 1152×2048 —
$0.018 and 20–40 s per image, up to 14 references per request. A character from a sheet carries over into a scene
recognizably (clothes, accessories, proportions).

### Practical prompt rules

- Tell characters apart by **silhouette and accessories** (a hard hat, glasses, a tablet, a cap), not by skin tone:
  clay piglets all have the same one.
- No more than 3–4 characters per shot; mention each by the name from the legend.
- Compose for vertical: "the main action in the lower two thirds, a calm top" — the title goes there; the bottom
  (≈330 px) is covered by the Reels interface and captions.
- Always: `no text, no letters, no logos` (numbers and captions go into HTML).
- Sheets — on a flat background in a palette color, without environment shadows: easier for the model to "cut out"
  the character.
- If a shot is needed "in halves" (a split screen), generate two images of the right format (`1:1`) rather than one
  with two halves.

## Pipeline

```
art.js (bible)  ──make art──►  art/refs/*.jpg ─┐   (sheets: review, fix, freeze)
                                                ├─► art/shots/*.jpg  ─► film.js (scenes) ─► make video-cc
                               art/art.json  ◄──┘   (fingerprints, seed, price; art/index.html — gallery)
```

1. **Bible** — the project's `art.js`: model, style, `refs` (characters, locations), `shots`.
2. `make art DRY=1` — what will be generated and what it costs; `make art` — generation
   (references before shots, up to 4 requests in parallel), only new and changed items.
3. Look at `art/index.html` (the gallery: sheets, shots, prompts, price; `make preview` → `/art/`).
4. Didn't like it:
   - fix the prompt → `make art` (it and everything depending on it is regenerated);
   - same prompt, another attempt → `make art-redo ID=hook` (a new seed; the old file goes to `art/takes/`);
   - choose among several → `make art-takes ID=hook N=3`, look in the gallery, then `make art-pick ID=hook SEED=…`.
5. Scenes (`film.js`) take images by id: `shot('hook')` → `<img class="shot" src="art/shots/hook.jpg">`,
   move them with `ken()` and put HTML captions, numbers and badges on top.
6. Voice-over, rendering, the cover — as usual (`make voice video-cc`, `make cover`).

Images are in git (`art/refs`, `art/shots`, `art/art.json`); `art/takes/` holds drafts and is not in git.

## The bible: `art.js`

```js
import { character, place } from '../../video-kit/lib/art.js';

const STYLE = 'cute 3D clay / plasticine animation style, soft studio light, pastel palette …';

export default {
  model: 'bytedance-seed/seedream-5-0-flash',
  resolution: '2K',
  style: STYLE,                       // appended to the end of every prompt
  refs: {
    nifnif: character({ name: 'Nif-Nif', look: 'chubby pink piglet, light-blue denim shirt …' }),
    house:  place({ name: 'frame house', look: 'modern Scandinavian frame house …' }),
  },
  shots: {
    hook: { aspect: '9:16', refs: ['nifnif', 'house'], prompt: 'Nif-Nif lies in a deck chair …' },
    // seed: 7 — pin it; lock: true — never regenerate; n: 'note' — a note in the gallery
  },
};
```

`character()` and `place()` (`lib/art.js`) build the sheet prompt; a sheet can also be described by hand
(`{ aspect: '3:2', prompt: '…' }`). Any item can have `refs` — for example, a group sheet "all characters side by
side" for scale, built from each character's sheet.

## Bringing still shots to life

- **Ken Burns** — `ken(img, t, t0, t1, { from: { s: 1.12, y: 3 }, to: { s: 1.02 } })`: a zoom in or out with a pan
  over the whole scene. The scale is at least 1, the offset (in % of the frame) — no more than the scale margin.
- **Accents on words** — as in an infographic: `s.sfx(a.at('barbecue'), 'pop')` + a badge, a number or an arrow
  appearing over the image at that moment.
- **Shake / hit** — a short offset of the image on a word ("blows" → `shake`).
- **Split screen** — two 1:1 images on top and bottom, with different zoom paths.
- **Badges** — text always sits on a backing (translucent or colored) so it reads on any image.

## Several voices

A line can go to another voice: `s.say('"It will blow away in the wind!"', { voice: 'wolf' })`, and in
`voice.config.json` — `"voices": { "wolf": { "voice": "Algenib", "instructions": "…" } }`.
Cache, transcription check and mixing work as for the main voice; the subtitles of such a phrase get the
`data-voice="wolf"` attribute (can be colored in `scenes.css`).
