// Result-rendering checks, loaded only by scripts/preview_ui.py at /__test__/.
// Returns a list of failures ([] = pass).
function runWebFixtures() {
  const fails = [];
  const check = (name, cond) => { if (!cond) fails.push(name); };
  // Scores follow the flags, like the real model (predict == proba >= 0.5).
  const sc = (...m) => ({ motives: m, scores: Object.fromEntries([...["ach", "aff", "pow"].map((k) => [k, m.includes(k) ? 0.7 : 0.05]), ["null", m.length ? 0.2 : 0.9]]) });
  const meta = { amc_model: "m", amc_revision: "738833d", translator: "t", prompt_version: "v1" };
  // default run is the fixed bookclub set with no skips; random mode still draws
  S = fresh(); draw();
  check("bookclub set", S.order.join() === BOOKCLUB_SET.join() && S.skipsLeft === 0);
  check("classical default", pictures.map(p => p.pse_id).join("|") ===
    "boxer|couple by river|women in laboratory|ship captain");
  check("new guidance recorded", protocolNotes().guidance === GUIDE_VERSION);
  check("pull carries story length", pullText(byId("c05")).includes("88.55 字") && pullText(byId("c05")).includes("1724")
    && pool.filter((p) => p.pull).every((p) => p.pull.words > 50 && p.pull.sentences > 3));
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
  check("full-story guidance sits in the writing box", ["每個人", "經歷緊咩", "之前發生咗咩事", "感受到咩", "最想要咩", "點樣收場"]
    .every((x) => ph.includes(x)) && document.querySelectorAll("#v-write .arc span:not(.sr-only)").length === 4);
  check("prompt asks for each character with 他／她", ph.includes("他／她") && ph.includes("「男人」「女人」") && !ph.includes("佢哋"));
  check("language line above the box", ["英文", "廣東話", "書面語", "夾雜"].every((x) => document.getElementById("lang-note").textContent.includes(x))
    && document.getElementById("lang-note").compareDocumentPosition(document.getElementById("story")) & Node.DOCUMENT_POSITION_FOLLOWING);
  check("no continuation framing", !document.getElementById("v-write").textContent.includes("然後"));
  S = fresh(); S.mode = "random"; draw();
  check("random draws four", new Set(S.order).size === 4 && S.skipsLeft === MAX_SKIPS);
  check("random pool covers whole archive", pool.length === 48
    && pool.filter(p => p.archive_file.startsWith("classic images/")).length === 18
    && pool.filter(p => p.archive_file.startsWith("new images/")).length === 30);
  S = fresh();

  // ---- reading: English first ----
  const english = { direct: sc("aff"), translated: sc() };
  check("English reading is the main source", themesOf(english).size === 0);
  check("original reading only without a translation", [...themesOf({ direct: sc("aff"), translated: null })].join() === "aff");
  const faintOnly = { direct: sc(), translated: { motives: [], scores: { ach: 0.31, aff: 0.29, pow: 0.1, null: 0.6 } } };
  check("a faint theme shows, below the floor does not", [...themesOf(faintOnly)].join() === "ach");
  const lbl = document.createElement("div"); lbl.append(...[labelList(faintOnly.translated)].flat());
  check("faint theme labelled as such", lbl.textContent === "隱約：成就" && lbl.querySelector(".label.faint.ach"));
  check("missing scores are tolerated", themesOf({ direct: { motives: ["pow"] }, translated: null }).has("pow")
    && prob({ motives: ["pow"] }, "pow") === 1 && prob({ motives: [] }, "pow") === 0);

  // ---- length-adjusted rates (images per 1,000 words) ----
  const club = BOOKCLUB_SET.map(byId);
  const clubWords = 88.55 + 94.29 + 90.67 + 93.7;
  const row = (t, en) => ({ id: "x", picture_id: "c05", source: "x", english: en, uncertain: false, direct: sc(), translated: t });
  const rd = { translation_failed: false, sentences: [
    row({ motives: ["aff"], scores: { ach: 0, aff: 0.7, pow: 0 } }, "one two three four five"),
    row({ motives: [], scores: { ach: 0, aff: 0.5, pow: 0.1 } }, "six seven eight nine ten")] };
  const rr = rates(rd, club);
  check("typical rate uses the norms' own story length", Math.abs(rr.typical.aff - 4.18 / clubWords * 1000) < 1e-9
    && Math.abs(rr.typical.ach - 3.42 / clubWords * 1000) < 1e-9);
  check("your rate sums probabilities per English word", Math.abs(rr.you.aff - 120) < 1e-9 && Math.abs(rr.you.pow - 10) < 1e-9 && rr.words === 10);
  const rf = rates({ ...rd, translation_failed: true, sentences: rd.sentences.map((x) => ({ ...x, english: null, translated: null, direct: x.translated })) }, club);
  check("without a translation only the balance is kept", rf.words === 0
    && Math.abs(MOTIVES.reduce((a, m) => a + rf.you[m], 0) - MOTIVES.reduce((a, m) => a + rf.typical[m], 0)) < 1e-9
    && reading(rf).overall === null);

  // ---- reading tiers ----
  const even = { ach: 10, aff: 10, pow: 10 };
  const rx = (you, words = 100, total = 5) => reading({ you, typical: even, sum: you, total, words });
  check("lean", rx({ ach: 10, aff: 25, pow: 10 }).kind === "lean" && rx({ ach: 10, aff: 25, pow: 10 }).focus.join() === "aff");
  check("slight lean", rx({ ach: 10, aff: 13, pow: 10 }).kind === "tilt" && rx({ ach: 10, aff: 13, pow: 10 }).focus.join() === "aff");
  check("balanced", rx({ ach: 10, aff: 11, pow: 10 }).kind === "balanced" && rx({ ach: 10, aff: 11, pow: 10 }).focus.join() === "aff");
  check("quiet", rx({ ach: 2, aff: 3, pow: 2 }).kind === "quiet" && rx({ ach: 0, aff: 0, pow: 0 }).kind === "quiet");
  check("tied lean names both", rx({ ach: 20, aff: 20, pow: 2 }).focus.join() === "ach,aff");
  check("fallback quiet needs some imagery", rx({ ach: 1, aff: 0, pow: 0 }, 0, 1).kind === "quiet"
    && rx({ ach: 10, aff: 25, pow: 10 }, 0, 3).kind === "lean");
  const lean = insightText(rx({ ach: 10, aff: 25, pow: 10 }));
  check("lean is named in words", lean[0] === "你嘅故事，特別著重「連結」。" && lean[1].includes("明顯多過一般人")
    && lean[1].includes("關係") && lean[1].includes("筆墨比一般人多"));
  check("slight lean is worded softer", insightText(rx({ ach: 10, aff: 13, pow: 10 }))[0] === "你嘅故事，有少少偏向「連結」。");
  check("insight text has no numbers", ![lean, insightText(rx({ ach: 10, aff: 11, pow: 10 })), insightText(rx({ ach: 1, aff: 1, pow: 1 }))]
    .flat().some((t) => /[0-9%]/.test(t)));
  check("comparison words", compareWord(13, 10) === "多過一般" && compareWord(10, 10) === "同一般相若" && compareWord(7, 10) === "少過一般");
  check("lab picture pulls two themes", typicalOf(byId("c18")).join() === "ach,pow");
  check("unmatched picture has no typical theme", typicalOf({ pull: null }) === null
    && broughtIn({ pull: null }, { ach: 1, aff: 1, pow: 1 }).length === 0);

  // ---- rendered results ----
  const words = (i) => `Sentence number ${i} has a few more English words here`; // ten words
  function make(rows, failed = false) {
    const sentences = rows.map(([d, t], i) => ({
      id: `${pictures[i % 4].id}-s${i + 1}`, picture_id: pictures[i % 4].id, source: `句子 ${i}`,
      english: failed ? null : words(i), uncertain: failed ? null : i === 0,
      direct: sc(...d), translated: failed ? null : sc(...t),
    }));
    const cnt = (k) => Object.fromEntries(MOTIVES.map((m) => [m, sentences.filter((x) => x[k] && x[k].motives.includes(m)).length]));
    const same = sentences.filter((x) => x.translated && [...x.direct.motives].sort().join() === [...x.translated.motives].sort().join()).length;
    return { sentences, translation_failed: failed, meta,
      summary: { direct: cnt("direct"), translated: failed ? null : cnt("translated"), agreement: failed ? null : { same, total: sentences.length },
        total_chars: {}, english_words: failed ? null : sentences.length * 10 } };
  }
  const render = (d) => { validateResult(d); renderResults(d); };
  const visible = () => ["results-title", "insight-lede", "profile", "profile-legend", "brought"].map((id) => document.getElementById(id).textContent).join("");
  pictures = club;

  // couple by river gets POWER, which that picture seldom pulls; affiliation dominates overall
  render(make([[[], ["ach"]], [["aff"], ["aff", "pow"]], [[], ["aff"]], [[], ["aff"]], [[], []], [[], ["aff"]], [[], []], [[], ["aff"]]]));
  check("insight leads the results", document.getElementById("results-title").textContent.includes("「連結」")
    && document.querySelectorAll("#profile .profile-row").length === 3 && !document.getElementById("profile").closest("details"));
  check("profile draws bars and reference lines only", document.querySelectorAll("#profile .profile-fill").length === 3
    && document.querySelectorAll("#profile .profile-typical").length === 3
    && [...document.querySelectorAll("#profile .profile-word")].every((e) => ["多過一般", "同一般相若", "少過一般"].includes(e.textContent)));
  check("no numbers on the results summary", !/[0-9%]/.test(visible().replace(/第 \d 張/g, "")));
  check("no counts on picture chips", ![...document.querySelectorAll("#cards .chip")].some((e) => /[0-9]/.test(e.textContent)));
  check("brought-in theme is flagged", document.querySelectorAll("#cards .pic-group")[1].querySelector(".chip.brought")?.textContent.includes("影響力")
    && !document.getElementById("brought").hidden && document.getElementById("brought").textContent.includes("第 2 張"));
  check("leading theme's research note opens first", document.querySelector("#motive-notes > details").dataset.motive === "aff"
    && document.querySelector("#motive-notes > details").open
    && [...document.querySelectorAll("#motive-notes > details")].filter((x) => x.open).length === 1);
  check("sentence cards show English and themes only", document.querySelector("#cards .card-body").textContent.includes("英文")
    && document.querySelector("#cards .card-body").textContent.includes("主題")
    && !document.getElementById("cards").textContent.includes("原文分析"));
  check("method stays out of the page", !document.getElementById("tally") && !document.getElementById("headline")
    && document.querySelector("#v-results details.about") && document.querySelectorAll("#credits-results li").length >= 5);
  check("correct theory bridge", ["competence", "relatedness", "autonomy"].every((x) => document.getElementById("reflection").textContent.includes(x))
    && document.querySelectorAll("#reflection .reflect-list li").length === 3
    && !document.getElementById("v-results").querySelector("input,textarea"));
  check("source is the sentence entry point", document.querySelector("#cards .card summary .txt").textContent.includes("句子 0"));
  check("uncertain translation noted", document.getElementById("cards").textContent.includes("翻譯可能唔準"));

  render(make([[[], []], [["aff"], []], [[], []], [[], []]]));
  check("quiet stories", document.getElementById("results-title").textContent.includes("較少寫到")
    && document.getElementById("insight-lede").textContent.includes("唔代表")
    && ![...document.querySelectorAll("#motive-notes > details")].some((x) => x.open));

  render(make([[["aff"], []], [["aff"], []], [["pow"], []], [["aff"], []]], true));
  check("fallback reads the original and says so", !document.getElementById("profile-note").hidden
    && document.getElementById("profile-note").textContent.includes("翻譯未完成")
    && document.getElementById("results-title").textContent.includes("「連結」")
    && !document.querySelector("#cards .card-body").textContent.includes("英文"));

  // headline() still compares both paths for the downloaded technical record
  const H = (d) => headline(d)[0];
  const ten = (d, t) => Array.from({ length: 10 }, () => [d, t]);
  check("shared leader", H(make(ten(["aff"], ["aff"]))).includes("兩種分析都"));
  check("partial match is not a disagreement", !H(make([...ten(["aff"], ["aff"]), ...ten([], ["ach"])])).includes("唔一致"));
  check("disagreement", H(make(ten(["ach"], ["pow"]))).includes("唔一致"));
  check("fallback headline", H(make(ten(["aff"], []), true)).startsWith("原文分析"));
  check("empty sets agree", make([[[], []]]).summary.agreement.same === 1);

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

  // Leave a clearly synthetic, readable debrief for visual QA.
  const failed = new URLSearchParams(location.search).get('outcome') === 'fallback';
  const stories = [
    ['他練習咗好多次，今次想試吓可唔可以做得更好。', 'He had practised many times and wanted to see if he could do better this time.', [], ["ach"]],
    ['兩個人好耐冇見，坐低之後慢慢傾返以前嘅事。', 'The two of them had not met for a long time and sat down to talk slowly about the past.', ["aff"], ["aff"]],
    ['她希望其他人聽完之後，會願意一齊改變。', 'She hoped that after listening, the others would be willing to change together.', [], ["pow"]],
    ['船長企出嚟，帶大家試另一個方法。', 'The captain stepped forward and led everyone in trying another approach.', ["pow"], ["pow"]],
    ['就算今次未做到，他都想再試一次。', 'Even if he could not do it this time, he wanted to try again.', [], ["ach"]],
    ['最後她行返過去，坐喺他身邊。', 'In the end she walked back and sat beside him.', ["aff"], ["aff"]],
    ['她唔想只係跟住做，想令大家認真考慮自己嘅意見。', 'She did not want to just follow along; she wanted people to take her opinion seriously.', [], ["pow"]],
    ['散場之前，她問他下次仲會唔會嚟。', 'Before leaving, she asked him whether he would come again next time.', [], ["aff"]],
  ];
  const demo = make(stories.map(([, , d, t]) => [d, t]), failed);
  demo.sentences.forEach((s, i) => { s.source = stories[i][0]; if (!failed) s.english = stories[i][1]; });
  lastMode = 'bookclub';
  lastProtocol = { times: [240000, 240000, 240000, 240000], notes: [], guidance: GUIDE_VERSION };
  render(demo);
  lastResult = demo;
  check("new result closes the about note", !document.querySelector("#v-results details.about").open);
  check("four classical result cards", document.querySelectorAll("#cards .pic-group").length === 4
    && document.querySelector("#cards .pic-group summary img").getAttribute("src") === "stimuli/c05.jpg");
  return fails;
}
