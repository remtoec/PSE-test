"use strict";

const KEY = "pse-hk:draft:v1";
const SKIP_KEY = "pse-hk:skipped:v1"; // pictures skipped in any run; not drawn again until the pool runs out
const SEEN_KEY = "pse-hk:seen:v1";    // random-mode pictures already drawn; avoided until all have been seen
const PLAYED_KEY = "pse-hk:played:v1"; // set after a result, so the intro suggests new pictures next time
// Random mode draws only pictures whose German reference rests on at least this many stories;
// smaller samples (down to 3 stories) make the reference line and picture emphasis noise.
const MIN_NORM_STORIES = 30;
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
// One name per theme, on the page and in the download.
const NAMES = { ach: "成就", aff: "關係", pow: "影響" };
// Shared by the page and download. These explain categories, never invent a plot interpretation.
const MOTIVE_COPY = {
  ach: {
    title: "我想做得更好。",
    heading: "想把事情做好。",
    lede: "想把事情做好、達到心中的標準，是這幾個故事裏反覆出現的追求。看看人物為了做到自己滿意，付出了甚麼。",
    body: "練好一首曲、解開一道難題、把工作做到自己滿意。成就的吸引力，在於有一個值得挑戰的標準，想看看自己能走到哪一步。",
    prompt: "對人物來說，怎樣才算「做得好」？那個標準又是誰定的？",
    reflection: "最近有甚麼事，你也很想把它做好？",
    note: "想想那件事對你有甚麼意義。故事中的人物，跟你有相似的地方嗎？",
  },
  aff: {
    title: "我想和你親近。",
    heading: "在意彼此的關係。",
    lede: "想親近、維繫一段關係，是這幾個故事裏反覆出現的追求。看看人物為了彼此，作了甚麼選擇。",
    body: "想加入一班朋友，也想有一個能說心事的人。有時是一通等了很久的電話，有時是吵架後，仍想找對方吃頓飯。",
    prompt: "人物想要的，是大家接納自己，還是有人真正明白自己？",
    reflection: "最近，你最想和誰好好說說話？",
    note: "想想你希望那次談話帶來甚麼。故事裏的人物，有沒有讓你想起一段關係？",
  },
  pow: {
    title: "我想有話事權。",
    heading: "想左右事情的發展。",
    lede: "想讓自己的話有分量、能影響別人，是這幾個故事裏反覆出現的追求。看看人物如何爭取影響力，又把它用在甚麼地方。",
    body: "希望自己的話有分量，能影響別人的決定、改變事情的走向。書中談的「權力動機」，可以是替人出頭，也可以是要別人聽自己的。",
    prompt: "人物爭取到話事權之後，會拿來做甚麼？",
    reflection: "最近有哪件事，你很想自己話事？",
    note: "想想如果真的由你決定，你會怎樣做。故事裏的人物，又把影響力用在了甚麼地方？",
  },
};
const RESULT_COPY = {
  why: [
    "心理學家 Murray 曾提出一個疑問：我們真的清楚，自己最想要甚麼嗎？他請人看圖編故事，嘗試從人物的願望和遭遇，了解講故事的人所關心的事。",
    "McAdams 在書中沿着這條線索，帶我們看人的另一面：除了平日怎樣待人處事，我們還有想得到的東西、想完成的事。這些追求，讓人朝某個方向走下去。",
  ],
  origins: [
    "後來，McClelland 和同事把故事中的動機主題整理成研究方法，也追問家庭、學校和社會怎樣影響我們重視的事。他甚至研究兒童讀物：孩子讀着怎樣的故事長大，會學到甚麼才值得追求？",
    "今次的看圖寫故事，就借用了這個思路。至於我們自己學會了追求甚麼，留待讀書會一起談。",
  ],
  source: "改寫自 Dan P. McAdams《The Art and Science of Personality Development》第六章的相關內容。",
  closing: "人生走到不同階段，想追求的事也會變。這次先看看，此刻甚麼最牽動你。",
  about: [
    "這個讀書會練習借用圖畫故事練習（PSE）的思路，把故事翻譯成英文，再用自動分析整理成就、關係和影響主題。解讀針對今次的四個故事；這套自動分析尚未經驗證適用於廣東話，可能有誤讀，值得對照原文看看。",
    "「關係」在這裏包括想被接納、維繫關係等內容。書中另有談親密動機；今次的分析沒有把它獨立量度。",
  ],
};
// Book-based reading lenses selected from actual flags. They describe possible
// stakes of a pursuit; they do not infer a character's plot or the writer's traits.
const INTERPRETATION_COPY = {
  ach: {
    title: "做好一件事，也在回答「我能做到甚麼」。",
    body: "從成就這條線讀，事情的難度、付出的功夫、最後是否進步，都有了分量。達到一個標準，可以讓人肯定自己；但若標準愈推愈高，也可能一直覺得還未夠好。",
    question: "回到這段故事：人物想跨過的是自己的限制，還是別人定下的標準？",
  },
  aff: {
    title: "有人願意靠近，事情才有了不同的意義。",
    body: "從關係這條線讀，一次回應、一份接納，都可以改變人物眼前的處境。靠近別人可以帶來支持；但維繫關係時，也可能要面對自己的需要和對方期望之間的距離。",
    question: "回到這段故事：怎樣的相處，才算是人物真正想要的親近？",
  },
  pow: {
    title: "想有影響，也是在爭取一個由自己決定的位置。",
    body: "從影響這條線讀，可以留意誰能作主、誰的話有人聽。影響力可以讓人保護別人、推動改變，也可以用來要求別人服從；願望的分別，在於人物怎樣使用它。",
    question: "回到這段故事：人物想改變甚麼，又希望別人怎樣看自己？",
  },
};
const CONNECTION_COPY = {
  "ach,aff": "做好事情和維繫關係，可以互相支持：有人同行，可能更有勇氣迎接挑戰。但若兩者不能兼得，人物願意為哪一邊讓步？這是重讀時值得留意的選擇。",
  "ach,pow": "把事情做好，和讓自己的話有分量，有時會走在一起。值得分辨的是：人物在意事情本身做得怎樣，還是在意誰能決定、誰得到認同？兩者會把故事帶往不同方向。",
  "aff,pow": "靠近別人和影響別人，有時只隔着一個決定。替對方着想，可能是支持，也可能變成替對方作主。可以留意故事有沒有讓彼此保留選擇的空間。",
};
const MIN_THEMES = 3;      // label floor; assessReading also checks distinct sentences and pictures
const LEAN = 0.12;         // share above the pictures' typical share that counts as a clear lean
const TILT = 0.05;         // ...and as a slight one
// Exploratory labels only. Model scores are not calibrated Cantonese probabilities.
const FAINT = 0.3;
// Overall imagery per 1,000 words relative to the reference, put into words; uncalibrated description rules.
const RICH = 1.3;
const POOR = 0.7;
const TYPICAL_OF_MAX = 0.75; // a picture "usually" pulls motives within 75% of its strongest pull
// Boxer, couple by river, women in laboratory, ship captain.
// German reference pulls: aff 4.18, ach 3.42, pow 3.99. A rough share benchmark, never a score correction.
const BOOKCLUB_SET = ["c05", "c07", "c18", "c15"];
const GUIDE_VERSION = "pse-hk-guidance-v5";
const READING_VERSION = "pse-hk-reading-v5";
// Shared verbatim by the screen and download to keep method claims in sync.
const READING_METHOD = [
  "分析以英文翻譯為主：AMC 曾在翻譯成英文的研究故事上測試，廣東話則未有驗證；翻譯失敗時才用原文。主題只計模型正式標記，每句每種主題最多一次。未有正式標記、模型分值達 0.30 的，會在句子詳情標示「隱約」，不計入主題比例、重點句或 ✦。分值並非經核實的正確機率。",
  "研究參照來自 Schönbrodt 等人的德國專家編碼故事（Winter 系統，逐句編碼）。長條和參照線均換算成每千字的主題數：今次標記次數 ÷ 英文字數，對比同組圖片平均次數總和 ÷ 平均字數總和。這是 Schultheiss & Pang（2007）建議用於跨樣本比較的長度調整；德文和英文字數並不完全對等，只能粗略對照，並非本地常模、百分位或個人分數。缺少任何一張圖的參照，便不作整組比較。",
  "突出主題按主題之間的比重判定：高出參照 5 個百分點為輕微偏向，12 點為較大差距。較大差距還須在至少三個故事出現，且逐個抽走故事、按餘下圖片重計參照後，仍是主要差距之一並高出至少 5 點，才用較強措辭。每次抽走後仍須有三句、兩個故事的材料。翻譯未完成時只用暫定措辭。這些是展示規則，並非統計顯著性或經驗證的心理界線。",
  "分析詳情的密集／疏落描述，按每千字主題數與參照的比值判定：至少 1.3 為較密集，低於 0.7 為較疏落。長條的較密集／相若／較疏落分界為參照的 1.25／0.8 倍。這些規則不判斷一個人的動機強弱。",
  "圖片參照中，平均次數達該圖最高主題的 75% 便列為主要方向。✦ 表示今次標記落在其他方向，不表示罕見或證明個人投射。故事也並非自傳。",
];
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

