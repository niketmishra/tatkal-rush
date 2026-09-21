// Tatkal Rush: game flow and screens.

import { h, wild, fmtTod, fmtDur, fmtClock, inr, norm, sleep, pad2 } from "./util.js";
import { generateOrder, LAYOUTS } from "./gen.js";
import { scoreTicket } from "./score.js";
import { makeCaptcha } from "./captcha.js";
import { pickChaos, runChaos, openModal, clearOverlay } from "./chaos.js";
import { sfx, buzz, say, isMuted, toggleMute, loadVoices, announceVoice, stopVoices } from "./sound.js";
import * as board from "./board.js";
import { makeShareCard } from "./share.js";
import { makeQuick } from "./quick.js";
import {
  CLASS_LABEL, REACT, TICKER, PAY_FAILS, WL_JOKES, RAC_JOKES, REGRET_JOKES, SPAM, TITLES, NAGS, TIPS,
} from "./data.js";

const MODES = {
  full: { label: "Full Rush", secs: 600, blurb: "10 minutes. The real thing." },
  express: { label: "Express", secs: 180, blurb: "3 minutes. Chai break edition." },
};
const STEPS = ["search", "pax", "seats", "review", "pay"];
const STEP_LABEL = { search: "Train", pax: "Passengers", seats: "Seats", review: "Captcha", pay: "Payment" };
const MAX_CHAI = 3;
const isPhone = () => matchMedia("(max-width: 860px)").matches;

const view = document.getElementById("view");
let S = null;
let RUN = 0;
let homeTimer = 0;

// ---------------------------------------------------------------------------
// toasts and fake phone notifications

function toast(msg, kind = "info") {
  const el = h("div", { class: "toast " + kind, text: msg });
  document.getElementById("toasts").append(el);
  setTimeout(() => el.classList.add("out"), 2600);
  setTimeout(() => el.remove(), 3000);
}

function notify({ from, text, ms = 6500, onTap }) {
  const el = h("div", { class: "notif" + (onTap ? " tap" : ""), onclick: onTap && (() => { onTap(); el.remove(); }) },
    h("div", { class: "notif-from" }, h("span", { text: "💬 " + from }), h("span", { class: "notif-now", text: "now" })),
    h("div", { class: "notif-text", text }));
  document.getElementById("phone").prepend(el);
  sfx.notif();
  setTimeout(() => el.classList.add("out"), ms);
  setTimeout(() => el.remove(), ms + 400);
}

function confetti() {
  const box = h("div", { class: "confetti" }, Array.from({ length: 36 }, () =>
    h("i", { style: {
      left: wild.int(0, 100) + "%", background: wild.pick(["#f37021", "#14275e", "#148a4a", "#ffc531", "#d6408f"]),
      animationDelay: wild.int(0, 250) + "ms", animationDuration: wild.int(900, 1700) + "ms",
      width: wild.int(6, 11) + "px", height: wild.int(8, 16) + "px",
    } })));
  document.body.append(box);
  setTimeout(() => box.remove(), 2200);
}

// ---------------------------------------------------------------------------
// clock: run timer, per-ticket timer and customer patience

let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(2, (now - lastTick) / 1000);
  lastTick = now;
  if (!S || S.over || S.paused) return;
  if (!S.overtime) S.left -= dt;
  if (S.feverLeft > 0) { S.feverLeft -= dt; if (S.feverLeft <= 0) endFever(); }
  tickQueue(dt);
  if (S.t) {
    S.t.secs += dt;
    if (S.step === "quick" || (S.step !== "pay" && STEPS.includes(S.step))) tickPatience(dt);
  }
  if (!S || S.over) return;
  updateAct();
  const whole = Math.ceil(S.left);
  if (whole <= 10 && whole !== S.lastBeep && whole > 0 && !S.overtime) { S.lastBeep = whole; sfx.tick(); }
  paintHud();
  if (S.left <= 0 && !S.overtime) {
    // the baraat gets to finish: the chart is held for them, and only for them
    if (S.o && S.o.boss && S.t && STEPS.includes(S.step)) {
      S.left = 0;
      S.overtime = true;
      announce("CHART HELD FOR THE BARAAT", "Overtime. Finish this booking and the run ends.", "vo_overtime");
    } else endRun();
  }
}, 200);

function tickPatience(dt) {
  const o = S.o, t = S.t;
  t.wait += dt;
  const r = t.wait / o.patience;
  paintPatience(r);
  if (r >= 0.5 && !t.nag1) { t.nag1 = true; pushChat(wild.pick(NAGS.half), "nag"); }
  if (r >= 0.8 && !t.nag2) { t.nag2 = true; pushChat(wild.pick(NAGS.late), "nag"); buzz(80); }
  if (r >= 1) customerLeaves();
}

const alive = (id, idx) => S && S.runId === id && !S.over && S.idx === idx;

function clearStepTimers() {
  if (!S) return;
  S.timers.forEach(clearInterval);
  S.timers = [];
}

// ---------------------------------------------------------------------------
// home

function renderHome() {
  S = null;
  stopVoices();
  clearOverlay();
  clearInterval(homeTimer);
  document.body.classList.remove("in-game");
  document.body.classList.remove("at-end");
  document.body.classList.add("at-home");
  let mode = localStorage.getItem("tatkal_mode") || "full";
  let scope = "today";

  const boardBox = h("div", { class: "board-list" });
  const paintBoard = async () => {
    boardBox.replaceChildren(h("div", { class: "chart-note", text: "PREPARING CHART..." }));
    const { rows, remote } = await board.fetchBoard(mode, scope);
    boardBox.replaceChildren(boardTable(rows), h("div", { class: "chart-note", text: remote ? "*** GLOBAL CHART ***" : "*** THIS DEVICE ONLY. GLOBAL CHART COMING SOON ***" }));
  };

  // split-flap style reveal: characters rattle before they settle
  const flap = (el, text) => {
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let n = 0;
    const iv = setInterval(() => {
      n++;
      el.textContent = [...text].map((ch, i) => (ch === " " || i < n - 3 ? ch : glyphs[Math.floor(Math.random() * glyphs.length)])).join("");
      if (n > text.length + 3) { clearInterval(iv); el.textContent = text; }
    }, 38);
  };

  const bestEl = h("span", { class: "db-best" });
  const paintBest = () => { const b = board.getLocalBest(mode); bestEl.textContent = b ? `YOUR BEST ${b}` : "NO BOOKINGS YET"; };
  const rows = h("div", { class: "db-rows" });
  const paintModes = () => {
    rows.replaceChildren(
      ...Object.entries(MODES).map(([id, m], i) => {
        const name = h("span", { class: "db-name" });
        const el = h("button", {
          class: "db-row" + (id === mode ? " on" : ""), "aria-pressed": String(id === mode),
          onclick: () => {
            if (mode === id) return;
            mode = id;
            localStorage.setItem("tatkal_mode", id);
            sfx.click();
            paintModes(); paintBest(); paintBoard();
          },
        }, h("span", { class: "db-mark" }), h("span", { text: "10:00" }), name,
        h("span", { class: "db-dur", text: `${m.secs / 60} MIN` }), h("span", { class: "db-pf", text: String(i + 1) }),
        h("span", { class: "db-st ok", text: "BOOKING OPEN" }));
        flap(name, m.label.toUpperCase());
        return el;
      }),
      h("div", { class: "db-row ghost" }, h("span", { class: "db-mark" }), h("span", { text: "04:20" }), h("span", { class: "db-name", text: "CHART PREPARATION" }),
        h("span", { class: "db-dur", text: "SOON" }), h("span", { class: "db-pf", text: "?" }), h("span", { class: "db-st late", text: "DELAYED" })));
  };

  let queue = wild.int(380000, 460000);
  const queueEl = h("b", { text: queue.toLocaleString("en-IN") });
  homeTimer = setInterval(() => { queue += wild.int(-40, 190); queueEl.textContent = queue.toLocaleString("en-IN"); }, 900);

  const scopeBtns = h("div", { class: "chart-tabs" }, [["today", "TODAY"], ["all", "ALL TIME"]].map(([id, label]) =>
    h("button", {
      class: id === scope ? "on" : "", text: label, dataset: { id },
      onclick: () => {
        scope = id;
        scopeBtns.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.id === id));
        paintBoard();
      },
    })));

  const RULES = [
    ["Read the chat.", "Every detail is in there: the train condition, the class, the spellings, who wants which berth. Customers also change their mind halfway through."],
    ["Right train, right class.", "Only AVL can be booked. WL 47 is not a seat, it is a feeling. Exactly one option fits."],
    ["Names exactly as spelled.", "They are spelled funny on purpose and autocorrect is wrong. On trains, children under 5 travel free: do not book them."],
    ["Seat them with brains.", "Same bay or row +10 each, preferences +5, seniors get lowers, feuds get separate bays. Seats vanish while you think."],
    ["Run the waiting room.", "Customers queue up with tokens and you choose who to call. Everyone loses patience, even while waiting. Quick jobs take seconds; the baraat at the end takes everything you have."],
    ["Perfect tickets pay twice.", "Each one earns a chai (one chai, one jugaad). Three in a row starts Tatkal Fever: 60 seconds of double points with no popups."],
  ];

  view.replaceChildren(h("div", { class: "home" },
    h("section", { class: "scene" },
      h("div", { class: "wires", "aria-hidden": "true" }),
      h("div", { class: "scene-in" },
        h("div", { class: "nb-wrap" },
          h("div", { class: "nameboard" },
            h("span", { class: "nb-hi", lang: "hi", text: "तत्काल रश" }),
            h("h1", { text: "TATKAL RUSH" }),
            h("span", { class: "nb-msl", text: "MEAN SERVER LOAD 98.0 %" })),
          h("i", { class: "post l" }), h("i", { class: "post r" })),
        h("p", { class: "scene-lede", text: "Everyone you know needs a ticket. The server is on fire. You have one browser tab and a dream. How many can you book before the quota closes?" }),
        h("div", { class: "dboard" },
          h("div", { class: "db-head" }, h("span"), h("span", { text: "TIME" }), h("span", { text: "TRAIN" }), h("span", { class: "db-dur", text: "RUNS" }), h("span", { class: "db-pf", text: "PF" }), h("span", { class: "db-st", text: "STATUS" })),
          rows,
          h("div", { class: "db-foot" }, bestEl, h("span", {}, "AHEAD OF YOU IN QUEUE ", queueEl))),
        h("button", { class: "btn btn-go scene-go", onclick: () => startRun(mode) }, "Start booking", h("span", { class: "go-arrow", text: "→" }))),
      h("div", { class: "rails", "aria-hidden": "true" }, h("div", { class: "loco", html: trainSvg() }))),
    h("div", { class: "home-cols" },
      h("section", { class: "tkt" },
        h("div", { class: "tkt-head" }, h("b", { text: "INSTRUCTIONS TO THE BOOKING GUY" }), h("span", { text: "RAILJHATKA · NOT TRANSFERABLE" })),
        h("ol", { class: "tkt-rules" }, RULES.map(([t, b]) => h("li", {}, h("b", { text: t + " " }), b))),
        h("div", { class: "tkt-foot" }, h("span", { text: "HAPPY JOURNEY" }), h("span", { text: "PERFECT TICKETS BUILD A STREAK · FAST ONES EARN A BONUS · SKIPPING COSTS 10" }))),
      h("section", { class: "chart-paper" },
        h("div", { class: "chart-head" }, h("div", {}, h("b", { text: "RESERVATION CHART" }), h("small", { text: "COACH: LEADERBOARD · QUOTA: TATKAL" })), scopeBtns),
        boardBox)),
    h("p", { class: "fine", text: "RailJhatka is a parody and is not affiliated with any railway, airline, bank or celebrity. All names are made up and misspelled on purpose." })));
  paintModes();
  paintBest();
  paintBoard();
}

