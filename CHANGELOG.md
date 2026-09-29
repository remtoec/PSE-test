# Changelog

## 2026-09-29 — Ground interpretations in story evidence

- Keep 畫中有你 and complete-story prompts; make character guidance optional
  and remove hidden-self claims during writing. Balance all three motive notes.
- Exclude faint scores from main counts; retain them as exploratory sentence
  labels. Require distinct sentences across stories before showing a profile.
- Label the ratio of summed picture means as a research reference. Missing
  picture means disable overall comparison; no average-person claim is made.
- Reserve stronger wording for themes recurring across three stories and
  surviving every story omission with a recalculated matching reference.
  Other larger differences and translation failures remain tentative.
- Show exact supporting sentences; replace projection/rarity claims with
  relative picture emphasis. Share method text and interpretation with export.
- Record guidance v4 and reading v2. Backend and picture pool unchanged.

Rationale, trade-offs and verification: [independent review](docs/copy-benchmark-rationale.md).

Each change is listed with the reason for it. Commits: `f5fed36` (redesign) and
`e9c0d2d` (same-day follow-up). Details of the benchmark and its limits:
[protocol review, 2026-09-29](docs/pse-protocol-review.md#2026-09-29-revision-results-with-a-benchmark).

## 2026-09-29 — Mobile-first redesign and interpreted results

### Why this round happened

The owner reviewed the live flow and raised three problems:

1. **Too text-heavy and distracting.** Most participants open the link on a
   phone, where the writing box sat below a heading, a paragraph, a 2×2 hint
   grid and a disclaimer, and the results page ran to about 4,900px.
2. **The prompt asked for the wrong thing.** 「然後，發生咗咩事？」 framed the task
   as continuing a story (續寫). The PSE wants a *complete* story, and projection
   happens in all of it: what the characters are going through, what led up to
   this moment, what is going on, and especially how it ends.
3. **The results were too neutral.** Two equal panels of counts and several
   hedges gave no insight, benchmark or interpretation, so nothing pulled the
   reader in. The PSE is meant here as a rough marker of sensitivity to the
   competence and relatedness needs of self-determination theory, drawing on
   McAdams (2015), chapter 6.

A second review the same day asked for per-character prompts, a gentler
nudge, more sensitive detection, a language reassurance, and a better name.

### Writing screen

- **Heading 「寫出成個故事」; intro 「每張圖，都係故事嘅中間。」**
  *Why:* the picture is one frame from the middle of a story. Framing it that
  way asks for the before, the inner experience and the ending, which carry
  most motive imagery in PSE coding, instead of only the next event.
- **The four standard prompts moved into the writing box as placeholder text.**
  They disappear once the participant types; a small row 此刻 · 前因 · 內心 · 結局
  stays underneath.
  *Why:* owner request. It removes the paragraph and hint grid above the box, so
  writing starts above the fold on a phone. The reminder row keeps the story arc
  visible after the placeholder has gone.
- **Prompts ask about each character, using 他／她, and suggest 男人／女人 or names**
  (previously a collective 佢哋).
  *Why:* projection happens per character: whose want, whose ending. Translation
  prompt v3 renders an unspecified 佢 as "they", so in two-person stories the
  English merges the characters before motive coding. Explicit pronouns or names
  keep them apart.
- **Line above the box: 「英文、廣東話、書面語，或者夾雜都得，點舒服點寫。」**
  *Why:* owner request. Spontaneous imagery matters more than polished prose, and
  people writing colloquial Cantonese or a mix should not feel they are doing it
  wrong.
- **Short-story nudge rewritten as a quiet invitation**
  (「想講多少少都得。他／她心入面諗緊咩、最後點樣，往往藏住你自己嘅影子。」), in muted grey
  instead of a red bar.
  *Why:* the previous version read as a task instruction. The aim is curiosity
  about oneself, not compliance. It still appears once and never blocks.
- **Timer moved into the round bar; masthead slimmed.**
  *Why:* vertical space on phones.
- **Guidance version `pse-hk-guidance-v3`; resumed older drafts record
  `…-resumed-with-v3`.**
  *Why:* downloads should say which instructions a story was written under.

### Results page

- **Leads with one interpretation:** a clear lean (「特別著重」), a slight lean
  (「有少少偏向」), close to the pictures, or too few themes to read.
  *Why:* the owner found the previous page too neutral. One stated reading gives
  the participant something to react to, agree with or argue with.
- **Benchmark: each theme's share of the participant's themes, against its
  share in German expert-coded stories for the same pictures.**
  *Why:* pictures pull themes differently (the boxer pulls achievement, the
  couple by the river pulls affiliation). Comparing with what the pictures
  usually elicit separates the writer's contribution from the picture's. Shares
  rather than raw counts, because both use the same unit (sentences with
  imagery) and shares cancel most of the story-length difference. It is
  labelled a rough reference, with no z-scores, percentiles or rankings, because
  language, coder and samples differ.
- **Themes grouped under competence (achievement + power) and relatedness
  (affiliation).**
  *Why:* the owner's self-determination framing. McAdams places achievement and
  power motivation within the broad domain of competence, and affiliation and
  intimacy within relatedness.
- **Picture by picture: what it usually pulls against what you wrote, with ✦
  marking themes you brought in.**
  *Why:* a theme the picture does not cue is the classic projection signal in
  TAT/PSE work, and the most personal, intriguing finding in a four-story run.
- **Research notes for each motive from McAdams ch. 6, with the leading one
  open** (e.g. people high in achievement motivation prefer moderate
  challenges with quick feedback; power "is like fire").
  *Why:* this gives the interpretation meaning. The notes are phrased as group
  tendencies, not claims about the reader.
- **More sensitive detection:** a theme counts when either the original or
  the translated reading rates it at least 30% likely (the model's own
  cut-off is 50%). Sentence cards label the 30–50% themes 「隱約」.
  *Why:* the owner prefers false positives to silence, because the goal is to
  intrigue and draw an emotional response. Direct Cantonese coding also
  under-detects. The label keeps the borderline themes transparent. The 30%
  value is not calibrated against human coding (`FAINT` in `web/app.js`).
- **Slight-lean tier (5–12 points above the pictures' share).**
  *Why:* 「貼近圖片本身」 was the least engaging outcome. Softer wording keeps
  small differences honest while still naming a direction.
- **Reflection is now three static questions: competence, relatedness,
  autonomy.** This replaces the carousel (competence/relatedness,
  intrinsic/extrinsic, promotion/prevention).
  *Why:* it matches the SDT framing. The PSE speaks to the first two needs, and
  autonomy can only be asked. A plain list is also easier on a phone. Nothing is
  typed, stored or sent.
- **Both analysis paths, agreement, picture pulls, timing, theory and credits
  moved into one collapsed section at the end.**
  *Why:* they are kept for transparency and for facilitators, but out of the way
  of the reading.

### Whole site

- **One reading column; journey bar, desktop picture art and English labels
  removed; copy shortened throughout.** The results page is ~3,200px on a
  390px phone, down from ~4,900px.
  *Why:* owner comment 1.
- **Renamed 故事以外 → 畫中有你.**
  *Why:* "beyond the story" did not say what the exercise is about. "You are in
  the picture" does: the wants you give the characters are your own.
  Alternatives considered: 畫外心聲, 睇圖講心, 借圖發揮.

### A reversed decision

Earlier docs said picture-pull norms must never benchmark an individual. That
rule is reversed at the owner's request, with narrower guardrails recorded in
[the protocol review](docs/pse-protocol-review.md#2026-09-29-revision-results-with-a-benchmark).

### Not changed

Backend, translation prompt, picture set and order, timing, draft storage and
privacy. The new frontend works with the currently deployed backend.

### Verification

Browser fixtures pass (normal and translation-failed outcomes), as do a full
four-picture flow with reload/resume and busy/retry, and the 49 backend tests.
Not tested on physical iOS/Android phones, with screen readers, or against the
live model service. Records: [UI checks](docs/ui-overhaul-checks.md);
screenshots in `artifacts/ui-revision/`.
