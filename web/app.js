"use strict";

const KEY = "pse-hk:draft:v1";
const SKIP_KEY = "pse-hk:skipped:v1"; // pictures skipped in any run; never drawn again
const PER_RUN = 4;
const MAX_SKIPS = 4;
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const VIEW_MS = 10_000;
const WRITE_SOFT_MS = 4 * 60_000;
const MAX_STORY_CHARS = 3000; // code points, mirrors backend/scoring.py
const MAX_SENTENCES = 120;
const REQUEST_TIMEOUT_MS = 180_000;
const LONG_WAIT_MS = 45_000;
const BREAK_MS = 5 * 60_000; // a resume after this long counts as a break, not crash recovery
const AWAY_NOTE_MS = 60_000;
const MOTIVES = ["ach", "aff", "pow"];
const NAMES = { ach: "成就", aff: "連結／親和", pow: "影響力／權力" };
const SHORT = { ach: "成就", aff: "連結", pow: "影響力" };
// Self-determination theory: achievement and power sit within competence, affiliation within relatedness.
const NEEDS = [["勝任", "competence", ["ach", "pow"]], ["關係", "relatedness", ["aff"]]];
// Thresholds on ratios to the pictures' length-adjusted norm (1 = typical). Uncalibrated, chosen to name a
// direction rather than stay neutral: the owner prefers a faint false positive to saying nothing.
const LEAN = 1.35;         // a theme's weight relative to the person's other themes, vs typical: clear lean
const TILT = 1.15;         // ...slight lean
const QUIET = 0.5;         // overall imagery per word below half the typical: stories rarely say what anyone wants
const RICH = 1.3;          // overall imagery per word well above typical
// A sentence shows a theme when the reading rates it at least this likely; the model's own cut-off is 0.5.
const FAINT = 0.3;
const TYPICAL_OF_MAX = 0.75; // a picture "usually" pulls motives within 75% of its strongest pull
// Boxer, couple by river, women in laboratory, ship captain.
// German reference pulls: aff 4.18, ach 3.42, pow 3.99. A rough share benchmark, never a score correction.
const BOOKCLUB_SET = ["c05", "c07", "c18", "c15"];
const GUIDE_VERSION = "pse-hk-guidance-v3";
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

let pool = [];     // every picture in stimuli.json
let pictures = []; // this run's four, in the order shown
let storageOK = true;
let S = fresh();
let viewTimer = null, writeTimer = null, loadTimer = null;
let composing = false;
let submitting = false;
let warmedThisLoad = false;
let lastResult = null;
let lastProtocol = null; // notes on timing and breaks for the result being shown
let lastMode = null;     // S.mode of the result being shown (S is reset once it renders)

function fresh() {
  return { v: 1, guidance: GUIDE_VERSION, mode: "bookclub", step: "intro", round: 0, phase: "view", viewLeft: VIEW_MS, writeMs: {}, awayMs: {}, breaks: 0, nudged: null, order: [], skipsLeft: MAX_SKIPS, stories: {}, savedAt: 0 };
}

const byId = (id) => pool.find((p) => p.id === id);
function usePictures() { pictures = S.order.map(byId); }

function skipped() {
  try { return JSON.parse(localStorage.getItem(SKIP_KEY)) || []; } catch { return []; }
}

function takeRandom(list) {
  return list.splice(Math.floor(Math.random() * list.length), 1)[0];
}

function draw() {
  if (S.mode === "bookclub") {
    S.order = [...BOOKCLUB_SET];
    S.skipsLeft = 0; // same pictures for everyone, so no swapping; updateSkip() hides the buttons
    S.stories = Object.fromEntries(S.order.map((id) => [id, ""]));
    return usePictures();
  }
  const gone = new Set(skipped());
  let free = pool.filter((p) => !gone.has(p.id));
  if (free.length < PER_RUN) {
    // ponytail: pool used up by old skips, so forget them rather than block the activity
    try { localStorage.removeItem(SKIP_KEY); } catch { /* storage unavailable */ }
    free = [...pool];
  }
  S.order = Array.from({ length: PER_RUN }, () => takeRandom(free).id);
  S.stories = Object.fromEntries(S.order.map((id) => [id, ""]));
  usePictures();
}

