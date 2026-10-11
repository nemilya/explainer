# Explainer

[English](README.md) · **Русский**

Объяснения «как это работает» в трёх видах из одной модели:

- **интерактивная иллюстрация** — изометрическая машина на ките [anatomy](https://github.com/wheresryan22/anatomy) (копия в [`anatomy/`](anatomy/)),
  чьё устройство *и есть* идея;
- **ролик с озвучкой** — камера наезжает на детали машины, а ведущие объясняют (один голос или диалог
  «спрашивает — объясняет»), 16:9 и 9:16 с субтитрами в кадре, на нескольких языках — движок [video-kit](video-kit/);
- **лендинг** — вопросы, живая машина с кнопками и счётчиками, ролик с главами, суть и код.

**Пример:** [`explainers/token-bucket`](explainers/token-bucket) — «Почему API отвечает 429?»: token bucket
в железе (магазин монет — ведро, часы бункера — пополнение, лента запросов, лотки 200 и 429), ролик-диалог
Веры и Макса на ~2,5 минуты (ru и en, горизонтальный и вертикальный), лендинг с живой моделью.

![Кадр ролика token bucket](explainers/token-bucket/video/out/poster.jpg)

## Как устроено

```
anatomy/            скилл и кит изометрических фигур — копия wheresryan22/anatomy @ 240a9bf (MIT), не правим
video-kit/          движок роликов (из nemilya/infographics) + слой фигуры: lib/figure.js (камера, булавки),
                    film.layers и film.speakers в stage/stage.js; шаблон темы — template-explainer/
explainers/
  landing.css       общий стиль лендингов
  <тема>/
    QUESTIONS.md    бриф: вопросы, правда (числа), объект, детали, сцены
    model.js        модель — единственный источник чисел, чистые функции времени
    figure.js       фигура anatomy: buildFigure() → SVG и якоря, mountFigure() → apply(состояние)
    index.html      лендинг (+ landing.js)
    video/          film.js, text/<язык>.js, scenes.css, voice.config.json, SCENARIO.md, voice/, out/
index.html          каталог тем
.claude/skills/     explain — порядок работы над темой; anatomy — ссылка на скилл фигур
```

Ключевая идея — **одна модель на всё**: `model.js` проигрывает события, `figure.js` ставит детали по
состоянию, ролик рисует кадр как функцию времени (покадровый рендер, мгновенная перемотка), лендинг крутит
ту же модель вживую. Расписание машины в ролике строится от реплик: событие случается ровно на слове, которым
о нём говорят, и после новой озвучки всё встаёт на место само.

## Новая тема

В Claude Code: `/explain как работает …` (скилл [`.claude/skills/explain`](.claude/skills/explain/SKILL.md)).
Вручную:

```bash
node video-kit/scripts/new.mjs explainers/my-topic --title "Как работает …"   # заготовка всех частей
cd explainers/my-topic/video
make preview                       # плеер ролика: http://127.0.0.1:8790/explainers/my-topic/video/
make voice && make voice LNG=en    # озвучка (OPENROUTER_API_KEY)
make video video-cc                # MP4 16:9 и 9:16 с субтитрами → out/
make video video-cc LNG=en
make cover && make cover LNG=en    # обложки Reels
```

Лендинг и каталог — статические страницы: откройте `index.html` через любой локальный сервер из корня
(например, `node video-kit/scripts/serve.mjs` из корня → http://127.0.0.1:8790/) или выложите репозиторий на
GitHub Pages.

## anatomy: сопровождение

`anatomy/` — копия [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) на коммите **`240a9bf`**, без
изменений (наши правки — только в `video-kit/` и `explainers/`). Обновить из мастер-репозитория:

```bash
git clone https://github.com/wheresryan22/anatomy /tmp/anatomy
git -C /tmp/anatomy log --oneline 240a9bf..HEAD             # что изменилось с нашей версии
git -C /tmp/anatomy diff --stat 240a9bf..HEAD -- kit SKILL.md references
rsync -a --delete --exclude .git /tmp/anatomy/ anatomy/       # взять новую версию
```

После обновления — проверить, что фигуры собираются (`explainers/*/figure.js` импортируют
`anatomy/kit/iso-kit.mjs`), посмотреть кадры (`make stills`), и записать новый коммит здесь и в `CLAUDE.md`.

## Требования

Node 22, `ffmpeg`; для рендера — Playwright (`make install` в папке ролика) и Chromium. Ключ OpenRouter нужен
только для озвучки: `export OPENROUTER_API_KEY=…` или `OPENROUTER_API_KEY = …` в `local.mk` ролика (не в git).

## Лицензии

`anatomy/` — MIT (© wheresryan22, см. `anatomy/LICENSE`). Шрифты в `video-kit/fonts/` — OFL.
