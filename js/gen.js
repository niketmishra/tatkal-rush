// Order generator. Every customer is built backwards from a planted perfect
// seating, so a full-marks answer always exists when the order opens.

import { mulberry32, hashStr, dice, fmtTod } from "./util.js";
import {
  CELEBS, TODDLERS, PERSONAS, VIP_PERSONA, CITIES, TRAIN_NAMES, AIRLINES, CLASS_LABEL,
  BOSS_PERSONA, ADDONS_RAIL, ADDONS_AIR, NEED_TEXT, FEUD_TEXT, COUPLE_TEXT_RAIL, COUPLE_TEXT_SEAT, NO_ADDON_TEXT, WC_TEXT,
} from "./data.js";

// pos maps slot index to [col, row] in the group's CSS grid.
// wc lists the groups that sit next to a toilet.
export const LAYOUTS = {
  "3T": {
    per: 8, groups: 4, coaches: 2, unit: "bay", wc: [0, 3],
    slots: ["LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"],
    pos: [[1, 3], [1, 2], [1, 1], [2, 3], [2, 2], [2, 1], [4, 3], [4, 1]],
    cols: "var(--seat) var(--seat) 12px var(--seat)",
    prefs: ["LOWER", "UB", "UB", "MB", "SU", "PWR"],
  },
  "2T": {
    per: 6, groups: 4, coaches: 2, unit: "bay", wc: [0, 3],
    slots: ["LB", "UB", "LB", "UB", "SL", "SU"],
    pos: [[1, 2], [1, 1], [2, 2], [2, 1], [4, 2], [4, 1]],
    cols: "var(--seat) var(--seat) 12px var(--seat)",
    prefs: ["LOWER", "UB", "SU", "PWR"],
  },
  CC: {
    per: 5, groups: 6, coaches: 2, unit: "row", wc: [0, 5],
    slots: ["W", "M", "A", "A", "W"],
    pos: [[1, 1], [2, 1], [3, 1], [5, 1], [6, 1]],
    cols: "repeat(3, var(--seat)) 22px repeat(2, var(--seat))",
    sides: [[0, 1, 2], [3, 4]],
    prefs: ["W", "A", "PWR"],
  },
  AIR: {
    per: 6, groups: 10, coaches: 1, unit: "row", wc: [9],
    slots: ["W", "M", "A", "A", "M", "W"],
    pos: [[1, 1], [2, 1], [3, 1], [5, 1], [6, 1], [7, 1]],
    cols: "repeat(3, var(--seat)) 22px repeat(3, var(--seat))",
    sides: [[0, 1, 2], [3, 4, 5]],
    prefs: ["W", "A"],
  },
};

const CLASS_LAYOUT = { SL: "3T", "3A": "3T", "2A": "2T", CC: "CC", ECO: "AIR" };
const COACH_PREFIX = { SL: "S", "3A": "B", "2A": "A", CC: "C", ECO: "" };
const BASE_FARE = { SL: 520, "3A": 1380, "2A": 1990, CC: 890, "2S": 240, EC: 1720, ECO: 5200 };
const XL_ROWS = [0, 4];
const EXIT_ROW = 4;

function seatLabel(layoutKey, g, slot) {
  const L = LAYOUTS[layoutKey];
  if (layoutKey === "AIR") return `${g + 1}${"ABCDEF"[slot]}`;
  return String(g * L.per + slot + 1);
}

export function adjacent(layoutKey, a, b) {
  const L = LAYOUTS[layoutKey];
  if (!L.sides || a.coach !== b.coach || a.group !== b.group) return false;
  return L.sides.some(s => s.includes(a.slot) && s.includes(b.slot)) && Math.abs(a.slot - b.slot) === 1;
}

