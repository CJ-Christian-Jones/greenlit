function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safe(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createSeededRandom(seed = "greenlit-balance") {
  let state = 0;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    state = (state * 31 + text.charCodeAt(index)) >>> 0;
  }
  if (!state) state = 0x6d2b79f5;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function budgetPressure(random, budgetRange) {
  const min = safe(budgetRange?.[0], 1);
  const max = safe(budgetRange?.[1], Math.max(1, min));
  const center = (min + max) / 2;
  const budget = min + random() * Math.max(0.01, max - min);
  const pressure = Math.abs(budget - center) / Math.max(1, max - min);
  return clamp(pressure * 100, 0, 100);
}

export function runScaleParitySimulation({
  iterations = 2000,
  scaleBudgets = {},
  seed = "greenlit-balance",
  targetSpread = 0.06,
} = {}) {
  const random = createSeededRandom(seed);
  const byScale = {};
  const scales = Object.keys(scaleBudgets);

  scales.forEach((scale, scaleIndex) => {
    let success = 0;
    let totalPressure = 0;
    for (let i = 0; i < iterations; i += 1) {
      const pressure = budgetPressure(random, scaleBudgets[scale]);
      const strategyNoise = (random() + random() - 1) * 8;
      const recommendationQuality = 58 + random() * 34;
      const scaleOffset = (scaleIndex - (scales.length - 1) / 2) * 0.4;
      const score =
        recommendationQuality - pressure * 0.34 + strategyNoise - scaleOffset;
      if (score >= 52) success += 1;
      totalPressure += pressure;
    }
    byScale[scale] = {
      successRate: (success / Math.max(1, iterations)) * 100,
      sampleSize: iterations,
      averageBudgetPressure: totalPressure / Math.max(1, iterations),
    };
  });

  const successRates = Object.values(byScale).map((entry) => entry.successRate / 100);
  const successRateSpread = successRates.length
    ? Math.max(...successRates) - Math.min(...successRates)
    : 0;

  return {
    iterations,
    targetSpread,
    successRateSpread,
    pass: successRateSpread <= targetSpread,
    byScale,
  };
}

export function auditDraftRecommendationTelemetry(recommendationTelemetryBySlot = {}) {
  const slots = Object.values(recommendationTelemetryBySlot || {});
  const archetypeCount = {};
  const budgetSums = {};
  const budgetCounts = {};
  let completeCoverageCount = 0;

  slots.forEach((slotReport) => {
    const archetypes = new Set();
    (slotReport?.entries || []).forEach((entry) => {
      const archetype = String(entry?.archetype || "fallback");
      archetypes.add(archetype);
      archetypeCount[archetype] = (archetypeCount[archetype] || 0) + 1;
      if (Number.isFinite(Number(entry?.budgetAffinity))) {
        budgetSums[archetype] = (budgetSums[archetype] || 0) + safe(entry.budgetAffinity);
        budgetCounts[archetype] = (budgetCounts[archetype] || 0) + 1;
      }
    });
    if (
      archetypes.has("current-fit") &&
      archetypes.has("character-fit") &&
      archetypes.has("star-power") &&
      archetypes.has("wildcard") &&
      archetypes.has("budget-friendly")
    ) {
      completeCoverageCount += 1;
    }
  });

  const averageBudgetAffinity = {};
  Object.keys(budgetSums).forEach((archetype) => {
    averageBudgetAffinity[archetype] =
      budgetSums[archetype] / Math.max(1, budgetCounts[archetype]);
  });

  return {
    slotCount: slots.length,
    completeCoverageCount,
    slateIntegrityRate: slots.length
      ? (completeCoverageCount / slots.length) * 100
      : 0,
    archetypeCount,
    averageBudgetAffinity,
  };
}

export function runDeterministicParityRegression({
  scaleBudgets = {},
  targetSpread = 0.06,
  iterations = 2500,
} = {}) {
  const seeds = [
    "regression-baseline",
    "regression-release-window",
    "regression-budget-volatility",
  ];
  const runs = seeds.map((seed) =>
    runScaleParitySimulation({
      iterations,
      scaleBudgets,
      targetSpread,
      seed,
    }),
  );
  return {
    pass: runs.every((run) => run.pass),
    worstSpread: runs.reduce(
      (worst, run) => Math.max(worst, run.successRateSpread),
      0,
    ),
    runs,
  };
}

globalThis.GreenlitV38BalanceSim = globalThis.GreenlitV38BalanceSim || {
  runScaleParitySimulation,
  auditDraftRecommendationTelemetry,
  runDeterministicParityRegression,
};
