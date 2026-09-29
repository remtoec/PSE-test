# Independent review prompt

Review the copy and benchmark revision in `remtoec/PSE-test`. Baseline commit:
`799eabf`. Locate the commit titled `Ground story interpretations in evidence
and clarify benchmark copy`, record its SHA, and review `799eabf..<that SHA>`.
Work read-only; report findings before proposing or applying fixes.

Read `docs/copy-benchmark-rationale.md`, but challenge its assumptions rather
than treating it as scientific authority. Compare the rationale with the actual
code, participant experience, and tests.

Focus on:

1. Hong Kong Cantonese copy: warmth, naturalness, cognitive load, complete-story
   guidance, character clarity, neutrality before writing, and balanced motive
   descriptions. Does the result remain interesting without overclaiming?
2. Measurement meaning: reference is a ratio of summed German picture means,
   not an average person's score or percentile. Do threshold wording and SDT
   groupings still imply more than the data justify?
3. Main model flags versus exploratory faint scores: inspect counts, headline,
   quotes, picture highlights and export for accidental mixing.
4. Strong-wording gates: distinct sentences/pictures, three-story support,
   leave-one-story-out reference recalculation, changed focus, ties, sparse
   remaining data, missing/zero reference means and translation failure.
5. Evidence selection, literal-text safety, screen/export parity, draft guidance
   migration, mobile layout and regression coverage. Identify tests that pass
   without exercising their claimed behaviour.

Relevant files: `web/app.js`, `web/index.html`, `web/styles.css`,
`tests/reading.test.cjs`, `tests/web_fixtures.js`, current README and rationale.

No working GPU is required. Run `node --test tests/reading.test.cjs` and the
existing pytest suite (`.venv/Scripts/python.exe -m pytest tests -q` on Windows).
For browser fixtures run `scripts/preview_ui.py` and inspect `/__test__/` and
`/__test__/?outcome=fallback`. These use synthetic data, not live scoring.
Do not deploy or submit private stories to external services.

Report findings in severity order with file/line references, concrete examples,
impact and suggested direction. Distinguish implementation bugs, unsupported
inferences, copy trade-offs and unvalidated product heuristics. State what you
tested and what remains unverified. Say explicitly if there are no blocking
findings; do not invent problems to fill the review.
