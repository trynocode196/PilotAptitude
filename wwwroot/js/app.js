window.PilotApp = (function () {
  const CANDIDATE_KEY = "pilotCandidate_v2";
  const RESULTS_KEY = "pilotResults_v2";
  const KEYS_KEY = "pilotKeybinds_v2";

  const DEFAULT_KEYS = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    confirm: "Enter",
    cancelAlert1: "Digit1",
    cancelAlert2: "Digit2",
    cancelAlert3: "Digit3"
  };

  function loadKeys() {
    try {
      return { ...DEFAULT_KEYS, ...JSON.parse(localStorage.getItem(KEYS_KEY) || "{}") };
    } catch {
      return { ...DEFAULT_KEYS };
    }
  }

  function saveKeys(keys) {
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  }

  function resetKeys() {
    localStorage.removeItem(KEYS_KEY);
    return loadKeys();
  }

  function prettyKey(code) {
    return String(code)
      .replace(/^Arrow/, "")
      .replace(/^Digit/, "")
      .replace(/^Key/, "");
  }

  function loadCandidate() {
    try {
      return JSON.parse(localStorage.getItem(CANDIDATE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveCandidate(data) {
    localStorage.setItem(CANDIDATE_KEY, JSON.stringify(data));
  }

  function loadResults() {
    try {
      return JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveResult(entry) {
    const all = loadResults();
    const candidate = loadCandidate();
    all.unshift({
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: new Date().toISOString(),
      candidateName: candidate ? `${candidate.firstname || ""} ${candidate.lastname || ""}`.trim() : ""
    });
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all.slice(0, 100)));
    return all[0];
  }

  function clearResults() {
    localStorage.removeItem(RESULTS_KEY);
  }

  function summary() {
    const all = loadResults();
    const by = (m) => all.filter((x) => x.module === m);
    const avg = (arr, pick) => (arr.length ? arr.reduce((s, x) => s + (pick(x) || 0), 0) / arr.length : 0);
    return { all, by, avg };
  }

  function matchAction(e, action) {
    const keys = loadKeys();
    return e.code === keys[action] || e.key === keys[action];
  }

  function isHeld(heldSet, action) {
    const keys = loadKeys();
    return heldSet.has(keys[action]);
  }

  function shell(active) {
    const candidate = loadCandidate();
    const name = candidate ? `${candidate.firstname || ""} ${candidate.lastname || ""}`.trim() : "Not registered";
    return `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="index.html">
          <span class="brand-mark"></span>
          <span class="brand-text">PILOT APTITUDE</span>
        </a>
        <nav class="topnav">
          ${nav("index.html", "Home", active)}
          ${nav("intro.html", "Intro", active)}
          ${nav("memory.html", "Memory", active)}
          ${nav("control.html", "Control", active)}
          ${nav("mathematics.html", "Math", active)}
          ${nav("slalom.html", "Slalom", active)}
          ${nav("orientation.html", "Orient", active)}
          ${nav("taskmanager.html", "Tasks", active)}
          ${nav("settings.html", "Keys", active)}
          ${nav("results.html", "Results", active)}
        </nav>
      </header>
      <main class="main-stage" id="main"></main>
      <footer class="app-footer">
        <span>Windows · Keyboard only · COMPASS™-inspired</span>
        <span>Candidate: ${escapeHtml(name || "Not registered")}</span>
      </footer>
    </div>`;
  }

  function nav(href, label, active) {
    return `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function mount(active, html) {
    document.body.innerHTML = shell(active);
    document.getElementById("main").innerHTML = html;
  }

  function showFeedback(el, ok, html) {
    el.className = `feedback show ${ok ? "ok" : "bad"}`;
    el.innerHTML = html;
  }

  return {
    DEFAULT_KEYS,
    loadKeys,
    saveKeys,
    resetKeys,
    prettyKey,
    loadCandidate,
    saveCandidate,
    loadResults,
    saveResult,
    clearResults,
    summary,
    matchAction,
    isHeld,
    mount,
    showFeedback,
    escapeHtml
  };
})();
