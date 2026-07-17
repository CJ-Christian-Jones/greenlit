(function installV37StateCore(root, factory) {
  const namespace = root.GreenlitV37 || (root.GreenlitV37 = {});
  const state = factory();
  namespace.state = state;
  if (typeof module !== "undefined" && module.exports) module.exports = state;
})(typeof globalThis !== "undefined" ? globalThis : window, function createV37StateCore() {
  "use strict";

  const VERSION = 37;
  const SAVE_KEY = "greenlit-v37-save";
  const RESET_MARKER = "greenlit-v37-reset-complete";
  const ACTOR_SLOTS = Object.freeze(["Lead 1", "Lead 2", "Cast 3", "Cast 4", "Cast 5"]);
  const STEP_NAMES = Object.freeze(["Movie", "Cast", "Crew & Style", "Marketing", "Release", "Results"]);

  const clone = (value) =>
    typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

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

  function hasPerson(state, id) {
    return Boolean(id && state?.people?.[id]);
  }

  function result(complete, missing, message) {
    return { complete: Boolean(complete), missing: complete ? [] : missing, message: complete ? "" : message };
  }

  function readiness(state) {
    const secondaryGenre = state?.arcade?.secondaryGenre;
    const movieComplete = Boolean(
      state?.reference?.id != null &&
        state?.project?.genre &&
        secondaryGenre &&
        secondaryGenre !== state.project.genre,
    );

    const missingActors = ACTOR_SLOTS.filter((slot) => !hasPerson(state, state?.roster?.[slot]));
    const castComplete = missingActors.length === 0;

    const crew = state?.arcade?.crew || {};
    const directors = (crew.selectedDirectors || []).filter((id) => hasPerson(state, id));
    const writers = (crew.selectedWriters || []).filter((id) => hasPerson(state, id));
    const styleCrew = state?.arcade?.styleCrew || {};
    const missingCrew = [];
    if (!directors.length) missingCrew.push("a director");
    if (!writers.length) missingCrew.push("a writer");
    if (directors.length + writers.length > 3) missingCrew.push("no more than three directors and writers combined");
    if (!hasPerson(state, styleCrew.composerId)) missingCrew.push("a composer");
    if (!hasPerson(state, styleCrew.cinematographerId)) missingCrew.push("a cinematographer");
    const crewComplete = missingCrew.length === 0;

    const strategy = state?.arcade?.marketingStrategy;
    const marketingComplete = Boolean(strategy && state?.arcade?.marketingConfirmed);
    const releaseComplete = Boolean(state?.simulation && state?.releaseRaceCompleted);
    const resultsComplete = Boolean(state?.simulation && releaseComplete);

    return [
      result(
        movieComplete,
        ["a source movie", "primary and secondary genres"],
        "Pick a movie and confirm two different genres before continuing.",
      ),
      result(
        castComplete,
        missingActors,
        `Fill ${missingActors.length} remaining cast slot${missingActors.length === 1 ? "" : "s"} before continuing.`,
      ),
      result(
        crewComplete,
        missingCrew,
        `Choose ${missingCrew.join(", ")} before continuing.`,
      ),
      result(
        marketingComplete,
        ["a confirmed campaign strategy"],
        "Choose and confirm a marketing strategy before launching the release.",
      ),
      result(
        releaseComplete,
        ["a completed theatrical release"],
        "Finish or skip to the end of the theatrical run before opening results.",
      ),
      result(
        resultsComplete,
        ["a completed simulation result"],
        "Complete the release before opening results.",
      ),
    ];
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

  function sanitizeSave(value) {
    const output = clone(value);
    if (output?.arcade?.styleCrew) {
      output.arcade.styleCrew.loading = false;
      output.arcade.styleCrew.loadError = null;
      delete output.arcade.styleCrew.requestId;
      delete output.arcade.styleCrew.generation;
      delete output.arcade.styleCrew.controller;
    }
    if (output?.arcade) {
      delete output.arcade.routeGuardMessage;
      delete output.arcade.connectionProbe;
    }
    delete output.telemetry;
    delete output.referenceCredits;
    delete output.sourcePools;
    delete output.searchResults;
    delete output.competition;
    return output;
  }

  return Object.freeze({
    VERSION,
    SAVE_KEY,
    RESET_MARKER,
    ACTOR_SLOTS,
    STEP_NAMES,
    resetLegacyStorage,
    readiness,
    guardScreen,
    sanitizeSave,
  });
});
