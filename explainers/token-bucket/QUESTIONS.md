# Why does an API answer 429? — brief

**English** · [Русский](QUESTIONS.ru.md)

## Questions we answer
1. What does 429 Too Many Requests mean, and who is "counting" the requests?
2. How many requests can I send at once?
3. Why does exactly r requests per second get through under a long load?
4. What should a client do after a 429?

## The viewer and the main idea
- A developer who has hit an API rate limit.
- Remember: **a burst is at most b, the average is at most r; in T seconds — at most b + r·T.**

## The truth
- Token bucket: a bucket of b tokens, a refill of r tokens/s, a request takes 1 token, no token — a rejection.
- Tokens above b are lost (you can't save more than b).
- In the machine: b = 5, r = 0.5/s (a coin every 2 s) — toy numbers so it can be seen by eye; real APIs usually have
  tens and hundreds, the mechanics are the same.
- In code tokens are recomputed on a request: `tokens = min(b, tokens + Δt·r)`; a discrete coin every 1/r s gives
  the same bound b + r·T.

## The object
A coin machine: a coin magazine (the bucket) + a hopper with a clock (the refill) + a belt with request cards.
What moves: coins drop into the magazine; a request passing the magazine gets the bottom coin; a request without a
coin is pushed into the 429 tray by the kicker. A full magazine closes the flap — an extra coin rolls into the cup.

## Parts (≈70)
| Group | Parts |
|---|---|
| Base | plate, 4 feet (flange + foot), groove, 4 screws with rings, a ruler with ticks, a TOKEN BUCKET label plate |
| Hopper | flange, column with rings, collar, a box with a seam, the chute mouth, an "r = 1/2 s" plate, a tempo knob, the clock: bezel, dial, knurl, ring, 20 ticks, hand |
| Magazine | base with a seam and a ring, guide and pusher, 4 posts with caps, a top ring, level marks 1–5 and "b", a tongue to the belt, **coins** (lit) |
| Chute | floor, two lips with rivets, a flap with a mark |
| Overflow | a cup with a shadow inside |
| Rejections | kicker housing with a seam, a lamp (the lens glows for 200 / 429), a paddle with a rod |
| Belt | 4 cross-members, back and front rails, a belt with moving cleats, rollers with axles |
| Trays | the 429 tray and the 200 tray: floor, four walls, an engraving |
| Requests | cards: lines of "text", a coin slot, a red cross on a rejection |
