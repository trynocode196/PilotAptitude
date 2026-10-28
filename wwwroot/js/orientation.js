(function () {
  let mode = "practice";
  let correct = 0, asked = 0, startedAt = 0, timerId = 0, leftMs = 10 * 60 * 1000;
  let current = null, selected = null, running = false;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pickScenario() {
    // heading 0-359, bank -30..30, pitch -15..15, bearing relative -180..180
    const heading = Math.floor(Math.random() * 36) * 10;
    const bank = Math.round(rand(-25, 25));
    const pitch = Math.round(rand(-12, 12));
    const bearing = Math.round(rand(-150, 150));
    const truth = {
      heading, bank, pitch, bearing,
      // simplified symbol mapping: quadrant of bearing + bank sign + pitch sign encoded as option index
    };
    const options = [0, 1, 2, 3].map((i) => ({
      id: i + 1,
      heading: (heading + (i === 0 ? 0 : (i * 40))) % 360,
      bank: i === 0 ? bank : bank * (i % 2 === 0 ? 1 : -1) + (i === 3 ? 8 : 0),
      pitch: i === 0 ? pitch : pitch * (i % 2 ? -1 : 1),
      bearing: i === 0 ? bearing : bearing + (i * 35 - 50)
    }));
    // shuffle but keep answer id tracking
    const answerId = 1;
    const shuffled = options.sort(() => Math.random() - 0.5);
    return { instruments: truth, options: shuffled, answerId };
  }

  function drawInstruments(inst) {
    const cv = document.getElementById("inst");
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#071018"; ctx.fillRect(0, 0, cv.width, cv.height);
    const gauges = [
      { x: 90, label: "RBI", draw: (x, y) => drawRbi(ctx, x, y, inst.bearing) },
      { x: 250, label: "AI", draw: (x, y) => drawAi(ctx, x, y, inst.bank, inst.pitch) },
      { x: 410, label: "HDG", draw: (x, y) => drawHdg(ctx, x, y, inst.heading) }
    ];
    gauges.forEach((g) => {
      g.draw(g.x, 150);
      ctx.fillStyle = "#8aa0b0"; ctx.font = "12px IBM Plex Mono"; ctx.textAlign = "center";
      ctx.fillText(g.label, g.x, 290);
    });
  }

  function drawRbi(ctx, x, y, bearing) {
    ctx.strokeStyle = "#2d4558"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.stroke();
    const a = (bearing - 90) * Math.PI / 180;
    ctx.strokeStyle = "#f0b429"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 55, y + Math.sin(a) * 55); ctx.stroke();
  }
  function drawAi(ctx, x, y, bank, pitch) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(bank * Math.PI / 180);
    ctx.fillStyle = "#3a7ca5"; ctx.fillRect(-70, -70 + pitch, 140, 140);
    ctx.fillStyle = "#8b5a2b"; ctx.fillRect(-70, pitch, 140, 70 - pitch + 70);
    ctx.restore();
    ctx.strokeStyle = "#e85d5d"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 25, y); ctx.lineTo(x + 25, y); ctx.stroke();
    ctx.strokeStyle = "#2d4558"; ctx.beginPath(); ctx.arc(x, y, 72, 0, Math.PI * 2); ctx.stroke();
  }
  function drawHdg(ctx, x, y, hdg) {
    ctx.strokeStyle = "#2d4558"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#e6eef4"; ctx.font = "16px Rajdhani"; ctx.textAlign = "center";
    ctx.fillText(String(hdg).padStart(3, "0"), x, y + 6);
    ctx.strokeStyle = "#2fd6a8";
    ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.lineTo(x, y - 50); ctx.stroke();
  }

  function drawOption(canvas, opt) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0d1a24"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const x = canvas.width / 2, y = canvas.height / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((opt.heading) * Math.PI / 180);
    ctx.fillStyle = "#4ea8ff";
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-16, 18); ctx.lineTo(16, 18); ctx.closePath(); ctx.fill();
    // bank cue wing tilt already via heading; pitch cue as offset
    ctx.fillStyle = opt.pitch >= 0 ? "#2fd6a8" : "#e85d5d";
    ctx.fillRect(-4, -30 - opt.pitch * 0.4, 8, 6);
    ctx.restore();
    ctx.strokeStyle = "#2d4558"; ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }

  function render() {
    PilotApp.mount("orientation.html", `
      <section class="panel">
        <div class="panel-header">
          <div><h1>ORIENTATION</h1><p>Read RBI, Artificial Horizon, and Compass. Choose which aircraft (1–4) matches. Type 1–4 or select.</p></div>
          <div class="mode-toggle" id="modeToggle">
            <button type="button" data-mode="practice" class="${mode==="practice"?"active":""}">Practice</button>
            <button type="button" data-mode="assessment" class="${mode==="assessment"?"active":""}">Assessment</button>
          </div>
        </div>
        <div class="status-bar">
          <div class="stat-chip"><span class="label">Time left</span><span class="value" id="statTime">10:00</span></div>
          <div class="stat-chip"><span class="label">Correct</span><span class="value" id="statC">0</span></div>
          <div class="stat-chip"><span class="label">Asked</span><span class="value" id="statA">0</span></div>
        </div>
        <div id="stage">
          <p class="instructions">${mode==="assessment" ? "10-minute timed assessment. +1 per correct; incorrect not penalized." : "Practice — no timer pressure."}</p>
          <div class="cta-row"><button class="btn btn-primary" id="btnStart">Start</button></div>
        </div>
        <div class="feedback" id="feedback"></div>
      </section>
    `);
    document.getElementById("modeToggle").onclick = (e) => {
      const b = e.target.closest("button[data-mode]");
      if (!b || running) return;
      mode = b.dataset.mode; render();
    };
    document.getElementById("btnStart").onclick = begin;
  }

  function begin() {
    correct = asked = 0; selected = null; running = true;
    leftMs = mode === "assessment" ? 10 * 60 * 1000 : Infinity;
    startedAt = performance.now();
    clearInterval(timerId);
    if (mode === "assessment") {
      timerId = setInterval(() => {
        leftMs = Math.max(0, 10 * 60 * 1000 - (performance.now() - startedAt));
        const m = Math.floor(leftMs / 60000), s = Math.floor((leftMs % 60000) / 1000);
        document.getElementById("statTime").textContent = `${m}:${String(s).padStart(2,"0")}`;
        if (leftMs <= 0) finish();
      }, 250);
    } else document.getElementById("statTime").textContent = "∞";
    nextQ();
  }

  function nextQ() {
    current = pickScenario();
    selected = null;
    document.getElementById("statC").textContent = String(correct);
    document.getElementById("statA").textContent = String(asked);
    document.getElementById("stage").innerHTML = `
      <div class="orient-grid">
        <div class="instrument-frame"><canvas id="inst" width="500" height="320"></canvas></div>
        <div>
          <div class="aircraft-options" id="opts"></div>
          <div class="cta-row" style="margin-top:0.8rem;">
            <button class="btn btn-primary" id="btnSubmit">Submit</button>
          </div>
        </div>
      </div>`;
    drawInstruments(current.instruments);
    const opts = document.getElementById("opts");
    current.options.forEach((opt) => {
      const div = document.createElement("div");
      div.className = "aircraft-opt";
      div.dataset.id = opt.id;
      div.innerHTML = `<strong>${opt.id}</strong><br/><canvas width="120" height="90"></canvas>`;
      opts.appendChild(div);
      drawOption(div.querySelector("canvas"), opt);
      div.onclick = () => {
        selected = opt.id;
        [...opts.children].forEach((c) => c.classList.toggle("selected", Number(c.dataset.id) === selected));
      };
    });
    document.getElementById("btnSubmit").onclick = submit;
  }

  function submit() {
    if (!running || selected == null) return;
    asked++;
    if (selected === current.answerId) correct++;
    PilotApp.showFeedback(document.getElementById("feedback"), selected === current.answerId,
      selected === current.answerId ? "<strong>Correct</strong> (+1)" : `<strong>Incorrect</strong> — was ${current.answerId} (not penalized)`);
    if (mode === "assessment" && leftMs <= 0) finish();
    else setTimeout(nextQ, 700);
  }

  function finish() {
    running = false;
    clearInterval(timerId);
    const score = correct;
    PilotApp.saveResult({ module: "orientation", mode, score, correct, asked, accuracyPct: asked ? Math.round((correct/asked)*100) : 0 });
    document.getElementById("stage").innerHTML = `
      <p class="instructions"><strong>Done.</strong> ${correct} correct out of ${asked}.</p>
      <div class="cta-row"><a class="btn btn-primary" href="results.html">Results</a>
      <button class="btn btn-ghost" id="btnAgain">Again</button></div>`;
    document.getElementById("btnAgain").onclick = begin;
  }

  window.addEventListener("keydown", (e) => {
    if (!running) return;
    if (["1","2","3","4"].includes(e.key)) {
      selected = Number(e.key);
      document.querySelectorAll(".aircraft-opt").forEach((c) => c.classList.toggle("selected", Number(c.dataset.id) === selected));
    }
    if (e.key === "Enter") submit();
  });

  render();
})();
