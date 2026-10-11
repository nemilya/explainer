# Explainer — команды из корня репозитория (make help). Команды ролика — в папке explainers/<тема>/video
# (там тоже make help): voice, video, video-cc, web, cover, stills, preview.
PORT ?= 8790
SLUG ?=
TITLE ?=

.PHONY: help install serve landing test new

help:  ## список команд
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'
	@echo
	@echo 'Ролик темы:  cd explainers/<тема>/video && make help'
	@echo '  make voice / make voice LNG=ru   озвучка (OPENROUTER_API_KEY)'
	@echo '  make video video-cc [LNG=ru]     MP4 16:9 и 9:16 с субтитрами → out/'
	@echo '  make web                         лёгкие версии для сайта → out/web/, потом make landing в корне'

install:  ## Playwright для рендера роликов (Chromium: npx playwright install chromium, если его нет)
	npm install --prefix video-kit --no-audit --no-fund

serve:  ## сайт локально: каталог, лендинги, плееры — http://127.0.0.1:$(PORT)/ (/ru/ — русский)
	node video-kit/scripts/serve.mjs $(PORT)

landing:  ## собрать страницы из шаблонов и i18n/ (каталог и темы, en в корне, ru в ru/) + sitemap.xml
	node explainers/build.mjs

test:  ## тесты: автовыбор языка, словари, собранные страницы актуальны
	node --test explainers/tests/*.test.mjs

new:  ## новая тема: make new SLUG=my-topic TITLE="How … works"
	@test -n "$(SLUG)" || (echo 'нужно SLUG=<папка темы>'; exit 1)
	node video-kit/scripts/new.mjs explainers/$(SLUG) $(if $(TITLE),--title "$(TITLE)")
