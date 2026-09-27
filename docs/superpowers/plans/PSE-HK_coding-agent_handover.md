# PSE-HK — Coding Agent Handover

## 1. Project Goal

Build a web-based **Picture Story Exercise (PSE)** prototype for Hong Kong users that:

1. Presents a set of publicly reusable PSE-style stimulus pictures.
2. Collects stories written naturally in:
   - Traditional Chinese
   - Hong Kong Cantonese
   - English
   - Mixed Cantonese/English
3. Scores the stories for implicit motive imagery using the published **Automated Motive Coder (AMC)** model:
   - Achievement (`ach`)
   - Affiliation / intimacy (`aff`)
   - Power (`pow`)
   - No motive imagery (`null`)
4. Uses **two parallel scoring paths** for Cantonese:
   - Direct Cantonese → AMC
   - Cantonese → conservative English translation → AMC
5. Preserves enough metadata to later test whether the direct Cantonese path is valid relative to:
   - translated-English AMC
   - expert human coding using Winter-style rules

This is an **experimental research / educational implementation**, not a diagnostic personality test.

Do **not** present results as clinical conclusions, population norms, or definitive statements about the user's personality.

---

# 2. Scientific Background

The PSE is derived from the Thematic Apperception Test tradition but is used in modern implicit-motive research with relatively explicit content-coding systems.

The main motives of interest are:

| Label | Motive |
|---|---|
| `ach` | Achievement |
| `aff` | Affiliation / intimacy |
| `pow` | Power |
| `null` | No scorable motive imagery |

The intended automated scorer is:

- Hugging Face model: `automatedMotiveCoder/setfit`
- Based on multilingual E5 embeddings / SetFit
- Approximate model weight size: ~2.2 GB

Important limitation:

The underlying multilingual encoder can process Chinese, but the **AMC classifier itself has not been validated specifically on native Traditional Chinese or Hong Kong Cantonese PSE stories**.

Therefore:

- Direct Cantonese scoring is experimental.
- English-translated scoring should be retained as a comparison path.
- Do not turn raw scores into fake percentile scores or "82/100 achievement".
- Do not claim Cantonese psychometric validity unless it is later demonstrated empirically.

---

# 3. Picture Stimuli

Prefer the newer openly licensed PSE stimulus images rather than classic TAT images with uncertain copyright status.

The previously identified open PSE resource contains:

- a large database of PSE pictures
- approximately 30 newer stimuli released under licenses such as:
  - CC0
  - CC-BY
  - CC-BY-SA

Implementation rule:

- Store license metadata for every picture.
- Only ship pictures whose redistribution rights are clear.
- Keep image filename, source, author if required, license, and attribution URL in a data file.

Example:

```json
{
  "id": "newpic_01",
  "filename": "/stimuli/newpic_01.jpg",
  "license": "CC-BY",
  "author": "...",
  "source_url": "...",
  "attribution_required": true
}
```

Do not assume that all historical TAT/PSE images are freely reusable merely because they are publicly viewable.

---

# 4. Suggested Test Flow

A first version can use **6 pictures**.

Suggested participant flow:

1. Intro and informed-use notice.
2. Explain that there are no right or wrong stories.
3. Do **not** reveal that the system is looking for achievement, affiliation, or power.
4. Present one picture.
5. Show it for approximately 10 seconds.
6. Hide the picture.
7. Give the participant approximately 4–5 minutes to write a story.
8. Prompt them to address naturally:
   - What is happening?
   - Who are the people?
   - What led up to this?
   - What are they thinking / feeling / wanting?
   - What happens next?
9. Repeat for all pictures.
10. Only score after the full exercise is completed.
11. Show an experimental result summary.

Do not display motive labels or hints before story collection is complete, because that could prime later responses.

---

# 5. Language Handling

Users should be allowed to write naturally in:

- Hong Kong Cantonese
- Traditional Chinese
- English
- mixed Cantonese + English

Do not force users to convert Cantonese into Standard Written Chinese.

Examples that should be accepted unchanged:

```text
佢今次真係好想贏。
佢唔想再俾人睇死。
最後佢都係行過去陪個friend。
```

The original text must always be preserved exactly.

---

# 6. Sentence Segmentation

AMC operates at sentence level.

First split the **original user text** into semantic sentences.

Primary punctuation boundaries:

```text
。
！
？
!
?
…
newline
```

