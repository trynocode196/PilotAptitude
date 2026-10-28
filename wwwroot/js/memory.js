(function () {
  const params = new URLSearchParams(window.location.search);
  let mode = params.get("mode") === "assessment" ? "assessment" : "practice";

  const els = {
    modeToggle: document.getElementById("modeToggle"),
    instructions: document.getElementById("instructions"),
    statRound: document.getElementById("statRound"),
    statScore: document.getElementById("statScore"),
    statTime: document.getElementById("statTime"),
    statMode: document.getElementById("statMode"),
    valA: document.getElementById("valA"),
    valS: document.getElementById("valS"),
    valH: document.getElementById("valH"),
    valR: document.getElementById("valR"),
    paramNodes: [...document.querySelectorAll(".param")],
    startRow: document.getElementById("startRow"),
    btnStart: document.getElementById("btnStart"),
    btnHowTo: document.getElementById("btnHowTo"),
    recallForm: document.getElementById("recallForm"),
    inputA: document.getElementById("inputA"),
    inputS: document.getElementById("inputS"),
    inputH: document.getElementById("inputH"),
    inputR: document.getElementById("inputR"),
    feedback: document.getElementById("feedback"),
    endRow: document.getElementById("endRow"),
    btnRestart: document.getElementById("btnRestart")
  };

  const ASSESSMENT_ROUNDS = 8;
  let round = 0;
  let correctCount = 0;
  let totalChecks = 0;
  let recallTimes = [];
  let current = null;
  let blankKeys = [];
  let revealAt = 0;
  let phaseTimer = null;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateData(difficulty) {
    const altStep = difficulty >= 3 ? 100 : 500;
    const alt = randInt(20, 120) * altStep;
    const speed = randInt(120, 320);
    const heading = randInt(0, 35) * 10;
    const radio = (randInt(1180, 1360) / 10).toFixed(2);
    return { a: String(alt), s: String(speed), h: String(heading).padStart(3, "0"), r: radio };
  }

  function displayMs(difficulty) {
    if (mode === "practice") return 7000;
    return Math.max(3500, 8000 - difficulty * 500);
  }

  function blankCount(difficulty) {
    if (mode === "practice") return difficulty <= 1 ? 1 : 2;
    if (difficulty <= 2) return 1;
    if (difficulty <= 5) return 2;
    return difficulty <= 6 ? 3 : 4;
  }

  function setMode(next) {
    mode = next;
    [...els.modeToggle.querySelectorAll("button")].forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    els.statMode.textContent = mode === "assessment" ? "Assess" : "Practice";
    els.instructions.textContent =
      mode === "assessment"
        ? "Assessment: 8 rounds, shorter display times, more blanks. Results are saved when you finish."
        : "Practice: unlimited rounds, no pressure. Use this to learn the flow before assessment.";
  }

  function showValues(data, blank = []) {
    const map = { a: els.valA, s: els.valS, h: els.valH, r: els.valR };
    Object.keys(map).forEach((k) => {
      map[k].textContent = blank.includes(k) ? "???" : data[k];
    });
    els.paramNodes.forEach((node) => {
      node.classList.toggle("blanked", blank.includes(node.dataset.key));
    });
  }

  function clearInputs() {
    [els.inputA, els.inputS, els.inputH, els.inputR].forEach((i) => (i.value = ""));
  }

  function setBusy(busy) {
    els.modeToggle.querySelectorAll("button").forEach((b) => (b.disabled = busy));
  }

  function updateStats() {
    els.statRound.textContent = mode === "assessment" ? `${round}/${ASSESSMENT_ROUNDS}` : String(Math.max(round, 0));
    const pct = totalChecks ? Math.round((correctCount / totalChecks) * 100) : 0;
    els.statScore.textContent = `${pct}%`;
    if (recallTimes.length) {
      const avg = recallTimes.reduce((a, b) => a + b, 0) / recallTimes.length;
      els.statTime.textContent = `${(avg / 1000).toFixed(1)}s`;
    } else {
      els.statTime.textContent = "—";
    }
  }

  function showFeedback(ok, html) {
    els.feedback.className = `feedback show ${ok ? "ok" : "bad"}`;
    els.feedback.innerHTML = html;
  }

  function finishAssessment() {
    const accuracyPct = totalChecks ? Math.round((correctCount / totalChecks) * 100) : 0;
    const avgRecallMs = recallTimes.length
      ? Math.round(recallTimes.reduce((a, b) => a + b, 0) / recallTimes.length)
      : 0;

    if (mode === "assessment") {
      PilotScoring.save({
        module: "memory",
        mode,
        accuracyPct,
        avgRecallMs,
        rounds: ASSESSMENT_ROUNDS,
        correct: correctCount,
        total: totalChecks
      });
    } else if (totalChecks > 0) {
      PilotScoring.save({
        module: "memory",
        mode,
        accuracyPct,
        avgRecallMs,
        rounds: round,
        correct: correctCount,
        total: totalChecks
      });
    }

    els.recallForm.classList.add("hidden");
    els.startRow.classList.add("hidden");
    els.endRow.classList.remove("hidden");
    setBusy(false);
    showFeedback(
      true,
      `<strong>Session complete.</strong> Accuracy ${accuracyPct}% · Avg recall ${(avgRecallMs / 1000).toFixed(1)}s`
    );
  }

  function startRound() {
    clearTimeout(phaseTimer);
    els.feedback.className = "feedback";
    els.endRow.classList.add("hidden");
    els.recallForm.classList.add("hidden");
    els.startRow.classList.add("hidden");
    setBusy(true);

    round += 1;
    const difficulty = mode === "assessment" ? round : Math.min(round, 5);
    current = generateData(difficulty);
    blankKeys = [];
    showValues(current, []);
    updateStats();

    const showFor = displayMs(difficulty);
    phaseTimer = setTimeout(() => {
      const keys = ["a", "s", "h", "r"];
      const n = blankCount(difficulty);
      blankKeys = keys.sort(() => Math.random() - 0.5).slice(0, n);
      showValues(current, blankKeys);
      clearInputs();
      els.recallForm.classList.remove("hidden");
      revealAt = performance.now();

      // Focus first blanked field
      const focusMap = { a: els.inputA, s: els.inputS, h: els.inputH, r: els.inputR };
      blankKeys.forEach((k) => {
        focusMap[k].required = true;
      });
      ["a", "s", "h", "r"].forEach((k) => {
        if (!blankKeys.includes(k)) {
          focusMap[k].required = false;
          focusMap[k].value = current[k];
          focusMap[k].readOnly = true;
        } else {
          focusMap[k].readOnly = false;
        }
      });
      focusMap[blankKeys[0]]?.focus();
    }, showFor);
  }

  function normalize(key, value) {
    const v = String(value).trim().toLowerCase().replace(/[ahr]/g, "");
    if (key === "h") return v.padStart(3, "0");
    if (key === "r") return Number(v).toFixed(2);
    return String(Number(v));
  }

  els.recallForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!current) return;

    const answers = {
      a: els.inputA.value,
      s: els.inputS.value,
      h: els.inputH.value,
      r: els.inputR.value
    };

    const elapsed = performance.now() - revealAt;
    recallTimes.push(elapsed);

    let roundCorrect = 0;
    const details = [];
    blankKeys.forEach((k) => {
      totalChecks += 1;
      const expected = keyNormalize(k, current[k]);
      const got = keyNormalize(k, answers[k]);
      const ok = expected === got;
      if (ok) {
        correctCount += 1;
        roundCorrect += 1;
      }
      details.push(`${k.toUpperCase()}: ${ok ? "✓" : `✗ (was ${current[k]})`}`);
    });

    showValues(current, []);
    updateStats();
    showFeedback(
      roundCorrect === blankKeys.length,
      `<strong>${roundCorrect}/${blankKeys.length} correct</strong> in ${(elapsed / 1000).toFixed(1)}s — ${details.join(" · ")}`
    );

    els.recallForm.classList.add("hidden");

    const done =
      mode === "assessment"
        ? round >= ASSESSMENT_ROUNDS
        : false;

    if (done) {
      finishAssessment();
      return;
    }

    phaseTimer = setTimeout(() => {
      if (mode === "practice") {
        els.startRow.classList.remove("hidden");
        els.btnStart.textContent = "Next round";
        setBusy(false);
      } else {
        startRound();
      }
    }, 1600);
  });

  function keyNormalize(key, value) {
    const raw = String(value).trim().toLowerCase().replace(/[^\d.]/g, "");
    if (!raw) return "";
    if (key === "h") return String(Number(raw)).padStart(3, "0");
    if (key === "r") return Number(raw).toFixed(2);
    return String(Number(raw));
  }

  els.modeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn || btn.disabled) return;
    setMode(btn.dataset.mode);
    round = 0;
    correctCount = 0;
    totalChecks = 0;
    recallTimes = [];
    updateStats();
    els.endRow.classList.add("hidden");
    els.feedback.className = "feedback";
    els.btnStart.textContent = "Begin trial";
    els.startRow.classList.remove("hidden");
  });

  els.btnStart.addEventListener("click", startRound);
  els.btnRestart?.addEventListener("click", () => {
    round = 0;
    correctCount = 0;
    totalChecks = 0;
    recallTimes = [];
    updateStats();
    els.endRow.classList.add("hidden");
    els.feedback.className = "feedback";
    els.startRow.classList.remove("hidden");
    els.btnStart.textContent = "Begin trial";
  });

  els.btnHowTo.addEventListener("click", () => {
    showFeedback(
      true,
      "Watch the NEW DATA panel. After a few seconds, some fields blank. Enter the missing numbers and submit. Accuracy and speed both count."
    );
  });

  setMode(mode);
  updateStats();
  showValues({ a: "—", s: "—", h: "—", r: "—" }, []);
})();
