window.PilotScoring = (function () {
  const KEY = "pilotAptitudeResults_v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function save(entry) {
    const all = load();
    all.unshift({
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
    return all[0];
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function summary() {
    const all = load();
    const memory = all.filter((x) => x.module === "memory");
    const control = all.filter((x) => x.module === "control");

    const avg = (arr, pick) =>
      arr.length ? arr.reduce((s, x) => s + pick(x), 0) / arr.length : 0;

    return {
      all,
      memory,
      control,
      memoryAvgAccuracy: avg(memory, (x) => x.accuracyPct || 0),
      memoryAvgTime: avg(memory, (x) => x.avgRecallMs || 0),
      controlAvgOnTarget: avg(control, (x) => x.timeOnTargetPct || 0),
      controlAvgDeviation: avg(control, (x) => x.meanAbsDeviation || 0)
    };
  }

  return { load, save, clear, summary };
})();
