"""AMC feasibility probe: labels, output shapes, sequence limit, timing, memory.

Synthetic sentences only. Run: .venv/Scripts/python scripts/spike_amc.py [model_dir]
"""
import sys
import time

import numpy as np
import psutil
import torch

MODEL = sys.argv[1] if len(sys.argv) > 1 else "models/amc"

CANTONESE = [
    "佢今日終於考到車牌，覺得好有成功感。",  # ach
    "阿明好掛住屋企人，打電話返去同媽媽傾咗成晚。",  # aff
    "經理喺會議上大聲命令所有人即刻跟佢嘅方案做。",  # pow
    "張枱上面有一杯凍檸茶。",  # no motive
    "佢想贏呢場比賽，令隊友同屋企人都以佢為榮。",  # multi (ach + aff/pow)
]
ENGLISH = [
    "She trained every morning because she wanted to beat her personal best.",
    "He missed his old friends and hoped they would meet again soon.",
    "The boss threatened to fire anyone who questioned his decision.",
    "The chair is next to the window.",
    "佢好想 win 呢個 competition，証明俾全世界睇佢係最勁。",  # mixed
]


def rss_mb():
    return psutil.Process().memory_info().rss / 2**20


def main():
    torch.set_num_threads(1)  # mirror 1-core Modal budget
    base = rss_mb()
    t0 = time.perf_counter()
    from setfit import SetFitModel

    model = SetFitModel.from_pretrained(MODEL)
    load_s = time.perf_counter() - t0
    print(f"load {load_s:.1f}s  rss {rss_mb():.0f} MB (base {base:.0f})")
    print("labels:", model.labels, "multi_target_strategy:", model.multi_target_strategy)
    print("head:", model.model_head)
    body = model.model_body
    print("max_seq_length:", body.max_seq_length, "tokenizer max:", body.tokenizer.model_max_length)

    sents = CANTONESE + ENGLISH
    preds = model.predict(sents)
    proba = model.predict_proba(sents)
    print("predict type/shape:", type(preds), getattr(preds, "shape", None))
    print("proba shape:", tuple(proba.shape))
    for s, p, q in zip(sents, preds, proba):
        print(f"  {list(np.asarray(p))} {np.round(np.asarray(q), 3).tolist()} | {s}")

    # Does predict == (proba >= 0.5) per class?
    P = np.asarray(preds)
    Q = np.asarray(proba)
    print("predict == proba>=0.5:", bool((P == (Q >= 0.5)).all()))

    tok = body.tokenizer
    long = "佢" * 600
    n = len(tok(long, truncation=False)["input_ids"])
    print(f"600-char unpunctuated sentence -> {n} tokens incl. specials (limit {body.max_seq_length})")

    for size in (25, 120):
        batch = (sents * 20)[:size]
        t = time.perf_counter()
        model.predict_proba(batch, batch_size=16)
        print(f"{size} sentences: {time.perf_counter() - t:.1f}s  rss {rss_mb():.0f} MB")
    print(f"peak-ish rss {rss_mb():.0f} MB")


if __name__ == "__main__":
    main()
