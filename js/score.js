// Ticket scoring. Returns the receipt lines shown on the result screen.

import { adjacent, LAYOUTS } from "./gen.js";
import { fmtTod } from "./util.js";

// run: { train, cls, rows: [{ pax, seat }], addons: Set, secs, idFails, streak, mults: [{ label, mul }] }
export function scoreTicket(order, run) {
  const lines = [];
  let flawed = false;
  const add = (label, pts, kind) => {
    lines.push({ label, pts, kind: kind || (pts > 0 ? "good" : pts < 0 ? "bad" : "meh") });
    if (pts < 0 || kind === "meh") flawed = true;
  };
  const unit = LAYOUTS[order.layoutKey].unit;
  const booked = run.rows.filter(r => !r.pax.free);
  const seatOf = id => run.rows.find(r => r.pax.id === id)?.seat;
  const first = n => n.split(" ")[0];

  add(`${booked.length} confirmed ${booked.length > 1 ? "tickets" : "ticket"}`, booked.length * 10);

  for (const r of run.rows.filter(r => r.pax.free)) {
    add(`${r.pax.name} is under 5 and travels free. You bought a berth.`, -5);
  }

  // train choice
  const okTrain = run.train.correct;
  const okClass = run.cls === order.cls;
  if (okTrain && okClass) add("Right train, right class", 10);
  if (!okTrain) add(wrongTrainReason(order), -10);
  if (!okClass) add(`Wrong class. They asked for ${order.cls}, you booked ${run.cls}`, -10);

  // individual needs
  for (const r of booked) {
    const { pax, seat } = r;
    if (pax.need) {
      const hit = seat.tags.includes(pax.need.tag);
      const want = needName(pax.need.tag);
      if (pax.need.hard) add(hit ? `${first(pax.name)} got the ${want} they need` : `${first(pax.name)} (${pax.age}) needed ${want}, got ${seat.type}`, hit ? 10 : -10);
      else add(hit ? `${first(pax.name)} got ${want}` : `${first(pax.name)} wanted ${want}, got ${seat.type}`, hit ? 5 : 0, hit ? "good" : "meh");
    }
    if (seat.tags.includes("EXIT") && pax.age >= 60) add(`${first(pax.name)} (${pax.age}) cannot sit in the exit row`, -10);
  }

  // group rules
  const sameGroup = (a, b) => a.coach === b.coach && a.group === b.group;
  if (order.couple) {
    const [a, b] = order.couple.map(seatOf);
    const ok = LAYOUTS[order.layoutKey].sides
      ? adjacent(order.layoutKey, a, b)
      : sameGroup(a, b) && a.tags.includes("SIDE") && b.tags.includes("SIDE");
    add(ok ? "The couple got their seats together" : "The couple got separated", ok ? 15 : 0, ok ? "good" : "meh");
  }
  if (order.feud) {
    const [a, b] = order.feud.map(seatOf);
    const apart = !sameGroup(a, b);
    add(apart ? "Feuding relatives kept apart" : `Feuding relatives share a ${unit}. Chaos.`, apart ? 15 : -15);
  }
  if (booked.length >= 2) {
    const withCompany = booked.filter(r => booked.some(o => o !== r && sameGroup(o.seat, r.seat))).length;
    if (withCompany) add(`${withCompany} of ${booked.length} seated with family`, withCompany * 10);
    if (withCompany < booked.length && !order.feud) add(`${booked.length - withCompany} sitting alone`, 0, "meh");
    const allOne = booked.every(r => sameGroup(r.seat, booked[0].seat));
    if (allOne && !order.feud) add(`Full house: everyone in one ${unit}`, 10);
  }

  if (order.avoidWC) {
    const smelly = booked.filter(r => r.seat.tags.includes("WC")).length;
    add(smelly ? `${smelly} seated next to the toilet` : "Nobody next to the toilet", smelly ? -5 * smelly : 5);
  }

  // add-ons
  if (order.addons) {
    const want = new Set(order.addons.want);
    const wrong = order.addons.options.filter(a => want.has(a.id) !== run.addons.has(a.id));
    if (!wrong.length) add("Add-ons exactly as asked", 5);
    for (const a of wrong) add(want.has(a.id) ? `Forgot to add: ${a.label}` : `Nobody asked for: ${a.label}`, -5);
  }

  if (run.idFails) add(`ID mismatch ${run.idFails > 1 ? "x" + run.idFails : ""}`.trim(), -5 * run.idFails);

  let subtotal = lines.reduce((s, l) => s + l.pts, 0);
  if (subtotal > 0 && run.secs < order.par) {
    const bonus = Math.round(25 * (1 - run.secs / order.par));
    if (bonus > 0) {
      lines.push({ label: `Speed bonus (${Math.round(run.secs)}s, par ${order.par}s)`, pts: bonus, kind: "good" });
      subtotal += bonus;
    }
  }

  const perfect = !flawed;
  const streak = perfect ? run.streak + 1 : 0;
  let total = subtotal;
  if (perfect && streak >= 2 && subtotal > 0) {
    const mul = Math.min(2, 1 + (streak - 1) * 0.1);
    const extra = Math.round(subtotal * (mul - 1));
    lines.push({ label: `Perfect streak x${streak} (${mul.toFixed(1)}x)`, pts: extra, kind: "good" });
    total += extra;
  }
  for (const m of run.mults || []) {
    if (total <= 0) break;
    const extra = Math.round(total * (m.mul - 1));
    lines.push({ label: m.label, pts: extra, kind: "good" });
    total += extra;
  }
  const negatives = lines.filter(l => l.pts < 0).length;
  const grade = perfect ? "great" : negatives >= 2 || total <= 0 ? "bad" : "ok";
  return { lines, total, perfect, streak, grade };
}

function needName(tag) {
  return { LOWER: "a lower berth", UB: "an upper berth", MB: "a middle berth", SU: "side upper", PWR: "a charging point", W: "a window seat", A: "an aisle seat", XL: "extra legroom" }[tag] || tag;
}

function wrongTrainReason(order) {
  const c = order.cond;
  const v = order.kind === "air" ? "flight" : "train";
  switch (c.type) {
    case "arriveBefore": return `Wrong ${v}. They had to arrive before ${fmtTod(c.X)}`;
    case "departAfter": return `Wrong ${v}. They could only leave after ${fmtTod(c.X)}`;
    case "fastest": return `Wrong ${v}. A faster one had seats`;
    case "cheapest": return `Wrong ${v}. A cheaper one had seats`;
    case "combo": return `Wrong ${v}. They wanted the cheapest one arriving before ${fmtTod(c.X)}`;
    default: return `Wrong ${v}`;
  }
}
