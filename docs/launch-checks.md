# Launch checks

## Deployed values (2026-09-27)

| Item | Value |
|---|---|
| Site | https://pse-hk.aesopb15254.workers.dev (Workers static assets, `wrangler.jsonc`) |
| Backend | https://remtoec--pse-hk-scorer-web.modal.run (Modal app `pse-hk`, workspace `remtoec`) |
| CORS allow-list | `https://pse-hk.aesopb15254.workers.dev` only |
| Modal secret | `pse-hk-cloudflare` |
| Cloudflare account | d2a520cb357d1b6dd3a00d38aab454d7 |

## Measured (Modal, 1 CPU, 6 GiB)

| Check | Result |
|---|---|
| Cold `/warm` (first container start, includes model load) | 18.6 s end to end; model load 4.7 s |
| Warm `/warm` | 0.2–0.8 s |
| 7 sentences, direct only, warm | 1.8 s |
| 120 sentences, direct only, warm | 17.7 s processing, 18.1 s request |
| Translation (15 sentences, live Workers AI, local) | 2.3 s, ~14 neurons |
| Full local pipeline incl. translation (7 sentences) | 4.7 s |
| Worst case estimate (cold + 120 sentences, both paths) | ~19 s cold + ~18 s direct + ~10 s translation + ~18 s translated ≈ 65 s. Within the 120 s processing and 180 s browser deadlines |

These are single measurements, not guarantees. No wait estimate is shown to participants yet. The intro only says analysis "may take longer" after idle.

## Behaviour checks

| Check | Result |
|---|---|
| Page load and link preview do not contact Modal | Pass: production page requests only HTML, CSS, JS and `stimuli.json` |
| 3 simultaneous 120-sentence submissions | Pass: 1× 200 (19.5 s); 2× `429 busy` with `Retry-After: 20` in ~0.4 s |
| `/warm` served while a score is running | Pass: 0.2–1.2 s |
| CORS headers on 400 errors; foreign-origin preflight rejected | Pass |
| Over-long unpunctuated sentence (603 tokens) | Pass: `400 sentence_too_long` with `picture_id`/`sentence_id`; UI highlights that story |
| 70 KB body | Pass: `413 body_too_large` |
| Missing translation credentials | Pass: complete direct-only result, `translation_failed=true`, no agreement |
| Source text in Modal logs | Pass: 0 occurrences; logs have ids, counts, timings, codes only |
| Weights baked into image, offline at runtime | Pass: `HF_HUB_OFFLINE=1`, loaded from `/model` |
| Scale to zero after 600 s | Pass: `modal container list` empty 11 min after last request |
| Cold submission from the live site (browser, 4 short stories, direct only) | Pass: results in 19.4 s; draft cleared only after render |
| `<img onerror>` story text | Pass: rendered literally, not executed |
| Reload mid-writing → resume | Pass: same step, round, phase and text restored |
| Backend down on submit | Pass: error with cooldown retry; draft retained with `step=review` |
| Result fixtures (`tests/web_fixtures.js`) | Pass: shared leader, disagreement, tie, zero, sparse, fallback, 6 invalid shapes rejected |

## Still to do (needs the owner)

- [ ] Put a Workers-AI-scoped API token in the Modal secret (see `operations.md`), then re-run a submission and confirm `translation_failed=false`.
- [ ] Set a Modal workspace budget in the dashboard.
- [ ] Real phone session: iPhone Safari and Android Chrome, including opening from inside WhatsApp, switching to WhatsApp mid-story, reloading and resuming. Use a Cantonese keyboard for IME composition.
- [ ] Submit after verified scale-to-zero from a phone and note the wait.
- [ ] Two willing bookclub members try it; note completion time and confusion points (don't collect their stories).
- [ ] Owner shares the link in WhatsApp.
