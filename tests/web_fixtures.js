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
  check("pull carries story length", pullText(byId("c05")).includes("88.55 字") && pullText(byId("c05")).includes("1724")
    && pool.filter((p) => p.pull).every((p) => p.pull.words > 50 && p.pull.sentences > 3));
  check("missing norms are not zero", pullText({ pull: null }).includes("未有核實"));
  const oldDraft = { ...fresh(), order: ["p7", "p9", "p4", "p2"], savedAt: Date.now() };
  delete oldDraft.guidance;
  const previousDraft = localStorage.getItem(KEY);
  localStorage.setItem(KEY, JSON.stringify(oldDraft));
  const recovered = load();
  check("old draft keeps original pictures", recovered.order.join() === "p7,p9,p4,p2"
    && recovered.guidance === "legacy-guidance-resumed-with-v5");
  localStorage.setItem(KEY, JSON.stringify({ ...oldDraft, guidance: "pse-hk-guidance-v2" }));
  check("v2 draft records new guidance", load().guidance === "pse-hk-guidance-v2-resumed-with-v5");
  localStorage.setItem(KEY, JSON.stringify({ ...oldDraft, guidance: "legacy-guidance-resumed-with-v3" }));
  check("older resume history is retained", load().guidance === "legacy-guidance-resumed-with-v3-resumed-with-v5");
  localStorage.setItem(KEY, JSON.stringify({ ...oldDraft, guidance: "legacy-guidance-resumed-with-v3-resumed-with-v5" }));
  check("same guidance resume is not stacked", load().guidance === "legacy-guidance-resumed-with-v3-resumed-with-v5");
  if (previousDraft === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, previousDraft);
  const ph = document.getElementById("story").placeholder;
  check("full-story guidance sits in the writing box", ["人物", "正在經歷", "之前發生", "感受", "想做甚麼", "結束"]
    .every((x) => ph.includes(x)) && document.querySelectorAll("#v-write .arc span:not(.sr-only)").length === 4);
  check("character clarity preserves language freedom", document.getElementById("writing-help").textContent.includes("名字或身份") && !ph.includes("他／她"));
  check("language line above the box", ["英文", "廣東話", "書面語", "夾雜"].every((x) => document.getElementById("lang-note").textContent.includes(x))
    && document.getElementById("lang-note").compareDocumentPosition(document.getElementById("story")) & Node.DOCUMENT_POSITION_FOLLOWING);
  check("no continuation framing", !document.getElementById("v-write").textContent.includes("然後"));
  const beforeWriting = ["v-intro", "v-view", "v-write"].map((id) => document.getElementById(id).textContent).join("")
    + document.getElementById("story").placeholder;
  check("no theme is named before writing", !["成就", "連結", "影響力", "成功", "關係", "勝任感", "歸屬感", "動機"].some((t) => beforeWriting.includes(t)));
  check("before-writing note: first instinct, whole story, no going back", ["第一個想到", "有頭有尾", "不能修改"].every((t) => document.getElementById("v-intro").textContent.includes(t))
    && !document.querySelector("#v-intro .intro-why"));
  check("lock note fits every round's button", !document.querySelector("#v-write .lock-note").textContent.includes("下一張"));
  check("review does not name motives before results", !document.getElementById("v-review").textContent.includes("動機"));
  const stored = Object.fromEntries([SKIP_KEY, SEEN_KEY, PLAYED_KEY].map((k) => [k, localStorage.getItem(k)]));
  S = fresh(); S.mode = "random"; draw();
  check("random draws four", new Set(S.order).size === 4 && S.skipsLeft === MAX_SKIPS);
  check("random pool covers whole archive", pool.length === 48
    && pool.filter(p => p.archive_file.startsWith("classic images/")).length === 18
    && pool.filter(p => p.archive_file.startsWith("new images/")).length === 30);
  // Random mode: solid references only, never the classic set, no repeats until every eligible picture is seen.
  [SKIP_KEY, SEEN_KEY].forEach((k) => localStorage.removeItem(k));
  const eligible = randomPool();
  check("random pool: solid references outside the classic set", eligible.length === 18
    && eligible.every((p) => p.pull && p.pull.n_stories >= MIN_NORM_STORIES && !BOOKCLUB_SET.includes(p.id))
    && !eligible.some((p) => p.id === "c08" || p.id === "n26"));
  const runs = Array.from({ length: 4 }, () => { S = fresh(); S.mode = "random"; draw(); return [...S.order]; });
  check("four replays never repeat a picture", new Set(runs.flat()).size === 16
    && runs.flat().every((id) => eligible.some((p) => p.id === id)));
  S = fresh(); S.mode = "random"; draw();
  check("pool exhausted: seen list starts a new cycle", new Set(S.order).size === 4 && readList(SEEN_KEY).length === 4);
  const swap = candidates(S.order);
  check("swaps avoid the current, seen and classic pictures", swap.length === 14
    && !swap.some((p) => S.order.includes(p.id) || BOOKCLUB_SET.includes(p.id)));
  localStorage.setItem(SKIP_KEY, JSON.stringify(eligible.slice(0, 16).map((p) => p.id)));
  S = fresh(); S.mode = "random"; draw();
  check("too many skips are forgotten rather than blocking", new Set(S.order).size === 4);
  setChoices(false);
  check("first visit leads with the classic set", document.getElementById("choices").firstElementChild.id === "btn-start"
    && document.getElementById("btn-start").classList.contains("primary") && !document.getElementById("btn-random").classList.contains("primary")
    && document.getElementById("btn-random").textContent.includes("寫過了？"));
  setChoices(true);
  check("returning players are offered new pictures first", document.getElementById("choices").firstElementChild.id === "btn-random"
    && document.getElementById("btn-random").classList.contains("primary") && document.getElementById("btn-start").textContent.includes("讀書會"));
  setChoices(false);
  check("results offer new pictures visibly", document.getElementById("btn-again-random").classList.contains("secondary"));
  Object.entries(stored).forEach(([k, v]) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)));
  S = fresh();

  pictures = ["p1", "p2", "p3", "p4"].map(byId); // results render against the run's pictures
  // headline() compares both paths for the download's research record only.
  const H = (d) => headline(d)[0];
  const HN = (d) => headline(d)[1];
  const summaryText = () => ["results-title", "insight-lede", "profile", "profile-legend", "profile-note"]
    .map((id) => document.getElementById(id).textContent).join("")
    + [...document.querySelectorAll("#evidence p, #brought")].map((e) => e.textContent.replace(/第 [\d、]+ 個/g, "")).join("");
  const render = (d) => { validateResult(d); renderResults(d); };

  const ten = (d, t) => Array.from({ length: 10 }, () => [d, t]);
  const shared = make(ten(["aff"], ["aff"]));
  render(shared);
  check("shared leader", H(shared).includes("兩種分析都") && H(shared).includes("「關係」"));
  check("source is the sentence entry point", document.querySelector("#cards summary .txt").textContent.includes("句子 0"));
  check("method stays off the page", !document.getElementById("tally") && !document.getElementById("headline")
    && !document.getElementById("reading-method") && !document.querySelector("#v-results details.technical")
    && document.querySelector("#v-results details.about") && document.querySelectorAll("#credits-results li").length >= 4);
  check("no numbers on the results summary", !/[0-9%]/.test(summaryText()));
  check("no counts on picture chips", ![...document.querySelectorAll("#cards .chip")].some((e) => /[0-9]/.test(e.textContent)));
  check("sentence cards show English and themes only", document.querySelector("#cards .card-body").textContent.includes("英文")
    && document.querySelector("#cards .card-body").textContent.includes("主題")
    && !document.getElementById("cards").textContent.includes("原文分析"));
  check("analysis is always visible", document.getElementById("results-title").textContent.includes("彼此的關係")
    && document.querySelectorAll("#profile .profile-row").length === 3 && document.getElementById("analysis-detail").tagName === "SECTION"
    && document.getElementById("evidence-section").compareDocumentPosition(document.getElementById("meaning")) & Node.DOCUMENT_POSITION_FOLLOWING);
  check("comparison belongs in analysis details", document.getElementById("comparison-note").textContent.includes("研究參照")
    && !document.getElementById("insight-lede").textContent.includes("研究參照"));
  check("analysis belongs with the story interpretation", document.getElementById("analysis-detail").parentElement.id === "evidence-section");
  check("analysis, quotes and folded stories precede the book", document.getElementById("stories-detail").parentElement.id === "evidence-section"
    && !document.getElementById("stories-detail").open
    && document.getElementById("analysis-detail").compareDocumentPosition(document.getElementById("evidence")) & Node.DOCUMENT_POSITION_FOLLOWING
    && document.getElementById("evidence").compareDocumentPosition(document.getElementById("stories-detail")) & Node.DOCUMENT_POSITION_FOLLOWING);
  check("counted themes are visible without opening a sentence", document.querySelector("#cards .card summary .sentence-counts").textContent === "計入關係");
  check("headline supported by literal source quotes", document.querySelector("#evidence blockquote").textContent === "句子 0"
    && document.querySelectorAll("#evidence blockquote").length === 2);
  check("bars are length-adjusted against reference lines", summarise(shared).refRates && summarise(shared).youRates
    && document.querySelectorAll("#profile .profile-typical").length === 3
    && [...document.querySelectorAll("#profile .profile-word")].every((e) => ["較密集", "相若", "較疏落"].includes(e.textContent)));
  check("book definitions are optional", [...document.querySelectorAll("#motive-notes > details")].every(x=>!x.open));
  check("reflection uses the reading, without collecting personal answers", document.getElementById("reflection-title").textContent === reflectionText(summarise(shared).r)[0]
    && !document.getElementById("v-results").querySelector("input,textarea"));
  check("book follows themes and stays after writing", document.getElementById("why").closest("#v-results")
    && document.getElementById("meaning").compareDocumentPosition(document.getElementById("why")) & Node.DOCUMENT_POSITION_FOLLOWING);
  check("screen shares book and theme copy with the export", RESULT_COPY.why.every(t=>document.getElementById("why-body").textContent.includes(t))
    && MOTIVES.every(m=>document.getElementById("motive-notes").textContent.includes(MOTIVE_COPY[m].body)));
  check("no unsupported need scores", !document.querySelector("#profile .need-head") && !document.querySelector(".need-tag"));

  const partial = make([...ten(["aff"], ["aff"]), ...ten([], ["ach"])]);
  check("partial match is not a disagreement", !H(partial).includes("主要方向不同") && H(partial).includes("「關係」")
    && HN(partial).includes("英文翻譯後分析另外標到同樣多的「成就」"));
  check("disagreement", H(make([...ten(["ach"], ["pow"])])).includes("主要方向不同"));
  const tie = make([[["ach"], ["ach"]], [["pow"], ["pow"]], ...ten([], [])]);
  check("tie", H(tie).includes("「成就」和「影響」") && H(tie).includes("數量一樣"));
  const zero = make(ten([], []));
  check("zero", H(zero).includes("未標到") && HN(zero).includes("對照原文"));

  const fallback = make(ten(["aff"], []), true);
  render(fallback);
  check("fallback headline", H(fallback).startsWith("原文分析"));
  check("fallback reads the original and says so", !document.getElementById("profile-note").hidden
    && document.getElementById("profile-note").textContent.includes("翻譯未完成"));
  check("fallback cards show no English", !document.querySelector("#cards .card-body").textContent.includes("英文"));
  check("fallback bars describe shares, not density", document.getElementById("profile-explanation").textContent.includes("比重")
    && !document.getElementById("profile").textContent.includes("密集"));

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

  // reading logic: the English reading counts; the original only without a translation
  const one = (d, t) => ({ direct: sc(...d), translated: t && sc(...t) });
  const u = combined([one([], ["ach"]), one(["aff"], ["aff"]), one(["pow"], []), one(["aff"], null)]);
  check("English reading is primary, original only as fallback", u.ach === 1 && u.aff === 2 && u.pow === 0);
  const faintOnly = { direct: { motives: [], scores: { ach: 0.31, aff: 0.29, pow: 0.1, null: 0.6 } }, translated: null };
  check("faint themes do not count in the main profile", themesOf(faintOnly).size === 0);
  const lbl = document.createElement("div"); lbl.append(...[labelList(faintOnly.direct)].flat());
  check("faint theme labelled as such", lbl.textContent === "隱約：成就" && lbl.querySelector(".label.faint.ach"));
  check("missing scores are tolerated", themesOf({ direct: { motives: ["pow"] }, translated: null }).has("pow"));
  const clubTypical = typicalShares(BOOKCLUB_SET.map(byId));
  check("bookclub typical shares", Math.abs(clubTypical.aff - 4.18 / 11.59) < 1e-9 && Math.abs(clubTypical.ach - 3.42 / 11.59) < 1e-9);
  const even = { ach: 1 / 3, aff: 1 / 3, pow: 1 / 3 };
  check("lean", reading({ ach: 1, aff: 5, pow: 1 }, clubTypical).kind === "lean"
    && reading({ ach: 1, aff: 5, pow: 1 }, clubTypical).focus.join() === "aff");
  check("balanced", reading({ ach: 3, aff: 4, pow: 3 }, clubTypical).kind === "balanced"
    && reading({ ach: 3, aff: 4, pow: 3 }, clubTypical).focus.join() === "aff");
  check("sparse", reading({ ach: 1, aff: 1, pow: 0 }, clubTypical).kind === "sparse");
  check("slight lean", reading({ ach: 3, aff: 4, pow: 2 }, clubTypical).kind === "tilt"
    && reading({ ach: 3, aff: 4, pow: 2 }, clubTypical).focus.join() === "aff");
  check("slight lean is worded softer", insightText(reading({ ach: 3, aff: 4, pow: 2 }, clubTypical), clubTypical, false)[0].includes("一些線索")
    && insightText(reading({ ach: 1, aff: 5, pow: 1 }, clubTypical), clubTypical, false)[1].includes("反覆出現"));
  check("tied lean names both", reading({ ach: 3, aff: 3, pow: 0 }, even).focus.join() === "ach,aff");
  check("lab picture pulls two themes", typicalOf(byId("c18")).join() === "ach,pow");
  check("unmatched picture has no typical theme", typicalOf({ pull: null }) === null
    && broughtIn({ pull: null }, { ach: 1, aff: 1, pow: 1 }).length === 0);

  pictures = BOOKCLUB_SET.map(byId);
  const club = (rows) => { const d = make(rows); d.sentences.forEach((s, i) => { s.picture_id = pictures[i % 4].id; s.id = `${s.picture_id}-s${i}`; }); return d; };
  // boxer ach, couple POWER (picture pulls affiliation), lab ach, captain pow
  render(club([[["ach"], ["ach"]], [[], ["pow"]], [["ach"], ["ach"]], [["pow"], ["pow"]]]));
  check("brought-in theme is flagged", document.querySelectorAll("#cards .chip.brought").length === 1
    && document.querySelectorAll("#cards .pic-group")[1].querySelector(".chip.brought").textContent.includes("影響")
    && !document.getElementById("brought").hidden && document.getElementById("brought").textContent.includes("第 2 個"));

  render(club([[[], []], [["aff"], []], [[], []], [[], []]]));
  check("sparse keeps stories accessible and folded without invented evidence", document.getElementById("profile").hidden
    && document.getElementById("evidence").hidden && !document.getElementById("evidence-section").hidden
    && !document.getElementById("evidence-empty").hidden && !document.getElementById("story-connection")
    && !document.getElementById("stories-detail").open
    && !document.querySelector("#cards .pic-group").open
    && ![...document.querySelectorAll("#motive-notes > details")].some((x) => x.open));
  const unsafe = club(ten(["aff"], ["aff"]));
  unsafe.sentences[0].source = '<img src=x onerror="window.__xss3=1">';
  render(unsafe);
  check("evidence source is never rendered as markup", !document.querySelector("#evidence img")
    && document.querySelector("#evidence blockquote").textContent === unsafe.sentences[0].source);
  const missingPic = { ...pictures[0], pull: null };
  pictures = [missingPic, ...pictures.slice(1)];
  render(unsafe);
  check("incomplete references hide markers without crashing", document.querySelectorAll("#profile .profile-typical").length === 0
    && document.getElementById("profile-legend").hidden && document.getElementById("comparison-note").textContent.includes("未有完整研究參照"));
  const faintRun = club(ten([], []));
  faintRun.sentences.forEach(s => { s.translated.scores.aff = .4; });
  render(faintRun);
  check("faint-only result retains exploration but no headline evidence", document.getElementById("profile").hidden
    && document.getElementById("evidence").hidden && document.getElementById("brought").hidden
    && document.querySelectorAll("#cards .label.faint").length === 10
    && [...document.querySelectorAll("#cards .sentence-counts")].every(el=>el.textContent === "未計入三類主題"));
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
  const exported = resultText(demo);
  check("download shares the screen's reading and keeps the method", exported.includes(document.getElementById("insight-lede").textContent)
    && [...document.querySelectorAll("#evidence blockquote")].every(el => exported.includes(el.textContent))
    && READING_METHOD.every((t) => exported.includes(t)) && exported.includes("技術記錄"));
  check("quotes carry only source and caption", document.querySelectorAll("#evidence figure").length === 3
    && !document.querySelector("#evidence p, #evidence h3, #story-connection"));
  check("new result closes the about note", !document.querySelector("#v-results details.about").open);
  check("consistent theme labels", Object.values(NAMES).join() === "成就,關係,影響"
    && !document.querySelector("#motive-notes").textContent.includes("勝任感"));
  check("download matches reflection and book on screen", exported.includes(document.getElementById("reflection-title").textContent)
    && exported.includes(document.getElementById("reflection-note").textContent)
    && RESULT_COPY.why.every(t=>exported.includes(t)) && RESULT_COPY.about.every(t=>exported.includes(t)));
  check("credits: Chinese title, one licence note", document.querySelector("#credits-results li").textContent.startsWith("第 1 張 · 拳手（boxer）")
    && !document.getElementById("credits-results").textContent.includes("Not individually verified")
    && document.getElementById("credits-results").textContent.includes("未逐張核實授權"));
  check("four classical result cards", document.querySelectorAll("#cards .pic-group").length === 4
    && document.querySelector("#cards .pic-group summary img").getAttribute("src") === "stimuli/c05.jpg");
  return fails;
}