// A little ICF-blue rake drawn in SVG, so the hero needs no emoji.
function trainSvg() {
  const coach = x => `<g transform="translate(${x} 0)"><rect x="0" y="6" width="150" height="38" rx="5" fill="#2a5ca8"/><rect x="0" y="16" width="150" height="14" fill="#a9cdf2"/>${[10, 38, 66, 94, 122].map(w => `<rect x="${w}" y="18" width="18" height="10" rx="2" fill="#1b2c4f"/>`).join("")}<rect x="0" y="40" width="150" height="4" fill="#1d4077"/><circle cx="26" cy="47" r="6" fill="#222"/><circle cx="46" cy="47" r="6" fill="#222"/><circle cx="104" cy="47" r="6" fill="#222"/><circle cx="124" cy="47" r="6" fill="#222"/><rect x="150" y="26" width="6" height="5" fill="#333"/></g>`;
  const loco = `<g><path d="M14 8 H150 V44 H4 V22 Z" fill="#b3261e"/><rect x="4" y="26" width="146" height="8" fill="#f2e3c2"/><path d="M18 12 H44 V22 H10 Z" fill="#1b2c4f"/><rect x="60" y="12" width="22" height="9" rx="2" fill="#1b2c4f"/><rect x="100" y="12" width="22" height="9" rx="2" fill="#1b2c4f"/><circle cx="7" cy="38" r="3" fill="#ffe28a"/><circle cx="30" cy="47" r="6" fill="#222"/><circle cx="52" cy="47" r="6" fill="#222"/><circle cx="104" cy="47" r="6" fill="#222"/><circle cx="126" cy="47" r="6" fill="#222"/><path d="M70 8 L84 0 L98 8" stroke="#333" stroke-width="2" fill="none"/><rect x="150" y="26" width="6" height="5" fill="#333"/></g>`;
  return `<svg viewBox="0 0 940 54" width="940" height="54" xmlns="http://www.w3.org/2000/svg">${loco}${[156, 312, 468, 624, 780].map(coach).join("")}</svg>`;
}

function boardTable(rows, meIdx = -1) {
  if (!rows.length) return h("div", { class: "chart-note", text: "CHART NOT PREPARED. BE THE FIRST." });
  return h("ol", { class: "board" },
    h("li", { class: "board-head" }, h("span", { text: "S.NO" }), h("span", { text: "NAME" }), h("span", { text: "TKTS" }), h("span", { text: "PTS" })),
    rows.slice(0, 50).map((r, i) =>
      h("li", { class: (i === meIdx ? "me " : "") + (i < 3 ? "top" : "") },
        h("span", { class: "rank", text: pad2(i + 1) }),
        h("span", { class: "who", text: r.name }),
        h("span", { class: "tk", text: r.tickets }),
        h("span", { class: "pts", text: r.score }))));
}

// ---------------------------------------------------------------------------
// run lifecycle

function startRun(mode) {
  sfx.click();
  loadVoices();
  clearInterval(homeTimer);
  S = {
    runId: ++RUN, mode, total: MODES[mode].secs, left: MODES[mode].secs,
    seed: `${Date.now()}-${Math.random()}`, idx: -1, o: null, t: null, step: null,
    score: 0, tickets: 0, perfect: 0, streak: 0, bestStreak: 0, skips: 0, lost: 0, chai: 0, log: [],
    ticketSecs: [], paused: true, over: false, timers: [], ui: {}, lastBeep: 0,
    queue: [], serial: 0, bookSerial: 0, spawnIn: 3, lastArrival: "", act: 1, feverLeft: 0, fevers: 0,
    quick: 0, bossSpawned: false, overtime: false, token: wild.int(11, 40),
    firstRun: !localStorage.getItem("tatkal_played"),
  };
  document.body.classList.add("in-game");
  document.body.classList.remove("at-home", "at-end", "fever");
  renderShell();
  countdown();
}

function renderShell() {
  const ui = S.ui;
  ui.timer = h("div", { class: "hud-timer", text: fmtClock(S.left) });
  ui.timeLabel = h("small", { text: "CLOSES IN" });
  ui.score = h("b", { text: "0" });
  ui.scoreCell = h("div", { class: "hud-cell" }, h("small", { text: "POINTS" }), ui.score);
  ui.tickets = h("b", { text: "0" });
  ui.streak = h("b", { text: "0" });
  ui.chai = h("span", { class: "chai-cups" });
  ui.bar = h("i");
  ui.hud = h("div", { class: "hud" },
    h("div", { class: "hud-cell hud-time" }, ui.timeLabel, ui.timer),
    ui.scoreCell,
    h("div", { class: "hud-cell" }, h("small", { text: "TICKETS" }), ui.tickets),
    h("div", { class: "hud-cell" }, h("small", { text: "STREAK" }), h("span", { class: "flame" }, "🔥", ui.streak)),
    h("div", { class: "hud-cell" }, h("small", { text: "CHAI" }), ui.chai),
    h("button", { class: "hud-quit", text: "✕", title: "Quit run", onclick: confirmQuit }),
    h("div", { class: "hud-bar" }, ui.bar));

  ui.briefBody = h("div", { class: "brief-body" });
  ui.briefHead = h("div", { class: "brief-head" });
  ui.mood = h("span", { class: "mood", text: "🙂" });
  ui.patience = h("i");
  ui.patience2 = h("i");
  ui.brief = h("aside", { class: "brief" }, ui.briefHead,
    h("div", { class: "patience" }, h("small", { text: "PATIENCE" }), h("div", { class: "pbar" }, ui.patience), ui.mood),
    ui.briefBody,
    h("div", { class: "brief-foot" },
      h("button", { class: "btn btn-ghost brief-close", text: "Got it", onclick: closeBrief }),
      h("button", { class: "btn btn-ghost", text: "Skip customer (−10)", onclick: skipOrder })));
  ui.briefBar = h("button", { class: "brief-bar", onclick: () => { S.ui.brief.classList.contains("open") ? closeBrief() : openBrief(); sfx.click(); } });
  ui.scrim = h("div", { class: "scrim", onclick: closeBrief });
  ui.stepper = h("div", { class: "stepper" });
  ui.step = h("div", { class: "step" });
  ui.stage = h("section", { class: "stage" }, ui.stepper, ui.step);
  ui.strip = h("div", { class: "wstrip", hidden: true });
  ui.game = h("div", { class: "game" }, ui.scrim, ui.brief, ui.stage);
  view.replaceChildren(ui.hud, ui.strip, ui.briefBar, ui.game);
  paintHud();
}

function openBrief() {
  const ui = S.ui;
  ui.brief.classList.add("open");
  ui.scrim.classList.add("on");
  ui.briefBar.classList.remove("unread");
}
function closeBrief() {
  S.ui.brief.classList.remove("open");
  S.ui.scrim.classList.remove("on");
}

function paintHud() {
  const ui = S.ui;
  ui.timer.textContent = fmtClock(S.left);
  ui.timer.classList.toggle("low", S.left <= 30);
  const rush = S.left <= 60 && S.left > 0;
  ui.hud.classList.toggle("rush", rush || S.overtime);
  ui.timeLabel.textContent = S.overtime ? "OVERTIME" : S.feverLeft > 0 ? `FEVER 2x ${Math.ceil(S.feverLeft)}s` : rush ? "LAST MIN 1.5x" : ACTS[S.act].hud;
  if (S.overtime) ui.timer.textContent = "0:00";
  ui.score.textContent = S.score;
  ui.tickets.textContent = S.tickets;
  ui.streak.textContent = S.streak;
  ui.streak.parentNode.classList.toggle("hot", S.streak >= 2);
  ui.chai.textContent = "☕".repeat(S.chai) + "·".repeat(MAX_CHAI - S.chai);
  ui.bar.style.width = Math.max(0, (100 * S.left) / S.total) + "%";
}

function scorePop(n) {
  if (!n) return;
  const el = h("span", { class: "score-pop " + (n > 0 ? "up" : "down"), text: (n > 0 ? "+" : "") + n });
  S.ui.scoreCell.append(el);
  setTimeout(() => el.remove(), 1200);
}

function paintPatience(r) {
  const ui = S.ui;
  const left = Math.max(0, 1 - r);
  const cls = left > 0.5 ? "" : left > 0.2 ? "mid" : "lo";
  for (const bar of [ui.patience, ui.patience2]) {
    bar.style.width = left * 100 + "%";
    bar.className = cls;
  }
  ui.mood.textContent = left > 0.5 ? "🙂" : left > 0.2 ? "😐" : "😠";
}

async function countdown() {
  const id = S.runId;
  const clock = h("div", { class: "count-clock", text: "09:59:57" });
  const close = openModal(h("div", { class: "modal modal-count" },
    h("small", { text: "TATKAL BOOKING OPENS AT 10:00:00" }), clock,
    h("p", { text: "Fingers on keyboard. Chai on table. Prayers optional." })));
  for (let s = 57; s <= 59; s++) {
    clock.textContent = `09:59:${pad2(s)}`;
    sfx.tick();
    await sleep(750);
    if (!S || S.runId !== id) return;
  }
  clock.textContent = "10:00:00";
  clock.classList.add("go");
  sfx.horn();
  await sleep(600);
  if (!S || S.runId !== id) return;
  close();
  S.paused = false;
  announce(ACTS[1].title, ACTS[1].sub, ACTS[1].vo);
  serve(makeArrival(true));
}

function confirmQuit() {
  const wasPaused = S.paused;
  S.paused = true;
  const close = openModal(h("div", { class: "modal" },
    h("h3", { text: "Quit this run?" }),
    h("p", { text: "Your customers will find another computer wala." }),
    h("div", { class: "row" },
      h("button", { class: "btn btn-ghost", text: "Keep booking", onclick: () => { close(); if (S) S.paused = wasPaused; } }),
      h("button", { class: "btn", text: "End run", onclick: () => { close(); endRun(); } }))));
}

// ---------------------------------------------------------------------------
// acts, announcements, fever

const ACTS = {
  1: { hud: "CLOSES IN", vo: "vo_open", title: "TATKAL WINDOW IS OPEN", sub: "Customers are lining up. Pick who to serve." },
  2: { hud: "MELTDOWN", vo: "vo_meltdown", title: "SERVER MELTDOWN", sub: "More popups. Seats vanish faster. Gateways wobble." },
  3: { hud: "PREMIUM 1.25x", vo: "vo_premium", title: "PREMIUM TATKAL", sub: "Bigger parties. Every booking pays 1.25x." },
};

function updateAct() {
  const f = S.left / S.total;
  const act = f > 0.7 ? 1 : f > 0.4 ? 2 : 3;
  if (act === S.act) return;
  S.act = act;
  announce(ACTS[act].title, ACTS[act].sub, ACTS[act].vo);
}

