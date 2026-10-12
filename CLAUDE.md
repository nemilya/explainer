# Explainer — notes for Claude

- A new topic or "explain how … works" → the `explain` skill (`.claude/skills/explain/SKILL.md`); figures → the
  `anatomy` skill (`anatomy/SKILL.md`). The reference for every part — `explainers/token-bucket/`.
- `anatomy/` is a copy of wheresryan22/anatomy at commit `240a9bf` — don't edit it; our changes go into `video-kit/`
  and `explainers/`. Updating from upstream — the "anatomy: keeping the copy up to date" section in README.md (then
  record the new commit here and in README.ru.md).
- **The repository is public and English-first.** Code, comments, messages and logs, documentation, templates and
  commit messages are in English. Russian is a translation next to the English original: `README.ru.md` and other
  `*.ru.md` (keep them in agreement with the English file), and content: `text/ru.js`, `i18n/ru.mjs`, the Russian
  voice instructions in `voice.config.json`.
- A video frame is a pure function of time: no `Math.random`, `Date.now`, no state between frames.
- One model for everything: numbers in the frame and on the landing page come only from `model.js`.
- Check by eye: `make stills T=…` / `make stills-v T=… CC=1` in the video folder, read every PNG.
- The voice-over is paid: `make voice` synthesizes only new/changed lines (cache `voice/clips/`, not in git);
  always pass the language (`LNG=ru`) so nothing is synthesized again needlessly.
- Languages: English is the main one (first in `site.mjs` and in the video's `TEXTS`), the others live in `ru/`
  subfolders. Content lines are written first in the language of the request, then adapted into the others —
  «Languages» in the `explain` skill.
- The site is built into `dist/` (`make dist`; not in git): pages from `landing/index.html` +
  `landing/i18n/<lang>.mjs`, plus only the files the browser needs (`assets()` in `explainers/build.mjs` — add new
  topic files there). Look — `make preview`, publish — copy `dist/` or `make deploy`. After changes — `make dist test`.
- After a new video render — `make web` in the video folder (light versions in `out/web/`), then `make dist`.
- In git: sources, `voice/<lang>.{m4a,json,vtt}`, `out/*.mp4`, `out/web/*`, `out/poster*.jpg`, `out/cover*.jpg`.