Be careful around quoted dialogue.

Example:

```text
佢話：「我今次一定要做到。」
```

Prefer keeping this as one semantic sentence rather than breaking mechanically at every punctuation symbol.

Do not translate the whole paragraph and then re-split it, because that destroys sentence alignment.

Instead:

```text
Original story
    ↓
Sentence segmentation
    ↓
Sentence IDs
    ↓
Parallel direct scoring + translation
```

Example sentence IDs:

```text
p1-s1
p1-s2
p1-s3
p2-s1
...
```

---

# 7. Two Cantonese Scoring Paths

For every original sentence, run two parallel analyses.

## Path A — Direct Cantonese

```text
Original Cantonese sentence
        ↓
AMC
        ↓
ach / aff / pow / null
```

This tests whether the multilingual representation transfers adequately to Cantonese.

Treat this output as experimental.

---

## Path B — Conservative English Translation

```text
Original Cantonese sentence
        ↓
Literal / conservative English translation
        ↓
AMC
        ↓
ach / aff / pow / null
```

Do not use a normal "make this sound natural" translation.

The translator must avoid adding psychological interpretation.

---

# 8. Translation Layer

Preferred V1 implementation:

**Cloudflare Workers AI**

Preferred model to test first:

```text
@cf/qwen/qwen3-30b-a3b-fp8
```

Alternative:

```text
@cf/zai-org/glm-4.7-flash
```

Reasons:

- good multilingual capability
- suitable Chinese-language model family
- integrates directly with Cloudflare Worker
- free usage allowance is likely sufficient for hobby / research prototype scale
- no need to host another large model
- Cloudflare states that prompts / outputs are not used for model training without explicit consent

Before production deployment, verify current:
- pricing
- free quota
- model availability
- privacy terms

Do not rely on an automatic model router if reproducibility matters.

Pin the exact translation model and store its identifier.

---

# 9. Translation Prompt

Use a fixed, versioned translation prompt.

Recommended system / instruction prompt:

```text
You are translating Hong Kong Cantonese narrative text into English
for subsequent linguistic content analysis.

Translate semantically and conservatively.

Rules:
1. Preserve the meaning of each sentence as closely as possible.
2. Do not make the story more coherent, literary, explicit, polished,
   or natural than the original.
3. Do not infer motivations, intentions, emotions, relationships,
   causes, or outcomes that the writer did not explicitly state.
4. Preserve uncertainty and modality, including expressions such as:
   可能, 應該, 好似, 想, 一定, 未必.
5. Preserve negation exactly.
6. Preserve the intensity of emotional expressions.
7. Preserve interpersonal roles and power relationships.
8. Translate Hong Kong Cantonese idioms by meaning rather than
   transliteration, but do not add interpretation.
9. Preserve English words and code-switching where possible.
10. Do not combine, divide, reorder, or omit sentences.
11. Return exactly one English translation for every input sentence.
12. Do not explain or comment on the story.
13. If a phrase is genuinely ambiguous in a way that could change
    psychological interpretation, flag translation_uncertain=true.

Return valid JSON matching the supplied sentence IDs.
```

Use the lowest available temperature, ideally:

```text
temperature = 0
```

or equivalent deterministic settings.

---

# 10. Translation Request Format

Do not call the LLM once per sentence.

Send the complete set of aligned sentences in one request.

Example:

```json
{
  "sentences": [
    {
      "id": "p1-s1",
      "text": "呢個男人望住幅畫，覺得自己今次一定要做到。"
    },
    {
      "id": "p1-s2",
      "text": "佢之前已經失敗咗好多次。"
    },
    {
      "id": "p1-s3",
      "text": "但佢唔想再俾其他人睇死。"
    }
  ]
}
```

Expected response:

```json
{
  "translations": [
    {
      "id": "p1-s1",
      "english": "The man looks at the painting and feels that he must succeed this time.",
      "translation_uncertain": false
    },
    {
      "id": "p1-s2",
      "english": "He has already failed many times before.",
      "translation_uncertain": false
    },
    {
      "id": "p1-s3",
      "english": "But he does not want other people to look down on him anymore.",
      "translation_uncertain": false
    }
  ]
}
```

The AMC receives only the `english` text.

Keep `translation_uncertain` for audit / research purposes.

---

# 11. Cantonese Expressions Worth Auditing Carefully

Some HK Cantonese expressions may translate into English in ways that alter motive coding.

