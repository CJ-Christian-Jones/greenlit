function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safe(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function tierValue(tier) {
  if (tier === "S") return 5;
  if (tier === "A") return 4;
  if (tier === "B") return 3;
  if (tier === "C") return 2;
  return 1;
}

function summarizeRows(rows) {
  const rollCount = rows.length;
  if (!rollCount) {
    return {
      rollCount: 0,
      overBudgetRate: 0,
      goodChoiceRate: 0,
      avgAffordableChoices: 0,
    };
  }
  const overBudget = rows.filter((row) => safe(row.overBudgetRate) > 0).length;
  const goodChoices = rows.filter((row) => row.goodChoice).length;
  const affordableChoiceTotal = rows.reduce(
    (sum, row) => sum + safe(row.affordableChoices),
    0,
  );
  return {
    rollCount,
    overBudgetRate: (overBudget / rollCount) * 100,
    goodChoiceRate: (goodChoices / rollCount) * 100,
    avgAffordableChoices: affordableChoiceTotal / rollCount,
  };
}

function auditCrewRoll(roll) {
  const options = roll?.options || [];
  const maxFee = Math.max(0.01, safe(roll?.maxAffordableFee, 0.5));
  const affordable = options.filter((option) => safe(option.fee) <= maxFee);
  const qualityAffordable = affordable.filter((option) => tierValue(option.tier) >= 3);
  const uniqueTiers = new Set(options.map((option) => option.tier)).size;
  const overBudgetOptions = options.filter((option) => safe(option.fee) > maxFee).length;
  return {
    scale: roll?.scale || "Unknown",
    overBudgetRate: options.length ? (overBudgetOptions / options.length) * 100 : 0,
    affordableChoices: affordable.length,
    goodChoice:
      qualityAffordable.length >= 1 &&
      affordable.length >= 2 &&
      uniqueTiers >= 2,
  };
}

function auditStyleRoll(roll) {
  const options = roll?.options || [];
  const maxFee = Math.max(0.01, safe(roll?.maxAffordableFee, 0.8));
  const affordable = options.filter((option) => safe(option.fee) <= maxFee);
  const qualityAffordable = affordable.filter(
    (option) =>
      (tierValue(option.composerTier) + tierValue(option.cinematographerTier)) / 2 >= 3,
  );
  const tierPairs = new Set(
    options.map((option) => `${option.composerTier}|${option.cinematographerTier}`),
  ).size;
  const overBudgetOptions = options.filter((option) => safe(option.fee) > maxFee).length;
  return {
    scale: roll?.scale || "Unknown",
    overBudgetRate: options.length ? (overBudgetOptions / options.length) * 100 : 0,
    affordableChoices: affordable.length,
    goodChoice:
      qualityAffordable.length >= 1 &&
      affordable.length >= 1 &&
      tierPairs >= 2,
  };
}

export function auditBudgetScopeTelemetry(
  budgetAudit = {},
  {
    lowScales = ["Microbudget", "Independent"],
  } = {},
) {
  const crewRows = (budgetAudit?.crewRolls || []).map(auditCrewRoll);
  const styleRows = (budgetAudit?.styleRolls || []).map(auditStyleRoll);
  const scales = new Set([
    ...crewRows.map((row) => row.scale),
    ...styleRows.map((row) => row.scale),
  ]);

  const byScale = {};
  scales.forEach((scale) => {
    byScale[scale] = {
      crew: summarizeRows(crewRows.filter((row) => row.scale === scale)),
      style: summarizeRows(styleRows.filter((row) => row.scale === scale)),
    };
  });

  const lowScaleRows = lowScales
    .map((scale) => byScale[scale])
    .filter(Boolean);
  const lowBudgetGoodChoiceRate = lowScaleRows.length
    ? lowScaleRows.reduce(
        (sum, row) => sum + average([row.crew.goodChoiceRate, row.style.goodChoiceRate]),
        0,
      ) / lowScaleRows.length
    : 0;
  const lowBudgetOverBudgetRate = lowScaleRows.length
    ? lowScaleRows.reduce(
        (sum, row) => sum + average([row.crew.overBudgetRate, row.style.overBudgetRate]),
        0,
      ) / lowScaleRows.length
    : 0;

  return {
    byScale,
    crewRollCount: crewRows.length,
    styleRollCount: styleRows.length,
    lowBudgetGoodChoiceRate,
    lowBudgetOverBudgetRate,
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createSeededRandom(seed = "budget-audit") {
  let state = 0;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    state = (state * 31 + text.charCodeAt(index)) >>> 0;
  }
  if (!state) state = 0x9e3779b9;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function runBudgetScopeStressTest({
  iterations = 2000,
  scaleBudgets = {},
  targetOverBudgetRate = 45,
  seed = "budget-scope",
} = {}) {
  const random = createSeededRandom(seed);
  const byScale = {};
  Object.entries(scaleBudgets).forEach(([scale, budgetRange], scaleIndex) => {
    const [minBudget, maxBudget] = budgetRange;
    const center = average([safe(minBudget, 1), safe(maxBudget, 1)]);
    const packageTarget = center * (0.22 + scaleIndex * 0.01);
    let overBudgetRuns = 0;
    for (let i = 0; i < iterations; i += 1) {
      const budget = minBudget + random() * Math.max(1, maxBudget - minBudget);
      const pressure = Math.abs(budget - center) / Math.max(1, maxBudget - minBudget);
      const crewSpend =
        packageTarget * (0.28 + random() * 0.42 + pressure * 0.1);
      const creativeSpend =
        packageTarget * (0.14 + random() * 0.34 + pressure * 0.08);
      if (crewSpend + creativeSpend > packageTarget) overBudgetRuns += 1;
    }
    const overBudgetRate = (overBudgetRuns / Math.max(1, iterations)) * 100;
    byScale[scale] = {
      iterations,
      overBudgetRate,
      pass: overBudgetRate <= targetOverBudgetRate,
    };
  });
  return {
    targetOverBudgetRate,
    byScale,
  };
}

globalThis.GreenlitV38BudgetAudit = globalThis.GreenlitV38BudgetAudit || {
  auditBudgetScopeTelemetry,
  runBudgetScopeStressTest,
};
