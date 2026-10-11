/* token-bucket landing page, English (the main language). Keys — as in ru.mjs (checked by the build). Values are HTML. */
export default {
  langName: 'English',
  ogLocale: 'en_US',
  suggest: 'This page is available in English',
  suggestGo: 'Open',
  meta: {
    title: 'Why does an API answer 429? — Token bucket · Explainer',
    description: 'A token bucket built as a machine: a live isometric model, a narrated dialogue video and an explanation of rate limiting.',
  },
  nav: { language: 'Language' },
  hero: {
    eyebrow: 'Explainer · rate limiting',
    h1: 'Why does an API answer <em>429</em>?',
    lede: 'Almost every rate limit is a <b>token bucket</b> inside. We built one as a machine: a coin magazine, a refill clock and a request belt. Play with it, watch the video, and in five minutes the rule <b>b + r·T</b> will feel obvious.',
  },
  questions: ['What does 429 Too Many Requests mean?', 'How many requests can I send at once?', 'Why does the average settle at exactly r per second?', 'What should a client do after a 429?'],
  machine: {
    kicker: 'The machine', h: 'A token bucket you can touch',
    sub: 'A magazine of 5 coins is the bucket (capacity b). The hopper clock drops a coin every 2 seconds — the refill (rate r). Every request on the belt takes one coin; no coin, and the kicker pushes it into the 429 tray.',
    figTitle: 'Token bucket', figHint: 'Space — request · B — burst',
    send: 'Send a request', burst: 'Burst ×10', rate: 'refill', rate1: '1 / 1 s', rate2: '1 / 2 s', rate4: '1 / 4 s',
    mTok: 'tokens in the bucket', mOk: 'passed · 200', mNo: 'rejected · 429',
    caption: 'The counters come from the same model that moves the parts: a coin drops once per period, an extra one rolls into the overflow cup, a request without a coin gets 429. Try a burst with a full bucket, then with an empty one.',
  },
  video: {
    kicker: 'The video', h: 'Vera explains, Max asks',
    sub: 'A dialogue over the same machine: the bucket, refill, a request, a burst, the average and the two knobs of a limit. There is a vertical cut for Reels/Shorts.',
    format: 'format', live: 'Live player ↗',
  },
  facts: {
    kicker: 'The gist', h: 'Four facts about a token bucket',
    list: [
      ['b · capacity', 'A burst is at most b', 'A full bucket lets b requests through in a row, however many arrive at once.'],
      ['r · rate', 'The average is at most r', 'Once the reserve is gone, exactly as many get through as drip in: r requests per second.'],
      ['overflow', 'No hoarding', 'The bucket never grows: extra tokens are lost. A long silence doesn’t earn a giant burst.'],
      ['429', 'A rejection is a hint', 'Got a 429? Wait Retry-After seconds: by then a new token will have dropped.'],
    ],
    formula: 'in any T seconds, at most <b>b</b> + <b>r</b>·T requests get through<small>In our machine b = 5, r = 0.5/s: in 10 seconds at most 5 + 0.5·10 = 10 requests.</small>',
  },
  code: {
    kicker: 'Code', h: 'The same algorithm in twelve lines',
    sub: 'Real servers don’t drop tokens one by one: they recompute the count on every request from the elapsed time. The result is the same as the machine’s.',
    pre: "<span class=\"k\">class</span> TokenBucket {\n  constructor(b, r) { <span class=\"k\">this</span>.b = b; <span class=\"k\">this</span>.r = r; <span class=\"k\">this</span>.tokens = b; <span class=\"k\">this</span>.last = Date.now() / 1000; }\n  take() {\n    <span class=\"k\">const</span> now = Date.now() / 1000;\n    <span class=\"c\">// refill: r tokens per second, but never above capacity b</span>\n    <span class=\"k\">this</span>.tokens = Math.min(<span class=\"k\">this</span>.b, <span class=\"k\">this</span>.tokens + (now - <span class=\"k\">this</span>.last) * <span class=\"k\">this</span>.r);\n    <span class=\"k\">this</span>.last = now;\n    <span class=\"k\">if</span> (<span class=\"k\">this</span>.tokens >= 1) { <span class=\"k\">this</span>.tokens -= 1; <span class=\"k\">return</span> { ok: <span class=\"k\">true</span> }; }             <span class=\"c\">// 200</span>\n    <span class=\"k\">return</span> { ok: <span class=\"k\">false</span>, retryAfter: Math.ceil((1 - <span class=\"k\">this</span>.tokens) / <span class=\"k\">this</span>.r) };  <span class=\"c\">// 429</span>\n  }\n}",
  },
  foot: 'Built with <a href="https://github.com/wheresryan22/anatomy">anatomy</a> (the isometric figure) and video-kit (the narrated video). The machine is <code>figure.js</code>, the model is <code>model.js</code>, the script is <code>video/SCENARIO.md</code>.',
  card: {
    title: 'Why does an API answer 429?',
    text: 'A token bucket as a machine: capacity b, refill r and the rule b + r·T.',
    meta: 'rate limiting',
    alt: 'The token bucket machine: a coin magazine, a hopper with a clock, a request belt and trays for 200 and 429',
  },
  js: {
    readout: 'tokens {tokens}/5 · r = 1/{p} s · 200: {ok} · 429: {no}',
    figLabel: 'A token bucket machine: a magazine of five coins, a hopper with a clock that drops a coin every 2 seconds, and a belt of requests. A request that gets a coin goes to the 200 tray; one without a coin is pushed into the 429 tray.',
  },
};