const readList = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const skipped = () => readList(SKIP_KEY);
function remember(key, ids) {
  try { localStorage.setItem(key, JSON.stringify([...new Set([...readList(key), ...ids])])); } catch { /* storage unavailable */ }
}
function forget(key) {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}
function played() {
  try { return !!localStorage.getItem(PLAYED_KEY); } catch { return false; }
}

/** Random mode: pictures with a solid research reference, never the classic set, so a replay means new pictures. */
const randomPool = () => pool.filter((p) => p.pull && p.pull.n_stories >= MIN_NORM_STORIES && !BOOKCLUB_SET.includes(p.id));

/** Unseen, unskipped pictures; forgets what was seen, then what was skipped, rather than block the activity. */
function candidates(exclude = [], need = 1) {
  const pick = (...keys) => {
    const gone = new Set([...exclude, ...keys.flatMap(readList)]);
    return randomPool().filter((p) => !gone.has(p.id));
  };
  let free = pick(SKIP_KEY, SEEN_KEY);
  if (free.length < need) { forget(SEEN_KEY); free = pick(SKIP_KEY); }
  if (free.length < need) { forget(SKIP_KEY); free = pick(); }
  return free;
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
  const free = candidates([], PER_RUN);
  S.order = Array.from({ length: PER_RUN }, () => takeRandom(free).id);
  remember(SEEN_KEY, S.order);
  S.stories = Object.fromEntries(S.order.map((id) => [id, ""]));
  usePictures();
}

function skip() {
  const pid = S.order[S.round];
  if (!S.skipsLeft || composing) return;
  if (S.stories[pid].trim() && !confirm("換圖會刪除這張圖已寫下的故事，確定換圖？")) return;
  remember(SKIP_KEY, [pid]);
  const left = candidates(S.order);
  if (!left.length) return;
  const next = takeRandom(left).id;
  remember(SEEN_KEY, [next]);
  S.order[S.round] = next;
  delete S.stories[pid]; delete S.writeMs[pid];
  S.stories[next] = "";
  S.skipsLeft -= 1;
  S.viewLeft = VIEW_MS;
  usePictures();
  startRound(S.round, "view");
}

