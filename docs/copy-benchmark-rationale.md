# Copy and benchmark review — 2026-09-29

Reviewed baseline: `799eabf` (including `e9c0d2d`). This document records the
independent review and the decisions authorised by the owner afterwards. It
supersedes the sensitivity and interpretation policy in the earlier protocol
review; the earlier changelog remains a historical record.

> **Amended later the same day** (owner request): main counts now use the
> English reading's flags rather than the union of both readings; bars, the
> reference line and the overall amount are per 1,000 words; the page shows no
> percentages or counts and keeps the method in the download. The gates, the
> faint-label policy and the neutral copy below still apply. See the
> [protocol review, third revision](pse-protocol-review.md#third-revision-story-length-english-first-words-not-numbers).

## Purpose and tone

The activity is a warm, reflective Hong Kong bookclub exercise. Keep 畫中有你,
the complete-story framing, mixed-language freedom, and the four story prompts.
These invite participation without demanding polished writing. Avoid making
the participant write every character's biography or use gendered pronouns to
compensate for translation limitations. Names or roles can clarify characters.

The original review found three competing voices: a friendly facilitator, a
school writing exercise, and an authoritative psychological reading. Prefer a
thoughtful facilitator. Before writing, invite imagination without saying the
story reveals the writer's hidden self. Afterwards, invite recognition or
disagreement. A balanced result is not evidence of unimaginative writing; a
sparse result is not evidence that someone failed to describe wants.

Research notes should explain each motive's concern, a possible contribution,
and a possible tension with comparable warmth. Do not offer flattering trait
profiles for affiliation and disproportionately negative ones for power.
The SDT categories are reflection lenses, not measured need scores.

## Why the previous benchmark wording overreached

The reference is a ratio of summed German expert-coded picture means, not the
mean of participants' individual proportions. It is neither a Cantonese norm
nor a population percentile. A larger share can result from fewer detections
of other themes, and story length can still change the relative contribution
of each picture. Call it 同組圖片嘅研究參照, not 一般人.

Default reference shares: achievement 29.51%, affiliation 36.07%, power 34.43%.
The 5 and 12 percentage-point boundaries are editorial description rules, not
significance tests or calibrated psychological cutoffs. Example: counts
2/3/1 (achievement/affiliation/power) produce an affiliation lean; 3/3/1 produce
an achievement lean. One extra detection can change the interpretation.

The lowered 0.30 threshold counted faint detections with full weight. It can
recover missed themes but also introduce noise or flatten a profile. Counts
1/5/1 become balanced if faint additions change them to 5/5/5. Independent
model class scores are not established as calibrated correctness probabilities
for Cantonese. Do not call 0.30 a 30% chance of being correct.

The previous three-theme gate counted labels, allowing one sentence with three
labels to pass. The 75%-of-maximum picture rule identifies relatively leading
themes; its complement does not establish rarity or personal projection.

## Implementation decisions

- Main counts use the union of the model's original flags across available
  readings, each motive once per sentence. This still trades precision for
  recall; agreement is not independent confirmation.
- Unflagged scores at least 0.30 remain visible as exploratory 隱約 labels in
  sentence details and downloads. They do not affect profiles, evidence quotes,
  picture highlights, or headline strength.
- A profile requires at least three distinct theme-bearing sentences across
  at least two pictures. Otherwise show a non-blaming sparse reading.
- Retain 5-point slight and 12-point larger descriptive differences. Stronger
  wording additionally requires the focused theme in at least three stories,
  and the same theme remaining among the leading reference differences with
  at least a 5-point excess after omitting each story. Each omission recomputes
  the reference using the remaining pictures and needs three theme-bearing
  sentences across two pictures. Every tied focus must meet these conditions.
  These are conservative product heuristics, not psychometric validation.
- A larger but unstable difference receives tentative wording and an explicit
  explanation. Translation failure never receives the strongest wording.
- Missing reference data for any selected picture disables the run-level
  benchmark rather than comparing unmatched subsets or inventing thirds.
  Picture-level reference context remains available where verified.
- Show an exact source sentence, its picture number, and how many stories carry
  the focused model-flagged theme. Present it as a reading to consider, not a
  diagnosis. Render source text safely as text, including in downloads.
- Replace claims about rare projection with relative picture emphasis. Keep
  the 75% rule transparent as a display heuristic.
- Record guidance v4 and reading v2, preserving earlier draft guidance history.
  Website and downloaded interpretation must use the same calculation.

## Trade-offs and limits

There will be fewer emphatic readings. Faint themes stay available, and concrete
sentences provide interest without forcing a standout score. The three-story
gate can suppress a meaningful theme concentrated in one story; users can still
inspect it. Robustness to omission does not establish accuracy. The strongest
future improvement would be reference stories assessed through the same frozen
pipeline, relevant language and procedure, with held-out human-coded evaluation.
No new norm or threshold calibration is claimed in this change.

## Sources checked in the review

- [AMC model card](https://huggingface.co/automatedMotiveCoder/setfit): independent
  one-vs-rest outputs, published model revision, training source.
- [AMC paper](https://workshop-proceedings.icwsm.org/pdf/2025_31.pdf): German
  stories, English-translated evaluation and length-adjusted person scores.
- Repository `web/stimuli.json`: verified picture means and provenance.

## Verification record

- `node --test tests/reading.test.cjs`: 14 passed. Includes faint exclusion,
  distinct-sentence/story gates, successful and failed omission checks, ties,
  incomplete/zero references, fallback, literal evidence and export construction.
- `.venv/Scripts/python.exe -m pytest tests -q`: 49 passed on CPU.
- JavaScript syntax checks and `git diff --check`: passed.
- Local browser `http://127.0.0.1:8081/__test__/` and `?outcome=fallback`:
  both returned an empty failure list. Fixtures exercise screen/export parity,
  safe evidence rendering, missing references, faint-only results, and migration.
- Phone viewport requested at 390×844; screenshot inspected. Content width
  matched available document width (375px after scrollbar), with no horizontal
  overflow. Normal results and fallback rendered without captured console errors.
- Independent code reviewer found no blocking issue; suggested negative omission
  and tie regression cases were added and passed.
- The browser download-event observer timed out. Export text generation and
  screen parity were independently verified; actual browser file delivery was
  not confirmed. No live model request, GPU inference, physical-device test,
  calibration study, or deployment was performed.

Passing software checks does not validate the psychological interpretation.
