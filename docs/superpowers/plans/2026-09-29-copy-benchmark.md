# Copy and benchmark implementation plan

> Execute inline using superpowers:executing-plans. User authorised implementation
> and push; provide a separate-agent review prompt on completion.

Goal: warm instructions and evidence-supported, accurately labelled results.
Spec: `docs/copy-benchmark-rationale.md`.
Architecture: retain the static app and backend response contract; centralise
interpretation in `summarise`, consumed by screen and download.
Stack: vanilla JavaScript/HTML/CSS, Node tests, Python pytest, browser fixtures.

## Constraints and review focus

No GPU or live inference required. Preserve local untracked files and stash.
No deployment in this task. Faint-only, one-sentence multi-label, missing norms,
translation failure, ties and single-story concentration must not get an
unsupported strong interpretation. Test source-text safety and export parity.

## Tasks

- [x] Add failing Node cases against real app logic for the evidence gate,
  faint separation, incomplete references and omission stability.
- [x] Implement `assessReading(sentences, pics, failed)` around descriptive
  `reading(counts, typical)`; consume it in `summarise` and exports.
- [x] Revise writing/result copy, evidence presentation, method explanation,
  draft guidance version and neutral motive reflection notes.
- [x] Update browser fixtures and add download/evidence coverage; run Node,
  pytest and browser checks with synthetic responses.
- [x] Review diff and rationale, update current docs and changelog, prepare an
  explicit task-file commit and reviewer prompt. Push/remote verification are
  the final delivery steps reported in the conversation.

## Execution ledger

- Baseline: `799eabf`; tracked files clean; local stash and untracked files kept.
- Work in the requested PC checkout. User already approved this review's
  direction and execution; no additional design approval required.
- Validation: 14 Node cases, 49 pytest cases, normal/fallback browser fixtures,
  syntax/diff checks; details and limitations in the rationale.
- Independent review: no blocking findings. Added the requested negative
  omission, tied-focus instability and remaining-sentence cases.
