# Explainer — commands from the repository root (make help). Video commands live in explainers/<topic>/video
# (make help there too): voice, video, video-cc, web, cover, stills, preview.
PORT ?= 8790
SLUG ?=
TITLE ?=
# where make deploy copies dist/: user@host:/var/www/explainer/ (rsync) — in the environment or local.mk
-include local.mk
DEPLOY ?=

.PHONY: help install serve dist landing preview deploy test new

help:  ## list commands
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'
	@echo
	@echo 'A topic video:  cd explainers/<topic>/video && make help'
	@echo '  make voice / make voice LNG=ru   voice-over (OPENROUTER_API_KEY)'
	@echo '  make video video-cc [LNG=ru]     MP4 16:9 and 9:16 with captions → out/'
	@echo '  make web                         light versions for the site → out/web/, then make dist in the root'

install:  ## Playwright for rendering videos (Chromium: npx playwright install chromium if missing)
	npm install --prefix video-kit --no-audit --no-fund

dist:  ## build the site into dist/ — the folder to copy to the hosting (en in the root, ru in ru/, sitemap.xml)
	node explainers/build.mjs

landing: dist  ## same as dist

preview: dist  ## build and open the site from dist/: http://127.0.0.1:8791/ (/ru/ — Russian)
	node video-kit/scripts/serve.mjs 8791 dist

deploy: dist  ## build and upload dist/ with rsync to DEPLOY=user@host:/path/
	@test -n "$(DEPLOY)" || (echo 'DEPLOY=user@host:/path/ is required (or a line DEPLOY = … in local.mk)'; exit 1)
	rsync -av --delete dist/ $(DEPLOY)

serve:  ## dev server over the repository: video players (explainers/<topic>/video/) — http://127.0.0.1:$(PORT)/
	node video-kit/scripts/serve.mjs $(PORT)

test:  ## tests: language auto-choice, dictionaries, the built site has no broken links
	node --test explainers/tests/*.test.mjs

new:  ## a new topic: make new SLUG=my-topic TITLE="How … works"
	@test -n "$(SLUG)" || (echo 'SLUG=<topic folder> is required'; exit 1)
	node video-kit/scripts/new.mjs explainers/$(SLUG) $(if $(TITLE),--title "$(TITLE)")
