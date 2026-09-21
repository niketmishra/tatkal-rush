// Tiny WebAudio synth. No audio files.

const KEY = "tatkal_muted";
let ctx = null;
let muted = localStorage.getItem(KEY) === "1";

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = "sine", vol = 0.12, at = 0, slide = 0 } = {}) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(520, 0.05, { type: "triangle", vol: 0.06 }),
  seat: () => tone(700, 0.07, { type: "triangle", vol: 0.09 }),
  unseat: () => tone(360, 0.07, { type: "triangle", vol: 0.07 }),
  ok: () => { tone(660, 0.09); tone(880, 0.12, { at: 0.08 }); },
  bad: () => { tone(200, 0.16, { type: "sawtooth", vol: 0.09, slide: -80 }); },
  steal: () => tone(300, 0.12, { type: "square", vol: 0.04, slide: -120 }),
  notif: () => { tone(1040, 0.06, { vol: 0.07 }); tone(1320, 0.09, { at: 0.07, vol: 0.07 }); },
  tick: () => tone(900, 0.03, { type: "square", vol: 0.04 }),
  cash: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { at: i * 0.07, type: "triangle" })); },
  horn: () => { tone(311, 0.5, { type: "sawtooth", vol: 0.07 }); tone(370, 0.5, { type: "sawtooth", vol: 0.07 }); },
  stamp: () => { tone(90, 0.12, { type: "square", vol: 0.16, slide: -40 }); tone(60, 0.18, { type: "sine", vol: 0.18, at: 0.02 }); },
  print: () => { for (let i = 0; i < 9; i++) tone(1400 + (i % 3) * 180, 0.03, { type: "square", vol: 0.025, at: i * 0.05 }); },
  msg: () => { tone(784, 0.07, { vol: 0.08 }); tone(1175, 0.1, { at: 0.08, vol: 0.08 }); },
  chai: () => { tone(440, 0.1, { type: "triangle" }); tone(554, 0.1, { type: "triangle", at: 0.09 }); tone(659, 0.18, { type: "triangle", at: 0.18 }); },
  angry: () => { tone(180, 0.25, { type: "sawtooth", vol: 0.1, slide: -90 }); tone(140, 0.3, { type: "sawtooth", vol: 0.1, at: 0.2, slide: -60 }); },
  chime: () => { [659, 523, 587, 392].forEach((f, i) => tone(f, 0.5, { at: i * 0.22, type: "sine", vol: 0.11 })); },
  over: () => { [440, 392, 330, 262].forEach((f, i) => tone(f, 0.22, { at: i * 0.16, type: "triangle" })); },
};

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  if (muted) stopVoices();
  localStorage.setItem(KEY, muted ? "1" : "0");
  return muted;
}

export function buzz(pattern) {
  // browsers block vibration until the user has touched the page
  const touched = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
  if (!muted && touched && navigator.vibrate) navigator.vibrate(pattern);
}

// Station announcer. Only speaks if the device has a Hindi voice, otherwise the chime carries it.
export function say(text) {
  if (muted || !window.speechSynthesis) return;
  const voice = speechSynthesis.getVoices().find(v => v.lang === "hi-IN");
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = "hi-IN";
  u.rate = 0.95;
  u.volume = 0.7;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ---- recorded announcements ---------------------------------------------------------
// Every platform announcement is: addon (the station chime), "Yatrigan kripya dhyan dein",
// then its own line. Clips are decoded once; if any is missing we fall back to the synth.

const CLIPS = ["addon", "vo_dhyan", "vo_open", "vo_meltdown", "vo_premium", "vo_baraat", "vo_fever", "vo_overtime", "vo_closed"];
const buffers = {};
let loading = null;
let playing = [];

export function loadVoices() {
  if (loading) return loading;
  const c = ac();
  if (!c) return (loading = Promise.resolve());
  loading = Promise.all(CLIPS.map(async name => {
    try {
      const res = await fetch(`assets/audio/${name}.mp3`);
      if (!res.ok) return;
      buffers[name] = await c.decodeAudioData(await res.arrayBuffer());
    } catch { /* that clip stays on the synth fallback */ }
  }));
  return loading;
}

export function stopVoices() {
  for (const src of playing) { try { src.stop(); } catch { /* already ended */ } }
  playing = [];
}

// Plays addon, the attention call, then the line. Returns the total length in seconds,
// or 0 when the recordings are not available (caller then uses the synth chime).
export function announceVoice(line) {
  if (muted) return 0;
  const c = ac();
  const seq = ["addon", "vo_dhyan", line].filter(n => n && buffers[n]);
  if (!c || !buffers.addon || seq.length < 2) return 0;
  stopVoices();
  const gain = c.createGain();
  gain.gain.value = 0.95;
  gain.connect(c.destination);
  let at = c.currentTime + 0.05;
  for (const name of seq) {
    const src = c.createBufferSource();
    src.buffer = buffers[name];
    src.connect(gain);
    src.start(at);
    playing.push(src);
    at += buffers[name].duration + 0.12;
  }
  return at - c.currentTime;
}
