(function () {
  let mode = "practice";
  const ASSESSMENT_ROUNDS = 8;
  let round = 0, correctCount = 0, totalChecks = 0, recallTimes = [], current = null, blankKeys = [], revealAt = 0, timer = null;

  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function generate(diff) {
    return {
      a: String(randInt(20, 120) * (diff >= 3 ? 100 : 500)),
      s: String(randInt(120, 320)),
      h: String(randInt(0, 35) * 10).padStart(3, "0"),
      r: (randInt(1180, 1360) / 10).toFixed(2)
    };
  }
  function displayMs(d) { return mode === "practice" ? 7000 : Math.max(3500, 8000 - d * 500); }
  function blankCount(d) {
    if (mode === "practice") return d <= 1 ? 1 : 2;
    if (d <= 2) return 1; if (d <= 5) return 2; return d <= 6 ? 3 : 4;
  }
  function norm(key, value) {
    const raw = String(value).trim().toLowerCase().replace(/[^\d.]/g, "");
    if (!raw) return "";
    if (key === "h") return String(Number(raw)).padStart(3, "0");
    if (key === "r") return Number(raw).toFixed(2);
    return String(Number(raw));
  }

  function render() {
    PilotApp.mount("memory.html", `
      <section class="panel">
        <div class="panel-header">
          <div><h1>MEMORY</h1><p>Memorize NEW Data values, then recall blanked fields. Prefer forms like <code>240s</code>.</p></div>
          <div class="mode-toggle" id="modeToggle">
            <button type="button" data-mode="practice" class="${mode==="practice"?"active":""}">Practice</button>
            <button type="button" data-mode="assessment" class="${mode==="assessment"?"active":""}">Assessment</button>
          </div>
        </div>
        <div class="status-bar">
          <div class="stat-chip"><span class="label">Round</span><span class="value" id="statRound">—</span></div>
          <div class="stat-chip"><span class="label">Score</span><span class="value" id="statScore">0%</span></div>
          <div class="stat-chip"><span class="label">Avg recall</span><span class="value" id="statTime">—</span></div>
        </div>
        <div class="data-panel">
          <div class="param-grid">
            <div class="param" data-key="a"><span class="key">A · ALTITUDE</span><span class="val" id="valA">—</span></div>
            <div class="param" data-key="s"><span class="key">S · SPEED</span><span class="val" id="valS">—</span></div>
            <div class="param" data-key="h"><span class="key">H · HEADING</span><span class="val" id="valH">—</span></div>
            <div class="param" data-key="r"><span class="key">R · RADIO</span><span class="val" id="valR">—</span></div>
          </div>
        </div>
        <div class="cta-row" id="startRow" style="margin-top:0.9rem;">
          <button class="btn btn-primary" id="btnStart">Begin trial</button>
        </div>
        <form class="recall-form hidden" id="recallForm" autocomplete="off">
          <div class="field"><label for="inputA">Altitude (a)</label><input id="inputA" placeholder="3500a" /></div>
          <div class="field"><label for="inputS">Speed (s)</label><input id="inputS" placeholder="240s" /></div>
          <div class="field"><label for="inputH">Heading (h)</label><input id="inputH" placeholder="275h" /></div>
          <div class="field"><label for="inputR">Radio (r)</label><input id="inputR" placeholder="118.75r" /></div>
          <div class="cta-row" style="grid-column:1/-1;"><button class="btn btn-primary" type="submit">Submit recall</button></div>
        </form>
        <div class="feedback" id="feedback"></div>
        <div class="cta-row hidden" id="endRow" style="margin-top:0.8rem;">
          <a class="btn btn-primary" href="results.html">Results</a>
          <button class="btn btn-ghost" id="btnRestart">Run again</button>
        </div>
      </section>
    `);
    wire();
    updateStats();
  }

  function showValues(data, blank=[]) {
    const map = { a: "valA", s: "valS", h: "valH", r: "valR" };
    Object.keys(map).forEach((k) => {
      document.getElementById(map[k]).textContent = blank.includes(k) ? "???" : data[k];
    });
    document.querySelectorAll(".param").forEach((n) => n.classList.toggle("blanked", blank.includes(n.dataset.key)));
  }

  function updateStats() {
    document.getElementById("statRound").textContent = mode === "assessment" ? `${round}/${ASSESSMENT_ROUNDS}` : String(Math.max(round,0));
    const pct = totalChecks ? Math.round((correctCount / totalChecks) * 100) : 0;
    document.getElementById("statScore").textContent = pct + "%";
    document.getElementById("statTime").textContent = recallTimes.length
      ? ((recallTimes.reduce((a,b)=>a+b,0)/recallTimes.length)/1000).toFixed(1) + "s" : "—";
  }

  function finish() {
    const accuracyPct = totalChecks ? Math.round((correctCount / totalChecks) * 100) : 0;
    const avgRecallMs = recallTimes.length ? Math.round(recallTimes.reduce((a,b)=>a+b,0)/recallTimes.length) : 0;
    if (totalChecks > 0) {
      PilotApp.saveResult({ module: "memory", mode, accuracyPct, avgRecallMs, score: accuracyPct, correct: correctCount, total: totalChecks });
    }
    document.getElementById("recallForm").classList.add("hidden");
    document.getElementById("startRow").classList.add("hidden");
    document.getElementById("endRow").classList.remove("hidden");
    PilotApp.showFeedback(document.getElementById("feedback"), true, `<strong>Complete.</strong> Accuracy ${accuracyPct}% · Avg ${(avgRecallMs/1000).toFixed(1)}s`);
  }

  function startRound() {
    clearTimeout(timer);
    document.getElementById("feedback").className = "feedback";
    document.getElementById("endRow").classList.add("hidden");
    document.getElementById("recallForm").classList.add("hidden");
    document.getElementById("startRow").classList.add("hidden");
    round += 1;
    const diff = mode === "assessment" ? round : Math.min(round, 5);
    current = generate(diff);
    blankKeys = [];
    showValues(current);
    updateStats();
    timer = setTimeout(() => {
      const keys = ["a","s","h","r"];
      blankKeys = keys.sort(() => Math.random() - 0.5).slice(0, blankCount(diff));
      showValues(current, blankKeys);
      const inputs = { a: inputA, s: inputS, h: inputH, r: inputR };
      ["a","s","h","r"].forEach((k) => {
        inputs[k].value = blankKeys.includes(k) ? "" : current[k];
        inputs[k].readOnly = !blankKeys.includes(k);
      });
      document.getElementById("recallForm").classList.remove("hidden");
      revealAt = performance.now();
      inputs[blankKeys[0]]?.focus();
    }, displayMs(diff));
  }

  function wire() {
    document.getElementById("modeToggle").onclick = (e) => {
      const b = e.target.closest("button[data-mode]");
      if (!b) return;
      mode = b.dataset.mode;
      round = correctCount = totalChecks = 0; recallTimes = [];
      render();
    };
    document.getElementById("btnStart").onclick = startRound;
    document.getElementById("btnRestart")?.addEventListener("click", () => {
      round = correctCount = totalChecks = 0; recallTimes = []; render();
    });
    document.getElementById("recallForm").onsubmit = (e) => {
      e.preventDefault();
      const answers = { a: inputA.value, s: inputS.value, h: inputH.value, r: inputR.value };
      const elapsed = performance.now() - revealAt;
      recallTimes.push(elapsed);
      let okN = 0; const details = [];
      blankKeys.forEach((k) => {
        totalChecks++;
        const ok = norm(k, answers[k]) === norm(k, current[k]);
        if (ok) { correctCount++; okN++; }
        details.push(`${k.toUpperCase()}: ${ok ? "✓" : "✗ ("+current[k]+")"}`);
      });
      showValues(current);
      updateStats();
      PilotApp.showFeedback(document.getElementById("feedback"), okN === blankKeys.length,
        `<strong>${okN}/${blankKeys.length}</strong> in ${(elapsed/1000).toFixed(1)}s — ${details.join(" · ")}`);
      document.getElementById("recallForm").classList.add("hidden");
      if (mode === "assessment" && round >= ASSESSMENT_ROUNDS) { finish(); return; }
      timer = setTimeout(() => {
        if (mode === "practice") {
          document.getElementById("startRow").classList.remove("hidden");
          document.getElementById("btnStart").textContent = "Next round";
        } else startRound();
      }, 1200);
    };
  }

  render();
})();
