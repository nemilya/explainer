# video-kit — narrated videos

**English** · [Русский](README.ru.md)

A video engine: scenes that come alive in sync with the voice,
plus an **anatomy figure layer** — the machine runs through the whole video, the camera moves onto its parts,
pin labels attach to them, and the hosts explain (one voice or a dialogue). The voice-over is
Gemini TTS through OpenRouter; music and sound effects are synthesized in code (no samples). Output:

- MP4 1920×1080 and vertical 1080×1920 (Reels, Shorts, Telegram), subtitles as a separate track;
- a vertical MP4 **with captions burned into the frame** — short phrases, the spoken word highlighted;
- an **interactive player** (the project's `index.html`): the video is drawn in the browser with sound, chapters,
  subtitles, a 16:9 / 9:16 switch and a language switch;
- a Reels cover 1080×1920 (everything important inside the 4:5 zone of the profile grid).

A finished example — [`../explainers/token-bucket/video`](../explainers/token-bucket/video) (a figure, a dialogue,
two formats, two languages).

## An anatomy figure in a video, and dialogue

- **`film.layers`** — persistent layers under the scenes: `[{ id, html({ v }), draw(t, tl, ctx) }]`, `t` — time from
  the start of the video, `tl.scenes` — the start, duration and `q` of every scene (the machine's schedule is built
  from them). A layer is drawn before the scenes, so the scenes can read what it computed (the camera, part positions).
- **`lib/figure.js`** — `camera(shots, anchors)` → a camera from shots `{ t, d, at, zoom, pos }` (smooth zooms along
  the log of the scale); `place(el, fig, box, cam)` puts the figure into the frame and returns `pin(anchor)` → frame
  pixels; `pinLabel(el, line, [x, y], k, { side, frame })` — a pin label (a dot, a line and a tag that never leaves
  the frame); `shown(t, a, b)` — label visibility.
- **`film.speakers`** — `[{ voice: '' | 'he', name, role }]`: "who is speaking" badges with a voice wave (at the top
  in the vertical frame); captions of the second voice's lines are marked with a color (`#cc[data-voice]`).
- A whole new topic (brief, model, figure, video, landing page): `node video-kit/scripts/new.mjs explainers/<slug> --title "…"`
  (the `template-explainer/` template); only a video in the old style — `--plain`.
- **`make web`** — light versions for the site (`scripts/web.mjs`): 720p (vertical 720×1280), CRF 28,
  AAC 96 kbit/s, `+faststart` → `out/web/` with the same names (≈5 MB instead of 17); `CRF=31 HEIGHT=540` — lighter.
- **Rendering without overheating a laptop:** on macOS the hardware VideoToolbox encoder by default (`ENC=sw` — x264),
  `ENC=hw` — NVENC on Linux/Windows, `THREADS=2`, `PAUSE=40` (ms between frames), `NICE=10` — lower priority for
  ffmpeg and Chromium (the default).
- The voice-over check understands numbers: transcription writes "429" as digits, so number words in the line are
  not compared then.

**Videos made of AI images** with recurring characters (character reference sheets → shots with them,
Seedream through OpenRouter) — [`AI-ART.md`](AI-ART.md).

## A new video

```bash
node video-kit/scripts/new.mjs explainers/my-topic --title "…"   # a whole explainer topic (template-explainer/)
node video-kit/scripts/new.mjs my-video --plain                    # only a video → my-video/video (--art — AI images)
cd explainers/my-topic/video
make preview      # the player in the browser (without a voice-over durations are estimated from the text)
# write the scenes (film.js), the texts (text/en.js, text/ru.js), the styles (scenes.css) — watch in the player
make voice video-cc            # voice-over in the main language + the Reels video → out/
make voice video-cc LNG=ru     # the same in Russian
make cover LNG=ru              # cover → out/cover-ru.jpg
```

Needs Node 22 and `ffmpeg`; once — `make install` (Playwright for rendering; the browser —
`npx playwright install chromium` if it is missing). Network and a key are needed only for `make voice`:
`export OPENROUTER_API_KEY=…` or a line `OPENROUTER_API_KEY = …` in the project's `local.mk` (not in git);
proxy — `OPENROUTER_PROXY = socks5h://…`. Only new or changed lines are synthesized (cache — the project's
`voice/clips/`); remix the audio without the network — `make mix`.

All targets — `make help` in the project folder. Language — `LNG=ru` (default — the first in `LANGS` in film.js).
Video quality — `CRF` (19 by default; AI images with a slow zoom are fine at 23, a third of the size):
`make video-cc CRF=23` or `CRF ?= 23` in the project's Makefile.

## A video project

```
<topic>/video/
  film.js            scenes: time (build), markup (html), frame animation (draw); export makeFilm(lang), LANGS
  text/<lang>.js     lines (say), animation cue words (cue), captions, the cover (cover), player labels (ui, ui.player)
  scenes.css         palette (:root tokens) and scene styles; vertical layout — #stage.v, room for captions — #stage.cc
  index.html         the player (loads video-kit/stage/base.css, scenes.css, video-kit/stage/stage.js)
  cover.html         the cover layout
  voice.config.json  voice, manner, tempo, music volume; name — video file name in out/; voices — other voices
  art.js             (optional) AI images: style, character sheets, shots — AI-ART.md
  art/               refs/, shots/ (images, in git), art.json (fingerprints, seed, price), index.html (gallery), takes/ (drafts)
  Makefile           KIT := ../../video-kit; include $(KIT)/video.mk
  voice/             <lang>.m4a (the track), .json (line durations), .vtt (subtitles), clips/ (cache, not in git)
  out/               <name>[-<lang>][-vertical][-captions].mp4, cover[-<lang>].jpg, poster*.jpg, web/ (make web)
```

### A scene

```js
{
  id: 'chain', kicker: 'Mechanism', num: '02', mood: 'drive',   // mood — music: calm | drive | dark | end
  theme: 'dark',                                                // scene background: dark | accent (optional)
  build(s) {                                                    // the scene's time
    const a = s.say('A voice line…');                           // → { t0, t1, dur, at('word') }
    s.sfx(a.at('line'), 'pop', 1);                              // a sound on a word
    s.hold(a.t1 + s.p(1.5));                                    // the scene lasts until…; s.p — a pause with the language's pace
    return { show: a.at('line') };                              // q — moments for draw
  },
  html: ({ v }) => `<h2 class="h2">…</h2>`,                     // markup (v — the vertical frame)
  draw(t, q, { $, $$, v }) { rise($('.h2'), t, q.show); },      // the frame at moment t — a pure function of time
}
```

Animation helpers (`lib/motion.js`): `rise`, `pop`, `fade`, `stroke` (drawing SVG lines with
`pathLength="1"`), `words` (word-by-word appearance), `setK` (strike-throughs/underlines through `--k`),
`css`, `seg`, `E` (easings), `rng` (a deterministic PRNG); for images — `ken` (zoom in, zoom out, pan)
and `shake`; `shot('id')` from `lib/art.js` — the `<img>` of the shot `art/shots/id.jpg`.
Images in scene markup are decoded before the first frame. Sounds (`lib/sound.mjs`): `whoosh`,
`swish`, `pop`, `tick`, `strike`, `impact`, `riser`, `bell`, `chime`.

The lines set the pace: animation is tied to the start and end of lines and to cue words
(`a.at('capital')` — estimated by the share of the text with pauses on punctuation), so after a new
voice-over everything falls into place by itself. Every new line is transcribed back and compared with the text
(missing words → synthesized again, up to 3 attempts).

A second voice (a character): `s.say('"It will blow away in the wind!"', { voice: 'wolf' })` and in
`voice.config.json` — `"voices": { "wolf": { "voice": "Algenib", "instructions": "…" } }` (overrides of the
main voice: `voice`, `instructions`, `tempo`, `speed`, `model`). The captions of such a line get
`#cc[data-voice="wolf"]`.

### Languages and pace

Texts — `text/<lang>.js`, listed in `TEXTS` in film.js (the first is the main one). Each language's voice is in
`voice.config.json`: the main one on top, `langs.<lang>` — overrides: `voice`, `instructions`, `tempo` (speeding up
the finished speech without changing pitch), `gap` (pause between lines, s), `pace` (multiplier for scene pauses —
`s.p()`), `language`, `verify.skip`. For fast-paced videos `tempo: 1.1, gap: 0.18, pace: 0.6` works well.

### The player

Space / K — pause, ← / → — 5 s, N / P — chapter, C — subtitles, M — sound, F — full screen; format (9:16 / 16:9)
and language buttons. A URL with `#v`, `#ru`, `#ru-v` opens that version, `?t=95` — from second 95. Button tooltips
are English by default and translated through `ui.player` in `text/<lang>.js`. The player is a static page: to
publish it, the project folder and `video-kit` must sit next to each other (in explainer `make dist` in the root does
this: the site with every player goes into `dist/`).

## How it works

```
video.mk            make targets for projects
stage/base.css      fonts, default tokens, frame, chapter labels, progress, subtitles, player
stage/stage.js      scenes and crossfades, chapter labels, phrase subtitles, layers, speakers, player; window.__video.seek(t)
lib/timeline.js     building the timeline: scenes → absolute times of lines and sounds
lib/motion.js       animation helpers — pure functions of time
lib/sound.mjs       synthesis of music and sound effects
lib/figure.js       an anatomy figure in a video: camera, place(), pin labels
scripts/voice.mjs   TTS → check by transcription → mixing voice, music and sounds → voice/
scripts/art.mjs     AI images: art.js → reference sheets → shots with them → art/ (AI-ART.md)
lib/openrouter.mjs  OpenRouter requests (key, proxy, retries) — for voice-over and images
lib/art.js          prompts for character and place sheets (character, place), shot('id') for scenes
scripts/render.mjs  Chromium captures frames (index.html?render) → ffmpeg → MP4; --cover — the cover
scripts/web.mjs     light 720p versions for the site → out/web/
scripts/serve.mjs   a local server for make preview (with Range — for seeking)
scripts/project.mjs the project folder, video name, languages — for the scripts
scripts/new.mjs     a new topic from template-explainer/ (or a video from template/ with --plain)
template-explainer/ topic stub: brief, model, anatomy figure, dialogue video, landing page
template/           a video stub without a figure: title, three points, verdict, finale
template-art/       art.js for videos made of AI images (new.mjs --art)
fonts/              Source Serif 4, Golos Text, JetBrains Mono (OFL)
```

Every frame is a function of time: `seek(t)` redraws the scenes at moment `t`. So rendering is frame by frame and
identical on every run, and the player seeks instantly. The render server serves the repo root (a project needs
video-kit too); no network is needed while rendering.
