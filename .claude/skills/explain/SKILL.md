---
name: explain
description: Make an explainer in this repository — from a list of questions about something to an interactive isometric figure (anatomy), a narrated video (one narrator or a two-person dialogue) in 16:9 and 9:16, in several languages, and a landing page that brings the figure, the video and the explanation together. Use when the user asks to explain how something works, wants an explainer, a video explanation, an interactive illustration with a video, or a new topic in explainers/.
---

# Explain

An explainer here is four things built from **one model**:

1. **Brief** — `QUESTIONS.md`: the questions, the viewer, the truth (real numbers), the object, the parts list, the scene table.
2. **Figure** — an anatomy machine whose working *is* the idea (`figure.js`), driven by a pure model (`model.js`).
3. **Video** — `video/`: scenes over a persistent figure layer, camera moves onto parts, pins, counters, charts; voice by Gemini TTS through OpenRouter; dialogue of two voices when it helps (he asks, she explains); 16:9, 9:16 with burned captions; en (main) + ru (or any languages).
4. **Landing** — `landing/` (template + `i18n/en.mjs`, `ru.mjs`) built by `make dist` into `dist/` — the folder copied to the hosting: hero with the questions, the live figure with controls and readout, the video (MP4 or live player) with chapters, the facts, optional code. Language auto-pick and URLs per language — see README «Languages».

Reference implementation: `explainers/token-bucket/` (read it before starting — model, figure, film, landing).

## Workflow

