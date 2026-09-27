# PSE-HK — Lean Build Spec (book club edition)

Supersedes `PSE-HK_coding-agent_handover.md` for the build. That file is kept only as background on the science.

## 1. What this is

A hobby web app: a short **Picture Story Exercise (PSE)**. Users write stories about pictures, then get an experimental read-out of the achievement / affiliation / power imagery in their stories.

- Shared as a public link in a book club WhatsApp group (90 members). Realistically **fewer than 20 people** will try it, one at a time, over the days before the event.
- It's a side activity, not the main event. Nobody watches the server. It must **scale to zero** and cost ~nothing.
- Users write in Traditional Chinese, HK Cantonese, English, or a mix. Never force Standard Written Chinese.
- It's for fun: **no diagnosis, no percentiles, no "you are 82% X"**.

## 2. Non-goals (do not build)

User accounts, database, storing stories, analytics, Turnstile, rate-limit middleware, Next.js/React, monorepo, a Cloudflare Worker, a group results page, detailed version-tracking fields, validation statistics, fine-tuning, multiple scoring models.

## 3. Architecture

```
Cloudflare Pages (static, instant load)
  index.html + stimuli/*.jpg + stimuli.json
        │  fetch (CORS)
        ▼
Modal app (one Python file, scales to zero)
  GET  /warm   → loads the model, returns {"ok": true}
  POST /score  → split → AMC(original) ─┐
                       → Workers AI translate → AMC(English) ─┴→ JSON
```

The page is **not** served from Modal. Opening the link must never wake the heavy container.

## 4. User flow

1. **Intro screen**, with these points:
   - "About 15–20 min. There are no right or wrong stories."
   - "Write in any language: Cantonese, Chinese, English, or a mix."
   - "Results may take up to a minute to appear."
   - "Your stories aren't saved. They're sent to Cloudflare AI for translation and scored, then discarded."
   - "Experimental, just for fun. Not a personality test."
   - Do **not** mention achievement / affiliation / power before the results.
2. For each of **4 pictures**:
   - Show the picture for 10 s, then hide it.
   - Show a textarea with a visible ~4 min timer. The timer is a soft limit: it shows "time's up" but still lets them finish.
   - Show gentle prompts: what's happening / who are they / what led up to this / what do they want or feel / what happens next.
3. **When the last picture starts**, fire `fetch(MODAL_URL + '/warm')` without waiting for or checking the result. This hides the cold start.
4. **Submit.** Show a loading animation (spinner plus rotating lines, e.g. "Waking up the scoring model…", "Translating your Cantonese…"). Time out after 150 s and show a Retry button.
5. **Results screen** (see §8).

## 5. Frontend rules (single `index.html`, vanilla JS + CSS)

- **Mobile first.** Most users open it from WhatsApp on a phone.
- **Drafts must survive a reload.** Save all stories and the current step to `localStorage` on every input. On load, resume where the user left off. Switching to WhatsApp mid-story can make the browser reload the tab, so this is required.
- **On a scoring error**, keep the stories and show Retry. Never clear drafts until results render successfully.
- Clear `localStorage` after results are shown, and offer a "Start over" button.
- Show a small attribution footer or page built from `stimuli.json`.
- Put `MODAL_URL` in one constant at the top of the script.

## 6. Pictures

- Use only openly licensed PSE pictures (CC0 / CC-BY / CC-BY-SA), e.g. from the HuMAN Lab resources (link in §13).
- `stimuli.json`:
  ```json
  [{"id": "p1", "file": "stimuli/p1.jpg", "license": "CC-BY", "author": "...", "source_url": "..."}]
  ```
- Compress the images to less than 300 KB each (they load on phones over WhatsApp links).

## 7. Backend (Modal, `app.py`)

### Settings

| Setting | Value | Reason |
|---|---|---|
| `min_containers` | `0` | Scale to zero between users |
| `max_containers` | `1` | Cost cap. Fewer than 20 sporadic users don't need more |
| `scaledown_window` | `600` s | Covers warm-up ping → submit (~4–5 min). Idle cost ≈ $0.08/h |
| `cpu` | `1` | |
| `memory` | ~4 GB | Model is 0.6B params (~2.2 GB fp32). Measure, then adjust |

