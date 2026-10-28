(function () {
  const memTitle = document.getElementById("memTitle");
  const memSummary = document.getElementById("memSummary");
  const memChart = document.getElementById("memChart");
  const ctlTitle = document.getElementById("ctlTitle");
  const ctlSummary = document.getElementById("ctlSummary");
  const ctlChart = document.getElementById("ctlChart");
  const historyList = document.getElementById("historyList");

  function bar(label, pct, suffix) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>
      <span>${suffix}</span>`;
    return row;
  }

  function render() {
    const s = PilotScoring.summary();

    if (s.memory.length) {
      memTitle.textContent = `${Math.round(s.memoryAvgAccuracy)}% avg accuracy`;
      memSummary.textContent = `${s.memory.length} session(s) · avg recall ${(s.memoryAvgTime / 1000).toFixed(1)}s`;
      memChart.innerHTML = "";
      s.memory.slice(0, 6).forEach((m, i) => {
        memChart.appendChild(bar(`#${i + 1}`, m.accuracyPct || 0, `${m.accuracyPct || 0}%`));
      });
    } else {
      memTitle.textContent = "No sessions yet";
      memSummary.textContent = "Complete a Memory assessment or practice run to populate this chart.";
      memChart.innerHTML = "";
    }

    if (s.control.length) {
      ctlTitle.textContent = `${Math.round(s.controlAvgOnTarget)}% on target`;
      ctlSummary.textContent = `${s.control.length} session(s) · mean |dev| ${s.controlAvgDeviation.toFixed(1)} px`;
      ctlChart.innerHTML = "";
      s.control.slice(0, 6).forEach((c, i) => {
        ctlChart.appendChild(bar(`#${i + 1}`, c.timeOnTargetPct || 0, `${c.timeOnTargetPct || 0}%`));
      });
    } else {
      ctlTitle.textContent = "No sessions yet";
      ctlSummary.textContent = "Complete a Control run to see on-target % and deviation metrics.";
      ctlChart.innerHTML = "";
    }

    if (!s.all.length) {
      historyList.innerHTML = `<li class="empty-state">No recorded attempts yet.</li>`;
      return;
    }

    historyList.innerHTML = s.all
      .map((x) => {
        const when = new Date(x.timestamp).toLocaleString();
        if (x.module === "memory") {
          return `<li><span><strong>MEMORY</strong> · ${x.mode} · ${x.accuracyPct}% · ${(x.avgRecallMs / 1000).toFixed(1)}s avg</span><span>${when}</span></li>`;
        }
        return `<li><span><strong>CONTROL</strong> · ${x.mode} · ${x.timeOnTargetPct}% on target · ${x.corrections} corr</span><span>${when}</span></li>`;
      })
      .join("");
  }

  document.getElementById("btnClear").addEventListener("click", () => {
    if (confirm("Clear all local results?")) {
      PilotScoring.clear();
      render();
    }
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(PilotScoring.load(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pilot-aptitude-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  render();
})();
