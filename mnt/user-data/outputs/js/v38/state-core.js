(function installV38StateCore(root, factory) {
  let foundation = root.GreenlitV37?.state || null;
  if (!foundation && typeof module !== "undefined" && module.exports) {
    foundation = require("../v37/state-core.js");
  }
  const namespace = root.GreenlitV38 || (root.GreenlitV38 = {});
  const state = factory(foundation);
  namespace.state = state;
  if (typeof module !== "undefined" && module.exports) module.exports = state;
})(typeof globalThis !== "undefined" ? globalThis : window, function createV38StateCore(foundation) {
  "use strict";

  if (!foundation) throw new Error("V38 requires the V37 state foundation.");

  const VERSION = 38;
  const SAVE_KEY = "greenlit-v38-save";
  const RESET_MARKER = "greenlit-v38-reset-complete";
  const DECISION_IDS = Object.freeze(["first-cut", "rehearsal-week", "final-sequence"]);

  function resetLegacyStorage(storage = globalThis.localStorage) {
    if (!storage || typeof storage.getItem !== "function") return false;
    try {
      if (storage.getItem(RESET_MARKER) === "1") return false;
      const remove = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || key === RESET_MARKER || key === "tmdb-token") continue;
        if (key.startsWith("greenlit") || key.startsWith("glc:")) remove.push(key);
      }
      remove.forEach((key) => storage.removeItem(key));
      storage.setItem(RESET_MARKER, "1");
      return true;
    } catch {
      return false;
    }
  }

  function readiness(state) {
    const steps = foundation.readiness(state).map((step) => ({
      ...step,
      missing: step.missing.slice(),
    }));
    const choices = state?.arcade?.decisionLedger?.choices || {};
    const missingDecisions = DECISION_IDS.filter((id) => !choices[id]);
    if (steps[2].complete && missingDecisions.length) {
      steps[2] = {
        complete: false,
        missing: missingDecisions,
        message: `Resolve ${missingDecisions.length} production decision${missingDecisions.length === 1 ? "" : "s"} before continuing.`,
      };
    }
    return steps;
  }

  function guardScreen(state, requestedScreen) {
    const requested = Math.max(0, Math.min(5, Number(requestedScreen) || 0));
    const steps = readiness(state);
    const firstIncomplete = steps.slice(0, 5).findIndex((step) => !step.complete);
    if (firstIncomplete >= 0 && requested > firstIncomplete) {
      return {
        screen: firstIncomplete,
        redirected: true,
        message: steps[firstIncomplete].message,
        missing: steps[firstIncomplete].missing.slice(),
      };
    }
    if (requested === 5 && !steps[5].complete) {
      return {
        screen: Math.max(0, firstIncomplete),
        redirected: true,
        message: steps[5].message,
        missing: steps[5].missing.slice(),
      };
    }
    return { screen: requested, redirected: false, message: "", missing: [] };
  }

  return Object.freeze({
    ...foundation,
    VERSION,
    SAVE_KEY,
    RESET_MARKER,
    DECISION_IDS,
    resetLegacyStorage,
    readiness,
    guardScreen,
  });
});