function replacements() {
  const gone = new Set([...skipped(), ...S.order]);
  return pool.filter((p) => !gone.has(p.id));
}

function skip() {
  const pid = S.order[S.round];
  const left = replacements();
  if (!S.skipsLeft || !left.length || composing) return;
  if (S.stories[pid].trim() && !confirm("換圖會刪除你為呢張圖寫嘅故事，確定？")) return;
  try { localStorage.setItem(SKIP_KEY, JSON.stringify([...skipped(), pid])); } catch { /* still skipped for this run */ }
  const next = takeRandom(left).id;
  S.order[S.round] = next;
  delete S.stories[pid]; delete S.writeMs[pid];
  S.stories[next] = "";
  S.skipsLeft -= 1;
  S.viewLeft = VIEW_MS;
  usePictures();
  startRound(S.round, "view");
}

function updateSkip() {
  const can = S.skipsLeft > 0 && replacements().length > 0;
  document.querySelectorAll(".skip").forEach((b) => {
    b.hidden = !can;
    b.textContent = `換一張（仲可以換 ${S.skipsLeft} 次）`;
  });
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
    if (!d.order) Object.assign(d, { order: ["p1", "p2", "p3", "p4"], skipsLeft: MAX_SKIPS }); // drafts from the fixed-order version
    d.awayMs ??= {}; d.breaks ??= 0; d.mode ??= "random"; // drafts from before modes were random draws
    // A draft begun under older guidance keeps that on record; it finishes under the current screens.
    if (d.guidance !== GUIDE_VERSION && !String(d.guidance).includes("-resumed-with-")) d.guidance = `${d.guidance || "legacy-guidance"}-resumed-with-v3`;
    if (d.v !== 1 || Date.now() - d.savedAt > MAX_AGE_MS || !d.order.every(byId)) {
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
  $(id).querySelector("h1, h2")?.focus({ preventScroll: true });
}

function goIntro() {
  const d = load();
  $("btn-start").hidden = !!d;
  $("btn-random").hidden = !!d;
  $("btn-resume").hidden = !d;
  $("btn-delete").hidden = !d;
  show("v-intro");
}

function resume(d) {
  S = d;
  usePictures();
  // Picking up minutes later is recovery; coming back after a break is recorded as non-standard.
  if (S.step === "round" && Date.now() - S.savedAt > BREAK_MS) S.breaks += 1;
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
  document.querySelectorAll(".round-no").forEach((e) => (e.textContent = `第 ${i + 1}／4 張`));
  document.querySelectorAll(".round-progress").forEach((e) => e.replaceChildren(
    ...Array.from({ length: PER_RUN }, (_, n) => h("span", { class: n < i ? "complete" : n === i ? "current" : "" }))));
  $("btn-next").textContent = i === PER_RUN - 1 ? "完成四個故事 →" : "下一張 →";
  updateSkip();
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
  const probe = new Image();
  probe.src = p.file;
  probe.decode().then(() => {
    if (pictures[S.round] !== p || S.phase !== "view") return; // skipped while loading
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
    else away(now - last);
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

function away(ms) {
  const pid = pictures[S.round].id;
  S.awayMs[pid] = (S.awayMs[pid] || 0) + ms;
}

function showWriting() {
  const pid = pictures[S.round].id;
  const ta = $("story");
  show("v-write");
  ta.value = S.stories[pid];
  $("time-up").hidden = true;
  $("short-note").hidden = true;
  updateWriteMeta();
  ta.focus({ preventScroll: true });
  let last = performance.now();
  clearInterval(writeTimer);
  writeTimer = setInterval(() => {
    const now = performance.now();
    if (document.visibilityState === "visible") S.writeMs[pid] = (S.writeMs[pid] || 0) + (now - last);
    else away(now - last);
    last = now;
    const left = Math.max(0, WRITE_SOFT_MS - (S.writeMs[pid] || 0));
    $("soft-timer").textContent = left ? mmss(left) : "時間到";
    if (!left) $("time-up").hidden = false; // soft: nothing is locked or submitted
  }, 500);
}

function updateWriteMeta() {
  const t = $("story").value;
  const n = cp(t);
  const cc = $("char-count");
  cc.textContent = charText(n);
  cc.className = n > MAX_STORY_CHARS ? "over" : "";
  $("btn-next").disabled = !t.trim() || n > MAX_STORY_CHARS;
  $("save-state").textContent = !t ? "" : storageOK ? "· 已暫存" : "· 未能暫存";
}

const charText = (n) => (n > MAX_STORY_CHARS ? `${n}／${MAX_STORY_CHARS} 字，請刪減` : n ? `${n} 字` : "");

function onStoryInput() {
  S.stories[pictures[S.round].id] = $("story").value;
  save();
  updateWriteMeta();
}

function next() {
  if (composing) return; // don't cut off an unfinished IME composition
  onStoryInput();
  const t = $("story").value;
  if (!t.trim()) return;
  const pid = pictures[S.round].id;
  // AMC codes sentences; one-sentence stories give it little to work with. Nudge once, never block.
  if (segment(t).length < 2 && S.nudged !== pid) {
    S.nudged = pid;
    save();
    const note = $("short-note");
    note.replaceChildren("想講多少少都得。他／她心入面諗緊咩、最後點樣，往往藏住你自己嘅影子。",
      h("small", {}, "寫完就再按一次。"));
    note.hidden = false;
    return;
  }
  clearInterval(writeTimer);
  if (S.round < 3) {
    S.viewLeft = VIEW_MS;
    startRound(S.round + 1, "view");
  } else goReview();
}

// ---------- review & submit ----------

/** Stories are final once written; only a story the checks reject (or all, if no single one is at fault) opens for editing. */
function goReview(notice = "", flagPid = null, editAll = false) {
  clearInterval(viewTimer); clearInterval(writeTimer);
  S.step = "review";
  save();
  const list = $("review-list");
  list.replaceChildren(...pictures.map((p, i) => {
    const ta = h("textarea", { id: `rv-${p.id}`, rows: "6", spellcheck: "false" });
    ta.value = S.stories[p.id];
    ta.readOnly = !(editAll || p.id === flagPid);
    const count = h("span");
    const upd = () => {
      S.stories[p.id] = ta.value;
      save();
      const n = cp(ta.value);
      count.textContent = charText(n);
      count.className = n > MAX_STORY_CHARS ? "over" : "";
    };
    ta.addEventListener("input", upd);
    ta.addEventListener("compositionstart", () => (composing = true));
    ta.addEventListener("compositionend", () => { composing = false; upd(); });
    upd();
    return h("div", { class: "review-item" + (p.id === flagPid ? " flag" : "") },
      h("label", { for: `rv-${p.id}` }, `第 ${i + 1} 個故事`), ta, ta.readOnly ? null : h("div", { class: "meta-row" }, count));
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
  if (n > MAX_SENTENCES) return [`四個故事合共超過 ${MAX_SENTENCES} 句，請精簡少少。`, null, true];
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
  if (bad) return goReview(...bad);
  if (!API) return showError("分析服務未設定。你嘅故事仍然保存喺呢個瀏覽器。", false);

  submitting = true;
  S.step = "scoring";
  const stored = save();
  show("v-loading");
  const t0 = Date.now();
  const msg = $("loading-msg");
  msg.textContent = "服務閒置時會休眠，第一次可能要等一分鐘。請保持頁面開啟。";
  $("elapsed").textContent = "0";
  let longShown = false;
  loadTimer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $("elapsed").textContent = s;
    if (!longShown && Date.now() - t0 > LONG_WAIT_MS) {
      longShown = true;
      msg.textContent = stored
        ? "比平時耐，仲處理緊。故事已經存好喺呢個瀏覽器。"
        : "比平時耐，仲處理緊。請保持頁面開啟。";
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
        lastProtocol = protocolNotes();
        lastMode = S.mode;
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
    const pid = (data && data.picture_id) || null;
    return finish(() => goReview(ERR[code] || "有啲內容處理唔到，請檢查一下。", pid, !pid));
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
  const shared = dl.filter((m) => tl.includes(m));
  if (shared.length) {
    // Same leader, one path has an extra tie: that's a partial match, not a disagreement.
    const extra = (a, b, who) => {
      const x = a.filter((m) => !b.includes(m));
      return x.length ? `${who}分析另外${joinNames(x)}都一樣多。` : "";
    };
    return [`兩種分析都顯示，呢四個故事最常出現${joinNames(shared)}主題。`, extra(dl, tl, "原文") + extra(tl, dl, "英文翻譯後")];
  }
  const describe = (ls) => (ls.length ? `最多係${joinNames(ls)}` : "冇識別到主題");
  return ["兩種分析方法嘅結果唔一致。", `原文分析${describe(dl)}；英文翻譯後分析${describe(tl)}。`];
}

// ---------- reading: English first, length-adjusted against the pictures' pull ----------

/** What participants see: the English reading (AMC was checked on translated text), else the original. */
const primary = (s) => s.translated ?? s.direct;

/** Themes the model rated at least FAINT likely but below its own cut-off. */
const faintOf = (score) => MOTIVES.filter((m) => !score.motives.includes(m) && (score.scores?.[m] ?? 0) >= FAINT);

/** Themes a sentence shows, faint ones included. */
function themesOf(s) {
  const r = primary(s);
  return new Set([...r.motives, ...faintOf(r)]);
}

function combined(sentences) {
  const c = { ach: 0, aff: 0, pow: 0 };
  for (const s of sentences) for (const m of themesOf(s)) c[m] += 1;
  return c;
}

const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;
const prob = (score, m) => score.scores?.[m] ?? (score.motives.includes(m) ? 1 : 0);

/**
 * Motive imagery per 1,000 words, the PSE's own between-sample length correction (Schultheiss & Pang, 2007).
 * You: AMC probabilities summed over sentences (the AMC authors' person-level score) per English word.
 * Typical: German expert-coded mean images per story over mean words per story, for the run's pictures.
 * Without a translation there is no comparable word count, so only the balance between themes is kept.
 */
function rates(d, pics) {
  const normed = pics.filter((p) => p.pull);
  const normWords = normed.reduce((a, p) => a + p.pull.words, 0);
  const typical = Object.fromEntries(MOTIVES.map((m) => [m, normWords ? normed.reduce((a, p) => a + p.pull[m], 0) / normWords * 1000 : 0]));
  const sum = Object.fromEntries(MOTIVES.map((m) => [m, d.sentences.reduce((a, s) => a + prob(primary(s), m), 0)]));
  const words = d.translation_failed ? 0 : d.sentences.reduce((a, s) => a + wordCount(s.english), 0);
  const total = MOTIVES.reduce((a, m) => a + sum[m], 0);
  const typTotal = MOTIVES.reduce((a, m) => a + typical[m], 0);
  const you = Object.fromEntries(MOTIVES.map((m) => [m, words ? sum[m] / words * 1000 : total ? sum[m] / total * typTotal : 0]));
  return { you, typical, sum, total, words };
}

/** quiet: little imagery at all; lean / tilt: a theme clearly / slightly outweighs the pictures' usual balance; balanced: neither. */
function reading(x) {
  const yours = MOTIVES.reduce((a, m) => a + x.you[m], 0);
  const typ = MOTIVES.reduce((a, m) => a + x.typical[m], 0);
  const overall = x.words && typ ? yours / typ : null; // needs a word count to compare amounts
  if (!yours || (overall ?? (x.total >= 1.5 ? 1 : 0)) < QUIET) return { kind: "quiet", overall, focus: [] };
  const lift = Object.fromEntries(MOTIVES.map((m) => [m, (x.you[m] / yours) / (Math.max(x.typical[m], 1e-6) / typ)]));
  const top = Math.max(...MOTIVES.map((m) => lift[m]));
  const near = (floor) => MOTIVES.filter((m) => lift[m] >= floor && top - lift[m] < 0.05);
  if (top >= LEAN) return { kind: "lean", overall, focus: near(LEAN) };
  if (top >= TILT) return { kind: "tilt", overall, focus: near(TILT) };
  return { kind: "balanced", overall, focus: MOTIVES.filter((m) => lift[m] === top) };
}

const quote = (ms) => {
  const q = ms.map((m) => `「${SHORT[m]}」`);
  return q.length > 1 ? q.slice(0, -1).join("、") + "同" + q[q.length - 1] : q[0];
};
const needOf = (m) => NEEDS.find(([, , ms]) => ms.includes(m));
/** A comparison in words; the page shows no numbers. */
const compareWord = (you, typ) => (you >= typ * 1.25 ? "多過一般" : you <= typ * 0.8 ? "少過一般" : "同一般相若");

function insightText(r) {
  const amount = r.overall == null ? "" : r.overall >= RICH ? "整體嚟講，你嘅故事寫「想要」嘅筆墨比一般人多。"
    : r.overall < 0.8 ? "整體嚟講，你寫「想要」嘅筆墨比一般人少，多啲寫畫面同經過。" : "";
  if (r.kind === "quiet") {
    return ["你嘅故事，較少寫到人物想要乜。",
      "故事多寫畫面同經過、少寫人物心入面想要乜同點收場，通常就會咁。唔代表你冇呢啲動機。"];
  }
  if (r.kind === "balanced") {
    return ["你嘅故事，貼近圖片本身。", `三種主題嘅比重，同一般人寫呢幾張圖時相近；最突出嘅係${quote(r.focus)}。${amount}`];
  }
  const verb = r.kind === "lean" ? "特別著重" : "有少少偏向";
  const more = r.kind === "lean" ? "明顯多過" : "比";
  if (r.focus.length > 1) {
    return [`你嘅故事，${verb}${quote(r.focus)}。`, `寫同一組圖，兩種主題都${r.kind === "lean" ? "明顯" : ""}多過一般人。${amount}`];
  }
  const [m] = r.focus;
  const [need, en] = needOf(m);
  return [`你嘅故事，${verb}${quote([m])}。`,
    `寫同一組圖，你筆下嘅「${SHORT[m]}」${more}一般人${r.kind === "lean" ? "" : "多少少"}；佢對應「${need}」（${en}）呢種心理需要。${amount}`];
}

function profile(x, r) {
  const max = Math.max(...MOTIVES.flatMap((m) => [x.you[m], x.typical[m]])) * 1.15 || 1;
  const at = (v) => `${Math.min(100, (v / max) * 100).toFixed(1)}%`;
  const sum = (o, ms) => ms.reduce((a, m) => a + o[m], 0);
  return NEEDS.map(([need, en, ms]) => h("div", { class: "need-group" },
    h("div", { class: "need-head" }, h("span", {}, need, " ", h("small", { lang: "en" }, en)),
      ms.length > 1 ? h("small", {}, compareWord(sum(x.you, ms), sum(x.typical, ms))) : null),
    ms.map((m) => h("div", { class: "profile-row" + (r.focus.includes(m) ? " focus" : "") },
      h("span", { class: "profile-name" }, SHORT[m]),
      h("span", { class: "profile-track", "aria-hidden": "true" },
        h("span", { class: `profile-fill ${m}-bg`, style: `width:${at(x.you[m])}` }),
        h("span", { class: "profile-typical", style: `left:${at(x.typical[m])}` })),
      h("span", { class: "profile-word" }, compareWord(x.you[m], x.typical[m]))))));
}

/** Motives a picture usually pulls, or null when it has no verified norms. */
function typicalOf(p) {
  if (!p.pull) return null;
  const max = Math.max(...MOTIVES.map((m) => p.pull[m]));
  return MOTIVES.filter((m) => p.pull[m] >= max * TYPICAL_OF_MAX);
}

/** Themes the participant wrote that the picture does not usually pull: the clearest projection cue. */
function broughtIn(p, c) {
  const typ = typicalOf(p);
  return typ ? MOTIVES.filter((m) => c[m] && !typ.includes(m)) : [];
}

function chip(m, text, extra = "") {
  return h("span", { class: `chip ${extra}` }, h("span", { class: `dot ${m}` }), text);
}

function labelList(score) {
  if (!score) return h("span", { class: "label none" }, "未有");
  const faint = faintOf(score);
  if (!score.motives.length && !faint.length) return h("span", { class: "label none" }, "冇主題");
  return [...score.motives.map((m) => h("span", { class: `label ${m}-bg` }, NAMES[m])),
    ...faint.map((m) => h("span", { class: `label faint ${m}` }, `隱約：${NAMES[m]}`))];
}

function dots(s) {
  const ms = themesOf(s);
  return ms.size ? MOTIVES.filter((m) => ms.has(m)).map((m) => h("span", { class: `dot ${m}` })) : h("span", { class: "dot none" });
}

function pictureCard(p, i, ss) {
  const c = combined(ss);
  const typ = typicalOf(p);
  const brought = broughtIn(p, c);
  const yours = MOTIVES.filter((m) => c[m]);
  return h("details", { class: "pic-group" },
    h("summary", {},
      h("img", { src: p.file, alt: "" }),
      h("span", { class: "pic-sum" },
        h("span", { class: "pic-title" }, `第 ${i + 1} 張`),
        h("span", { class: "pic-line" }, h("small", {}, "圖片一般引出"),
          typ ? typ.map((m) => chip(m, SHORT[m], "muted")) : h("span", { class: "chip muted" }, "未有參考")),
        h("span", { class: "pic-line" }, h("small", {}, "你寫咗"),
          yours.length
            ? yours.map((m) => chip(m, `${brought.includes(m) ? "✦ " : ""}${SHORT[m]}`, brought.includes(m) ? "brought" : ""))
            : h("span", { class: "chip muted" }, "冇明顯主題")))),
    h("div", { class: "pic-body" },
      ss.map((s) => h("details", { class: "card" },
        h("summary", {}, h("span", { class: "chips", "aria-hidden": "true" }, dots(s)),
          h("div", { class: "txt" }, h("span", {}, s.source))),
        h("dl", { class: "card-body" },
          s.english ? [h("dt", {}, "英文"), h("dd", { class: "en", lang: "en" }, s.english, s.uncertain ? h("span", { class: "flag-uncertain" }, "（翻譯可能唔準）") : null)] : null,
          h("dt", {}, "主題"), h("dd", {}, labelList(primary(s))))))));
}

const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** Timing of this casual adaptation; a short run is not a validated standard administration. */
function protocolNotes() {
  const times = pictures.map((p) => S.writeMs[p.id] || 0);
  const notes = pictures.map((p, i) => {
    const bits = [];
    if (times[i] > WRITE_SOFT_MS) bits.push(`寫咗 ${mmss(times[i])}，超過建議嘅 4 分鐘`);
    if ((S.awayMs[p.id] || 0) > AWAY_NOTE_MS) bits.push(`中途離開頁面約 ${Math.round(S.awayMs[p.id] / 60000)} 分鐘`);
    return bits.length ? `第 ${i + 1} 個故事：${bits.join("；")}` : null;
  }).filter(Boolean);
  if (S.breaks) notes.push(`分開 ${S.breaks + 1} 次先完成（中途停低，之後再繼續）`);
  return { times, notes, guidance: S.guidance };
}

/** Everything the results page and the download say about this run. */
function summarise(d) {
  const x = rates(d, pictures);
  const r = reading(x);
  const byPic = pictures.map((p) => d.sentences.filter((s) => s.picture_id === p.id));
  const brought = pictures.map((p, i) => [i, broughtIn(p, combined(byPic[i]))]).filter(([, ms]) => ms.length);
  return { x, r, byPic, brought, text: insightText(r) };
}

function broughtText(brought) {
  if (!brought.length) return "";
  const [i, ms] = brought[0];
  return (brought.length === 1
    ? `✦ 第 ${i + 1} 張圖一般唔會引出${quote(ms)}，你就寫咗出嚟。`
    : `✦ 你喺幾張圖都寫咗圖片一般唔會引出嘅主題，例如第 ${i + 1} 張嘅${quote(ms)}。`)
    + "由你帶入嘅主題，最接近你自己嘅投射。";
}

function renderResults(d) {
  const x = summarise(d);
  const [lead, rest] = x.text[0].split("，"); // break after the comma, never mid-phrase
  $("results-title").replaceChildren(lead + "，", h("br"), rest);
  $("insight-lede").textContent = x.text[1];
  $("profile").replaceChildren(...profile(x.x, x.r));
  $("profile-note").textContent = d.translation_failed ? "今次英文翻譯未完成，結果只作參考。" : "";
  $("profile-note").hidden = !d.translation_failed;
  $("brought").textContent = broughtText(x.brought);
  $("brought").hidden = !x.brought.length;

  // The note on the leading theme opens first; the other two stay one tap away.
  const notes = $("motive-notes");
  const order = [...x.r.focus, ...MOTIVES.filter((m) => !x.r.focus.includes(m))];
  notes.replaceChildren(...order.map((m) => notes.querySelector(`[data-motive="${m}"]`)));

  $("cards").replaceChildren(...pictures.map((p, i) => pictureCard(p, i, x.byPic[i])));

  $("bookclub-note").hidden = lastMode !== "bookclub";
  $("bookclub-note").querySelector("p").textContent =
    (pictures.map((p) => p.id).join() === BOOKCLUB_SET.join()
      ? "大家寫嘅係同一組圖。"
      : "今次沿用舊草稿嘅圖片，同新開始嘅讀書會組合可能唔同。")
    + "揀一句令你有感覺嘅故事帶去就夠；分唔分享，由你決定。";

  credits($("credits-results"));
  document.querySelectorAll("#v-results details").forEach((detail) => { detail.open = false; });
  if (x.r.focus.length) notes.firstElementChild.open = true;
  show("v-results");
}

function download() {
  if (!lastResult) return;
  const d = lastResult;
  const x = summarise(d);
  const lines = ["畫中有你 · 故事同結果", new Date().toLocaleString("zh-HK"), "", ...x.text, ""];
  for (const [need, en, ms] of NEEDS) {
    lines.push(`${need}（${en}）：` + ms.map((m) => `${SHORT[m]}${compareWord(x.x.you[m], x.x.typical[m])}`).join("，"));
  }
  lines.push("");
  if (x.brought.length) lines.push(broughtText(x.brought), "");
  const themes = (y) => {
    if (!y) return "未有";
    const all = [...y.motives.map((m) => NAMES[m]), ...faintOf(y).map((m) => `隱約${NAMES[m]}`)];
    return all.length ? all.join("、") : "冇主題";
  };
  pictures.forEach((p, i) => {
    lines.push(`— 第 ${i + 1} 個故事 —`);
    for (const s of x.byPic[i]) lines.push(s.source, ...(s.english ? [`  EN: ${s.english}`] : []), `  主題：${themes(primary(s))}`);
    lines.push("");
  });
  lines.push("—— 畫外，返到你自己 ——",
    "自我決定論：勝任（competence）、關係（relatedness）、自主（autonomy）。圖畫故事係一個粗略指標，反映你對頭兩種需要有幾敏感。",
    "1. 勝任：最近有冇一件事，你好想做得更好，或者想有多啲影響？",
    "2. 關係：你而家最想同邊個更親近？",
    "3. 自主：呢啲「想要」，係你自己揀嘅，定係為咗別人嘅期望？",
    "McAdams · The Art and Science of Personality Development (2015), Chapter 6: The Motivational Agenda", "",
    "—— 技術記錄（研究用）——",
    "閱讀：以英文翻譯為主（AMC 喺翻譯文本上有驗證；廣東話未有），翻譯失敗先用原文。",
    "計分：每種主題將 AMC 每句機率加總（AMC 作者嘅個人計分方法），再除以英文字數 ×1000（Schultheiss & Pang 2007 嘅每千字密度）。",
    "參照：Schönbrodt et al. 德文專家編碼（Winter 1994，逐句），同一組圖每個故事平均主題次數 ÷ 平均字數 ×1000。德文同英文字數唔完全對等，只係粗略參照。",
    `英文字數：${x.x.words || "（未有）"}；整體相對一般：${x.r.overall == null ? "（未能比較）" : x.r.overall.toFixed(2)}；判讀：${x.r.kind}`,
    ...MOTIVES.map((m) => `${NAMES[m]}：你 ${x.x.you[m].toFixed(1)} ／ 一般 ${x.x.typical[m].toFixed(1)}（每千字）；機率總和 ${x.x.sum[m].toFixed(2)}`),
    "逐句標籤（原文 ｜ 英文）：",
    ...d.sentences.map((s) => `  ${s.id}：${themes(s.direct)} ｜ ${themes(s.translated)}`),
    "兩種讀法：" + headline(d).filter(Boolean).join(" "),
    d.summary.agreement ? `兩種分析一致：${d.summary.agreement.same} ／ ${d.summary.agreement.total} 句（同一模型，一致唔代表準確）` : "今次冇翻譯，所以冇比較。",
    `圖片：${lastMode === "bookclub" ? "讀書會固定一組" : "隨機抽出"}；順序：${pictures.map((p) => `${p.id} (${p.pse_id})`).join(" → ")}`,
    `寫作指引：${lastProtocol?.guidance || "未記錄"}；四張圖、10 秒觀看、約 4 分鐘寫作，屬讀書會改編版。`);
  if (lastProtocol) {
    lines.push("寫作時間：" + lastProtocol.times.map(mmss).join("、"));
    lines.push(...(lastProtocol.notes.length ? ["時間同中斷：", ...lastProtocol.notes.map((y) => "  " + y)] : ["冇記錄到超時或較長中斷；唔代表已達到研究標準。"]));
  }
  lines.push("圖片 pull（每個故事平均主題次數；字數；故事數目）：", ...pictures.map((p) => `  ${p.id} (${p.pse_id})：${pullText(p)}`),
    "來源：Schönbrodt et al. (2020/2021), https://osf.io/pqckn/ · picture_pull_norm_table.xlsx",
    `模型：${d.meta.amc_model} @ ${String(d.meta.amc_revision).slice(0, 7)} · 翻譯：${d.meta.translator}（prompt ${d.meta.prompt_version}）`, "",
    "實驗性自動編碼，唔係性格測驗。");
  const a = h("a", { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })), download: "pse-hk-result.txt" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- wiring ----------

function pullText(p) {
  if (!p.pull) return "未有核實對應常模；唔代表零。";
  return MOTIVES.map((m) => `${NAMES[m]} ${p.pull[m].toFixed(2)}`).join(" ／ ")
    + `；${p.pull.words} 字；${p.pull.n_stories} 個故事`;
}

function credits(ul) {
  ul.replaceChildren(...pictures.map((p, i) => h("li", {},
    `第 ${i + 1} 張（${p.pse_id}）：${p.title}。${p.author}。`,
    h("a", { href: p.source_url, target: "_blank", rel: "noopener" }, "來源"), "；",
    p.license_url ? h("a", { href: p.license_url, target: "_blank", rel: "noopener" }, p.license) : p.license,
    p.modified ? "；已縮細及壓縮。" : "")));
  ul.append(h("li", {}, "圖片選自 Schönbrodt et al. (2020/2021) PSE 圖片資料庫 (osf.io/pqckn)。"));
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
  const start = (mode) => { S = fresh(); S.mode = mode; draw(); startRound(0); };
  $("btn-start").addEventListener("click", () => start("bookclub"));
  $("btn-random").addEventListener("click", () => start("random"));
  $("btn-again-random").addEventListener("click", () => { lastResult = null; lastProtocol = null; start("random"); });
  document.querySelectorAll(".skip").forEach((b) => b.addEventListener("click", skip));
  $("btn-resume").addEventListener("click", () => { const d = load(); d ? resume(d) : goIntro(); });
  $("btn-delete").addEventListener("click", () => { S = load() || fresh(); confirmDelete(); });
  $("btn-delete-2").addEventListener("click", confirmDelete);
  $("btn-img-retry").addEventListener("click", showPicture);
  $("btn-submit").addEventListener("click", submit);
  $("btn-retry").addEventListener("click", submit);
  $("btn-back-review").addEventListener("click", () => goReview());
  $("btn-download").addEventListener("click", download);
  $("btn-restart").addEventListener("click", () => { lastResult = null; lastProtocol = null; S = fresh(); goIntro(); });

  try {
    const probe = "pse-hk:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
  } catch {
    storageOK = false;
    $("storage-notice").hidden = false;
  }

  try {
    pool = (await (await fetch("stimuli.json")).json()).pictures;
  } catch {
    $("app").prepend(h("p", { class: "notice", role: "alert" }, "頁面載入唔完整，請重新整理。"));
    return;
  }
  goIntro();
}

init();