Examples:

```text
唔抵得
睇死
唔gur
寸
串串貢
頂唔順
過唔到自己
冇癮
唔忿氣
俾人睇低
搞掂
攞威
爭啖氣
```

The system should preserve the original source sentence permanently so problematic translations can later be reviewed or re-run.

---

# 12. AMC Backend

Preferred hosting:

**Modal**

Reason:

- model is ~2.2 GB
- unsuitable for Cloudflare Worker
- awkward for normal Vercel Functions
- Modal can scale to zero
- free monthly compute allowance should be ample for prototype usage
- no need to leave a personal computer online

Architecture:

```text
Cloudflare Pages / Vercel
        ↓
Cloudflare Worker
        ↓
Modal API
        ↓
SetFit AMC
```

The model should be loaded once per container lifecycle, not per request.

Conceptual backend:

```python
from setfit import SetFitModel

model = SetFitModel.from_pretrained(
    "automatedMotiveCoder/setfit"
)

def score(sentences):
    labels = model.predict(sentences)
    probs = model.predict_proba(sentences)

    return {
        "labels": labels.tolist(),
        "probabilities": probs.tolist()
    }
```

Pin a specific AMC revision once the build is stable.

Example metadata:

```text
AMC_model = automatedMotiveCoder/setfit
AMC_revision = <pinned commit hash>
```

Do not silently upgrade model versions.

---

# 13. Modal Deployment Rules

Recommended initial settings:

```text
min_containers = 0
max_containers = 1
```

This:

- allows scale-to-zero
- prevents large accidental concurrency bills
- is suitable for a small PSE site
- reduces abuse risk

Start with approximately:

```text
CPU: 1
RAM: ~6 GB
```

Benchmark and reduce / increase only if needed.

Avoid:

```text
min_containers = 1
```

unless cold-start latency becomes unacceptable, because that defeats much of the cost advantage.

Bake model weights into the container image or otherwise use Modal's image caching so that Hugging Face does not download ~2.2 GB on every cold start.

---

# 14. Modal Cost Model

Modal is not priced simply per HTTP request.

It charges based on active compute:

```text
CPU usage
+
RAM allocation / usage
+
other optional resources
```

Typical lifecycle:

```text
No traffic
→ scale to zero
→ essentially no compute charge

Request
→ container starts
→ PyTorch + model load
→ inference
→ response
→ short idle window
→ scale to zero
```

The previously checked Starter plan included a recurring monthly free compute allowance.

Before deployment, verify current Modal pricing and whether the allowance is still recurring.

The model image existing / being deployed is not equivalent to an always-running paid VM.

Potential cost traps to avoid:

- keeping minimum containers permanently warm
- excessive CPU / RAM allocation
- unnecessary persistent storage
- aggressive concurrency / autoscaling
- selecting premium regions
- uncontrolled public endpoint abuse

---

# 15. Frontend Hosting

Recommended:

**Cloudflare Pages**

Alternative:

**Vercel**

Frontend can remain mostly static.

Responsibilities:

- consent / instructions
- stimulus presentation
- timer
- story editor
- progress state
- final result visualization
- no ML model locally

Static assets:

```text
/stimuli/
/licenses/
/app/
```

---

# 16. Cloudflare Worker Responsibilities

Use a Cloudflare Worker as the orchestration layer.

Responsibilities:

1. Receive final PSE submission.
2. Validate payload.
3. Enforce size limits.
4. Run sentence segmentation or receive already segmented text.
5. Call Workers AI for Cantonese → English translation.
6. Call Modal AMC for:
   - original sentences
   - translated English sentences
7. Combine results.
8. Return a normalized response to frontend.
9. Optionally store anonymized / consented research records.

The browser should not receive:
- Cloudflare API credentials
- Modal secrets
- private backend tokens

---

# 17. Recommended End-to-End Request Flow

```text
User completes all six stories
        ↓
POST /api/score
        ↓
Cloudflare Worker
        ↓
split stories into sentence IDs
        ↓
┌─────────────────────────────┐
│                             │
▼                             ▼
Workers AI                 Modal AMC
translation               original Cantonese
│                             │
▼                             │
English sentences             │
│                             │
▼                             │
Modal AMC                     │
English                        │
│                             │
└──────────────┬──────────────┘
               ▼
      compare / aggregate
               ↓
         frontend result
```

Do not call AMC separately for every sentence.

