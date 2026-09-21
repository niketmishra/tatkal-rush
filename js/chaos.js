// "Server load": the interruptions between booking steps.
// Each event resolves its promise when the player has dealt with it.

import { h, wild, sleep } from "./util.js";
import { makeCaptcha } from "./captcha.js";
import { sfx } from "./sound.js";
import { TERMS } from "./data.js";

const overlay = () => document.getElementById("overlay");

export function openModal(node, cls = "") {
  const wrap = h("div", { class: "modal-wrap " + cls }, node);
  overlay().append(wrap);
  return () => wrap.remove();
}
export function clearOverlay() {
  overlay().replaceChildren();
}

let last = null;
export function pickChaos(idx, boost = 0) {
  if (idx === 0) return null;
  const p = Math.min(0.62, 0.14 + idx * 0.04 + boost);
  if (!wild.chance(p)) return null;
  const kinds = ["queue", "session", "ad", "gateway", "slow", "rate", "dodge"];
  if (idx >= 2) kinds.push("robot", "terms");
  const kind = wild.pick(kinds.filter(k => k !== last));
  last = kind;
  return kind;
}

export function runChaos(kind, idx) {
  return new Promise(res => EVENTS[kind](res, idx));
}

const ADS = [
  { t: "Download the RailJhatka app", b: "Same bugs. Smaller screen. 4.9 stars (from us)." },
  { t: "Book a retiring room?", b: "Only ₹999 per hour. Fan extra. Window imaginary." },
  { t: "RailJhatka Credit Card", b: "Earn 1 reward point on every failed transaction. You will be rich." },
  { t: "Tour package: 9 temples in 2 days", b: "Includes bus, breakfast and mild whiplash." },
];