function announce(title, sub, vo) {
  document.querySelectorAll(".announce").forEach(x => x.remove());
  const el = h("div", { class: "announce" }, h("small", { text: "YATRIGAN KRIPYA DHYAN DEIN" }), h("b", { text: title }), h("span", { text: sub }));
  document.body.append(el);
  // recorded: chime, attention call, then the line. The board stays up while the announcer talks.
  let secs = announceVoice(vo);
  if (!secs) { sfx.chime(); say("Yatrigan kripya dhyan dein"); }
  secs = Math.max(3.6, secs + 0.3);
  setTimeout(() => el.classList.add("out"), secs * 1000);
  setTimeout(() => el.remove(), secs * 1000 + 500);
}

function startFever() {
  S.feverLeft = 60;
  S.fevers++;
  document.body.classList.add("fever");
  announce("TATKAL FEVER", "60 seconds. Double points. No popups. Nobody steals your seats.", "vo_fever");
  sfx.cash();
}

function endFever() {
  S.feverLeft = 0;
  document.body.classList.remove("fever");
  toast("Fever over. Reality resumes.", "info");
}

// ---------------------------------------------------------------------------
// the waiting room

const WAIT_DRAIN = 0.42; // patience drains slower in the queue than at the counter

function makeArrival(first = false) {
  const serial = S.serial++;
  const token = S.token++;
  const canQuick = !first && serial >= 2 && S.lastArrival !== "quick";
  if (canQuick && wild.chance(0.36)) {
    S.lastArrival = "quick";
    const job = makeQuick();
    return { kind: "quick", token, job, persona: job.persona, wait: 0, patience: job.patience, est: job.pts };
  }
  S.lastArrival = "booking";
  const floor = S.act === 3 ? 7 : S.act === 2 ? 3 : 0;
  const level = first ? 0 : Math.max(floor, S.bookSerial);
  const order = generateOrder(`${S.seed}-${serial}`, level, { serial: S.bookSerial });
  S.bookSerial++;
  return { kind: "booking", token, order, persona: order.persona, wait: 0, patience: order.patience, est: estimate(order) };
}

function makeBoss() {
  const order = generateOrder(`${S.seed}-boss`, 9, { boss: true });
  return { kind: "booking", boss: true, token: S.token++, order, persona: order.persona, wait: 0, patience: order.patience, est: estimate(order) };
}

// what a flawless, unhurried booking of this customer pays, before streaks
function estimate(o) {
  const seats = new Map(o.coaches.flatMap(c => c.groups.flatMap(g => g.seats)).map(x => [x.id, x]));
  const ideal = scoreTicket(o, {
    train: o.trains.find(x => x.correct), cls: o.cls, rows: o.pax.map(p => ({ pax: p, seat: seats.get(p.plant) })),
    addons: new Set(o.addons ? o.addons.want : []), secs: 9999, idFails: 0, streak: 0,
    mults: o.boss ? [{ label: "", mul: 2 }] : o.vip ? [{ label: "", mul: 2 }] : [],
  });
  return Math.round(ideal.total / 10) * 10;
}

function tickQueue(dt) {
  let changed = false;
  for (const q of [...S.queue]) {
    if (!q.boss) q.wait += dt * WAIT_DRAIN;
    if (q.wait >= q.patience) {
      S.queue = S.queue.filter(x => x !== q);
      S.lost++;
      S.score = Math.max(0, S.score - 8);
      scorePop(-8);
      toast(`${q.persona.who} got tired of waiting and left. −8`, "bad");
      sfx.bad();
      changed = true;
    }
  }
  if (S.mode === "full" && !S.bossSpawned && S.left <= 130 && S.left > 0) {
    S.bossSpawned = true;
    S.queue.unshift(makeBoss());
    announce("FINAL CALL · THE BARAAT IS HERE", "Six passengers, every rule at once, double points. Call them when you are ready.", "vo_baraat");
    changed = true;
  }
  S.spawnIn -= dt;
  const cap = S.mode === "express" || S.act === 1 ? 2 : 3;
  const waiting = S.queue.filter(q => !q.boss).length;
  const starving = S.step === "lobby" && !S.queue.length;
  if (waiting < cap && (S.spawnIn <= 0 || starving) && (S.left > 15 || starving)) {
    S.queue.push(makeArrival());
    S.spawnIn = waiting + 1 < 2 ? wild.int(2, 4) : wild.int(7, 13);
    if (S.step === "lobby") sfx.msg();
    changed = true;
  }
  if (changed) { paintStrip(); if (S.step === "lobby") paintLobby(); }
  for (const q of S.queue) {
    const left = Math.max(0, 1 - q.wait / q.patience);
    for (const bar of q.bars || []) { bar.style.width = left * 100 + "%"; bar.className = left > 0.5 ? "" : left > 0.2 ? "mid" : "lo"; }
  }
}

function paintStrip() {
  const ui = S.ui;
  ui.strip.hidden = S.step === "lobby" || !S.queue.length;
  ui.strip.replaceChildren(h("small", { text: "WAITING" }), ...S.queue.map(q => {
    const bar = h("i");
    q.bars = [bar];
    return h("span", { class: "wchip" + (q.boss ? " boss" : q.kind === "quick" ? " quick" : q.order.vip ? " vip" : "") },
      h("span", { class: "av sm", text: q.persona.av }), h("span", { class: "pbar mini" }, bar));
  }));
}

function askLine(q) {
  if (q.kind === "quick") return `${q.job.title} · about 15 sec`;
  const o = q.order;
  const route = o.kind === "air" ? `${o.from.a} to ${o.to.a} by air` : `${o.from.r} to ${o.to.r} · ${o.cls}`;
  return `${o.size} ${o.size > 1 ? "tickets" : "ticket"} · ${route}`;
}

function paintLobby() {
  const list = S.ui.lobbyList;
  if (!list) return;
  if (!S.queue.length) {
    list.replaceChildren(h("div", { class: "lobby-empty", text: "The platform is empty. Someone is walking in..." }));
    return;
  }
  list.replaceChildren(...S.queue.map(q => {
    const bar = h("i");
    q.bars = [...(q.bars || []).slice(0, 1), bar];
    const o = q.order;
    const tags = [
      q.boss && h("em", { class: "tg boss", text: "BARAAT 2x" }), o && o.vip && h("em", { class: "tg vip", text: "VIP 2x" }),
      o && o.kind === "air" && h("em", { class: "tg", text: "FLIGHT" }), q.kind === "quick" && h("em", { class: "tg quick", text: "QUICK JOB" }),
    ];
    return h("button", { class: "token" + (q.boss ? " boss" : q.kind === "quick" ? " quick" : ""), onclick: () => { sfx.ok(); serve(q); } },
      h("div", { class: "token-no" }, h("small", { text: "TOKEN" }), h("b", { text: String(q.token).padStart(2, "0") })),
      h("div", { class: "token-body" },
        h("div", { class: "token-who" }, h("span", { class: "av sm", text: q.persona.av }), h("b", { text: q.persona.who }), tags),
        h("div", { class: "token-ask", text: askLine(q) }),
        h("div", { class: "pbar" }, bar)),
      h("div", { class: "token-pay" }, h("small", { text: q.kind === "quick" ? "PAYS" : "UP TO" }), h("b", { text: q.est }), h("small", { text: "PTS" })));
  }));
}

function toLobby() {
  clearStepTimers();
  clearOverlay();
  if (S.overtime || S.left <= 0) return endRun();
  S.o = null;
  S.t = null;
  S.step = "lobby";
  S.paused = false;
  S.ui.stepper.hidden = true;
  S.ui.game.classList.add("idle");
  closeBrief();
  document.getElementById("phone").replaceChildren();
  // there is always a choice to make: top the room up to two before showing it
  while (S.queue.filter(q => !q.boss).length < 2 && S.left > 15) S.queue.push(makeArrival());
  S.ui.lobbyList = h("div", { class: "lobby-list" });
  S.ui.step.classList.remove("dim");
  S.ui.step.replaceChildren(h("div", { class: "lobby" },
    h("div", { class: "lobby-board" }, h("b", { text: "COUNTER 1 IS FREE" }), h("span", { text: "CALL THE NEXT TOKEN · THE CLOCK IS RUNNING" })),
    h("div", { class: "step-head" }, h("h2", { text: "Waiting room" }),
      h("small", { text: "Tap a token to call them. Everyone here is losing patience, slowly. The rest keep waiting while you work." })),
    S.ui.lobbyList));
  S.ui.step.classList.remove("enter"); void S.ui.step.offsetWidth; S.ui.step.classList.add("enter");
  paintStrip();
  paintLobby();
  window.scrollTo({ top: 0 });
}

function serve(q) {
  S.queue = S.queue.filter(x => x !== q);
  clearStepTimers();
  S.idx++;
  S.ui.lobbyList = null;
  S.ui.game.classList.remove("idle");
  if (q.kind === "quick") return startQuick(q);
  const o = (S.o = q.order);
  S.t = {
    secs: 0, wait: q.wait, train: null, cls: null, rows: [blankRow()], active: null, coachTab: 0,
    addons: new Set(o.addons ? o.addons.preticked : []), badRows: new Set(),
    idFails: 0, payTries: 0, pay: null, seatLost: false, nag1: false, nag2: false,
    capSkip: false, sifarish: false, freezeUntil: 0, tipoff: false, prefilled: false,
  };
  if (o.boss) {
    // the planner's Excel sheet: everything typed in already, with two mistakes to catch
    S.t.rows = o.pax.map(p => ({ ...blankRow(), name: p.name, age: String(p.age), g: p.g }));
    const [r1, r2] = wild.shuffle(S.t.rows);
    r1.name = o.pax.find(p => p.name === r1.name).real;
    r2.age = String(Number(r2.age) + wild.pick([-3, -2, -1, 1, 2, 3]));
    S.t.prefilled = true;
  }
  paintBrief();
  paintPatience(q.wait / o.patience);
  paintStrip();
  if (isPhone()) openBrief();
  if (o.vip) { sfx.horn(); toast("VIP customer: double points, short patience.", "info"); }
  go("search", false);
}

// ---- quick jobs ---------------------------------------------------------------

