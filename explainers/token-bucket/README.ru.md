# Почему API отвечает 429? — token bucket

[English](README.md) · **Русский** · **Вживую:** [explainer.nemilya.me/explainers/token-bucket/ru/](https://explainer.nemilya.me/explainers/token-bucket/ru/)

Explainer: алгоритм ограничения запросов token bucket, собранный как настоящая машина.

| Что | Где |
|---|---|
| бриф: вопросы, правда, объект, детали | [`QUESTIONS.ru.md`](QUESTIONS.ru.md) |
| модель (единственный источник чисел) | [`model.js`](model.js) — `simulate()` проигрывает события, `view(sim, t)` — положение каждой детали |
| фигура anatomy | [`figure.js`](figure.js) — `buildFigure()` → SVG и якоря, `mountFigure()` → `apply(view)` |
| лендинг | [`landing/`](landing) (шаблон + `i18n/en.mjs`, `ru.mjs`) + [`landing.js`](landing.js) — живая машина с кнопками, ролик, факты, код; собирается `make dist` в корне |
| ролик | [`video/`](video) — сценарий [`SCENARIO.ru.md`](video/SCENARIO.ru.md), `film.js`, тексты en/ru, озвучка, MP4 в `video/out/` |

Машина: магазин на 5 монет — ведро (ёмкость **b**); бункер с часами роняет монету раз в 2 с — пополнение
(**r** = 0,5/с); когда магазин полон, заслонка закрыта и лишняя монета уходит в стакан переполнения;
запрос на ленте получает нижнюю монету (лоток 200) или, без монеты, толкатель сбрасывает его в лоток 429.
За любые T секунд проходит не больше b + r·T запросов.
