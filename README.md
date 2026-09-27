# PSE-HK · 圖畫故事

A small, mobile-first Picture Story Exercise (PSE) for a Hong Kong reading group. Participants look at four pictures, write a short story about each in Cantonese, Chinese, English or a mix, and get an **experimental** automated analysis of achievement, affiliation and power imagery in their stories.

The analysis is exploratory. It is not a personality test. The coding model was trained mostly on German stories, and nobody has shown that it works for Cantonese.

- Site: https://pse-hk.aesopb15254.workers.dev
- Backend: https://remtoec--pse-hk-scorer-web.modal.run

## Bookclub use

Members do the exercise at home before the meeting and decide for themselves whether to share anything at the event. Everyone in the default mode sees the same four pictures, which is what makes the discussion work: same pictures, different wants, conflicts and endings. The results page mentions that sharing is optional; discussion prompts belong on the facilitator's slides, not on the site.

Doing it at home also spreads the load. The backend scores one story set at a time (`max_containers=1`), so a whole room submitting at once would mostly see "busy, retry" (`429`) for a while.

## Scope

**In scope**

- Four pictures per run. Each is shown for 10 s, followed by a soft 4-minute writing period.
- **Bookclub mode (default):** everyone gets the same four pictures in the same order (`BOOKCLUB_SET` in `web/app.js`: p7, p9, p4, p2) and there is no skipping. The set was chosen so the summed picture-pull norms (Schönbrodt et al., `picture_pull_norm_table.xlsx` on osf.io/pqckn) are roughly even: aff 4.2, ach 4.7, pow 4.4.
- **Random mode:** offered on the intro and results pages for a second try. Four pictures are drawn at random from the pool; participants may skip up to 4 per run, and a skipped picture is never drawn again on that browser.
- No motive category is named before the stories are written. The results page leads with the story themes as sentence counts (dots, original-language path), what they do and don't mean, the sentence cards, the PSE method, and an optional bridge to McAdams's Motivated Agent (*The Art and Science of Personality Development*, 2015) with three static reflection questions. Both-path counts, agreement, protocol notes, credits and model metadata sit in a collapsed "想睇吓系統點樣分析？" section.
- A story is final once the participant presses「下一張」, so later pictures cannot change earlier stories. The review screen is read-only, except for a story the length checks reject.
- The writing prompts ask what is happening, what happened before, what the characters think, feel and want, and what happens next. A writing tip asks participants to name people instead of writing 佢 and to end each sentence with 。, which helps both the translator and sentence-level coding. A story of fewer than 2 sentences gets a single nudge to add more; it is never blocked.
- Drafts are saved in the participant's browser, so they can leave and come back within 7 days.
- Deviations from the standard protocol (4 minutes per story, one sitting) are recorded but not enforced: writing time per story, time away from the page, and resuming after more than 5 minutes. They appear on the results page and in the download, with a note that such stories are less standardised.
- Sentence-level motive coding with the Automated Motive Coder (AMC) along two paths:
  1. **Direct:** the original sentence goes straight to AMC.
  2. **Translated:** the sentence is first translated conservatively into English, then sent to AMC.
- The results can be downloaded as a text file: interpretation and stories first, technical record after.

**Out of scope**

