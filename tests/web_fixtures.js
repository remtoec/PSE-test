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
    && recovered.guidance === "legacy-guidance-resumed-with-v3");
  localStorage.setItem(KEY, JSON.stringify({ ...oldDraft, guidance: "pse-hk-guidance-v2" }));
  check("v2 draft records resuming under v3", load().guidance === "pse-hk-guidance-v2-resumed-with-v3");
  localStorage.setItem(KEY, JSON.stringify({ ...oldDraft, guidance: "legacy-guidance-resumed-with-v3" }));
  check("resume label is not stacked", load().guidance === "legacy-guidance-resumed-with-v3");
  if (previousDraft === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, previousDraft);
  const ph = document.getElementById("story").placeholder;
  check("full-story guidance sits in the writing box", ["經歷緊咩", "之前發生咗咩事", "感受到咩", "最想要咩", "最後點樣收場"]
    .every((x) => ph.includes(x)) && document.querySelectorAll("#v-write .arc span:not(.sr-only)").length === 4);
  check("no continuation framing", !document.getElementById("v-write").textContent.includes("然後"));
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
  check("both paths kept in technical detail", document.querySelectorAll("#tally .path-panel").length === 2
    && document.getElementById("tally").closest("details.technical"));
  check("insight leads the results", document.getElementById("results-title").textContent.includes("特別著重「連結」")
    && document.querySelectorAll("#profile .profile-row").length === 3 && !document.getElementById("profile").closest("details"));
  check("benchmark shown against the pictures", document.getElementById("insight-lede").textContent.includes("一般人寫呢四張圖")
    && document.getElementById("insight-lede").textContent.includes("關係"));
  check("leading theme's research note opens first", document.querySelector("#motive-notes > details").dataset.motive === "aff"
    && document.querySelector("#motive-notes > details").open
    && [...document.querySelectorAll("#motive-notes > details")].filter((x) => x.open).length === 1);
  check("both paths show sentence counts", document.querySelectorAll("#tally .tally-row .n").length === 6
    && document.getElementById("tally").textContent.includes("10 句"));
  check("correct theory bridge", ["competence", "relatedness", "autonomy"].every((x) => document.getElementById("reflection").textContent.includes(x))
    && document.querySelectorAll("#reflection .reflect-list li").length === 3
    && !document.getElementById("v-results").querySelector("input,textarea"));

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
  check("fallback reading uses the original text", document.getElementById("profile-note").textContent.includes("翻譯未完成"));
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

  // reading logic: either path counts, shares compared with the pictures' pull
  const one = (d, t) => ({ direct: sc(...d), translated: t && sc(...t) });
  const u = combined([one([], ["ach"]), one(["aff"], ["aff"]), one(["pow"], []), one(["aff"], null)]);
  check("a theme counts once if either reading finds it", u.ach === 1 && u.aff === 2 && u.pow === 1);
  const clubTypical = typicalShares(BOOKCLUB_SET.map(byId));
  check("bookclub typical shares", Math.abs(clubTypical.aff - 4.18 / 11.59) < 1e-9 && Math.abs(clubTypical.ach - 3.42 / 11.59) < 1e-9);
  const even = { ach: 1 / 3, aff: 1 / 3, pow: 1 / 3 };
  check("lean", reading({ ach: 1, aff: 5, pow: 1 }, clubTypical).kind === "lean"
    && reading({ ach: 1, aff: 5, pow: 1 }, clubTypical).focus.join() === "aff");
  check("balanced", reading({ ach: 3, aff: 4, pow: 3 }, clubTypical).kind === "balanced"
    && reading({ ach: 3, aff: 4, pow: 3 }, clubTypical).focus.join() === "aff");
  check("sparse", reading({ ach: 1, aff: 1, pow: 0 }, clubTypical).kind === "sparse");
  check("tied lean names both", reading({ ach: 3, aff: 3, pow: 0 }, even).focus.join() === "ach,aff");
  check("lab picture pulls two themes", typicalOf(byId("c18")).join() === "ach,pow");
  check("unmatched picture has no typical theme", typicalOf({ pull: null }) === null
    && broughtIn({ pull: null }, { ach: 1, aff: 1, pow: 1 }).length === 0);

  pictures = BOOKCLUB_SET.map(byId);
  const club = (rows) => { const d = make(rows); d.sentences.forEach((s, i) => { s.picture_id = pictures[i % 4].id; s.id = `${s.picture_id}-s${i}`; }); return d; };
  // boxer ach, couple POWER (picture pulls affiliation), lab ach, captain pow
  render(club([[["ach"], ["ach"]], [[], ["pow"]], [["ach"], ["ach"]], [["pow"], ["pow"]]]));
  check("brought-in theme is flagged", document.querySelectorAll("#cards .chip.brought").length === 1
    && document.querySelectorAll("#cards .pic-group")[1].querySelector(".chip.brought").textContent.includes("影響力")
    && !document.getElementById("brought").hidden && document.getElementById("brought").textContent.includes("第 2 張"));

  render(club([[[], []], [["aff"], []], [[], []], [[], []]]));
  check("sparse hides the profile", document.getElementById("results-title").textContent.includes("較少寫到")
    && document.getElementById("profile").hidden && document.getElementById("insight-lede").textContent.includes("唔代表")
    && ![...document.querySelectorAll("#motive-notes > details")].some((x) => x.open));
  pictures = ["p1", "p2", "p3", "p4"].map(byId);

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
  check("new result closes technical detail", !document.querySelector("#v-results details.technical").open);
  check("classical results retain original counts", document.getElementById("tally").textContent.includes("3 句")
    || demo.translation_failed);
  check("four classical result cards", document.querySelectorAll("#cards .pic-group").length === 4
    && document.querySelector("#cards .pic-group summary img").getAttribute("src") === "stimuli/c05.jpg");
  return fails;
}
