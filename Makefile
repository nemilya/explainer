# Explainer — commands from the repository root (make help). Video commands live in explainers/<topic>/video
# (make help there too): voice, video, video-cc, web, cover, stills, preview.
PORT ?= 8790
SLUG ?=
TITLE ?=

.PHONY: help install serve landing test new

help:  ## list commands
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'
	@echo
	@echo 'A topic video:  cd explainers/<topic>/video && make help'
	@echo '  make voice / make voice LNG=ru   voice-over (OPENROUTER_API_KEY)'
	@echo '  make video video-cc [LNG=ru]     MP4 16:9 and 9:16 with captions → out/'
	@echo '  make web                         light versions for the site → out/web/, then make landing in the root'

install:  ## Playwright for rendering videos (Chromium: npx playwright install chromium if missing)
	npm install --prefix video-kit --no-audit --no-fund

serve:  ## the site locally: catalog, landing pages, players — http://127.0.0.1:$(PORT)/ (/ru/ — Russian)
	node video-kit/scripts/serve.mjs $(PORT)

landing:  ## build pages from templates and i18n/ (catalog and topics, en in the root, ru in ru/) + sitemap.xml
	node explainers/build.mjs

test:  ## tests: language auto-choice, dictionaries, built pages are up to date
	node --test explainers/tests/*.test.mjs

new:  ## a new topic: make new SLUG=my-topic TITLE="How … works"
	@test -n "$(SLUG)" || (echo 'SLUG=<topic folder> is required'; exit 1)
	node video-kit/scripts/new.mjs explainers/$(SLUG) $(if $(TITLE),--title "$(TITLE)")