function updateSkip() {
  // candidates() can always refill by forgetting, so any other eligible picture means a swap is possible.
  const can = S.skipsLeft > 0 && randomPool().some((p) => !S.order.includes(p.id));
  document.querySelectorAll(".skip").forEach((b) => {
    b.hidden = !can;
    b.textContent = `換一張（還可換 ${S.skipsLeft} 次）`;
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
    if (d.guidance !== GUIDE_VERSION && !String(d.guidance).endsWith("-resumed-with-v5")) d.guidance = `${d.guidance || "legacy-guidance"}-resumed-with-v5`;
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
  $("choices").hidden = !!d;
  $("resume-actions").hidden = !d;
  setChoices(played());
  show("v-intro");
}

/** First visit: the classic set leads. After a result: new pictures lead, the classic set stays one tap away. */
function setChoices(returning) {
  const classic = $("btn-start"), fresher = $("btn-random");
  classic.className = returning ? "choice" : "choice primary";
  fresher.className = returning ? "choice primary" : "choice";
  const [ct, cn] = returning ? ["再寫一次讀書會這組圖", "同一組圖，看看今次會寫出甚麼。"]
    : ["開始寫故事 →", "讀書會用這組圖，約 20 分鐘。"];
  const [ft, fn] = returning ? ["換四張新圖再寫", "隨機抽另一組，也可以中途換圖。"]
    : ["寫過了？換四張新圖", "隨機抽另一組，也可以中途換圖。"];
  classic.querySelector(".choice-title").textContent = ct;
  classic.querySelector(".choice-note").textContent = cn;
  fresher.querySelector(".choice-title").textContent = ft;
  fresher.querySelector(".choice-note").textContent = fn;
  $("choices").replaceChildren(...(returning ? [fresher, classic] : [classic, fresher]));
}

function resume(d) {
  S = d;
  usePictures();
  // Picking up minutes later is recovery; coming back after a break is recorded as non-standard.
  if (S.step === "round" && Date.now() - S.savedAt > BREAK_MS) S.breaks += 1;
  if (S.step === "round") startRound(S.round, S.phase);
  else if (S.step === "review" || S.step === "scoring") {
    const interrupted = S.step === "scoring";
    goReview(interrupted ? "上次分析未完成。故事已保留，可以再次提交。" : "");
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
    note.replaceChildren("想再加兩句嗎？例如人物在想甚麼，或故事怎樣結束。",
      h("small", {}, "也可以直接繼續，再按一次按鈕便可。"));
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
    if (!t.trim()) return [`第 ${i + 1} 個故事還未有內容。`, p.id];
    if (cp(t) > MAX_STORY_CHARS) return [`第 ${i + 1} 個故事超過 ${MAX_STORY_CHARS} 字，請刪減。`, p.id];
  }
  const n = pictures.reduce((a, p) => a + segment(S.stories[p.id]).length, 0);
  if (n > MAX_SENTENCES) return [`四個故事合共超過 ${MAX_SENTENCES} 句，請刪減一些。`, null, true];
  return null;
}

const ERR = {
  sentence_too_long: "有一句太長，未能處理。請在標示的故事中加上句號或分段。",
  story_too_long: `有一個故事超過 ${MAX_STORY_CHARS} 字，請刪減。`,
  too_many_sentences: `四個故事合共超過 ${MAX_SENTENCES} 句，請刪減一些。`,
  empty_story: "有一個故事還未有內容。",
  body_too_large: "內容太長，請刪減少少。",
};

async function submit() {
  if (submitting || composing) return;
  const bad = localCheck();
  if (bad) return goReview(...bad);
  if (!API) return showError("分析服務未設定。請先保留頁面，或複製故事備份。", false);

  submitting = true;
  S.step = "scoring";
  const stored = save();
  show("v-loading");
  const t0 = Date.now();
  const msg = $("loading-msg");
  msg.textContent = "可能需要一分鐘，請先保持頁面開啟。";
  $("elapsed").textContent = "0";
  let longShown = false;
  loadTimer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $("elapsed").textContent = s;
    if (!longShown && Date.now() - t0 > LONG_WAIT_MS) {
      longShown = true;
      msg.textContent = stored
        ? "比預期久一些，仍在處理。故事已暫存在這個瀏覽器。"
        : "比預期久一些，仍在處理。請先保持頁面開啟。";
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
      ? "分析逾時，請稍後再試。你可以返回故事，內容仍在這一頁。"
      : "暫時未能連接分析服務，請稍後再試。你可以返回故事，內容仍在這一頁。"));
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
        return showError("收到的結果不完整，未能顯示。你可以返回故事，內容仍在這一頁。");
      }
      lastResult = data;
      try { localStorage.setItem(PLAYED_KEY, "1"); } catch { /* storage unavailable */ }
      clearDraft(); // only after a validated result has rendered
      S = fresh();
    });
  }
  const code = data && data.code;
  if (res.status === 429) {
    const wait = Math.min(60, parseInt(res.headers.get("Retry-After"), 10) || 20);
    return finish(() => showError("目前有其他人正在分析故事，請稍候再試。", true, wait));
  }
  if (res.status === 400 || res.status === 413) {
    const pid = (data && data.picture_id) || null;
    return finish(() => goReview(ERR[code] || "有些內容未能處理，請檢查標示的故事。", pid, !pid));
  }
  return finish(() => showError("分析服務暫時未能使用，請稍後再試。你可以返回故事，內容仍在這一頁。"));
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
const quote = (ms) => {
  const q = ms.map((m) => `「${NAMES[m]}」`);
  return q.length > 1 ? q.slice(0, -1).join("、") + "和" + q[q.length - 1] : q[0];
};

