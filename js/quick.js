// Quick jobs: 10 to 20 second customers who do not need a full booking.
// makeQuick() returns { type, title, persona, chat, pts, patience, render(done) }.
// render builds the task; it calls done(true | false) exactly once.

import { h, wild, fmtTod } from "./util.js";
import { CELEBS, PERSONAS, CITIES, TRAIN_NAMES } from "./data.js";
import { LAYOUTS } from "./gen.js";

const pnr = () => `${wild.int(200, 899)}-${wild.int(1000000, 9999999)}`;
const once = fn => { let used = false; return v => { if (!used) { used = true; fn(v); } }; };

// one digit changed, or two neighbours swapped: looks right at a glance
function nearMiss(p) {
  const d = p.split("");
  const spots = [...d.keys()].filter(i => d[i] !== "-");
  if (wild.chance(0.5)) {
    const i = wild.pick(spots);
    d[i] = String((Number(d[i]) + wild.int(1, 8)) % 10);
  } else {
    const i = wild.pick(spots.filter(x => d[x + 1] && d[x + 1] !== "-" && d[x + 1] !== d[x]));
    if (i == null) d[spots[0]] = String((Number(d[spots[0]]) + 1) % 10);
    else [d[i], d[i + 1]] = [d[i + 1], d[i]];
  }
  return d.join("");
}