function startQuick(q) {
  const job = q.job;
  const id = S.runId, idx = S.idx;
  S.o = { quick: true, persona: q.persona, patience: q.patience, chat: [...job.chat], size: 1, idx: 0 };
  S.t = { secs: 0, wait: q.wait, rows: [], nag1: true, nag2: false };
  S.step = "quick";
  S.ui.stepper.hidden = true;
  paintQuickBrief(job);
  paintPatience(q.wait / q.patience);
  paintStrip();

  const done = ok => {
    if (!alive(id, idx)) return;
    clearStepTimers();
    S.paused = true;
    const secs = S.t.secs;
    let pts = ok ? job.pts + Math.max(0, Math.round(10 * (1 - secs / 12))) : -5;
    const notes = [];
    if (ok && S.feverLeft > 0) { pts *= 2; notes.push("Fever 2x"); }
    if (ok && S.left <= 60) { pts = Math.round(pts * 1.5); notes.push("Last minute 1.5x"); }
    S.score = Math.max(0, S.score + pts);
    S.quick++;
    S.log.push(ok ? "🟦" : "🟥");
    paintHud();
    scorePop(pts);
    closeBrief();
    ok ? (sfx.stamp(), buzz(20)) : (sfx.bad(), buzz([40, 30, 40]));
    S.ui.step.replaceChildren(h("div", { class: "result qj-result" },
      h("div", { class: "stamp " + (ok ? "ok" : "no"), text: ok ? "DONE" : "GALAT" }),
      h("b", { class: "qj-pts", text: (pts > 0 ? "+" : "") + pts }),
      notes.length > 0 && h("small", { class: "muted", text: notes.join(" · ") }),
      h("div", { class: "react" }, h("span", { class: "av", text: q.persona.av }),
        h("div", { class: "bubble", text: ok ? wild.pick(["Thank you beta. 2 minute ka kaam tha.", "Arre wah, itni jaldi!", "Bas itna hi tha. God bless."]) : wild.pick(["Yeh kya kar diya?! Rehne do.", "Galat! Ab main khud dekh lunga.", "Tumse yeh bhi nahi hua?"]) }))));
    setTimeout(() => { if (alive(id, idx)) { S.paused = false; toLobby(); } }, 1500);
  };
  S.ui.step.classList.remove("dim");
  S.ui.step.replaceChildren(h("div", {},
    h("div", { class: "step-head" }, h("h2", { text: job.title }), h("small", { text: `Quick job · ${job.pts} points, a little more if you are fast · a wrong answer costs 5` })),
    // on a phone the ask sits right above the task: nobody should memorise a PNR through a bottom sheet
    isPhone() && h("div", { class: "qj-ask" }, h("span", { class: "av sm", text: q.persona.av }), h("div", {}, job.chat.map(m => bubble(m)))),
    job.render(done)));
  S.ui.step.classList.remove("enter"); void S.ui.step.offsetWidth; S.ui.step.classList.add("enter");
  window.scrollTo({ top: 0 });
}

function paintQuickBrief(job) {
  const o = S.o, ui = S.ui;
  ui.brief.classList.remove("vip");
  ui.briefBar.classList.remove("vip", "unread");
  ui.briefHead.replaceChildren(h("div", { class: "av", text: o.persona.av }),
    h("div", {}, h("b", {}, o.persona.who, h("em", { class: "vip-tag", text: "QUICK" })), h("small", { text: "Two minute ka kaam hai · online" })));
  ui.briefBar.replaceChildren(h("span", { class: "av sm", text: o.persona.av }),
    h("span", { class: "bb-text" }, h("b", { text: o.persona.who }), ` · ${job.title}`),
    h("span", { class: "bb-cta", text: "View chat" }), h("span", { class: "pbar mini" }, ui.patience2));
  ui.briefBody.replaceChildren(...o.chat.map(bubble));
  ui.briefBody.scrollTop = 0;
}

let UID = 0;
const blankRow = () => ({ uid: ++UID, name: "", age: "", g: "", seat: null, pax: null });

function skipOrder() {
  if (!S || S.over || S.paused || !S.o) return;
  S.score = Math.max(0, S.score - 10);
  scorePop(-10);
  S.streak = 0;
  S.skips++;
  S.log.push("⬛");
  releaseSeats();
  toast("Customer skipped. −10. They will remember this.", "bad");
  sfx.bad();
  clearOverlay();
  paintHud();
  toLobby();
}

function customerLeaves() {
  const id = S.runId, idx = S.idx, o = S.o;
  clearStepTimers();
  clearOverlay();
  releaseSeats();
  S.paused = true;
  S.score = Math.max(0, S.score - 15);
  scorePop(-15);
  S.streak = 0;
  S.lost++;
  S.log.push("⬛");
  S.step = "gone";
  paintStepper();
  paintHud();
  closeBrief();
  document.getElementById("phone").replaceChildren();
  sfx.angry();
  buzz([60, 40, 120]);
  let moved = false;
  const next = () => {
    if (moved || !alive(id, idx)) return;
    moved = true;
    S.paused = false;
    toLobby();
  };
  S.ui.step.replaceChildren(h("div", { class: "result gone" },
    h("div", { class: "gone-av", text: "😤" }),
    h("h2", { text: `${o.persona.who} ran out of patience` }),
    h("div", { class: "react" }, h("span", { class: "av", text: o.persona.av }), h("div", { class: "bubble", text: wild.pick(NAGS.gone) })),
    h("p", { class: "muted center", text: "−15 points. Streak lost. The family WhatsApp group has been informed." }),
    h("button", { class: "btn btn-go", text: S.overtime ? "See the final chart" : "Back to the waiting room", onclick: next })));
  setTimeout(next, 3200);
}

function releaseSeats() {
  for (const r of (S.t && S.t.rows) || []) if (r.seat) { r.seat.holder = null; r.seat = null; }
}

async function go(step, chaos = true) {
  const id = S.runId, idx = S.idx;
  clearStepTimers();
  if (chaos && S.feverLeft <= 0) {
    const kind = pickChaos(S.o.idx, S.act === 2 ? 0.18 : 0);
    if (kind) {
      S.ui.step.classList.add("dim");
      await runChaos(kind, S.o.idx);
      if (!alive(id, idx) || S.step === "gone") return;
    }
  }
  S.step = step;
  S.ui.step.classList.remove("dim");
  paintStepper();
  S.ui.step.replaceChildren(RENDER[step]());
  S.ui.step.classList.remove("enter"); void S.ui.step.offsetWidth; S.ui.step.classList.add("enter");
  window.scrollTo({ top: 0 });
  scheduleAmendment(step);
}

// The customer remembers something a few seconds into a later step.
function scheduleAmendment(step) {
  const o = S.o, a = o.amend;
  if (!a || a.done || step === "pay" || STEPS.indexOf(step) < STEPS.indexOf(a.step)) return;
  const id = S.runId, idx = S.idx;
  S.timers.push(setTimeout(() => {
    if (!alive(id, idx) || a.done || S.step === "pay" || S.paused) return;
    a.done = true;
    a.apply();
    pushChat(a.text, "new");
    buzz(60);
  }, a.delay));
}

function paintStepper() {
  const at = STEPS.indexOf(S.step);
  S.ui.stepper.hidden = at < 0;
  if (at < 0) return;
  S.ui.stepper.replaceChildren(...STEPS.map((s, i) => {
    const label = s === "search" && S.o.kind === "air" ? "Flight" : STEP_LABEL[s];
    const back = i < at;
    return h(back ? "button" : "div", {
      class: "st" + (back ? " done" : i === at ? " on" : ""), title: back ? "Go back to " + label : null,
      onclick: back && (() => { sfx.click(); go(s, false); }),
    }, h("i", { text: back ? "✓" : String(i + 1) }), h("span", { text: label }));
  }));
}

function tipEl(step) {
  if (!S.firstRun || S.idx > 0) return null;
  return h("div", { class: "tip" }, h("b", { text: "TIP " }), TIPS[step]);
}

// A chai token buys one jugaad per step.
function chaiBtn(label, fn) {
  const btn = h("button", { class: "btn btn-chai", disabled: S.chai < 1, title: S.chai < 1 ? "Earn chai with perfect tickets" : "" },
    h("span", { text: "☕" }), label);
  btn.onclick = () => {
    if (S.chai < 1 || btn.dataset.used) return;
    btn.dataset.used = "1";
    btn.disabled = true;
    S.chai--;
    sfx.chai();
    paintHud();
    fn();
  };
  return btn;
}

// ---------------------------------------------------------------------------
// the customer chat

function bubble(m, i = 0) {
  if (typeof m === "string") return h("div", { class: "bubble", style: { animationDelay: i * 60 + "ms" }, text: m });
  if (m.list) {
    return h("div", { class: "bubble list", style: { animationDelay: i * 60 + "ms" } },
      h("div", { class: "bubble-title", text: "Passengers" }),
      m.list.map(p => h("div", { class: "pl" }, h("b", { text: p.line }), p.note && h("span", { text: p.note }))));
  }
  return h("div", { class: "bubble " + m.kind }, m.kind === "new" && h("em", { text: "NEW" }), m.text);
}

function paintBrief() {
  const o = S.o, ui = S.ui;
  const route = o.kind === "air" ? `${o.from.a} ✈ ${o.to.a}` : `${o.from.r} → ${o.to.r}`;
  ui.brief.classList.toggle("vip", o.vip || o.boss);
  ui.briefBar.classList.toggle("vip", o.vip || o.boss);
  ui.briefBar.classList.remove("unread");
  ui.briefHead.replaceChildren(
    h("div", { class: "av", text: o.persona.av }),
    h("div", {}, h("b", {}, o.persona.who, o.vip && h("em", { class: "vip-tag", text: "VIP 2x" }), o.boss && h("em", { class: "vip-tag", text: "BARAAT 2x" })),
      h("small", { text: `${o.boss ? "The finale" : "At counter 1"} · online` })));
  ui.briefBar.replaceChildren(
    h("span", { class: "av sm", text: o.persona.av }),
    h("span", { class: "bb-text" }, h("b", { text: o.persona.who }), ` · ${o.size} ${o.size > 1 ? "tickets" : "ticket"} · ${route}`),
    h("span", { class: "bb-cta", text: "View chat" }),
    h("span", { class: "pbar mini" }, ui.patience2));
  ui.briefBody.replaceChildren(...o.chat.map(bubble));
  ui.briefBody.scrollTop = 0;
}

function pushChat(text, kind) {
  const o = S.o, ui = S.ui;
  const m = { text, kind };
  o.chat.push(m);
  ui.briefBody.append(bubble(m));
  ui.briefBody.scrollTop = ui.briefBody.scrollHeight;
  sfx.msg();
  if (isPhone() && !ui.brief.classList.contains("open")) {
    ui.briefBar.classList.add("unread");
    notify({ from: o.persona.who, text, ms: kind === "new" ? 7000 : 3500, onTap: openBrief });
  }
}

// ---------------------------------------------------------------------------
// step renderers