function headline(d) {
  const dl = leaders(d.summary.direct);
  if (d.translation_failed) {
    return [dl.length
      ? `原文分析：這四個故事最常標到${quote(dl)}主題${dl.length > 1 ? "（數量一樣）" : ""}。`
      : "原文分析未標到三類主題。",
    "英文翻譯未完成，只能比較原文的標記。"];
  }
  const tl = leaders(d.summary.translated);
  if (!dl.length && !tl.length) return ["兩種分析均未標到三類主題。", "可以對照原文，看看是否有遺漏的線索。"];
  if (dl.join() === tl.join()) {
    return [`兩種分析都顯示，這四個故事最常標到${quote(dl)}主題${dl.length > 1 ? "（數量一樣）" : ""}。`, ""];
  }
  const shared = dl.filter((m) => tl.includes(m));
  if (shared.length) {
    // Same leader, one path has an extra tie: that's a partial match, not a disagreement.
    const extra = (a, b, who) => {
      const x = a.filter((m) => !b.includes(m));
      return x.length ? `${who}分析另外標到同樣多的${quote(x)}主題。` : "";
    };
    return [`兩種分析都顯示，這四個故事最常標到${quote(shared)}主題。`, extra(dl, tl, "原文") + extra(tl, dl, "英文翻譯後")];
  }
  const describe = (ls) => (ls.length ? `最多標到${quote(ls)}` : "未標到三類主題");
  return ["兩種分析的主要方向不同。", `原文分析${describe(dl)}；英文翻譯後分析${describe(tl)}。`];
}

// ---------- reading: combined themes against the pictures' pull ----------

/** Exploratory scores not flagged by this reading; excluded from the main profile. */
const faintOf = (score) => MOTIVES.filter((m) => !score.motives.includes(m) && (score.scores?.[m] ?? 0) >= FAINT);

/** The reading participants see and the profile counts: English (AMC was tested on translated text), else the original. */
const primary = (s) => s.translated ?? s.direct;

/** Main profile: the primary reading's model flags, each theme at most once per sentence. */
function themesOf(s) {
  return new Set(primary(s).motives);
}

function combined(sentences) {
  const c = { ach: 0, aff: 0, pow: 0 };
  for (const s of sentences) for (const m of themesOf(s)) c[m] += 1;
  return c;
}

/** Ratio of summed picture means, not the mean of individual participants' shares. */
function typicalShares(pics) {
  if (!pics.length || pics.some((p) => !p.pull || MOTIVES.some((m) => !Number.isFinite(p.pull[m]) || p.pull[m] < 0))) return null;
  const sum = Object.fromEntries(MOTIVES.map((m) => [m, pics.reduce((a, p) => a + (p.pull ? p.pull[m] : 0), 0)]));
  const total = MOTIVES.reduce((a, m) => a + sum[m], 0);
  return total ? Object.fromEntries(MOTIVES.map((m) => [m, sum[m] / total])) : null;
}

const wordCount = (text) => String(text ?? "").split(/\s+/).filter(Boolean).length;

/**
 * Imagery per 1,000 words, the PSE's between-sample length correction (Schultheiss & Pang, 2007).
 * Reference: summed German expert picture means over summed mean words per story. Null when any picture lacks norms.
 */
function referenceRates(pics) {
  if (!typicalShares(pics) || pics.some((p) => !(p.pull.words > 0))) return null;
  const words = pics.reduce((a, p) => a + p.pull.words, 0);
  return Object.fromEntries(MOTIVES.map((m) => [m, pics.reduce((a, p) => a + p.pull[m], 0) / words * 1000]));
}

/** Your flagged sentences per 1,000 English words; null without a translation to count words in. */
function yourRates(c, words) {
  return words ? Object.fromEntries(MOTIVES.map((m) => [m, c[m] / words * 1000])) : null;
}

/** sparse: too few themes to read a profile; lean / tilt: a theme clearly / slightly above what the pictures pull; balanced: neither. */
function reading(c, typical) {
  const total = MOTIVES.reduce((a, m) => a + c[m], 0);
  const share = Object.fromEntries(MOTIVES.map((m) => [m, total ? c[m] / total : 0]));
  if (total < MIN_THEMES) return { kind: "sparse", total, share, focus: leaders(c) };
  if (!typical) return { kind: "unbenchmarked", total, share, focus: leaders(c) };
  const lift = Object.fromEntries(MOTIVES.map((m) => [m, share[m] - typical[m]]));
  const top = Math.max(...MOTIVES.map((m) => lift[m]));
  const near = (floor) => MOTIVES.filter((m) => lift[m] >= floor && top - lift[m] < 0.02);
  if (top >= LEAN) return { kind: "lean", total, share, focus: near(LEAN) };
  if (top >= TILT) return { kind: "tilt", total, share, focus: near(TILT) };
  return { kind: "balanced", total, share, focus: leaders(c) };
}

/** Descriptive robustness gates, not significance tests or validated trait thresholds. */
function assessReading(sentences, pics, failed = false) {
  const flagged = sentences.filter((s) => themesOf(s).size);
  const r = reading(combined(sentences), typicalShares(pics));
  r.support = Object.fromEntries(MOTIVES.map((m) => [m,
    new Set(flagged.filter((s) => themesOf(s).has(m)).map((s) => s.picture_id)).size]));
  r.sentenceCount = flagged.length;
  if (flagged.length < 3 || new Set(flagged.map((s) => s.picture_id)).size < 2) {
    r.kind = "sparse";
  } else if (r.kind === "lean") {
    const stable = !failed && r.focus.every((m) => r.support[m] >= 3 && pics.every((omit) => {
      const rest = sentences.filter((s) => s.picture_id !== omit.id);
      const remainingFlags = rest.filter((s) => themesOf(s).size);
      if (remainingFlags.length < 3 || new Set(remainingFlags.map((s) => s.picture_id)).size < 2) return false;
      const remainingTypical = typicalShares(pics.filter((p) => p.id !== omit.id));
      const reduced = reading(combined(rest), remainingTypical);
      return remainingTypical && reduced.focus.includes(m)
        && reduced.share[m] - remainingTypical[m] >= TILT;
    }));
    if (!stable) r.kind = "tentative";
  }
  return r;
}

