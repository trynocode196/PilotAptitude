(function () {
  let mode = "practice";
  let running = false, raf = 0, lastTs = 0, elapsed = 0;
  let runIndex = 0, runScores = [], craftX = 0, gates = [], samples = 0, qualitySum = 0;
  const held = new Set();
  const RUN_MS = 90000;
  const ASSESS_RUNS = 3;

  function hudKeys() {
    const k = PilotApp.loadKeys();
    return `<div class="keys-live">Steer:
      <span class="keycap">${PilotApp.prettyKey(k.left)}</span>
      <span class="keycap">${PilotApp.prettyKey(k.right)}</span>
      only · <a href="settings.html">rebind</a></div>`;
  }

  function render() {
    PilotApp.mount("slalom.html", `
      <section class="panel">
        <div class="panel-header">
          <div><h1>SLALOM</h1><p>Guide the blue delta between red/green marker pairs streaming downward. Closer to gap center = higher score.</p></div>
          <div class="mode-toggle" id="modeToggle">
            <button type="button" data-mode="practice" class="${mode==="practice"?"active":""}">Practice</button>
            <button type="button" data-mode="assessment" class="${mode==="assessment"?"active":""}">Assessment</button>
          </div>
        </div>
        ${hudKeys()}
        <div class="status-bar">
          <div class="stat-chip"><span class="label">Run</span><span class="value" id="statRun">—</span></div>
          <div class="stat-chip"><span class="label">Time</span><span class="value" id="statTime">90s</span></div>
          <div class="stat-chip"><span class="label">Accuracy</span><span class="value" id="statAcc">0%</span></div>
        </div>
        <div class="two-col">
          <div class="instrument-frame"><canvas id="cv" width="420" height="520"></canvas></div>
          <aside>
            <p class="instructions">${mode==="assessment" ? "3 scored runs of 90s (+ optional practice via Practice mode)." : "Practice run — unlimited retries."}</p>
            <div class="cta-row">
              <button class="btn btn-primary" id="btnStart">Start run</button>
              <button class="btn btn-ghost" id="btnStop" disabled>Abort</button>
            </div>
            <div class="feedback" id="feedback"></div>
            <div class="cta-row hidden" id="endRow" style="margin-top:0.7rem;">
              <a class="btn btn-primary" href="results.html">Results</a>
              <button class="btn btn-ghost" id="btnAgain">Next / Again</button>
            </div>
          </aside>
        </div>
      </section>
    `);
    wire();
    draw();
  }

  function spawnGate(y) {
    const center = (Math.random() * 1.4 - 0.7);
    const gap = 0.42;
    gates.push({ y, center, gap });
  }

  function draw() {
    const cv = document.getElementById("cv");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const w = cv.width, h = cv.height;
    ctx.fillStyle = "#071018"; ctx.fillRect(0, 0, w, h);
    const mid = w / 2;
    ctx.strokeStyle = "rgba(142,168,184,0.2)";
    ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, h); ctx.stroke();

    gates.forEach((g) => {
      const gy = g.y;
      const cx = mid + g.center * (w * 0.4);
      const half = g.gap * (w * 0.4);
      // red left marker, green right
      ctx.fillStyle = "#e85d5d";
      ctx.fillRect(cx - half - 14, gy - 8, 14, 16);
      ctx.fillStyle = "#2fd6a8";
      ctx.fillRect(cx + half, gy - 8, 14, 16);
    });

    const craftPx = mid + craftX * (w * 0.4);
    const cy = h - 70;
    ctx.fillStyle = "#4ea8ff";
    ctx.beginPath();
    ctx.moveTo(craftPx, cy - 16);
    ctx.lineTo(craftPx - 14, cy + 12);
    ctx.lineTo(craftPx + 14, cy + 12);
    ctx.closePath();
    ctx.fill();
  }

  function step(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    elapsed += dt * 1000;

    let steer = 0;
    if (PilotApp.isHeld(held, "left")) steer -= 1;
    if (PilotApp.isHeld(held, "right")) steer += 1;
    craftX = Math.max(-1, Math.min(1, craftX + steer * dt * 1.6));

    const speed = 160;
    gates.forEach((g) => { g.y += speed * dt; });
    // score when gate passes craft
    const craftY = 520 - 70;
    gates.forEach((g) => {
      if (!g.scored && g.y >= craftY) {
        g.scored = true;
        const err = Math.abs(craftX - g.center) / Math.max(0.05, g.gap);
        const q = Math.max(0, 1 - err);
        samples++; qualitySum += q;
      }
    });
    gates = gates.filter((g) => g.y < 560);
    if (!gates.length || gates[gates.length - 1].y > 110) spawnGate(-20);

    const acc = samples ? Math.round((qualitySum / samples) * 100) : 0;
    document.getElementById("statTime").textContent = Math.ceil(Math.max(0, RUN_MS - elapsed) / 1000) + "s";
    document.getElementById("statAcc").textContent = acc + "%";
    draw();
    if (elapsed >= RUN_MS) { endRun(); return; }
    raf = requestAnimationFrame(step);
  }

  function startRun() {
    if (running) return;
    running = true; lastTs = 0; elapsed = 0; craftX = 0; gates = []; samples = 0; qualitySum = 0;
    for (let i = 0; i < 5; i++) spawnGate(-40 - i * 100);
    document.getElementById("btnStart").disabled = true;
    document.getElementById("btnStop").disabled = false;
    document.getElementById("endRow").classList.add("hidden");
    document.getElementById("feedback").className = "feedback";
    document.getElementById("statRun").textContent = mode === "assessment" ? `${runIndex + 1}/${ASSESS_RUNS}` : "Practice";
    raf = requestAnimationFrame(step);
  }

  function endRun(aborted) {
    running = false;
    cancelAnimationFrame(raf);
    document.getElementById("btnStart").disabled = false;
    document.getElementById("btnStop").disabled = true;
    const acc = samples ? Math.round((qualitySum / samples) * 100) : 0;
    if (aborted) {
      PilotApp.showFeedback(document.getElementById("feedback"), false, "Aborted.");
      return;
    }
    runScores.push(acc);
    runIndex++;
    if (mode === "assessment" && runIndex >= ASSESS_RUNS) {
      const score = Math.round(runScores.reduce((a,b)=>a+b,0) / runScores.length);
      PilotApp.saveResult({ module: "slalom", mode, score, accuracyPct: score, runs: [...runScores] });
      PilotApp.showFeedback(document.getElementById("feedback"), true, `<strong>Assessment complete.</strong> Avg accuracy ${score}%`);
      document.getElementById("endRow").classList.remove("hidden");
      runIndex = 0; runScores = [];
    } else {
      PilotApp.saveResult({ module: "slalom", mode, score: acc, accuracyPct: acc, runs: [acc] });
      PilotApp.showFeedback(document.getElementById("feedback"), true, `<strong>Run complete.</strong> Accuracy ${acc}%`);
      document.getElementById("endRow").classList.remove("hidden");
    }
    draw();
  }

  function wire() {
    document.getElementById("modeToggle").onclick = (e) => {
      const b = e.target.closest("button[data-mode]");
      if (!b || running) return;
      mode = b.dataset.mode; runIndex = 0; runScores = []; render();
    };
    document.getElementById("btnStart").onclick = startRun;
    document.getElementById("btnStop").onclick = () => endRun(true);
    document.getElementById("btnAgain")?.addEventListener("click", startRun);
  }

  window.addEventListener("keydown", (e) => {
    const k = PilotApp.loadKeys();
    if ([k.left, k.right].includes(e.code)) { held.add(e.code); if (running) e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => held.delete(e.code));
  render();
})();
