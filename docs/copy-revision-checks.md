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
