(function () {
  let mode = "practice";
  const ASSESS_COUNT = 12;
  let idx = 0, correct = 0, times = [], startedAt = 0, current = null, answered = false;

  function bank() {
    const q = [];
    // speed/distance/time
    q.push({ t: "A car travels 23 km in 20 minutes. What is its average speed in km/hr?", a: 69 });
    q.push({ t: "An aircraft covers 180 NM in 45 minutes. Groundspeed in knots?", a: 240 });
    q.push({ t: "Distance 90 km, speed 120 km/h. Time in minutes?", a: 45 });
    q.push({ t: "Fuel burn 32 L/h for 2.5 hours. Fuel used (L)?", a: 80 });
    q.push({ t: "Climb 2500 ft in 5 minutes. Climb rate (ft/min)?", a: 500 });
    q.push({ t: "Descent from FL120 to 3000 ft at 600 ft/min. Minutes required?", a: 15 });
    q.push({ t: "True course 090, wind correction −8. Magnetic heading if variation 2°E?", a: 80 });
    q.push({ t: "GS 150 kt, distance remaining 75 NM. Time to destination (minutes)?", a: 30 });
    q.push({ t: "Tank 180 L, burn 45 L/h. Endurance in hours?", a: 4 });
    q.push({ t: "Price $1.40/L, uplift 60 L. Cost?", a: 84 });
    q.push({ t: "Scale 1:500000. 8 cm on chart equals how many km?", a: 40 });
    q.push({ t: "Mach .78 ≈ 460 kt TAS. Distance in 1.5 hours (NM)?", a: 690 });
    q.push({ t: "Crosswind component: wind 20 kt at 60° to runway. Approx kt?", a: 17 });
    q.push({ t: "Weight 720 kg + 180 kg = ? kg", a: 900 });
    q.push({ t: "Ratio 3:5 of 160 L. Larger share (L)?", a: 100 });
    return q.sort(() => Math.random() - 0.5);
  }

  let questions = bank();

  function renderShell() {
    PilotApp.mount("mathematics.html", `
      <section class="panel">
        <div class="panel-header">
          <div><h1>MATHEMATICS</h1><p>Aviation mental math. Enter numbers only (no units). Continue / Enter to submit.</p></div>
          <div class="mode-toggle" id="modeToggle">
            <button type="button" data-mode="practice" class="${mode==="practice"?"active":""}">Practice</button>
            <button type="button" data-mode="assessment" class="${mode==="assessment"?"active":""}">Assessment</button>
          </div>
        </div>
        <div class="status-bar">
          <div class="stat-chip"><span class="label">Question</span><span class="value" id="statQ">—</span></div>
          <div class="stat-chip"><span class="label">Correct</span><span class="value" id="statC">0</span></div>
          <div class="stat-chip"><span class="label">Avg time</span><span class="value" id="statT">—</span></div>
        </div>
        <div id="stage">
          <p class="instructions">${mode==="assessment" ? "Assessment: 12 questions, scored on accuracy and speed." : "Practice: unlimited questions."}</p>
          <div class="cta-row"><button class="btn btn-primary" id="btnStart">Start</button></div>
        </div>
        <div class="feedback" id="feedback"></div>
      </section>
    `);
    document.getElementById("modeToggle").onclick = (e) => {
      const b = e.target.closest("button[data-mode]");
      if (!b) return;
      mode = b.dataset.mode; idx = correct = 0; times = []; questions = bank(); renderShell();
    };
    document.getElementById("btnStart").onclick = () => { idx = correct = 0; times = []; questions = bank(); showQ(); };
  }

  function showQ() {
    if (mode === "assessment" && idx >= ASSESS_COUNT) return finish();
    if (idx >= questions.length) questions = bank();
    current = questions[idx];
    answered = false;
    startedAt = performance.now();
    document.getElementById("statQ").textContent = mode === "assessment" ? `${idx+1}/${ASSESS_COUNT}` : String(idx+1);
    document.getElementById("statC").textContent = String(correct);
    document.getElementById("statT").textContent = times.length ? ((times.reduce((a,b)=>a+b,0)/times.length)/1000).toFixed(1)+"s" : "—";
    document.getElementById("stage").innerHTML = `
      <div class="math-question">${PilotApp.escapeHtml(current.t)}</div>
      <div class="field answer-box"><label for="ans">Answer</label><input id="ans" inputmode="decimal" autocomplete="off" /></div>
      <div class="cta-row" style="margin-top:0.8rem;"><button class="btn btn-primary" id="btnGo">Continue</button></div>
    `;
    const ans = document.getElementById("ans");
    ans.focus();
    const submit = () => {
      if (answered) return;
      answered = true;
      const elapsed = performance.now() - startedAt;
      times.push(elapsed);
      const got = Number(String(ans.value).trim());
      const ok = Number.isFinite(got) && Math.abs(got - current.a) < 0.51;
      if (ok) correct++;
      PilotApp.showFeedback(document.getElementById("feedback"), ok,
        ok ? `<strong>Correct</strong> in ${(elapsed/1000).toFixed(1)}s` : `<strong>Incorrect</strong> — answer was ${current.a}`);
      idx++;
      setTimeout(showQ, 900);
    };
    document.getElementById("btnGo").onclick = submit;
    ans.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
  }

  function finish() {
    const accuracyPct = Math.round((correct / ASSESS_COUNT) * 100);
    const avgMs = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : 0;
    // score blends accuracy and speed (faster better, capped)
    const speedScore = Math.max(0, 100 - avgMs / 200);
    const score = Math.round(accuracyPct * 0.7 + speedScore * 0.3);
    PilotApp.saveResult({ module: "mathematics", mode, accuracyPct, avgMs, score, correct, total: ASSESS_COUNT });
    document.getElementById("stage").innerHTML = `
      <p class="instructions"><strong>Assessment complete.</strong> ${correct}/${ASSESS_COUNT} correct · score ${score}</p>
      <div class="cta-row"><a class="btn btn-primary" href="results.html">Results</a>
      <button class="btn btn-ghost" id="btnAgain">Again</button></div>`;
    document.getElementById("btnAgain").onclick = () => { idx = correct = 0; times = []; questions = bank(); showQ(); };
    PilotApp.showFeedback(document.getElementById("feedback"), true, `Saved · Accuracy ${accuracyPct}% · Avg ${(avgMs/1000).toFixed(1)}s`);
  }

  renderShell();
})();
