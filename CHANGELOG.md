# Changelog

## 2026-09-29 — Bookclub narrative copy and booklet styling

- Applied the approved copy direction across entry, picture/writing prompts, review, waiting/error states, results, and text downloads. Natural Hong Kong written Chinese replaces translated phrasing and repeated disclaimers.
- Results now lead with characters’ pursuits and verbatim excerpts; three theme definitions and a short book introduction lead to one reflection. Power includes both helping and dominating. Research comparisons and full stories remain expandable.
- Shared copy keeps downloads and screens aligned. Existing scoring gates remain; sparse, tentative, tied and missing-reference states retain distinct wording. Sparse results open the original stories. Fallback bars now explicitly describe shares rather than density.
- Simplified the visual direction to a contemporary reading booklet: paper, green ink, serif headings and quotations, clear sans-serif controls. Removed the seal, need tags and stacked theme cards; result thumbnails show the whole image.
- Guidance v5 and reading v4 record the change. Earlier draft history is preserved. No backend model, translation prompt or deployment changed.


## 2026-09-29 (copy round) — Why stories, plain definitions, 勝任感／歸屬感, story vs life

Owner-proposed copy, reviewed and adjusted together before implementing.

- **Intro: 「寫故事前」** — 「唔使諗定先寫…寫到有頭有尾就得」, and the no-going-back
  rule moves out of the collapsed notes.
  *Why:* first-instinct writing is what the PSE scores. The draft's
  「唔使諗到好完整」 could be read as "the story needn't be complete", which
  undoes the full-story framing, so 「唔使諗定」 and 「有頭有尾」 keep both points.
  People should see the lock rule before they start.
- **「點解要寫故事？」 moves to after writing,** with nothing in its place before
  writing (a one-line version was tried and cut as long-winded).
  *Why:* the full text names the three themes (成功, 影響其他人, 關係). Read
  before writing, it primes those themes and breaks the PSE's core design:
  categories are revealed only after the stories exist. A fixture now fails if
  any theme name appears on the intro, picture or writing screens.
- **A frame line under the bars, matched to the reading:** "stands out" wording
  for a lean, "none stands out" for balanced, nothing for sparse.
  *Why:* the draft's 「以下主題…出現得比較多」 is only true when a theme stands
  out. 「比較突出」 fits a comparison with the research stories without
  explaining the method.
- **Plain motive definitions** (成就 「想做好啲」, 影響力 「唔一定係控制人」,
  連結 「一大班人…兩個人慢慢靠近」), replacing the strength/cost notes and the
  trait disclaimer.
  *Why:* shorter and plainer; the strength-versus-cost idea now lives in one
  better example ("enjoys the challenge vs afraid to lose"). All three stay
  equally warm.
- **勝任感／歸屬感** name the bar groups and motive tags; no English theory terms
  on the page.
  *Why:* owner choice; the terms explain themselves.
- **One reflection section** merges 「同現實一樣嗎？」 with the closing reminder,
  followed by 「再諗多一步」 (what I want / why I want it / do I feel chosen,
  capable and connected) and two closing questions.
  *Why:* both sections made the same point: story imagery and conscious goals
  usually diverge (McClelland, Koestner & Weinberger, 1989). The three
  questions follow self-determination theory's distinctions (what the goal
  is, why you pursue it, and whether the three needs are met) without naming
  it, so 「真正嘅你」 now appears once.
- The download mirrors the page copy.

## 2026-09-29 (palette) — Pigment theme colours, vermilion accent and seal

Option B from the palette preview. Paper, text, buttons and rules are unchanged.

- **Theme colours are Chinese painting pigments:** 赭石 ochre `#8a5526` (成就),
  石綠 malachite `#2f7466` (連結), 花青 indigo `#3d5a8a` (影響力).
  *Why:* the old affiliation green sat in the same dark-green family as the
  buttons, so 連結 read as part of the interface, and the power lavender felt
  like a dashboard. White label text on the new colours is 5.2–6.6:1 (was
  4.8–5.5:1), and in a red–green colour-blindness simulation every pair of
  theme colours is further apart than before.