const pct = (x) => `${Math.round(x * 100)}%`;

/** Narrative wording follows the existing evidence gates; density belongs in details. */
function insightText(r) {
  if (r.kind === "sparse") return ["故事寫好了，先挑一句慢慢看。",
    "今次找到的線索，還未能整理出四個故事的整體方向。可以重看自己的故事，從最在意的一句開始。"];
  const detected = MOTIVES.filter((m) => r.share[m] > 0);
  if (r.kind === "balanced") return detected.length > 1
    ? ["故事裏，有幾種不同的追求。", `故事裏寫到了${quote(detected)}。先看看，哪一個人物的選擇最令你在意。`]
    : ["從這個方向，再讀一次故事。", `這次標到的主題是${quote(detected)}。可以從人物想做到的事看起。`];
  if (r.kind === "unbenchmarked") return ["從故事裏，看看人物的追求。",
    `這次較多標到${quote(r.focus)}。先看看下面的原句，你會怎樣理解人物的選擇？`];
  if (r.kind === "tilt" || r.kind === "tentative") return ["故事裏，出現了一些線索。",
    `這次找到一些${quote(r.focus)}的線索，但材料還不足以說它貫穿了四個故事。先從下面的句子看起。`];
  if (r.focus.length > 1) return ["故事裏，有幾種不同的追求。",
    `${quote(r.focus)}在這幾個故事裏反覆出現。看看人物如何在不同的追求之間作選擇。`];
  const copy = MOTIVE_COPY[r.focus[0]];
  return [`你筆下的人物，${copy.heading}`, copy.lede];
}

function reflectionText(r) {
  if (r.kind === "sparse") return ["重看自己的故事，哪一句讓你停了一下？", "先想想那一句吸引你的地方。你也可以帶着自己的讀法來讀書會。"];
  if (r.kind === "lean" && r.focus.length === 1) {
    const copy = MOTIVE_COPY[r.focus[0]];
    return [copy.reflection, copy.note];
  }
  return ["哪一個人物的願望，最令你在意？", "可以是你認同的，也可以是你不明白的。先想想，為甚麼是這個人物。"];
}

function comparisonText(x) {
  if (!x.typical) return "這組圖片未有完整研究參照，以下只整理今次故事中標到的主題。";
  if (x.r.kind === "sparse") return "今次可用的線索較少，暫不比較整體比重。";
  const relation = x.r.kind === "balanced" ? "各主題的比重接近同組圖片的研究參照。"
    : `與同組圖片的研究參照相比，${quote(x.r.focus)}所佔比重較高。`;
  const amount = x.overall == null ? ""
    : x.overall >= RICH ? "按故事長短調整後，這些主題出現得較密集。"
    : x.overall < POOR ? "按故事長短調整後，這些主題出現得較疏落。" : "";
  return relation + amount;
}

function resultNotice(failed) {
  return failed ? "英文翻譯未完成，以下只按原文整理，可能漏掉部分線索。" : "";
}

function clubText() {
  const same = pictures.map((p) => p.id).join() === BOOKCLUB_SET.join();
  return (same ? "大家寫的是同一組圖。" : "這次沿用舊草稿的圖片，可能與讀書會的新組合不同。")
    + "從自己的故事裏，挑一句你最在意的話。到時一起看看，大家替人物寫下了怎樣的願望。想分享多少，由你決定。";
}

/** A comparison in words; the page shows no numbers. */
const compareWord = (you, ref, density = true) => (you >= ref * 1.25 ? (density ? "較密集" : "比重較高")
  : you <= ref * 0.8 ? (density ? "較疏落" : "比重較低") : "相若");

function profileExplanation(x) {
  if (x.r.kind === "sparse") return "可以展開四個故事，逐句看原文和標記。";
  if (!x.typical) return "長條只表示三類主題在今次標記中所佔的比重。";
  const measure = x.youRates && x.refRates ? "長條按故事長短調整，表示主題出現的密度。"
    : "今次未有完整譯文，長條只比較三類主題所佔的比重，未作字數調整。";
  return measure + "參照來自德文研究故事，與今次的自動分析只能作粗略對照。";
}

/** Bars against reference lines, per 1,000 words when both sides have a length; theme shares otherwise. No numbers. */
function profile(r, x) {
  const rated = x.youRates && x.refRates;
  const you = rated ? x.youRates : r.share;
  const ref = rated ? x.refRates : x.typical;
  const max = Math.max(...MOTIVES.flatMap((m) => [you[m], ref ? ref[m] : 0])) * 1.15 || 1;
  const at = (v) => `${Math.min(100, (v / max) * 100).toFixed(1)}%`;
  return MOTIVES.map((m) => h("div", { class: "profile-row" + (r.focus.includes(m) ? " focus" : "") },
    h("span", { class: "profile-name" }, NAMES[m]),
    h("span", { class: "profile-track", "aria-hidden": "true" },
      h("span", { class: `profile-fill ${m}-bg`, style: `width:${at(you[m])}` }),
      ref ? h("span", { class: "profile-typical", style: `left:${at(ref[m])}` }) : null),
    h("span", { class: "profile-word" }, ref ? compareWord(you[m], ref[m], !!rated) : r.share[m] > 0 ? "已標到" : "未標到")));
}

/** Motives a picture usually pulls, or null when it has no verified norms. */
function typicalOf(p) {
  if (!p.pull) return null;
  const max = Math.max(...MOTIVES.map((m) => p.pull[m]));
  return MOTIVES.filter((m) => p.pull[m] >= max * TYPICAL_OF_MAX);
}

