# PSE picture and guidance review — 2026-09-27

The existing flow had a useful PSE core: brief picture exposure, imaginative
writing, the usual four guide questions, no named motive categories during
writing, and interpretation after completion. It was suitable as a reading-group
exercise, but describing it as standardised was too strong. This revision keeps
the requested four-story format and makes the adaptations explicit.

## What changed and why

| Area | Finding in the previous implementation | Revision |
|---|---|---|
| Story task | “Write a story” did not clearly distinguish a narrative from a picture description. | Ask for a beginning, events, and ending. No autobiographical disclosure needed. |
| Guide questions | Present on desktop, collapsed behind “need inspiration” on phones. | Same four visible guides on every screen size; explicitly optional, not separate answers. |
| Mechanical coaching | Punctuation and character-naming instructions served the model. A later nudge also requested punctuation. | Remove those requirements. Keep one optional invitation to finish the story, with no need to add length or punctuation for the analysis. |
| Framing | The opening foregrounded motivation and “a little of you.” | Keep pre-writing framing about imagined stories. Personal-goal reflection stays after all four stories. |
| Repetition | Random mode invites another run, but did not explain how to handle familiar images. | Similar or different stories are both acceptable. |
| Timing | Ten seconds to view, a soft four-minute timer, early completion, pauses and recovery. | Retain these practical choices; gently ask participants to finish at four minutes and aim for one sitting. Do not describe absence of recorded deviations as research compliance. |
| Pull | Used only for selecting an older picture set. | Show picture-specific means and sample sizes after writing and in downloads, separately from participant counts. |

## Evidence informing the guidance