const RENDER = {
  // ---- 1. train or flight ---------------------------------------------------
  search() {
    const o = S.o, t = S.t, air = o.kind === "air";
    const chips = [];
    const chipText = (tr, c) => {
      const a = tr.avail[c];
      if (air) return a.t === "AVL" ? `${a.n} seats left` : "SOLD OUT";
      return a.t === "AVL" ? `AVL ${a.n}` : a.t === "WL" ? `WL ${a.n}` : a.t === "RAC" ? `RAC ${a.n}` : "REGRET";
    };
    const pickChip = (tr, c, el) => {
      const a = tr.avail[c];
      if (a.t !== "AVL") {
        el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
        sfx.bad(); buzz(40);
        toast(wild.pick(a.t === "WL" ? WL_JOKES : a.t === "RAC" ? RAC_JOKES : REGRET_JOKES), "bad");
        return;
      }
      if (a.n < o.size) { sfx.bad(); toast(`Only ${a.n} left. You need ${o.size}.`, "bad"); return; }
      t.train = tr;
      t.cls = c;
      sfx.ok();
      go("pax");
    };
    const cards = o.trains.map(tr => h("div", { class: "train card" + (t.tipoff && tr.correct ? " tipoff" : "") + (t.train === tr ? " chosen" : ""), dataset: { id: tr.id } },
      h("div", { class: "train-top" },
        h("div", {}, h("b", { class: "train-name", text: tr.name }), h("small", { text: (air ? "Flight " : "#") + tr.no })),
        h("div", { class: "train-dur", text: fmtDur(tr.dur) })),
      h("div", { class: "train-times" },
        h("div", {}, h("b", { text: fmtTod(tr.dep) }), h("small", { text: air ? o.from.a : o.from.r })),
        h("div", { class: "train-line" }, h("span", { text: air ? "✈" : "🚆" })),
        h("div", { class: "right" }, h("b", {}, fmtTod(tr.arr), tr.nextDay && h("sup", { text: "+1" })), h("small", { text: air ? o.to.a : o.to.r }))),
      h("div", { class: "chips" }, tr.classes.map(c => {
        const el = h("button", { class: "chip " + tr.avail[c].t.toLowerCase(), onclick: () => pickChip(tr, c, el) },
          h("span", { class: "chip-cls", text: air ? "Economy" : c }),
          h("span", { class: "chip-fare", text: inr(tr.fares[c]) }),
          h("span", { class: "chip-st", text: chipText(tr, c) }));
        chips.push({ tr, c, el });
        return el;
      }))));

    // availability drains while you read
    S.timers.push(setInterval(() => {
      const live = chips.filter(x => x.tr.avail[x.c].t === "AVL");
      if (!live.length) return;
      const x = wild.pick(live), a = x.tr.avail[x.c];
      a.n -= wild.int(1, 3);
      if (a.floor != null) a.n = Math.max(a.floor, a.n);
      else if (a.n <= 0) { a.t = "WL"; a.n = wild.int(1, 6); x.el.className = "chip wl"; }
      x.el.querySelector(".chip-st").textContent = chipText(x.tr, x.c);
      x.el.classList.remove("blip"); void x.el.offsetWidth; x.el.classList.add("blip");
    }, 1100));

    const list = h("div", { class: "trains" }, cards);
    return h("div", {},
      h("div", { class: "step-head" },
        h("h2", { text: `${o.from.n} to ${o.to.n}` }),
        h("small", { text: air ? "Tomorrow · fares change every time you blink" : "Tomorrow · TATKAL quota · availability is live" })),
      tipEl("search"), list,
      h("div", { class: "row between wrap foot" },
        h("p", { class: "hint", text: air ? "Tap a fare to book that flight." : "Tap an AVL class chip to book that train." }),
        chaiBtn("Ask the chaiwala which one", () => {
          const right = o.trains.find(x => x.correct);
          t.tipoff = true;
          list.querySelector(`[data-id="${right.id}"]`).classList.add("tipoff");
          toast(`Chaiwala: "${right.name}, ${air ? "Economy" : o.cls}. Trust me."`, "info");
        })));
  },

  // ---- 2. passenger details -------------------------------------------------
  pax() {
    const o = S.o, t = S.t;
    const list = h("div", { class: "pax-list" });
    const paint = () => list.replaceChildren(...t.rows.map(rowEl));
    const next = () => {
      for (const r of t.rows) {
        if (!norm(r.name) || !r.g || !(Number(r.age) >= 1 && Number(r.age) <= 120)) {
          sfx.bad();
          toast("Fill name, age and gender for every passenger.", "bad");
          return;
        }
      }
      sfx.ok();
      go("seats");
    };
    // "Helpful" autocorrect: always suggests the real spelling, which is wrong here.
    const suggest = (r, input, box) => {
      box.replaceChildren();
      const v = norm(r.name);
      if (o.idx < 1 || v.length < 3) return;
      const p = o.pax.find(x => norm(x.name) !== v && norm(x.real) !== v && (norm(x.real).startsWith(v) || norm(x.name).startsWith(v)));
      if (!p) return;
      box.append(h("button", {
        class: "sug", tabIndex: -1,
        onclick: () => { r.name = p.real; input.value = p.real; box.replaceChildren(); sfx.click(); input.focus(); },
      }, h("small", { text: "Autocorrect" }), p.real));
    };
    const rowEl = (r, i) => {
      const box = h("div", { class: "sug-box" });
      const input = h("input", {
        class: "in in-name", type: "text", placeholder: "Full name as on ID", value: r.name,
        autocomplete: "off", autocapitalize: "words", spellcheck: false, autocorrect: "off", maxLength: 40,
        oninput: e => { r.name = e.target.value; suggest(r, e.target, box); },
        onpaste: e => { e.preventDefault(); toast("Paste is disabled for security reasons. Whose security? Unclear.", "bad"); },
        onkeydown: e => { if (e.key === "Enter") e.target.parentNode.querySelector(".in-age").focus(); },
      });
      return h("div", { class: "pax-row" + (t.badRows.has(r.uid) ? " bad" : "") },
        h("span", { class: "pax-n", text: i + 1 }), input,
        h("input", {
          class: "in in-age", type: "text", inputMode: "numeric", placeholder: "Age", value: r.age, maxLength: 3,
          oninput: e => { r.age = e.target.value.replace(/\D/g, ""); e.target.value = r.age; },
          onkeydown: e => { if (e.key === "Enter" && i === t.rows.length - 1) next(); },
        }),
        h("div", { class: "gseg" }, ["M", "F"].map(g =>
          h("button", {
            class: "g" + (r.g === g ? " on" : ""), text: g,
            onclick: e => {
              r.g = g;
              sfx.click();
              for (const b of e.currentTarget.parentNode.children) b.classList.toggle("on", b === e.currentTarget);
            },
          }))),
        t.rows.length > 1 ? h("button", {
          class: "pax-x", text: "✕", title: "Remove",
          onclick: () => { if (r.seat) { r.seat.holder = null; r.seat = null; } t.rows = t.rows.filter(x => x !== r); paint(); },
        }) : h("span", { class: "pax-x" }),
        box);
    };
    paint();
    const bad = t.badRows.size > 0;
    if (!isPhone()) setTimeout(() => list.querySelector(bad ? ".pax-row.bad .in-name" : ".in-name")?.focus({ preventScroll: true }), 50);
    const addRow = () => {
      if (t.rows.length >= 6) { toast("Maximum 6 passengers per ticket. Rules are rules.", "bad"); return null; }
      const r = blankRow();
      t.rows.push(r);
      return r;
    };
    return h("div", {},
      h("div", { class: "step-head" },
        h("h2", { text: "Passenger details" }),
        h("small", { text: `${t.train.name} · ${o.kind === "air" ? "Economy" : t.cls + " " + (CLASS_LABEL[t.cls] || "")}` })),
      tipEl("pax"),
      t.prefilled && !bad && h("div", { class: "tip" }, h("b", { text: "EXCEL IMPORT " }), "The planner pre-filled everyone. There are mistakes in it. Check every name and age against the chat."),
      bad && h("div", { class: "alert", text: "Booking failed: highlighted details do not match the ID proof. Check the chat again, letter by letter. Ages too." }),
      list,
      h("div", { class: "row between wrap foot" },
        h("div", { class: "row wrap" },
          h("button", {
            class: "btn btn-ghost", text: "+ Add passenger",
            onclick: () => { if (addRow()) { paint(); list.lastChild.querySelector(".in-name").focus(); } },
          }),
          chaiBtn("Master List: fill one", () => {
            const p = o.pax.find(x => !t.rows.some(r => norm(r.name) === norm(x.name)));
            if (!p) return toast("Everyone is already entered. Enjoy the chai anyway.", "info");
            const r = t.rows.find(x => !norm(x.name)) || addRow();
            if (!r) return;
            Object.assign(r, { name: p.name, age: String(p.age), g: p.g });
            t.badRows.delete(r.uid);
            paint();
          })),
        h("button", { class: "btn", text: "Choose seats", onclick: next })));
  },

  // ---- 3. seat map ----------------------------------------------------------
  seats() {
    const o = S.o, t = S.t, L = LAYOUTS[o.layoutKey];
    const tray = h("div", { class: "tray" });
    const tabs = h("div", { class: "tabs" });
    const map = h("div", { class: "map lay-" + o.layoutKey, style: { "--cols": L.cols } });
    const frost = h("div", { class: "frost", hidden: true });
    const seatEls = new Map();
    const allSeats = () => o.coaches.flatMap(c => c.groups.flatMap(g => g.seats));
    const freeSeats = () => allSeats().filter(s => s.state === "free" && !s.holder);
    const firstName = r => r.name.trim().split(/\s+/)[0] || "?";
    const freeIn = c => c.groups.flatMap(g => g.seats).filter(s => s.state === "free" && !s.holder).length;
    if (!t.rows.some(r => r.uid === t.active && !r.seat)) t.active = t.rows.find(r => !r.seat)?.uid ?? null;

    const assign = seat => {
      if (seat.state === "booked") { sfx.bad(); return; }
      if (seat.holder) {
        const r = t.rows.find(x => x.uid === seat.holder);
        r.seat = null; seat.holder = null; t.active = r.uid;
        sfx.unseat();
        return paint();
      }
      const r = t.rows.find(x => x.uid === t.active) || t.rows.find(x => !x.seat);
      if (!r) return toast("Everyone has a seat. Tap a seat to free it.", "info");
      if (seat.quota === "ladies" && r.g !== "F") { sfx.bad(); return toast("Ladies quota berth. Only for female passengers.", "bad"); }
      if (seat.quota === "senior" && Number(r.age) < 60) { sfx.bad(); return toast("Senior citizen quota. Passenger must be 60+.", "bad"); }
      if (r.seat) r.seat.holder = null;
      r.seat = seat;
      seat.holder = r.uid;
      t.active = t.rows.find(x => !x.seat)?.uid ?? null;
      sfx.seat(); buzz(15);
      paint();
    };

    const seatSub = s => {
      const bits = [s.type];
      if (s.tags.includes("PWR")) bits.push("⚡");
      if (s.quota === "ladies") bits.push("♀");
      if (s.quota === "senior") bits.push("60+");
      return bits.join("");
    };

    const paint = () => {
      tray.replaceChildren(...t.rows.map(r => h("button", {
        class: "pchip" + (r.uid === t.active ? " on" : "") + (r.seat ? " set" : ""),
        onclick: () => { t.active = r.uid; sfx.click(); paint(); },
      }, h("b", { text: firstName(r) }), h("small", { text: `${r.age}${r.g}` }),
      h("span", { class: "pchip-seat", text: r.seat ? `${r.seat.coachName === "Cabin" ? "" : r.seat.coachName + "·"}${r.seat.label}${L.sides ? "" : " " + r.seat.type}` : "no seat" }))));

      tabs.hidden = o.coaches.length < 2;
      tabs.replaceChildren(...o.coaches.map(c => h("button", {
        class: "tab" + (c.index === t.coachTab ? " on" : ""),
        onclick: () => { t.coachTab = c.index; sfx.click(); paint(); },
      }, `${c.name} `, h("small", { text: `${freeIn(c)} free` }))));

      seatEls.clear();
      const coach = o.coaches[t.coachTab];
      map.replaceChildren(...coach.groups.map(g => h("div", { class: "grp" + (g.seats[0].tags.includes("EXIT") ? " exit" : "") + (g.wc ? " wc" : "") },
        h("div", { class: "grp-title" }, `${L.unit === "bay" ? "Bay" : "Row"} ${g.index + 1}`,
          g.wc && h("em", { class: "wc-tag", text: "🚽" }),
          g.seats[0].tags.includes("EXIT") && h("em", { text: "EXIT" }),
          g.seats[0].tags.includes("XL") && h("em", { class: "xl", text: "XL" })),
        h("div", { class: "grp-grid" }, g.seats.map(s => {
          const holder = s.holder && t.rows.find(r => r.uid === s.holder);
          const el = h("button", {
            class: `seat ${s.state}${holder ? " mine" : ""}${s.quota ? " q-" + s.quota : ""}`,
            style: { gridColumn: L.pos[s.slot][0], gridRow: L.pos[s.slot][1] },
            onclick: () => assign(s),
          }, h("b", { text: holder ? firstName(holder).slice(0, 5) : s.label }),
          h("small", { text: holder ? s.label + " " + seatSub(s) : seatSub(s) }));
          seatEls.set(s.id, el);
          return el;
        })))));
    };
    paint();

    // other users are booking too. Quota berths and reserved seats are out of their reach.
    const every = Math.max(900, (3000 - o.idx * 180) * (S.act === 2 ? 0.7 : 1));
    S.timers.push(setInterval(() => {
      const frozen = performance.now() < t.freezeUntil;
      frost.hidden = !frozen;
      if (frozen) { frost.textContent = `❄ Seats frozen for ${Math.ceil((t.freezeUntil - performance.now()) / 1000)}s`; return; }
      if (S.feverLeft > 0) { frost.hidden = false; frost.textContent = "FEVER: nobody can take your seats"; return; }
      const free = freeSeats().filter(s => !s.quota && !s.reserved);
      if (free.length <= t.rows.length + 2) return;
      const plain = free.filter(s => !s.planted);
      const pool = plain.length && (o.idx < 2 || wild.chance(0.72)) ? plain : free;
      const s = wild.pick(pool);
      s.state = "booked";
      const el = seatEls.get(s.id);
      if (el) { el.className = "seat booked stolen"; sfx.steal(); }
      tabs.querySelectorAll(".tab small").forEach((sm, i) => { sm.textContent = `${freeIn(o.coaches[i])} free`; });
    }, every));

    const next = () => {
      if (t.rows.some(r => !r.seat)) { sfx.bad(); return toast("Every passenger needs a seat.", "bad"); }
      sfx.ok();
      go("review");
    };
    const lucky = () => {
      for (const r of t.rows.filter(x => !x.seat)) {
        const opts = freeSeats().filter(s => !s.quota);
        if (!opts.length) break;
        const s = wild.pick(opts);
        r.seat = s; s.holder = r.uid;
      }
      t.active = null;
      sfx.seat();
      paint();
    };

    const air = o.kind === "air";
    return h("div", {},
      h("div", { class: "step-head" },
        h("h2", { text: L.sides ? "Pick seats" : "Pick berths" }),
        h("small", { text: "Tap a passenger, then tap a seat. Other users are booking right now." })),
      tipEl("seats"), tray,
      h("div", { class: "coach" + (air ? " plane" : "") },
        h("div", { class: "coach-head" },
          h("b", { class: "coach-name", text: air ? "✈ CABIN" : "🚃 COACH" }), tabs, frost),
        h("div", { class: "legend" },
          h("span", {}, h("i", { class: "lg free" }), "Free"), h("span", {}, h("i", { class: "lg booked" }), "Booked"),
          h("span", {}, h("i", { class: "lg mine" }), "Yours"),
          !air && h("span", {}, h("i", { class: "lg q-ladies" }), "Ladies ♀"),
          !air && h("span", {}, h("i", { class: "lg q-senior" }), "Senior 60+"),
          !air && h("span", { text: "⚡ charging" }), h("span", { text: "🚽 near toilet" })),
        map,
        h("p", { class: "hint", text: L.sides
          ? "W window · M middle · A aisle" + (air ? " · XL rows have extra legroom · Nobody aged 60+ in the EXIT row" : "")
          : "LB lower · MB middle · UB upper · SL side lower · SU side upper · other users cannot take quota berths" })),
      h("div", { class: "row between wrap foot" },
        h("div", { class: "row wrap" },
          h("button", { class: "btn btn-ghost", text: "Let the system decide (it hates you)", onclick: lucky }),
          chaiBtn("Freeze seats for 20s", () => { t.freezeUntil = performance.now() + 20000; frost.hidden = false; frost.textContent = "❄ Seats frozen for 20s"; })),
        h("button", { class: "btn", text: "Review booking", onclick: next })));
  },

  // ---- 4. review, add-ons, captcha -----------------------------------------
  review() {
    const o = S.o, t = S.t;
    const fareEl = h("b", { text: inr(totalFare()) });
    let cap;
    const capBox = h("div", { class: "cap-box" });
    const waived = () => capBox.replaceChildren(h("div", { class: "cap waived" }, h("div", { class: "cap-q", text: "☕ Captcha waived" }), h("small", { text: "The chaiwala knows a guy in IT." })));
    const fresh = () => { cap = makeCaptcha(o.idx, submit); capBox.replaceChildren(cap.el); };
    const submit = () => {
      if (!t.capSkip && !cap.check()) {
        sfx.bad(); buzz(40);
        toast("Invalid captcha. Please try again. And again.", "bad");
        fresh();
        cap.focus?.();
        return;
      }
      const bad = checkIds();
      if (bad.size || bad.missing) {
        t.idFails++;
        t.badRows = bad;
        S.streak = 0;
        sfx.bad(); buzz([40, 30, 40]);
        if (bad.missing && !bad.size) toast(`Booking failed: the customer asked for ${o.size} ticket${o.size > 1 ? "s" : ""}.`, "bad");
        paintHud();
        return go("pax", false);
      }
      t.badRows = new Set();
      sfx.ok();
      go("pay");
    };
    if (t.capSkip) waived(); else fresh();

    return h("div", {},
      h("div", { class: "step-head" }, h("h2", { text: "Review and verify" }), h("small", { text: "Last chance to notice your own mistakes." })),
      tipEl("review"),
      h("div", { class: "card summary" },
        h("div", { class: "row between" }, h("b", { text: t.train.name }), h("span", { text: o.kind === "air" ? "Economy" : t.cls })),
        h("small", { text: `${o.from.n} ${fmtTod(t.train.dep)} → ${o.to.n} ${fmtTod(t.train.arr)}` }),
        h("table", {}, t.rows.map(r => h("tr", {},
          h("td", { text: r.name.trim() }), h("td", { text: `${r.age} ${r.g}` }),
          h("td", { class: "right", text: `${r.seat.coachName === "Cabin" ? "" : r.seat.coachName + " · "}${r.seat.label} ${r.seat.type}` }))))),
      o.addons && h("div", { class: "card addons" },
        h("div", { class: "addons-title", text: "Recommended for you (by our revenue team)" }),
        o.addons.options.map(a => h("label", { class: "addon" },
          h("input", {
            type: "checkbox", checked: t.addons.has(a.id),
            onchange: e => { e.target.checked ? t.addons.add(a.id) : t.addons.delete(a.id); fareEl.textContent = inr(totalFare()); sfx.click(); },
          }),
          h("span", { text: a.label }), h("em", { text: a.price ? "+" + inr(a.price) + (a.id === "ins" ? " (ok, 45 paise)" : "") : "free" })))),
      capBox,
      h("div", { class: "row between wrap foot" },
        h("div", { class: "row wrap" },
          h("div", { class: "fare" }, h("small", { text: "Total fare" }), fareEl),
          !t.capSkip && chaiBtn("Skip the captcha", () => { t.capSkip = true; waived(); })),
        h("button", { class: "btn", text: "Proceed to pay", onclick: submit })));
  },

  // ---- 5. payment -------------------------------------------------------------
  pay() {
    const o = S.o, t = S.t, fare = totalFare();
    if (!t.pay) {
      const dip = Math.min(18, o.idx * 2) + (S.act === 2 ? 8 : 0);
      t.pay = {
        rates: { upi: wild.int(48, 80) - dip, card: wild.int(52, 85) - dip, nb: wild.int(82, 95) - dip },
        wallet: wild.chance(0.4) ? fare + wild.int(40, 900) : wild.int(12, Math.max(13, fare - 20)),
        down: o.idx >= 2 && wild.chance(0.5) ? wild.pick(["upi", "card", "nb"]) : null,
      };
    }
    const P = t.pay;
    const methods = [
      { id: "upi", icon: "📲", name: "PhataPhat UPI", desc: "Approve on your phone. Be quick." },
      { id: "card", icon: "💳", name: "Rupiya Card", desc: "OTP arrives by SMS. Eventually." },
      { id: "nb", icon: "🏦", name: "State Bank of Intezaar", desc: "Net banking. Slow but steady." },
      { id: "wallet", icon: "👛", name: "JhatkaWallet", desc: `Balance ${inr(P.wallet)}. Instant.` },
    ];
    const body = h("div", { class: "pay-body" });
    const banner = h("div", { class: "alert", hidden: true });
    const blessed = h("div", { class: "tip", hidden: !t.sifarish }, h("b", { text: "☕ SIFARISH " }), "Someone made a call. Your next payment will go through.");
    let meters = {};

    const menu = () => {
      meters = {};
      body.replaceChildren(h("div", { class: "pay-grid" }, methods.map(m => {
        const down = P.down === m.id;
        const rate = h("span", { class: "rate" });
        const bar = h("i");
        if (m.id !== "wallet" && !down) meters[m.id] = { rate, bar };
        return h("button", { class: "pay-m card" + (down ? " down" : ""), disabled: down, onclick: () => FLOW[m.id]() },
          h("span", { class: "pay-ic", text: m.icon }),
          h("span", { class: "pay-txt" }, h("b", { text: m.name }),
            h("small", { text: down ? "Under maintenance. Back by 2047." : m.desc }),
            m.id !== "wallet" && !down && h("span", { class: "meter" }, bar), m.id !== "wallet" && !down && rate));
      })));
      paintRates();
    };
    const paintRates = () => {
      for (const [id, m] of Object.entries(meters)) {
        m.rate.textContent = `Success rate right now: ${P.rates[id]}%`;
        m.bar.style.width = P.rates[id] + "%";
        m.bar.className = P.rates[id] >= 75 ? "hi" : P.rates[id] >= 55 ? "mid" : "lo";
      }
    };
    S.timers.push(setInterval(() => {
      for (const id of Object.keys(P.rates)) P.rates[id] = Math.min(97, Math.max(18, P.rates[id] + wild.int(-9, 9)));
      paintRates();
    }, 1500));

    const id0 = S.runId, idx0 = S.idx;
    const ok = () => alive(id0, idx0) && S.step === "pay";
    const roll = id => t.sifarish || t.payTries >= 2 || wild.chance(P.rates[id] / 100);
    const processing = text => body.replaceChildren(h("div", { class: "processing" }, h("div", { class: "spinner" }), h("p", { text }), h("small", { text: "Do not press back or refresh." })));

    const settle = success => {
      if (!ok()) return;
      if (success) { sfx.cash(); return finishTicket(); }
      t.payTries++;
      sfx.bad(); buzz(60);
      banner.hidden = false;
      banner.textContent = "Payment failed. " + wild.pick(PAY_FAILS);
      if (o.idx >= 3 && !t.seatLost && wild.chance(0.25)) {
        t.seatLost = true;
        const r = wild.pick(t.rows);
        const lost = r.seat;
        lost.state = "booked"; lost.holder = null; r.seat = null;
        const close = openModal(h("div", { class: "modal modal-err" },
          h("h3", { text: "Seat released" }),
          h("p", { text: `While your payment was failing, ${lost.coachName === "Cabin" ? "seat" : lost.coachName + " berth"} ${lost.label} was booked by someone faster. ${r.name.trim().split(" ")[0]} needs a new seat.` }),
          h("button", { class: "btn", text: "Pick again", onclick: () => { close(); if (ok()) go("seats", false); } })));
        return;
      }
      menu();
    };

    const FLOW = {
      async wallet() {
        sfx.click();
        processing("Opening JhatkaWallet...");
        await sleep(500);
        if (!ok()) return;
        if (P.wallet >= fare) return settle(true);
        t.payTries = Math.max(0, t.payTries - 1); // reading the balance was your job
        settle(false);
        banner.textContent = `Payment failed. Insufficient balance: ${inr(P.wallet)} for a ${inr(fare)} ticket. Reading is a skill.`;
      },
      async nb() {
        sfx.click();
        const win = roll("nb");
        processing("Redirecting to State Bank of Intezaar...");
        await sleep(3200);
        settle(win);
      },
      upi() {
        sfx.click();
        const win = roll("upi");
        processing("Waiting for approval on your phone...");
        let left = 55;
        const bar = h("div", { class: "bar" }, h("i"));
        const btns = [
          h("button", { class: "btn", text: "Approve", onclick: () => finish(true) }),
          h("button", { class: "btn btn-ghost", text: "Decline", onclick: () => finish(false) }),
        ];
        if (wild.chance(0.5)) btns.reverse();
        const close = openModal(h("div", { class: "modal modal-phone" },
          h("small", { text: "PHATAPHAT UPI" }), h("h3", { text: `Pay ${inr(fare)}?` }),
          h("p", { text: "To: RailJhatka eTicketing (parody) Ltd." }), h("div", { class: "row" }, btns), bar));
        const sp = wild.pick(SPAM);
        notify({ from: sp.from, text: sp.text, ms: 3500 });
        let done = false;
        let iv = 0;
        const finish = async (approved, timedOut) => {
          if (done) return;
          done = true;
          clearInterval(iv);
          close();
          if (!approved) { settle(false); if (ok()) banner.textContent = timedOut ? "Payment failed. UPI request timed out. It waited almost 6 whole seconds." : "Payment failed. You declined it yourself. Bold strategy."; return; }
          processing("Confirming with bank...");
          await sleep(900);
          settle(win);
        };
        iv = setInterval(() => {
          left--;
          bar.firstChild.style.width = (100 * left) / 55 + "%";
          if (left <= 0) finish(false, true);
        }, 100);
        S.timers.push(iv);
      },
      card() {
        sfx.click();
        const win = roll("card");
        let otp = "";
        const send = () => {
          otp = String(wild.int(1000, 9999));
          const code = otp;
          const spam = wild.shuffle(SPAM);
          setTimeout(() => ok() && notify({ from: spam[0].from, text: spam[0].text, ms: 4500 }), 500);
          setTimeout(() => ok() && notify({ from: "RUPIYA BANK", text: `${code} is your OTP for ${inr(fare)} at RailJhatka. Do not share it with anyone. Not even us.`, ms: 8000 }), wild.int(1300, 3200));
          if (wild.chance(0.6)) setTimeout(() => ok() && notify({ from: spam[1].from, text: spam[1].text, ms: 4500 }), wild.int(3400, 4300));
        };
        const input = h("input", {
          class: "in otp", type: "text", inputMode: "numeric", maxLength: 4, placeholder: "••••", autocomplete: "off",
          onkeydown: e => { if (e.key === "Enter") verify(); },
        });
        const verify = async () => {
          if (input.value.trim() !== otp) { sfx.bad(); input.value = ""; return toast("Wrong OTP. Look at your notifications.", "bad"); }
          processing("Verifying with Rupiya Bank...");
          await sleep(1000);
          settle(win);
        };
        body.replaceChildren(h("div", { class: "otp-box card" },
          h("b", { text: "Enter the OTP sent to ******" + wild.int(1000, 9999) }),
          h("small", { text: "Watch your notifications." }), input,
          h("div", { class: "row" },
            h("button", { class: "btn btn-ghost", text: "Resend OTP", onclick: () => { send(); toast("OTP resent. The old one is dead now.", "info"); } }),
            h("button", { class: "btn btn-ghost", text: "Back", onclick: menu }),
            h("button", { class: "btn", text: "Verify", onclick: verify }))));
        input.focus();
        send();
      },
    };

    menu();
    return h("div", {},
      h("div", { class: "step-head" },
        h("h2", {}, "Pay ", inr(fare)),
        h("small", { text: "Pick wisely. Gateways fail. Success rates keep changing." })),
      tipEl("pay"), blessed, banner, body,
      h("div", { class: "row foot" }, !t.sifarish && chaiBtn("Sifarish: payment cannot fail", () => { t.sifarish = true; blessed.hidden = false; })));
  },
};

