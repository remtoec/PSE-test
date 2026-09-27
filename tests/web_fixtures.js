// Result-rendering checks, loaded only by scripts/preview_ui.py at /__test__/.
// Returns a list of failures ([] = pass).
function runWebFixtures() {
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
  check("classical default", pictures.map(p => p.pse_id).join("|") ===
    "boxer|couple by river|women in laboratory|ship captain");
  check("new guidance recorded", protocolNotes().guidance === GUIDE_VERSION);
  renderPicturePull(document.getElementById("picture-pull"));
  check("pull follows actual pictures", document.getElementById("picture-pull").textContent.includes("1724")
    && document.getElementById("picture-pull").textContent.includes("2612"));
  check("missing norms are not zero", pullText({ pull: null }).includes("未有核實"));
  const oldDraft = { ...fresh(), order: ["p7", "p9", "p4", "p2"], savedAt: Date.now() };
  delete oldDraft.guidance;
  const previousDraft = localStorage.getItem(KEY);
  localStorage.setItem(KEY, JSON.stringify(oldDraft));
  const recovered = load();
  check("old draft keeps original pictures", recovered.order.join() === "p7,p9,p4,p2"
    && recovered.guidance === "legacy-guidance-resumed-with-v2");
  if (previousDraft === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, previousDraft);
  check("guidance is not collapsed", document.querySelector(".prompt-notes .prompts")
    && !document.querySelector(".prompt-notes").closest("details"));
  S = fresh(); S.mode = "random"; draw();
  check("random draws four", new Set(S.order).size === 4 && S.skipsLeft === MAX_SKIPS);
  check("random pool covers whole archive", pool.length === 48
    && pool.filter(p => p.archive_file.startsWith("classic images/")).length === 18
    && pool.filter(p => p.archive_file.startsWith("new images/")).length === 30);
  S = fresh();

  pictures = ["p1", "p2", "p3", "p4"].map(byId); // results render against the run's pictures
  const H = () => document.getElementById("headline").textContent;
  const render = (d) => { validateResult(d); renderResults(d); };

  const ten = (d, t) => Array.from({ length: 10 }, () => [d, t]);
  render(make(ten(["aff"], ["aff"])));
  check("shared leader", H().includes("兩種分析都") && H().includes("親和"));
  check("source is the sentence entry point", document.querySelector("#cards summary .txt").textContent.includes("句子 0"));
  check("agreement shown", document.getElementById("agreement").textContent.includes("10 ／ 10"));
  check("both paths lead the results", document.querySelectorAll("#tally .path-panel").length === 2
    && !document.getElementById("tally").closest("details"));
  check("both paths show sentence counts", document.querySelectorAll("#tally .tally-row .n").length === 6
    && document.getElementById("tally").textContent.includes("10 句"));
  check("correct theory bridge", document.getElementById("reflection")?.textContent.includes("competence")
    && document.getElementById("reflection")?.textContent.includes("relatedness")
    && !document.getElementById("reflection").querySelector("input,textarea"));

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
  check("fallback visible in main comparison", document.getElementById("tally").textContent.includes("翻譯未能完成")
    && document.querySelectorAll("#tally .path-panel")[1].querySelectorAll(".tally-row").length === 0);
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
  document.getElementById("reflection-next").click();
  check("reflection advances", !document.querySelector('[data-reflection="1"]').hidden
    && document.querySelector('[data-reflection="0"]').hidden);
  document.getElementById("reflection-prev").click();
  check("reflection goes back", !document.querySelector('[data-reflection="0"]').hidden);
  document.getElementById("reflection-next").click();
  document.getElementById("reflection-next").click();
  document.getElementById("reflection-next").click();
  check("reflection closes without collecting answers", !document.getElementById("reflection-closing").hidden);

  // Leave a clearly synthetic, readable debrief for visual QA.
  const demo = make([
    [["ach"], ["ach"]], [["aff"], ["aff"]], [[], ["pow"]], [["pow"], ["pow"]],
    [[], ["ach"]], [["aff"], ["aff"]], [["pow"], ["pow"]], [[], ["aff"]],
  ], new URLSearchParams(location.search).get('outcome') === 'fallback');
  const stories = [
    ['佢練習咗好多次，今次想試吓可唔可以做得更好。', 'She had practised many times and wanted to see if she could do better.'],
    ['兩個人好耐冇見，坐低之後慢慢傾返以前嘅事。', 'They had not met for a long time and sat down to talk about the past.'],
    ['佢希望其他人聽完之後，會願意一齊改變。', 'He hoped that after listening, the others would be willing to make a change together.'],
    ['佢企出嚟，帶大家試另一個方法。', 'She stepped forward and led everyone in trying another approach.'],
    ['就算今次未做到，佢都想再試一次。', 'Even if he could not do it this time, he wanted to try again.'],
    ['最後佢行返過去，坐喺朋友身邊。', 'In the end she went back and sat beside her friend.'],
    ['佢唔想只係跟住做，想令大家認真考慮自己嘅意見。', 'He wanted people to consider his opinion seriously rather than simply following along.'],
    ['散場之前，佢問對方下次仲會唔會嚟。', 'Before leaving, she asked whether the other person would come again.'],
  ];
  pictures = BOOKCLUB_SET.map(byId);
  demo.sentences.forEach((s, i) => {
    s.picture_id = pictures[i % 4].id;
    s.id = `${s.picture_id}-s${Math.floor(i / 4) + 1}`;
    s.source = stories[i][0];
    if (!demo.translation_failed) s.english = stories[i][1];
  });
  demo.summary.total_chars = Object.fromEntries(pictures.map(p => [p.id, 10]));
  lastMode = 'bookclub';
  lastProtocol = { times: [240000, 240000, 240000, 240000], notes: [], guidance: GUIDE_VERSION };
  render(demo);
  lastResult = demo;
  check("new result resets reflection", document.querySelector('[data-reflection="1"]').hidden
    && document.getElementById("reflection-closing").hidden);
  check("classical results retain original counts", document.getElementById("tally").textContent.includes("3 句")
    || demo.translation_failed);
  check("four classical result cards", document.querySelectorAll("#cards .pic-group").length === 4
    && document.querySelector("#cards .pic-head img").getAttribute("src") === "stimuli/c05.jpg");
  return fails;
}
