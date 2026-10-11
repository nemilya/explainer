/* Language before first paint (as in nemilya/scantunnel). A classic blocking script in <head>.
 * Choice order:
 *   1. an explicit choice — explainer-lang in localStorage (a click on EN/RU, "Open" or × on the banner);
 *   2. the browser's main language, if it is not the site's main locale (ru-RU → ru);
 *   3. the country by time zone: Russia, Belarus, Kazakhstan → ru (the zone doesn't change with a VPN and
 *      needs no GeoIP — the site stays static);
 *   4. the main locale (en).
 * Redirect (location.replace) only from the main page and only a person coming from outside:
 * not bots (the main page gets indexed), not navigation inside the site. Never redirect from /ru/ — a direct
 * link matters more; there landing.js uses the same choice to show a banner "This page is available in …".
 * The auto-choice is not saved: explainer-lang holds only what the person chose themselves. */
(function (g) {
  var TZ = {
    // Belarus
    'Europe/Minsk': 'ru',
    // Kazakhstan
    'Asia/Almaty': 'ru', 'Asia/Qostanay': 'ru', 'Asia/Qyzylorda': 'ru', 'Asia/Aqtobe': 'ru',
    'Asia/Aqtau': 'ru', 'Asia/Atyrau': 'ru', 'Asia/Oral': 'ru',
    // Russia
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

  /** o: {saved, langs, tz, available: ['en', 'ru'] (the first is the main one)} → locale code */
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
  if (!d) return; // tests (node)
  var saved = null;
  try { saved = g.localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* an old browser */ }
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
  } catch (e) { /* a broken referrer — treat as external */ }
  g.location.replace(hrefs[want] + g.location.search + g.location.hash);
})(this);
