"""Validation, segmentation, AMC adapter and aggregation. No model import here."""
import re

PICTURE_IDS = frozenset(f"p{i}" for i in range(1, 10))  # the pool; mirrors web/stimuli.json
STORIES_PER_RUN = 4
MOTIVES = ("ach", "aff", "pow")
MAX_BODY_BYTES = 64 * 1024
MAX_STORY_CHARS = 3000  # Unicode code points, i.e. len(str)
MAX_SENTENCES = 120

# A sentence runs up to a run of terminators plus any closing quotes/brackets.
# ponytail: naive splitter — "3.5" or "Mr. Chan" split early; documented limitation.
_SENTENCE = re.compile(r".*?(?:[.!?。！？…]+[\"'”’」』）)\]]*|$)")


class InputError(Exception):
    def __init__(self, status, code, message, picture_id=None, sentence_id=None):
        super().__init__(code)
        self.status, self.code, self.message = status, code, message
        self.picture_id, self.sentence_id = picture_id, sentence_id

    def body(self):
        out = {"code": self.code, "message": self.message}
        if self.picture_id:
            out["picture_id"] = self.picture_id
        if self.sentence_id:
            out["sentence_id"] = self.sentence_id
        return out


def validate(payload):
    """Return {picture_id: text} in the order shown, or raise InputError(400)."""
    if not isinstance(payload, dict) or not isinstance(payload.get("stories"), list):
        raise InputError(400, "invalid_body", "Expected {\"stories\": [...]}.")
    stories = payload["stories"]
    if len(stories) != STORIES_PER_RUN:
        raise InputError(400, "wrong_story_count", "Exactly four stories are required.")
    seen = {}
    for item in stories:
        if not isinstance(item, dict) or not isinstance(item.get("picture_id"), str) or not isinstance(item.get("text"), str):
            raise InputError(400, "invalid_story", "Each story needs a picture_id and text string.")
        pid, text = item["picture_id"], item["text"]
        if pid not in PICTURE_IDS:
            raise InputError(400, "unknown_picture", "Unknown picture.", picture_id=pid[:16])
        if pid in seen:
            raise InputError(400, "duplicate_picture", "Duplicate picture.", picture_id=pid)
        if not text.strip():
            raise InputError(400, "empty_story", "Story is empty.", picture_id=pid)
        if len(text) > MAX_STORY_CHARS:
            raise InputError(400, "story_too_long", f"Story exceeds {MAX_STORY_CHARS} characters.", picture_id=pid)
        seen[pid] = text
    return seen


def segment(text):
    """Split one story into trimmed, nonempty sentences."""
    out = []
    for line in text.splitlines():
        out.extend(m.strip() for m in _SENTENCE.findall(line))
    return [s for s in out if s]


def sentences(stories):
    """[{id, picture_id, source}] across all stories, or raise too_many_sentences."""
    out = [
        {"id": f"{pid}-s{i}", "picture_id": pid, "source": s}
        for pid, text in stories.items()
        for i, s in enumerate(segment(text), 1)
    ]
    if len(out) > MAX_SENTENCES:
        raise InputError(400, "too_many_sentences", f"At most {MAX_SENTENCES} sentences in total.")
    return out


def check_lengths(items, count_tokens, limit, key="source"):
    """Return ids whose text exceeds the model's token limit (specials included)."""
    return [it["id"] for it in items if count_tokens(it[key]) > limit]


def adapt(labels, pred_rows, proba_rows):
    """Model outputs -> [{motives, scores}]. Uses the model's own predict() flags."""
    out = []
    for flags, probs in zip(pred_rows, proba_rows):
        motives = [lab for lab, f in zip(labels, flags) if f and lab in MOTIVES]
        out.append({"motives": motives, "scores": {lab: round(float(p), 4) for lab, p in zip(labels, probs)}})
    return out


def counts(motive_lists):
    """Each motive counts at most once per sentence."""
    c = dict.fromkeys(MOTIVES, 0)
    for ms in motive_lists:
        for m in set(ms):
            if m in c:
                c[m] += 1
    return c


def agreement(direct_lists, translated_lists):
    same = sum(set(a) == set(b) for a, b in zip(direct_lists, translated_lists))
    return {"same": same, "total": len(direct_lists)}


def build_response(items, stories, direct, translations, translated, meta):
    """translations/translated are None on fallback -> whole comparison omitted."""
    failed = translations is None or translated is None
    rows = []
    for i, it in enumerate(items):
        tr = None if failed else translations[it["id"]]
        rows.append({
            **it,
            "english": None if failed else tr["english"],
            "uncertain": None if failed else tr["uncertain"],
            "direct": direct[i],
            "translated": None if failed else translated[i],
        })
    d = [r["direct"]["motives"] for r in rows]
    t = None if failed else [r["translated"]["motives"] for r in rows]
    return {
        "sentences": rows,
        "summary": {
            "direct": counts(d),
            "translated": None if failed else counts(t),
            "agreement": None if failed else agreement(d, t),
            "total_chars": {pid: len(text) for pid, text in stories.items()},
            "english_words": None if failed else sum(len(r["english"].split()) for r in rows),
        },
        "translation_failed": failed,
        "meta": meta,
    }
