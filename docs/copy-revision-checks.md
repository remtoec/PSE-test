# Bookclub copy and visual revision — 2026-09-29

Implemented the approved direction in `web/index.html`, `web/app.js` and `web/styles.css`. Local changes only; no deployment or backend/model/translation-prompt change.

## Editorial and visual decisions

- Hong Kong written Chinese with occasional familiar phrases such as 話事權. Concrete verbs replace abstract descriptions of “wanting”.
- Entry, prompts, draft recovery, validation, waiting, errors, result interpretation and export reviewed together. Full-story instructions retain scene, before, thoughts/feelings/wants and ending. No motive names before writing.
- Results lead with characters’ pursuits and verbatim source excerpts. Shared category templates explain 成就／關係／影響 without inventing detailed plot analysis. The short book bridge introduces Murray and McAdams; one reflection leads into the bookclub.
- Necessary methodology is consolidated in an expandable note. Actual translation failure remains visible. Research comparison and full stories have separate expandable sections; sparse results open the original stories immediately.
- The visual direction is a contemporary reading booklet: paper colour, green ink, serif headings/quotations and clear sans-serif instructions. Removed the seal, need tags and stacked theme cards. Four simple sheets echo the four-story exercise during waiting. No new graphic assets or dependencies.
- Existing scoring and robustness gates remain. Guidance v5 and reading v4 record the revised presentation. Downloads reuse the page’s book, category and reflection copy.

## Verification

- `node --test tests/reading.test.cjs`: **21 passed**. Includes sparse/tied/unstable results, translation failure, missing references, length independence of the headline, literal excerpts from distinct stories and export content.
- `.venv/Scripts/python.exe -m pytest tests -q`: **49 passed**.
- JavaScript syntax and `git diff --check`: passed.
- Local browser fixtures for normal and translation-fallback results: **empty failure lists**. Checked source text safety, collapsed analysis, sparse story access, existing drafts, non-priming instructions and screen/export consistency.
- Inspected desktop results and phone-sized entry/writing screens. Checked horizontal overflow: content width equals viewport content width. Screenshots are under `artifacts/copy-revision/`.
- Exercised all four writing rounds using synthetic stories, read-only review and submission into the fixture’s waiting/busy-response path. Resumed the fourth story after a browser session reset.
- Independent read-only review found no high/medium issues. Its minor sparse-copy finding was fixed: wording now covers both few clues and clues concentrated in one story.

## Limits

- Browser download-event observation timed out. Export construction and screen/export consistency passed; actual delivery of the downloaded file was not confirmed.
- No live model request, production deployment or physical-phone test was performed. Local test routes intercept model requests and visibly identify the data as synthetic.

Run `.venv/Scripts/python.exe scripts/preview_ui.py` and open `http://127.0.0.1:8081/__test__/` for synthetic results, `?outcome=fallback` for translation failure, or `?mode=flow` for the writing flow. During this session an additional preview server used port 8094.

## Follow-up: result depth and placement

- Analysis details now sit in the pursuits section; original stories immediately follow the reflection. Downloads use the same order.
- Each detected theme gets a concise book-based reading lens, exact source evidence and a question. A separate comparison uses actual story-level co-occurrence, without assuming the same character or claiming a conflict occurred. These are thematic templates, not generated plot interpretations.
- Reading v5; scoring, translation and backend unchanged.
- 25 Node tests passed, including secondary-theme coverage, exact story locations, English-first/faint exclusions, sparse handling and page/export parity. Normal and translation-fallback browser fixture reports were both empty.
- Desktop and 390px iframe preview inspected; the latter is available at `/__test__/phone` on the local preview server (port 8095 in this session). Preview routes and synthetic fixtures are not deployed.
- Independent review found one overstatement in the power lens; changed it to invite attention rather than claim power is the story's key.


## Approved lightweight flow (supersedes the previous follow-up)

- Applied `docs/mockups/results-flow-light.html`: static analysis section before literal quotes, then folded stories, then book material and reflection. Removed the longer interpretation and connection templates.
- Counted labels appear directly with sentence text. Faint detections remain in expanded details and do not become counted labels. Sparse results offer folded stories without invented excerpts.
- Reading v6; export section order matches the page. No backend/scoring changes.
- 24 Node tests passed; normal and translation-fallback browser fixtures returned no failures. Verified stories expand and counted labels are readable without opening sentence details. Desktop layout inspected; independent review found no actionable issues.