[Schultheiss & Pang (2007), author manuscript, pp. 23–24](https://www.joycespang.com/uploads/7/2/3/6/72366685/schultheisspang2007handbook.pdf)
describes complete imaginative narratives, ten-second exposure, non-evaluative
instructions, and guiding questions rather than a structured questionnaire. Its
example allows about five minutes, with computer advancement after four; it is
not a universal four-minute specification. It also permits repeated stories on
retest. The chapter recommends at least five pictures for multi-motive research
(p. 16). Four remains a deliberate time-saving choice here.

[Roch, Rösch & Schultheiss (2017), Methods](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.01540/full)
provides a published six-picture implementation with ten seconds of viewing and
four minutes of writing. Our timing resembles that implementation, while soft
limits, fixed order, home use and four pictures define this particular adaptation.

[Schönbrodt et al. (2020 online / 2021 issue)](https://doi.org/10.1080/00223891.2020.1726936)
provides German expert-coded picture statistics and discusses cue ambiguity and
story-length adjustment. These support informed picture selection; they do not
establish Cantonese participant norms or validate this automated classifier.

## Picture selection

Use boxer → couple by river → women in laboratory → ship captain. All four
belong to the widely used standard six. Their reference samples are substantial,
their situations vary, and their summed means offer reasonable coverage without
optimising numerical equality alone. Fixed order serves the bookclub's common
discussion material; it is not a claim that order effects disappear.

Source: supplied `assets/pqckn-osfstorage-archive/picture_pull_norm_table.xlsx`,
`Sheet 1`. Values below are B/D/F/P from each listed row.

| Picture | Row | Affiliation | Achievement | Power | Stories |
|---|---:|---:|---:|---:|---:|
| Boxer | 31 | 0.34 | 1.68 | 0.81 | 1724 |
| Couple by river | 20 | 3.03 | 0.03 | 0.34 | 1854 |
| Women in laboratory | 30 | 0.34 | 1.51 | 1.28 | 2331 |
| Ship captain | 45 | 0.47 | 0.20 | 1.56 | 2612 |
| Sum of means | — | 4.18 | 3.42 | 3.99 | — |

The sum describes selection coverage, not a predicted individual total. Do not
subtract these means, divide participants' counts by them, calculate z-scores
from their SDs, or infer a “strong motive despite low pull.” The model and
language differ, stories vary in length, and four observations cannot calibrate
an individual against these samples. Model counts remain exploratory counts.

Random mode includes all 48 supplied pictures. Forty-seven have verified row
matches; “couple sitting opposite a woman” remains unmatched rather than being
assigned a TAT identity from its filename. The importer preserves the source
workbook and records exact row references in the catalog.

## Facilitator use

Before writing, give everyone the same brief instructions. Leave the theme
definitions, workbook pulls, model examples and personal-goal questions until
after all stories. If someone asks what to write, refer to the four visible
guides without suggesting a plot or praising a particular theme. Participants
can use their comfortable language and should try to finish in one sitting.

After writing, first ask what the model actually recognised in a sentence and
whether translation preserved its meaning. Then discuss how the same picture
led to different plots. Personal-goal reflection is optional; resemblance to a
story is a discussion possibility, not evidence of a hidden trait. Repeated
random runs are further exploration, not improvement or a change score.

## Practical limits and traceability

Guidance is a Cantonese adaptation, not a validated translation of the research
instructions. Changing prompts cannot establish classifier validity. Punctuation
still affects the existing sentence splitter, but participants should not have
to shape their prose around that implementation. Evaluate model quality with
independently human-coded Cantonese stories if that becomes a future goal.

New drafts record `pse-hk-guidance-v2`. Resumed old drafts retain their original
images and are marked as having begun with legacy guidance. Downloads record
actual image order, source identities, guidance version, timing, and picture
pulls. Existing p1–p9 image bytes and IDs are preserved. Deploy the expanded
backend allowlist before releasing the new frontend.

## 2026-09-29 revision: results with a benchmark

The owner reviewed the flow and found it too text-heavy for phones, found the
writing heading (「然後，發生咗咩事？」) framed the task as continuing a story,
and found the results too neutral to be meaningful. This revision reverses the
earlier "context only, never a benchmark" rule above, deliberately and with
narrower guardrails.

**Writing (`pse-hk-guidance-v3`).** The heading asks for a whole story
(「寫出成個故事」). The standard four guide questions move into the writing box
as placeholder text, which disappears once the participant types, and are
worded to invite projection: who they are and what they are going through,
what led up to this, what they think, feel and want, and how it ends. A
four-word reminder row (此刻 · 前因 · 內心 · 結局) stays visible. The short-story
nudge asks for the before, the wants or the ending.

**Framing.** Following McAdams (2015, ch. 6), achievement and power motivation
fall within the broad domain of competence, and affiliation/intimacy within
relatedness. The page presents PSE imagery as a rough marker of sensitivity
to those two self-determination needs, and leaves autonomy to reflection.

**Benchmark.** A sentence carries a theme if either the direct or the
translated reading finds it. Within a run, each theme's share of all themes is
compared with its share in the German expert-coded pulls for the same
pictures. Sharing the unit (sentences with imagery, each motive at most once) makes
this closer to like-for-like than raw counts would be. Shares also cancel most
of the story-length difference, though not the language or coder difference.

| Reading | Rule | Headline |
|---|---|---|
| Sparse | fewer than 3 themes in total | stories rarely say what characters want; not an absence of motives |
| Lean | a theme's share is ≥ 12 points above the pictures' share | 「你嘅故事，特別著重…」 with your % vs typical % and the SDT need |
| Balanced | otherwise | close to what the pictures usually pull; names the most frequent theme |

Per picture, themes within 75% of the picture's strongest pull count as what
it usually pulls. Any other theme the participant wrote is marked ✦ as brought
in, the clearest projection cue in a four-story run. Pulls based on fewer than 30
stories are labelled as small samples.

**Still out of bounds.** No z-scores from the norm SDs, no subtraction of
means, no percentiles, no ranking between participants, and no claim that a
share is a trait. The page says that the reference is German, expert-coded and
not a norm. Research correlates are phrased as group tendencies ("people with
more of this theme tend to…"), not statements about the reader. With 4–10
themes per run, one sentence moves a share by 10–25 points; the page says so when
there are fewer than 6.