- **Accent is 朱砂 vermilion `#a33b2b`** (was terracotta `#9f4c35`), used for the
  eyebrows, ✦, the current-round marker, flagged chips and the focus ring. 5.9:1
  on the paper.
- **The masthead mark is a vermilion 「有你」 seal** instead of a green book spine.
  *Why:* a seal (印) is the natural partner of a painting (畫), which suits 畫中有你.
- **Writing prompts are darker: `#697166`, 4.8:1 in the box** (was `#9aa196`,
  2.5:1). *Why:* the four prompts live in the placeholder, and at 2.5:1 they were
  hard to read on a phone outdoors.

## 2026-09-29 (copy edit) — One voice, one name per theme, 濃淡 wording

From a copy review written as a Chinese editor and book-club member. Reading
rules, gates and numbers are unchanged; only wording and credits changed.

- **Bars and the overall sentence say 較濃／相若／較淡 and 「筆墨比研究故事濃／淡」**
  (was 高過／接近／低過參照 and 「筆墨比參照多／少」). The legend reads 研究故事嘅濃度.
  *Why:* the bars are imagery per 1,000 words, which is a density, and 筆墨濃淡
  fits the book-and-ink framing. 參照 on every row read as jargon, and three
  「高過參照」 under a headline of only 「有少少偏向」 looked contradictory; with 濃淡
  the rows agree with the sentence on overall density.
- **The comparison reads 「同研究入面寫同一組圖嘅故事比，你筆下嘅「X」多少少／多啲／明顯多啲。」**
  (was 「…嘅比重，略高於／高於同組圖片嘅研究參照」).
  *Why:* the same claim in plain Cantonese; 略高於 is written Chinese dropped into
  a Cantonese sentence.
- **One name per theme: 成就, 連結, 影響力,** on the page and in the download (was
  also 連結／親和 and 影響力／權力 in sentence labels and the research record).
  「動機」 is gone from the page; 「想要」 is the plain word for it.
  *Why:* two names for one theme made readers wonder whether they were
  different things. Naming 「動機」 before results also primed the construct.
- **Review screen asks 「四個故事入面，人物反覆想要啲乜？」** (was 「最常回到邊種動機？」).
  *Why:* results compare against the pictures, not raw frequency, and the
  construct should not be named before writing is finished.
- **The lock note says 「按下去之後」**, so it matches the last round's button
  「完成四個故事」.
- **Short-story nudge: 「想再寫多兩句？…」 then 「唔加都得，再按一次就繼續。」**
  *Why:* 「寫完就再按一次」 implied writing more was required; it never was.
- **✦ is explained as 「呢張圖平時較少引出」**, still without rarity or
  projection claims, but without the words 罕見 and 投射. Picture cards read
  研究故事多寫 ／ 你寫到.
- **Plainer self-determination theory intro and questions.** Autonomy asks 「有幾多係你自己揀」,
  since autonomy is a matter of degree; relatedness asks 「有冇一個人，你想同佢行近啲？」.
  The reflection's 「唔會收集任何輸入」 becomes 「呢頁冇地方填，亦唔會記錄」.
- **Written-Chinese phrases inside Cantonese sentences replaced** (難以 → 好難／唔敢,
  正在分析 → 用緊, 分析緊 → 細讀緊), eyebrow 「讀書會前嘅小練習」 instead of 「PSE」.
- **Privacy lines name the cloud services and say 「呢個練習唔會儲存或者記錄你嘅故事」.**
  *Why:* plainer than 「唔會建立故事資料庫」; the backend stores and logs no story
  text (docs/operations.md). It does not promise anything on the providers'
  behalf.
- **Credits:** 「第 1 張 · 拳手（boxer）· 來源」, with Chinese titles for the 18
  classic pictures (`title_zh`, also kept by the importer) and one Chinese
  licence note instead of English boilerplate on every line. Licensed photos
  keep their author and licence.
- Tests updated for the new wording, plus checks for one name per theme, the
  lock note, no 「動機」 on the review screen, and the credits format.

