# "Why does an API answer 429?" — the video script

**English** · [Русский](SCENARIO.ru.md)

A human-readable version of `film.js` and `text/en.js` (keep them in agreement). Dialogue: **Vera** (she — explains,
the main voice Aoede) and **Max** (he — asks, voice Puck). Length — about 2.5 min (en 2:27 — the main language, ru 2:24).

The machine (`../figure.js`) runs through the whole video without stopping — it is a persistent layer under the
scenes. The schedule (when requests arrive) is built in `film.js → plan()` from the lines: requests arrive on the words
that talk about them, while coins honestly drop every 2 s. Every number in the frame comes from the model `../model.js`.

| # | Scene | Lines (gist) | Machine | Camera / in the frame |
|---|---|---|---|---|
| — | Question | Max: my script gets 429 — who is counting me? · Vera: a token bucket, I built one as a machine | a steady flow every 1.6 s — the reserve melts | wide shot; title "Why does an API answer 429?", an `HTTP/1.1 429` chip |
| 01 | The bucket | Vera: a magazine of 5 coins is the bucket, 5 is capacity b · Max: where do the coins come from? | a couple of requests take coins (so there is room to drop into) | zoom onto the magazine; pins "bucket", "capacity b = 5" |
| 02 | Refill | Vera: the clock — a coin drops every 2 s, r = 0.5/s · Max: and if it's full? · Vera: the flap, an extra coin goes into the cup, no hoarding | coins drop into the magazine, then past it into the overflow cup | chute and clock → flap and cup; pins |
| 03 | A request | Vera: a request rides the belt, the pusher puts the bottom coin on it; got a coin — 200 · Max: one request costs one token | requests every 2.6 s, all pass | zoom onto the hand-off point; "1 request = 1 token", "200 OK" |
| 04 | A burst | Max: what about ten at once? · Vera: five from the reserve, one more coin drops while they ride, the rest go to the 429 tray | 10 requests 0.35 s apart right after a coin: 6 pass, 4 rejected | wide shot; live 200 / 429 counters, "5 from the reserve + 1 refilled" |
| 05 | On average | Max: and one request per second for a long time? · Vera: the reserve first, then exactly r; the rule — at most b + r·T | 1 request/s for 16 s: all at first, then every other one | the machine on the left, on the right a live chart "passed" against b + r·T, the formula |
| 06 | Two knobs | Max: so a limit has two knobs? · Vera: b — bursts, r — the average flow; got a 429 — wait for Retry-After | a couple of requests | magazine and clock; "b — how many at once", "r — how many on average", the server's response with `Retry-After: 2` |
| — | Finale | Max: I'll teach my script to wait | — | zoom out; summary: b, r, b + r·T; "the model is live — on the page" |

## How to rebuild

```bash
cd explainers/token-bucket/video
make preview                    # the live player (http://127.0.0.1:8790/…)
make voice                      # en voice-over — the main language (OPENROUTER_API_KEY); make voice LNG=ru — Russian
make video video-cc             # MP4 16:9 and vertical with captions in the frame → out/
make video video-cc LNG=ru
make cover; make cover LNG=ru   # Reels covers
make web                        # light 720p versions for the landing page → out/web/; then make dist in the root
```
