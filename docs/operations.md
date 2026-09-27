# Operations

Commands assume `D:\PSE-HK` in Git Bash, with the project venv at `.venv/`.

## Local development

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe --index-url https://download.pytorch.org/whl/cpu torch==2.3.1
uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt pytest psutil uvicorn modal pillow
.venv/Scripts/python.exe -c "from huggingface_hub import snapshot_download; snapshot_download('automatedMotiveCoder/setfit', revision='738833d148f37b993d225b572ee3ee32e4085cfb', local_dir='models/amc')"
.venv/Scripts/python.exe -m pytest tests -q          # 48 tests
.venv/Scripts/python.exe backend/app.py              # API on http://127.0.0.1:8000 (models/amc)
python -m http.server 8080 --directory web           # UI on http://localhost:8080
.venv/Scripts/modal.exe run scripts/eval_translation.py --repeats 3   # live translation check (uses the Modal secret)
```

Without `CF_ACCOUNT_ID`/`CF_API_TOKEN` set, the local API returns direct-only results. `tests/web_fixtures.js` can be pasted into the page console to check result rendering.

## Secrets

| Where | Name | Keys |
|---|---|---|
| Modal secret | `pse-hk-cloudflare` | `CF_ACCOUNT_ID`, `CF_API_TOKEN` |

`CF_API_TOKEN` is a Cloudflare **API token** limited to Workers AI (Dashboard → My Profile → API Tokens → Create Token → "Workers AI" template → this account only). Never put it in `web/`.

```bash
.venv/Scripts/modal.exe secret create pse-hk-cloudflare CF_ACCOUNT_ID=<account id> CF_API_TOKEN=<token> --force
```

If the secret holds empty or invalid values, scoring still works; each assessment returns `translation_failed=true` and shows original-text analysis only.

## Deploy

1. Static site (Cloudflare Workers static assets, the successor to Pages direct upload; `wrangler.jsonc` serves `web/` only, with no Worker script):
   ```bash
   npx wrangler deploy
   ```
   Origin: `https://pse-hk.aesopb15254.workers.dev`
2. Backend (the site origin is baked into the CORS allow-list at deploy time; the default in `backend/app.py` is the origin above):
   ```bash
   .venv/Scripts/modal.exe deploy backend/app.py
   ```
3. If the backend URL changes, update `<meta name="pse-api" content="...">` in `web/index.html` and run `npx wrangler deploy` again.

The deployed values are recorded in `docs/launch-checks.md`.

## Settings (backend/app.py)

`min_containers=0`, `max_containers=1`, `scaledown_window=600`, `cpu=1`, `memory=6144`, `timeout=170`, `@modal.concurrent(max_inputs=4)`. One score runs at a time per container; others get `429` with `Retry-After: 20`. Processing deadline: 120 s. Translation budget: 45 s. Browser abort: 180 s.

These settings bound concurrent compute only. They are **not** a spending cap or authentication, and neither is CORS.

## Budgets

- **Modal:** Settings → Usage & Billing → set a workspace budget (e.g. USD 5–10/month). Check how the live dashboard treats free monthly credits and what happens when the budget is reached (apps are stopped). A workspace budget affects every app in the workspace.
- **Cloudflare Workers AI:** keep the account on the free allocation (10,000 neurons/day). One 120-sentence assessment used about 110 neurons in testing. When the quota is exhausted, the API returns an error and the app falls back to direct-only results. It never retries quota errors.

## Stop scoring

```bash
.venv/Scripts/modal.exe app stop pse-hk
```

The Pages site keeps working. Intro and writing need no backend. Submissions show "分析服務暫時未能使用" and keep the draft. To restart, run the `modal deploy` command again.

## Logging and data

The backend logs only a random request id, sentence counts, timings, fallback reason and error codes. Story and translation text are never logged, stored or echoed in errors. Uvicorn access logs are disabled locally; Modal logs record function calls, not request bodies. Provider policies: [Modal privacy](https://modal.com/legal/privacy-policy), [Workers AI data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/).

Drafts live only in the participant's browser (`localStorage` key `pse-hk:draft:v1`). The ids of skipped pictures are kept under `pse-hk:skipped:v1` so they are not drawn again; the list is forgotten once fewer than four unskipped pictures remain. A draft older than 7 days is deleted the next time the page opens; no background service deletes it.
