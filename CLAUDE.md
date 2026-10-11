# Explainer — заметки для Claude

- Новая тема или «объясни, как работает …» → скилл `explain` (`.claude/skills/explain/SKILL.md`); фигуры →
  скилл `anatomy` (`anatomy/SKILL.md`). Образец всех частей — `explainers/token-bucket/`.
- `anatomy/` — копия wheresryan22/anatomy на коммите `240a9bf`, не редактируем; свои изменения — в `video-kit/` и
  `explainers/`. Обновление из upstream — раздел «anatomy: сопровождение» в README.md (и обновить коммит здесь).
- Тексты, комментарии, коммиты — по-русски (как в коде video-kit); английский — только `text/en.js` и тексты en.
- Кадр ролика — чистая функция времени: никаких `Math.random`, `Date.now`, состояния между кадрами.
- Одна модель на всё: числа в кадре и на лендинге — только из `model.js`.
- Проверка — глазами: `make stills T=…` / `make stills-v T=… CC=1` в папке ролика, читать каждый PNG.
- Озвучка платная: `make voice` синтезирует только новые/изменённые реплики (кеш `voice/clips/`, не в git);
  всегда указывайте язык (`LNG=en`), чтобы не пересинтезировать всё.
- В git: исходники, `voice/<язык>.{m4a,json,vtt}`, `out/*.mp4`, `out/poster*.jpg`, `out/cover*.jpg`.
