/* Site settings (node explainers/build.mjs): address and languages.
 *
 * The site is the repository itself (GitHub Pages or any static host serving the root). Every page exists
 * in every locale: the main (first) one in its own folder, the others in a <dir>/ subfolder:
 *   /                              catalog (en)       /ru/                              catalog (ru)
 *   /explainers/token-bucket/      topic (en)         /explainers/token-bucket/ru/      topic (ru)
 * Every page has canonical, hreflang for all locales and x-default → the main one; sitemap.xml in the root.
 * Locale order is the order in the switch after the current language. A new language: a line here +
 * i18n/<code>.mjs dictionaries for the catalog and topics + countries in explainers/lang.js (TZ) → make landing. */
export default {
  url: 'https://explainer.nemilya.me/', // change to the real address before publishing
  locales: [
    { code: 'en', dir: '' }, // the main one (x-default)
    { code: 'ru', dir: 'ru' },
  ],
};
