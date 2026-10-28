(function () {
  let mode = "practice";
  let running = false, raf = 0, lastTs = 0, elapsed = 0, durationMs = 45000;
  let samples = 0, onTarget = 0, absDev = 0, corrections = 0, lastMag = 0, noiseT = 0;
  const held = new Set();
  const needle = { a: 0, va: 0 };
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  const TARGET = 0.12;

  function keysHud() {
    const k = PilotApp.loadKeys();
    return `<div class="keys-live">Active:
      <span class="keycap">${PilotApp.prettyKey(k.left)}</span>
      <span class="keycap">${PilotApp.prettyKey(k.right)}</span>
      <span class="keycap">${PilotApp.prettyKey(k.up)}</span>
      <span class="keycap">${PilotApp.prettyKey(k.down)}</span>
      <a href="settings.html" style="margin-left:0.4rem;">rebind</a>
    </div>`;
  }

  function render() {
    PilotApp.mount("control.html", `
      <section class="panel">
        <div class="panel-header">
          <div><h1>CONTROL</h1><p>Keep the blue needle and blue ball on the red marks. Keyboard only — hold keys for continuous correction.</p></div>
          <div class="mode-toggle" id="modeToggle">
            <button type="button" data-mode="practice" class="${mode==="practice"?"active":""}">Practice</button>
            <button type="button" data-mode="assessment" class="${mode==="assessment"?"active":""}">Assessment</button>
          </div>
        </div>
        ${keysHud()}
        <div class="status-bar">
          <div class="stat-chip"><span class="label">Time</span><span class="value" id="statTime">${Math.round((mode==="assessment"?75000:45000)/1000)}s</span></div>
          <div class="stat-chip"><span class="label">On target</span><span class="value" id="statOn">0%</span></div>
          <div class="stat-chip"><span class="label">Mean |dev|</span><span class="value" id="statDev">—</span></div>
          <div class="stat-chip"><span class="label">Corrections</span><span class="value" id="statCorr">0</span></div>
        </div>
        <div class="two-col">
          <div class="instrument-frame"><canvas id="cv" width="520" height="400"></canvas></div>
          <aside>
            <p class="instructions">Practice 45s · Assessment 75s with stronger drift. Score = time-on-target % and mean deviation.</p>
            <div class="cta-row">
              <button class="btn btn-primary" id="btnStart">Start run</button>
              <button class="btn btn-ghost" id="btnStop" disabled>Abort</button>
            </div>
            <div class="feedback" id="feedback"></div>
            <div class="cta-row hidden" id="endRow" style="margin-top:0.7rem;">
              <a class="btn btn-primary" href="results.html">Results</a>
              <button class="btn btn-ghost" id="btnAgain">Run again</button>
            </div>
          </aside>
        </div>
      </section>
    `);
    wire();
    draw();
  }

  function inputAxes() {
    let x = 0, y = 0;
    if (PilotApp.isHeld(held, "left")) x -= 1;
    if (PilotApp.isHeld(held, "right")) x += 1;
    if (PilotApp.isHeld(held, "up")) y -= 1;
    if (PilotApp.isHeld(held, "down")) y += 1;
    return { x, y };
  }

  function draw() {
    const cv = document.getElementById("cv");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, w, h);

    // Round dial
    const cx = 150, cy = 200, R = 110;
    ctx.fillStyle = "#122433";
    ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2d4558"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // red mark at top
    ctx.strokeStyle = "#e85d5d"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy - R + 8); ctx.lineTo(cx, cy - R + 28); ctx.stroke();
    // blue needle
    const ang = -Math.PI / 2 + needle.a * 1.2;
    ctx.strokeStyle = "#4ea8ff"; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * (R - 18), cy + Math.sin(ang) * (R - 18));
    ctx.stroke();
    ctx.fillStyle = "#4ea8ff";
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();

    // Rectangle tracking
    const rx = 300, ry = 80, rw = 180, rh = 240;
    ctx.fillStyle = "#0d1a24";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "#2d4558"; ctx.lineWidth = 2; ctx.strokeRect(rx, ry, rw, rh);
    // red center cross
    const mx = rx + rw / 2, my = ry + rh / 2;
    ctx.strokeStyle = "#e85d5d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx - 18, my); ctx.lineTo(mx + 18, my);
    ctx.moveTo(mx, my - 18); ctx.lineTo(mx, my + 18); ctx.stroke();
    // blue ball
    const bx = mx + ball.x * (rw * 0.42);
    const by = my + ball.y * (rh * 0.42);
    ctx.fillStyle = "#4ea8ff";
    ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(230,238,244,0.55)";
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText("COMPENSATORY TRACK", 16, 24);
  }

  function step(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    elapsed += dt * 1000;
    noiseT += dt;
    const strength = mode === "assessment" ? 1.15 : 0.85;
    const inp = inputAxes();
    const driftA = Math.sin(noiseT * 1.6) * strength * 0.9 + Math.sin(noiseT * 2.8) * 0.35;
    const driftX = Math.sin(noiseT * 1.3) * strength + Math.cos(noiseT * 2.1) * 0.4;
    const driftY = Math.cos(noiseT * 1.5) * strength + Math.sin(noiseT * 2.6) * 0.35;

    needle.va = needle.va * 0.9 + (driftA + inp.x * 2.2) * dt;
    needle.a = Math.max(-1, Math.min(1, needle.a + needle.va * dt));

    ball.vx = ball.vx * 0.9 + (driftX + inp.x * 2.4) * dt;
    ball.vy = ball.vy * 0.9 + (driftY + inp.y * 2.4) * dt;
    ball.x = Math.max(-1, Math.min(1, ball.x + ball.vx * dt));
    ball.y = Math.max(-1, Math.min(1, ball.y + ball.vy * dt));

    const err = (Math.abs(needle.a) + Math.hypot(ball.x, ball.y)) / 2;
    samples++; absDev += err;
    if (err <= TARGET) onTarget++;
    const mag = Math.hypot(inp.x, inp.y);
    if (mag > 0.2 && lastMag <= 0.2) corrections++;
    lastMag = mag;

    document.getElementById("statTime").textContent = Math.ceil(Math.max(0, durationMs - elapsed) / 1000) + "s";
    document.getElementById("statOn").textContent = (samples ? Math.round((onTarget / samples) * 100) : 0) + "%";
    document.getElementById("statDev").textContent = samples ? (absDev / samples).toFixed(2) : "—";
    document.getElementById("statCorr").textContent = String(corrections);
    draw();
    if (elapsed >= durationMs) { finish(false); return; }
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    durationMs = mode === "assessment" ? 75000 : 45000;
    elapsed = samples = onTarget = absDev = corrections = lastMag = 0;
    lastTs = 0; noiseT = Math.random() * 10;
    needle.a = needle.va = 0; ball.x = ball.y = ball.vx = ball.vy = 0;
    running = true;
    document.getElementById("btnStart").disabled = true;
    document.getElementById("btnStop").disabled = false;
    document.getElementById("endRow").classList.add("hidden");
    document.getElementById("feedback").className = "feedback";
    raf = requestAnimationFrame(step);
  }

  function finish(aborted) {
    running = false;
    cancelAnimationFrame(raf);
    document.getElementById("btnStart").disabled = false;
    document.getElementById("btnStop").disabled = true;
    const timeOnTargetPct = samples ? Math.round((onTarget / samples) * 100) : 0;
    const meanAbsDeviation = samples ? +(absDev / samples).toFixed(3) : 0;
    if (!aborted) {
      PilotApp.saveResult({
        module: "control", mode, timeOnTargetPct, meanAbsDeviation, corrections,
        score: timeOnTargetPct, durationSec: Math.round(durationMs / 1000)
      });
      document.getElementById("endRow").classList.remove("hidden");
      PilotApp.showFeedback(document.getElementById("feedback"), true,
        `<strong>Complete.</strong> On target ${timeOnTargetPct}% · Mean |dev| ${meanAbsDeviation}`);
    } else {
      PilotApp.showFeedback(document.getElementById("feedback"), false, "Aborted — not saved.");
    }
    draw();
  }

  function wire() {
    document.getElementById("modeToggle").onclick = (e) => {
      const b = e.target.closest("button[data-mode]");
      if (!b || running) return;
      mode = b.dataset.mode; render();
    };
    document.getElementById("btnStart").onclick = start;
    document.getElementById("btnStop").onclick = () => finish(true);
    document.getElementById("btnAgain")?.addEventListener("click", start);
  }

  window.addEventListener("keydown", (e) => {
    const k = PilotApp.loadKeys();
    if (Object.values(k).includes(e.code)) {
      held.add(e.code);
      if (running) e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => held.delete(e.code));

  render();
})();
