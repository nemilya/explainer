# video-kit: общие цели для роликов. Makefile проекта:
#     KIT := ../../video-kit
#     include $(KIT)/video.mk
# Нужны: Node 22, ffmpeg, Chromium через Playwright (make install). Ключ OpenRouter — в окружении
# (OPENROUTER_API_KEY) или в local.mk проекта; нужен только для make voice.
# Не перегревать ноутбук при рендере: на Mac по умолчанию аппаратный кодек (ENC=sw — x264),
# THREADS=2 — x264 в 2 потока, PAUSE=40 — пауза между кадрами (мс), NICE=10 — приоритет ниже (по умолчанию).
export ENC THREADS PAUSE NICE HEIGHT
-include local.mk
export OPENROUTER_API_KEY OPENROUTER_PROXY
# качество H.264 при рендере (scripts/render.mjs): CRF ?= 19 — можно задать в Makefile проекта
export CRF
# язык: make voice video-cc LNG=en  (по умолчанию — первый язык из LANGS в film.js)
LNG ?=
L := $(if $(LNG),--lang $(LNG))
NODE := node $(KIT)/scripts

.PHONY: help install voice mix video video-v video-cc web cover stills stills-v poster ask preview all clean

help:  ## список целей
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'

install:  ## Playwright для рендера (+ npx playwright install chromium, если браузера нет)
	npm install --prefix $(KIT) --no-audit --no-fund

voice:  ## озвучка (OpenRouter, Gemini TTS) + музыка и звуки → voice/<язык>.m4a, .json, .vtt
	$(NODE)/voice.mjs $(L)

mix:  ## только пересвести звук из кеша реплик (без сети и ключа)
	$(NODE)/voice.mjs --mix $(L)

video:  ## MP4 1920×1080 → out/<имя>[-en].mp4
	$(NODE)/render.mjs $(L)

video-v:  ## вертикальный MP4 1080×1920 → out/<имя>[-en]-vertical.mp4
	$(NODE)/render.mjs --vertical $(L)

video-cc:  ## вертикальный MP4 с субтитрами в кадре (Reels, Shorts) → out/<имя>[-en]-vertical-captions.mp4
	$(NODE)/render.mjs --vertical --captions $(L)

web:  ## лёгкие версии для сайта (720p, CRF 28) → out/web/ (LNG=en — один язык; CRF=31 HEIGHT=540 — легче)
	$(NODE)/web.mjs $(L)

cover:  ## обложка для Reels 1080×1920 (cover.html проекта) → out/cover[-en].jpg
	$(NODE)/render.mjs --cover $(L)

stills:  ## кадры для проверки: make stills T=3,20,41 → out/still-*.png
	$(NODE)/render.mjs --stills $(T) $(L)

stills-v:  ## вертикальные кадры: make stills-v T=3,20,41 (CC=1 — с субтитрами)
	$(NODE)/render.mjs --vertical --stills $(T) $(if $(CC),--captions) $(L)

poster:  ## только кадр-превью out/poster*.jpg
	$(NODE)/render.mjs --poster $(L)

ask:  ## вопрос vision-модели по кадру: make ask IMG=out/still-3.png Q="что на кадре?"
	$(NODE)/vision.mjs $(IMG) "$(Q)"

preview:  ## интерактивный плеер (адрес напечатает; ?t=секунда; #v, #en, #en-v)
	$(NODE)/serve.mjs 8790

all: voice video-cc  ## озвучка и ролик для Reels заново (для языка LNG)

clean:  ## удалить кадры проверки и частичные рендеры
	rm -f out/still-*.png out/part-*.mp4

# ---------------------------------------------------------------- ИИ-картинки (art.js проекта, AI-ART.md)
.PHONY: art art-redo art-takes art-pick art-gallery
ID ?=
N ?= 3
SEED ?=

art:  ## картинки из art.js: новые и изменённые (ID=a,b — только эти; DRY=1 — только план и цена)
	$(NODE)/art.mjs $(if $(ID),--only $(ID)) $(if $(DRY),--dry)

art-redo:  ## перерисовать с новым seed: make art-redo ID=hook (старая — в art/takes/)
	$(NODE)/art.mjs --redo $(ID)

art-takes:  ## варианты на выбор: make art-takes ID=hook N=3 → art/takes/, смотреть в art/index.html
	$(NODE)/art.mjs --takes $(N) --only $(ID)

art-pick:  ## взять вариант: make art-pick ID=hook SEED=123
	$(NODE)/art.mjs --pick $(ID) $(SEED)

art-gallery:  ## пересобрать галерею art/index.html
	$(NODE)/art.mjs --gallery
