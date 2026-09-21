// Draws the result card people post to their stories. Returns a PNG blob.

export async function makeShareCard({ score, title, tickets, perfect, streak, log, mode }) {
  try { await document.fonts.ready; } catch { /* draw with fallbacks */ }
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  const sans = (w, px) => `${w} ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  const mono = (w, px) => `${w} ${px}px "Courier Prime", "Courier New", monospace`;

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#14275e");
  bg.addColorStop(1, "#0a1535");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,255,255,.05)";
  for (let y = 30; y < H; y += 36) for (let x = 30; x < W; x += 36) g.fillRect(x, y, 3, 3);
  for (let x = 0; x < W; x += 88) {
    g.fillStyle = "#f37021";
    g.fillRect(x, 0, 44, 18);
    g.fillRect(x + 44, H - 18, 44, 18);
  }

  // the ticket
  const tx = 90, ty = 210, tw = W - 180, th = 900, r = 36;
  g.fillStyle = "#fffdf5";
  g.beginPath();
  g.roundRect(tx, ty, tw, th, r);
  g.fill();
  g.fillStyle = "#12224f";
  for (const cx of [tx, tx + tw]) { g.beginPath(); g.arc(cx, ty + 250, 30, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "#d9cfa6";
  g.lineWidth = 4;
  g.setLineDash([16, 14]);
  g.beginPath();
  g.moveTo(tx + 50, ty + 250);
  g.lineTo(tx + tw - 50, ty + 250);
  g.stroke();
  g.setLineDash([]);

  g.textAlign = "center";
  g.fillStyle = "#fff";
  g.font = sans(800, 64);
  g.fillText("TATKAL RUSH", W / 2, 120);
  g.fillStyle = "#ffb27a";
  g.font = mono(800, 28);
  g.fillText(`${mode.toUpperCase()} · RAILJHATKA (PARODY)`, W / 2, 168);

  g.fillStyle = "#667091";
  g.font = mono(800, 30);
  g.fillText("FINAL CHART", W / 2, ty + 80);
  g.fillStyle = "#14275e";
  g.font = sans(800, 72);
  g.fillText(title, W / 2, ty + 172, tw - 80);

  g.fillStyle = "#f37021";
  g.font = sans(800, 260);
  g.fillText(String(score), W / 2, ty + 520);
  g.fillStyle = "#14275e";
  g.font = sans(700, 48);
  g.fillText("points", W / 2, ty + 585);

  const stats = [[tickets, "tickets"], [perfect, "perfect"], [streak, "best streak"]];
  stats.forEach(([n, label], i) => {
    const x = tx + (tw / 3) * (i + 0.5);
    g.fillStyle = "#14275e";
    g.font = mono(800, 76);
    g.fillText(String(n), x, ty + 720);
    g.fillStyle = "#667091";
    g.font = sans(500, 32);
    g.fillText(label, x, ty + 766);
  });

  g.font = "52px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  g.fillText(log.slice(0, 14).join("") || "WL forever", W / 2, ty + 850);

  g.fillStyle = "#c4ccec";
  g.font = sans(500, 36);
  g.fillText("How many Tatkal tickets can you book?", W / 2, H - 120);
  g.fillStyle = "#ffb27a";
  g.font = mono(800, 32);
  g.fillText(location.host + location.pathname.replace(/\/$/, ""), W / 2, H - 66);

  return new Promise(res => cv.toBlob(res, "image/png"));
}