/** Flagged themes outside the picture's leading reference means; not a rarity test. */
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
  if (!score.motives.length && !faint.length) return h("span", { class: "label none" }, "這句未標出三類主題");
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
        h("span", { class: "pic-line" }, h("small", {}, "研究中的方向"),
          typ ? typ.map((m) => chip(m, NAMES[m], "muted")) : h("span", { class: "chip muted" }, "未有研究參照"),
          typ && p.pull.n_stories < 30 ? h("small", {}, "（樣本少）") : null),
        h("span", { class: "pic-line" }, h("small", {}, "今次寫到"),
          yours.length
            ? yours.map((m) => chip(m, `${brought.includes(m) ? "✦ " : ""}${NAMES[m]}`, brought.includes(m) ? "brought" : ""))
            : h("span", { class: "chip muted" }, "未標到三類主題")))),
    h("div", { class: "pic-body" },
      ss.map((s) => h("details", { class: "card" },
        h("summary", {}, h("span", { class: "chips", "aria-hidden": "true" }, dots(s)),
          h("div", { class: "txt" }, h("span", {}, s.source))),
        h("dl", { class: "card-body" },
          s.english ? [h("dt", {}, "英文"), h("dd", { class: "en", lang: "en" }, s.english,
            s.uncertain ? h("span", { class: "flag-uncertain" }, "（翻譯可能有誤）") : null)] : null,
          h("dt", {}, "主題"), h("dd", {}, labelList(primary(s))))))));
}

const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** Timing of this casual adaptation; a short run is not a validated standard administration. */
function protocolNotes() {
  const times = pictures.map((p) => S.writeMs[p.id] || 0);
  const notes = pictures.map((p, i) => {
    const bits = [];
    if (times[i] > WRITE_SOFT_MS) bits.push(`寫了 ${mmss(times[i])}，超過建議的 4 分鐘`);
    if ((S.awayMs[p.id] || 0) > AWAY_NOTE_MS) bits.push(`中途離開頁面約 ${Math.round(S.awayMs[p.id] / 60000)} 分鐘`);
    return bits.length ? `第 ${i + 1} 個故事：${bits.join("；")}` : null;
  }).filter(Boolean);
  if (S.breaks) notes.push(`分開 ${S.breaks + 1} 次完成（中途暫停後繼續）`);
  return { times, notes, guidance: S.guidance };
}

const storyLocations = (numbers) => `第 ${numbers.join("、")} 個故事`;

/** Keep thematic interpretation distinct from quotations and plot-level claims. */
function interpretStories(sentences, pics, r) {
  if (r.kind === "sparse") return { interpretations: [], connection: null };
  const present = MOTIVES.filter((m) => r.support[m] > 0);
  const focused = r.kind === "balanced" ? [] : r.focus;
  const order = [...focused, ...present.filter((m) => !focused.includes(m))];
  const interpretations = order.map((motive) => {
    const numbers = pics.flatMap((p, i) => sentences.some((s) => s.picture_id === p.id && themesOf(s).has(motive)) ? [i + 1] : []);
    const excerpts = numbers.slice(0, present.length === 1 ? 2 : 1).map((picture) => ({
      motive, picture, stories: numbers.length,
      source: sentences.find((s) => s.picture_id === pics[picture - 1].id && themesOf(s).has(motive)).source,
    }));
    return { motive, pictures: numbers, location: `${storyLocations(numbers)}出現了「${NAMES[motive]}」的線索。`,
      ...INTERPRETATION_COPY[motive], excerpts };
  });
  if (present.length < 2) return { interpretations, connection: null };
  const pairs = present.flatMap((a, i) => present.slice(i + 1).map((b) => ({
    motives: [a, b], pictures: pics.flatMap((p, n) => {
      const themes = new Set(sentences.filter((s) => s.picture_id === p.id).flatMap((s) => [...themesOf(s)]));
      return themes.has(a) && themes.has(b) ? [n + 1] : [];
    }),
  }))).sort((a, b) => b.pictures.length - a.pictures.length);
  const shared = pairs[0];
  const connection = shared.pictures.length ? {
    kind: "shared-story", pictures: shared.pictures, title: "當兩種追求走進同一個故事",
    location: `${storyLocations(shared.pictures)}同時有${quote(shared.motives)}的線索；它們可能屬於同一人物，也可能分別落在不同人物身上。`,
    body: CONNECTION_COPY[shared.motives.join(",")],
  } : {
    kind: "across-stories", pictures: [], title: "換一個故事，也換一種在意",
    location: `${quote(present)}的線索，分別出現在不同故事。`,
    body: present.length === 3
      ? "把故事放在一起看，滿足可以來自做好一件事、與人親近，或讓自己的決定產生影響。可以比較幾個結局：你讓哪一種願望實現了，又把哪一種願望留了下來？"
      : CONNECTION_COPY[present.join(",")],
  };
  return { interpretations, connection };
}

/** Everything the results page and the download say about this run. */
function summarise(d) {
  const c = combined(d.sentences);
  const typical = typicalShares(pictures);
  const r = assessReading(d.sentences, pictures, d.translation_failed);
  const words = d.translation_failed ? 0 : d.sentences.reduce((a, s) => a + wordCount(s.english), 0);
  const refRates = referenceRates(pictures);
  const youRates = yourRates(c, words);
  const total = (o) => MOTIVES.reduce((a, m) => a + o[m], 0);
  const overall = youRates && refRates && total(refRates) ? total(youRates) / total(refRates) : null;
  const byPic = pictures.map((p) => d.sentences.filter((s) => s.picture_id === p.id));
  const brought = pictures.map((p, i) => [i, broughtIn(p, combined(byPic[i]))]).filter(([, ms]) => ms.length);
  const { interpretations, connection } = interpretStories(d.sentences, pictures, r);
  const evidence = interpretations.flatMap((item) => item.excerpts);
  return { c, typical, r, byPic, brought, evidence, interpretations, connection, words, refRates, youRates, overall,
    text: insightText(r), reflection: reflectionText(r) };
}

