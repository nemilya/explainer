/* Язык до первой отрисовки (как в nemilya/scantunnel). Классический блокирующий скрипт в <head>.
 * Порядок выбора:
 *   1. явный выбор — explainer-lang в localStorage (клик по EN/RU, «Открыть» или × в плашке);
 *   2. основной язык браузера, если это не основная локаль сайта (ru-RU → ru);
 *   3. страна по часовому поясу: Россия, Беларусь, Казахстан → ru (пояс не меняется от VPN и не
 *      требует GeoIP — сайт остаётся статикой);
 *   4. основная локаль (en).
 * Уводим (location.replace) только с основной страницы и только человека, пришедшего снаружи:
 * не ботов (индексация основной), не переходы внутри сайта. С /ru/ не уводим никогда — прямая
 * ссылка важнее; там landing.js по тому же выбору показывает плашку «Эта страница есть на …».
 * Автовыбор не запоминается: в explainer-lang попадает только то, что человек выбрал сам. */
(function (g) {
  var TZ = {
    // Беларусь
    'Europe/Minsk': 'ru',
    // Казахстан
    'Asia/Almaty': 'ru', 'Asia/Qostanay': 'ru', 'Asia/Qyzylorda': 'ru', 'Asia/Aqtobe': 'ru',
    'Asia/Aqtau': 'ru', 'Asia/Atyrau': 'ru', 'Asia/Oral': 'ru',
    // Россия
    'Europe/Kaliningrad': 'ru', 'Europe/Moscow': 'ru', 'W-SU': 'ru', 'Europe/Kirov': 'ru',
    'Europe/Volgograd': 'ru', 'Europe/Astrakhan': 'ru', 'Europe/Saratov': 'ru',
    'Europe/Ulyanovsk': 'ru', 'Europe/Samara': 'ru', 'Asia/Yekaterinburg': 'ru',
    'Asia/Omsk': 'ru', 'Asia/Novosibirsk': 'ru', 'Asia/Barnaul': 'ru', 'Asia/Tomsk': 'ru',
    'Asia/Novokuznetsk': 'ru', 'Asia/Krasnoyarsk': 'ru', 'Asia/Irkutsk': 'ru',
    'Asia/Chita': 'ru', 'Asia/Yakutsk': 'ru', 'Asia/Khandyga': 'ru', 'Asia/Vladivostok': 'ru',
    'Asia/Ust-Nera': 'ru', 'Asia/Magadan': 'ru', 'Asia/Sakhalin': 'ru',
    'Asia/Srednekolymsk': 'ru', 'Asia/Kamchatka': 'ru', 'Asia/Anadyr': 'ru',
  };
  var BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse/i;
  var KEY = 'explainer-lang';

  /** o: {saved, langs, tz, available: ['en', 'ru'] (первая — основная)} → код локали */
  function pick(o) {
    var avail = o.available || [];
    var def = avail[0];
    var has = function (c) { return !!c && avail.indexOf(c) >= 0; };
    if (has(o.saved)) return o.saved;
    var first = String((o.langs || [])[0] || '').slice(0, 2).toLowerCase();
    if (first !== def && has(first)) return first;
    var byTz = TZ[o.tz];
    if (has(byTz)) return byTz;
    return def;
  }

  g.exLang = { pick: pick, TZ: TZ, BOT: BOT, KEY: KEY, current: null };

  var d = g.document;
  if (!d) return; // тесты (node)
  var saved = null;
  try { saved = g.localStorage.getItem(KEY); } catch (e) { /* приватный режим */ }
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* старый браузер */ }
  var nav = g.navigator || {};
  var alts = d.querySelectorAll('link[rel="alternate"][hreflang][data-href]');
  var available = [];
  var hrefs = {};
  for (var i = 0; i < alts.length; i++) {
    available.push(alts[i].hreflang);
    hrefs[alts[i].hreflang] = alts[i].getAttribute('data-href');
  }
  var want = pick({
    saved: saved,
    langs: nav.languages && nav.languages.length ? nav.languages : [nav.language || ''],
    tz: tz,
    available: available,
  });
  g.exLang.current = want;

  var page = d.documentElement.lang;
  if (!want || want === page || page !== available[0]) return;
  if (BOT.test(nav.userAgent || '')) return;
  try {
    if (d.referrer && new URL(d.referrer).origin === g.location.origin) return;
  } catch (e) { /* кривой referrer — считаем внешним */ }
  g.location.replace(hrefs[want] + g.location.search + g.location.hash);
})(this);
