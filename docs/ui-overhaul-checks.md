# McAdams UI overhaul — local verification

Date: 2026-09-27. This is a local frontend change, not a new production deployment.

## Delivered

- Rebuilt intro, picture viewing, writing, review, waiting, error and results layouts.
- New reading-companion identity, “故事以外”, paper/green palette, Chinese serif headings, numbered journey and four-picture progress marks.
- Both analysis paths lead the results with equal panel treatment. Unavailable translation has explicit explanatory text, never fabricated zero counts.
- Source sentences lead; translations, uncertainty and motive labels are disclosed on expansion.
- Private, keyboard-operable three-question reflection with previous/next controls and an optional closing question. No goal fields, persistence or transmission.
- Both paths and reflection prompts appear in the text download.
- README clarifies interpretation and picture-selection norms.

## Checks performed

| Check | Outcome |
|---|---|
| `node --check web/app.js` and fixture/harness syntax checks | Pass |
| `.venv/Scripts/python.exe -m pytest tests -q -p no:cacheprovider` | 48 passed |
| `git diff --check` | Pass; only Git line-ending conversion notices |
| HTML IDs/form labels | 62 unique IDs; every `for` target resolves |
| Browser result fixtures | Empty failure list; shared/partial leader, disagreement, ties, zero, sparse and direct-only outcomes; malformed responses and literal HTML text |
| New behaviour checks | Paired main comparison, fallback is not zero, correct conceptual bridge, no personal input, reflection next/back/closing/reset |
| Phone viewport | Visually inspected at an actual 390px viewport; no horizontal overflow |
| Desktop | Intro visually inspected at the browser's normal desktop size |
| Draft recovery | Typed synthetic Cantonese, reloaded, resumed the same round with exact text |
| Full exercise | Completed four fixed pictures; final control changes to “完成四個故事”; review retains all four stories read-only |
| Waiting/error recovery | Delayed synthetic response showed the waiting view, then busy/retry. Returning to review preserved the fourth story exactly |
| Reflection controls | Browser next action revealed the intrinsic/extrinsic question |
| Download | Clicked local download control without console errors; export includes both routes and the three reflection prompts |
| Browser console | No captured JavaScript errors during fixture checks |

## Reproduce

Run `python scripts/preview_ui.py`, then open:

- `http://127.0.0.1:8081/` — normal local frontend.
- `http://127.0.0.1:8081/__test__/` — synthetic result fixtures and a readable result preview; final test report should be `[]`.
- `http://127.0.0.1:8081/__test__/?outcome=fallback` — direct-only visual preview.
- `http://127.0.0.1:8081/__test__/?mode=flow` — exercise flow with intercepted backend calls and a delayed synthetic busy response. No model-service call is made.

The test server and test scripts are outside `web/` and therefore are not deployed with static assets.

## Limits

- These checks used the in-app browser, not physical iOS/Android WhatsApp browsers or an operating-system screen reader.
- The scoring backend was regression-tested locally, not redeployed or benchmarked again. UI request tests used synthetic responses.
- Reduced-motion styling is implemented; no live OS preference change was made during this verification.
- Source material was the user-supplied McAdams review. No new claim of psychometric validation was added.

Screenshots: `artifacts/ui-overhaul/desktop-intro.png` and `artifacts/ui-overhaul/phone-results.png`.

## 2026-09-29 revision — mobile, full-story prompt, interpreted results

Local frontend change only; not deployed. Backend unchanged. Rationale and
guardrails: [protocol review, 2026-09-29](pse-protocol-review.md#2026-09-29-revision-results-with-a-benchmark).

| Check | Outcome |
|---|---|
| `node --check` on `web/app.js` and `tests/web_fixtures.js` | Pass |
| `python -m pytest tests -q -p no:cacheprovider` | 49 passed |
| `/__test__/` fixtures (headless Chromium, 390×844) | `[]`. New checks: placeholder carries all four prompts and no 「然後」 framing; union counting; typical shares; lean / balanced / sparse / tied lean; lab picture pulls two themes; brought-in theme flagged; sparse hides the profile; leading research note opens alone; SDT reflection has three questions and no inputs; both paths kept in technical detail |
| Full flow, `/__test__/?mode=flow` | Four fixed pictures; reload + resume keeps the round and exact text; review read-only; busy/retry; back to review keeps story 4 |
| Horizontal overflow at 390px | None (`scrollWidth` 390 on writing and results) |
| Results page height at 390px | ~3,200px with sections collapsed, down from ~4,900px |
| Console | No JavaScript errors (Google Fonts blocked in the sandbox only) |
| Same-day follow-up | Fixtures `[]` (normal and fallback) with new checks: per-character 他／她 prompt with no 佢哋, language line above the box, ≥ 0.30 faint themes counted and labelled 「隱約」, slight-lean tier and wording, v2 draft resume label; flow and 49 pytest pass |

Screenshots: `artifacts/ui-revision/` (`before-phone-write.png` for comparison).
Not checked: physical iOS/Android browsers, screen readers, live model service.

### Third revision (English first, length-adjusted, words not numbers), merged onto the evidence review

| Check | Outcome |
|---|---|
| OSF `picture_pull_norm_table.xlsx` vs shipped pulls | 47 of 47 rows identical (aff/ach/pow/n); `wc.mean` and `sc.mean` added |
| `node --test tests/reading.test.cjs` | 18 passed: the review's 14 (faint case moved onto the English reading) plus English-first, reference rates, number-free wording with length-independent lean, research record |
| `/__test__/` fixtures (normal and fallback) | `[]`. Adds: method off the page, about note with credits, no digits or % in the results summary or picture chips, English and themes on sentence cards, length-adjusted bars against reference lines, download keeps method and shares the screen's reading |
| Full flow, `?mode=flow` | Pass (resume, locked review, busy/retry, story kept) |
| `pytest` | 49 passed |

### Replay choice and random draws

| Check | Outcome |
|---|---|
| Pool audit | 26 of 48 pictures had < 30 reference stories (min 3), c08 none; ~96% of old random runs drew one. Eligible pool now 18 (81–2,316 stories), classic four excluded |
| `/__test__/` fixtures | `[]`. Adds: pool rules; four replays give 16 distinct pictures; fifth starts a new cycle; swaps avoid current, seen and classic; excess skips forgotten; first-visit vs returning choice order; visible results button |
| Browser run (390×844) | First visit and returning intros render as intended; random run draws from the eligible pool, records seen, offers 換一張; a swap records the skip; with a draft the intro shows resume instead of the choices; no console errors |
