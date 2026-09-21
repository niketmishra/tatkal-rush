// Parody captchas. makeCaptcha(level, onEnter) returns { el, check() }.

import { h, wild } from "./util.js";

const EMOJI = [
  { e: "☕", name: "cups of chai" },
  { e: "🛺", name: "auto rickshaws" },
  { e: "🚂", name: "train engines" },
  { e: "🐄", name: "cows on the track" },
  { e: "🥭", name: "mangoes" },
  { e: "🥥", name: "coconuts" },
  { e: "🧳", name: "suitcases" },
  { e: "🐒", name: "monkeys stealing food" },
];
const WORDS = ["CHAI", "BERTH", "TATKAL", "COOLIE", "PANTRY", "SIGNAL", "ENGINE", "SAMOSA", "CHART", "BOGIE"];
const HINDI = ["", "ek", "do", "teen", "chaar", "paanch", "chhe", "saat", "aath", "nau", "dus"];

const ODD = [["🚃", "🚋"], ["😀", "😃"], ["🕐", "🕒"], ["🌕", "🌝"], ["👮", "💂"], ["🧳", "💼"], ["🚦", "🚥"]];
const TYPES = ["text", "math", "emoji", "reverse", "slider", "hindi", "count", "odd", "order"];

// Captchas get nastier as the run goes on (level is the customer number).
let lastType = null;
export function makeCaptcha(level = 1, onEnter) {
  let type = level <= 0 ? "tout" : wild.pick((level === 1 ? ["text", "math"] : TYPES).filter(t => t !== lastType));
  lastType = type;
  return BUILD[type](onEnter, level);
}

function textInput(onEnter, attrs = {}) {
  return h("input", {
    class: "cap-input", type: "text", autocomplete: "off", autocapitalize: "characters",
    spellcheck: false, placeholder: "Type here", ...attrs,
    onkeydown: e => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } },
  });
}