Run `date` at the start and at each step; tell the user the size (anatomy's Figure / Hero) and the estimate first.

1. **Scaffold.** `make new SLUG=<slug> TITLE="<title>"` (= `node video-kit/scripts/new.mjs explainers/<slug> --title …`). It creates a working stub of all four parts (a carriage on rails) — the page and the video open at once.
2. **Brief first** (`QUESTIONS.md`). Collect the truth: numbers, thresholds, formulas. Invent the object — read `anatomy/SKILL.md` ("The one idea that matters"): a real machine whose mechanism maps one-to-one onto the concept, never boxes and arrows. Parts list of 40–80 parts. Draft the scene table: who says what, what the machine does, where the camera goes.
3. **Model** (`model.js`). Pure functions of time, no `Math.random`, no clocks: the video seeks to any frame. Pattern from token-bucket: `simulate(events)` once → `view(sim, t)` returns where every moving part is. Every number in the readout, pins and counters comes from it.
4. **Figure** (`figure.js`) with the anatomy kit (`anatomy/kit/iso-kit.mjs`, API in `anatomy/references/kit.md`, craft in `anatomy/references/craft.md`). Export `buildFigure()` → `{ svg, P, W, H, anchors, parts }` and `mountFigure(svg, fig)` → `{ apply(view) }`. Static parts are strings built once; moving parts are `<g data-l="…">` layers placed in painter's order and filled per frame (`translateAlong`, `innerHTML` only when changed). `anchors` are named viewBox points for the camera and pins. Check it at 1× and zoomed (camera zooms 2–3× in the video), light theme.
5. **Script** (`video/text/<lang>.js`, `video/SCENARIO.md`). Lines `[who, text]`: `'she'` — the main voice, `'he'` — `voices.he` in `voice.config.json`. Questions come from the viewer's side, answers point at the machine. Numbers and letters spelled out for the voice ("four twenty-nine", "b"; in the Russian lines — in Russian words), digits on screen. `cue` words must appear verbatim in the lines — animation hooks onto them. Same keys in every language; which language to write first — see «Languages» below.
6. **Film** (`video/film.js`): `layers: [{ id: 'machine', html, draw(t, tl, ctx) }]` — the machine runs through the whole video; its schedule is built from scene cues (`tl.scenes[i].start + q.cue`), so after a new voice-over everything lands on the words again. Camera: `camera(shots)` + `place()` from `video-kit/lib/figure.js`; pins: `pinLabel(…, { frame })`. Scenes only add text, pins, counters, charts. Layout for both formats in `scenes.css` (`#stage.v`).
7. **Look before voicing.** `make stills T=…` and `make stills-v T=… CC=1` (or the scratch stills script) — read every PNG: pins inside the frame, nothing under the chapter kicker or captions, the machine shows what the line says at that moment.
8. **Voice** (`OPENROUTER_API_KEY`; paid — only changed lines are synthesized): `make voice`, `make voice LNG=en`. Then check stills again with real timings.
9. **Render**: `make video video-cc` (+ `LNG=ru`), `make cover` (+ `LNG=ru`), then `make web` (720p versions for the site). About 8 frames/s in a cloud container: a 2.5-minute video ≈ 8 minutes per format — run in the background. On a laptop: hardware encoder on macOS by default, `THREADS=2`, `PAUSE=40`, lower priority (`NICE`).
10. **Landing.** English is the main language. Texts go into `landing/i18n/<lang>.mjs` (identical keys), markup into `landing/index.html` (`{{key}}`, `<!--if video-->`, `<!--each list-->`), strings for scripts into the `js` object; `landing.js` drives the live figure with controls on the same model (token-bucket: request, burst, rate) and an idle tour. `make dist` builds the site into `dist/` (pages `index.html` (en) and `ru/index.html`, adds the topic card to the catalog (`card.*` keys) and the sitemap; the video block uses `out/web/` (else `out/`, else the live player) and chapters from the film's timeline); a topic file the browser needs beyond `*.js`/`*.css` in the topic root goes into `assets()` in `explainers/build.mjs`. `make preview` to look, `make test` checks for broken links in `dist/`.
11. **Commit** (messages in English) the sources (not `dist/`), `voice/<lang>.{m4a,json,vtt}`, `out/*.mp4`, `out/web/*`, posters and covers (`voice/clips/` and stills stay out of git).

## Languages

Three different things — don't mix them:

1. **Conversation** — answer the user in the language they write in.
2. **Repository** — always English, whatever the language of the conversation: code, comments, messages, docs (`QUESTIONS.md`, `video/SCENARIO.md`, READMEs) and commit messages. A Russian translation, when wanted, goes next to the original as `*.ru.md`.
3. **Content** — `video/text/<lang>.js`, `landing/i18n/<lang>.mjs`, the voice instructions in `voice.config.json`: languages of the video and the site, not of the code.
   - **Set.** By default a topic gets `en` + `ru`, as in the template. English always exists — the site builds every topic in every locale of `site.mjs`. Another language only when asked (README «Languages» → "A new language").
   - **Order.** English is the main one: first in `TEXTS` and `site.mjs`, the root URL and `x-default`, `out/<name>.mp4` without a suffix. This does not depend on the language the lines were written in first.
   - **Source.** The lines are written first in the language of the request; the other languages are an adaptation of them, not a word-for-word translation: same keys, scenes and beats, but their own natural phrasing, their own `cue` words and numbers spelled out in that language. A request in Russian with no language named → write `text/ru.js` and `i18n/ru.mjs` first, show them to the user, then adapt into `en.js` / `en.mjs`; `QUESTIONS.md` and `SCENARIO.md` stay in English (plus `*.ru.md` for the user to read). A request in English → the other way round. A request in another language → ask which languages the topic gets.
   - **Voice.** Voice the source language first, check the stills with real timings, then the others — every language has its own timing, and the machine lands on its own words.
   - What the user says explicitly ("English only for now", "start with Russian") wins over these defaults.

## Rules that keep it honest

- One model for everything: no number on screen that the model didn't produce.
- Frames are pure functions of time (`window.__video.seek(t)`): no state carried between frames, no timers.
- Video text is commentary *over* the machine; the figure itself keeps anatomy's rule — no labels inside the drawing except one engraved plate.
- If a line describes an event ("while they ride, one more coin drops"), schedule the machine so it really happens then, and verify with the model (see `debug()` in token-bucket `film.js`).