// idx is the difficulty level. opts.serial (defaults to idx) drives the
// flight / VIP rhythm, so the waiting room can raise difficulty without
// turning every customer into a VIP. opts.boss builds the finale baraat.
export function generateOrder(seed, idx, opts = {}) {
  const D = dice(mulberry32(hashStr(`${seed}#${idx}`)));
  const serial = opts.serial ?? idx;
  const boss = !!opts.boss;
  const kind = !boss && serial > 0 && serial % 4 === 3 ? "air" : "rail";
  const vip = !boss && idx >= 4 && serial % 5 === 4;

  const roll = () => D.int(2, Math.min(6, 3 + Math.floor(idx / 2)));
  let size = idx === 0 ? 1 : idx === 1 ? 2 : idx === 2 ? 3 : idx >= 5 ? Math.max(roll(), roll()) : roll();
  if (boss) size = 6;
  const cls = boss ? D.pick(["SL", "3A"]) : kind === "air" ? "ECO" : idx < 2 ? "3A" : D.pick(["SL", "3A", "3A", "2A", "CC"]);
  const layoutKey = CLASS_LAYOUT[cls];
  const L = LAYOUTS[layoutKey];
  if (layoutKey === "CC") size = Math.min(size, 5);
  if (layoutKey === "AIR" || vip) size = Math.min(size, 4);

  // charging points are scattered over rail coaches
  const pwr = new Set();
  if (kind === "rail") {
    for (let c = 0; c < L.coaches; c++) for (let g = 0; g < L.groups; g++) for (let s = 0; s < L.per; s++) {
      if (D.chance(0.28)) pwr.add(`${c}-${g}-${s}`);
    }
  }
  const tagsOf = (c, g, s) => {
    const t = L.slots[s];
    const tags = [t];
    if (t === "LB" || t === "SL") tags.push("LOWER");
    if (t === "SL" || t === "SU") tags.push("SIDE");
    if (layoutKey === "AIR" && XL_ROWS.includes(g)) tags.push("XL");
    if (layoutKey === "AIR" && g === EXIT_ROW) tags.push("EXIT");
    if (L.wc.includes(g)) tags.push("WC");
    if (pwr.has(`${c}-${g}-${s}`)) tags.push("PWR");
    return tags;
  };

  // ---- passengers -------------------------------------------------------
  // most parties bring at least one internet celebrity along
  const pool = D.shuffle(CELEBS);
  if (D.chance(0.65) && !pool.slice(0, size).some(c => c.m)) {
    const k = pool.findIndex(c => c.m);
    const slot = D.int(0, size - 1);
    [pool[slot], pool[k]] = [pool[k], pool[slot]];
  }
  const pax = pool.slice(0, size).map((c, i) => ({
    id: "p" + i, name: c.n, real: c.r, g: c.g, age: D.int(21, 56), need: null, free: false,
  }));

  const seniors = [];
  if (idx >= 2 && (D.chance(0.6) || boss)) {
    const p = D.pick(pax);
    p.age = D.int(61, 84);
    seniors.push(p);
  }

  let tall = null;
  if (layoutKey === "AIR" && D.chance(0.4)) {
    tall = D.pick(pax.filter(p => !seniors.includes(p))) || null;
  }

  // ---- where the perfect answer lives ------------------------------------
  const coach = D.int(0, L.coaches - 1);
  let avoidWC = idx >= 2 && size >= 2 && (D.chance(0.35) || boss);
  const pickHome = () => {
    const all = [...Array(L.groups - 1).keys()];
    return all.filter(g => {
      const pair = [g, g + 1];
      if (layoutKey === "AIR" && tall && !(seniors.length ? g === 0 : XL_ROWS.includes(g))) return false;
      if (layoutKey === "AIR" && seniors.length && pair.includes(EXIT_ROW)) return false;
      if (avoidWC && pair.some(x => L.wc.includes(x))) return false;
      return true;
    });
  };
  let homes = pickHome();
  if (!homes.length) { avoidWC = false; homes = pickHome(); }
  const g0 = D.pick(homes);
  const g1 = g0 + 1;

  const open = { [g0]: [...Array(L.per).keys()], [g1]: [...Array(L.per).keys()] };
  const take = (g, test) => {
    const i = open[g].findIndex(s => test(s, tagsOf(coach, g, s)));
    if (i < 0) return null;
    return { g, slot: open[g].splice(i, 1)[0] };
  };
  const home = new Map(pax.map(p => [p.id, g0]));
  const plant = new Map();

  // couple first: they need a specific pair of seats
  let couple = null;
  const free4couple = pax.filter(p => !seniors.includes(p) && p !== tall);
  if (idx >= 1 && free4couple.length >= 2 && (D.chance(idx === 1 ? 0.6 : 0.4) || boss)) {
    const [a, b] = D.shuffle(free4couple);
    let sa, sb;
    if (L.sides) {
      const side = D.pick(L.sides);
      const k = D.int(0, side.length - 2);
      sa = take(g0, s => s === side[k]);
      sb = take(g0, s => s === side[k + 1]);
    } else {
      sa = take(g0, (s, t) => t.includes("SL"));
      sb = take(g0, (s, t) => t.includes("SU"));
    }
    if (sa && sb) {
      couple = [a.id, b.id];
      plant.set(a.id, sa);
      plant.set(b.id, sb);
    }
  }

  // feud: B moves to the neighbouring bay, with a friend if the party is big
  let feud = null;
  const free4feud = pax.filter(p => !plant.has(p.id) && p !== tall);
  if (idx >= 3 && size >= 3 && free4feud.length >= 2 && (D.chance(0.5) || boss)) {
    const [a, b, c] = D.shuffle(free4feud);
    feud = [a.id, b.id];
    home.set(b.id, g1);
    if (size >= 4 && c && !seniors.includes(c)) home.set(c.id, g1);
  }

  // hard needs, then soft preferences, then everyone else
  for (const p of seniors) {
    const tag = L.sides ? "A" : "LOWER";
    const s = take(home.get(p.id), (_, t) => t.includes(tag) && !t.includes("EXIT"));
    if (s) {
      plant.set(p.id, s);
      p.need = { tag, hard: true, text: D.pick(NEED_TEXT[tag === "A" ? "AISLE_HARD" : "LOWER_HARD"]) };
    }
  }
  if (tall) {
    const s = take(home.get(tall.id), (_, t) => t.includes("XL"));
    if (s) {
      plant.set(tall.id, s);
      tall.need = { tag: "XL", hard: false, text: D.pick(NEED_TEXT.XL) };
    }
  }
  const prefChance = Math.min(0.85, 0.5 + idx * 0.04);
  for (const p of pax) {
    if (plant.has(p.id)) continue;
    if (idx === 0 || D.chance(prefChance)) {
      const tag = D.pick(L.prefs);
      const s = take(home.get(p.id), (_, t) => t.includes(tag));
      if (s) {
        plant.set(p.id, s);
        p.need = { tag, hard: false, text: D.pick(NEED_TEXT[tag]) };
      }
    }
  }
  for (const p of pax) {
    if (plant.has(p.id)) continue;
    const g = home.get(p.id);
    const s = take(g, () => true) || take(g === g0 ? g1 : g0, () => true);
    plant.set(p.id, s);
  }

  // toddler: present in the chat, must NOT be booked (under 5 travels free)
  let toddler = null;
  if (kind === "rail" && idx >= 3 && size >= 2 && D.chance(0.4) && !boss) {
    const t = D.pick(TODDLERS);
    toddler = { id: "t0", name: t.n, g: t.g, age: D.int(1, 4), need: null, free: true };
  }

  // ---- seat map -----------------------------------------------------------
  const density = Math.min(0.7, 0.44 + idx * 0.035);
  const planted = new Set([...plant.values()].map(s => `${coach}-${s.g}-${s.slot}`));
  const coaches = [];
  const byId = new Map();
  for (let c = 0; c < L.coaches; c++) {
    const name = layoutKey === "AIR" ? "Cabin" : `${COACH_PREFIX[cls]}${c + 1 + (idx % 3)}`;
    const groups = [];
    for (let g = 0; g < L.groups; g++) {
      const seats = [];
      for (let s = 0; s < L.per; s++) {
        const id = `${c}-${g}-${s}`;
        const isPlant = planted.has(id);
        const seat = {
          id, coach: c, group: g, slot: s, coachName: name,
          label: seatLabel(layoutKey, g, s), type: L.slots[s], tags: tagsOf(c, g, s),
          state: isPlant || !D.chance(density) ? "free" : "booked",
          quota: null, planted: isPlant, reserved: false, holder: null,
        };
        if (seat.state === "free" && !isPlant && kind === "rail" && idx >= 2 && D.chance(0.2)) {
          seat.quota = D.pick(["ladies", "senior"]);
        }
        seats.push(seat);
        byId.set(id, seat);
      }
      groups.push({ index: g, wc: L.wc.includes(g), seats });
    }
    coaches.push({ index: c, name, groups });
  }
  for (const p of pax) {
    const s = plant.get(p.id);
    p.plant = `${coach}-${s.g}-${s.slot}`;
    // quota berths cannot be taken by general users: a safe harbour for those who qualify
    if (kind === "rail" && idx >= 2 && !(couple || []).includes(p.id)) {
      if (p.age >= 60 && D.chance(0.5)) byId.get(p.plant).quota = "senior";
      else if (p.g === "F" && D.chance(0.3)) byId.get(p.plant).quota = "ladies";
    }
  }

  // ---- route, trains, add-ons, chat ---------------------------------------
  const [from, to] = D.shuffle(CITIES);
  const search = makeSearch(D, kind, cls, size, idx);

  let addons = null;
  if (idx >= 1) {
    const pool = D.shuffle(kind === "air" ? ADDONS_AIR : ADDONS_RAIL).slice(0, 3);
    const askable = pool.filter(a => a.ask);
    const want = idx >= 2 && askable.length && D.chance(0.4) ? [D.pick(askable).id] : [];
    const preticked = pool.filter(() => D.chance(0.55)).map(a => a.id);
    if (!preticked.length && !want.length) preticked.push(pool[0].id);
    addons = { options: pool, want, preticked };
  }

  const persona = boss ? BOSS_PERSONA : vip ? VIP_PERSONA : D.pick(PERSONAS);
  const par = boss ? 150 : 36 + size * 24;
  const order = {
    idx, serial, boss, kind, cls, layoutKey, size, vip, pax, toddler, couple, feud, avoidWC, coaches,
    from, to, persona, addons, par, patience: boss ? 190 : Math.round(par * (vip ? 1.3 : 1.9)),
    trains: search.trains, cond: search.cond,
  };
  order.chat = buildChat(D, order);
  order.amend = boss ? null : planAmendment(D, order, byId);
  return order;
}

