/* English texts — same keys and list lengths as ru.js. 'she' — Vera (explains, main voice),
 * 'he' — Max (asks). cue words must appear verbatim in their line. */
export default {
  ui: {
    title: 'Why does an API answer 429? — Token bucket',
    brand: 'Explainer · Token bucket',
    chapters: { hook: 'Question', end: 'Finale' },
    watch: 'Watch',
    menu: 'Chapters',
  },
  speakers: { she: { name: 'Vera', role: 'explains' }, he: { name: 'Max', role: 'asks' } },
  cover: {
    eyebrow: 'Explainer · rate limiting',
    h1: ['Why', 'does', 'an', 'API', 'say', '<em>429</em>?'],
    sub: 'Token bucket — a bucket of tokens, built as a machine.',
    foot: 'b — burst · r — average rate',
  },
  hook: {
    say: [
      ['he', 'My script calls an API, and a minute later it gets four twenty-nine: Too Many Requests. Who is counting me?'],
      ['she', 'Most likely a token bucket. Look, I built one as a machine.'],
    ],
    cue: ['four twenty-nine', 'as a machine'],
    eyebrow: 'Explainer · rate limiting',
    h1: 'Why does an API answer <em>429</em>?',
    code: 'HTTP/1.1 429 Too Many Requests',
  },
  bucket: {
    kicker: 'The bucket',
    say: [
      ['she', 'This magazine holds five coins. That’s the bucket, and five is its capacity, called b.'],
      ['he', 'And where do the coins come from?'],
    ],
    cue: ['magazine', 'capacity'],
    pins: { magazine: 'bucket — a coin magazine', stackTop: 'capacity <b>b = 5</b> tokens' },
  },
  refill: {
    kicker: 'Refill',
    say: [
      ['she', 'From the hopper. The clock counts two seconds, and one coin drops into the magazine. That’s the refill rate, r: half a coin per second.'],
      ['he', 'And if the magazine is already full?'],
      ['she', 'Then the top coin closes a flap, and the new one rolls past, into the cup. You can’t save more than five: extra tokens are lost.'],
    ],
    cue: ['clock', 'drops', 'refill rate', 'flap', 'into the cup'],
    pins: { dial: 'clock: every 2 s', chute: 'one coin', rate: '<b>r = 0.5</b> tokens/s', flap: 'flap', cup: 'extras are lost' },
  },
  request: {
    kicker: 'A request',
    say: [
      ['she', 'Now the requests. Each one rides the belt, and at the magazine a pusher puts the bottom coin on it.'],
      ['she', 'Got a coin — the request goes through, two hundred OK.'],
      ['he', 'So one request costs one token.'],
    ],
    cue: ['requests', 'pusher', 'two hundred', 'one token'],
    pins: { gate: '1 request = 1 token', tray: '<b>200</b> OK' },
  },
  burst: {
    kicker: 'A burst',
    say: [
      ['he', 'What if I send ten requests at once?'],
      ['she', 'The first five take the whole reserve. While they ride, one more coin drops, and one more gets through.'],
      ['she', 'The rest are out of luck: the kicker pushes them into the four twenty-nine tray.'],
    ],
    cue: ['ten', 'first five', 'one more coin', 'out of luck', 'four twenty-nine'],
    pins: { bin: '<b>429</b> Too Many Requests' },
    count: { ok: 'passed', no: 'rejected' },
    sum: '5 from the reserve + 1 refilled',
  },
  average: {
    kicker: 'On average',
    say: [
      ['he', 'And if I send one request per second, for a long time?'],
      ['she', 'At first the reserve covers you. Then the magazine runs dry, and exactly as many get through as drip in: one request every two seconds.'],
      ['she', 'So the rule is simple: in any T seconds, at most b plus r times T requests get through.'],
    ],
    cue: ['one request per second', 'reserve', 'runs dry', 'the rule', 'b plus r'],
    chart: { title: 'Passed in T seconds', x: 'T, s', sent: 'sent: 1 per second', bound: 'b + r·T', passed: 'passed' },
    formula: 'passed ≤ <b>b</b> + <b>r</b>·T',
  },
  knobs: {
    kicker: 'Two knobs',
    say: [
      ['he', 'So a rate limit has two knobs?'],
      ['she', 'Yes. Capacity b allows short bursts, and the rate r holds the average flow. The server is protected, and a normal client barely notices the limit.'],
      ['she', 'And if you get a four twenty-nine, don’t hammer it again. Wait as long as the Retry-After header says: by then a new coin will drop.'],
    ],
    cue: ['Capacity', 'the rate', 'The server', 'Retry-After'],
    pins: { stackTop: '<b>b</b> — how many at once', dial: '<b>r</b> — how many on average' },
    code: ['HTTP/1.1 429 Too Many Requests', 'Retry-After: 2'],
  },
  end: {
    say: [['he', 'Got it. I’ll teach my script to wait.']],
    h1: 'Token bucket',
    lines: ['<b>b</b> — capacity: how many at once', '<b>r</b> — refill: how many on average', 'in T seconds — at most <b>b + r·T</b>'],
    cta: 'The model is live — turn the knobs on the page',
  },
};