Batch all sentences from the completed assessment.

---

# 18. Suggested API Contract

## Browser → Worker

```json
{
  "assessment_id": "uuid",
  "stories": [
    {
      "picture_id": "newpic_01",
      "text": "..."
    },
    {
      "picture_id": "newpic_02",
      "text": "..."
    }
  ]
}
```

---

## Worker → Modal

```json
{
  "sentences": [
    {
      "id": "p1-s1",
      "text": "..."
    },
    {
      "id": "p1-s2",
      "text": "..."
    }
  ]
}
```

---

## Modal → Worker

Suggested normalized form:

```json
{
  "model": "automatedMotiveCoder/setfit",
  "revision": "...",
  "results": [
    {
      "id": "p1-s1",
      "prediction": "ach",
      "scores": {
        "ach": 0.82,
        "aff": 0.14,
        "pow": 0.31,
        "null": 0.07
      }
    }
  ]
}
```

Important:

AMC uses one-vs-rest classification.

Do **not** automatically assume the returned scores form a mutually exclusive softmax distribution summing to 1.

Check the model's exact `predict_proba()` behavior before designing visualizations.

---

# 19. Suggested Internal Data Model

Keep at least:

```json
{
  "assessment_id": "...",
  "created_at": "...",
  "app_version": "...",
  "translation_prompt_version": "1.0",
  "translator_model": "@cf/qwen/qwen3-30b-a3b-fp8",
  "amc_model": "automatedMotiveCoder/setfit",
  "amc_revision": "...",
  "stories": [
    {
      "picture_id": "newpic_01",
      "raw_text": "...",
      "sentences": [
        {
          "id": "p1-s1",
          "source_text": "...",
          "translation": "...",
          "translation_uncertain": false,
          "direct_amc": {
            "prediction": "pow",
            "scores": {}
          },
          "translated_amc": {
            "prediction": "pow",
            "scores": {}
          }
        }
      ]
    }
  ]
}
```

Do not discard raw text after scoring unless the privacy design explicitly requires immediate deletion.

If retaining research data, obtain explicit consent and define retention rules.

---

# 20. Score Aggregation

Initial V1 should stay conservative.

Possible summary:

```text
Direct Cantonese:
Ach count
Aff count
Pow count

Translated English:
Ach count
Aff count
Pow count
```

Also calculate agreement:

```text
sentence-level agreement rate
agreement by motive
number of translation_uncertain sentences
```

Example:

```text
Direct Cantonese vs translated English:
17 / 21 sentences same primary classification
```

Avoid fake normative language such as:

```text
"You are 82% achievement-driven."
```

Avoid:

```text
"High power personality"
"Low intimacy"
```

unless validated norms are later established.

Better wording:

```text
"In your stories, achievement-related imagery appeared more often
than power-related imagery under this experimental coding method."
```

---

# 21. Story-Length Adjustment

Raw motive counts are affected by how much a person writes.

Do not assume:

```text
12 affiliation images > 6 affiliation images
```

without considering word count.

For research-grade analysis, consider:

- motive images per 1,000 words
- or residualization against total word count
- or methods matching the relevant published literature

For V1, display:

- raw count
- total words
- optionally motive images per 1,000 words

Do not invent population percentiles.

---

# 22. Privacy

PSE stories may contain intimate or emotionally revealing material.

Design assumptions:

- treat story text as sensitive user-generated content
- use HTTPS only
- do not expose backend keys
- avoid logging full story text unless necessary
- allow a non-storage mode
- if storing, make storage opt-in and state retention clearly
- avoid sending identifiable metadata unless needed

Cloudflare Workers AI was selected partly because its current stated data policy is more suitable than some free consumer-oriented LLM APIs.

Re-check current policy before launch.

---

# 23. Abuse / Cost Protection

Add:

- Cloudflare Turnstile
- rate limiting
- payload size cap
- maximum stories per request
- maximum characters per story
- Modal `max_containers=1` initially
- server-side request timeout
- reject malformed JSON
- never expose Modal endpoint directly if avoidable

Suggested conservative limits:

```text
6–8 pictures
<= 5,000 characters per story
<= 40,000 total characters per assessment
```

Exact limits can be tuned.

---

# 24. Reproducibility

Version all analysis components.

Store:

```text
app_version
picture_set_version
sentence_splitter_version
translation_prompt_version
translator_model
translator_model_version if available
AMC_model
AMC_revision
aggregation_method_version
```