function totalFare() {
  const t = S.t, o = S.o;
  let sum = t.train.fares[t.cls] * t.rows.length;
  if (o.addons) for (const a of o.addons.options) if (t.addons.has(a.id)) sum += a.price * (a.id === "ins" || a.id === "don" ? 1 : t.rows.length);
  return sum;
}

// Match what was typed against the customer's list, like a TTE with an ID card.
function checkIds() {
  const o = S.o, t = S.t;
  const bad = new Set();
  const everyone = [...o.pax, ...(o.toddler ? [o.toddler] : [])];
  const used = new Set();
  for (const r of t.rows) {
    const p = everyone.find(x => norm(x.name) === norm(r.name) && !used.has(x.id));
    if (!p || Number(r.age) !== p.age || r.g !== p.g) { bad.add(r.uid); r.pax = null; continue; }
    used.add(p.id);
    r.pax = p;
  }
  bad.missing = o.pax.some(p => !used.has(p.id));
  return bad;
}

// ---------------------------------------------------------------------------
// ticket result

function ticketMults() {
  const o = S.o;
  const m = [];
  if (o.vip) m.push({ label: "VIP customer (2x)", mul: 2 });
  if (o.boss) m.push({ label: "The baraat made it (2x)", mul: 2 });
  if (S.act === 3 && !o.boss) m.push({ label: "Premium Tatkal (1.25x)", mul: 1.25 });
  if (S.feverLeft > 0) m.push({ label: "Tatkal Fever (2x)", mul: 2 });
  if (S.left <= 60 && !o.boss) m.push({ label: "Last minute rush (1.5x)", mul: 1.5 });
  const product = m.reduce((p, x) => p * x.mul, 1);
  return product > 3 ? [{ label: `Bonuses: ${m.map(x => x.label.split(" (")[0]).join(" + ")} (capped at 3x)`, mul: 3 }] : m;
}

