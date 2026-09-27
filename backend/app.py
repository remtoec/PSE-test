"""Modal service: one class, one ASGI app with /warm and /score.

Deploy:     modal deploy backend/app.py
Local dev:  python backend/app.py   (uses models/amc, http://localhost:8000)
"""
import asyncio
import json
import os
import time
import uuid

import modal

MODEL_REPO = "automatedMotiveCoder/setfit"
MODEL_REVISION = "738833d148f37b993d225b572ee3ee32e4085cfb"
MODEL_DIR = "/model"
BATCH_SIZE = 16
PROCESS_DEADLINE_S = 120
PAGES_ORIGIN = os.environ.get("PSE_ORIGIN", "https://pse-hk.aesopb15254.workers.dev")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("torch==2.3.1", index_url="https://download.pytorch.org/whl/cpu")
    .pip_install_from_requirements(os.path.join(os.path.dirname(__file__), "requirements.txt"))
    .run_commands(
        "python -c \"from huggingface_hub import snapshot_download; "
        f"snapshot_download('{MODEL_REPO}', revision='{MODEL_REVISION}', local_dir='{MODEL_DIR}')\""
    )
    # Weights are baked in; a running container must never reach the Hub.
    .env({"HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1", "TOKENIZERS_PARALLELISM": "false"})
    .add_local_python_source("scoring", "translation")
)

app = modal.App("pse-hk", image=image)


def log(**kw):
    # Only ids, counts, timings and codes. Never story or translation text.
    print(json.dumps(kw), flush=True)


def create_api(model, origins, cf_account="", cf_token=""):
    import httpx
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse

    import scoring
    import translation

    labels = list(model.labels)
    tok = model.model_body.tokenizer
    limit = model.model_body.max_seq_length

    def n_tokens(text):
        return len(tok(text, truncation=False, add_special_tokens=True)["input_ids"])

    def infer(texts):
        emb = model.encode(texts, batch_size=BATCH_SIZE)
        return scoring.adapt(labels, model.model_head.predict(emb), model.model_head.predict_proba(emb))

    api = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    api.add_middleware(
        CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"], expose_headers=["Retry-After"], max_age=600,
    )
    state = {"busy": False}
    client = httpx.AsyncClient()

    def err(status, code, message, **extra):
        headers = {"Retry-After": "20"} if status == 429 else None
        return JSONResponse({"code": code, "message": message, **extra}, status_code=status, headers=headers)

    @api.get("/warm")
    async def warm():
        return {"ok": True}  # only reachable after the model loaded

    @api.post("/score")
    async def score(request: Request):
        rid = uuid.uuid4().hex[:8]
        start = time.monotonic()
        deadline = start + PROCESS_DEADLINE_S

        body = bytearray()
        async for chunk in request.stream():
            body += chunk
            if len(body) > scoring.MAX_BODY_BYTES:
                return err(413, "body_too_large", "Request is too large.")
        try:
            payload = json.loads(body)
        except ValueError:
            return err(400, "malformed_json", "Request is not valid JSON.")

        # Single event loop: check-and-set is atomic between awaits.
        if state["busy"]:
            log(rid=rid, event="busy")
            return err(429, "busy", "Another story set is being analysed. Please retry shortly.")
        state["busy"] = True
        try:
            stories = scoring.validate(payload)
            items = scoring.sentences(stories)
            too_long = await asyncio.to_thread(scoring.check_lengths, items, n_tokens, limit)
            if too_long:
                sid = too_long[0]
                raise scoring.InputError(400, "sentence_too_long", "Please add sentence breaks.",
                                         picture_id=sid.split("-")[0], sentence_id=sid)

            t = time.monotonic()
            direct = await asyncio.to_thread(infer, [it["source"] for it in items])
            direct_s = time.monotonic() - t
            reserve = max(10.0, 2 * direct_s)  # time kept back for translated scoring

            translations = await translation.translate(items, client, cf_account, cf_token, deadline - reserve)
            translated = None
            fallback = None if translations else "translation"
            if translations:
                en = [{"id": it["id"], "english": translations[it["id"]]["english"]} for it in items]
                if await asyncio.to_thread(scoring.check_lengths, en, n_tokens, limit, "english"):
                    fallback = "translated_too_long"
                elif deadline - time.monotonic() < reserve:
                    fallback = "deadline"
                else:
                    translated = await asyncio.to_thread(infer, [e["english"] for e in en])

            meta = {"amc_model": MODEL_REPO, "amc_revision": MODEL_REVISION,
                    "translator": translation.MODEL, "prompt_version": translation.PROMPT_VERSION}
            resp = scoring.build_response(items, stories, direct, translations if translated else None, translated, meta)
            log(rid=rid, event="scored", sentences=len(items), direct_s=round(direct_s, 2),
                total_s=round(time.monotonic() - start, 2), fallback=fallback)
            return resp
        except scoring.InputError as e:
            log(rid=rid, event="input_error", code=e.code)
            return JSONResponse(e.body(), status_code=e.status)
        except Exception as e:  # noqa: BLE001 — never leak internals or text
            log(rid=rid, event="error", type=type(e).__name__)
            return err(503, "scoring_unavailable", "Analysis is unavailable right now.")
        finally:
            state["busy"] = False

    return api


@app.cls(
    cpu=1.0,
    memory=6144,
    min_containers=0,
    max_containers=1,
    scaledown_window=600,
    timeout=170,
    secrets=[modal.Secret.from_name("pse-hk-cloudflare")],
    env={"PSE_ORIGIN": PAGES_ORIGIN},
)
@modal.concurrent(max_inputs=4)  # lets /warm and busy-429 through while one score runs
class Scorer:
    @modal.enter()
    def load(self):
        import torch
        from setfit import SetFitModel

        torch.set_num_threads(1)
        t = time.monotonic()
        self.model = SetFitModel.from_pretrained(MODEL_DIR, local_files_only=True)
        log(event="model_loaded", load_s=round(time.monotonic() - t, 2))

    @modal.asgi_app()
    def web(self):
        return create_api(self.model, [os.environ["PSE_ORIGIN"]],
                          os.environ.get("CF_ACCOUNT_ID", ""), os.environ.get("CF_API_TOKEN", ""))


if __name__ == "__main__":
    import sys

    import torch
    import uvicorn
    from setfit import SetFitModel

    sys.path.insert(0, os.path.dirname(__file__))
    torch.set_num_threads(1)
    root = os.path.join(os.path.dirname(__file__), "..")
    m = SetFitModel.from_pretrained(os.path.join(root, "models", "amc"))
    dev_origins = ["http://localhost:8080", "http://127.0.0.1:8080"]
    uvicorn.run(create_api(m, dev_origins, os.environ.get("CF_ACCOUNT_ID", ""), os.environ.get("CF_API_TOKEN", "")),
                host="127.0.0.1", port=8000, access_log=False)
