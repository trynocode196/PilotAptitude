(function () {
  const params = new URLSearchParams(window.location.search);
  let mode = params.get("mode") === "assessment" ? "assessment" : "practice";

  const canvas = document.getElementById("controlCanvas");
  const ctx = canvas.getContext("2d");
  const els = {
    modeToggle: document.getElementById("modeToggle"),
    statTime: document.getElementById("statTime"),
    statOnTarget: document.getElementById("statOnTarget"),
    statDev: document.getElementById("statDev"),
    statCorr: document.getElementById("statCorr"),
    btnStart: document.getElementById("btnStart"),
    btnStop: document.getElementById("btnStop"),
    feedback: document.getElementById("feedback"),
    endRow: document.getElementById("endRow"),
    btnRestart: document.getElementById("btnRestart")
  };

  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const targetRadius = 18;
  const ball = { x: center.x, y: center.y, vx: 0, vy: 0 };
  const input = { x: 0, y: 0 };
  const keys = new Set();

  let running = false;
  let raf = 0;
  let lastTs = 0;
  let durationMs = 45000;
  let elapsed = 0;
  let samples = 0;
  let onTargetSamples = 0;
  let absDevSum = 0;
  let corrections = 0;
  let lastInputMag = 0;
  let noiseT = 0;
  let pointerActive = false;

  function durationForMode() {
    return mode === "assessment" ? 75000 : 45000;
  }

  function driftStrength() {
    return mode === "assessment" ? 95 : 70;
  }

  function setMode(next) {
    mode = next;
    [...els.modeToggle.querySelectorAll("button")].forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    if (!running) {
      durationMs = durationForMode();
      els.statTime.textContent = `${Math.round(durationMs / 1000)}s`;
    }
  }

  function resetBall() {
    ball.x = center.x;
    ball.y = center.y;
    ball.vx = 0;
    ball.vy = 0;
    noiseT = Math.random() * 1000;
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Instrument face
    const grd = ctx.createRadialGradient(center.x, center.y, 20, center.x, center.y, 220);
    grd.addColorStop(0, "#163447");
    grd.addColorStop(1, "#071018");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Outer ring
    ctx.strokeStyle = "#2d4558";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 170, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = "rgba(142, 168, 184, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center.x - 160, center.y);
    ctx.lineTo(center.x + 160, center.y);
    ctx.moveTo(center.x, center.y - 160);
    ctx.lineTo(center.x, center.y + 160);
    ctx.stroke();

    // Horizontal bar gauge
    ctx.fillStyle = "#0d1a24";
    ctx.fillRect(center.x - 140, h - 48, 280, 18);
    ctx.strokeStyle = "#2d4558";
    ctx.strokeRect(center.x - 140, h - 48, 280, 18);
    const barX = center.x + (ball.x - center.x) * 0.55;
    ctx.fillStyle = "#3ec6ff";
    ctx.fillRect(barX - 8, h - 48, 16, 18);
    ctx.fillStyle = "#e85d5d";
    ctx.fillRect(center.x - 2, h - 52, 4, 26);

    // Target mark
    ctx.strokeStyle = "#e85d5d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(center.x - 16, center.y);
    ctx.lineTo(center.x + 16, center.y);
    ctx.moveTo(center.x, center.y - 16);
    ctx.lineTo(center.x, center.y + 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center.x, center.y, targetRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Ball
    const ballGrad = ctx.createRadialGradient(ball.x - 4, ball.y - 4, 2, ball.x, ball.y, 14);
    ballGrad.addColorStop(0, "#9ef0d8");
    ballGrad.addColorStop(1, "#2fd6a8");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = "rgba(232, 238, 244, 0.55)";
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText("COMPENSATORY TRACK", 16, 24);
  }

  function readKeyboardInput() {
    let x = 0;
    let y = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) x += 1;
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) y -= 1;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) y += 1;
    if (!pointerActive) {
      input.x = x;
      input.y = y;
    }
  }

  function step(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    elapsed += dt * 1000;
    noiseT += dt;

    readKeyboardInput();

    // Noise-based turbulence
    const strength = driftStrength();
    const ax =
      Math.sin(noiseT * 1.7) * strength +
      Math.sin(noiseT * 3.1 + 1.2) * strength * 0.45 +
      input.x * 220;
    const ay =
      Math.cos(noiseT * 1.3) * strength +
      Math.sin(noiseT * 2.4 + 0.7) * strength * 0.5 +
      input.y * 220;

    ball.vx = ball.vx * 0.92 + ax * dt;
    ball.vy = ball.vy * 0.92 + ay * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Soft walls
    const maxR = 155;
    const dx = ball.x - center.x;
    const dy = ball.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      const s = maxR / dist;
      ball.x = center.x + dx * s;
      ball.y = center.y + dy * s;
      ball.vx *= -0.35;
      ball.vy *= -0.35;
    }

    const err = Math.hypot(ball.x - center.x, ball.y - center.y);
    samples += 1;
    absDevSum += err;
    if (err <= targetRadius) onTargetSamples += 1;

    const mag = Math.hypot(input.x, input.y);
    if (mag > 0.2 && lastInputMag <= 0.2) corrections += 1;
    lastInputMag = mag;

    const left = Math.max(0, durationMs - elapsed);
    els.statTime.textContent = `${Math.ceil(left / 1000)}s`;
    const onPct = samples ? Math.round((onTargetSamples / samples) * 100) : 0;
    els.statOnTarget.textContent = `${onPct}%`;
    els.statDev.textContent = samples ? (absDevSum / samples).toFixed(1) : "—";
    els.statCorr.textContent = String(corrections);

    draw();

    if (elapsed >= durationMs) {
      finish(false);
      return;
    }
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    durationMs = durationForMode();
    elapsed = 0;
    samples = 0;
    onTargetSamples = 0;
    absDevSum = 0;
    corrections = 0;
    lastInputMag = 0;
    lastTs = 0;
    resetBall();
    running = true;
    els.btnStart.disabled = true;
    els.btnStop.disabled = false;
    els.endRow.classList.add("hidden");
    els.feedback.className = "feedback";
    els.modeToggle.querySelectorAll("button").forEach((b) => (b.disabled = true));
    raf = requestAnimationFrame(step);
  }

  function finish(aborted) {
    running = false;
    cancelAnimationFrame(raf);
    els.btnStart.disabled = false;
    els.btnStop.disabled = true;
    els.modeToggle.querySelectorAll("button").forEach((b) => (b.disabled = false));
    input.x = 0;
    input.y = 0;

    const timeOnTargetPct = samples ? Math.round((onTargetSamples / samples) * 100) : 0;
    const meanAbsDeviation = samples ? +(absDevSum / samples).toFixed(2) : 0;

    if (!aborted) {
      PilotScoring.save({
        module: "control",
        mode,
        timeOnTargetPct,
        meanAbsDeviation,
        corrections,
        durationSec: Math.round(durationMs / 1000)
      });
      els.endRow.classList.remove("hidden");
      els.feedback.className = "feedback show ok";
      els.feedback.innerHTML = `<strong>Run complete.</strong> On target ${timeOnTargetPct}% · Mean |dev| ${meanAbsDeviation} · Corrections ${corrections}`;
    } else {
      els.feedback.className = "feedback show bad";
      els.feedback.innerHTML = "Run aborted — score not saved.";
    }
    draw();
  }

  // Input handlers
  window.addEventListener("keydown", (e) => {
    const tracked = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "A", "s", "S", "d", "D", "w", "W"];
    if (tracked.includes(e.key)) {
      keys.add(e.key);
      if (running) e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key));

  function pointerToInput(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    input.x = Math.max(-1, Math.min(1, (x - center.x) / 120));
    input.y = Math.max(-1, Math.min(1, (y - center.y) / 120));
  }

  canvas.addEventListener("pointerdown", (e) => {
    pointerActive = true;
    canvas.setPointerCapture(e.pointerId);
    pointerToInput(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointerActive) return;
    pointerToInput(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointerup", () => {
    pointerActive = false;
    input.x = 0;
    input.y = 0;
  });

  // Optional gamepad
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (pad && running && !pointerActive) {
      const dead = 0.15;
      let x = pad.axes[0] || 0;
      let y = pad.axes[1] || 0;
      if (Math.abs(x) < dead) x = 0;
      if (Math.abs(y) < dead) y = 0;
      if (x || y) {
        input.x = x;
        input.y = y;
      }
    }
    requestAnimationFrame(pollGamepad);
  }
  pollGamepad();

  els.modeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn || running) return;
    setMode(btn.dataset.mode);
  });

  els.btnStart.addEventListener("click", start);
  els.btnStop.addEventListener("click", () => finish(true));
  els.btnRestart?.addEventListener("click", () => {
    els.endRow.classList.add("hidden");
    els.feedback.className = "feedback";
    start();
  });

  setMode(mode);
  resetBall();
  draw();
})();
