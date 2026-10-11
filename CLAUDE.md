# Explainer — заметки для Claude

- Новая тема или «объясни, как работает …» → скилл `explain` (`.claude/skills/explain/SKILL.md`); фигуры →
  скилл `anatomy` (`anatomy/SKILL.md`). Образец всех частей — `explainers/token-bucket/`.
- `anatomy/` — копия wheresryan22/anatomy на коммите `240a9bf`, не редактируем; свои изменения — в `video-kit/` и
  `explainers/`. Обновление из upstream — раздел «anatomy: keeping the copy up to date» в README.md (и обновить коммит
  здесь и в README.ru.md).
- README.md — на английском (основной), README.ru.md — русская версия; держать их в согласии.
- Комментарии в коде и коммиты — по-русски (как в коде video-kit); английский — `text/en.js`, тексты en и README.md.
- Кадр ролика — чистая функция времени: никаких `Math.random`, `Date.now`, состояния между кадрами.
- Одна модель на всё: числа в кадре и на лендинге — только из `model.js`.
- Проверка — глазами: `make stills T=…` / `make stills-v T=… CC=1` в папке ролика, читать каждый PNG.
- Озвучка платная: `make voice` синтезирует только новые/изменённые реплики (кеш `voice/clips/`, не в git);
  всегда указывайте язык (`LNG=en`), чтобы не пересинтезировать всё.
- Языки: основной — английский (первый в `site.mjs` и в `TEXTS` ролика), остальные — подпапки `ru/`. Страницы
  (`index.html`, `ru/index.html` у каталога и тем, `sitemap.xml`) собираются `make landing` из `landing/index.html` +
  `landing/i18n/<язык>.mjs` — руками их не править; после правки текстов — `make landing test`.
- После нового рендера ролика — `make web` в папке ролика (лёгкие версии в `out/web/`), потом `make landing`.
- В git: исходники, собранные страницы, `voice/<язык>.{m4a,json,vtt}`, `out/*.mp4`, `out/web/*`, `out/poster*.jpg`,
  `out/cover*.jpg`.