## 2026-09-29 (last) — Classic set first, new pictures on replay; sound random draws

- **Two visible choices on the intro instead of a small link.** First visit:
  「開始：經典四張圖」 leads, 「玩過？換四張新圖」 follows. After a completed result the
  order flips: 「換四張新圖再玩」 leads, 「再寫一次經典四張」 follows. The results page
  gets a visible 「換四張新圖再玩」 button next to the download.
  *Why:* owner request; the replay option was easy to miss. First-timers should
  write the shared classic set (the bookclub discusses the same pictures);
  returning players mostly want something new. A local `pse-hk:played:v1` flag
  records a completed result so the intro can tell the two apart.
- **Random mode draws only the 18 non-classic pictures with a reference of at
  least 30 stories** (in practice 81–2,316).
  *Why:* checking the pool showed that 26 of 48 pictures have norms from fewer
  than 30 stories (some from 3), and c08 has none. About 96% of random runs
  included such a picture, so the reference line, 「圖片參照較偏向」 and ✦ were
  largely noise, and about 8% lost the comparison entirely. Those pictures stay
  in the catalogue so old drafts still load.
- **The classic four are never drawn in random mode.**
  *Why:* about 30% of replays previously included a classic picture, which
  defeats "try different pictures".
- **Pictures already drawn on this browser are avoided until all 18 have been
  seen;** swaps follow the same rule. When too few remain, the seen list is
  forgotten first, then the skip list.
  *Why:* without memory, a replay could repeat the previous run's pictures.
  Forgetting instead of blocking keeps the activity available.

## 2026-09-29 (later) — English first, story length, words not numbers

Builds on the evidence-grounded reading below; its gates, faint-label policy,
missing-reference rule and neutral copy are kept. Details and sources:
[protocol review, third revision](docs/pse-protocol-review.md#third-revision-story-length-english-first-words-not-numbers).

- **Main counts use the English reading's flags,** with the original only when
  translation fails (previously the union of both).
  *Why:* the owner asked for English as the main source. AMC was tested on
  translated English and replicated a known effect there; it was never tested
  on Cantonese, and the direct path under-detects.
- **Bars, the reference line and the overall amount are per 1,000 words.**
  Participant: flagged sentences per English word. Reference: summed picture
  means over summed mean words per story, from the norm workbook (now imported;
  47/47 rows verified against OSF).
  *Why:* the owner asked how the original PSE handles length and where the means
  come from. The means are raw counts from ~90-word stories, and raw motive
  scores rise with length (r up to .50). Schultheiss & Pang (2007) recommend
  images per 1,000 words for comparing across samples; one participant cannot
  be residualised. Which theme stands out is still judged on shares, which are
  length-free, so the review's gates are unchanged.
- **One sentence on the overall amount** (more wanting at ≥ 1.3×, less at < 0.7×
  the reference), in words.
  *Why:* this is the one comparison that length adjustment newly allows, and it
  gives the reading some pull without numbers. A uniform bias between German
  and English word counts can shift this sentence but not the leading theme.
- **No numbers on the page:** bars, a reference line, 高過／接近／低過參照, and
  evidence 「喺幾個故事都有出現」 instead of counts, percentages or percentage points.
  *Why:* owner request. The bar against a line carries the comparison, and
  numbers read like a test score.
- **Method off the page.** The technical section is replaced by 「關於呢個練習」:
  one plain sentence and the picture credits. The method text, per-1,000-word
  figures, both paths' labels, agreement, pulls with word counts and timing
  move to the download's 「技術記錄（研究用）」.
  *Why:* owner request. For participants this is a casual exercise; method is the
  organisers' concern. Credits stay for attribution.
- **Sentence cards show the English and its themes** (with 「隱約」 labels) instead
  of two analysis rows.
  *Why:* the English is what is scored, so it explains a surprising theme.
- Reading rules recorded as `pse-hk-reading-v3`. Node tests (18) cover English
  first, reference rates, number-free wording, length independence of the
  lean, and the research record.

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