const BUILD = {
  tout() {
    const box = h("input", { type: "checkbox", id: "cap-tout" });
    const el = h("div", { class: "cap cap-tout" },
      h("label", { for: "cap-tout" }, box, h("span", { text: " I am not a tout" })),
      h("small", { text: "We believe you. For now." }));
    return { el, check: () => box.checked };
  },

  text(onEnter, level) {
    const chars = "ABCDEFGHJKMNPRTUVWXY346789";
    const len = level >= 5 ? 6 : 5;
    const code = Array.from({ length: len }, () => wild.pick(chars.split(""))).join("");
    const cv = h("canvas", { width: 220, height: 64, class: "cap-canvas" });
    const g = cv.getContext("2d");
    g.fillStyle = "#eef1f7";
    g.fillRect(0, 0, 220, 64);
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = `hsla(${wild.int(0, 360)},55%,45%,.55)`;
      g.lineWidth = wild.int(1, 2);
      g.beginPath();
      g.moveTo(wild.int(0, 220), wild.int(0, 64));
      g.bezierCurveTo(wild.int(0, 220), wild.int(0, 64), wild.int(0, 220), wild.int(0, 64), wild.int(0, 220), wild.int(0, 64));
      g.stroke();
    }
    [...code].forEach((ch, i) => {
      g.save();
      g.translate(24 + i * (len === 6 ? 34 : 40), 42 + wild.int(-6, 6));
      g.rotate((wild.int(-22, 22) * Math.PI) / 180);
      g.font = `${wild.pick(["bold", "italic bold"])} ${wild.int(30, 38)}px Georgia, serif`;
      g.fillStyle = `hsl(${wild.int(200, 260)},60%,${wild.int(18, 35)}%)`;
      g.fillText(ch, -10, 0);
      g.restore();
    });
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(20,30,80,${wild.f() * 0.5})`;
      g.fillRect(wild.int(0, 220), wild.int(0, 64), 2, 2);
    }
    const input = textInput(onEnter, { maxLength: len });
    const el = h("div", { class: "cap" }, h("div", { class: "cap-q", text: "Type the characters you think you see" }), cv, input);
    return { el, check: () => input.value.trim().toUpperCase() === code, focus: () => input.focus() };
  },

  math(onEnter, level) {
    const a = wild.int(3, 19), b = wild.int(2, 12);
    const minus = wild.chance(0.4) && a > b;
    const c = level >= 4 ? wild.int(2, 9) : 0;
    const ans = (minus ? a - b : a + b) + c;
    const input = textInput(onEnter, { inputMode: "numeric", maxLength: 3 });
    const el = h("div", { class: "cap" },
      h("div", { class: "cap-q", text: "Prove you passed Class 2" }),
      h("div", { class: "cap-big", text: `${a} ${minus ? "−" : "+"} ${b}${c ? " + " + c : ""} = ?` }), input);
    return { el, check: () => Number(input.value.trim()) === ans && input.value.trim() !== "", focus: () => input.focus() };
  },

  hindi(onEnter) {
    const a = wild.int(1, 10), b = wild.int(1, 10);
    const input = textInput(onEnter, { inputMode: "numeric", maxLength: 3 });
    const el = h("div", { class: "cap" },
      h("div", { class: "cap-q", text: "Answer in digits" }),
      h("div", { class: "cap-big", text: `${HINDI[a]} + ${HINDI[b]} = ?` }), input);
    return { el, check: () => Number(input.value.trim()) === a + b && input.value.trim() !== "", focus: () => input.focus() };
  },

  reverse(onEnter) {
    const w = wild.pick(WORDS);
    const input = textInput(onEnter, { maxLength: w.length });
    const el = h("div", { class: "cap" },
      h("div", { class: "cap-q", text: "Type this word BACKWARDS" }),
      h("div", { class: "cap-big cap-word", text: w }), input);
    return { el, check: () => input.value.trim().toUpperCase() === [...w].reverse().join(""), focus: () => input.focus() };
  },

  emoji(_, level) {
    const target = wild.pick(EMOJI);
    const others = EMOJI.filter(x => x !== target);
    const total = level >= 5 ? 12 : 9;
    const count = wild.int(2, total === 12 ? 5 : 4);
    const cells = wild.shuffle([
      ...Array(count).fill(target.e),
      ...Array.from({ length: total - count }, () => wild.pick(others).e),
    ]);
    const picked = new Set();
    const grid = h("div", { class: "cap-grid" }, cells.map((e, i) =>
      h("button", {
        type: "button", class: "cap-cell", text: e,
        onclick: ev => {
          picked.has(i) ? picked.delete(i) : picked.add(i);
          ev.currentTarget.classList.toggle("on", picked.has(i));
        },
      })));
    if (total === 12) grid.classList.add("wide");
    const el = h("div", { class: "cap" }, h("div", { class: "cap-q", text: `Select all ${target.name}` }), grid);
    return { el, check: () => cells.every((e, i) => (e === target.e) === picked.has(i)) };
  },

  slider(_, level) {
    const tol = level >= 4 ? 3 : 5;
    const target = wild.int(25, 88);
    const train = h("div", { class: "cap-train", text: "🚂" });
    const range = h("input", {
      type: "range", min: 0, max: 100, value: 0, class: "cap-range",
      oninput: e => { train.style.left = e.target.value + "%"; },
    });
    const track = h("div", { class: "cap-track" },
      h("div", { class: "cap-platform", style: { left: target + "%" }, text: "🚉" }), train);
    const el = h("div", { class: "cap" }, h("div", { class: "cap-q", text: "Park the engine at the platform" }), track, range);
    return { el, check: () => Math.abs(Number(range.value) - target) <= tol };
  },

  count(onEnter, level) {
    const target = wild.pick(EMOJI);
    const others = EMOJI.filter(x => x !== target);
    const n = wild.int(3, level >= 5 ? 8 : 6);
    const items = wild.shuffle([...Array(n).fill(target.e), ...Array.from({ length: wild.int(6, 9) }, () => wild.pick(others).e)]);
    // jittered 6 x 3 grid so nothing hides behind anything else
    const cells = wild.shuffle([...Array(18).keys()]);
    const field = h("div", { class: "cap-field" }, items.map((e, i) =>
      h("span", { text: e, style: {
        left: (cells[i] % 6) * 16 + 2 + wild.int(0, 4) + "%", top: Math.floor(cells[i] / 6) * 31 + 3 + wild.int(0, 6) + "%",
        transform: `rotate(${wild.int(-40, 40)}deg)`,
      } })));
    const input = textInput(onEnter, { inputMode: "numeric", maxLength: 2 });
    const el = h("div", { class: "cap" }, h("div", { class: "cap-q", text: `How many ${target.name}? Answer in digits` }), field, input);
    return { el, check: () => input.value.trim() !== "" && Number(input.value.trim()) === n, focus: () => input.focus() };
  },

  odd() {
    const [same, odd] = wild.shuffle(wild.pick(ODD));
    const at = wild.int(0, 8);
    let picked = -1;
    const grid = h("div", { class: "cap-grid" }, Array.from({ length: 9 }, (_, i) =>
      h("button", {
        type: "button", class: "cap-cell", text: i === at ? odd : same,
        onclick: ev => {
          picked = i;
          grid.querySelectorAll(".cap-cell").forEach(c => c.classList.remove("on"));
          ev.currentTarget.classList.add("on");
        },
      })));
    const el = h("div", { class: "cap" }, h("div", { class: "cap-q", text: "Tap the odd one out" }), grid);
    return { el, check: () => picked === at };
  },

  order(_, level) {
    const n = level >= 5 ? 6 : 5;
    const nums = wild.shuffle(Array.from({ length: n }, (_, i) => i + 1));
    let next = 1, broken = false;
    const grid = h("div", { class: "cap-grid" + (n === 6 ? "" : " five") }, nums.map(v =>
      h("button", {
        type: "button", class: "cap-cell num", text: "🚉" + v,
        onclick: ev => {
          if (ev.currentTarget.classList.contains("on")) return;
          if (v !== next) broken = true;
          next++;
          ev.currentTarget.classList.add("on");
        },
      })));
    const el = h("div", { class: "cap" }, h("div", { class: "cap-q", text: `Tap the stations in order, 1 to ${n}` }), grid);
    return { el, check: () => !broken && next === n + 1 };
  },
};