- **Bake the model weights into the image** (download in the image build step) so a cold start never downloads 2.2 GB. Pin the model revision.
- Load the model once, in `@modal.enter()` on a class, not per request.
- Optional, only if measured cold start > ~45 s: try `enable_memory_snapshot=True` (check the current Modal docs).
- **CORS:** allow only the Cloudflare Pages origin.
- **Secrets:** `CF_ACCOUNT_ID` and `CF_API_TOKEN` (a Workers AI–scoped token), stored as a Modal Secret.
- **Never log story text.** Log only counts and timings.

### Input limits (reject with 400)

- At most 4 stories.
- At most 3,000 characters per story.
- JSON body only.

### Sentence splitting

Split the **original** text after any of `. ! ? 。 ！ ？ …` (including runs like `……` or `?!`, plus any closing quote such as `」` or `"` that follows), and on newlines. Trim, and drop empty pieces. Don't try to be clever about quotes inside dialogue. An imperfect split is acceptable for this app.

- Sentence IDs: `p{picture}-s{n}`, e.g. `p1-s3`.
- Leave one `assert`-based self-check in the file covering Cantonese, English, mixed text, and `……`.

### Translation (Workers AI REST, called from Python)

- Model: pin `@cf/qwen/qwen3-30b-a3b-fp8` (check that it's still listed). Store the name in a constant and return it in the response.
- Send **all sentences in one request** as `[{"id", "text"}]`. Ask for `{"translations": [{"id", "english", "uncertain"}]}` back.
- Qwen3 emits `<think>…</think>` by default. Disable thinking (`/no_think` or the API option) **and** strip any `<think>` block before parsing JSON.
- Use `temperature=0`.
- **Validate:** the output must contain exactly the same IDs as the input. On a mismatch or parse failure, retry once. If it fails again, return the direct results only with `"translation_failed": true`. The frontend then shows the direct results with a note.

Translation prompt (fixed; keep it as the constant `PROMPT_V1`):

```text
Translate each Hong Kong Cantonese / Chinese / mixed sentence into English
for later content analysis. Translate literally and conservatively.
- Keep each sentence's meaning; do not polish, smooth, or make it more coherent.
- Do not add motives, emotions, relationships, causes, or outcomes not stated.
- Keep uncertainty/modality (可能, 應該, 好似, 想, 一定, 未必), negation, and emotional intensity.
- Keep who-does-what-to-whom and power relations.
- Translate Cantonese idioms by meaning, without adding interpretation.
- Keep English words that were already in the source.
- One output per input id. Never merge, split, reorder, or drop sentences.
- If an ambiguity could change the psychological meaning, set "uncertain": true.
Return only JSON: {"translations":[{"id":"...","english":"...","uncertain":false}]}
```

### Scoring

- `automatedMotiveCoder/setfit`: a SetFit model on multilingual-e5-large, **one-vs-rest** over `nAch / nAff / nPow / Null`. Its probabilities do **not** sum to 1.
- Run the model twice in one container call each: once on all original sentences, once on all English sentences.
- **A sentence can carry more than one motive.** Store `motives` as a list, e.g. `["ach", "pow"]`, never a single label. Take the labels from `model.predict()` output; confirm its format in the spike before writing aggregation code. Drop `Null` from the list whenever any real motive is present.

## 8. API and results

**Request** `POST /score`

```json
{"stories": [{"picture_id": "p1", "text": "..."}]}
```

**Response**

```json
{
  "sentences": [
    {"id": "p1-s1", "source": "佢今次真係好想贏。", "english": "He really wants to win this time.",
     "uncertain": false,
     "direct":     {"motives": ["ach"], "scores": {"ach": 0.81, "aff": 0.05, "pow": 0.22, "null": 0.10}},
     "translated": {"motives": ["ach"], "scores": {"ach": 0.88, "aff": 0.04, "pow": 0.19, "null": 0.06}}}
  ],
  "summary": {
    "direct":     {"ach": 3, "aff": 5, "pow": 1},
    "translated": {"ach": 4, "aff": 5, "pow": 2},
    "agreement": {"same": 17, "total": 21},
    "total_chars": 1840, "english_words": 612
  },
  "translation_failed": false,
  "meta": {"amc_model": "automatedMotiveCoder/setfit", "amc_revision": "<hash>",
           "translator": "@cf/qwen/qwen3-30b-a3b-fp8", "prompt": "v1"}
}
```

- Agreement means that a sentence's `motives` set is identical in both paths.
- Chinese has no spaces between words, so never compute "per 1,000 words" from the original text. Show raw counts next to the text length.

**The results screen shows:**

1. Plain-language headline, e.g. "In your stories, affiliation-related imagery showed up most often, then achievement." A tie gets tie wording.
2. A small bar chart of counts for each path, side by side, labelled "Direct (Cantonese)" and "Via English translation".
3. "The two methods agreed on 17 of 21 sentences."
4. A collapsible per-sentence table: source, English, motives in each path, and a flag on uncertain translations. This is the fun part to discuss at the event.
5. Short explanations of the three motives. This is the first time the user sees them.
6. Disclaimer: "Experimental automated coding. Not validated for Cantonese. Not a personality test. Just for fun."

**Never** show percentiles, "high/low X personality", "your true unconscious motive", or single "% driven" numbers.

## 9. Cost and abuse guards (all of them)

- Modal: `max_containers=1`, input limits, CORS to the Pages origin, and a workspace spending limit if Modal offers one (check the current docs). The Starter plan includes $30/month of free credit. Expected spend is a few cents.
- Workers AI: 10,000 neurons/day free. One user ≈ 50–150 neurons, so fewer than 20 users is fine. On the free plan it errors instead of billing, and that error is handled by the `translation_failed` path.
- The Modal URL is visible in page source. That's acceptable at this scale.

## 10. Build order

1. **Local spike.** `pip install setfit`, load the model, score 5 Cantonese and 5 English sentences. Confirm the `predict()` and `predict_proba()` shapes. Write the splitter and its self-check.
2. **Modal.** Deploy `/warm` and `/score` with direct scoring only. Measure the cold start (from scaled to zero) and the warm latency for ~25 sentences.
3. **Translation.** Add the Workers AI call, validation, retry and fallback. Test the Cantonese phrases below.
4. **Page.** Build the flow, the drafts in `localStorage`, the warm-up ping, the loading animation, and the results screen.
5. **Deploy the page** to Cloudflare Pages and lock CORS to its origin.
6. **Phone test.** Run the full flow on a real phone. Switch to WhatsApp mid-story and come back: the drafts must still be there. Submit after the container has scaled down to check the loading animation and the timeout.
7. **Share the link.**

Cantonese phrases for translation testing: 唔抵得, 睇死, 俾人睇低, 唔忿氣, 爭啖氣, 攞威, 頂唔順, 過唔到自己, 搞掂, 冇癮, 寸.

## 11. Done when

- [ ] Opening the link loads instantly and doesn't touch Modal.
- [ ] A user can complete 4 pictures on a phone in Cantonese, English or a mix.
- [ ] Drafts survive a tab reload, and a failed submit keeps the stories and offers Retry.
- [ ] A warm-up ping fires at the last picture, and a cold submit shows the patience animation, not a frozen screen.
- [ ] Each sentence gets direct and translated motive lists (multi-motive allowed), aligned by ID.
- [ ] A translation failure falls back to direct-only results.
- [ ] The results screen follows the wording rules in §8.
- [ ] No story text is stored or logged anywhere.
- [ ] Modal scales to zero, and `max_containers=1`.
- [ ] Every picture's license is attributed.

## 12. Files

```
pse-hk/
├─ web/            # deployed to Cloudflare Pages
│  ├─ index.html
│  ├─ stimuli.json
│  └─ stimuli/*.jpg
└─ modal/
   └─ app.py       # splitter + self-check, translation, scoring, /warm, /score
```

## 13. References

- AMC model: https://huggingface.co/automatedMotiveCoder/setfit
- PSE pictures: https://www.psych2.phil.uni-erlangen.de/~oschult/humanlab/resources/resources_researchers.htm
- Winter scoring manual (background): https://www.psych2.phil.uni-erlangen.de/~oschult/humanlab/squirrel/winter1994.pdf
- Workers AI pricing and models: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Modal pricing: https://modal.com/pricing
