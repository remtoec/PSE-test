import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from scoring import (  # noqa: E402
    InputError, adapt, agreement, build_response, check_lengths, counts, segment, sentences, validate,
)

LABELS = ["ach", "aff", "pow", "null"]


def body(texts=("a.", "b.", "c.", "d.")):
    return {"stories": [{"picture_id": f"p{i}", "text": t} for i, t in enumerate(texts, 1)]}


# --- segmentation ---

def test_segment_cantonese_english_mixed():
    assert segment("佢好開心。佢想贏！Really? Yes.") == ["佢好開心。", "佢想贏！", "Really?", "Yes."]
    assert segment("佢想 win 呢場 game，然後返屋企") == ["佢想 win 呢場 game，然後返屋企"]


def test_segment_punctuation_runs_and_closing_quotes():
    assert segment("What?!? 真係？？ 佢話：「我唔去。」然後走咗……") == [
        "What?!?", "真係？？", "佢話：「我唔去。」", "然後走咗……",
    ]
    assert segment('He said "stop." Then left.') == ['He said "stop."', "Then left."]


def test_segment_newlines_and_blank():
    assert segment("第一句\n\n  第二句  \n") == ["第一句", "第二句"]
    assert segment("   \n\t") == []


def test_sentence_ids_are_stable():
    items = sentences(validate(body(("一。二。", "x", "y", "z"))))
    assert [i["id"] for i in items] == ["p1-s1", "p1-s2", "p2-s1", "p3-s1", "p4-s1"]


# --- validation ---

@pytest.mark.parametrize("payload,code", [
    ([], "invalid_body"),
    ({"stories": []}, "wrong_story_count"),
    (body(("a", " \n ", "c", "d")), "empty_story"),
    ({"stories": [{"picture_id": "p1", "text": "a"}] * 4}, "duplicate_picture"),
    ({"stories": [{"picture_id": "p10", "text": "a"}] + body()["stories"][1:]}, "unknown_picture"),
    ({"stories": [{"picture_id": "p1", "text": 5}] + body()["stories"][1:]}, "invalid_story"),
    (body(("字" * 3001, "b", "c", "d")), "story_too_long"),
])
def test_validate_rejects(payload, code):
    with pytest.raises(InputError) as e:
        validate(payload)
    assert e.value.code == code and e.value.status == 400
    assert "字字字" not in str(e.value.body())  # never echo stories


def test_validate_preserves_text_and_shown_order():
    b = body(("  a  b.", "b", "c", "d"))
    b["stories"][3]["picture_id"] = "p9"  # any pool picture
    b["stories"].reverse()
    assert list(validate(b)) == ["p9", "p3", "p2", "p1"]
    assert validate(b)["p1"] == "  a  b."


def test_too_many_sentences():
    many = "。".join(["句"] * 31) + "。"
    with pytest.raises(InputError) as e:
        sentences(validate(body((many, many, many, many))))
    assert e.value.code == "too_many_sentences"


def test_overlong_sentence_detected():
    items = [{"id": "p1-s1", "source": "short"}, {"id": "p1-s2", "source": "x" * 600}]
    assert check_lengths(items, lambda s: len(s) + 2, 512) == ["p1-s2"]


# --- adapter and aggregation ---

def test_adapt_uses_model_flags_and_drops_null():
    out = adapt(LABELS, [[1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0], [1, 0, 1, 0]],
                [[.6, 0, 0, .3], [0, 0, 0, .9], [.4, .4, .4, .4], [.6, 0, .7, 0]])
    assert [o["motives"] for o in out] == [["ach"], [], [], ["ach", "pow"]]
    assert set(out[0]["scores"]) == set(LABELS)


def test_counts_each_motive_once_per_sentence():
    assert counts([["ach", "ach", "pow"], ["pow", "ach"], []]) == {"ach": 2, "aff": 0, "pow": 2}


def test_agreement_compares_sets_including_empty():
    assert agreement([["ach"], [], ["pow", "aff"]], [["ach"], [], ["aff", "pow"]]) == {"same": 3, "total": 3}
    assert agreement([["ach"], []], [[], []]) == {"same": 1, "total": 2}


def test_fallback_response_has_no_partial_comparison():
    stories = {"p1": "一。二。", "p2": "b", "p3": "c", "p4": "d"}
    items = sentences(stories)
    direct = [{"motives": ["ach"], "scores": {}}] * len(items)
    r = build_response(items, stories, direct, None, None, {})
    assert r["translation_failed"] is True
    assert r["summary"]["translated"] is None and r["summary"]["agreement"] is None
    assert r["summary"]["english_words"] is None
    assert all(s["english"] is None and s["translated"] is None and s["uncertain"] is None for s in r["sentences"])
    assert r["summary"]["direct"]["ach"] == len(items)
    assert r["summary"]["total_chars"]["p1"] == 4


def test_picture_pool_matches_stimuli():
    import json
    from scoring import PICTURE_IDS
    pics = json.loads((Path(__file__).resolve().parents[1] / "web" / "stimuli.json").read_text(encoding="utf-8"))["pictures"]
    assert {p["id"] for p in pics} == PICTURE_IDS
    assert all((Path(__file__).resolve().parents[1] / "web" / p["file"]).is_file() for p in pics)