const EVENTS = {
  queue(done) {
    let n = wild.int(2800, 9400);
    const num = h("div", { class: "queue-num" });
    const bar = h("div", { class: "bar" }, h("i"));
    const start = n;
    const paint = () => {
      num.textContent = Math.max(0, Math.round(n)).toLocaleString("en-IN");
      bar.firstChild.style.width = (100 * (1 - n / start)) + "%";
    };
    const close = openModal(h("div", { class: "modal" },
      h("h3", { text: "You are in a queue" }),
      h("p", { text: "Users ahead of you:" }), num, bar,
      h("button", { class: "btn", text: "Push ahead (dhakka)", onclick: () => { n *= 0.8; sfx.click(); paint(); } }),
      h("small", { text: "Please do not press back, refresh, or lose hope." })));
    paint();
    const iv = setInterval(() => {
      n -= start / 38;
      paint();
      if (n <= 0 || !document.body.contains(num)) { clearInterval(iv); close(); done(); }
    }, 110);
  },

  session(done) {
    const btn = h("button", { class: "btn", text: "Login again" });
    const close = openModal(h("div", { class: "modal" },
      h("h3", { text: "Session expired" }),
      h("p", { text: "You were logged out due to inactivity. (You were very active. We know.)" }), btn));
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Logging in...";
      await sleep(1100);
      close(); done();
    };
  },

  ad(done) {
    let shown = 0;
    const show = () => {
      const ad = wild.pick(ADS);
      const x = h("button", { class: "ad-x", text: "✕", "aria-label": "Close" });
      const maybe = h("button", { class: "btn", text: shown ? "Remind me later" : "Yes! Tell me more" });
      const close = openModal(h("div", { class: "modal modal-ad" }, x,
        h("div", { class: "ad-tag", text: "SPONSORED" }), h("h3", { text: ad.t }), h("p", { text: ad.b }), maybe), "ad-pos" + wild.int(0, 2));
      x.onclick = () => { close(); done(); };
      maybe.onclick = () => { close(); shown++; if (shown < 2) show(); else done(); };
    };
    show();
  },

  gateway(done) {
    let need = wild.int(1, 3);
    const btn = h("button", { class: "btn", text: "Retry" });
    const msg = h("p", { text: "The server is taking a short nap. Try again." });
    const close = openModal(h("div", { class: "modal modal-err" },
      h("div", { class: "err-code", text: "502" }), h("h3", { text: "Bad Gaadi" }), msg, btn));
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Retrying...";
      await sleep(650);
      if (--need <= 0) { close(); done(); return; }
      sfx.bad();
      msg.textContent = wild.pick(["Still napping.", "Almost. Not really.", "Server said 5 more minutes."]);
      btn.disabled = false;
      btn.textContent = "Retry again";
    };
  },

  slow(done) {
    const bar = h("div", { class: "bar" }, h("i"));
    const pct = h("div", { class: "queue-num" });
    const close = openModal(h("div", { class: "modal" },
      h("h3", { text: "Loading" }), pct, bar, h("small", { text: "Please do not press back or refresh." })));
    let p = 0, stuck = 0;
    const iv = setInterval(() => {
      if (!document.body.contains(bar)) { clearInterval(iv); return; }
      if (p < 99) p = Math.min(99, p + wild.int(3, 9));
      else stuck++;
      pct.textContent = p + "%";
      bar.firstChild.style.width = p + "%";
      if (stuck > 11) { clearInterval(iv); close(); done(); }
    }, 90);
  },

  rate(done) {
    const msg = h("small", { text: "Your feedback matters to us." });
    const stars = h("div", { class: "stars" }, [1, 2, 3, 4, 5].map(n =>
      h("button", {
        class: "star", text: "★",
        onclick: () => {
          if (n === 5) { close(); done(); return; }
          sfx.bad();
          msg.textContent = `${n} star${n > 1 ? "s" : ""} is not a valid rating. Please try again.`;
        },
      })));
    const close = openModal(h("div", { class: "modal" },
      h("h3", { text: "Enjoying RailJhatka?" }), h("p", { text: "Rate us to continue your booking." }), stars, msg));
  },

  robot(done, idx) {
    const holder = h("div");
    const msg = h("small", { text: "Humans are usually slower and sadder." });
    let cap;
    const fresh = () => { cap = makeCaptcha(Math.max(2, idx), submit); holder.replaceChildren(cap.el); cap.focus?.(); };
    const submit = () => {
      if (cap.check()) { close(); done(); return; }
      sfx.bad();
      msg.textContent = "Wrong. Very robotic of you. Try again.";
      fresh();
    };
    const close = openModal(h("div", { class: "modal" },
      h("h3", { text: "Are you a robot?" }), h("p", { text: "Your booking speed is suspicious." }), holder,
      h("button", { class: "btn", text: "Verify", onclick: submit }), msg));
    fresh();
  },

  // the Continue button that does not want to be clicked
  dodge(done) {
    let left = wild.int(2, 3);
    const btn = h("button", { class: "btn dodge", text: "Continue" });
    const msg = h("small", { text: "Click Continue to continue." });
    const close = openModal(h("div", { class: "modal modal-dodge" },
      h("h3", { text: "Are you still there?" }), h("p", { text: "We noticed you blinked." }), h("div", { class: "dodge-pen" }, btn), msg));
    const hop = () => {
      left--;
      btn.style.transform = `translate(${wild.pick([-1, 1]) * wild.int(50, 95)}px, ${wild.int(-26, 26)}px)`;
      msg.textContent = wild.pick(["Too slow.", "Almost.", "The button is also under server load.", "Try being faster."]);
      sfx.steal();
    };
    btn.onpointerenter = e => { if (e.pointerType === "mouse" && left > 0) hop(); };
    btn.onclick = () => {
      if (left > 0) return hop();
      close(); done();
    };
  },

  terms(done) {
    const agree = h("button", { class: "btn", text: "Scroll to the end to agree", disabled: true });
    const box = h("div", { class: "terms" }, TERMS.map(t => h("p", { text: t })));
    box.onscroll = () => {
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 8) { agree.disabled = false; agree.textContent = "I agree to everything"; }
    };
    const close = openModal(h("div", { class: "modal" },
      h("h3", { text: "Updated Terms and Conditions" }), h("p", { text: "Please read carefully. Nobody ever has." }), box, agree));
    agree.onclick = () => { close(); done(); };
  },
};
