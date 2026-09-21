// Generates thousands of orders and checks the planted seating is always
// bookable and always scores as a perfect ticket. Run: node scripts/selftest.mjs
import { generateOrder } from "../js/gen.js";
import { scoreTicket } from "../js/score.js";

let n = 0, fails = 0;
const amended = {};
const totals = [];
for (let seed = 0; seed < 300; seed++) {
  for (let idx = 0; idx < 15; idx++) {
    // the 15th is the boss baraat; the others mimic waiting-room levels with their own serials
    const o = idx === 14 ? generateOrder("seed" + seed, 9, { boss: true }) : generateOrder("seed" + seed, idx, { serial: (idx * 3 + seed) % 17 });
    if (idx === 14 && (o.size !== 6 || !o.feud || !o.couple || o.kind !== "rail")) { fails++; console.log(seed, "boss malformed", o.size, !!o.feud, !!o.couple); }
    n++;
    if (o.amend) { amended[o.amend.kind] = (amended[o.amend.kind] || 0) + 1; o.amend.apply(); }
    const seats = new Map(o.coaches.flatMap(c => c.groups.flatMap(g => g.seats)).map(s => [s.id, s]));
    const rows = o.pax.map(p => ({ pax: p, seat: seats.get(p.plant) }));
    const problems = [];
    if (rows.some(r => !r.seat || r.seat.state !== "free")) problems.push("planted seat not free");
    if (new Set(rows.map(r => r.seat?.id)).size !== rows.length) problems.push("duplicate plant");
    const right = o.trains.filter(t => t.correct);
    if (right.length !== 1) problems.push("correct trains: " + right.length);
    const t = right[0];
    if (t.avail[o.cls].t !== "AVL" || t.avail[o.cls].n < o.size) problems.push("correct train not bookable");
    // the condition must really single out the correct train among bookable ones
    const open = o.trains.filter(x => x.avail[o.cls].t === "AVL" && x.avail[o.cls].n >= o.size);
    const c = o.cond;
    const ok = x => c.type === "arriveBefore" ? x.arr < c.X : c.type === "departAfter" ? x.dep > c.X
      : c.type === "fastest" ? x.dur === Math.min(...open.map(y => y.dur))
      : c.type === "cheapest" ? x.fares[o.cls] === Math.min(...open.map(y => y.fares[o.cls]))
      : c.type === "combo" ? x.arr < c.X && x.fares[o.cls] === Math.min(...open.filter(y => y.arr < c.X).map(y => y.fares[o.cls])) : true;
    const winners = open.filter(ok);
    if (winners.length !== 1 || winners[0] !== t) problems.push(`cond ${c.type} winners=${winners.map(w => w.id)}`);
    const res = scoreTicket(o, { train: t, cls: o.cls, rows, addons: new Set(o.addons ? o.addons.want : []), secs: 9999, idFails: 0, streak: 0 });
    if (!res.perfect) problems.push("plant not perfect: " + res.lines.filter(l => l.kind !== "good").map(l => l.label).join(" | "));
    if (typeof o.chat.at(-1) !== "string" || o.chat.some(m => typeof m === "string" && /undefined|##|—/.test(m))) problems.push("chat text");
    totals.push(res.total);
    if (problems.length) { fails++; if (fails < 15) console.log(seed, idx, o.layoutKey, o.size, problems); }
  }
}
totals.sort((a, b) => a - b);
console.log("amendments:", amended);
console.log(`${n} orders, ${fails} failed. perfect-ticket total (no speed/streak): min ${totals[0]} median ${totals[n >> 1]} max ${totals.at(-1)}`);
process.exit(fails ? 1 : 0);
