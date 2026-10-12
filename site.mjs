/* Site settings (node explainers/build.mjs): address and languages.
 *
 * The site is built into dist/ (make dist) — copy it to any static hosting. Every page exists
 * in every locale: the main (first) one in its own folder, the others in a <dir>/ subfolder:
 *   /                              catalog (en)       /ru/                              catalog (ru)
 *   /explainers/token-bucket/      topic (en)         /explainers/token-bucket/ru/      topic (ru)
 * Every page has canonical, hreflang for all locales and x-default → the main one; sitemap.xml in the root.
 * Locale order is the order in the switch after the current language. A new language: a line here +
 * i18n/<code>.mjs dictionaries for the catalog and topics + countries in explainers/lang.js (TZ) → make dist. */
export default {
  url: 'https://explainer.nemilya.me/', // the demo; canonical, hreflang and sitemap.xml are built from it
  repo: 'https://github.com/nemilya/explainer', // the source link in the header and footer of every page
  locales: [
    { code: 'en', dir: '' }, // the main one (x-default)
    { code: 'ru', dir: 'ru' },
  ],
};
