// Result-rendering checks. Paste into the page console (or run via a browser tool)
// on http://localhost:8080 after it has loaded. Returns a list of failures ([] = pass).
(() => {
  const fails = [];
  const check = (name, cond) => { if (!cond) fails.push(name); };
  const sc = (...m) => ({ motives: m, scores: { ach: 0.1, aff: 0.1, pow: 0.1, null: 0.9 } });
  const meta = { amc_model: "m", amc_revision: "738833d", translator: "t", prompt_version: "v1" };
  const cnt = (rows, k) => Object.fromEntries(["ach", "aff", "pow"].map((m) => [m, rows.filter((r) => r[k] && r[k].motives.includes(m)).length]));
  function make(pairs, failed = false) {
    const sentences = pairs.map(([d, t], i) => ({
      id: `p${(i % 4) + 1}-s${i + 1}`, picture_id: `p${(i % 4) + 1}`, source: `句子 ${i}`,
      english: failed ? null : `Sentence ${i}`, uncertain: failed ? null : i === 0,
      direct: sc(...d), translated: failed ? null : sc(...t),
    }));
    const same = sentences.filter((s) => s.translated && [...s.direct.motives].sort().join() === [...s.translated.motives].sort().join()).length;
    return {
      sentences, translation_failed: failed, meta,
      summary: {
        direct: cnt(sentences, "direct"), translated: failed ? null : cnt(sentences, "translated"),
        agreement: failed ? null : { same, total: sentences.length },
        total_chars: { p1: 10, p2: 10, p3: 10, p4: 10 }, english_words: failed ? null : 20,
      },
    };
  }
  // default run is the fixed bookclub set with no skips; random mode still draws
  S = fresh(); draw();
  check("bookclub set", S.order.join() === BOOKCLUB_SET.join() && S.skipsLeft === 0);
  S = fresh(); S.mode = "random"; draw();
  check("random draws four", new Set(S.order).size === 4 && S.skipsLeft === MAX_SKIPS);
  S = fresh();

  pictures = ["p1", "p2", "p3", "p4"].map(byId); // results render against the run's pictures
  const H = () => document.getElementById("headline").textContent;
  const render = (d) => { validateResult(d); renderResults(d); };

  const ten = (d, t) => Array.from({ length: 10 }, () => [d, t]);
  render(make(ten(["aff"], ["aff"])));
  check("shared leader", H().includes("兩種分析都") && H().includes("親和"));
  check("english visible without expanding", document.querySelector("#cards summary .en").textContent.includes("Sentence 0"));
  check("agreement shown", document.getElementById("agreement").textContent.includes("10 ／ 10"));
  check("tally is a sentence count", document.getElementById("tally").textContent.includes("連結／親和10 句")
    && document.querySelectorAll("#tally .dot.aff").length === 10);

  render(make([...ten(["aff"], ["aff"]), ...ten([], ["ach"])]));
  check("partial match is not a disagreement", !H().includes("唔一致") && H().includes("親和")
    && document.getElementById("headline-note").textContent.includes("英文翻譯後分析另外「成就」"));

  render(make([...ten(["ach"], ["pow"])]));
  check("disagreement", H().includes("唔一致"));

  render(make([[["ach"], ["ach"]], [["pow"], ["pow"]], ...ten([], [])]));
  check("tie", H().includes("「成就」同「影響力／權力」") && H().includes("數量一樣"));

  render(make(ten([], [])));
  check("zero", H().includes("冇識別到") && document.getElementById("headline-note").textContent.includes("唔代表"));

  render(make([[["ach"], ["ach"]], [[], []]]));
  check("sparse", document.getElementById("headline-note").textContent.includes("材料有限"));

  render(make(ten(["aff"], []), true));
  check("fallback headline", H().startsWith("原文分析"));
  check("fallback not zero", document.getElementById("bars").textContent.includes("翻譯未能完成"));
  check("fallback cards", document.getElementById("cards").textContent.includes("未有翻譯"));

  // empty motive lists compare equal
  const e = make([[[], []]]);
  check("empty sets agree", e.summary.agreement.same === 1);

  // invalid responses must throw (so the draft is kept)
  const bad = [
    null, {}, { ...make(ten([], [])), translation_failed: "no" },
    (() => { const d = make(ten([], [])); d.summary.translated = null; return d; })(),
    (() => { const d = make(ten([], []), true); d.sentences[0].translated = sc("ach"); return d; })(),
    (() => { const d = make(ten([], [])); d.sentences[0].direct.motives = ["null"]; return d; })(),
  ];
  bad.forEach((d, i) => { try { validateResult(d); fails.push(`invalid ${i} accepted`); } catch { /* expected */ } });

  // literal text only
  const x = make([[["ach"], ["ach"]]]);
  x.sentences[0].source = '<img src=x onerror="window.__xss2=1">';
  render(x);
  check("no markup", !document.querySelector("#cards img[src='x']") && document.getElementById("cards").textContent.includes("<img"));
  return fails;
})();
