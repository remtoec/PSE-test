# AMC spike results (Task 1)

Run 2026-09-27 with `scripts/spike_amc.py` on synthetic sentences only.

## Model

- Repo: `automatedMotiveCoder/setfit`
- Pinned revision: `738833d148f37b993d225b572ee3ee32e4085cfb` (v1.0.0, last weights push; later commits change README only)
- Base: `intfloat/multilingual-e5-large`; weights 2.2 GB on disk
- Local copy: `models/amc/` (git-ignored)

## Environment

Python 3.11, CPU-only. Exact pins in `backend/requirements.txt`. Published framework versions work, with one fix: setfit 1.0.3 imports `huggingface_hub.DatasetFilter`, removed in 0.24, so `huggingface-hub==0.23.5`. The head is a pickled scikit-learn object, so scikit-learn stays at 1.6.1 as published.

## Prediction contract (observed)

- `model.labels == ['ach', 'aff', 'pow', 'null']`
- Head: `OneVsRestClassifier(SGDClassifier(loss='log_loss', penalty='elasticnet'))`
- `predict(list)` returns a `torch.Tensor` of shape `(n, 4)` with 0/1 per label (multi-label, not a single class).
- `predict_proba(list)` returns `(n, 4)` independent probabilities; rows do not sum to 1.
- `predict == (predict_proba >= 0.5)` on every tested sentence (the SGD decision boundary).

**Adapter:** `motives = [label for label, flag in zip(labels, row) if flag and label != 'null']`. The model's own `predict()` flags are used; no threshold or argmax is invented. A row with no positive flags, or only `null`, becomes `[]`. All four probabilities are kept in `scores`.

## Observed labels on synthetic sentences

| Sentence | predict | proba ach/aff/pow/null |
|---|---|---|
| 佢今日終於考到車牌，覺得好有成功感。 | ach | .63/.02/.04/.27 |
| 阿明好掛住屋企人，打電話返去同媽媽傾咗成晚。 | aff | .01/.74/.03/.20 |
| 經理喺會議上大聲命令所有人即刻跟佢嘅方案做。 | pow | .04/.03/.71/.17 |
| 張枱上面有一杯凍檸茶。 | null | .02/.02/.03/.92 |
| 佢想贏呢場比賽，令隊友同屋企人都以佢為榮。 | ach | .63/.03/.16/.12 |
| She trained every morning because she wanted to beat her personal best. | ach | .69/.02/.06/.18 |
| He missed his old friends and hoped they would meet again soon. | aff | .01/.76/.03/.18 |
| The boss threatened to fire anyone who questioned his decision. | pow | .04/.03/.68/.16 |
| The chair is next to the window. | null | .02/.02/.03/.90 |
| 佢好想 win 呢個 competition，証明俾全世界睇佢係最勁。 (mixed) | ach | .70/.02/.10/.15 |

Five further sentences written to carry two motives each produced a single label every time. Multi-label output is possible in principle (independent heads) but was not observed; the adapter and aggregation still handle it. These examples are sanity checks, **not** evidence of Cantonese validity.

## Sequence limit

`max_seq_length = 512`, including special tokens. A 600-character unpunctuated Cantonese sentence is 603 tokens, so the source length check is needed: over-limit sentences get `sentence_too_long` rather than silent truncation.

## Resources (local CPU, `torch.set_num_threads(1)`)

| Measure | Value |
|---|---|
| Model load (warm disk) | 5.1 s |
| RSS after load | ~585 MB |
| RSS after inference | ~1.78 GB |
| 25 sentences | 2.8 s |
| 120 sentences | 11.3 s |

The desktop CPU is probably faster than a Modal core, so Modal cold and warm numbers are recorded separately in `docs/launch-checks.md`. Peak memory under 2 GB suggests 6 GiB is generous; reduce it only after Modal measurements.

## Decision

**Go.** The model loads reproducibly from the pinned revision, the label mapping is shown above, and 120 sentences fit comfortably inside the 120 s processing deadline on one thread. Inference batch size: 16.
