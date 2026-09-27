# PSE-HK · 故事以外

A small, mobile-first Picture Story Exercise (PSE) for a Hong Kong reading group. Participants look at four pictures, write a short story about each in Cantonese, Chinese, English or a mix, and get an **experimental** automated analysis of achievement, affiliation and power imagery in their stories.

The analysis is exploratory. It is not a personality test. The coding model was trained mostly on German stories, and nobody has shown that it works for Cantonese.

## Interpretation boundary

The experience is a reading companion to Dan P. McAdams's *The Art and Science
of Personality Development* (2015), especially Chapter 6, “The Motivational
Agenda”: ambiguous pictures → imagined wants → story themes → reflection on
one's own goals. It detects imagery in four stories, not a participant's “true
motives.” PSE is one window into the Motivated Agent, which also includes
conscious goals, plans, projects, values and aspirations. These imagined
stories are not autobiographical narratives.

Original-text and translated-text results receive equal visual prominence.
Neither is ground truth, and agreement is not a confidence score. Counts are
raw sentence-level detections, not standardized psychological scores,
percentiles, diagnoses or validated Cantonese norms.

**Picture-pull norms inform the fixed bookclub set and appear after writing
as context about the pictures. They never normalize, percentile, or rank an
individual participant's result.** See [the protocol review](docs/pse-protocol-review.md).

The private reflection uses competence/relatedness, intrinsic/extrinsic and
promotion/prevention. It asks for no personal-goal input and transmits no
reflection answers. The final comparison may simply be “no connection.”

- Site: https://pse-hk.aesopb15254.workers.dev
- Backend: https://remtoec--pse-hk-scorer-web.modal.run

## Bookclub use

Members do the exercise at home before the meeting and decide for themselves whether to share anything at the event. Everyone in the default mode sees the same four pictures, which is what makes the discussion work: same pictures, different wants, conflicts and endings. The results page mentions that sharing is optional; discussion prompts belong on the facilitator's slides, not on the site.

Doing it at home also spreads the load. The backend scores one story set at a time (`max_containers=1`), so a whole room submitting at once would mostly see "busy, retry" (`429`) for a while.

## Scope

**In scope**

- Four pictures per run. Each is shown for 10 s, followed by a soft 4-minute writing period.
- **Bookclub mode (default):** new runs show boxer, couple by river, women in laboratory, and ship captain, in that order (`BOOKCLUB_SET`: c05, c07, c18, c15), without skipping. Summed German picture-pull means: aff 4.18, ach 3.42, pow 3.99. Existing drafts keep their original pictures.
- **Random mode:** four pictures from the entire supplied archive (18 classical and 30 newer pictures). Participants may skip up to 4 per run. Skipped pictures are excluded on that browser until fewer than four eligible pictures remain, when the exclusion list resets.
- No motive category is named before the stories are written. The results page leads with the story themes as sentence counts (dots, original-language path), what they do and don't mean, the sentence cards, the PSE method, and an optional bridge to McAdams's Motivated Agent (*The Art and Science of Personality Development*, 2015) with three static reflection questions. Both-path counts, agreement, protocol notes, credits and model metadata sit in a collapsed "想睇吓系統點樣分析？" section.
- A story is final once the participant presses「下一張」, so later pictures cannot change earlier stories. The review screen is read-only, except for a story the length checks reject.
- The same four writing prompts are visible on every screen size: current situation, preceding events, characters' thoughts/feelings/wants, and outcome. They guide a complete imaginative story, without requiring separate answers or polished grammar/punctuation. Returning participants may write similar or different stories. A story of fewer than 2 sentences gets a single optional nudge; it is never blocked.
- Drafts are saved in the participant's browser, so they can leave and come back within 7 days.
- Deviations from the standard protocol (4 minutes per story, one sitting) are recorded but not enforced: writing time per story, time away from the page, and resuming after more than 5 minutes. They appear on the results page and in the download, with a note that such stories are less standardised.
- Sentence-level motive coding with the Automated Motive Coder (AMC) along two paths:
  1. **Direct:** the original sentence goes straight to AMC.
  2. **Translated:** the sentence is first translated conservatively into English, then sent to AMC.
- Results present both paths together, then sentence-level examples, a private three-question McAdams reflection and optional technical detail. The download includes both paths, the stories and reflection prompts before the technical record.

**Out of scope**

- Validated scoring, norms, percentiles, or any claim about a person's "real" motives.
- Accounts, a story database or analytics. Stories are processed and then discarded (see [Data](#data)).

## How it works

```
Browser (web/)                        Modal (backend/app.py)                 Cloudflare Workers AI
─────────────────                     ──────────────────────                 ─────────────────────
fixed 4 (or random 4 of 48)
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

The private exercise uses the supplied `assets/pqckn-osfstorage-archive`: 18 classical pictures and 30 newer pictures. `web/stimuli.json` records the archive filename, source, dimensions and workbook row for each verified pull match. All 48 are eligible for random mode. The historical nine web images/IDs remain unchanged to preserve saved drafts; the other 39 are resized without cropping and compressed for web use. Existing licence records are retained; newly imported files are identified as supplied for private use without inventing individual licence claims.

The default order is:

| ID | Classical picture | Affiliation | Achievement | Power | Norm stories |
|---|---|---:|---:|---:|---:|
| c05 | Boxer | 0.34 | 1.68 | 0.81 | 1,724 |
| c07 | Couple by river | 3.03 | 0.03 | 0.34 | 1,854 |
| c18 | Women in laboratory | 0.34 | 1.51 | 1.28 | 2,331 |
| c15 | Ship captain | 0.47 | 0.20 | 1.56 | 2,612 |
| | Sum of means | 4.18 | 3.42 | 3.99 | — |

These four come from the frequently used standard six, offer varied scenes, and avoid reliance on tiny norm samples. Numerical balance is a selection aid, not proof of equal sensitivity. Pull means are German expert-coded motive imagery per story, not expected AMC counts for a Cantonese participant. Post-writing results and downloads show the actual run's picture pulls, sample sizes and limits; no adjustment is applied to the analysis.

47 images have verified workbook matches. `couple sitting opposite a woman` has no verified row and is explicitly shown as unavailable. `burglars` maps to workbook `burglar`; zero-padded `newpic` filenames map to unpadded workbook IDs. The workbook has an incorrect A1-only dimension and a missing drawing reference; the importer reads it in streaming mode with dimensions reset, without altering it.

To reproduce the import, run `scripts/import_picture_archive.py` with Pillow and openpyxl available. Change `BOOKCLUB_SET` in `web/app.js` to select a different default. Any pool changes must also update `PICTURE_IDS` in `backend/scoring.py` and deploy the backend before the frontend. Tests verify pool parity and default-picture acceptance.

## Workflow

```bash
# setup and tests (details in docs/operations.md)
.venv/Scripts/python.exe -m pytest tests -q
.venv/Scripts/python.exe backend/app.py              # API on :8000, uses models/amc
python -m http.server 8080 --directory web           # UI on :8080
# local-only fixture runner, no live model requests
python scripts/preview_ui.py                        # UI on :8081; /__test__/ runs result fixtures
# /__test__/?mode=flow exercises the full UI with a synthetic busy response

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