function broughtText(brought) {
  if (!brought.length) return "";
  const [i, ms] = brought[0];
  return `✦ 第 ${i + 1} 個故事寫到了${quote(ms)}，這與該圖研究參照的主要方向不同。可以回到原句，看看你替人物作了怎樣的安排。`;
}

const evidenceLead = (e) => `第 ${e.picture} 個故事 · ${NAMES[e.motive]}`;

function renderResults(d) {
  const x = summarise(d);
  const { r } = x;
  // Wrap naturally on phones; punctuation is content, not a brittle layout delimiter.
  $("results-title").textContent = x.text[0];
  $("insight-lede").textContent = x.text[1];
  $("profile-note").textContent = resultNotice(d.translation_failed);
  $("profile-note").hidden = !d.translation_failed;
  const sparse = r.kind === "sparse";
  $("profile").replaceChildren(...(sparse ? [] : profile(r, x)));
  $("profile").hidden = sparse;
  $("profile-legend").hidden = sparse || !x.typical;
  $("comparison-note").textContent = comparisonText(x);
  $("profile-explanation").textContent = profileExplanation(x);
  $("evidence").replaceChildren(...x.interpretations.map((item) => h("article", { class: "theme-reading" },
    h("p", { class: "fine reading-location" }, item.location), h("h3", {}, item.title),
    h("p", {}, item.body),
    ...item.excerpts.map((e) => h("figure", {}, h("figcaption", { class: "fine" }, evidenceLead(e)), h("blockquote", {}, e.source))),
    h("p", { class: "theme-question" }, item.question))));
  $("evidence").hidden = !x.evidence.length;
  $("evidence-empty").hidden = !!x.evidence.length;
  $("story-connection").replaceChildren(...(x.connection ? [h("h3", {}, x.connection.title),
    h("p", { class: "fine" }, x.connection.location), h("p", {}, x.connection.body)] : []));
  $("story-connection").hidden = !x.connection;
  $("brought").textContent = broughtText(x.brought);
  $("brought").hidden = !x.brought.length;

  const focused = sparse || r.kind === "balanced" ? [] : r.focus;
  const order = [...focused, ...MOTIVES.filter((m) => !focused.includes(m))];
  $("motive-notes").replaceChildren(...order.map((m) => {
    const copy = MOTIVE_COPY[m];
    const note = h("details", { class: "motive-note", "data-motive": m },
      h("summary", {}, h("span", { class: `dot ${m}`, "aria-hidden": "true" }), h("b", {}, NAMES[m]), h("span", {}, `「${copy.title}」`)),
      h("p", {}, copy.body), h("p", { class: "theme-question" }, copy.prompt));
    return note;
  }));
  const paragraphs = (id, texts) => $(id).replaceChildren(...texts.map((t) => h("p", {}, t)));
  paragraphs("why-body", RESULT_COPY.why);
  paragraphs("origins-body", RESULT_COPY.origins);
  paragraphs("about-body", RESULT_COPY.about);
  $("book-source").textContent = RESULT_COPY.source;
  $("reflection-title").textContent = x.reflection[0];
  $("reflection-note").textContent = x.reflection[1];
  $("closing-note").textContent = RESULT_COPY.closing;
  $("cards").replaceChildren(...pictures.map((p, i) => pictureCard(p, i, x.byPic[i])));
  $("bookclub-note").hidden = lastMode !== "bookclub";
  $("bookclub-note").querySelector("p").textContent = clubText();
  credits($("credits-results"));
  document.querySelectorAll("#v-results details").forEach((detail) => { detail.open = false; });
  // Sparse results offer the participant's own words immediately, without invented quotations.
  $("stories-detail").open = sparse;
  if (sparse) $("cards").firstElementChild.open = true;
  else if (focused.length) $("motive-notes").firstElementChild.open = true;
  show("v-results");
}

