/* Настройки сайта (node explainers/build.mjs): адрес и языки.
 *
 * Сайт — сам репозиторий (GitHub Pages или любой статический хостинг из корня). Каждая страница есть
 * в каждой локали: основная (первая) — в своей папке, остальные — в подпапке <dir>/:
 *   /                              каталог (en)       /ru/                              каталог (ru)
 *   /explainers/token-bucket/      тема (en)          /explainers/token-bucket/ru/      тема (ru)
 * У каждой страницы — canonical, hreflang на все локали и x-default → основная; sitemap.xml в корне.
 * Порядок локалей — порядок в переключателе после текущего языка. Новый язык: строка здесь +
 * словари i18n/<code>.mjs у каталога и тем + страны в explainers/lang.js (TZ) → make landing. */
export default {
  url: 'https://explainer.nemilya.me/', // поменять на настоящий адрес перед выкладкой
  locales: [
    { code: 'en', dir: '' }, // основная (x-default)
    { code: 'ru', dir: 'ru' },
  ],
};
