# Видео: {{NAME}}

Ролик с озвучкой по инфографике `../index.html`. Движок — `{{KIT}}` (описание там же в README.md).

```bash
make voice video-cc          # озвучка (основной язык) + вертикальный ролик с субтитрами → out/
make voice video-cc LNG=en   # то же по-английски
make cover LNG=en            # обложка для Reels → out/cover-en.jpg
make preview                 # интерактивный плеер в браузере
make help                    # все цели
```

| Что | Где |
|---|---|
| реплики, слова-якоря, надписи | `text/<язык>.js` |
| сцены: время, вёрстка, анимация | `film.js` |
| палитра и стили сцен (и вертикальная раскладка) | `scenes.css` |
| голос, манера, темп, музыка | `voice.config.json` |
| обложка | `cover.html` + `cover` в `text/<язык>.js` |
