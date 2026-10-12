# video-kit: shared targets for videos. A project's Makefile:
#     KIT := ../../video-kit
#     include $(KIT)/video.mk
# Needs: Node 22, ffmpeg, Chromium via Playwright (make install). OpenRouter key — in the environment
# (OPENROUTER_API_KEY) or in the project's local.mk; needed only for make voice.
# Don't overheat a laptop while rendering: on a Mac the hardware encoder by default (ENC=sw — x264),
# THREADS=2 — x264 in 2 threads, PAUSE=40 — pause between frames (ms), NICE=10 — lower priority (default).
export ENC THREADS PAUSE NICE HEIGHT
-include local.mk
export OPENROUTER_API_KEY OPENROUTER_PROXY
# H.264 quality when rendering (scripts/render.mjs): CRF ?= 19 — can be set in the project's Makefile
export CRF
# language: make voice video-cc LNG=ru  (default — the first language in LANGS in film.js)
LNG ?=
L := $(if $(LNG),--lang $(LNG))
NODE := node $(KIT)/scripts

.PHONY: help install voice mix video video-v video-cc web cover stills stills-v poster ask preview all clean

help:  ## list targets
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'

install:  ## Playwright for rendering (+ npx playwright install chromium if there is no browser)
	npm install --prefix $(KIT) --no-audit --no-fund

voice:  ## voice-over (OpenRouter, Gemini TTS) + music and sound effects → voice/<lang>.m4a, .json, .vtt
	$(NODE)/voice.mjs $(L)

mix:  ## only remix the audio from the cached lines (no network, no key)
	$(NODE)/voice.mjs --mix $(L)

video:  ## MP4 1920×1080 → out/<name>[-<lang>].mp4
	$(NODE)/render.mjs $(L)

video-v:  ## vertical MP4 1080×1920 → out/<name>[-<lang>]-vertical.mp4
	$(NODE)/render.mjs --vertical $(L)

video-cc:  ## vertical MP4 with captions in the frame (Reels, Shorts) → out/<name>[-<lang>]-vertical-captions.mp4
	$(NODE)/render.mjs --vertical --captions $(L)

web:  ## light versions for the site (720p, CRF 28) → out/web/ (LNG=ru — one language; CRF=31 HEIGHT=540 — lighter)
	$(NODE)/web.mjs $(L)

cover:  ## Reels cover 1080×1920 (the project's cover.html) → out/cover[-<lang>].jpg
	$(NODE)/render.mjs --cover $(L)

stills:  ## frames for checking: make stills T=3,20,41 → out/still-*.png
	$(NODE)/render.mjs --stills $(T) $(L)

stills-v:  ## vertical frames: make stills-v T=3,20,41 (CC=1 — with captions)
	$(NODE)/render.mjs --vertical --stills $(T) $(if $(CC),--captions) $(L)

poster:  ## only the preview frame out/poster*.jpg
	$(NODE)/render.mjs --poster $(L)

ask:  ## ask a vision model about a frame: make ask IMG=out/still-3.png Q="what is in the frame?"
	$(NODE)/vision.mjs $(IMG) "$(Q)"

preview:  ## interactive player (prints the URL; ?t=second; #v, #ru, #ru-v)
	$(NODE)/serve.mjs 8790

all: voice video-cc  ## voice-over and the Reels video again (for language LNG)

clean:  ## delete check frames and partial renders
	rm -f out/still-*.png out/part-*.mp4

# ---------------------------------------------------------------- AI images (the project's art.js, AI-ART.md)
.PHONY: art art-redo art-takes art-pick art-gallery
ID ?=
N ?= 3
SEED ?=

art:  ## images from art.js: new and changed (ID=a,b — only these; DRY=1 — only the plan and price)
	$(NODE)/art.mjs $(if $(ID),--only $(ID)) $(if $(DRY),--dry)

art-redo:  ## redraw with a new seed: make art-redo ID=hook (the old one goes to art/takes/)
	$(NODE)/art.mjs --redo $(ID)

art-takes:  ## variants to choose from: make art-takes ID=hook N=3 → art/takes/, view in art/index.html
	$(NODE)/art.mjs --takes $(N) --only $(ID)

art-pick:  ## take a variant: make art-pick ID=hook SEED=123
	$(NODE)/art.mjs --pick $(ID) $(SEED)

art-gallery:  ## rebuild the gallery art/index.html
	$(NODE)/art.mjs --gallery