function resultText(d) {
  const x = summarise(d);
  const fmtCounts = (c) => MOTIVES.map((m) => `${NAMES[m]} ${c[m]}`).join("，");
  const lines = ["畫中有你 · 故事和解讀", new Date().toLocaleString("zh-HK"), "", ...x.text,
    ...(d.translation_failed ? [resultNotice(true)] : []), ""];
  if (x.evidence.length) {
    lines.push("—— 從你寫下的句子看起 ——");
    for (const item of x.interpretations) {
      lines.push(item.location, item.title, item.body);
      for (const e of item.excerpts) lines.push(evidenceLead(e), e.source);
      lines.push(item.question, "");
    }
    if (x.connection) lines.push(x.connection.title, x.connection.location, x.connection.body, "");
  }
  lines.push("—— 分析詳情 ——", comparisonText(x), profileExplanation(x));
  if (x.r.kind !== "sparse" && x.typical) {
    const rated = x.youRates && x.refRates;
    const you = rated ? x.youRates : x.r.share, ref = rated ? x.refRates : x.typical;
    lines.push(...MOTIVES.map((m) => `${NAMES[m]}：${compareWord(you[m], ref[m], !!rated)}`));
  }
  if (x.brought.length) lines.push(broughtText(x.brought));
  lines.push("");
  lines.push("—— 書中的三種追求 ——");
  const focus = x.r.kind === "sparse" || x.r.kind === "balanced" ? [] : x.r.focus;
  for (const m of [...focus, ...MOTIVES.filter((m) => !focus.includes(m))]) {
    const copy = MOTIVE_COPY[m];
    lines.push(`${NAMES[m]} · 「${copy.title}」`, copy.body, copy.prompt, "");
  }
  lines.push("—— 為甚麼請你寫故事？——", ...RESULT_COPY.why,
    "", "這些追求，又從哪裏來？", ...RESULT_COPY.origins, RESULT_COPY.source, "",
    "—— 把問題留給自己 ——", ...x.reflection, "");
  lines.push("—— 四個故事 ——");
  pictures.forEach((p, i) => {
    const typ = typicalOf(p);
    lines.push(`— 第 ${i + 1} 個故事 —`, `研究中的主要方向：${typ ? typ.map((m) => NAMES[m]).join("、") : "未有參照"}`);
    for (const s of x.byPic[i]) {
      const scored = primary(s);
      const labels = [...scored.motives.map((m) => NAMES[m]), ...faintOf(scored).map((m) => `隱約${NAMES[m]}`)];
      lines.push(s.source, ...(s.english ? [`  EN: ${s.english}${s.uncertain ? "（翻譯可能有誤）" : ""}`] : []),
        `  主題：${labels.length ? labels.join("、") : "這句未標出三類主題"}`);
    }
    lines.push("");
  });
  if (lastMode === "bookclub") lines.push("帶一句話來，讀書會見。", clubText(), "");
  lines.push(RESULT_COPY.closing);
  lines.push("", "—— 關於這份解讀 ——", ...RESULT_COPY.about, "",
    "—— 技術記錄（研究用）——",
    ...READING_METHOD,
    `英文字數：${x.words || "（未有）"}；整體每千字主題數相對參照：${x.overall == null ? "（未能比較）" : x.overall.toFixed(2)}；判讀：${x.r.kind}`,
    ...MOTIVES.map((m) => `${NAMES[m]}：${x.c[m]} 句；比重 ${pct(x.r.share[m])} ／ 參照 ${x.typical ? pct(x.typical[m]) : "未有完整參照"}；每千字 ${x.youRates ? x.youRates[m].toFixed(1) : "未有"} ／ 參照 ${x.refRates ? x.refRates[m].toFixed(1) : "未有完整參照"}`),
    "逐句標籤（故事.句：原文 ｜ 英文）：",
    ...x.byPic.flatMap((ss, i) => ss.map((s, k) => `  ${i + 1}.${k + 1}：${s.direct.motives.join("、") || "未標到"} ｜ ${s.translated ? s.translated.motives.join("、") || "未標到" : "未有"}`)),
    "原文分析：" + fmtCounts(d.summary.direct),
    "英文翻譯後分析：" + (d.summary.translated ? fmtCounts(d.summary.translated) : "翻譯未能完成，未有譯文分析。"),
    "兩種讀法：" + headline(d).filter(Boolean).join(" "),
    d.summary.agreement ? `兩種分析一致：${d.summary.agreement.same} ／ ${d.summary.agreement.total} 句（使用同一模型，一致程度並非準確度）` : "今次未有譯文，未能比較兩種分析。", "",
    `圖片：${lastMode === "bookclub" ? "讀書會固定一組" : "隨機抽出"}`,
    `實際圖片順序：${pictures.map((p) => `${p.id} (${p.pse_id})`).join(" → ")}`,
    `寫作指引：${lastProtocol?.guidance || "未記錄"}`,
    `解讀規則：${READING_VERSION}`,
    "四張圖、10 秒觀看、約 4 分鐘寫作；容許提早完成或超時，屬讀書會改編版。");
  if (lastProtocol) {
    lines.push("寫作時間：" + lastProtocol.times.map(mmss).join("、"));
    lines.push(...(lastProtocol.notes.length ? ["時間和中斷：", ...lastProtocol.notes.map((y) => "  " + y)] : ["未記錄到超時或較長中斷。活動仍屬讀書會改編版。"]));
  }
  lines.push("圖片 pull：德文故事專家編碼，每個故事平均主題次數；平均字數；故事數目。",
    "來源：Schönbrodt et al. (2020/2021), https://osf.io/pqckn/ · picture_pull_norm_table.xlsx");
  pictures.forEach((p) => lines.push(`${p.id} (${p.pse_id})：${pullText(p)}`));
  lines.push(`模型：${d.meta.amc_model} @ ${String(d.meta.amc_revision).slice(0, 7)} · 翻譯：${d.meta.translator}（prompt ${d.meta.prompt_version}）`, "");
  lines.push("自動分析尚未經驗證適用於廣東話。");
  return lines.join("\n");
}

function download() {
  if (!lastResult) return;
  const a = h("a", { href: URL.createObjectURL(new Blob([resultText(lastResult)], { type: "text/plain;charset=utf-8" })), download: "pse-hk-result.txt" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- wiring ----------

function pullText(p) {
  if (!p.pull) return "未有核實的對應研究參照。";
  return MOTIVES.map((m) => `${NAMES[m]} ${p.pull[m].toFixed(2)}`).join(" ／ ")
    + `；${p.pull.words} 字；${p.pull.n_stories} 個故事`;
}

/** Licensed photos keep their author and licence on their own line; database pictures share one licence note. */
function credits(ul) {
  const link = (href, text) => h("a", { href, target: "_blank", rel: "noopener" }, text);
  ul.replaceChildren(...pictures.map((p, i) => h("li", {}, `第 ${i + 1} 張 · `,
    p.license_url
      ? [`${p.title} · ${p.author} · `, link(p.source_url, "來源"), " · ", link(p.license_url, p.license)]
      : [p.title_zh ? `${p.title_zh}（${p.pse_id}）· ` : `${p.pse_id} · `, link(p.source_url, "來源")])));
  const notes = ["圖片選自 Schönbrodt 等人（2020/2021）的 PSE 圖片資料庫（osf.io/pqckn）。"];
  if (pictures.some((p) => !p.license_url)) notes.push("資料庫圖片未逐張核實授權，只供今次內部練習使用。");
  if (pictures.some((p) => p.modified)) notes.push("圖片已縮小及壓縮。");
  ul.append(h("li", {}, notes.join("")));
}

function confirmDelete() {
  if (hasWriting() && !confirm("確定刪除草稿？已寫下的故事會一併刪除。")) return;
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
    $("app").prepend(h("p", { class: "notice", role: "alert" }, "頁面未能完整載入，請重新整理。"));
    return;
  }
  goIntro();
}

init();
