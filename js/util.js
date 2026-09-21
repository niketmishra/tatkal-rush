// Small shared helpers: seeded RNG, DOM builder, formatters.

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Wraps an rng function with the usual conveniences.
export function dice(rng = Math.random) {
  const d = {
    f: rng,
    int: (a, b) => a + Math.floor(rng() * (b - a + 1)),
    pick: arr => arr[Math.floor(rng() * arr.length)],
    chance: p => rng() < p,
    shuffle: arr => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  return d;
}

export const wild = dice();

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (v === false && (!(k in el) || k === "text" || k.startsWith("on"))) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k in el && k !== "list" && k !== "form") el[k] = v;
      else el.setAttribute(k, v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const pad2 = n => String(n).padStart(2, "0");
export const fmtTod = mins => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
};
export const fmtDur = mins => `${Math.floor(mins / 60)}h ${pad2(mins % 60)}m`;
export const fmtClock = secs => {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
};
export const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
export const norm = s => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
export const sleep = ms => new Promise(r => setTimeout(r, ms));
