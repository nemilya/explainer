# Explainer

**English** · [Русский](README.ru.md)

"How does it work" explainers, built in three forms from one model:

- **an interactive illustration** — an isometric machine made with [anatomy](https://github.com/wheresryan22/anatomy)
  (a copy lives in [`anatomy/`](anatomy/)), whose working *is* the idea;
- **a narrated video** — the camera moves onto parts of the running machine while the hosts explain it (one
  narrator or a "one asks, one explains" dialogue), in 16:9 and 9:16 with burned-in captions, in several
  languages — the [video-kit](video-kit/) engine;
- **a landing page** — the questions, the live machine with controls and counters, the video with chapters,
  the gist and the code.

**Example:** [`explainers/token-bucket`](explainers/token-bucket) — "Why does an API answer 429?": a token bucket
as a machine (a coin magazine is the bucket, a hopper clock is the refill, a request belt, trays for 200 and 429),
a ~2.5-minute dialogue between Vera and Max (English and Russian, horizontal and vertical), and a landing page
with the live model.

![A frame from the token bucket video](explainers/token-bucket/video/out/poster-en.jpg)

## Layout

```
anatomy/            isometric figure skill and kit — a copy of wheresryan22/anatomy @ 240a9bf (MIT), kept unmodified
video-kit/          video engine (from nemilya/infographics) + the figure layer: lib/figure.js (camera, pins),
                    film.layers and film.speakers in stage/stage.js; topic template — template-explainer/
explainers/
  landing.css       shared landing style
  <topic>/
    QUESTIONS.md    brief: questions, the truth (numbers), the object, parts, scenes
    model.js        the model — the single source of every number, pure functions of time
    figure.js       anatomy figure: buildFigure() → SVG and anchors, mountFigure() → apply(state)
    index.html      landing page (+ landing.js)
    video/          film.js, text/<lang>.js, scenes.css, voice.config.json, SCENARIO.md, voice/, out/
index.html          topic catalog
.claude/skills/     explain — how to build a topic; anatomy — link to the figure skill
```

The key idea is **one model for everything**: `model.js` plays the events, `figure.js` places the parts from the
state, the video draws each frame as a function of time (frame-by-frame rendering, instant seeking), and the
landing page runs the same model live. The machine's schedule in the video is built from the lines: an event
happens exactly on the word that names it, and after a new voice-over everything lands in place again.

## A new topic

In Claude Code: `/explain how … works` (the [`.claude/skills/explain`](.claude/skills/explain/SKILL.md) skill).
By hand:

```bash
node video-kit/scripts/new.mjs explainers/my-topic --title "How … works"   # stubs for every part
cd explainers/my-topic/video
make preview                       # video player: http://127.0.0.1:8790/explainers/my-topic/video/
make voice && make voice LNG=en    # voice-over (OPENROUTER_API_KEY)
make video video-cc                # MP4 16:9 and 9:16 with captions → out/
make video video-cc LNG=en
make cover && make cover LNG=en    # Reels covers
```

The landing pages and the catalog are static: serve the repository root with any local server (for example
`node video-kit/scripts/serve.mjs` from the root → http://127.0.0.1:8790/) or publish it on GitHub Pages.

## anatomy: keeping the copy up to date

[`anatomy/`](anatomy/) is a vendored copy of [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) at
commit **`240a9bf`**, unmodified (our changes go only to `video-kit/` and `explainers/`). To update it from upstream:

```bash
git clone https://github.com/wheresryan22/anatomy /tmp/anatomy
git -C /tmp/anatomy log --oneline 240a9bf..HEAD                    # what changed since our copy
git -C /tmp/anatomy diff --stat 240a9bf..HEAD -- kit SKILL.md references
rsync -a --delete --exclude .git /tmp/anatomy/ anatomy/              # take the new version
```

Afterwards check that the figures still build (`explainers/*/figure.js` import `anatomy/kit/iso-kit.mjs`), look at
stills (`make stills`), and record the new commit here, in `README.ru.md` and in `CLAUDE.md`.

## Requirements

Node 22 and `ffmpeg`; for rendering — Playwright (`make install` in a video folder) and Chromium. An OpenRouter
key is needed only for the voice-over: `export OPENROUTER_API_KEY=…` or `OPENROUTER_API_KEY = …` in the video's
`local.mk` (not in git).

## Licenses

`anatomy/` — MIT (© wheresryan22, see [`anatomy/LICENSE`](anatomy/LICENSE)). Fonts in `video-kit/fonts/` — OFL.
