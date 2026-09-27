"use strict";

const KEY = "pse-hk:draft:v1";
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const VIEW_MS = 10_000;
const WRITE_SOFT_MS = 4 * 60_000;
const MAX_STORY_CHARS = 3000; // code points, mirrors backend/scoring.py
const MAX_SENTENCES = 120;
const REQUEST_TIMEOUT_MS = 180_000;
const LONG_WAIT_MS = 45_000;
const MOTIVES = ["ach", "aff", "pow"];
const NAMES = { ach: "成就", aff: "親和／親密", pow: "權力" };
const API = (() => {
  const m = document.querySelector('meta[name="pse-api"]').content.trim();
  if (m) return m.replace(/\/$/, "");
  return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://127.0.0.1:8000" : "";
})();

const $ = (id) => document.getElementById(id);
const cp = (s) => [...s].length; // Unicode code points

/** Safe element builder: string children become text nodes, never HTML. */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k instanceof Node ? k : String(k));
  return el;
}

// Mirrors scoring.segment (for the sentence-count limit only).
function segment(text) {
  const out = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    for (const m of line.match(/.*?(?:[.!?。！？…]+["'”’」』）)\]]*|$)/g) || []) {
      const s = m.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

// ---------- state & drafts ----------

let pictures = [];
let storageOK = true;
let S = fresh();
let viewTimer = null, writeTimer = null, loadTimer = null;
let composing = false;
let submitting = false;
let warmedThisLoad = false;
let lastResult = null;

function fresh() {
  return { v: 1, step: "intro", round: 0, phase: "view", viewLeft: VIEW_MS, writeMs: {}, stories: { p1: "", p2: "", p3: "", p4: "" }, savedAt: 0 };
}

function save() {
  S.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    storageOK = true;
  } catch {
    storageOK = false;
  }
  $("storage-notice").hidden = storageOK;
  return storageOK;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.v !== 1 || Date.now() - d.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY); // cleanup happens on reopen only
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

const hasWriting = () => Object.values(S.stories).some((t) => t.trim());

// ---------- views ----------

function show(id) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== id));
  window.scrollTo(0, 0);
}

function goIntro() {
  const d = load();
  $("btn-start").hidden = !!d;
  $("btn-resume").hidden = !d;
  $("btn-delete").hidden = !d;
  show("v-intro");
}

function resume(d) {
  S = d;
  if (S.step === "round") startRound(S.round, S.phase);
  else if (S.step === "review" || S.step === "scoring") {
    const interrupted = S.step === "scoring";
    goReview(interrupted ? "上次分析未完成。你嘅故事仍然喺度，準備好可以再提交。" : "");
  } else goIntro();
}

// ---------- rounds ----------

function startRound(i, phase = "view") {
  clearInterval(viewTimer); clearInterval(writeTimer);
  S.step = "round"; S.round = i; S.phase = phase;
  if (phase === "view" && S.viewLeft <= 0) S.viewLeft = VIEW_MS;
  save();
  document.querySelectorAll(".round-no").forEach((e) => (e.textContent = `第 ${i + 1} ／ 4 張`));
  if (i === 3) warm();
  phase === "view" ? showPicture() : showWriting();
}

function warm() {
  // One best-effort wake-up per page load, only at the last picture. Never blocks writing.
  if (warmedThisLoad || !API) return;
  warmedThisLoad = true;
  fetch(API + "/warm", { mode: "cors" }).catch(() => {});
}

function showPicture() {
  const p = pictures[S.round];
  const img = $("stim-img");
  show("v-view");
  $("img-error").hidden = true;
  $("img-loading").hidden = false;
  img.removeAttribute("src");
  img.alt = "";
  $("countdown-bar").style.transform = "scaleX(1)";
  $("credit-line").textContent = `圖片：${p.author} · ${p.license.split(" (")[0]}`;
  const probe = new Image();
  probe.src = p.file;
  probe.decode().then(() => {
    img.src = p.file;
    img.alt = `第 ${S.round + 1} 張圖`;
    $("img-loading").hidden = true;
    runViewCountdown();
  }).catch(() => {
    $("img-loading").hidden = true;
    $("img-error").hidden = false;
  });
}

function runViewCountdown() {
  let last = performance.now();
  clearInterval(viewTimer);
  viewTimer = setInterval(() => {
    const now = performance.now();
    // Only count time while the page is visible (e.g. not while switched to WhatsApp).
    if (document.visibilityState === "visible") S.viewLeft -= now - last;
    last = now;
    $("countdown-bar").style.transform = `scaleX(${Math.max(0, S.viewLeft / VIEW_MS)})`;
    if (S.viewLeft <= 0) {
      clearInterval(viewTimer);
      S.phase = "write";
      save();
      showWriting();
    }
  }, 100);
}

function showWriting() {
  const pid = pictures[S.round].id;
  const ta = $("story");
  show("v-write");
  ta.value = S.stories[pid];
  $("time-up").hidden = true;
  updateWriteMeta();
  ta.focus({ preventScroll: true });
  let last = performance.now();
  clearInterval(writeTimer);
  writeTimer = setInterval(() => {
    const now = performance.now();
    if (document.visibilityState === "visible") S.writeMs[pid] = (S.writeMs[pid] || 0) + (now - last);
    last = now;
    const left = Math.max(0, WRITE_SOFT_MS - (S.writeMs[pid] || 0));
    $("soft-timer").textContent = left ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}` : "";
    if (!left) $("time-up").hidden = false; // soft: nothing is locked or submitted
  }, 500);
}

function updateWriteMeta() {
  const t = $("story").value;
  const n = cp(t);
  const cc = $("char-count");
  cc.textContent = `${n} ／ ${MAX_STORY_CHARS} 字`;
  cc.className = n > MAX_STORY_CHARS ? "over" : "";
  $("btn-next").disabled = !t.trim() || n > MAX_STORY_CHARS;
  $("save-state").textContent = !t ? "" : storageOK ? "已暫存喺呢個瀏覽器" : "未能暫存（重新載入會失去）";
}

function onStoryInput() {
  S.stories[pictures[S.round].id] = $("story").value;
  save();
  updateWriteMeta();
}

function next() {
  if (composing) return; // don't cut off an unfinished IME composition
  onStoryInput();
  if (!$("story").value.trim()) return;
  clearInterval(writeTimer);
  if (S.round < 3) {
    S.viewLeft = VIEW_MS;
    startRound(S.round + 1, "view");
  } else goReview();
}

// ---------- review & submit ----------

function goReview(notice = "", flagPid = null) {
  clearInterval(viewTimer); clearInterval(writeTimer);
  S.step = "review";
  save();
  const list = $("review-list");
  list.replaceChildren(...pictures.map((p, i) => {
    const ta = h("textarea", { id: `rv-${p.id}`, rows: "6", spellcheck: "false" });
    ta.value = S.stories[p.id];
    const count = h("span");
    const upd = () => {
      S.stories[p.id] = ta.value;
      save();
      const n = cp(ta.value);
      count.textContent = `${n} ／ ${MAX_STORY_CHARS} 字`;
      count.className = n > MAX_STORY_CHARS ? "over" : "";
    };
    ta.addEventListener("input", upd);
    ta.addEventListener("compositionstart", () => (composing = true));
    ta.addEventListener("compositionend", () => { composing = false; upd(); });
    upd();
    return h("div", { class: "review-item" + (p.id === flagPid ? " flag" : "") },
      h("label", { for: `rv-${p.id}` }, `第 ${i + 1} 個故事`), ta, h("div", { class: "meta-row" }, count));
  }));
  $("review-notice").textContent = notice;
  $("review-notice").hidden = !notice;
  show("v-review");
  if (flagPid) $(`rv-${flagPid}`).focus();
}

function localCheck() {
  for (const [i, p] of pictures.entries()) {
    const t = S.stories[p.id];
    if (!t.trim()) return [`第 ${i + 1} 個故事係空白嘅。`, p.id];
    if (cp(t) > MAX_STORY_CHARS) return [`第 ${i + 1} 個故事超過 ${MAX_STORY_CHARS} 字，請刪減。`, p.id];
  }
  const n = pictures.reduce((a, p) => a + segment(S.stories[p.id]).length, 0);
  if (n > MAX_SENTENCES) return [`四個故事合共超過 ${MAX_SENTENCES} 句，請精簡少少。`, null];
  return null;
}

const ERR = {
  sentence_too_long: "有一句太長，模型處理唔到。請喺標記咗嘅故事入面加啲句號或者換行。",
  story_too_long: `有個故事超過 ${MAX_STORY_CHARS} 字，請刪減。`,
  too_many_sentences: `四個故事合共超過 ${MAX_SENTENCES} 句，請精簡少少。`,
  empty_story: "有個故事係空白嘅。",
  body_too_large: "內容太長，請刪減少少。",
};

async function submit() {
  if (submitting || composing) return;
  const bad = localCheck();
  if (bad) return goReview(bad[0], bad[1]);
  if (!API) return showError("分析服務未設定。你嘅故事仍然保存喺呢個瀏覽器。", false);

  submitting = true;
  S.step = "scoring";
  const stored = save();
  show("v-loading");
  const t0 = Date.now();
  const msg = $("loading-msg");
  msg.textContent = "正在準備分析你嘅故事。呢個小工具閒置時會休眠，今次可能需要等耐少少。請暫時保持頁面開啟。";
  $("elapsed").textContent = "0";
  let longShown = false;
  loadTimer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $("elapsed").textContent = s;
    if (!longShown && Date.now() - t0 > LONG_WAIT_MS) {
      longShown = true;
      msg.textContent = stored
        ? "今次需要嘅時間比平時長。你嘅故事仍然保存喺呢個瀏覽器。"
        : "今次需要嘅時間比平時長。請保持頁面開啟。";
    }
  }, 1000);

  const ctrl = new AbortController();
  const abort = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const body = JSON.stringify({ stories: pictures.map((p) => ({ picture_id: p.id, text: S.stories[p.id] })) });
  let res, data;
  try {
    res = await fetch(API + "/score", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctrl.signal });
    data = await res.json().catch(() => null);
  } catch (e) {
    return finish(() => showError(e.name === "AbortError"
      ? "分析時間太耐，暫時停咗。你嘅故事仍然保存喺呢度，可以稍後再試。"
      : "暫時連接唔到分析服務。你嘅故事仍然保存喺呢度，可以稍後再試。"));
  } finally {
    clearTimeout(abort);
  }

  if (res.ok) {
    return finish(() => {
      try {
        validateResult(data);
        renderResults(data);
      } catch {
        return showError("收到嘅結果唔完整，未能顯示。你嘅故事仍然保存喺呢度。");
      }
      lastResult = data;
      clearDraft(); // only after a validated result has rendered
      S = fresh();
    });
  }
  const code = data && data.code;
  if (res.status === 429) {
    const wait = Math.min(60, parseInt(res.headers.get("Retry-After"), 10) || 20);
    return finish(() => showError("而家有其他人正在分析，請稍等一陣再試。", true, wait));
  }
  if (res.status === 400 || res.status === 413) {
    return finish(() => goReview(ERR[code] || "有啲內容處理唔到，請檢查一下。", data && data.picture_id));
  }
  return finish(() => showError("分析服務暫時未能使用。你嘅故事仍然保存喺呢個瀏覽器，可以稍後再試。"));
}

function finish(fn) {
  clearInterval(loadTimer);
  submitting = false;
  if (S.step === "scoring") { S.step = "review"; save(); }
  fn();
}

function showError(text, canRetry = true, cooldown = 8) {
  $("error-msg").textContent = text;
  const btn = $("btn-retry");
  btn.hidden = !canRetry;
  btn.disabled = true;
  let left = cooldown;
  btn.textContent = `再試一次（${left}）`;
  const t = setInterval(() => {
    left -= 1;
    btn.textContent = left > 0 ? `再試一次（${left}）` : "再試一次";
    if (left <= 0) { clearInterval(t); btn.disabled = false; }
  }, 1000);
  show("v-error");
}

// ---------- results ----------

function isCounts(c) {
  return c && MOTIVES.every((m) => Number.isInteger(c[m]) && c[m] >= 0);
}
function isScore(x) {
  return x && Array.isArray(x.motives) && x.motives.every((m) => MOTIVES.includes(m));
}

function validateResult(d) {
  const ok = d && Array.isArray(d.sentences) && d.sentences.length && typeof d.translation_failed === "boolean" &&
    d.summary && isCounts(d.summary.direct) && d.meta &&
    d.sentences.every((s) => typeof s.id === "string" && typeof s.source === "string" &&
      pictures.some((p) => p.id === s.picture_id) && isScore(s.direct) &&
      (d.translation_failed
        ? s.english === null && s.translated === null
        : typeof s.english === "string" && typeof s.uncertain === "boolean" && isScore(s.translated)));
  const tr = d && d.summary && (d.translation_failed
    ? d.summary.translated === null && d.summary.agreement === null
    : isCounts(d.summary.translated) && Number.isInteger(d.summary.agreement?.same) && Number.isInteger(d.summary.agreement?.total));
  if (!ok || !tr) throw new Error("invalid result");
}

function leaders(c) {
  const max = Math.max(...MOTIVES.map((m) => c[m]));
  return max ? MOTIVES.filter((m) => c[m] === max) : [];
}
const joinNames = (ms) => {
  const q = ms.map((m) => `「${NAMES[m]}」`);
  return q.length > 1 ? q.slice(0, -1).join("、") + "同" + q[q.length - 1] : q[0];
};

function headline(d) {
  const dl = leaders(d.summary.direct);
  if (d.translation_failed) {
    return [dl.length
      ? `原文分析：呢四個故事最常出現${joinNames(dl)}主題${dl.length > 1 ? "（數量一樣）" : ""}。`
      : "原文分析：模型喺呢啲故事入面冇識別到呢三種主題。",
    "今次翻譯步驟未能完成，所以只顯示原文分析。" + (dl.length ? "" : "呢個唔代表你冇呢啲動機。")];
  }
  const tl = leaders(d.summary.translated);
  if (!dl.length && !tl.length) return ["模型喺呢啲故事入面冇識別到呢三種主題。", "呢個唔代表你冇呢啲動機，只係呢個模型喺呢幾個故事搵唔到明顯嘅例子。"];
  if (dl.join() === tl.join()) {
    return [`兩種分析都顯示，呢四個故事最常出現${joinNames(dl)}主題${dl.length > 1 ? "（數量一樣）" : ""}。`, ""];
  }
  const describe = (ls) => (ls.length ? `最多係${joinNames(ls)}` : "冇識別到主題");
  return ["兩種分析方法嘅結果唔一致。", `原文分析${describe(dl)}；英文翻譯後分析${describe(tl)}。`];
}

function barsGroup(title, counts, max) {
  if (!counts) {
    return h("div", { class: "bars-group" }, h("h4", {}, title), h("p", { class: "bars-missing" }, "翻譯未能完成，今次冇呢部分。"));
  }
  return h("div", { class: "bars-group" }, h("h4", {}, title),
    MOTIVES.map((m) => {
      const fill = h("div", { class: `bar-fill ${m}-bg`, style: `width:${max ? (counts[m] / max) * 100 : 0}%` });
      return h("div", { class: "bar-row" }, h("span", {}, NAMES[m]), h("div", { class: "bar-track" }, fill), h("span", { class: "n" }, counts[m]));
    }));
}

function labelList(score) {
  if (!score) return h("span", { class: "label none" }, "未有");
  if (!score.motives.length) return h("span", { class: "label none" }, "冇主題");
  return score.motives.map((m) => h("span", { class: `label ${m}-bg` }, NAMES[m]));
}

function dots(s) {
  const ms = new Set([...s.direct.motives, ...(s.translated ? s.translated.motives : [])]);
  return ms.size ? MOTIVES.filter((m) => ms.has(m)).map((m) => h("span", { class: `dot ${m}` })) : h("span", { class: "dot none" });
}

function renderResults(d) {
  const [head, note] = headline(d);
  const n = d.sentences.length;
  $("headline").textContent = head;
  $("headline-note").textContent = [note, n < 8 ? `今次只有 ${n} 句，可以分析嘅材料有限，結果只可以當作參考。` : ""].filter(Boolean).join(" ");

  const all = [d.summary.direct, d.summary.translated].filter(Boolean);
  const max = Math.max(1, ...all.flatMap((c) => MOTIVES.map((m) => c[m])));
  $("bars").replaceChildren(barsGroup("原文分析", d.summary.direct, max), barsGroup("英文翻譯後分析", d.summary.translated, max));

  const ag = d.summary.agreement;
  $("agreement").replaceChildren(ag
    ? h("p", {}, "兩種分析喺 ", h("strong", {}, `${ag.same} ／ ${ag.total}`), " 句得出相同主題。")
    : h("p", {}, "今次冇翻譯，所以冇比較。"),
  h("p", { class: "fine" }, "兩條路線用嘅係同一個模型，一致唔代表準確。"));

  $("cards").replaceChildren(...pictures.map((p, i) => {
    const ss = d.sentences.filter((s) => s.picture_id === p.id);
    return h("div", { class: "pic-group" },
      h("div", { class: "pic-head" }, h("img", { src: p.file, alt: "" }), h("span", {}, `第 ${i + 1} 個故事`)),
      ss.map((s) => h("details", { class: "card" },
        h("summary", {}, h("span", { class: "chips" }, dots(s)), h("span", { class: "txt" }, s.source)),
        h("dl", { class: "card-body" },
          h("dt", {}, "原文"), h("dd", {}, s.source),
          h("dt", {}, "英文翻譯"), h("dd", {}, s.english ?? "（未有翻譯）",
            s.uncertain ? h("div", { class: "flag-uncertain" }, "⚑ 翻譯可能有歧義") : null),
          h("dt", {}, "原文分析"), h("dd", {}, labelList(s.direct)),
          h("dt", {}, "英文翻譯後分析"), h("dd", {}, labelList(s.translated))))));
  }));

  const chars = d.summary.total_chars ? Object.values(d.summary.total_chars).reduce((a, b) => a + b, 0) : null;
  $("stats").textContent = [chars != null ? `總字數：${chars}` : "", `句子：${n}`, d.summary.english_words != null ? `英文翻譯字數：${d.summary.english_words}` : ""].filter(Boolean).join(" · ");
  $("model-meta").textContent = `模型：${d.meta.amc_model} @ ${String(d.meta.amc_revision).slice(0, 7)} · 翻譯：${d.meta.translator}（prompt ${d.meta.prompt_version}）`;
  show("v-results");
}

function download() {
  if (!lastResult) return;
  const d = lastResult;
  const lines = ["圖畫故事 · 實驗性分析結果", new Date().toLocaleString("zh-HK"), "",
    headline(d).filter(Boolean).join(" "), "",
    "原文分析：" + MOTIVES.map((m) => `${NAMES[m]} ${d.summary.direct[m]}`).join("，"),
    "英文翻譯後分析：" + (d.summary.translated ? MOTIVES.map((m) => `${NAMES[m]} ${d.summary.translated[m]}`).join("，") : "未有"), ""];
  pictures.forEach((p, i) => {
    lines.push(`— 第 ${i + 1} 個故事 —`);
    for (const s of d.sentences.filter((x) => x.picture_id === p.id)) {
      const fmt = (x) => (x ? (x.motives.length ? x.motives.map((m) => NAMES[m]).join("、") : "冇主題") : "未有");
      lines.push(s.source, `  EN: ${s.english ?? "（未有翻譯）"}${s.uncertain ? " ⚑" : ""}`, `  原文：${fmt(s.direct)}｜翻譯後：${fmt(s.translated)}`);
    }
    lines.push("");
  });
  lines.push("實驗性自動編碼，未經驗證適用於廣東話，唔係性格測驗。");
  const a = h("a", { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })), download: "pse-hk-result.txt" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- wiring ----------

function credits(ul) {
  ul.replaceChildren(...pictures.map((p, i) => h("li", {},
    `第 ${i + 1} 張（${p.pse_id}）：${p.title}。${p.author}。`,
    h("a", { href: p.source_url, target: "_blank", rel: "noopener" }, "來源"), "；",
    h("a", { href: p.license_url, target: "_blank", rel: "noopener" }, p.license), p.modified ? "；已縮細及壓縮。" : "")));
  ul.append(h("li", {}, "圖片選自 Schönbrodt et al. (2019) PSE 圖片資料庫 (osf.io/pqckn)。"));
}

function confirmDelete() {
  if (hasWriting() && !confirm("確定刪除草稿？你寫低嘅故事會消失。")) return;
  clearDraft();
  S = fresh();
  goIntro();
}

async function init() {
  const ta = $("story");
  ta.addEventListener("input", onStoryInput);
  ta.addEventListener("compositionstart", () => (composing = true));
  ta.addEventListener("compositionend", () => { composing = false; onStoryInput(); });
  $("btn-next").addEventListener("click", next);
  $("btn-start").addEventListener("click", () => { S = fresh(); startRound(0); });
  $("btn-resume").addEventListener("click", () => { const d = load(); d ? resume(d) : goIntro(); });
  $("btn-delete").addEventListener("click", () => { S = load() || fresh(); confirmDelete(); });
  $("btn-delete-2").addEventListener("click", confirmDelete);
  $("btn-img-retry").addEventListener("click", showPicture);
  $("btn-submit").addEventListener("click", submit);
  $("btn-retry").addEventListener("click", submit);
  $("btn-back-review").addEventListener("click", () => goReview());
  $("btn-download").addEventListener("click", download);
  $("btn-restart").addEventListener("click", () => { lastResult = null; S = fresh(); goIntro(); });

  try {
    const probe = "pse-hk:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
  } catch {
    storageOK = false;
    $("storage-notice").hidden = false;
  }

  try {
    pictures = (await (await fetch("stimuli.json")).json()).pictures;
  } catch {
    $("app").prepend(h("p", { class: "notice", role: "alert" }, "頁面載入唔完整，請重新整理。"));
    return;
  }
  credits($("credits-intro"));
  credits($("credits-results"));
  goIntro();
}

init();