This matters because an apparently small translator change can alter motive coding.

Do not silently swap translator models.

---

# 25. Validation Plan

If the project becomes serious, collect a Cantonese dataset.

Ideal validation design:

```text
Native Cantonese PSE stories
        ↓
human expert Winter-style coding
        ↓
compare with:
    A. direct Cantonese AMC
    B. Cantonese → English → AMC
```

Measure separately for:

- Achievement
- Affiliation
- Power

Potential statistics:

- precision / recall / F1 at sentence level
- Cohen's kappa
- ICC where appropriate
- correlations at participant aggregate level

Also examine disagreements specifically involving:

- Cantonese idioms
- code-switching
- omitted subjects
- implied emotions
- culturally specific interpersonal language

This is the step required before claiming that the system "works in Cantonese" psychometrically.

---

# 26. Optional Future Improvement

If enough Cantonese expert-coded data are collected:

1. Fine-tune / adapt a multilingual encoder on Cantonese motive-coded sentences.
2. Compare with translated-English AMC.
3. Test whether translation remains necessary.
4. Potentially publish:
   - dataset
   - validation study
   - model card
   - Cantonese PSE benchmark

Do not start with this.

V1 should use the existing AMC unchanged.

---

# 27. Alternative Scorer Worth Benchmarking Later

A newer English-language automated implicit-motive model based on ELECTRA was identified in the literature.

Potential later experiment:

```text
Cantonese
    ↓
conservative English translation
    ↓
English ELECTRA motive scorer
```

This could be compared against the SetFit AMC English path.

Do not complicate V1 with multiple scoring models unless needed.

---

# 28. Recommended Repository Structure

Example:

```text
pse-hk/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  ├─ public/
│  │  │  └─ stimuli/
│  │  └─ ...
│  │
│  └─ worker/
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ translate.ts
│     │  ├─ segment.ts
│     │  └─ score.ts
│     └─ wrangler.toml
│
├─ services/
│  └─ motive-coder/
│     ├─ modal_app.py
│     ├─ requirements.txt
│     └─ README.md
│
├─ data/
│  ├─ stimuli.json
│  └─ licenses.json
│
├─ shared/
│  ├─ schemas/
│  └─ types/
│
├─ docs/
│  ├─ methodology.md
│  ├─ privacy.md
│  └─ validation-plan.md
│
└─ README.md
```

---

# 29. Suggested Technology Choices

Frontend:

```text
Next.js
or
React + Vite
```

Hosting:

```text
Cloudflare Pages
```

API / orchestration:

```text
Cloudflare Worker
```

Translation:

```text
Cloudflare Workers AI
Qwen
```

Motive inference:

```text
Python
SetFit
PyTorch
Modal
```

Optional database:

```text
Cloudflare D1
```

Use a database only if assessment persistence is genuinely needed.

For anonymous one-off scoring, V1 could avoid a database entirely.

---

# 30. MVP Build Order

## Phase 1 — Local proof of concept

1. Download / select 6 openly licensed pictures.
2. Create simple story-entry UI.
3. Implement sentence splitter.
4. Run AMC locally once to confirm output format.
5. Test Cantonese examples manually.

## Phase 2 — Model service

6. Deploy AMC on Modal.
7. Batch sentence scoring.
8. Pin AMC revision.
9. Measure cold-start and inference latency.

## Phase 3 — Translation

10. Add Workers AI.
11. Implement fixed translation prompt.
12. Require aligned JSON output.
13. Add uncertainty flags.
14. Test HK Cantonese idioms.

## Phase 4 — Dual scoring

15. Run original Cantonese and translated English through AMC.
16. Store / return both paths.
17. Calculate agreement.

## Phase 5 — PSE UX

18. Add picture timer.
19. Hide picture before writing if following standard protocol.
20. Add writing timer.
21. Prevent motive feedback until all pictures are complete.
22. Add results visualization.

## Phase 6 — Safety / reliability

23. Add Turnstile.
24. Add rate limits.
25. Add payload limits.
26. Add privacy notice.
27. Add license / attribution page.
28. Test on mobile.

---

# 31. MVP Acceptance Criteria

The MVP is complete when:

- [ ] User can complete a 6-picture PSE.
- [ ] Original Cantonese text is preserved.
- [ ] Every story is split into stable sentence IDs.
- [ ] Every sentence receives direct AMC scoring.
- [ ] Every sentence receives a conservative English translation.
- [ ] Every translated sentence receives AMC scoring.
- [ ] Source and translation remain aligned.
- [ ] Translation uncertainty can be flagged.
- [ ] App shows aggregate Ach / Aff / Pow results.
- [ ] App shows disagreement between direct and translated paths.
- [ ] Results are labelled experimental.
- [ ] No fake percentile / diagnostic interpretation is shown.
- [ ] AMC revision and translator model are recorded.
- [ ] Model service can scale to zero.
- [ ] Endpoint has abuse protection.
- [ ] Only clearly reusable image stimuli are shipped.

---

# 32. Important Product Language

Use language such as:

```text
Experimental automated coding
```

```text
This tool analyses recurring motive-related imagery in the stories you wrote.
```

```text
Cantonese scoring has not yet been formally validated.
```

```text
The two language paths are shown for comparison.
```

Avoid:

```text
Personality diagnosis
```

```text
Your true unconscious motive is...
```

```text
Scientifically proven Cantonese personality test
```

```text
You score 87th percentile
```

unless future validation data actually support such claims.

---

# 33. Core Design Principle

The system should preserve the full processing chain:

```text
Picture
  ↓
Original narrative
  ↓
Original sentence
  ├───────────────→ Direct Cantonese AMC
  │
  └→ Conservative translation
             ↓
        English sentence
             ↓
         English AMC
```

Never overwrite the original story with the translated version.

The original text is the primary research record.

---

# 34. Key Implementation Decision Summary

Use:

```text
Cloudflare Pages
    +
Cloudflare Worker
    +
Workers AI / Qwen translation
    +
Modal-hosted automatedMotiveCoder/setfit
```

Why:

- mostly free at expected usage
- frontend infrastructure is simple
- no personal computer required
- large PyTorch model stays outside serverless frontend limits
- translation can remain server-side
- model service scales to zero
- architecture remains reproducible
- direct Cantonese and translated-English analyses can be compared

---

# 35. First Task for the Coding Agent

Start by producing a minimal end-to-end technical spike, not the polished UI.

Implement:

```text
POST /api/score-test
```

Input:

```json
{
  "text": "佢今次真係好想贏。但佢唔想再俾人睇死。"
}
```

Expected pipeline:

```text
1. sentence split
2. direct Cantonese AMC
3. Workers AI translation
4. translated-English AMC
5. aligned JSON response
```

Expected response shape:

```json
{
  "sentences": [
    {
      "id": "s1",
      "source": "佢今次真係好想贏。",
      "translation": "He really wants to win this time.",
      "translation_uncertain": false,
      "direct": {
        "prediction": "ach",
        "scores": {}
      },
      "translated": {
        "prediction": "ach",
        "scores": {}
      }
    }
  ],
  "metadata": {
    "translator_model": "...",
    "translation_prompt_version": "1.0",
    "amc_model": "automatedMotiveCoder/setfit",
    "amc_revision": "..."
  }
}
```

Once this spike works reliably, build the PSE picture / timer / story UI around it.

---

# 36. Research Resources Previously Identified

Useful starting points:

- Automated Motive Coder:
  https://huggingface.co/automatedMotiveCoder/setfit

- Multilingual E5:
  https://huggingface.co/intfloat/multilingual-e5-large

- HuMAN Lab PSE resources:
  https://www.psych2.phil.uni-erlangen.de/~oschult/humanlab/resources/resources_researchers.htm

- Winter motive imagery scoring manual:
  https://www.psych2.phil.uni-erlangen.de/~oschult/humanlab/squirrel/winter1994.pdf

- Cloudflare Workers AI docs:
  https://developers.cloudflare.com/workers-ai/

- Modal:
  https://modal.com/

Before implementation, verify the current terms, availability, and pricing of cloud services because these may change.

---

# 37. Non-Goals for V1

Do not spend time initially on:

- clinical interpretation
- percentile norms
- user accounts
- social login
- sophisticated longitudinal profiles
- fine-tuning AMC
- training a Cantonese model
- vector databases
- multiple LLM translators
- multiple motive classifiers
- complex dashboards

The core research question comes first:

> Can native HK Cantonese PSE narratives be scored consistently by the multilingual AMC, and how closely does that agree with a controlled English-translation path?

Build the simplest system that lets us test that cleanly.
