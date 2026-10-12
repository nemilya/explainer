# Why does an API answer 429? — token bucket

**English** · [Русский](README.ru.md) · **Live:** [explainer.nemilya.me/explainers/token-bucket/](https://explainer.nemilya.me/explainers/token-bucket/)

An explainer: the token bucket rate-limiting algorithm built as a real machine.

| What | Where |
|---|---|
| brief: questions, the truth, the object, the parts | [`QUESTIONS.md`](QUESTIONS.md) |
| the model (the single source of every number) | [`model.js`](model.js) — `simulate()` plays the events, `view(sim, t)` — the position of every part |
| the anatomy figure | [`figure.js`](figure.js) — `buildFigure()` → SVG and anchors, `mountFigure()` → `apply(view)` |
| the landing page | [`landing/`](landing) (template + `i18n/en.mjs`, `ru.mjs`) + [`landing.js`](landing.js) — the live machine with buttons, the video, facts, code; built by `make dist` in the root |
| the video | [`video/`](video) — the script [`SCENARIO.md`](video/SCENARIO.md), `film.js`, en/ru texts, voice-over, MP4s in `video/out/` |

The machine: a magazine of 5 coins is the bucket (capacity **b**); a hopper with a clock drops a coin every 2 s — the
refill (**r** = 0.5/s); when the magazine is full, the flap is closed and an extra coin rolls into the overflow cup;
a request on the belt gets the bottom coin (the 200 tray) or, with no coin left, the kicker pushes it into the 429 tray.
In any T seconds at most b + r·T requests get through.