- Validated scoring, norms, percentiles, or any claim about a person's "real" motives.
- Accounts, a story database or analytics. Stories are processed and then discarded (see [Data](#data)).
- Classic TAT/PSE pictures whose copyright is unclear (see [Pictures](#pictures)).

## How it works

```
Browser (web/)                        Modal (backend/app.py)                 Cloudflare Workers AI
─────────────────                     ──────────────────────                 ─────────────────────
fixed 4 (or random 4 of 9)
view 10 s → write → (random: skip ≤ 4)
review → POST /score  ──────────────▶ validate + split into sentences
                                      AMC on original sentences (direct)
                                      translate in batches  ───────────────▶ Qwen3-30B, JSON schema
                                      AMC on English sentences  ◀─────────── {id, english, uncertain}
render results       ◀──────────────  counts, agreement, per-sentence rows
```

1. **Frontend** (`web/`: static HTML, CSS and JS, no build step). It holds the picture pool (`stimuli.json`), draws the run's pictures, times viewing and writing, saves drafts to `localStorage`, validates lengths, submits, and renders the results. Picture titles and credits are hidden until the results page so they don't steer the stories. As the last picture opens, the page calls `/warm` once to wake the backend.
2. **Validation and segmentation** (`backend/scoring.py`). The backend requires exactly 4 unique pool ids, at most 3,000 characters per story and at most 120 sentences in total. Stories are split on newlines and on `. ! ? 。 ！ ？ …`. Sentences longer than AMC's 512-token limit are rejected, never silently truncated.
3. **Direct coding.** `automatedMotiveCoder/setfit` (pinned revision, multilingual-e5-large base) returns independent `ach`/`aff`/`pow`/`null` flags per sentence. The model's own `predict()` flags are used as-is. No threshold is invented.
4. **Translation** (`backend/translation.py`). Workers AI `@cf/qwen/qwen3-30b-a3b-fp8` runs at temperature 0, with a conservative prompt (v3: rules, a glossary of Hong Kong colloquialisms and worked examples) and a JSON schema. Each story is sent as one batch so pronouns and dropped subjects can be resolved; batches that come back truncated are split. `scripts/eval_translation.py` is the regression check for prompt changes (results in `docs/spike-results.md`). Any failure falls back to direct-only results, never to a partial comparison.
5. **Translated coding.** The English sentences go through AMC too. The response has both label sets, the counts, the agreement (sentences where both paths give the same set of motives), and metadata (model revision, translator, prompt version).
6. **Headline.** When both paths have the same top motive, or share one of their tied top motives, the page reports it as a shared finding and names the extra tie. Only fully different leaders count as disagreement.

A motive counts at most once per sentence. Counts are raw, never per 1,000 words, because Chinese text has no word spaces.

## Pictures

`web/stimuli.json` records the id, the source PSE id, the file, the author, the source URL, the exact licence and a modification notice for every picture. Each licence was checked on its source page on 2026-09-27, against the database's own sources table (https://osf.io/umqdb/).

| id | PSE id | Licence | Picture pull aff / ach / pow (n stories) | Bookclub set |
|---|---|---|---|---|
| p1 | newpic18 | CC0 (Pexels) | 3.25 / 0.00 / 1.25 (4) | |
| p2 | newpic09 | Public domain (U.S. Navy) | 0.77 / 1.82 / 2.11 (198) | 4th |
| p3 | newpic10 | No known copyright restrictions (Flickr Commons) | 1.71 / 0.68 / 0.92 (196) | |
| p4 | newpic12 | CC BY 2.0 | 0.55 / 0.82 / 1.27 (196) | 3rd |
| p5 | newpic01 | Public domain (US, no notice) | 0.49 / 0.85 / 0.82 (202) | |
| p6 | newpic11 | Public domain (U.S. government) | 0.40 / 0.10 / 2.30 (10) | |
| p7 | newpic22 | CC0 (Pexels, 2015) | 0.46 / 1.53 / 0.51 (200) | 1st |
| p8 | newpic29 | CC0 (Pexels, 2015) | 2.75 / 0.00 / 1.12 (8) | |
| p9 | newpic31 | CC BY-SA 2.0 | 2.45 / 0.55 / 0.55 (11) | 2nd |

Picture pull is the mean number of motive images per story in the German norm sample (`picture_pull_norm_table.xlsx`, osf.io/pqckn). The bookclub set sums to aff 4.2 / ach 4.7 / pow 4.4. It is the second most balanced four-picture combination; the most balanced (p2, p5, p7, p8) was passed over because p5 pulls weakly overall and p8's norms rest on 8 stories. The order puts one achievement, one affiliation and one power picture first and the mixed picture last. To change the set, edit `BOOKCLUB_SET` in `web/app.js`; any pool id works without a backend change.

The classic pictures (ship captain, couple by river, trapeze artists, women in laboratory, nightclub scene, boxer) are on OSF, but the database itself lists their copyright as "unknown/unclear". They are **not** shipped. Adding them is the owner's call and needs confirmation of the rights first. To add any picture, put the file in `web/stimuli/`, add its record to `stimuli.json` and its id to `PICTURE_IDS` in `backend/scoring.py`, then redeploy both. `tests/test_scoring.py` checks that the two lists match.

## Workflow

```bash
# setup and tests (details in docs/operations.md)
.venv/Scripts/python.exe -m pytest tests -q
.venv/Scripts/python.exe backend/app.py              # API on :8000, uses models/amc
python -m http.server 8080 --directory web           # UI on :8080
# paste tests/web_fixtures.js into the page console → [] means pass

# deploy
npx wrangler deploy                                  # static site
.venv/Scripts/modal.exe deploy backend/app.py        # backend
```

The frontend and backend must be deployed together whenever the picture pool changes. An older backend rejects new picture ids with `unknown_picture`.

## Repository

| Path | Contents |
|---|---|
| `web/` | Static site: `index.html`, `app.js`, `styles.css`, `stimuli.json`, `stimuli/` |
| `backend/app.py` | Modal service (`/warm`, `/score`), concurrency and deadlines |
| `backend/scoring.py` | Validation, segmentation, AMC adapter, counts and agreement |
| `backend/translation.py` | Workers AI translation, batching, strict parsing and fallback |
| `tests/` | pytest suites; `web_fixtures.js` checks result rendering in the browser |
| `scripts/` | AMC spike, translation probe, and `eval_translation.py` (live translation regression check) |
| `docs/` | Plan, spike results, operations guide, launch checks |

## Data

Drafts stay in the participant's browser (`pse-hk:draft:v1`). Skipped picture ids (random mode only) are stored under `pse-hk:skipped:v1`. The reflection questions on the results page are static text: nothing the participant thinks about their own goals is typed, stored or sent. On submit, the stories go to Modal for coding and to Cloudflare Workers AI for translation. Nothing is stored server-side, and logs contain only ids, counts, timings and error codes. See `docs/launch-checks.md`.

## Known limitations

- **The two paths are not independent.** Both use the same AMC model, so agreement does not mean accuracy.
- **Direct Cantonese coding under-detects.** In real runs so far, most disagreements are "no motive" on the direct path against a motive on the translated path. Colloquial Cantonese (佢哋, 傾返計, 氹返佢) is far from AMC's training data.
- **Translation drift.** Prompt v3 fixed most of the misreadings seen with v1 (dev checks went from 21–23 to 30 of 33), but only for colloquial words in its glossary. Unknown idioms are still translated literally, and a subject omitted midway through a sentence can still be attached to the wrong person. Details are in `docs/spike-results.md`.
- **Small samples.** A run is about 15–25 sentences, so a difference of 2–3 sentences can change which motive leads.
- **Norms are German and uneven.** The picture pulls come from German participants, and p9's figures rest on only 11 stories.
- **Naive sentence splitting.** "Mr. Chan" or "3.5" is split early.

## References

- Schönbrodt, F. D., Hagemeyer, B., Brandstätter, V., et al. (2021). Measuring implicit motives with the Picture Story Exercise (PSE): Databases of expert-coded German stories, pictures, and updated picture norms. *Journal of Personality Assessment, 103*(3), 392–405. https://doi.org/10.1080/00223891.2020.1726936
- PSE picture database and norms (OSF): https://osf.io/pqckn/ · sources and licences: https://osf.io/umqdb/
- Automated Motive Coder (AMC): model https://huggingface.co/automatedMotiveCoder/setfit · paper (ICWSM 2025 workshop proceedings): https://workshop-proceedings.icwsm.org/pdf/2025_31.pdf
- McAdams, D. P. (2015). *The art and science of personality development*. Guilford Press.
- Winter, D. G. (1994). *Manual for scoring motive imagery in running text*. University of Michigan.
- Tunstall, L., et al. (2022). Efficient few-shot learning without prompts (SetFit). arXiv:2209.11055
- Wang, L., et al. (2024). Multilingual E5 text embeddings. arXiv:2402.05672
- Qwen3 on Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/
