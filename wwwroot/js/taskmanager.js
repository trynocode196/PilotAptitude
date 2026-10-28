(function () {
  let mode = "practice";
  let running = false, leftMs = 90000, startedAt = 0, timerId = 0;
  let ap = { a: 5000, h: 90, s: 220 };
  let news = null;
  let alerts = [false, false, false];
  let transfers = 0, transferOk = 0, alertsHandled = 0, alertsMissed = 0;
  let nextNewsAt = 0, nextAlertAt = 0;

  function keysHud() {
    const k = PilotApp.loadKeys();
    return `<div class="keys-live">Alerts:
      <span class="keycap">${PilotApp.prettyKey(k.cancelAlert1)}</span>
      <span class="keycap">${PilotApp.prettyKey(k.cancelAlert2)}</span>
      <span class="keycap">${PilotApp.prettyKey(k.cancelAlert3)}</span>
      · Confirm <span class="keycap">${PilotApp.prettyKey(k.confirm)}</span>
      · <a href="settings.html">rebind</a></div>`;
  }

  function render() {
    PilotApp.mount("taskmanager.html", `
      <section class="panel">
        <div class="panel-header">
          <div><h1>TASK MANAGER</h1><p>Transfer NEW INFORMATION into Autopilot Settings while cancelling alert lamps. Dual-task load.</p></div>
          <div class="mode-toggle" id="modeToggle">
            <button type="button" data-mode="practice" class="${mode==="practice"?"active":""}">Practice</button>
            <button type="button" data-mode="assessment" class="${mode==="assessment"?"active":""}">Assessment</button>
          </div>
        </div>
        ${keysHud()}
        <div class="status-bar">
          <div class="stat-chip"><span class="label">Time</span><span class="value" id="statTime">90s</span></div>
          <div class="stat-chip"><span class="label">Transfers</span><span class="value" id="statTr">0</span></div>
          <div class="stat-chip"><span class="label">Alerts OK</span><span class="value" id="statAl">0</span></div>
        </div>
        <div id="stage">
          <p class="instructions">Primary: copy Altitude / Heading / Speed from New Information into Autopilot, then Confirm. Secondary: press alert keys when lamps flash.</p>
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

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  function begin() {
    running = true;
    leftMs = mode === "assessment" ? 120000 : 90000;
    startedAt = performance.now();
    transfers = transferOk = alertsHandled = alertsMissed = 0;
    alerts = [false, false, false];
    ap = { a: 5000, h: 90, s: 220 };
    news = null;
    nextNewsAt = performance.now() + 1500;
    nextAlertAt = performance.now() + 2500;
    showBoard();
    clearInterval(timerId);
    timerId = setInterval(tick, 200);
  }

  function showBoard() {
    document.getElementById("stage").innerHTML = `
      <div class="task-layout">
        <div class="panel" style="box-shadow:none;">
          <h2 style="font-family:var(--font-display);margin:0 0 0.6rem;">NEW INFORMATION</h2>
          <div id="newsPanel" class="data-panel" style="min-height:120px;">
            <p class="instructions" id="newsText">Waiting for clearance…</p>
          </div>
        </div>
        <div class="panel" style="box-shadow:none;">
          <h2 style="font-family:var(--font-display);margin:0 0 0.6rem;">AUTOPILOT SETTINGS</h2>
          <div class="form-grid">
            <div class="field"><label>Altitude</label><input id="apA" value="${ap.a}" /></div>
            <div class="field"><label>Heading</label><input id="apH" value="${ap.h}" /></div>
            <div class="field"><label>Speed</label><input id="apS" value="${ap.s}" /></div>
          </div>
          <div class="cta-row" style="margin-top:0.7rem;"><button class="btn btn-primary" id="btnConfirm">Confirm transfer</button></div>
        </div>
      </div>
      <div style="margin-top:0.9rem;">
        <strong style="font-family:var(--font-display);letter-spacing:0.08em;">ALERTS</strong>
        <div id="alertRow"></div>
      </div>
    `;
    paintAlerts();
    document.getElementById("btnConfirm").onclick = confirmTransfer;
    if (news) paintNews();
  }

  function paintNews() {
    const el = document.getElementById("newsText");
    if (!el || !news) return;
    el.innerHTML = `ALT <strong>${news.a}</strong> · HDG <strong>${news.h}</strong> · SPD <strong>${news.s}</strong>`;
  }

  function paintAlerts() {
    const row = document.getElementById("alertRow");
    if (!row) return;
    const k = PilotApp.loadKeys();
    row.innerHTML = [0,1,2].map((i) =>
      `<span class="alert-lamp ${alerts[i]?"active":""}">ALERT ${i+1} <span class="keycap">${PilotApp.prettyKey([k.cancelAlert1,k.cancelAlert2,k.cancelAlert3][i])}</span></span>`
    ).join("");
  }

  function confirmTransfer() {
    if (!running || !news) return;
    transfers++;
    const a = Number(document.getElementById("apA").value);
    const h = Number(document.getElementById("apH").value);
    const s = Number(document.getElementById("apS").value);
    const ok = a === news.a && h === news.h && s === news.s;
    if (ok) {
      transferOk++;
      ap = { ...news };
      news = null;
      document.getElementById("newsText").textContent = "Standing by…";
      PilotApp.showFeedback(document.getElementById("feedback"), true, "Autopilot updated.");
    } else {
      PilotApp.showFeedback(document.getElementById("feedback"), false, "Mismatch — check NEW INFORMATION values.");
    }
    document.getElementById("statTr").textContent = `${transferOk}/${transfers}`;
  }

  function tick() {
    if (!running) return;
    const now = performance.now();
    leftMs = Math.max(0, (mode === "assessment" ? 120000 : 90000) - (now - startedAt));
    document.getElementById("statTime").textContent = Math.ceil(leftMs / 1000) + "s";
    document.getElementById("statAl").textContent = String(alertsHandled);

    if (!news && now >= nextNewsAt) {
      news = { a: randInt(30, 120) * 100, h: randInt(0, 35) * 10, s: randInt(160, 280) };
      paintNews();
      nextNewsAt = now + randInt(8000, 14000);
    }

    if (now >= nextAlertAt) {
      // miss previous active alerts
      alerts.forEach((on, i) => { if (on) { alertsMissed++; alerts[i] = false; } });
      const idx = randInt(0, 2);
      alerts[idx] = true;
      paintAlerts();
      nextAlertAt = now + randInt(4000, 9000);
    }

    if (leftMs <= 0) finish();
  }

  function finish() {
    running = false;
    clearInterval(timerId);
    const accuracy = transfers ? Math.round((transferOk / transfers) * 100) : 0;
    const alertScore = (alertsHandled + alertsMissed) ? Math.round((alertsHandled / (alertsHandled + alertsMissed)) * 100) : 100;
    const score = Math.round(accuracy * 0.6 + alertScore * 0.4);
    PilotApp.saveResult({
      module: "taskmanager", mode, score, accuracyPct: accuracy, transferOk, transfers,
      alertsHandled, alertsMissed, alertScore
    });
    document.getElementById("stage").innerHTML = `
      <p class="instructions"><strong>Complete.</strong> Transfers ${transferOk}/${transfers} · Alerts ${alertsHandled} handled · Score ${score}</p>
      <div class="cta-row"><a class="btn btn-primary" href="results.html">Results</a>
      <button class="btn btn-ghost" id="btnAgain">Again</button></div>`;
    document.getElementById("btnAgain").onclick = begin;
    PilotApp.showFeedback(document.getElementById("feedback"), true, "Session saved.");
  }

  window.addEventListener("keydown", (e) => {
    if (!running) return;
    const k = PilotApp.loadKeys();
    const map = [k.cancelAlert1, k.cancelAlert2, k.cancelAlert3];
    const idx = map.indexOf(e.code);
    if (idx >= 0 && alerts[idx]) {
      alerts[idx] = false;
      alertsHandled++;
      paintAlerts();
      document.getElementById("statAl").textContent = String(alertsHandled);
      e.preventDefault();
    }
    if (e.code === k.confirm) {
      e.preventDefault();
      confirmTransfer();
    }
  });

  render();
})();