function finishTicket() {
  clearStepTimers();
  const o = S.o, t = S.t;
  S.paused = true;
  const mults = ticketMults();
  const res = scoreTicket(o, { train: t.train, cls: t.cls, rows: t.rows, addons: t.addons, secs: t.secs, idFails: t.idFails, streak: S.streak, mults });

  // what a flawless booking of this same customer would have paid, at this speed
  const seats = new Map(o.coaches.flatMap(c => c.groups.flatMap(g => g.seats)).map(s => [s.id, s]));
  const ideal = scoreTicket(o, {
    train: o.trains.find(x => x.correct), cls: o.cls, rows: o.pax.map(p => ({ pax: p, seat: seats.get(p.plant) })),
    addons: new Set(o.addons ? o.addons.want : []), secs: t.secs, idFails: 0, streak: S.streak, mults,
  });
  const possible = Math.max(ideal.total, res.total);

  S.score = Math.max(0, S.score + res.total);
  S.tickets++;
  S.streak = res.streak;
  S.bestStreak = Math.max(S.bestStreak, S.streak);
  S.ticketSecs.push(t.secs);
  let earnedChai = false;
  if (res.perfect) {
    S.perfect++;
    if (S.chai < MAX_CHAI) { S.chai++; earnedChai = true; }
  }
  S.log.push(res.grade === "great" ? "🟩" : res.grade === "ok" ? "🟨" : "🟥");
  const fever = res.perfect && S.streak % 3 === 0 && S.feverLeft <= 0 && !S.overtime;
  for (const r of t.rows) r.seat.state = "booked";
  localStorage.setItem("tatkal_played", "1");
  paintHud();
  scorePop(res.total);
  S.step = "result";
  paintStepper();
  closeBrief();
  document.getElementById("phone").replaceChildren();
  sfx.print();
  setTimeout(() => { sfx.stamp(); buzz(30); if (res.perfect) confetti(); }, 520);

  const pnr = `${wild.int(200, 899)}-${wild.int(1000000, 9999999)}`;
  const id = S.runId, idx = S.idx;
  let moved = false;
  let iv = 0;
  const next = () => {
    if (moved || !alive(id, idx)) return;
    moved = true;
    clearInterval(iv);
    document.removeEventListener("keydown", onKey);
    S.paused = false;
    if (fever) startFever();
    toLobby();
  };
  const onKey = e => { if (e.key === "Enter") { e.preventDefault(); next(); } };
  setTimeout(() => document.addEventListener("keydown", onKey), 500);
  const autoBar = h("i");
  let left = 100;
  iv = setInterval(() => { left -= 1; autoBar.style.width = left + "%"; if (left <= 0) next(); }, 110);

  const pct = possible > 0 ? Math.max(0, Math.round((100 * res.total) / possible)) : 0;
  S.ui.step.replaceChildren(h("div", { class: "result" },
    h("div", { class: "printer" },
      h("div", { class: "ticket " + res.grade },
        h("div", { class: "ticket-top" },
          h("div", {}, h("small", { text: "PNR" }), h("b", { class: "mono", text: pnr })),
          h("div", { class: "stamp", text: res.perfect ? "PERFECT" : res.grade === "bad" ? "CNF, SOMEHOW" : "CNF" })),
        h("div", { class: "ticket-route" }, h("b", { text: o.kind === "air" ? o.from.a : o.from.r }), h("span", { text: o.kind === "air" ? "✈" : "🚆" }), h("b", { text: o.kind === "air" ? o.to.a : o.to.r })),
        h("small", { text: `${t.train.name} · ${t.rows.length} passenger${t.rows.length > 1 ? "s" : ""}` }),
        h("ul", { class: "lines" }, res.lines.map((l, i) => h("li", { class: l.kind, style: { animationDelay: 500 + 70 * i + "ms" } },
          h("span", { text: l.label }), h("b", { text: l.pts > 0 ? "+" + l.pts : l.pts === 0 ? "0" : String(l.pts) })))),
        h("div", { class: "ticket-total" },
          h("div", {}, h("span", { text: "Ticket total" }), h("small", { text: res.perfect ? "Nothing left on the table" : `${pct}% of the ${possible} possible` })),
          h("b", { text: (res.total > 0 ? "+" : "") + res.total })),
        h("div", { class: "gauge" }, h("i", { style: { width: pct + "%" } })))),
    h("div", { class: "react" }, h("span", { class: "av", text: o.persona.av }), h("div", { class: "bubble", text: wild.pick(REACT[res.grade]) })),
    earnedChai && h("div", { class: "tip center", text: "☕ Perfect ticket. You earned a chai." }),
    fever && h("div", { class: "tip center fever-tip", text: "Three perfect in a row. TATKAL FEVER starts when you continue: 60 seconds of 2x." }),
    h("button", { class: "btn btn-go", onclick: next }, S.overtime ? "See the final chart" : "Back to the waiting room", h("span", { class: "auto" }, autoBar)),
    h("small", { class: "muted center", text: "Clock is paused. Breathe." })));
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------------------
// end of run

function endRun() {
  if (!S || S.over) return;
  S.over = true;
  clearStepTimers();
  clearOverlay();
  document.getElementById("phone").replaceChildren();
  if (!announceVoice("vo_closed")) sfx.over();
  document.body.classList.remove("in-game", "at-home", "fever");
  document.querySelectorAll(".announce").forEach(x => x.remove());
  localStorage.setItem("tatkal_played", "1");
  const run = S;
  const scale = run.mode === "express" ? 0.3 : 1;
  const ladder = TITLES.map(x => ({ ...x, min: Math.round(x.min * scale) }));
  let at = 0;
  ladder.forEach((x, i) => { if (run.score >= x.min) at = i; });
  const title = ladder[at].t;
  const nextTitle = ladder[at + 1];
  const prevBest = board.getLocalBest(run.mode);
  let name = board.getSavedName();
  const avg = run.ticketSecs.length ? Math.round(run.ticketSecs.reduce((a, b) => a + b, 0) / run.ticketSecs.length) : 0;

  const shareText = () => {
    const d = new Date();
    return [
      `🚂 Tatkal Rush · ${MODES[run.mode].label} · ${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`,
      `${run.tickets} tickets · ${run.score} pts · ${title}`,
      run.log.join("") || "WL forever",
      location.href.split("#")[0],
    ].join("\n");
  };
  const card = () => makeShareCard({ score: run.score, title, tickets: run.tickets, perfect: run.perfect, streak: run.bestStreak, log: run.log, mode: MODES[run.mode].label });
  const share = async () => {
    const text = shareText();
    try {
      const blob = await card();
      const file = new File([blob], "tatkal-rush.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text });
    } catch { /* fall back to text */ }
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => toast("Result copied. Go brag.", "info"), () => toast("Could not copy.", "bad"));
  };
  const saveImage = async () => {
    const blob = await card();
    const a = h("a", { href: URL.createObjectURL(blob), download: "tatkal-rush.png" });
    document.body.append(a);
    a.click();
    a.remove();
    toast("Result card saved.", "info");
  };

  const boardBox = h("div", { class: "board-list" });
  const input = h("input", { class: "stub-in", type: "text", maxLength: 16, placeholder: "YOUR NAME", value: name, autocomplete: "off", spellcheck: false });
  const saveBtn = h("button", { class: "stub-btn", text: "Put me on the chart" });
  let saved = false;
  const paintBoard = async () => {
    const { rows, remote } = await board.fetchBoard(run.mode, "today");
    const me = rows.findIndex(r => r.name === name && r.score === run.score);
    boardBox.replaceChildren(boardTable(rows, me), h("div", { class: "chart-note", text: remote ? "*** TODAY, GLOBAL ***" : "*** TODAY, THIS DEVICE ***" }));
  };
  saveBtn.onclick = async () => {
    if (saved) return;
    const clean = board.cleanName(input.value);
    if (!clean) return toast("Name: 2 to 16 letters, numbers, dot or underscore.", "bad");
    name = clean;
    saved = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    board.saveName(clean);
    board.saveLocalRun({ name: clean, score: run.score, tickets: run.tickets, mode: run.mode, at: Date.now() });
    await board.submitScore({ name: clean, score: run.score, tickets: run.tickets, perfect: run.perfect, mode: run.mode });
    saveBtn.textContent = "On the chart ✓";
    input.disabled = true;
    paintBoard();
  };

  const field = (label, value) => h("div", { class: "jt-f" }, h("small", { text: label }), h("b", { text: value }));
  const GRADE = { "🟩": ["g", "PERFECT"], "🟨": ["y", "OK"], "🟥": ["r", "MESSY"], "⬛": ["k", "LOST"], "🟦": ["b", "QUICK JOB"] };
  const frac = nextTitle ? (at + Math.min(1, (run.score - ladder[at].min) / (nextTitle.min - ladder[at].min))) / (ladder.length - 1) : 1;
  const d = new Date();
  const dateStr = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
  const isBest = run.score > prevBest && run.score > 0;
  const headline = h("b", { class: "eb-title" });
  document.body.classList.add("at-end");

  view.replaceChildren(h("div", { class: "endwrap" },
    h("section", { class: "end-scene" },
      h("div", { class: "end-board" },
        h("small", { text: run.left <= 0 ? "PLATFORM 1 · ANNOUNCEMENT" : "PLATFORM 1 · RUN ENDED EARLY" }), headline,
        h("span", { text: `${MODES[run.mode].label.toUpperCase()} · ${run.tickets} TICKET${run.tickets === 1 ? "" : "S"} ISSUED` }))),
    h("section", { class: "jt" },
      h("div", { class: "jt-main" },
        h("div", { class: "jt-strip" }, h("b", { text: "RAILJHATKA" }), h("span", { text: "TATKAL RESERVATION SLIP" }), h("span", { text: `PNR ${wild.int(200, 899)}-${wild.int(1000000, 9999999)}` })),
        h("div", { class: "jt-top" },
          h("div", { class: "jt-score" }, h("small", { text: "POINTS EARNED" }), h("b", { text: String(run.score) })),
          h("div", { class: "jt-class" }, h("small", { text: "CLASS OF AGENT" }), h("b", { text: title }),
            h("small", { text: `${MODES[run.mode].label.toUpperCase()} · ${dateStr} · QUOTA TQ` }))),
        h("div", { class: "route" },
          h("div", { class: "route-line" }, h("i", { class: "route-fill", style: { width: frac * 100 + "%" } }),
            ladder.map((x, i) => h("span", { class: "stn" + (i <= at ? " done" : ""), style: { left: (100 * i) / (ladder.length - 1) + "%" }, title: `${x.t} (${x.min})` })),
            h("span", { class: "route-you", style: { left: frac * 100 + "%" } })),
          h("div", { class: "route-labels" },
            h("span", {}, h("small", { text: "LAST STATION" }), title),
            nextTitle ? h("span", { class: "right" }, h("small", { text: `NEXT STATION · ${nextTitle.min - run.score} PTS AWAY` }), nextTitle.t)
              : h("span", { class: "right" }, h("small", { text: "END OF THE LINE" }), "Railways should hire you"))),
        h("div", { class: "jt-fields" },
          field("TICKETS", run.tickets), field("PERFECT", run.perfect), field("BEST STREAK", run.bestStreak),
          field("AVG / TICKET", avg ? avg + "s" : "0"), field("QUICK JOBS", run.quick), field("CUSTOMERS LOST", run.lost + run.skips)),
        h("div", { class: "jt-log" }, h("small", { text: "CUSTOMERS SERVED, IN ORDER" }),
          h("div", { class: "punches" }, run.log.length
            ? run.log.map((e, i) => h("i", { class: "punch " + GRADE[e][0], title: `#${i + 1} ${GRADE[e][1]}`, text: i + 1 }))
            : h("span", { class: "jt-none", text: "NOBODY. WL FOREVER." }))),
        h("div", { class: "ink red", text: run.left <= 0 ? "QUOTA CLOSED" : "RUN ENDED" }),
        isBest && h("div", { class: "ink blue", text: "PERSONAL BEST" }),
        h("div", { class: "round-stamp", html: roundStamp(d) })),
      h("div", { class: "jt-stub" },
        h("small", { text: "COUNTERFOIL · PASTE ON COACH" }),
        h("b", { class: "stub-score", text: String(run.score) }),
        run.score > 0
          ? h("label", { class: "stub-form" }, h("small", { text: "NAME OF AGENT (FOR THE CHART)" }), input, saveBtn)
          : h("p", { class: "jt-none", text: "NO POINTS, NO CHART. THE FAMILY GROUP MUST NEVER KNOW." }))),
    h("div", { class: "end-actions" },
      h("button", { class: "btn btn-go", onclick: () => startRun(run.mode) }, "Book again", h("span", { class: "go-arrow", text: "→" })),
      h("div", { class: "end-links" },
        h("button", { text: "Share result", onclick: share }),
        h("button", { text: "Save image", onclick: saveImage }),
        h("button", { text: "Home", onclick: renderHome }))),
    h("section", { class: "chart-paper end-chart" },
      h("div", { class: "chart-head" }, h("div", {}, h("b", { text: "RESERVATION CHART" }), h("small", { text: "TODAY · " + MODES[run.mode].label.toUpperCase() }))), boardBox)));
  flapText(headline, run.left <= 0 ? "TATKAL QUOTA CLOSED" : "BOOKING COUNTER SHUT");
  paintBoard();
  window.scrollTo({ top: 0 });
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

// the booking office date stamp, text set around the ring
function roundStamp(d) {
  const date = `${pad2(d.getDate())} ${d.toLocaleString("en", { month: "short" }).toUpperCase()} ${d.getFullYear()}`;
  return `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg"><defs><path id="ring" d="M70 70 m-52 0 a52 52 0 1 1 104 0 a52 52 0 1 1 -104 0"/></defs>
    <circle cx="70" cy="70" r="66" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="70" cy="70" r="40" fill="none" stroke="currentColor" stroke-width="2"/>
    <text font-size="13.5"><textPath href="#ring" textLength="318" lengthAdjust="spacing">RAILJHATKA BOOKING OFFICE ★ TATKAL ★</textPath></text>
    <text x="70" y="66" text-anchor="middle" font-size="15" letter-spacing="1">${date}</text>
    <text x="70" y="84" text-anchor="middle" font-size="11" letter-spacing="2">PAID</text></svg>`;
}

// split-flap style reveal: characters rattle before they settle
function flapText(el, text) {
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let n = 0;
  const iv = setInterval(() => {
    n++;
    el.textContent = [...text].map((ch, i) => (ch === " " || i < n - 3 ? ch : glyphs[Math.floor(Math.random() * glyphs.length)])).join("");
    if (n > text.length + 3) { clearInterval(iv); el.textContent = text; }
  }, 38);
}

// ---------------------------------------------------------------------------
// boot

const ticker = document.getElementById("ticker-in");
ticker.textContent = [...TICKER, ...TICKER].join("   ✦   ");
const muteBtn = document.getElementById("mute");
const paintMute = () => { muteBtn.textContent = isMuted() ? "🔇" : "🔊"; };
muteBtn.onclick = () => { toggleMute(); paintMute(); };
paintMute();
document.getElementById("logo").onclick = () => { if (!S || S.over) renderHome(); };

if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// test hook for automated playthroughs: local development only, never on the public site
if (["localhost", "127.0.0.1"].includes(location.hostname)) window.__tatkal = {
  get S() { return S; }, generateOrder, scoreTicket, go, makeShareCard,
  jump(level, opts = {}) {
    clearOverlay();
    S.paused = false;
    const order = generateOrder(`${S.seed}-j${S.idx}-${level}`, level, { serial: level, ...opts });
    serve({ kind: "booking", boss: !!opts.boss, token: S.token++, order, persona: order.persona, wait: 0, patience: order.patience, est: 0 });
  },
  toLobby, serve, startFever, announce, makeArrival,
  finish: () => finishTicket(),
};

renderHome();
