# Video: {{NAME}}

A narrated video. Engine — `{{KIT}}` (see its README.md).

```bash
make voice video-cc          # voice-over (the main language) + a vertical video with captions → out/
make voice video-cc LNG=ru   # the same in Russian
make cover LNG=ru            # Reels cover → out/cover-ru.jpg
make preview                 # the interactive player in the browser
make help                    # all targets
```

| What | Where |
|---|---|
| lines, cue words, captions | `text/<lang>.js` |
| scenes: time, markup, animation | `film.js` |
| palette and scene styles (and the vertical layout) | `scenes.css` |
| voice, manner, pace, music | `voice.config.json` |
| cover | `cover.html` + `cover` in `text/<lang>.js` |