// ---------------------------------------------------------------------------
// The customer changes their mind mid-booking. Planned here so the perfect
// answer stays reachable; applied by the game a few seconds into a later step.

function planAmendment(D, o, byId) {
  if (o.idx < 2 || !D.chance(0.5)) return null;
  const L = LAYOUTS[o.layoutKey];
  const first = p => p.name.split(" ")[0];
  const delay = D.int(3500, 9000);
  for (const kind of D.shuffle(["age", "pref", "addon"])) {
    if (kind === "age") {
      const p = D.pick(o.pax);
      const old = p.age;
      let na = old;
      while (na === old) na = old >= 60 ? D.int(60, 88) : D.int(18, 58);
      return {
        kind, step: D.pick(["pax", "seats"]), delay,
        text: `Arre sorry sorry! ${first(p)} ki age ${na} hai, ${old} nahi. ID pe ${na} likhi hai.`,
        apply: () => { p.age = na; },
      };
    }
    if (kind === "pref") {
      const movable = D.shuffle(o.pax.filter(p => p.need && !p.need.hard && p.need.tag !== "XL" && !(o.couple || []).includes(p.id)));
      for (const p of movable) {
        const here = byId.get(p.plant);
        for (const tag of D.shuffle(L.prefs.filter(t => t !== p.need.tag))) {
          const seat = [...byId.values()].find(s => s.coach === here.coach && s.group === here.group && !s.planted && s.tags.includes(tag) && !s.tags.includes(p.need.tag));
          if (!seat) continue;
          seat.state = "free";
          seat.quota = null;
          seat.planted = true;
          seat.reserved = true;
          const text = D.pick(NEED_TEXT[tag]);
          return {
            kind, step: "seats", delay,
            text: `${first(p)} ka mood badal gaya. Ab bol ${p.g === "F" ? "rahi" : "rahe"} hain: ${text} Pehle wala cancel.`,
            apply: () => { p.need = { tag, hard: false, text }; p.plant = seat.id; },
          };
        }
      }
    }
    if (kind === "addon" && o.addons && !o.addons.want.length) {
      const a = o.addons.options.find(x => x.ask);
      if (a) {
        return {
          kind, step: D.pick(["seats", "review"]), delay,
          text: `Ek cheez bhool gaya! ${a.ask}`,
          apply: () => { o.addons.want = [a.id]; },
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------

function makeSearch(D, kind, cls, size, idx) {
  const air = kind === "air";
  const types = ["arriveBefore", "departAfter", "fastest", "cheapest"];
  if (idx >= 4) types.push("combo", "combo");
  const type = idx === 0 ? "any" : D.pick(types);
  const classes = air ? ["ECO"] : cls === "CC" ? ["2S", "CC", "EC"] : ["SL", "3A", "2A"];
  const r5 = (a, b) => Math.round(D.int(a, b) / 5) * 5;
  const baseDur = air ? r5(85, 190) : r5(7 * 60, 14 * 60);
  const dist = D.int(80, 125) / 100;
  const v = air ? "flight" : "train";
  let X = 0;
  let text = "Koi bhi train chalegi, bas confirm seat honi chahiye.";

  // [T*, D1 (tempting but full), D2 (open but wrong), D3 (open but wrong)]
  const rows = [0, 1, 2, 3].map(() => ({
    dep: air ? r5(5 * 60, 20 * 60) : r5(16 * 60, 23 * 60),
    dur: Math.max(60, baseDur + r5(-60, 60)),
    fareMul: D.int(95, 125) / 100,
  }));
  const setArr = (row, arr) => { row.dep = arr - row.dur; };
  const arrX = () => (air ? D.pick([10, 12, 14, 16, 18]) : D.pick([7, 8, 9, 10])) * 60;

  if (type === "arriveBefore") {
    X = arrX();
    setArr(rows[0], X - r5(15, 90));
    setArr(rows[1], X - r5(10, 120));
    setArr(rows[2], X + r5(10, 120));
    setArr(rows[3], X + r5(30, 200));
    text = air
      ? `${fmtTod(X)} baje se PEHLE land karna hai. Meeting hai.`
      : `Kal subah ${fmtTod(X)} se PEHLE pahunchna hai. Uske baad ki train mat lena.`;
  } else if (type === "departAfter") {
    X = air ? D.pick([9, 11, 13, 15, 17]) * 60 : D.pick([18, 19, 20, 21]) * 60;
    rows[0].dep = X + r5(15, 120);
    rows[1].dep = X + r5(10, 150);
    rows[2].dep = X - r5(10, 120);
    rows[3].dep = X - r5(30, 200);
    text = air
      ? `${fmtTod(X)} ke BAAD ki flight chahiye. Usse pehle free nahi hain.`
      : `Office ke baad niklenge. ${fmtTod(X)} ke BAAD chhootne wali train chahiye.`;
  } else if (type === "fastest") {
    rows[0].dur = baseDur;
    rows[1].dur = Math.max(45, baseDur - r5(air ? 15 : 30, air ? 40 : 120));
    rows[2].dur = baseDur + r5(air ? 10 : 15, air ? 60 : 180);
    rows[3].dur = baseDur + r5(air ? 20 : 40, air ? 90 : 240);
    text = `Sabse FAST ${v} chahiye jisme confirm seat mile.`;
  } else if (type === "cheapest") {
    rows[0].fareMul = 1;
    rows[1].fareMul = 0.84;
    rows[2].fareMul = D.int(106, 128) / 100;
    rows[3].fareMul = D.int(112, 150) / 100;
    text = `Sabse SASTI ${v} jisme confirm seat mile. Ek rupaya extra nahi.`;
  } else if (type === "combo") {
    // on time AND cheapest among the on-time ones
    X = arrX();
    setArr(rows[0], X - r5(15, 90)); rows[0].fareMul = 1;
    setArr(rows[1], X - r5(10, 120)); rows[1].fareMul = 0.82; // cheaper, on time, but full
    setArr(rows[2], X + r5(10, 150)); rows[2].fareMul = 0.88; // cheaper, open, but late
    setArr(rows[3], X - r5(10, 100)); rows[3].fareMul = D.int(112, 140) / 100; // on time, open, pricier
    text = air
      ? `${fmtTod(X)} se PEHLE land karna hai, aur un flights mein jo SABSE SASTI ho.`
      : `Kal subah ${fmtTod(X)} se PEHLE pahunchna hai, aur un trains mein jo SABSE SASTI ho.`;
  }

  const names = D.shuffle(air ? AIRLINES : TRAIN_NAMES);
  const trains = rows.map((row, i) => {
    const avail = {};
    const fares = {};
    for (const c of classes) {
      fares[c] = Math.round((BASE_FARE[c] * dist * row.fareMul) / 5) * 5;
      const r = D.f();
      avail[c] = r < 0.5 ? { t: "AVL", n: D.int(2, 40) } : r < 0.85 ? { t: "WL", n: D.int(3, 140) } : { t: "RAC", n: D.int(1, 30) };
    }
    if (i === 0) avail[cls] = { t: "AVL", n: D.int(size + 3, size + 14), floor: size };
    else if (i === 1) avail[cls] = D.chance(0.7) ? { t: "WL", n: D.int(12, 160) } : { t: "REGRET", n: 0 };
    else if (type === "any") avail[cls] = i === 2 ? { t: "RAC", n: D.int(2, 20) } : { t: "WL", n: D.int(5, 99) };
    else avail[cls] = { t: "AVL", n: D.int(size + 2, size + 30), floor: i === 3 ? size : undefined };
    const dep = ((row.dep % 1440) + 1440) % 1440;
    return {
      id: "t" + i, correct: i === 0,
      name: air ? names[i % names.length].n : names[i],
      no: air ? `${names[i % names.length].c}-${D.int(101, 989)}` : String(D.int(11001, 22989)),
      dep, dur: row.dur, arr: (dep + row.dur) % 1440, nextDay: dep + row.dur >= 1440,
      fares, avail, classes,
    };
  });
  return { trains: D.shuffle(trains), cond: { type, X, text } };
}

function buildChat(D, o) {
  const unit = LAYOUTS[o.layoutKey].unit;
  const nm = id => o.pax.find(p => p.id === id).name;
  const n = o.size;
  const what = o.kind === "air" ? `${n} flight ticket${n > 1 ? "s" : ""}` : `${n} ticket${n > 1 ? "s" : ""}`;
  const msgs = [];
  msgs.push(o.persona.intro(what));
  msgs.push(
    o.kind === "air"
      ? `${o.from.n} (${o.from.a}) se ${o.to.n} (${o.to.a}). Flight se.`
      : `${o.from.n} (${o.from.r}) se ${o.to.n} (${o.to.r}). Class: ${o.cls} (${CLASS_LABEL[o.cls]}) hi chahiye.`
  );
  msgs.push(o.cond.text);

  const list = o.pax.map((p, i) => ({
    line: `${i + 1}. ${p.name}, ${p.age}, ${p.g}`,
    note: p.need ? p.need.text : null,
  }));
  msgs.push({ list });
  if (o.boss) msgs.push("Form maine Excel se bhar diya hai, par usme EK DO GALTIYAN ho sakti hain. Upar wali list sahi hai, usse mila lena.");
  if (o.toddler) {
    const f = o.toddler.g === "F";
    msgs.push(`Saath mein ${o.toddler.name} bhi hai, ${o.toddler.age} saal ${f ? "ki" : "ka"}. God mein baith ${f ? "jayegi" : "jayega"}.`);
  }
  if (o.couple) {
    const f = D.pick(LAYOUTS[o.layoutKey].sides ? COUPLE_TEXT_SEAT : COUPLE_TEXT_RAIL);
    msgs.push(f(nm(o.couple[0]), nm(o.couple[1])));
  }
  if (o.feud) msgs.push(D.pick(FEUD_TEXT)(nm(o.feud[0]), nm(o.feud[1])).replace("##UNIT##", unit));
  if (n >= 2 && !o.feud) msgs.push(`Sabko SAATH mein bithana, ek hi ${unit} mein.`);
  if (o.avoidWC) msgs.push(D.pick(WC_TEXT).replace("##UNIT##", unit));
  if (o.addons) {
    if (o.addons.want.length) msgs.push(o.addons.options.find(a => a.id === o.addons.want[0]).ask + " Baaki kuch nahi.");
    else if (D.chance(0.6)) msgs.push(D.pick(NO_ADDON_TEXT));
  }
  msgs.push(o.persona.outro);
  return msgs;
}