const BUILD = {
  // ---- find the right PNR among lookalikes ------------------------------------
  pnr() {
    const target = pnr();
    const statuses = ["CNF B2 34", "CNF S5 61", "WL 12", "WL 47", "RAC 8", "CNF A1 17", "CANCELLED", "WL 103", "CNF B4 09"];
    const st = wild.shuffle(statuses);
    const set = new Set([target]);
    while (set.size < 4) set.add(nearMiss(target));
    while (set.size < 7) set.add(pnr());
    const rows = wild.shuffle([...set]).map((p, i) => ({ p, s: st[i] }));
    const answer = rows.find(r => r.p === target).s;
    return {
      title: "PNR status check", pts: 20, patience: 40,
      chat: [`Mera PNR ${target} hai.`, "Confirm hua ya nahi? Chart mein dekh ke meri wali row pe tap kar do. Dhyan se, number milte julte hain."],
      render(done) {
        const fin = once(done);
        return h("div", { class: "qj" },
          h("div", { class: "chart-paper qj-chart" },
            h("div", { class: "chart-head" }, h("div", {}, h("b", { text: "CURRENT STATUS CHART" }), h("small", { text: "Tap the customer's PNR" }))),
            h("ol", { class: "board" },
              h("li", { class: "board-head" }, h("span", { text: "S.NO" }), h("span", { text: "PNR" }), h("span"), h("span", { text: "STATUS" })),
              rows.map((r, i) => h("li", { class: "qj-row", onclick: () => fin(r.p === target) },
                h("span", { class: "rank", text: String(i + 1).padStart(2, "0") }), h("span", { class: "who", text: r.p }), h("span"), h("span", { class: "pts", text: r.s }))))),
          h("p", { class: "hint", text: `Looking for the status of one exact PNR. (It is ${answer.startsWith("CNF") ? "good" : "not great"} news, if that helps. It does not.)` }));
      },
    };
  },

  // ---- one field on the printed ticket is wrong ---------------------------------
  typo() {
    const c = wild.pick(CELEBS);
    const [from, to, other] = wild.shuffle(CITIES);
    const facts = { name: c.n, age: wild.int(21, 68), from: from.n, to: to.n, train: wild.pick(TRAIN_NAMES), cls: wild.pick(["SL", "3A", "2A"]), dep: fmtTod(wild.int(16, 23) * 60 + wild.pick([0, 15, 30, 45])) };
    const shown = { ...facts };
    const bad = wild.pick(["name", "age", "from", "cls", "dep"]);
    if (bad === "name") shown.name = c.r;
    if (bad === "age") shown.age = facts.age + wild.pick([-10, -3, -1, 1, 2, 10]);
    if (bad === "from") shown.from = other.n;
    if (bad === "cls") shown.cls = wild.pick(["SL", "3A", "2A"].filter(x => x !== facts.cls));
    if (bad === "dep") shown.dep = fmtTod(wild.int(16, 23) * 60 + wild.pick([5, 20, 40, 50]));
    const field = (key, label, fin) => h("button", { class: "qj-field", onclick: () => fin(key === bad) }, h("small", { text: label }), h("b", { text: String(shown[key]) }));
    return {
      title: "Spot the misprint", pts: 20, patience: 45,
      chat: ["Ticket print ho gaya, par usme EK cheez galat chhapi hai. TTE pakad lega.",
        `Sahi details: ${facts.name}, ${facts.age} saal. ${facts.from} se ${facts.to}. ${facts.train}, class ${facts.cls}, ${facts.dep} baje.`,
        "Jo galat hai uspe tap karo."],
      render(done) {
        const fin = once(done);
        return h("div", { class: "qj" },
          h("div", { class: "tkt qj-tkt" },
            h("div", { class: "tkt-head" }, h("b", { text: "JOURNEY CUM RESERVATION TICKET" }), h("span", { text: "PNR " + pnr() })),
            h("div", { class: "qj-fields" },
              field("name", "Passenger", fin), field("age", "Age", fin), field("cls", "Class", fin),
              field("from", "From", fin), field("to", "To", fin), field("dep", "Departure", fin), field("train", "Train", fin)),
            h("div", { class: "tkt-foot" }, h("span", { text: "HAPPY JOURNEY" }), h("span", { text: "One field does not match the chat. Tap it." }))));
      },
    };
  },

  // ---- dadi got an upper berth: swap her with family, not a stranger -------------
  swap() {
    const L = LAYOUTS["3T"];
    const fam = wild.shuffle(CELEBS).slice(0, 3).map(c => ({ name: c.n.split(" ")[0], full: c.n, age: wild.int(22, 50), fam: true }));
    fam[0].age = wild.int(68, 86);
    const lowers = [0, 3, 6], uppers = [1, 2, 4, 5, 7];
    const seats = Array(8).fill(null);
    const up = wild.shuffle(uppers);
    seats[up[0]] = fam[0];
    seats[wild.pick(lowers)] = fam[1];
    seats[up[1]] = fam[2];
    const state = { pick: null };
    return {
      title: "Berth swap", pts: 25, patience: 45,
      chat: [`${fam[0].full} (${fam[0].age}) ko ${L.slots[up[0]]} mil gayi hai. Unse upar nahi chadha jayega.`,
        `Humari family: ${fam.map(f => f.full).join(", ")}. Family mein hi kisi ki LOWER berth se swap kara do.`,
        "Strangers ko mat chhedna, woh ladne lagte hain. Do berth pe tap karo."],
      render(done) {
        const fin = once(done);
        const grid = h("div", { class: "grp-grid", style: { "--cols": L.cols } });
        const paint = () => grid.replaceChildren(...seats.map((p, s) => h("button", {
          class: "seat " + (p ? (p.fam ? "mine" : "booked") : "booked") + (state.pick === s ? " picked" : ""),
          style: { gridColumn: L.pos[s][0], gridRow: L.pos[s][1] },
          onclick: () => {
            if (state.pick == null) { state.pick = s; return paint(); }
            if (state.pick === s) { state.pick = null; return paint(); }
            const a = state.pick, b = s;
            const bothFam = seats[a]?.fam && seats[b]?.fam;
            [seats[a], seats[b]] = [seats[b], seats[a]];
            state.pick = null;
            paint();
            const dadi = seats.indexOf(fam[0]);
            setTimeout(() => fin(Boolean(bothFam) && lowers.includes(dadi)), 350);
          },
        }, h("b", { text: p && p.fam ? p.name.slice(0, 5) : "—" }), h("small", { text: `${s + 1} ${L.slots[s]}` }))));
        paint();
        return h("div", { class: "qj" },
          h("div", { class: "coach qj-coach" }, h("div", { class: "coach-head" }, h("b", { class: "coach-name", text: "BAY 4 · COACH S7" })),
            h("div", { class: "map lay-3T", style: { "--cols": L.cols } }, h("div", { class: "grp" }, grid)),
            h("p", { class: "hint", text: "Orange is the family. Grey is strangers. Tap two berths to swap them. One swap only." })));
      },
    };
  },

  // ---- cancel exactly one passenger, and there is a lookalike ---------------------
  cancel() {
    const picks = wild.shuffle(CELEBS).slice(0, 3);
    const target = { name: picks[0].n, age: wild.int(24, 60) };
    const rows = wild.shuffle([
      target,
      { name: picks[0].r, age: target.age + wild.pick([-4, -2, 3, 5]) },
      { name: picks[1].n, age: wild.int(20, 70) },
      { name: picks[2].n, age: wild.int(20, 70) },
    ]);
    return {
      title: "Cancel one passenger", pts: 20, patience: 40,
      chat: [`${target.name} (${target.age}) nahi aa raha. Office mein appraisal chal raha hai.`,
        "Sirf uska ticket cancel karna. Dhyan se: list mein ek milta julta naam bhi hai, woh alag aadmi hai."],
      render(done) {
        const fin = once(done);
        return h("div", { class: "qj" },
          h("div", { class: "tkt qj-tkt" },
            h("div", { class: "tkt-head" }, h("b", { text: "BOOKED TICKET · 4 PASSENGERS" }), h("span", { text: "PNR " + pnr() })),
            h("div", { class: "qj-list" }, rows.map((r, i) => h("div", { class: "qj-pax" },
              h("span", { text: `${i + 1}. ${r.name}, ${r.age}` }), h("small", { text: `CNF B${wild.int(1, 4)} ${wild.int(1, 64)}` }),
              h("button", { class: "qj-cancel", text: "Cancel", onclick: () => fin(r === target) })))),
            h("div", { class: "tkt-foot" }, h("span", { text: "NO REFUND ON REGRET" }), h("span", { text: "Cancel exactly one. There is no undo." }))));
      },
    };
  },
};

let lastType = null;
export function makeQuick() {
  const type = wild.pick(Object.keys(BUILD).filter(t => t !== lastType));
  lastType = type;
  return { type, persona: wild.pick(PERSONAS), ...BUILD[type]() };
}
