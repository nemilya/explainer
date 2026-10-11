/* token-bucket landing page, Russian. Keys — as in en.mjs (checked by the build). Values are HTML. */
export default {
  langName: 'Русский',
  ogLocale: 'ru_RU',
  suggest: 'Эта страница есть на русском',
  suggestGo: 'Открыть',
  meta: {
    title: 'Почему API отвечает 429? — Token bucket · Explainer',
    description: 'Token bucket, собранный в железе: живая изометрическая машина, ролик-диалог и объяснение лимита запросов.',
  },
  nav: { language: 'Язык' },
  hero: {
    eyebrow: 'Explainer · rate limiting',
    h1: 'Почему API отвечает <em>429</em>?',
    lede: 'Почти любой лимит запросов внутри устроен как <b>ведро с жетонами</b> — token bucket. Мы собрали его в железе: магазин монет, часы пополнения и лента запросов. Трогайте машину, смотрите ролик — и через пять минут правило <b>b + r·T</b> будет очевидным.',
  },
  questions: ['Что значит 429 Too Many Requests?', 'Сколько запросов можно отправить разом?', 'Почему в среднем пропускают ровно r в секунду?', 'Что делать, получив 429?'],
  machine: {
    kicker: 'Машина', h: 'Token bucket в железе',
    sub: 'Магазин на 5 монет — ведро (ёмкость b). Часы бункера роняют монету раз в 2 секунды — пополнение (скорость r). Каждый запрос на ленте забирает одну монету; нет монеты — толкатель сбрасывает его в лоток 429.',
    figTitle: 'Token bucket', figHint: 'Пробел — запрос · B — всплеск',
    send: 'Отправить запрос', burst: 'Всплеск ×10', rate: 'пополнение', rate1: '1 / 1 с', rate2: '1 / 2 с', rate4: '1 / 4 с',
    mTok: 'жетонов в ведре', mOk: 'пропущено · 200', mNo: 'отказ · 429',
    caption: 'Числа на счётчиках — из той же модели, что двигает детали: монета падает раз в период, лишняя уходит в стакан переполнения, запрос без монеты получает 429. Попробуйте всплеск при полном ведре, а потом — при пустом.',
  },
  video: {
    kicker: 'Ролик', h: 'Вера объясняет, Макс спрашивает',
    sub: 'Диалог над той же машиной: ведро, пополнение, запрос, всплеск, среднее и две ручки лимита. Есть вертикальная версия для Reels/Shorts.',
    format: 'формат', live: 'Живой плеер ↗',
  },
  facts: {
    kicker: 'Суть', h: 'Четыре факта о token bucket',
    list: [
      ['b · ёмкость', 'Всплеск — не больше b', 'Полное ведро пропускает b запросов подряд, сколько бы их ни пришло разом.'],
      ['r · скорость', 'В среднем — не больше r', 'Когда запас кончился, проходит ровно столько, сколько капает: r запросов в секунду.'],
      ['переполнение', 'Копить нельзя', 'Ведро не растёт: лишние жетоны сгорают. Долгое молчание не даёт права на огромный всплеск.'],
      ['429', 'Отказ — это подсказка', 'Получили 429 — подождите Retry-After секунд: к этому времени капнет новый жетон.'],
    ],
    formula: 'за любые T секунд пройдёт не больше <b>b</b> + <b>r</b>·T запросов<small>В нашей машине b = 5, r = 0,5/с: за 10 секунд — не больше 5 + 0,5·10 = 10 запросов.</small>',
  },
  code: {
    kicker: 'Код', h: 'Тот же алгоритм — двенадцать строк',
    sub: 'В настоящих серверах жетоны не падают по одному: их число пересчитывают при каждом запросе по прошедшему времени. Результат тот же, что у машины.',
    pre: "<span class=\"k\">class</span> TokenBucket {\n  constructor(b, r) { <span class=\"k\">this</span>.b = b; <span class=\"k\">this</span>.r = r; <span class=\"k\">this</span>.tokens = b; <span class=\"k\">this</span>.last = Date.now() / 1000; }\n  take() {\n    <span class=\"k\">const</span> now = Date.now() / 1000;\n    <span class=\"c\">// пополнение: r жетонов в секунду, но не больше ёмкости b</span>\n    <span class=\"k\">this</span>.tokens = Math.min(<span class=\"k\">this</span>.b, <span class=\"k\">this</span>.tokens + (now - <span class=\"k\">this</span>.last) * <span class=\"k\">this</span>.r);\n    <span class=\"k\">this</span>.last = now;\n    <span class=\"k\">if</span> (<span class=\"k\">this</span>.tokens >= 1) { <span class=\"k\">this</span>.tokens -= 1; <span class=\"k\">return</span> { ok: <span class=\"k\">true</span> }; }             <span class=\"c\">// 200</span>\n    <span class=\"k\">return</span> { ok: <span class=\"k\">false</span>, retryAfter: Math.ceil((1 - <span class=\"k\">this</span>.tokens) / <span class=\"k\">this</span>.r) };  <span class=\"c\">// 429</span>\n  }\n}",
  },
  foot: 'Сделано на <a href="https://github.com/wheresryan22/anatomy">anatomy</a> (изометрическая фигура) и video-kit (ролик с озвучкой). Машина — <code>figure.js</code>, модель — <code>model.js</code>, сценарий — <code>video/SCENARIO.md</code>.',
  card: {
    title: 'Почему API отвечает 429?',
    text: 'Token bucket в железе: ёмкость b, пополнение r и правило b + r·T.',
    meta: 'rate limiting',
    alt: 'Машина token bucket: магазин монет, бункер с часами, лента запросов и лотки 200 и 429',
  },
  js: {
    readout: 'жетонов {tokens}/5 · r = 1/{p} с · 200: {ok} · 429: {no}',
    figLabel: 'Машина token bucket: магазин на пять монет, бункер с часами роняет монету каждые 2 секунды, лента везёт запросы. Запрос, получивший монету, уходит в лоток 200; запрос без монеты толкатель сбрасывает в лоток 429.',
  },
};
