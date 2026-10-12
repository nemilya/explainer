/* Language auto-choice (explainers/lang.js): the choice order and when the main page redirects. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'lang.js'), 'utf8');
const AVAIL = ['en', 'ru'];
const HREF = { en: './', ru: 'ru/' };

/** run lang.js in a stubbed "browser" → where it redirected (or null) and exLang */
function run({ page = 'en', saved = null, langs = ['en-US'], tz = 'Europe/Berlin', ua = 'Mozilla/5.0',
  referrer = '', origin = 'https://x.example', search = '', hash = '' } = {}) {
  let to = null;
  const links = AVAIL.map((c) => ({ hreflang: c, getAttribute: () => HREF[c] }));
  const ctx = {
    document: { documentElement: { lang: page }, referrer, querySelectorAll: () => links },
    navigator: { languages: langs, language: langs[0], userAgent: ua },
    localStorage: { getItem: () => saved },
    location: { origin, search, hash, replace: (u) => { to = u; } },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }) },
    URL,
  };
  vm.runInNewContext(SRC, ctx);
  return { to, exLang: ctx.exLang };
}
const { exLang } = run();
const pick = (o) => exLang.pick({ available: AVAIL, ...o });

test('order: explicit choice → browser language → country by time zone → en', () => {
  assert.equal(pick({ saved: 'en', langs: ['ru-RU'], tz: 'Europe/Moscow' }), 'en', 'an explicit choice wins');
  assert.equal(pick({ saved: 'xx', langs: ['ru-RU'] }), 'ru', 'an unknown saved code is ignored');
  assert.equal(pick({ langs: ['ru-RU'], tz: 'Europe/Berlin' }), 'ru', 'a Russian speaker abroad');
  assert.equal(pick({ langs: ['en-US'], tz: 'Europe/Moscow' }), 'ru', 'an English browser in Russia');
  assert.equal(pick({ langs: ['de-DE'], tz: 'Europe/Berlin' }), 'en');
  assert.equal(pick({ langs: ['uk-UA'], tz: 'Europe/Kyiv' }), 'en');
  assert.equal(pick({ langs: [], tz: '' }), 'en');
});

test('countries: Russia, Belarus, Kazakhstan → ru; the zones exist', () => {
  for (const tz of ['Europe/Moscow', 'Europe/Kaliningrad', 'Asia/Yekaterinburg', 'Asia/Vladivostok', 'Europe/Minsk', 'Asia/Almaty']) assert.equal(pick({ tz }), 'ru', tz);
  for (const tz of ['Europe/Riga', 'America/New_York', 'Asia/Tashkent']) assert.equal(pick({ tz }), 'en', tz);
  for (const [tz, lang] of Object.entries(exLang.TZ)) {
    assert.ok(AVAIL.includes(lang), `${tz} → ${lang}`);
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: tz }), tz);
  }
});

test('the main page redirects to the reader\'s language, keeping ?query and #anchor', () => {
  assert.equal(run({ tz: 'Europe/Moscow' }).to, 'ru/');
  assert.equal(run({ langs: ['ru'], search: '?utm=tg', hash: '#video' }).to, 'ru/?utm=tg#video');
  assert.equal(run({ saved: 'ru' }).to, 'ru/', 'chose ru before → the main page opens ru');
  assert.equal(run({ tz: 'Europe/Berlin' }).to, null);
  assert.equal(run({ saved: 'en', tz: 'Europe/Moscow' }).to, null, 'explicitly chose en');
});

test('no redirect: bots, navigation inside the site, from /ru/', () => {
  for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'Mozilla/5.0 (compatible; YandexBot/3.0)', 'TelegramBot (like TwitterBot)']) {
    assert.equal(run({ tz: 'Europe/Moscow', ua }).to, null, ua);
  }
  assert.equal(run({ tz: 'Europe/Moscow', referrer: 'https://x.example/explainers/' }).to, null);
  assert.equal(run({ tz: 'Europe/Moscow', referrer: 'https://ya.ru/' }).to, 'ru/');
  assert.equal(run({ page: 'ru', tz: 'Europe/Berlin' }).to, null, 'a direct link to /ru/');
  assert.equal(run({ page: 'ru', tz: 'Europe/Berlin' }).exLang.current, 'en', 'the choice is computed — the banner uses it');
});
