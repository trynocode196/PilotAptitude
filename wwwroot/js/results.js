(function () {
  const modules = [
    { id: "memory", label: "Memory" },
    { id: "control", label: "Control" },
    { id: "mathematics", label: "Mathematics" },
    { id: "slalom", label: "Slalom" },
    { id: "orientation", label: "Orientation" },
    { id: "taskmanager", label: "Task Manager" }
  ];

  function scoreOf(x) {
    if (typeof x.score === "number") return x.score;
    if (typeof x.accuracyPct === "number") return x.accuracyPct;
    if (typeof x.timeOnTargetPct === "number") return x.timeOnTargetPct;
    return 0;
  }

  function render() {
    const s = PilotApp.summary();
    const candidate = PilotApp.loadCandidate();
    PilotApp.mount("results.html", `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h1>RESULTS</h1>
            <p>${candidate ? PilotApp.escapeHtml(candidate.firstname + " " + candidate.lastname) + " · local history" : "No candidate registered yet."}</p>
          </div>
          <div class="cta-row">
            <button class="btn btn-ghost" id="btnExport">Export JSON</button>
            <button class="btn btn-warn" id="btnClear">Clear</button>
          </div>
        </div>
        <div class="module-grid" id="cards"></div>
        <h2 style="font-family:var(--font-display);letter-spacing:0.08em;margin:1.5rem 0 0.7rem;">SESSION HISTORY</h2>
        <ul class="history-list" id="history"></ul>
      </section>
    `);

    const cards = document.getElementById("cards");
    modules.forEach((m) => {
      const rows = s.by(m.id);
      const avg = s.avg(rows, scoreOf);
      const card = document.createElement("article");
      card.className = "module-card";
      card.style.animation = "none";
      card.innerHTML = `
        <span class="tag">${m.label}</span>
        <h2>${rows.length ? Math.round(avg) : "—"}</h2>
        <p>${rows.length ? rows.length + " session(s)" : "No sessions yet"}</p>
        <div class="chart-bars"></div>`;
      const chart = card.querySelector(".chart-bars");
      rows.slice(0, 5).forEach((r, i) => {
        const pct = Math.max(0, Math.min(100, scoreOf(r)));
        const row = document.createElement("div");
        row.className = "bar-row";
        row.innerHTML = `<span>#${i+1}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span>${Math.round(pct)}</span>`;
        chart.appendChild(row);
      });
      cards.appendChild(card);
    });

    const hist = document.getElementById("history");
    if (!s.all.length) {
      hist.innerHTML = `<li>No recorded attempts yet.</li>`;
    } else {
      hist.innerHTML = s.all.map((x) => {
        const when = new Date(x.timestamp).toLocaleString();
        return `<li><span><strong>${x.module.toUpperCase()}</strong> · ${x.mode || ""} · score ${Math.round(scoreOf(x))}</span><span>${when}</span></li>`;
      }).join("");
    }

    document.getElementById("btnClear").onclick = () => {
      if (confirm("Clear all results?")) { PilotApp.clearResults(); render(); }
    };
    document.getElementById("btnExport").onclick = () => {
      const blob = new Blob([JSON.stringify({ candidate: PilotApp.loadCandidate(), results: PilotApp.loadResults() }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pilot-aptitude-results-${Date.now()}.json`;
      a.click();
    };
  }

  render();
})();
