/**
 * GREENLIT — Arcade Edition V38.5
 *
 * This file is intentionally kept build-free. Historical version labels mark
 * compatibility layers that still participate in the current V38 flow; dead
 * interfaces are removed instead of archived here.
 *
 * CODE MAP
 * 1. DOM helpers, static data and CENTRAL BALANCE TUNING
 * 2. API, state, discovery and simulation foundations
 * 3. Shared shell, analytics and modal infrastructure
 * 4. Arcade gameplay systems and active page renderers
 * 5. V37/V38 data controls, decisions, diagnostics and final boot
 *
 * Search for "CENTRAL BALANCE TUNING" for the core model, or see CODE_MAP.md
 * for the current runtime ownership map.
 */
import {
  createScreenRegistry,
  selectScreenRenderer,
} from "./core/screen-registry.js?v=38.5";
import {
  auditDraftRecommendationTelemetry,
  runDeterministicParityRegression,
  runScaleParitySimulation,
} from "./sim/balance-simulator.js?v=38.5";
import {
  auditBudgetScopeTelemetry,
  runBudgetScopeStressTest,
} from "./sim/budget-scope-audit.js?v=38.5";

// =============================================================================
// DOM HELPERS AND STATIC GAME DATA
// =============================================================================
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const GENRE_IDS = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Sci-Fi": 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};
const SCALE = {
  // Each entry contains the production-budget range and the five reusable
  // department caps. A cap accepts its own tier and every tier below it.
  //
  // These plans intentionally add more high-cap positions than V19. Combined
  // with the weighted tier-selection model in Balance Lab, selected talent
  // settles near an even 20% split across S/A/B/C/D.
  Microbudget: {
    budget: [1, 5],
    plan: ["B", "C", "C", "D", "D"],
  },
  Independent: {
    budget: [6, 25],
    plan: ["A", "B", "B", "C", "D"],
  },
  "Mid-Budget": {
    budget: [26, 80],
    plan: ["S", "A", "A", "B", "C"],
  },
  "Studio Event": {
    budget: [81, 175],
    plan: ["S", "S", "A", "A", "B"],
  },
  Tentpole: {
    budget: [176, 300],
    plan: ["S", "S", "S", "S", "S"],
  },
};

/**
 * CENTRAL BALANCE TUNING
 * ----------------------
 * Change values here first when tuning the game. The live simulation and the
 * Balance Lab both read from these tables so they stay aligned.
 */
const BALANCE_TUNING = {
  economy: {
    Microbudget: {
      demandMultiplier: 1.16,
      marketingRate: 0.43,
      backendRate: 0,
      baseOverrunRate: 0.015,
      overrunVolatility: 0.05,
      catastropheChance: 0.06,
    },
    Independent: {
      demandMultiplier: 1.14,
      marketingRate: 0.38,
      backendRate: 0.005,
      baseOverrunRate: 0.025,
      overrunVolatility: 0.06,
      catastropheChance: 0.06,
    },
    "Mid-Budget": {
      demandMultiplier: 1,
      marketingRate: 0.31,
      backendRate: 0.02,
      baseOverrunRate: 0.03,
      overrunVolatility: 0.08,
      catastropheChance: 0.07,
    },
    "Studio Event": {
      demandMultiplier: 0.89,
      marketingRate: 0.28,
      backendRate: 0.03,
      baseOverrunRate: 0.04,
      overrunVolatility: 0.1,
      catastropheChance: 0.08,
    },
    Tentpole: {
      demandMultiplier: 0.86,
      marketingRate: 0.27,
      backendRate: 0.04,
      baseOverrunRate: 0.05,
      overrunVolatility: 0.12,
      catastropheChance: 0.09,
    },
  },
  outcomes: {
    allTimeHitRoi: 1.2,
    allTimeHitGross: 1700,
    blockbusterRoi: 0.58,
    hitRoi: 0.2,
    bombRoi: -0.38,
    bombLossBudgetMultiple: 0.45,
    bombAbsoluteLoss: 50,
    allTimeHitMinimumGrossForRoi: 250,
  },
  tierPercentiles: {
    S: 0.2,
    A: 0.4,
    B: 0.6,
    C: 0.8,
  },
  tierSelectionWeights: {
    0: 0.6,
    1: 0.25,
    2: 0.1,
    3: 0.04,
    4: 0.01,
  },
  sourceDraft: {
    fitBudgetInfluence: 0.15,
    budgetFriendlyWeight: 0.72,
    starPowerWeight: 0.82,
    parityTargetSpread: 0.06,
  },
  packages: {
    "Weak Package": {
      multiplier: 0.87,
      variance: 0.22,
      upsideChance: 0.18,
      upsideMin: 1.25,
      upsideMax: 1.55,
      downsideChance: 0,
      downsideMin: 1,
      downsideMax: 1,
    },
    Average: {
      multiplier: 1.04,
      variance: 0.18,
      upsideChance: 0.07,
      upsideMin: 1.18,
      upsideMax: 1.4,
      downsideChance: 0,
      downsideMin: 1,
      downsideMax: 1,
    },
    Strong: {
      multiplier: 1.2,
      variance: 0.18,
      upsideChance: 0,
      upsideMin: 1,
      upsideMax: 1,
      downsideChance: 0.08,
      downsideMin: 0.72,
      downsideMax: 0.95,
    },
    "Dream Team": {
      multiplier: 1.43,
      variance: 0.22,
      upsideChance: 0,
      upsideMin: 1,
      upsideMax: 1,
      downsideChance: 0.15,
      downsideMin: 0.6,
      downsideMax: 0.85,
    },
  },
  modeEffects: {
    searchDrawBonus: 1.5,
    searchGrossMultiplier: 1.015,
    draftStabilityBonus: 1.5,
    searchStabilityBonus: -2,
  },
  auditions: {
    useChance: 0.82,
    resultMinimum: -5,
    resultMaximum: 11,
    hardClampMinimum: -9,
    hardClampMaximum: 14,
    craftWeight: 0.52,
    audienceWeight: 0.44,
    grossDivisor: 170,
  },
  reception: {
    critics: {
      base: 30,
      craftWeight: 0.5,
      fitWeight: 0.14,
      randomAmplitude: 28,
    },
    audience: {
      base: 34,
      craftWeight: 0.28,
      drawWeight: 0.18,
      fitWeight: 0.13,
      auditionWeight: 0.3,
      randomAmplitude: 29,
    },
  },
  campaigns: {
    "Prestige Campaign": {
      grossMultiplier: 0.96,
      criticBonus: 8,
      audienceBonus: -1,
      awardScoreBonus: 7,
      ancillaryBudgetRate: 0,
      volatilityMultiplier: 0.95,
    },
    "Mass Awareness": {
      grossMultiplier: 1.08,
      criticBonus: -2,
      audienceBonus: 1,
      awardScoreBonus: -2,
      ancillaryBudgetRate: 0,
      volatilityMultiplier: 1.08,
    },
    "Viral / Creator": {
      grossMultiplier: 1.05,
      criticBonus: -3,
      audienceBonus: 4,
      awardScoreBonus: -4,
      ancillaryBudgetRate: 0,
      volatilityMultiplier: 1.18,
    },
    "Fan Convention": {
      grossMultiplier: 1.06,
      criticBonus: -1,
      audienceBonus: 3,
      awardScoreBonus: -2,
      ancillaryBudgetRate: 0,
      volatilityMultiplier: 1.1,
    },
    "Celebrity Tour": {
      grossMultiplier: 1.03,
      criticBonus: 0,
      audienceBonus: 2,
      awardScoreBonus: 1,
      ancillaryBudgetRate: 0,
      volatilityMultiplier: 1.07,
    },
    "Streaming Push": {
      grossMultiplier: 0.9,
      criticBonus: 0,
      audienceBonus: 1,
      awardScoreBonus: -3,
      ancillaryBudgetRate: 0.18,
      volatilityMultiplier: 0.92,
    },
    "Mystery Box": {
      grossMultiplier: 1.02,
      criticBonus: 1,
      audienceBonus: 2,
      awardScoreBonus: 0,
      ancillaryBudgetRate: 0,
      volatilityMultiplier: 1.17,
    },
  },
  genreEffects: {
    Action: {
      grossMultiplier: 1.06,
      criticBonus: -2,
      audienceBonus: 2,
      awardBonus: 0,
      technicalAwardBonus: 3,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 5,
    },
    Adventure: {
      grossMultiplier: 1.05,
      criticBonus: 0,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 3,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 5,
    },
    Animation: {
      grossMultiplier: 1.05,
      criticBonus: 1,
      audienceBonus: 3,
      awardBonus: 0,
      technicalAwardBonus: 3,
      actingCategoriesEnabled: false,
      technicalNominationMaximum: 5,
    },
    Comedy: {
      grossMultiplier: 0.96,
      criticBonus: 0,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Crime: {
      grossMultiplier: 0.9,
      criticBonus: 2,
      audienceBonus: 0,
      awardBonus: 10,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Documentary: {
      grossMultiplier: 0.74,
      criticBonus: 6,
      audienceBonus: 0,
      awardBonus: 10,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: false,
      technicalNominationMaximum: 1.3,
    },
    Drama: {
      grossMultiplier: 0.9,
      criticBonus: 4,
      audienceBonus: 0,
      awardBonus: 10,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Family: {
      grossMultiplier: 1.04,
      criticBonus: 0,
      audienceBonus: 2,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Fantasy: {
      grossMultiplier: 1.05,
      criticBonus: 0,
      audienceBonus: 2,
      awardBonus: 0,
      technicalAwardBonus: 3,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 5,
    },
    History: {
      grossMultiplier: 0.84,
      criticBonus: 4,
      audienceBonus: 0,
      awardBonus: 10,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Horror: {
      grossMultiplier: 0.92,
      criticBonus: 0,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Music: {
      grossMultiplier: 0.86,
      criticBonus: 2,
      audienceBonus: 0,
      awardBonus: 10,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Mystery: {
      grossMultiplier: 0.94,
      criticBonus: 0,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    Romance: {
      grossMultiplier: 0.92,
      criticBonus: 0,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    "Sci-Fi": {
      grossMultiplier: 1.06,
      criticBonus: 1,
      audienceBonus: 2,
      awardBonus: 0,
      technicalAwardBonus: 3,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 5,
    },
    Thriller: {
      grossMultiplier: 0.98,
      criticBonus: 0,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
    War: {
      grossMultiplier: 0.88,
      criticBonus: 3,
      audienceBonus: 0,
      awardBonus: 8,
      technicalAwardBonus: 1.5,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 3,
    },
    Western: {
      grossMultiplier: 0.84,
      criticBonus: 2,
      audienceBonus: 0,
      awardBonus: 0,
      technicalAwardBonus: 0,
      actingCategoriesEnabled: true,
      technicalNominationMaximum: 1.3,
    },
  },
  grossModel: {
    drawIntercept: 0.62,
    drawDivisor: 145,
    audienceIntercept: 0.83,
    audienceDivisor: 260,
    noiseFloor: 0.22,
    triangularNoiseSamples: 2,
    catastropheGrossMinimum: 0.25,
    catastropheGrossMaximum: 0.55,
  },
  referenceModel: {
    executionMinimum: 0.5,
    executionRange: 1.05,
    averagedRandomSamples: 2,
  },
  awards: {
    criticWeight: 0.46,
    craftCompositeBase: 45,
    craftCompositeMultiplier: 0.35,
    craftCompositeWeight: 0.3,
    audienceWeight: 0.14,
    stabilityWeight: 0.1,
    releaseBiasValues: [-6, -4, -2, 0, 2, 6, 9, 10],
    competitionMinimum: 42,
    competitionMaximum: 82,
    competitionBaseline: 60,
    competitionPenaltyWeight: 0.22,
    contenderThreshold: 58,
    contenderSlope: 2.15,
    contenderChanceMinimumPercent: 2,
    contenderChanceMaximumPercent: 92,
    pictureNominationScoreThreshold: 73,
    pictureNominationChance: 0.5,
    actingNominationMaximum: 4,
    actingCraftBaseline: 50,
    actingCraftDivisor: 15,
    actingWinWeight: 0.45,
    technicalWinWeight: 0.28,
  },
};
const MARKETING = {
  "Prestige Campaign": {
    opening: -5,
    crit: 8,
    awards: 12,
    wom: 2,
    intl: 0,
    vol: 2,
  },
  "Mass Awareness": {
    opening: 12,
    crit: -2,
    awards: -2,
    wom: -1,
    intl: 5,
    vol: 5,
  },
  "Viral / Creator": {
    opening: 8,
    crit: -3,
    awards: -4,
    wom: 5,
    intl: 2,
    vol: 12,
  },
  "Fan Convention": {
    opening: 9,
    crit: -1,
    awards: -2,
    wom: 3,
    intl: 4,
    vol: 7,
  },
  "Celebrity Tour": {
    opening: 6,
    crit: 1,
    awards: 1,
    wom: 4,
    intl: 3,
    vol: 5,
  },
  "Streaming Push": {
    opening: -7,
    crit: 0,
    awards: -3,
    wom: 1,
    intl: 2,
    stream: 14,
    vol: 1,
  },
  "Mystery Box": {
    opening: 3,
    crit: 2,
    awards: 0,
    wom: 7,
    intl: 0,
    vol: 8,
  },
};
const TIER_ORDER = {
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
};
const V37_CATALOG = globalThis.GreenlitV37?.catalog || null;
const V37_DATA = globalThis.GreenlitV37?.data || null;
const V38_PORTRAITS = globalThis.GreenlitV38?.portraits || null;
const V38_LEDGER = globalThis.GreenlitV38?.ledger || null;
const APP_STATE = globalThis.GreenlitV38?.state || globalThis.GreenlitV37?.state || null;
APP_STATE?.resetLegacyStorage(globalThis.localStorage);
const DATA_MODE_STORAGE_KEY = "greenlit-v38-data-mode";
const LEGACY_OFFLINE_DATABASE_STORAGE_KEY = "greenlit-v38-offline-enabled";
const dataMode = () => {
  const saved = globalThis.localStorage?.getItem(DATA_MODE_STORAGE_KEY);
  if (["hybrid", "offline", "tmdb"].includes(saved)) return saved;
  return globalThis.localStorage?.getItem(LEGACY_OFFLINE_DATABASE_STORAGE_KEY) === "0"
    ? "tmdb"
    : "hybrid";
};
V37_DATA?.setDataMode?.(dataMode());

const VERSION = APP_STATE?.VERSION || 38;
const DEFAULT = {
  saveVersion: VERSION,
  screen: 0,
  mode: "draft",
  endTab: "results",
  marketing: "Mass Awareness",
  project: {
    title: "Untitled Film",
    genre: "Sci-Fi",
    year: 2019,
    month: "July",
    scale: "Studio Event",
    type: "Original",
    rating: "PG-13",
    runtime: 125,
    directors: 1,
    writers: 2,
    producers: 2,
  },
  reference: null,
  referenceCredits: null,
  roles: {},
  originalAges: {},
  roster: {},
  people: {},
  savedPeople: {},
  sourcePools: {},
  sourceIndex: {},
  usedSources: [],
  shortlists: {},
  shortlistFocus: {},
  shortlistCompare: {},
  auditions: {},
  cameos: {},
  cameoOutcomes: {},
  tierCache: {},
  hideUnavailable: false,
  events: [],
  simulation: null,
  competition: [],
  releaseRace: null,
  releaseRaceCompleted: false,
  searchResults: {},
  runSeed: null,
  debug: false,
  telemetry: [],
};
const SAVE_KEY = APP_STATE?.SAVE_KEY || "greenlit-v38-save";
const API_TIMEOUT_MS = 12000;
const API_CACHE = new Map();
const API_IN_FLIGHT = new Map();
const POOL_REQUESTS = new Map();
let REFERENCE_REQUEST_ID = 0;
let ACTIVE_RENDER_ID = 0;
let V38_SCREEN_REGISTRY = null;

// =============================================================================
// SAVE SYSTEM
// =============================================================================
function clearLegacyApiCache() {
  try {
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("glc:")) remove.push(key);
    }
    remove.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw);
    const loaded = {
      ...structuredClone(DEFAULT),
      ...parsed,
    };
    loaded.people = {
      ...(parsed.savedPeople || {}),
      ...(parsed.people || {}),
    };
    loaded.savedPeople = parsed.savedPeople || {};
    loaded.sourcePools = {};
    loaded.searchResults = {};
    loaded.competition = [];
    loaded.referenceCredits = null;
    loaded.telemetry = [];
    return loaded;
  } catch {
    return structuredClone(DEFAULT);
  }
}

function migrate(s) {
  if (!s.saveVersion || s.saveVersion < VERSION) {
    s = {
      ...structuredClone(DEFAULT),
      ...s,
      saveVersion: VERSION,
    };
  }
  s.shortlists = s.shortlists || {};
  s.shortlistFocus = s.shortlistFocus || {};
  s.shortlistCompare = s.shortlistCompare || {};
  s.cameos = s.cameos || {};
  s.cameoOutcomes = s.cameoOutcomes || {};
  s.tierCache = s.tierCache || {};
  s.hideUnavailable = Boolean(s.hideUnavailable);
  s.releaseRace = s.releaseRace || null;
  s.releaseRaceCompleted = Boolean(s.releaseRaceCompleted);
  s.roles = s.roles || {};
  s.originalAges = s.originalAges || {};
  s.savedPeople = s.savedPeople || {};
  s.people = {
    ...s.savedPeople,
    ...(s.people || {}),
  };
  s.sourcePools = {};
  s.searchResults = {};
  s.competition = [];
  s.referenceCredits = null;
  s.telemetry = [];
  return s;
}

function compactPerson(p, rosterTmdbIds) {
  if (!p) return null;
  const filteredCollabs = {};
  for (const [id, count] of Object.entries(p.collabs || {})) {
    if (rosterTmdbIds.has(Number(id))) filteredCollabs[id] = count;
  }
  return {
    id: p.id,
    tmdbId: p.tmdbId,
    name: p.name,
    photo: p.photo || null,
    bio: (p.bio || "").slice(0, 600),
    known: (p.known || []).slice(0, 4),
    iconicRoles: (p.iconicRoles || []).slice(0, 8),
    birthYear: p.birthYear || null,
    gender: safe(p.gender, 0),
    craft: p.craft,
    draw: p.draw,
    reliability: p.reliability,
    momentum: p.momentum,
    fit: p.fit || {},
    collabs: filteredCollabs,
    voiceShare: p.voiceShare || 0,
    voiceOnly: Boolean(p.voiceOnly),
    voiceCredits: p.voiceCredits || 0,
    liveCredits: p.liveCredits || 0,
  };
}

function makeSaveState() {
  const rosterIds = new Set(Object.values(S.roster || {}).filter(Boolean));
  const extraIds = new Set([
    ...Object.values(S.auditions || {})
      .map((x) => x?.personId)
      .filter(Boolean),
    ...Object.values(S.cameos || {})
      .map((x) => x?.personId)
      .filter(Boolean),
    ...Object.values(S.shortlists || {})
      .flat()
      .filter(Boolean),
    ...(S.arcade?.crew?.directorsPool || []),
    ...(S.arcade?.crew?.writersPool || []),
    ...(S.arcade?.styleCrew?.composerPool || []),
    ...(S.arcade?.styleCrew?.cinematographerPool || []),
    S.arcade?.styleCrew?.composerId,
    S.arcade?.styleCrew?.cinematographerId,
  ].filter(Boolean));
  const keepIds = new Set([...rosterIds, ...extraIds]);
  const rosterTmdbIds = new Set(
    [...rosterIds].map((id) => S.people[id]?.tmdbId).filter(Boolean),
  );
  const savedPeople = {};
  for (const id of keepIds) {
    const compact = compactPerson(S.people[id], rosterTmdbIds);
    if (compact) savedPeople[id] = compact;
  }

  return {
    saveVersion: VERSION,
    screen: S.screen,
    mode: S.mode,
    endTab: S.endTab,
    marketing: S.marketing,
    project: S.project,
    reference: S.reference,
    roles: S.roles,
    originalAges: S.originalAges,
    roster: S.roster,
    savedPeople,
    sourceIndex: S.sourceIndex,
    usedSources: (S.usedSources || []).slice(-40),
    shortlists: S.shortlists,
    shortlistFocus: S.shortlistFocus,
    shortlistCompare: S.shortlistCompare,
    auditions: S.auditions,
    cameos: S.cameos,
    cameoOutcomes: S.cameoOutcomes,
    tierCache: S.tierCache,
    hideUnavailable: S.hideUnavailable,
    events: S.events,
    simulation: S.simulation,
    releaseRace: S.releaseRace,
    releaseRaceCompleted: S.releaseRaceCompleted,
    runSeed: S.runSeed,
    debug: S.debug,
    activeSlot: S.activeSlot || null,
  };
}

function save() {
  const payload = JSON.stringify(makeSaveState());
  try {
    localStorage.setItem(SAVE_KEY, payload);
  } catch (error) {
    clearLegacyApiCache();
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.setItem(SAVE_KEY, payload);
    } catch (secondError) {
      console.warn(
        "GREENLIT save skipped because browser storage is unavailable.",
        secondError,
      );
    }
  }
}

clearLegacyApiCache();
let S = migrate(load());
const safe = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f),
  clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, safe(v, a)));
const token = () => localStorage.getItem("tmdb-token") || "";
const moneyM = (m) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: m >= 1000 ? 2 : 1,
  }).format(safe(m) * 1e6);
const exactMoneyM = (m) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe(m) * 1e6);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(namespace = "main") {
  let x = hash(`${S.runSeed || "seed"}|${namespace}`);
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function ensureSeed() {
  if (!S.runSeed)
    S.runSeed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function record(type, data = {}) {
  S.telemetry.push({
    type,
    time: Date.now(),
    screen: S.screen,
    mode: S.mode,
    ...data,
  });
  if (S.telemetry.length > 100) S.telemetry = S.telemetry.slice(-100);
}

// =============================================================================
// TMDB API AND TEMPORARY CACHE
// =============================================================================
function tmdbUrl(path, params = {}) {
  const u = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  if (token() && !token().startsWith("eyJ"))
    u.searchParams.set("api_key", token());
  return u;
}
async function cacheGet(k) {
  const x = API_CACHE.get(k);
  if (x && Date.now() - x.time < 30 * 60 * 1000) return structuredClone(x.data);
  if (x) API_CACHE.delete(k);
  return null;
}
async function cacheSet(k, data) {
  if (API_CACHE.size >= 180) {
    const oldest = API_CACHE.keys().next().value;
    API_CACHE.delete(oldest);
  }
  API_CACHE.set(k, {
    time: Date.now(),
    data: structuredClone(data),
  });
}
async function api(path, params = {}) {
  if (V37_DATA) {
    return V37_DATA.request(path, params, {
      token: token(),
      mode: dataMode(),
      storage: globalThis.localStorage,
      timeoutMs: API_TIMEOUT_MS,
      fetchLive: async (signal) => {
        const headers = { accept: "application/json" };
        if (token().startsWith("eyJ")) headers.Authorization = `Bearer ${token()}`;
        const response = await fetch(tmdbUrl(path, params), { headers, signal });
        if (!response.ok) {
          const error = new Error(`TMDB ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return response.json();
      },
    });
  }

  const key = `${path}?${new URLSearchParams(params).toString()}`;
  const cached = await cacheGet(key);
  if (cached) return cached;

  if (API_IN_FLIGHT.has(key)) {
    return structuredClone(await API_IN_FLIGHT.get(key));
  }

  const request = (async () => {
    const headers = { accept: "application/json" };
    if (token().startsWith("eyJ")) headers.Authorization = `Bearer ${token()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(tmdbUrl(path, params), {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`TMDB ${response.status}`);
      const data = await response.json();
      await cacheSet(key, data);
      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("TMDB request timed out. Please try again.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  API_IN_FLIGHT.set(key, request);
  try {
    return structuredClone(await request);
  } finally {
    API_IN_FLIGHT.delete(key);
  }
}

function v38ActorInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function v38ShareProfile(personRecord, profile) {
  if (!personRecord || !profile) return;
  const name = String(personRecord.name || "").trim().toLowerCase();
  const birthYear = Number.parseInt(String(profile.birthday || "").slice(0, 4), 10);
  if (profile.photo) personRecord.photo = profile.photo;
  if (Number.isFinite(birthYear)) personRecord.birthYear = birthYear;
  if (Number(profile.tmdbId) > 0) personRecord.tmdbId = Number(profile.tmdbId);
  for (const candidate of Object.values(S.people || {})) {
    if (String(candidate?.name || "").trim().toLowerCase() !== name) continue;
    if (profile.photo) candidate.photo = profile.photo;
    if (Number.isFinite(birthYear)) candidate.birthYear = birthYear;
    if (Number(profile.tmdbId) > 0) candidate.tmdbId = Number(profile.tmdbId);
  }
}

function v38ClearFailedPortrait(personRecord, failedUrl) {
  if (!personRecord) return;
  const name = String(personRecord.name || "").trim().toLowerCase();
  for (const candidate of Object.values(S.people || {})) {
    if (
      String(candidate?.name || "").trim().toLowerCase() === name &&
      (!failedUrl || candidate.photo === failedUrl)
    ) {
      candidate.photo = null;
    }
  }
  personRecord.photo = null;
  V38_PORTRAITS?.invalidate?.(personRecord.name);
}

function v38InstallVisibleProfile(personRecord, profile) {
  if (!personRecord || !profile) return;
  v38ShareProfile(personRecord, profile);
  for (const card of document.querySelectorAll("[data-card-person]")) {
    if (card.dataset.cardPerson !== String(personRecord.id)) continue;
    const frame = card.querySelector(".arcadeActorImage");
    if (!frame) continue;
    const ageNode = card.querySelector("[data-v38-age]");
    if (ageNode) ageNode.textContent = v25CastingAge(personRecord, S.activeSlot) ?? "Unavailable offline";
    if (!profile.photo) continue;
    frame.querySelector("img[data-v38-portrait]")?.remove();
    const image = document.createElement("img");
    image.src = profile.photo;
    image.alt = personRecord.name || "Actor portrait";
    image.decoding = "async";
    image.dataset.v38Portrait = "";
    const loadButton = card.querySelector("[data-load-photo]");
    image.addEventListener(
      "error",
      () => {
        image.remove();
        v38ClearFailedPortrait(personRecord, profile.photo);
        loadButton?.classList.remove("v38PhotoReady");
        if (loadButton) loadButton.textContent = "Load photo";
      },
      { once: true },
    );
    frame.prepend(image);
    loadButton?.classList.add("v38PhotoReady");
  }
}

async function v38ResolveActorPortrait(personRecord) {
  if (!personRecord || !V38_PORTRAITS) return null;
  const profile = await V38_PORTRAITS.resolveProfile(personRecord, {
    hasToken: Boolean(token()) && dataMode() !== "offline",
    request: api,
  });
  if (profile) v38InstallVisibleProfile(personRecord, profile);
  return profile?.photo || null;
}

function v38BindActorPortraitControls(visibleCandidates) {
  $$('img[data-v38-portrait]').forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        const card = image.closest("[data-card-person]");
        const candidate = person(card?.dataset.cardPerson);
        const failedUrl = image.src;
        image.remove();
        v38ClearFailedPortrait(candidate, failedUrl);
        card?.querySelector("[data-load-photo]")?.classList.remove("v38PhotoReady");
      },
      { once: true },
    );
  });

  $$('[data-load-photo]').forEach((button) => {
    button.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const candidate = person(button.dataset.loadPhoto);
      if (!candidate) return;
      if (!token() || dataMode() === "offline") {
        dataModal();
        return;
      }
      button.disabled = true;
      button.textContent = "Loading…";
      const url = await v38ResolveActorPortrait(candidate);
      if (!url) {
        button.disabled = false;
        button.textContent = "No photo found";
      }
    };
  });

  if (!token() || dataMode() === "offline") return;
  for (const candidate of visibleCandidates || []) {
    if (!candidate?.photo) void v38ResolveActorPortrait(candidate);
  }
}

// =============================================================================
// ROSTER, ATTRIBUTES, TIERS AND AUDITIONS
// =============================================================================
function slotList() {
  const out = [];
  for (let i = 1; i <= S.project.directors; i++) out.push(`Director ${i}`);
  for (let i = 1; i <= S.project.writers; i++) out.push(`Writer ${i}`);
  for (let i = 1; i <= S.project.producers; i++) out.push(`Producer ${i}`);
  for (let i = 1; i <= 5; i++)
    out.push(i === 1 ? "Lead 1" : i === 2 ? "Lead 2" : `Cast ${i}`);
  return out;
}

function typeOf(slot) {
  return slot.startsWith("Director")
    ? "Director"
    : slot.startsWith("Writer")
      ? "Writer"
      : slot.startsWith("Producer")
        ? "Producer"
        : slot.startsWith("Lead")
          ? "Lead"
          : "Cast";
}

function roleName(slot) {
  return S.roles[slot] || null;
}

function slotCap(slot) {
  const i = Math.max(0, parseInt(slot.match(/\d+/)?.[0] || 1) - 1);
  return SCALE[S.project.scale].plan[Math.min(i, 4)];
}

function person(id) {
  return S.people[id] || null;
}

function rosterPeople() {
  return slotList()
    .map((s) => person(S.roster[s]))
    .filter(Boolean);
}

function ageAtYear(p) {
  return p?.birthYear ? S.project.year - p.birthYear : null;
}

function ageInfo(p, slot) {
  if (!["Lead", "Cast"].includes(typeOf(slot)))
    return {
      delta: 0,
      label: "Not age-sensitive",
    };
  const original = S.originalAges[slot],
    range =
      original != null ? [Math.max(5, original - 5), original + 5] : [18, 65],
    age = ageAtYear(p);
  if (age == null)
    return {
      delta: -2,
      label: "Age unavailable",
      range,
      age,
      original,
    };
  let d = age < range[0] ? range[0] - age : age > range[1] ? age - range[1] : 0,
    delta = 0;
  if (d <= 0) delta = 0;
  else if (d <= 5) delta = -3;
  else if (d <= 10) delta = -7;
  else if (d <= 20) delta = -13;
  else delta = -20;
  if (original != null && age === original) delta += 7;
  else if (original != null && Math.abs(age - original) <= 2) delta += 4;
  return {
    delta,
    label: d
      ? `${d} years outside target`
      : age === original
        ? "Exact original-age match"
        : "Inside target range",
    range,
    age,
    original,
  };
}

function baseAttrs(p, slot) {
  const collabs = rosterPeople()
    .filter((x) => x.id !== p.id)
    .map((x) => safe(p.collabs?.[x.tmdbId], 0));
  const chem = collabs.length
    ? clamp(52 + (collabs.reduce((a, b) => a + b, 0) / collabs.length) * 7)
    : 55;
  return {
    craft: p.craft,
    draw: p.draw,
    reliability: p.reliability,
    momentum: p.momentum,
    chemistry: chem,
    fit: safe(p.fit?.[S.project.genre], 50),
  };
}

function auditionMods(p, slot, fit) {
  const r = (() => {
    let x = hash(`${S.runSeed}|audition|${slot}|${p.id}`);
    return () => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
  })();
  const cls = fit >= 76 ? "high" : fit >= 55 ? "mid" : "low",
    out = {};
  const fitCenter = fit - 65;
  for (const k of ["craft", "draw", "reliability", "momentum", "chemistry"]) {
    const weights = {
      craft: 0.16,
      draw: 0.055,
      reliability: 0.08,
      momentum: 0.07,
      chemistry: 0.2,
    };
    const roleBias =
      {
        craft: 1.2,
        draw: 0,
        reliability: 0.4,
        momentum: 0.2,
        chemistry: 1.5,
      }[k] || 0;
    let base =
      fitCenter * weights[k] +
      (cls === "high" ? roleBias : cls === "low" ? -roleBias * 0.8 : 0);
    let variance = (r() - 0.5) * (cls === "mid" ? 7 : 9);
    out[k] = Math.round(clamp(base + variance, -9, 14) * 10) / 10;
  }
  return out;
}

function adjusted(p, slot, includeAudition = true) {
  const a = {
      ...baseAttrs(p, slot),
    },
    age = ageInfo(p, slot),
    aud =
      includeAudition && S.auditions[slot]?.personId === p.id
        ? S.auditions[slot]
        : null;

  a.chemistry = clamp(a.chemistry + age.delta * 0.35);
  a.reliability = clamp(a.reliability + age.delta * 0.18);
  a.momentum = clamp(a.momentum + age.delta * 0.12);

  if (aud) {
    for (const k of Object.keys(aud.mods || {})) {
      a[k] = clamp(a[k] + aud.mods[k]);
    }
  }

  return {
    ...a,
    age,
    audition: aud,
  };
}
const W = {
  Lead: {
    craft: 0.22,
    draw: 0.34,
    reliability: 0.14,
    momentum: 0.18,
    chemistry: 0.12,
  },
  Cast: {
    craft: 0.35,
    draw: 0.07,
    reliability: 0.2,
    momentum: 0.1,
    chemistry: 0.28,
  },
  Director: {
    craft: 0.5,
    draw: 0.04,
    reliability: 0.21,
    momentum: 0.1,
    chemistry: 0.15,
  },
  Writer: {
    craft: 0.51,
    draw: 0.01,
    reliability: 0.21,
    momentum: 0.09,
    chemistry: 0.18,
  },
  Producer: {
    craft: 0.22,
    draw: 0.14,
    reliability: 0.32,
    momentum: 0.1,
    chemistry: 0.22,
  },
};

function stableTierAttrs(p, slot) {
  const age = ageInfo(p, slot);

  // Tier quality must not depend on who is currently selected. Chemistry is
  // intentionally neutral here; the live chemistry stat can still change.
  return {
    craft: safe(p.craft, 50),
    draw: safe(p.draw, 50),
    reliability: clamp(safe(p.reliability, 50) + age.delta * 0.18),
    momentum: clamp(safe(p.momentum, 50) + age.delta * 0.12),
    chemistry: 55,
  };
}

function stableTierScore(p, slot) {
  const a = stableTierAttrs(p, slot);
  const weights = W[typeOf(slot)];
  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + safe(a[key], 50) * weight;
  }, 0);
}

const TIER_SEQUENCE = ["D", "C", "B", "A", "S"];

function moveTier(tier, amount) {
  const index = TIER_SEQUENCE.indexOf(tier);
  const nextIndex = clamp(index + amount, 0, TIER_SEQUENCE.length - 1);
  return TIER_SEQUENCE[nextIndex];
}

function auditionTierShift(audition) {
  if (!audition) return 0;
  const changes = Object.values(audition.mods || {});
  const meanChange = changes.length ? average(changes) : 0;
  if (meanChange >= 2.5) return 1;
  if (meanChange <= -2.5) return -1;
  return 0;
}

function baseTalentTier(p, slot) {
  S.tierCache[slot] = S.tierCache[slot] || {};
  if (S.tierCache[slot][p.id]) return S.tierCache[slot][p.id];

  const candidates = (
    S.mode === "search" ? S.searchResults?.[slot] || [] : poolPeople(slot)
  )
    .slice()
    .sort((a, b) => stableTierScore(b, slot) - stableTierScore(a, slot));

  let tier;
  const index = candidates.findIndex((candidate) => candidate.id === p.id);

  if (candidates.length < 2 || index < 0) {
    const score = stableTierScore(p, slot);
    if (score >= 82) tier = "S";
    else if (score >= 73) tier = "A";
    else if (score >= 64) tier = "B";
    else if (score >= 55) tier = "C";
    else tier = "D";
  } else {
    const percentile = (index + 0.5) / candidates.length;
    const cuts = BALANCE_TUNING.tierPercentiles;
    if (percentile <= cuts.S) tier = "S";
    else if (percentile <= cuts.A) tier = "A";
    else if (percentile <= cuts.B) tier = "B";
    else if (percentile <= cuts.C) tier = "C";
    else tier = "D";
  }

  S.tierCache[slot][p.id] = tier;
  return tier;
}

function talentScore(p, slot) {
  const a = adjusted(p, slot);
  const weights = W[typeOf(slot)];
  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + safe(a[key], 50) * weight;
  }, 0);
}

function poolPeople(slot) {
  const pool = S.sourcePools[slot]?.[S.sourceIndex[slot] || 0];
  return pool?.people || [];
}

function talentTier(p, slot) {
  const audition = S.auditions[slot];
  const originalTier =
    audition?.personId === p.id && audition.tierBeforeAudition
      ? audition.tierBeforeAudition
      : baseTalentTier(p, slot);

  if (audition?.personId !== p.id) return originalTier;
  return moveTier(originalTier, auditionTierShift(audition));
}

function allowed(p, slot) {
  const audition = S.auditions[slot];

  // A person who was eligible when auditioned remains eligible if the audition
  // discovers that they are actually one tier better than expected.
  if (audition?.personId === p.id && audition.eligibleBeforeAudition) {
    return true;
  }

  return TIER_ORDER[talentTier(p, slot)] <= TIER_ORDER[slotCap(slot)];
}
function fitBand(f) {
  return f >= 76 ? "High" : f >= 55 ? "Mid" : "Low";
}

// =============================================================================
// REFERENCE TITLE AND CANDIDATE DATA
// =============================================================================
async function selectReference(id, type = "movie") {
  const requestId = ++REFERENCE_REQUEST_ID;
  const append = type === "tv" ? "aggregate_credits" : "credits";
  const d = await api(`/${type}/${id}`, {
    append_to_response: append,
    language: "en-US",
  });
  if (requestId !== REFERENCE_REQUEST_ID) return false;
  const date = type === "tv" ? d.first_air_date : d.release_date,
    dt = date ? new Date(`${date}T00:00:00`) : new Date();
  const genres = (d.genres || []).map((g) =>
    g.name.replace("Science Fiction", "Sci-Fi"),
  );
  let budget = type === "movie" ? safe(d.budget) : 0;
  if (!budget) budget = Math.max(5e6, safe(d.popularity, 30) * 9e5);
  const scale =
    budget <= 5e6
      ? "Microbudget"
      : budget <= 25e6
        ? "Independent"
        : budget <= 80e6
          ? "Mid-Budget"
          : budget <= 175e6
            ? "Studio Event"
            : "Tentpole";
  const reference = {
    id: d.id,
    type,
    title: type === "tv" ? d.name : d.title,
    year: dt.getFullYear(),
    month: MONTHS[dt.getMonth()],
    genre: genres.find((g) => GENRES.includes(g)) || "Drama",
    genres,
    scale,
    budgetM: budget / 1e6,
    revenueM: safe(d.revenue) / 1e6,
    poster: d.poster_path
      ? `https://image.tmdb.org/t/p/w342${d.poster_path}`
      : null,
    overview: d.overview || "",
    vote: safe(d.vote_average) * 10,
  };
  const project = {
    ...S.project,
    title: reference.title,
    year: reference.year,
    month: reference.month,
    genre: reference.genre,
    scale: reference.scale,
    type: type === "tv" ? "Adaptation" : "Original",
  };
  const cr = type === "tv" ? d.aggregate_credits : d.credits;
  const roles = {};
  const originalAges = {};
  const cast = (cr?.cast || []).slice(0, 5);
  await Promise.all(
    cast.map(async (c, i) => {
      const slot = i === 0 ? "Lead 1" : i === 1 ? "Lead 2" : `Cast ${i + 1}`,
        role = c.character || c.roles?.[0]?.character || `Character ${i + 1}`;
      roles[slot] = role;
      try {
        const p = await api(`/person/${c.id}`, {
          language: "en-US",
        });
        if (p.birthday)
          originalAges[slot] =
            reference.year - parseInt(p.birthday.slice(0, 4));
      } catch {}
    }),
  );
  if (requestId !== REFERENCE_REQUEST_ID) return false;

  S.reference = reference;
  S.project = project;
  S.referenceCredits = cr;
  S.roles = roles;
  S.originalAges = originalAges;
  resetRunState(false);
  record("reference_selected", {
    id,
    type,
  });
  return true;
}

function resetRunState(clearReference = true) {
  S.roster = {};
  S.people = {};
  S.savedPeople = {};
  S.sourcePools = {};
  S.sourceIndex = {};
  S.usedSources = [];
  S.shortlists = {};
  S.shortlistFocus = {};
  S.shortlistCompare = {};
  S.auditions = {};
  S.cameos = {};
  S.cameoOutcomes = {};
  S.tierCache = {};
  S.hideUnavailable = false;
  S.events = [];
  S.simulation = null;
  S.competition = [];
  S.releaseRace = null;
  S.releaseRaceCompleted = false;
  S.searchResults = {};
  S.runSeed = null;
  if (clearReference) {
    S.reference = null;
    S.referenceCredits = null;
    S.roles = {};
    S.originalAges = {};
  }
}

async function hydrate(x, slot, credits) {
  try {
    const d = await api(`/person/${x.id}`, {
      append_to_response: "combined_credits",
      language: "en-US",
    });
    const all = [
      ...(d.combined_credits?.cast || []),
      ...(d.combined_credits?.crew || []),
    ].filter((c) => c.media_type === "movie");
    const ranked = all
        .slice()
        .sort((a, b) => safe(b.vote_count) - safe(a.vote_count)),
      avg =
        ranked.slice(0, 20).reduce((s, c) => s + safe(c.vote_average), 0) /
        Math.max(1, ranked.slice(0, 20).length);
    const fit = {};
    for (const g of GENRES) {
      const rel = all.filter((c) => (c.genre_ids || []).includes(GENRE_IDS[g]));
      fit[g] = clamp(
        43 +
          rel.length * 4 +
          (rel.reduce((s, c) => s + safe(c.vote_average), 0) /
            Math.max(1, rel.length) -
            5) *
            5,
        30,
        97,
      );
    }
    const pop = clamp(28 + Math.log10(safe(d.popularity, 1) + 1) * 28, 20, 98),
      reliability = clamp(58 + Math.log10(all.length + 1) * 10, 35, 94),
      momentum = clamp(
        48 +
          all.filter(
            (c) =>
              parseInt((c.release_date || "0").slice(0, 4)) >=
              S.project.year - 5,
          ).length *
            2,
        30,
        95,
      ),
      craft = clamp(46 + avg * 5, 35, 97);
    const collabs = {};
    for (const o of [...(credits?.cast || []), ...(credits?.crew || [])])
      if (o.id !== x.id) collabs[o.id] = (collabs[o.id] || 0) + 1;
    const iconicRoles = [
      ...new Map(
        (d.combined_credits?.cast || [])
          .filter(
            (credit) =>
              credit.media_type === "movie" && credit.title && credit.character,
          )
          .sort((a, b) => safe(b.vote_count) - safe(a.vote_count))
          .map((credit) => [
            `${credit.title}|${credit.character}`,
            {
              title: credit.title,
              character: credit.character,
              year:
                Number.parseInt((credit.release_date || "").slice(0, 4), 10) ||
                null,
              movieId: credit.id || null,
            },
          ]),
      ).values(),
    ].slice(0, 8);

    const castCredits = d.combined_credits?.cast || [];
    const voiceCredits = castCredits.filter(
      (credit) =>
        /\(voice\)|voice/i.test(credit.character || "") ||
        (credit.genre_ids || []).includes(GENRE_IDS.Animation),
    );
    const liveCredits = castCredits.filter(
      (credit) =>
        !/\(voice\)|voice/i.test(credit.character || "") &&
        !(credit.genre_ids || []).includes(GENRE_IDS.Animation),
    );
    const voiceShare =
      voiceCredits.length /
      Math.max(1, voiceCredits.length + liveCredits.length);
    const voiceOnly =
      voiceCredits.length >= 3 &&
      liveCredits.length <= Math.max(1, Math.floor(voiceCredits.length * 0.2));

    const p = {
      id: `tmdb-${d.id}`,
      tmdbId: d.id,
      name: d.name,
      photo:
        V38_PORTRAITS?.pick(d, x) ||
        (d.profile_path
          ? `https://image.tmdb.org/t/p/w500${d.profile_path}`
          : null),
      bio: d.biography || "",
      known: [...new Set(ranked.map((c) => c.title).filter(Boolean))].slice(
        0,
        4,
      ),
      iconicRoles,
      birthYear: d.birthday ? parseInt(d.birthday.slice(0, 4)) : null,
      gender: safe(d.gender, 0),
      craft,
      draw: pop,
      reliability,
      momentum,
      fit,
      collabs,
      voiceShare,
      voiceOnly,
      voiceCredits: voiceCredits.length,
      liveCredits: liveCredits.length,
    };
    S.people[p.id] = p;
    return p;
  } catch {
    return null;
  }
}
async function comparableMovies(slot) {
  const yr = S.project.year,
    gid = GENRE_IDS[S.project.genre],
    queries = [
      {
        sort_by: "popularity.desc",
        page: 1 + Math.floor(Math.random() * 8),
      },
      {
        sort_by: "vote_count.desc",
        page: 1 + Math.floor(Math.random() * 8),
      },
      {
        sort_by: "primary_release_date.desc",
        page: 1 + Math.floor(Math.random() * 5),
      },
      {
        sort_by: "revenue.desc",
        page: 1 + Math.floor(Math.random() * 5),
      },
    ],
    all = [];
  const discovered = await Promise.allSettled(
    queries.map((q) =>
      api("/discover/movie", {
        ...q,
        with_genres: gid,
        include_adult: "false",
        "primary_release_date.gte": `${Math.max(1930, yr - 25)}-01-01`,
        "primary_release_date.lte": `${Math.min(new Date().getFullYear(), yr + 25)}-12-31`,
      }),
    ),
  );
  for (const result of discovered) {
    if (result.status === "fulfilled") {
      all.push(...(result.value.results || []));
    }
  }
  const uniq = [...new Map(all.map((x) => [x.id, x])).values()];
  const used = new Set(S.usedSources),
    franchiseRoots = S.usedSources.map((id) => String(id));
  return uniq
    .map((m) => ({
      m,
      score:
        (used.has(m.id) ? 8 : 0) +
        Math.random() * 2 +
        Math.max(0, safe(m.popularity) - 120) / 80,
    }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.m);
}
async function buildPool(slot) {
  const films = await comparableMovies(slot),
    out = [];
  for (const stub of films) {
    if (out.length >= 3) break;
    try {
      const d = await api(`/movie/${stub.id}`, {
        append_to_response: "credits",
        language: "en-US",
      });
      if (!d.credits) continue;
      const t = typeOf(slot);
      let raw =
        t === "Lead" || t === "Cast"
          ? (d.credits.cast || []).slice(0, 16)
          : (d.credits.crew || [])
              .filter(
                (x) =>
                  x.department ===
                  (t === "Director"
                    ? "Directing"
                    : t === "Writer"
                      ? "Writing"
                      : "Production"),
              )
              .slice(0, 16);
      if (t === "Director") raw = raw.filter((x) => x.job === "Director");
      if (t === "Writer")
        raw = raw.filter((x) =>
          ["Writer", "Screenplay", "Story"].includes(x.job),
        );
      if (t === "Producer") raw = raw.filter((x) => /Producer/.test(x.job));
      raw = [...new Map(raw.map((x) => [x.id, x])).values()];
      if (raw.length < 2) continue;
      const settled = await Promise.allSettled(
          raw.slice(0, 9).map((x) => hydrate(x, slot, d.credits)),
        ),
        people = settled
          .filter((x) => x.status === "fulfilled" && x.value)
          .map((x) => x.value);
      if (people.length < 2) continue;
      out.push({
        film: {
          id: d.id,
          title: d.title,
          year: (d.release_date || "").slice(0, 4),
          genre: (d.genres || []).map((g) => g.name).join(" / "),
          poster: d.poster_path
            ? `https://image.tmdb.org/t/p/w342${d.poster_path}`
            : null,
          overview: d.overview || "",
        },
        people,
      });
      if (!S.usedSources.includes(d.id)) S.usedSources.push(d.id);
    } catch {}
  }
  if (!out.length) throw new Error("No valid comparable source films found.");
  return out;
}

/** Return the editable economy settings for the selected production scale. */
function scaleEconomy(scale = S.project.scale) {
  return BALANCE_TUNING.economy[scale];
}

/** Average roster quality expressed around 1.0. */
function teamPackageStrength() {
  const scored = slotList()
    .map((slot) => {
      const hired = person(S.roster[slot]);
      return hired ? talentScore(hired, slot) : null;
    })
    .filter(Number.isFinite);

  return scored.length ? average(scored) / 70 : 1;
}

/** Small helper used by both the game simulation and Balance Lab. */
function average(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

/**
 * Convert financial performance into a readable commercial result.
 * All money values are in millions of dollars.
 */
function classifyOutcome({ gross, profit, totalCost, productionBudget }) {
  const rules = BALANCE_TUNING.outcomes;
  const roi = totalCost > 0 ? profit / totalCost : 0;
  const loss = Math.max(0, -profit);
  const catastrophicLoss = Math.max(
    rules.bombAbsoluteLoss,
    productionBudget * rules.bombLossBudgetMultiple,
  );

  const qualifiesAsGlobalPhenomenon = gross >= rules.allTimeHitGross;
  const qualifiesAsExceptionalBreakout =
    roi >= rules.allTimeHitRoi && gross >= rules.allTimeHitMinimumGrossForRoi;

  if (qualifiesAsGlobalPhenomenon || qualifiesAsExceptionalBreakout) {
    return {
      label: "All-Time Hit",
      roi,
    };
  }
  if (roi >= rules.blockbusterRoi) {
    return {
      label: "Blockbuster",
      roi,
    };
  }
  if (roi >= rules.hitRoi) {
    return {
      label: "Hit",
      roi,
    };
  }
  if (roi >= 0) {
    return {
      label: "Moderate Success",
      roi,
    };
  }
  if (roi < rules.bombRoi || loss > catastrophicLoss) {
    return {
      label: "Bomb",
      roi,
    };
  }
  return {
    label: "Underperformer",
    roi,
  };
}

// =============================================================================
// PRODUCTION, AWARDS AND RELEASE SIMULATION
// =============================================================================
function packageVars() {
  const cameoEffects = resolveCameoEffects();
  const ps = slotList()
      .map((slot) => ({
        slot,
        p: person(S.roster[slot]),
      }))
      .filter((x) => x.p),
    avg = (types, key) => {
      const a = ps
        .filter((x) => types.includes(typeOf(x.slot)))
        .map((x) => adjusted(x.p, x.slot)[key]);
      return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 55;
    };
  const base = {
    Action: [76, 62, 78, 52, 72, 32],
    Adventure: [74, 67, 80, 58, 76, 38],
    Animation: [70, 72, 75, 66, 80, 55],
    Comedy: [55, 68, 48, 55, 72, 25],
    Drama: [35, 64, 45, 72, 64, 76],
    Horror: [62, 59, 55, 56, 65, 18],
    "Sci-Fi": [72, 66, 82, 64, 75, 46],
    Thriller: [56, 68, 62, 64, 70, 34],
    Romance: [42, 70, 48, 57, 76, 31],
    Crime: [46, 66, 54, 68, 67, 58],
    Documentary: [18, 65, 30, 74, 68, 62],
    Family: [62, 74, 65, 58, 82, 34],
    Fantasy: [72, 67, 82, 60, 76, 48],
    History: [36, 63, 48, 70, 62, 74],
    Music: [44, 69, 56, 60, 76, 44],
    Mystery: [46, 70, 52, 68, 72, 46],
    War: [42, 62, 55, 69, 62, 70],
    Western: [28, 60, 36, 65, 58, 52],
  }[S.project.genre] || [48, 65, 55, 65, 68, 50];
  const [bo, bw, bi, bc, ba, baw] = base,
    leadDraw = avg(["Lead"], "draw"),
    castCraft = avg(["Lead", "Cast"], "craft"),
    dir = avg(["Director"], "craft"),
    write = avg(["Writer"], "craft"),
    prod = avg(["Producer"], "reliability"),
    chem = avg(["Lead", "Cast", "Director", "Writer", "Producer"], "chemistry");
  const modeChem = S.mode === "draft" ? 2 : -1.5,
    modeStability = S.mode === "draft" ? 1.5 : -2;
  const adjustedChem = clamp(chem + modeChem),
    coord = clamp(
      (S.project.directors - 1) * 12 +
        (S.project.writers - 2) * 6 +
        (100 - adjustedChem) * 0.15 +
        (S.mode === "search" ? 2 : 0),
      0,
      70,
    );
  return {
    opening: clamp(
      bo +
        0.22 * (leadDraw - 55) +
        0.08 * (avg(["Lead"], "momentum") - 55) +
        (S.mode === "search" ? 1.5 : 0) +
        cameoEffects.opening,
    ),
    wom: clamp(
      bw +
        0.17 * (castCraft - 55) +
        0.18 * (write - 55) +
        0.13 * (adjustedChem - 55) -
        coord * 0.14 +
        cameoEffects.wom,
    ),
    intl: clamp(bi + 0.17 * (leadDraw - 55)),
    crit: clamp(
      bc +
        0.25 * (dir - 55) +
        0.22 * (write - 55) -
        coord * 0.15 +
        cameoEffects.critic,
    ),
    aud: clamp(
      ba +
        0.17 * (castCraft - 55) +
        0.15 * (adjustedChem - 55) +
        cameoEffects.audience,
    ),
    awards: clamp(
      baw + 0.22 * (dir - 55) + 0.18 * (write - 55) + cameoEffects.awards,
    ),
    stability: clamp(68 + 0.24 * (prod - 55) - coord * 0.22 + modeStability),
    chem: adjustedChem,
    coord,
  };
}

function awardContext() {
  const genreTuning = BALANCE_TUNING.genreEffects[S.project.genre];
  const campaignTuning = BALANCE_TUNING.campaigns[S.marketing];
  const prestigeGenres = [
    "Drama",
    "History",
    "War",
    "Crime",
    "Documentary",
    "Music",
  ];
  const scaleBias =
    {
      Microbudget: -2,
      Independent: 5,
      "Mid-Budget": 7,
      "Studio Event": 1,
      Tentpole: -7,
    }[S.project.scale] || 0;
  const monthBias =
    {
      January: -5,
      February: -4,
      March: -2,
      April: -1,
      May: -4,
      June: -5,
      July: -6,
      August: -4,
      September: 2,
      October: 6,
      November: 9,
      December: 10,
    }[S.project.month] || 0;
  const genreBias = genreTuning.awardBonus + genreTuning.technicalAwardBonus;
  const campaignBias = campaignTuning.awardScoreBonus;
  const competitionRng = rng("award-competition");
  const competition = clamp(
    42 + competitionRng() * 40 + (S.project.year % 7) * 1.5,
    35,
    92,
  );
  return {
    scaleBias,
    monthBias,
    genreBias,
    campaignBias,
    competition,
    prestige: prestigeGenres.includes(S.project.genre),
    technical: genreTuning.technicalAwardBonus > 0,
    actingCategoriesEnabled: genreTuning.actingCategoriesEnabled,
    technicalNominationMaximum: genreTuning.technicalNominationMaximum,
  };
}

function awardSim(simulation, random) {
  const context = awardContext();

  // Awards quality deliberately uses different inputs than box office. This
  // prevents a commercial blockbuster from automatically becoming a prestige
  // success and gives genre, season, campaign and competition real influence.
  const quality =
    0.46 * simulation.critic +
    0.3 * simulation.vars.awards +
    0.14 * simulation.audience +
    0.1 * simulation.vars.stability;

  const score =
    quality +
    context.scaleBias +
    context.monthBias +
    context.genreBias +
    context.campaignBias -
    (context.competition - 60) * 0.22;

  // "Contender" means the movie enters the awards conversation. It does not
  // guarantee a nomination, which is why the UI no longer calls this a run.
  const contenderChance = clamp((score - 58) * 2.15, 2, 92) / 100;
  const contender = random() < contenderChance;

  let filmNoms = 0;
  let filmWins = 0;
  let actingNoms = 0;
  let actingWins = 0;
  let pictureNoms = 0;
  let technicalNoms = 0;
  let technicalWins = 0;

  if (contender) {
    pictureNoms =
      context.prestige &&
      score > 73 &&
      random() < clamp((score - 68) / 35, 0.08, 0.72)
        ? 1
        : 0;

    actingNoms = context.actingCategoriesEnabled
      ? Math.max(
          0,
          Math.floor(
            (simulation.audience + simulation.critic - 125) / 24 +
              random() * 2.2,
          ),
        )
      : 0;

    technicalNoms = context.technical
      ? Math.max(
          0,
          Math.min(
            Math.floor(context.technicalNominationMaximum),
            Math.floor(
              (simulation.vars.opening + simulation.critic - 115) / 20 +
                random() * 3.0,
            ),
          ),
        )
      : Math.max(0, Math.floor(random() * context.technicalNominationMaximum));

    // Unlike V19, a contender can finish with zero nominations.
    const generalNoms = Math.max(
      0,
      Math.round((score - 64) / 8 + random() * 2 - 1),
    );
    filmNoms = generalNoms + pictureNoms;

    const winStrength =
      score + context.campaignBias * 0.35 - (context.competition - 60) * 0.12;
    filmWins = Math.min(
      filmNoms,
      Math.max(0, Math.floor((winStrength - 72) / 11 + random() * 1.8)),
    );
    actingWins = Math.min(
      actingNoms,
      Math.max(
        0,
        Math.floor(
          (simulation.audience + simulation.critic - 155) / 35 + random(),
        ),
      ),
    );
    technicalWins = Math.min(
      technicalNoms,
      Math.max(
        0,
        Math.floor(
          (simulation.vars.opening + simulation.critic - 145) / 34 +
            random() * 1.1,
        ),
      ),
    );
  }

  return {
    filmNoms,
    filmWins,
    actingNoms,
    actingWins,
    pictureNoms,
    technicalNoms,
    technicalWins,
    contender,
    awardRun: contender, // Kept for compatibility with older saved runs.
    awardScore: Math.round(score),
    competition: Math.round(context.competition),
    shows: [
      "Academy Awards",
      "Golden Globes",
      "BAFTA",
      "SAG",
      "Critics Choice",
    ].map((name, index) => {
      const weight = [1, 0.82, 0.88, 0.75, 0.78][index];
      const nominations = Math.max(
        0,
        Math.round(
          ((filmNoms + actingNoms + technicalNoms) * weight) / 3 +
            (random() - 0.55) * 2,
        ),
      );
      const wins = Math.max(
        0,
        Math.min(
          nominations,
          Math.round(
            ((filmWins + actingWins + technicalWins) * weight) / 3 +
              (random() - 0.72),
          ),
        ),
      );
      return {
        name,
        nominations,
        wins,
      };
    }),
  };
}

function simulate() {
  ensureSeed();

  const random = rng("release");
  const vars = packageVars();
  const campaign = MARKETING[S.marketing];
  const campaignTuning = BALANCE_TUNING.campaigns[S.marketing];
  const genreTuning = BALANCE_TUNING.genreEffects[S.project.genre];
  const receptionTuning = BALANCE_TUNING.reception;
  const economy = scaleEconomy();

  // Apply marketing to individual project signals.
  for (const key of ["opening", "crit", "wom", "intl"]) {
    vars[key] = clamp(vars[key] + safe(campaign[key]));
  }
  vars.aud = clamp(vars.aud + safe(campaign.wom) * 0.45);
  vars.awards = clamp(vars.awards + safe(campaign.awards));

  const budgetRange = SCALE[S.project.scale].budget;
  const budget = average(budgetRange);
  const marketing = budget * economy.marketingRate;
  const packageStrength = teamPackageStrength();

  // Three random draws create a bell-shaped result instead of a flat random
  // number. Strong packages have slightly more coordination risk, while weak
  // packages retain a small breakout path.
  const volatility =
    (0.1 +
      campaign.vol / 100 +
      (100 - vars.stability) / 300 +
      Math.max(0, packageStrength - 1) * 0.08) *
    campaignTuning.volatilityMultiplier;
  let execution = 1 + (random() + random() + random() - 1.5) * volatility;
  let weakBreakout = false;
  let starStumble = false;

  const weakBreakoutChance = clamp(
    (1.02 - packageStrength) * 0.15 + 0.04,
    0.02,
    0.12,
  );
  if (random() < weakBreakoutChance) {
    weakBreakout = true;
    execution *= 1.18 + random() * 0.27;
  }

  const starStumbleChance = clamp((packageStrength - 1) * 0.14, 0, 0.1);
  if (random() < starStumbleChance) {
    starStumble = true;
    execution *= 0.75 + random() * 0.15;
  }

  // Rare production catastrophes create true bombs and keep large projects
  // from becoming automatic profits.
  const catastrophe = random() < economy.catastropheChance;
  if (catastrophe) {
    const grossRules = BALANCE_TUNING.grossModel;
    execution *=
      grossRules.catastropheGrossMinimum +
      random() *
        (grossRules.catastropheGrossMaximum -
          grossRules.catastropheGrossMinimum);
  }

  const baseOpening = budget * 0.16 + marketing * 0.3;
  const openingSignalMultiplier = vars.opening / 62;
  const executionMultiplier = Math.max(0.28, execution);

  const opening = Math.max(
    0.4,
    baseOpening *
      openingSignalMultiplier *
      economy.demandMultiplier *
      executionMultiplier,
  );

  // Keep the established project-signal model, then apply the validated
  // genre/campaign identities and wider reception spread around its neutral
  // combined-pass baseline.
  const critic = clamp(
    vars.crit +
      (receptionTuning.critics.base - 32) +
      campaignTuning.criticBonus +
      genreTuning.criticBonus +
      (execution - 1) * 30 +
      (random() - 0.5) * receptionTuning.critics.randomAmplitude * 0.35,
    15,
    99,
  );
  const audience = clamp(
    vars.aud +
      (receptionTuning.audience.base - 36) +
      (vars.wom - 60) * 0.18 +
      campaignTuning.audienceBonus +
      genreTuning.audienceBonus +
      (execution - 1) * 26 +
      (random() - 0.5) * receptionTuning.audience.randomAmplitude * 0.35,
    15,
    99,
  );

  const legs = clamp(
    1.45 +
      vars.wom / 54 +
      audience / 160 -
      vars.coord / 260 +
      (execution - 1) * 0.6,
    1.4,
    5.2,
  );

  const domestic = opening * legs;
  const internationalShare = clamp(0.28 + vars.intl / 220, 0.3, 0.74);
  const world =
    (domestic / (1 - internationalShare)) *
    campaignTuning.grossMultiplier *
    genreTuning.grossMultiplier;

  // Studio economics. Higher-scale movies pay more overhead, participation and
  // overrun risk even when their gross is impressive.
  const studioShare = 0.45 - internationalShare * 0.04;
  const overheadRate = clamp(0.08 + 0.00035 * budget, 0.08, 0.2);
  const overhead = budget * overheadRate;
  const backend = world * economy.backendRate;

  let overrunRate =
    economy.baseOverrunRate +
    (70 - vars.stability) * 0.0025 +
    (random() + random() - 1) * economy.overrunVolatility;
  if (catastrophe) {
    overrunRate += 0.12 + random() * 0.24;
  }
  overrunRate = Math.max(0, overrunRate);
  const overrun = budget * overrunRate;

  const ancillary =
    budget * (0.08 + audience / 650 + campaignTuning.ancillaryBudgetRate);

  const completedAuditions = v24HiredAuditions();
  const auditionAverage = completedAuditions.length
    ? average(
        completedAuditions.map((audition) =>
          average(Object.values(audition.mods || {})),
        ),
      )
    : 0;
  const auditionGrossMultiplier =
    1 + auditionAverage / BALANCE_TUNING.auditions.grossDivisor;
  const adjustedWorld = Math.max(0, world * auditionGrossMultiplier);

  const totalCost = budget + marketing + overhead + backend + overrun;
  const theatricalRevenue = adjustedWorld * studioShare;
  const distributionShare = Math.max(0, adjustedWorld - theatricalRevenue);
  const totalStudioRevenue = theatricalRevenue + ancillary;
  const profit = totalStudioRevenue - totalCost;
  const outcome = classifyOutcome({
    gross: adjustedWorld,
    profit,
    totalCost,
    productionBudget: budget,
  });

  const weeks = [];
  let weeklyGross = opening;
  for (let week = 0; week < 10; week += 1) {
    weeks.push(weeklyGross);
    weeklyGross *=
      1 -
      clamp(
        0.48 -
          (vars.wom - 60) / 180 -
          (audience - 60) / 300 +
          (random() - 0.5) * 0.07,
        0.17,
        0.75,
      );
  }

  const impacts = slotList()
    .map((slot) => {
      const hired = person(S.roster[slot]);
      if (!hired) return null;

      const attrs = adjusted(hired, slot);
      const total =
        (attrs.craft - 55) * 0.2 +
        (attrs.draw - 55) * 0.12 +
        (attrs.reliability - 55) * 0.15 +
        (attrs.momentum - 55) * 0.12 +
        (attrs.chemistry - 55) * 0.2 +
        (attrs.fit - 55) * 0.12 +
        attrs.age.delta * 0.09;

      return {
        slot,
        name: hired.name,
        character: roleName(slot),
        total: Math.round(total),
        opening: Math.round((attrs.draw - 55) * 0.08),
        audience: Math.round((attrs.craft + attrs.chemistry - 110) * 0.08),
        critics: Math.round((attrs.craft + attrs.fit - 110) * 0.07),
        stability: Math.round((attrs.reliability - 55) * 0.11),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const awards = awardSim(
    {
      critic,
      audience,
      vars,
    },
    rng("awards"),
  );

  return {
    vars,
    budget,
    marketing,
    baseOpening,
    openingSignalMultiplier,
    demandMultiplier: economy.demandMultiplier,
    execution,
    executionMultiplier,
    weakBreakout,
    starStumble,
    volatility,
    campaignGrossMultiplier: campaignTuning.grossMultiplier,
    genreGrossMultiplier: genreTuning.grossMultiplier,
    campaignName: S.marketing,
    genreName: S.project.genre,
    overhead,
    backend,
    overrun,
    totalCost,
    studioShare,
    theatricalRevenue,
    distributionShare,
    ancillary,
    totalStudioRevenue,
    internationalShare,
    auditionGrossMultiplier,
    worldBeforeAuditions: world,
    catastrophe,
    packageStrength,
    opening,
    critic,
    audience,
    legs,
    domestic,
    world: adjustedWorld,
    profit,
    roi: outcome.roi,
    outcome: outcome.label,
    weeks,
    impacts,
    awards,
    year: v28ReleaseYear(),
  };
}

// =============================================================================
// USER INTERFACE PAGES
// =============================================================================
function sidebar() {
  const plan = SCALE[S.project.scale].plan;

  return `<aside class="sidebar">
    <div class="card">
      <div class="mini">Project</div>
      <h3>${S.project.title}</h3>
      <div class="sub">${S.project.genre} · ${S.project.scale}<br>${S.project.month} ${S.project.year}</div>
    </div>

    <div class="card">
      <div class="mini">Scale plan</div>
      <div class="chipRow">
        ${plan.map((tier) => `<span class="tier ${tier}" style="min-width:34px;height:34px">${tier}</span>`).join("")}
      </div>
      <div class="sub" style="margin-top:8px">Each department uses these caps from slot 1 onward.</div>
    </div>

    <h3>Team</h3>
    <div class="roster">
      ${slotList()
        .map((slot) => {
          const hired = person(S.roster[slot]);
          const statuses = [
            S.auditions[slot]
              ? '<span class="chip good sidebarStatusChip">Auditioned</span>'
              : "",
            S.cameos[slot]
              ? '<span class="chip cameoChip sidebarStatusChip">Cameo</span>'
              : "",
          ]
            .filter(Boolean)
            .join("");

          return `
          <div class="slot ${hired ? "filled" : ""}" data-slotnav="${slot}">
            <div class="slotTop">
              <div class="slotIdentity">
                <div class="mini">${slot} · cap ${slotCap(slot)}</div>
                <b>${hired ? hired.name : "Unfilled"}</b>
                ${roleName(slot) ? `<div class="playing">${roleName(slot)}</div>` : ""}
              </div>
              ${statuses ? `<div class="sidebarStatusChips">${statuses}</div>` : ""}
            </div>
          </div>
        `;
        })
        .join("")}
    </div>

    <div class="card">
      <div class="mini">Run seed</div>
      <code>${S.runSeed || "Created when production starts"}</code>
    </div>
  </aside>`;
}

function shell(main) {
  if (S.screen !== 4) stopReleaseRaceAnimation();
  const labels = [
    "Create Project",
    S.mode === "draft" ? "Draft Team" : "Search & Hire",
    "Production",
    "Marketing",
    "Release",
    "Results",
  ];
  $("#app").innerHTML =
    `<div class="shell"><div class="topbar"><div class="brand">GREEN<em>LIT</em></div><div class="actions"><button class="btn ${S.mode === "draft" ? "active" : ""}" id="draftMode">Draft Mode</button><button class="btn ${S.mode === "search" ? "active" : ""}" id="searchMode">Search Mode</button><button class="btn" id="data">Data</button><button class="btn" id="playerAnalytics">Player Analytics</button><button class="btn" id="balance">Balance Lab</button><button class="btn" id="newRun">New Run</button></div></div>
 <div class="progress">${labels.map((x, i) => `<div class="step ${i === S.screen ? "active" : i < S.screen ? "done" : ""}">${i + 1}. ${x}</div>`).join("")}</div><div class="layout">${sidebar()}<main class="main">${main}</main></div></div>`;
  $("#draftMode").onclick = () => {
    S.mode = "draft";
    render();
  };
  $("#searchMode").onclick = () => {
    S.mode = "draft";
    render();
  };
  $("#data").onclick = dataModal;
  $("#playerAnalytics").onclick = playerAnalyticsModal;
  $("#balance").onclick = balanceModal;
  $("#newRun").onclick = () => {
    if (confirm("Start a new run?")) {
      S = structuredClone(DEFAULT);
      render();
    }
  };
  $$("[data-slotnav]").forEach(
    (x) =>
      (x.onclick = () => {
        S.activeSlot = x.dataset.slotnav;
        S.screen = 1;
        render();
        if (S.mode === "draft") ensurePool(S.activeSlot);
      }),
  );
}

function render() {
  save();
  if (S.screen === 0) return projectPage();
  if (S.screen === 1) return hirePage();
  if (S.screen === 2) return productionPage();
  if (S.screen === 3) return marketingPage();
  if (S.screen === 4) return releasePage();
  return resultsPage();
}

function projectPage() {
  shell(`<h1>Create the project.</h1><p class="sub">Choose a real movie or show as the role template, then rebuild it with your own team.</p>
 <div class="formgrid"><div style="grid-column:1/-1"><label>Search movies and shows</label><div class="row"><input id="titleSearch" placeholder="Search a title…"><button class="btn primary" id="searchTitleBtn">Search</button><button class="btn" id="randomTitleBtn">Random real movie</button></div><div id="searchList" class="searchResults"></div></div></div>
 ${S.reference ? `<div class="sourceHero">${S.reference.poster ? `<img src="${S.reference.poster}">` : "<div></div>"}<div><div class="mini">Reference title</div><h2>${S.reference.title}</h2><div class="sub">${S.reference.genre} · ${S.reference.scale} · ${S.reference.year}<br>${S.reference.overview}</div></div><div class="metric">${moneyM(S.reference.budgetM)}</div></div>` : ""}
 <div class="formgrid">
  <div><label>Project title</label><input id="title" value="${S.project.title}"></div><div><label>Genre</label><select id="genre">${GENRES.map((x) => `<option ${x === S.project.genre ? "selected" : ""}>${x}</option>`).join("")}</select></div>
  <div><label>Year</label><input id="year" type="number" value="${S.project.year}"></div><div><label>Scale</label><select id="scale">${Object.keys(
    SCALE,
  )
    .map(
      (x) => `<option ${x === S.project.scale ? "selected" : ""}>${x}</option>`,
    )
    .join("")}</select></div>
  <div><label>Release month</label><select id="month">${MONTHS.map((x) => `<option ${x === S.project.month ? "selected" : ""}>${x}</option>`).join("")}</select></div><div><label>Rating</label><select id="rating">${["G", "PG", "PG-13", "R"].map((x) => `<option ${x === S.project.rating ? "selected" : ""}>${x}</option>`).join("")}</select></div>
  <div><label>Directors</label><select id="directors">${[1, 2].map((x) => `<option ${x === S.project.directors ? "selected" : ""}>${x}</option>`).join("")}</select></div><div><label>Writers</label><select id="writers">${[1, 2, 3, 4].map((x) => `<option ${x === S.project.writers ? "selected" : ""}>${x}</option>`).join("")}</select></div>
  <div><label>Producers</label><select id="producers">${[1, 2, 3, 4].map((x) => `<option ${x === S.project.producers ? "selected" : ""}>${x}</option>`).join("")}</select></div>
 </div>
 <div class="callout good"><b>Character-first setup:</b> ${
   Object.entries(S.roles)
     .map(([s, r]) => `${s}: ${r}`)
     .join(" · ") || "Select a reference title to load roles."
 }</div>
 <button class="btn primary" id="continue" ${S.reference ? "" : "disabled"}>Continue to hiring →</button>`);
  $("#searchTitleBtn").onclick = async () => {
    const q = $("#titleSearch").value.trim(),
      box = $("#searchList");
    box.innerHTML = '<div class="callout">Searching…</div>';
    try {
      const d = await api("/search/multi", {
        query: q,
        include_adult: "false",
      });
      box.innerHTML = (d.results || [])
        .filter((x) => ["movie", "tv"].includes(x.media_type))
        .slice(0, 12)
        .map(
          (x) =>
            `<button class="searchItem" data-ref="${x.id}" data-type="${x.media_type}">${x.poster_path ? `<img src="https://image.tmdb.org/t/p/w185${x.poster_path}">` : "<div></div>"}<div><b>${x.media_type === "tv" ? x.name : x.title}</b><div class="sub">${x.media_type.toUpperCase()} · ${(x.release_date || x.first_air_date || "").slice(0, 4)}</div></div><span>Use →</span></button>`,
        )
        .join("");
      $$("[data-ref]").forEach(
        (b) =>
          (b.onclick = () => selectReference(+b.dataset.ref, b.dataset.type)),
      );
    } catch (e) {
      box.innerHTML = `<div class="callout bad">${e.message}</div>`;
    }
  };
  $("#randomTitleBtn").onclick = async () => {
    try {
      const d = await api("/discover/movie", {
          sort_by: "popularity.desc",
          page: 1 + Math.floor(Math.random() * 15),
          include_adult: "false",
        }),
        m = d.results[Math.floor(Math.random() * d.results.length)];
      await selectReference(m.id, "movie");
    } catch (e) {
      alert(e.message);
    }
  };
  for (const id of [
    "title",
    "genre",
    "year",
    "scale",
    "month",
    "rating",
    "directors",
    "writers",
    "producers",
  ])
    $("#" + id).onchange = (e) => {
      S.project[id] = ["year", "directors", "writers", "producers"].includes(id)
        ? +e.target.value
        : e.target.value;
      render();
    };
  $("#continue").onclick = () => {
    S.screen = 1;
    S.activeSlot = slotList()[0];
    render();
    if (S.mode === "draft") ensurePool(S.activeSlot);
  };
}

async function ensurePool(slot) {
  if (S.sourcePools[slot]?.length) return;
  const renderId = ACTIVE_RENDER_ID;
  const referenceId = S.reference?.id ?? null;
  const requestKey = `${referenceId}|${slot}`;
  $(".main").innerHTML =
    '<h1>Building a diverse candidate pool…</h1><div class="callout">Combining multiple discover slices and excluding recent source titles.</div>';
  try {
    let request = POOL_REQUESTS.get(requestKey);
    if (!request) {
      request = buildPool(slot);
      POOL_REQUESTS.set(requestKey, request);
    }
    const pool = await request;
    if (S.reference?.id !== referenceId) return;
    S.sourcePools[slot] = pool;
    S.sourceIndex[slot] = 0;
    if (typeof v34AssignPoolTiers === "function") v34AssignPoolTiers(slot);
    if (
      renderId === ACTIVE_RENDER_ID &&
      S.screen === 1 &&
      S.activeSlot === slot
    ) {
      render();
    }
  } catch (e) {
    if (S.screen === 1 && S.activeSlot === slot) {
      $(".main").innerHTML =
        `<h1>Pool failed.</h1><div class="callout bad">${arcadeEsc(e.message)}</div><button class="btn" id="retry">Retry</button>`;
      $("#retry").onclick = () => ensurePool(slot);
    }
  } finally {
    POOL_REQUESTS.delete(requestKey);
  }
}

function cameoChoicesForPerson(p) {
  const roles = p.iconicRoles || [];

  if (roles.length) return roles;

  // Compatibility fallback for people stored before recognizable characters
  // were added to the compact save format.
  return (p.known || []).map((title) => ({
    title,
    character: `Recognizable role from ${title}`,
  }));
}

function cameoModal(p, slot) {
  const options = cameoChoicesForPerson(p);

  if (!options.length) {
    alert(`No recognizable movie roles were loaded for ${p.name}.`);
    return;
  }

  const current = S.cameos[slot]?.personId === p.id ? S.cameos[slot] : null;

  modal(
    `
    <div class="cameoModalHead">
      <div>
        <div class="mini">Iconic-role cameo</div>
        <h2>${p.name}</h2>
      </div>
      <button class="balanceClose" data-close aria-label="Close">×</button>
    </div>

    <p class="sub">
      Hire ${p.name} while presenting the appearance as one of their
      recognizable characters. A successful cameo can improve opening demand
      and audience enthusiasm; a forced cameo may hurt word of mouth.
    </p>

    <div class="cameoOptions">
      ${options
        .map(
          (role, index) => `
        <button
          class="cameoOption ${current?.character === role.character ? "selected" : ""}"
          data-cameo-option="${index}"
        >
          <b>${role.character}</b>
          <span>${role.title}</span>
        </button>
      `,
        )
        .join("")}
    </div>

    ${
      current
        ? `
      <button class="btn danger" id="removeCameo">
        Remove current cameo
      </button>
    `
        : ""
    }
  `,
    "cameoModal",
  );

  $$("[data-cameo-option]").forEach((button) => {
    button.onclick = () => {
      const role = options[Number(button.dataset.cameoOption)];

      S.roster[slot] = p.id;
      S.cameos[slot] = {
        personId: p.id,
        actorName: p.name,
        title: role.title,
        character: role.character,
      };
      delete S.cameoOutcomes[slot];

      record("cameo_selected", {
        slot,
        personId: p.id,
        title: role.title,
        character: role.character,
      });

      closeModal();
      render();
    };
  });

  if ($("#removeCameo")) {
    $("#removeCameo").onclick = () => {
      delete S.cameos[slot];
      delete S.cameoOutcomes[slot];
      record("cameo_removed", { slot, personId: p.id });
      closeModal();
      render();
    };
  }
}

function resolveCameoEffects() {
  const random = rng("cameos");
  const totals = {
    opening: 0,
    wom: 0,
    critic: 0,
    audience: 0,
    awards: 0,
  };
  const outcomes = {};

  for (const [slot, cameo] of Object.entries(S.cameos || {})) {
    const actor = person(cameo.personId);
    if (!actor) continue;

    const attributes = adjusted(actor, slot);
    const draw = safe(attributes.draw, 50);
    const fit = safe(attributes.fit, 50);

    const successChance = clamp(
      0.3 + (draw - 50) / 150 + (fit - 50) / 190,
      0.18,
      0.86,
    );

    const successful = random() < successChance;

    const effect = successful
      ? {
          opening: 2 + random() * 5,
          wom: 1 + random() * 3,
          critic: -0.5 + random() * 2.5,
          audience: 2 + random() * 4,
          awards: fit >= 75 ? random() * 2 : 0,
        }
      : {
          opening: -0.5 - random() * 2,
          wom: -1 - random() * 3,
          critic: -0.5 - random() * 2.5,
          audience: -0.5 - random() * 2.5,
          awards: 0,
        };

    totals.opening += effect.opening;
    totals.wom += effect.wom;
    totals.critic += effect.critic;
    totals.audience += effect.audience;
    totals.awards += effect.awards;

    outcomes[slot] = {
      ...cameo,
      successful,
      successChance,
      ...effect,
    };
  }

  S.cameoOutcomes = outcomes;
  return totals;
}

function candidateCard(p, slot) {
  const beforeAudition = adjusted(p, slot, false);
  const current = adjusted(p, slot, true);
  const tier = talentTier(p, slot);
  const isAllowed = allowed(p, slot);
  const audition = S.auditions[slot];
  const isAuditioned = audition?.personId === p.id;
  const isShortlisted = (S.shortlists[slot] || []).includes(p.id);
  const isActorSlot = ["Lead", "Cast"].includes(typeOf(slot));
  const activeCameo = S.cameos[slot]?.personId === p.id ? S.cameos[slot] : null;
  const tierBefore = isAuditioned
    ? audition.tierBeforeAudition || baseTalentTier(p, slot)
    : tier;
  const promotedOverCap =
    isAuditioned &&
    audition.eligibleBeforeAudition &&
    TIER_ORDER[tier] > TIER_ORDER[slotCap(slot)];

  const eligibilityText = promotedOverCap
    ? `Audition promotion honored — originally ${tierBefore} tier`
    : isAllowed
      ? `Eligible for ${slotCap(slot)} cap`
      : `${tier} exceeds ${slotCap(slot)} cap`;

  const stats = ["craft", "draw", "reliability", "momentum", "chemistry"];
  const statHtml = stats
    .map((key) => {
      const difference = current[key] - beforeAudition[key];
      const delta =
        isAuditioned && Math.abs(difference) >= 0.05
          ? `<span class="statDelta ${difference > 0 ? "positive" : "negative"}">${difference > 0 ? "+" : ""}${difference.toFixed(1)}</span>`
          : "";
      return `<div class="stat">${key[0].toUpperCase() + key.slice(1)} <b>${Math.round(current[key])}${delta}</b></div>`;
    })
    .join("");

  const tierChange =
    isAuditioned && tierBefore !== tier
      ? `<div class="auditionTierChange ${TIER_ORDER[tier] > TIER_ORDER[tierBefore] ? "positive" : "negative"}">Audition tier: ${tierBefore} → ${tier}</div>`
      : "";

  return `<article class="person ${isAllowed ? "" : "locked"} ${S.roster[slot] === p.id ? "selected" : ""} ${promotedOverCap ? "auditionPromoted" : ""}" data-person="${p.id}" data-ok="${isAllowed}">
 ${
   p.photo
     ? `<img src="${p.photo}">`
     : `<div class="fallback">${p.name
         .split(/\s+/)
         .map((x) => x[0])
         .join("")
         .slice(0, 2)}</div>`
 }<div class="personBody">
 <div class="personHead"><div><div class="name">${p.name}</div><div class="sub">${eligibilityText}</div></div><div class="tier ${tier}">${tier}</div></div>
 <div class="stats">${statHtml}</div>
 <div class="fitBox"><span>Project Fit</span><b class="fit${fitBand(current.fit)}">${isAuditioned ? `${Math.round(current.fit)}%` : fitBand(current.fit)}</b></div>
 ${tierChange}
 ${["Lead", "Cast"].includes(typeOf(slot)) ? `<div class="ageBox">Target ${current.age.range?.[0]}–${current.age.range?.[1]} · ${current.age.age != null ? `Age ${current.age.age}` : "Unknown age"}<br><b>${current.age.label}</b></div>` : ""}
 <div class="chipRow" style="margin-top:8px"><button class="btn" data-short="${p.id}">${isShortlisted ? "Unpin" : "Shortlist"}</button><button class="btn primary" data-aud="${p.id}" ${S.auditions[slot] || !isAllowed ? "disabled" : ""}>${isAuditioned ? "Auditioned" : "Audition"}</button></div>
 ${
   isActorSlot
     ? `
   <button
     class="cameoBtn ${activeCameo ? "active" : ""}"
     data-cameo-person="${p.id}"
     data-cameo-slot="${slot}"
     ${isAllowed ? "" : "disabled"}
   >
     ${activeCameo ? `Cameo: ${activeCameo.character}` : "Use iconic-role cameo"}
   </button>
 `
     : ""
 }
 <p class="sub">${(p.bio || "Biography unavailable.").slice(0, 180)}</p><div class="sub"><b>Known for:</b> ${(p.known || []).slice(0, 3).join(", ")}</div>
 </div></article>`;
}

function shortlistFocusPanel(slot) {
  const ids = S.shortlists[slot] || [];
  if (!ids.length) return "";

  const focusId = S.shortlistFocus[slot] || ids[0];
  const compareId = S.shortlistCompare[slot] || null;
  const focused = person(focusId);
  const compared = person(compareId);
  if (!focused) return "";

  const comparisonOptions = ids
    .filter((id) => id !== focusId)
    .map((id) => person(id))
    .filter(Boolean);

  return `<section class="shortlistFocusPanel">
    <div class="shortlistFocusHeader">
      <div><div class="mini">Shortlist focus</div><h2>${focused.name}</h2></div>
      ${
        comparisonOptions.length
          ? `<div class="shortlistCompareControls">
        <select id="shortlistCompareSelect">
          <option value="">Choose another shortlisted person…</option>
          ${comparisonOptions.map((candidate) => `<option value="${candidate.id}" ${candidate.id === compareId ? "selected" : ""}>${candidate.name}</option>`).join("")}
        </select>
        <button class="btn primary" id="compareShortlistButton">Compare with</button>
      </div>`
          : ""
      }
    </div>
    <div class="shortlistComparisonGrid">
      ${candidateCard(focused, slot)}
      ${compared ? candidateCard(compared, slot) : `<div class="compareEmpty">Choose another shortlisted candidate, then press <b>Compare with</b> to place both complete cards side by side.</div>`}
    </div>
  </section>`;
}
async function hirePage() {
  const slot = S.activeSlot || slotList()[0];
  S.activeSlot = slot;

  if (S.mode === "draft" && !S.sourcePools[slot]?.length) {
    shell("<h1>Preparing draft…</h1>");
    return ensurePool(slot);
  }

  const pools = S.sourcePools[slot] || [];
  const index = S.sourceIndex[slot] || 0;
  const pool = pools[index];
  const candidates =
    S.mode === "draft"
      ? pool?.people || []
      : (S.searchResults || {})[slot] || [];
  const visibleCandidates = S.hideUnavailable
    ? candidates.filter((candidate) => allowed(candidate, slot))
    : candidates;

  shell(
    `<h1>${roleName(slot) || slot}</h1>
    <div class="roleTitle">${slot} · tier cap ${slotCap(slot)}</div>
    <p class="sub">Compare candidates, shortlist up to three, and spend the single audition only when you are ready.</p>
    <label class="availabilityToggle"><input type="checkbox" id="hideUnavailable" ${S.hideUnavailable ? "checked" : ""}><span>Hide unavailable candidates</span></label>
    <div class="chipRow">${slotList()
      .map(
        (s) =>
          `<button class="chip ${s === slot ? "active" : ""}" data-jump="${s}">${roleName(s) || s}${S.roster[s] ? " ✓" : ""}</button>`,
      )
      .join("")}</div>
    ${S.mode === "search" ? `<div class="row" style="margin:14px 0"><input id="personSearch" placeholder="Search a person…"><button class="btn primary" id="personSearchBtn">Search</button></div>` : ""}
    ${
      S.mode === "draft" && pools.length
        ? `<div class="sourceTabs">${pools.map((p, i) => `<button class="sourceTab ${i === index ? "active" : ""}" data-source="${i}">${p.film.poster ? `<img src="${p.film.poster}">` : "<div></div>"}<span><b>${p.film.title}</b><small>${p.film.genre} · ${p.film.year}</small></span></button>`).join("")}</div>
    <div class="sourceHero">${pool.film.poster ? `<img src="${pool.film.poster}">` : "<div></div>"}<div><div class="mini">Source film</div><h2>${pool.film.title}</h2><div class="sub">${pool.film.genre}<br>${pool.film.overview}</div></div><button class="btn" id="refreshPool">Refresh set</button></div>`
        : ""
    }
    ${
      (S.shortlists[slot] || []).length
        ? `<h3>Shortlist</h3><div class="compareBar">${(
            S.shortlists[slot] || []
          )
            .map((id) => {
              const candidate = person(id);
              return candidate
                ? `<button class="shortlist ${S.shortlistFocus[slot] === id ? "active" : ""}" data-short-open="${id}"><b>${candidate.name}</b><div class="sub">${talentTier(candidate, slot)} tier · ${fitBand(adjusted(candidate, slot).fit)} fit</div></button>`
                : "";
            })
            .join("")}</div>${shortlistFocusPanel(slot)}`
        : ""
    }
    <div class="cards">${visibleCandidates.map((p) => candidateCard(p, slot)).join("") || `<div class="callout">${S.hideUnavailable && candidates.length ? "Every candidate in this set is above the current cap. Turn off “Hide unavailable candidates” to review them." : "No candidates loaded yet."}</div>`}</div>
    <div class="row" style="justify-content:space-between;margin-top:18px"><button class="btn" id="backProject">← Project</button><button class="btn primary" id="toProduction" ${slotList().every((s) => S.roster[s]) ? "" : "disabled"}>Lock team →</button></div>`,
  );

  $$("[data-jump]").forEach(
    (button) =>
      (button.onclick = () => {
        S.activeSlot = button.dataset.jump;
        render();
        if (S.mode === "draft") ensurePool(S.activeSlot);
      }),
  );

  $$("[data-source]").forEach(
    (button) =>
      (button.onclick = () => {
        S.sourceIndex[slot] = +button.dataset.source;
        render();
      }),
  );

  $$("[data-person]").forEach(
    (card) =>
      (card.onclick = (event) => {
        if (event.target.closest("[data-short],[data-aud],[data-cameo-person]"))
          return;
        if (card.dataset.ok !== "true") return;

        if (S.cameos[slot]?.personId !== card.dataset.person) {
          delete S.cameos[slot];
          delete S.cameoOutcomes[slot];
        }

        S.roster[slot] = card.dataset.person;
        record("hire", { slot, personId: card.dataset.person, mode: S.mode });
        const next = slotList().find(
          (candidateSlot) => !S.roster[candidateSlot],
        );
        if (next) {
          S.activeSlot = next;
          render();
          if (S.mode === "draft") ensurePool(next);
        } else {
          render();
        }
      }),
  );

  $$("[data-short]").forEach(
    (button) =>
      (button.onclick = (event) => {
        event.stopPropagation();
        const current = S.shortlists[slot] || [];
        const id = button.dataset.short;

        if (current.includes(id)) {
          S.shortlists[slot] = current.filter(
            (candidateId) => candidateId !== id,
          );
          if (S.shortlistFocus[slot] === id)
            S.shortlistFocus[slot] = S.shortlists[slot][0] || null;
          if (S.shortlistCompare[slot] === id) S.shortlistCompare[slot] = null;
        } else if (current.length < 3) {
          S.shortlists[slot] = [...current, id];
          S.shortlistFocus[slot] = id;
          S.shortlistCompare[slot] = null;
        }
        render();
      }),
  );

  $$("[data-short-open]").forEach(
    (button) =>
      (button.onclick = () => {
        S.shortlistFocus[slot] = button.dataset.shortOpen;
        S.shortlistCompare[slot] = null;
        render();
      }),
  );

  if ($("#compareShortlistButton")) {
    $("#compareShortlistButton").onclick = () => {
      const selected = $("#shortlistCompareSelect")?.value || null;
      S.shortlistCompare[slot] = selected;
      render();
    };
  }

  $$("[data-aud]").forEach(
    (button) =>
      (button.onclick = (event) => {
        event.stopPropagation();
        ensureSeed();
        const candidate = person(button.dataset.aud);
        const fit = Math.round(baseAttrs(candidate, slot).fit);
        const tierBeforeAudition = baseTalentTier(candidate, slot);
        const eligibleBeforeAudition =
          TIER_ORDER[tierBeforeAudition] <= TIER_ORDER[slotCap(slot)];

        S.auditions[slot] = {
          personId: candidate.id,
          fit,
          mods: auditionMods(candidate, slot, fit),
          tierBeforeAudition,
          eligibleBeforeAudition,
        };

        record("audition", { slot, fit, tierBeforeAudition });
        render();
      }),
  );

  $$("[data-cameo-person]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      if (button.disabled) return;

      const candidate = person(button.dataset.cameoPerson);
      if (!candidate) return;

      cameoModal(candidate, button.dataset.cameoSlot);
    };
  });

  if ($("#hideUnavailable")) {
    $("#hideUnavailable").onchange = (event) => {
      S.hideUnavailable = event.target.checked;
      render();
    };
  }

  if ($("#personSearchBtn"))
    $("#personSearchBtn").onclick = async () => {
      const query = $("#personSearch").value;
      try {
        const data = await api("/search/person", {
          query,
          include_adult: "false",
        });
        const settled = await Promise.allSettled(
          (data.results || [])
            .slice(0, 10)
            .map((result) => hydrate(result, slot, { cast: [], crew: [] })),
        );
        S.searchResults = S.searchResults || {};
        S.searchResults[slot] = settled
          .filter((result) => result.status === "fulfilled" && result.value)
          .map((result) => result.value);
        S.tierCache[slot] = {};
        render();
      } catch (error) {
        alert(error.message);
      }
    };

  if ($("#refreshPool"))
    $("#refreshPool").onclick = async () => {
      delete S.sourcePools[slot];
      S.tierCache[slot] = {};
      await ensurePool(slot);
    };

  $("#backProject").onclick = () => {
    S.screen = 0;
    render();
  };

  $("#toProduction").onclick = () => {
    ensureSeed();
    S.screen = 2;
    S.events = generateEvents();
    render();
  };
}

function generateEvents() {
  const r = rng("events"),
    v = packageVars(),
    pool = [
      [
        "Writers deliver a cleaner final act",
        "good",
        {
          wom: 5,
          crit: 3,
        },
      ],
      [
        "Reshoots strain the schedule",
        "bad",
        {
          stability: -8,
          crit: -2,
        },
      ],
      [
        "Supporting cast breaks out",
        "good",
        {
          aud: 5,
          wom: 4,
        },
      ],
      [
        "Runtime becomes a pacing problem",
        "bad",
        {
          wom: -5,
          crit: -3,
        },
      ],
      [
        "Producer contains a delay",
        "good",
        {
          stability: 7,
        },
      ],
      [
        "Lead chemistry never settles",
        "bad",
        {
          aud: -5,
          wom: -4,
        },
      ],
    ];
  return pool.filter(() => r() < 0.38).slice(0, 3);
}

function productionPage() {
  const v = packageVars();
  shell(
    `<h1>Production outlook.</h1><p class="sub">These are the project-level signals created by the finished team.</p><div class="dashboard">${Object.entries(
      v,
    )
      .filter(([k]) => !["coord"].includes(k))
      .map(
        ([k, x]) =>
          `<div class="dash"><span class="mini">${k}</span><b>${Math.round(x)}</b><div class="meter"><span style="width:${clamp(x)}%"></span></div></div>`,
      )
      .join("")}</div><h2>Production events</h2>${
      S.events.length
        ? S.events
            .map(
              (e) =>
                `<div class="callout ${e[1]}"><b>${e[0]}</b><div class="sub">${Object.entries(
                  e[2],
                )
                  .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`)
                  .join(" · ")}</div></div>`,
            )
            .join("")
        : '<div class="callout">Production proceeds without a major disruption.</div>'
    }<div class="row" style="justify-content:space-between"><button class="btn" id="backHire">← Hiring</button><button class="btn primary" id="toMarketing">Marketing →</button></div>`,
  );
  $("#backHire").onclick = () => {
    S.screen = 1;
    render();
  };
  $("#toMarketing").onclick = () => {
    S.screen = 3;
    render();
  };
}

function marketingPage() {
  const descriptions = {
    "Prestige Campaign":
      "Build critical credibility and awards attention at the cost of broad opening-weekend reach.",
    "Mass Awareness":
      "The safest theatrical push: expensive visibility, strong reach, and dependable opening demand.",
    "Viral / Creator":
      "A volatile social campaign with stronger audience energy and a chance to break far beyond expectations.",
    "Fan Convention":
      "Targets committed genre audiences and creates strong early word of mouth.",
    "Celebrity Tour":
      "A balanced publicity campaign centered on your most recognizable talent.",
    "Streaming Push":
      "Trades some theatrical urgency for stronger long-tail and home-viewing value.",
    "Mystery Box":
      "Keeps the movie hidden and lets curiosity drive an unpredictable release.",
  };

  shell(
    `<h1>Choose the campaign.</h1>
    <p class="sub">Each campaign has a visible commercial identity. Select the strategy that best matches the movie you built.</p>
    <div class="choices campaignChoices">${Object.entries(MARKETING)
      .map(([name, campaign]) => {
        const tuning = BALANCE_TUNING.campaigns[name];
        const metrics = [
          ["Opening", campaign.opening],
          ["Critics", campaign.crit],
          ["WOM", campaign.wom],
          ["International", campaign.intl],
          ["Volatility", campaign.vol],
        ];
        return `<button class="choice campaignChoice ${S.marketing === name ? "selected" : ""}" data-market="${name}">
        <div class="campaignChoiceHead"><div><div class="mini">Campaign</div><h3>${name}</h3></div>${S.marketing === name ? '<span class="selectedCampaign">Selected</span>' : ""}</div>
        <p>${descriptions[name]}</p>
        <div class="campaignMetrics">${metrics.map(([label, value]) => `<span><small>${label}</small><b class="${value > 0 ? "positive" : value < 0 ? "negative" : ""}">${value > 0 ? "+" : ""}${value}</b></span>`).join("")}</div>
        <div class="campaignFooter"><span>Theatrical ×${tuning.grossMultiplier.toFixed(2)}</span><span>Awards ${tuning.awardScoreBonus >= 0 ? "+" : ""}${tuning.awardScoreBonus}</span></div>
      </button>`;
      })
      .join("")}</div>
    <div class="row" style="justify-content:space-between"><button class="btn" id="backProd">← Production</button><button class="btn warn" id="launch">Launch release</button></div>`,
  );

  $$("[data-market]").forEach(
    (button) =>
      (button.onclick = () => {
        S.marketing = button.dataset.market;
        render();
      }),
  );

  $("#backProd").onclick = () => {
    S.screen = 2;
    render();
  };

  $("#launch").onclick = async () => {
    const launchButton = $("#launch");
    launchButton.disabled = true;
    launchButton.textContent = "Loading yearly box office…";
    S.simulation = simulate();
    await loadCompetition();
    S.releaseRace = buildReleaseRace(S.simulation);
    S.releaseRaceCompleted = false;
    S.screen = 4;
    record("release", { world: S.simulation.world });
    render();
  };
}

let releaseRaceAnimationFrame = null;

function stopReleaseRaceAnimation() {
  if (releaseRaceAnimationFrame != null) {
    cancelAnimationFrame(releaseRaceAnimationFrame);
    releaseRaceAnimationFrame = null;
  }
}

function raceRandom(seedText) {
  let value = hash(String(seedText));
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function dateToWeek(dateString, year = S.project.year) {
  if (!dateString) return 0;
  const date = new Date(`${dateString}T00:00:00`);
  const beginning = new Date(year, 0, 1);
  return clamp(
    Math.floor((date - beginning) / (7 * 24 * 60 * 60 * 1000)),
    0,
    51,
  );
}

function projectReleaseDate() {
  const monthIndex = Math.max(0, MONTHS.indexOf(S.project.month));
  return new Date(S.project.year, monthIndex, 12);
}

function createWeeklyRun(total, startWeek, seed, openingAmount = null) {
  const random = raceRandom(seed);
  const weekly = Array(52).fill(0);
  const safeTotal = Math.max(0, safe(total));
  if (!safeTotal) return weekly;

  const opening = clamp(
    openingAmount == null
      ? safeTotal * (0.12 + random() * 0.12)
      : openingAmount,
    0,
    safeTotal * 0.72,
  );
  weekly[startWeek] = opening;

  const remainingWeights = [];
  let weightTotal = 0;
  const decayRate = 0.63 + random() * 0.14;

  for (let week = startWeek + 1; week < 52; week++) {
    const age = week - startWeek;
    const holidayBoost = [21, 22, 46, 47, 50, 51].includes(week) ? 1.12 : 1;
    const resurgence = random() < 0.035 ? 1.18 + random() * 0.3 : 1;
    const noise = 0.76 + random() * 0.48;
    const weight =
      Math.pow(decayRate, age - 1) * holidayBoost * resurgence * noise;
    remainingWeights.push([week, weight]);
    weightTotal += weight;
  }

  const remaining = Math.max(0, safeTotal - opening);
  for (const [week, weight] of remainingWeights) {
    weekly[week] = weightTotal ? (remaining * weight) / weightTotal : 0;
  }

  // Correct floating-point drift so week 52 lands on the exact final gross.
  const difference = safeTotal - weekly.reduce((sum, value) => sum + value, 0);
  weekly[51] += difference;
  return weekly;
}

function v38AnnualMarketBaseline(year) {
  const releaseYear = Math.round(safe(year, new Date().getFullYear()));
  if (releaseYear < 1950) return 18;
  if (releaseYear < 1960) return 32;
  if (releaseYear < 1970) return 55;
  if (releaseYear < 1980) return 95;
  if (releaseYear < 1990) return 170;
  if (releaseYear < 2000) return 300;
  if (releaseYear < 2010) return 500;
  if (releaseYear < 2020) return 740;
  if (releaseYear === 2020) return 360;
  if (releaseYear === 2021) return 520;
  return 680;
}

function fallbackCompetition(count = 9) {
  const random = raceRandom(`${S.runSeed}|fallback-competition`);
  const releaseYear = safe(S.arcade?.releaseYear, S.project.year);
  const marketBaseline = v38AnnualMarketBaseline(releaseYear);
  return Array.from({ length: count }, (_, index) => {
    const month = Math.floor(random() * 12);
    const day = 1 + Math.floor(random() * 24);
    const rankPosition = (count - index) / Math.max(1, count);
    const rankCurve = 0.56 + rankPosition * 0.94;
    const marketNoise = 0.88 + random() * 0.24;
    return {
      id: `estimated-rival-${index}`,
      title: `Market Rival ${index + 1}`,
      revenueM: Math.max(8, marketBaseline * rankCurve * marketNoise),
      releaseDate: `${releaseYear}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      estimated: true,
      marketBaselineM: marketBaseline,
    };
  });
}

function buildReleaseRace(simulation) {
  const realCompetitors = (S.competition || []).slice(0, 9);
  const competitors =
    realCompetitors.length >= 9
      ? realCompetitors
      : [
          ...realCompetitors,
          ...fallbackCompetition(9 - realCompetitors.length),
        ];
  const playerDate = projectReleaseDate();

  const movies = [
    ...competitors.map((movie) => ({ ...movie, player: false })),
    {
      id: "player",
      title: S.project.title,
      revenueM: simulation.world,
      releaseDate: playerDate.toISOString().slice(0, 10),
      player: true,
      estimated: false,
    },
  ];

  return movies.map((movie) => {
    const releaseWeek = dateToWeek(movie.releaseDate, S.project.year);
    const weekly = createWeeklyRun(
      movie.revenueM,
      releaseWeek,
      `${S.runSeed}|release-race|${movie.id}`,
      movie.player ? simulation.opening : null,
    );
    const cumulative = [];
    let running = 0;
    for (const amount of weekly) {
      running += amount;
      cumulative.push(running);
    }
    return { ...movie, releaseWeek, weekly, cumulative };
  });
}

function raceMonthForWeek(week) {
  const date = new Date(S.project.year, 0, 1 + week * 7);
  return date.getMonth();
}

function renderReleaseRaceWeek(race, week, simulation) {
  const rankings = race
    .map((movie) => ({ ...movie, current: movie.cumulative[week] || 0 }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 10);
  const maximum = Math.max(...rankings.map((movie) => movie.current), 1);
  const player = race.find((movie) => movie.player);
  const playerTotal = player?.cumulative[week] || 0;
  const playerReleased = week >= (player?.releaseWeek || 0);
  const monthIndex = raceMonthForWeek(week);

  if ($("#releaseWeek"))
    $("#releaseWeek").textContent = `Week ${week + 1} of 52`;
  if ($("#releaseMonth")) $("#releaseMonth").textContent = MONTHS[monthIndex];
  if ($("#animatedWorld"))
    $("#animatedWorld").textContent = moneyM(playerTotal);
  if ($("#animatedOpening"))
    $("#animatedOpening").textContent = playerReleased
      ? moneyM(simulation.opening)
      : "—";
  if ($("#animatedAudience"))
    $("#animatedAudience").textContent = playerReleased
      ? Math.round(simulation.audience)
      : "—";
  if ($("#animatedCritics"))
    $("#animatedCritics").textContent = playerReleased
      ? Math.round(simulation.critic)
      : "—";

  $$(".releaseMonth").forEach((month, index) =>
    month.classList.toggle("active", index === monthIndex),
  );

  if ($("#raceChart")) {
    $("#raceChart").innerHTML = rankings
      .map(
        (movie, index) => `
      <div class="raceRow ${movie.player ? "player" : ""} ${movie.current <= 0 ? "notReleased" : ""}">
        <span class="raceRank">${index + 1}</span>
        <span class="raceTitle">${movie.title}${movie.estimated ? "<small>estimated</small>" : ""}</span>
        <div class="raceTrack"><span style="width:${(movie.current / maximum) * 100}%"></span></div>
        <b>${movie.current > 0 ? moneyM(movie.current) : "Not released"}</b>
      </div>`,
      )
      .join("");
  }
}

function showReleaseConclusion(simulation) {
  S.releaseRaceCompleted = true;
  save();
  if ($("#releaseConclusion")) $("#releaseConclusion").hidden = false;
  if ($("#results")) $("#results").disabled = false;
  if ($("#skipReleaseRace"))
    $("#skipReleaseRace").textContent = "Final week shown";
}

function startReleaseRace(race, simulation) {
  stopReleaseRaceAnimation();

  if (S.releaseRaceCompleted) {
    renderReleaseRaceWeek(race, 51, simulation);
    showReleaseConclusion(simulation);
    return;
  }

  const duration = 24000;
  const startedAt = performance.now();
  let lastWeek = -1;

  const animate = (now) => {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const week = Math.min(51, Math.floor(progress * 52));
    if (week !== lastWeek) {
      lastWeek = week;
      renderReleaseRaceWeek(race, week, simulation);
    }

    if (progress < 1) {
      releaseRaceAnimationFrame = requestAnimationFrame(animate);
    } else {
      releaseRaceAnimationFrame = null;
      renderReleaseRaceWeek(race, 51, simulation);
      showReleaseConclusion(simulation);
    }
  };

  releaseRaceAnimationFrame = requestAnimationFrame(animate);
}

function releasePage() {
  const simulation = S.simulation || simulate();
  S.simulation = simulation;
  const race = S.releaseRace || buildReleaseRace(simulation);
  S.releaseRace = race;

  shell(`
    <div class="releaseRaceHeader">
      <div><div class="mini">Worldwide box-office year</div><h1>Release race.</h1><div class="releaseDateLine"><b id="releaseMonth">January</b><span id="releaseWeek">Week 1 of 52</span></div></div>
      <div class="animatedGross"><span>Your worldwide total</span><b id="animatedWorld">$0</b></div>
    </div>

    <div class="releaseMonths">${MONTHS.map((month) => `<span class="releaseMonth">${month.slice(0, 3)}</span>`).join("")}</div>

    <div class="kpis animatedKpis">
      <div class="kpi"><span class="mini">Opening</span><b id="animatedOpening">—</b></div>
      <div class="kpi"><span class="mini">Audience</span><b id="animatedAudience">—</b></div>
      <div class="kpi"><span class="mini">Critics</span><b id="animatedCritics">—</b></div>
      <div class="kpi"><span class="mini">Campaign</span><b class="campaignKpi">${S.marketing}</b></div>
    </div>

    <div id="raceChart" class="raceChart"></div>
    <div class="releaseDataNote">Real release dates and reported final grosses are used when TMDB provides them. Weekly pacing is estimated and normalized so every movie finishes at its correct final total.</div>

    <div class="releaseControls"><button class="btn" id="skipReleaseRace">Skip to final week</button></div>

    <div id="releaseConclusion" ${S.releaseRaceCompleted ? "" : "hidden"}>
      <div class="callout ${simulation.profit >= 0 ? "good" : "bad"}">
        <div class="outcomeRow"><div><div class="mini">Commercial result</div><b>${simulation.outcome}</b></div><span class="outcomeBadge outcome-${simulation.outcome.toLowerCase().replaceAll(" ", "-")}">${(simulation.roi * 100).toFixed(1)}% ROI</span></div>
        <div class="sub">Estimated profit: ${moneyM(simulation.profit)} · ${simulation.legs.toFixed(2)}× domestic legs${simulation.catastrophe ? " · Major production/release failure occurred" : ""}</div>
      </div>
      <button class="btn primary" id="results" ${S.releaseRaceCompleted ? "" : "disabled"}>Open results →</button>
    </div>
  `);

  renderReleaseRaceWeek(race, S.releaseRaceCompleted ? 51 : 0, simulation);
  startReleaseRace(race, simulation);

  $("#skipReleaseRace").onclick = () => {
    stopReleaseRaceAnimation();
    renderReleaseRaceWeek(race, 51, simulation);
    showReleaseConclusion(simulation);
  };

  $("#results").onclick = () => {
    stopReleaseRaceAnimation();
    S.screen = 5;
    render();
  };
}
async function loadCompetition() {
  if (S.competition.length) return;
  try {
    const data = await api("/discover/movie", {
      sort_by: "popularity.desc",
      "primary_release_date.gte": `${S.project.year}-01-01`,
      "primary_release_date.lte": `${S.project.year}-12-31`,
    });
    const rows = [];

    for (const movie of (data.results || []).slice(0, 24)) {
      try {
        const details = await api(`/movie/${movie.id}`);
        const referenceTitle = (S.reference?.title || "").toLowerCase();
        const releaseDate = details.release_date || movie.release_date || null;
        const releaseYear = Number(String(releaseDate || "").slice(0, 4));
        if (
          details.id !== S.reference?.id &&
          details.title.toLowerCase() !== referenceTitle &&
          (!releaseYear || releaseYear === Number(S.project.year)) &&
          details.revenue > 0
        ) {
          rows.push({
            id: details.id,
            title: details.title,
            revenueM: details.revenue / 1e6,
            releaseDate,
            estimated: false,
          });
        }
      } catch {}
    }

    S.competition = rows.sort((a, b) => b.revenueM - a.revenueM);
  } catch {}
}

function yearRank(s) {
  const available = S.competition.length > 0;
  const rows = [
    ...S.competition,
    {
      title: S.project.title,
      revenueM: s.world,
      player: true,
    },
  ].sort((a, b) => b.revenueM - a.revenueM);
  return {
    rows,
    rank: available ? rows.findIndex((x) => x.player) + 1 : null,
    available,
  };
}

function profitAtWorldwideGross(simulation, worldwide, overrides = {}) {
  const safeWorldwide = Math.max(0, safe(worldwide));
  const studioShare = safe(simulation.studioShare, 0.43);
  const backendRate =
    simulation.world > 0
      ? safe(simulation.backend) / simulation.world
      : safe(scaleEconomy().backendRate);

  const budget =
    overrides.budget == null ? safe(simulation.budget) : safe(overrides.budget);

  const marketing =
    overrides.marketing == null
      ? safe(simulation.marketing)
      : safe(overrides.marketing);

  const overhead =
    overrides.overhead == null
      ? safe(simulation.overhead)
      : safe(overrides.overhead);

  const overrun =
    overrides.overrun == null
      ? safe(simulation.overrun)
      : safe(overrides.overrun);

  const ancillary =
    overrides.ancillary == null
      ? safe(simulation.ancillary)
      : safe(overrides.ancillary);

  const backend = safeWorldwide * backendRate;
  const totalCost = budget + marketing + overhead + overrun + backend;
  const studioRevenue = safeWorldwide * studioShare + ancillary;

  return {
    worldwide: safeWorldwide,
    backend,
    totalCost,
    studioRevenue,
    profit: studioRevenue - totalCost,
  };
}

function buildWhyAnalysis(simulation, rank) {
  const worldwide = safe(simulation.world);
  const studioShare = safe(simulation.studioShare, 0.43);

  const theatricalRevenue =
    simulation.theatricalRevenue == null
      ? worldwide * studioShare
      : safe(simulation.theatricalRevenue);

  const distributionShare =
    simulation.distributionShare == null
      ? Math.max(0, worldwide - theatricalRevenue)
      : safe(simulation.distributionShare);

  const ancillary = safe(simulation.ancillary);

  const totalStudioRevenue =
    simulation.totalStudioRevenue == null
      ? theatricalRevenue + ancillary
      : safe(simulation.totalStudioRevenue);

  const backendRate =
    worldwide > 0
      ? safe(simulation.backend) / worldwide
      : safe(scaleEconomy().backendRate);

  const fixedCosts =
    safe(simulation.budget) +
    safe(simulation.marketing) +
    safe(simulation.overhead) +
    safe(simulation.overrun);

  const netReturnRate = Math.max(0.01, studioShare - backendRate);

  const breakEvenGross = Math.max(0, (fixedCosts - ancillary) / netReturnRate);

  const breakEvenGap = worldwide - breakEvenGross;

  const breakEvenProgress =
    breakEvenGross > 0
      ? clamp((worldwide / breakEvenGross) * 100, 0, 100)
      : 100;

  const campaignTuning = BALANCE_TUNING.campaigns[S.marketing] || {
    grossMultiplier: 1,
    ancillaryBudgetRate: 0,
  };

  const genreTuning = BALANCE_TUNING.genreEffects[S.project.genre] || {
    grossMultiplier: 1,
  };

  const openingBase =
    simulation.baseOpening == null
      ? safe(simulation.budget) * 0.16 + safe(simulation.marketing) * 0.3
      : safe(simulation.baseOpening);

  const openingSignal =
    simulation.openingSignalMultiplier == null
      ? safe(simulation.vars?.opening, 62) / 62
      : safe(simulation.openingSignalMultiplier, 1);

  const demandMultiplier =
    simulation.demandMultiplier == null
      ? safe(scaleEconomy().demandMultiplier, 1)
      : safe(simulation.demandMultiplier, 1);

  const executionMultiplier =
    simulation.executionMultiplier == null
      ? openingBase * openingSignal * demandMultiplier > 0
        ? safe(simulation.opening) /
          (openingBase * openingSignal * demandMultiplier)
        : 1
      : safe(simulation.executionMultiplier, 1);

  const auditionMultiplier =
    simulation.auditionGrossMultiplier == null
      ? 1
      : safe(simulation.auditionGrossMultiplier, 1);

  const internationalShare =
    simulation.internationalShare == null
      ? worldwide > 0
        ? clamp(1 - safe(simulation.domestic) / worldwide, 0, 0.9)
        : 0
      : safe(simulation.internationalShare);

  const helped = [];
  const hurt = [];

  if (simulation.audience >= 80) {
    helped.push(
      `An audience score of ${Math.round(simulation.audience)} strengthened weekly holds and home-viewing value.`,
    );
  } else if (simulation.audience < 60) {
    hurt.push(
      `An audience score of ${Math.round(simulation.audience)} weakened word of mouth and long-term revenue.`,
    );
  }

  if (simulation.critic >= 78) {
    helped.push(
      `A critic score of ${Math.round(simulation.critic)} supported prestige, awareness, and awards potential.`,
    );
  } else if (simulation.critic < 55) {
    hurt.push(
      `A critic score of ${Math.round(simulation.critic)} reduced critical momentum.`,
    );
  }

  if (simulation.legs >= 3.1) {
    helped.push(
      `${simulation.legs.toFixed(2)}× domestic legs show that the movie held well after opening.`,
    );
  } else if (simulation.legs < 2.25) {
    hurt.push(
      `${simulation.legs.toFixed(2)}× domestic legs indicate a fast post-opening decline.`,
    );
  }

  if (simulation.overrun <= 0.25) {
    helped.push("The production avoided meaningful budget overruns.");
  } else {
    hurt.push(
      `${moneyM(simulation.overrun)} in overruns raised the break-even point.`,
    );
  }

  if (simulation.catastrophe) {
    hurt.push(
      "A major production or release failure severely reduced execution.",
    );
  }

  if (simulation.weakBreakout) {
    helped.push("The release received a rare breakout-performance boost.");
  }

  if (simulation.starStumble) {
    hurt.push(
      "The high-profile package suffered a coordination or expectation stumble.",
    );
  }

  if (campaignTuning.grossMultiplier > 1.02) {
    helped.push(`${S.marketing} increased theatrical reach.`);
  } else if (campaignTuning.grossMultiplier < 0.98) {
    hurt.push(
      `${S.marketing} traded theatrical urgency for another strategic benefit.`,
    );
  }

  if (genreTuning.grossMultiplier > 1.03) {
    helped.push(`${S.project.genre} carries above-average commercial demand.`);
  } else if (genreTuning.grossMultiplier < 0.92) {
    hurt.push(`${S.project.genre} has a smaller default theatrical market.`);
  }

  const cameoOutcomes = Object.values(S.cameoOutcomes || {});
  const successfulCameos = cameoOutcomes.filter(
    (cameo) => cameo.successful,
  ).length;
  const failedCameos = cameoOutcomes.length - successfulCameos;

  if (successfulCameos) {
    helped.push(
      `${successfulCameos} cameo${successfulCameos === 1 ? "" : "s"} connected with audiences.`,
    );
  }

  if (failedCameos) {
    hurt.push(
      `${failedCameos} cameo${failedCameos === 1 ? "" : "s"} felt forced.`,
    );
  }

  if (worldwide < breakEvenGross) {
    hurt.push(
      `Worldwide gross finished ${moneyM(breakEvenGross - worldwide)} below the estimated break-even level.`,
    );
  } else {
    helped.push(
      `Worldwide gross cleared the estimated break-even level by ${moneyM(worldwide - breakEvenGross)}.`,
    );
  }

  if (simulation.marketing >= simulation.budget * 0.28) {
    hurt.push(
      `${moneyM(simulation.marketing)} of marketing created a substantial fixed cost before profit.`,
    );
  }

  if (studioShare < 0.43) {
    hurt.push(
      `The studio retained about ${(studioShare * 100).toFixed(1)}% of worldwide ticket sales.`,
    );
  }

  if (!Number.isFinite(rank)) {
    hurt.push(
      "Release-year rank is unavailable because competition data could not be loaded.",
    );
  } else if (rank > 10) {
    hurt.push(`The movie finished #${rank} in a competitive release year.`);
  } else {
    helped.push(`The movie finished #${rank} in its release year.`);
  }

  if (!helped.length) {
    helped.push(
      "The cast and crew package provided some positive support relative to neutral hires.",
    );
  }

  if (!hurt.length) {
    hurt.push(
      "No single major weakness dominated; the result came from several smaller pressures.",
    );
  }

  const scenarios = [];

  const strongerOpening = profitAtWorldwideGross(simulation, worldwide * 1.1);

  scenarios.push({
    label: "10% stronger theatrical demand",
    description: "Models a stronger opening and proportional worldwide finish.",
    profit: strongerOpening.profit,
    change: strongerOpening.profit - simulation.profit,
  });

  const lowerBudget = profitAtWorldwideGross(simulation, worldwide, {
    budget: Math.max(0, simulation.budget - 5),
  });

  scenarios.push({
    label: "$5M lower production budget",
    description:
      "Keeps release performance unchanged while reducing production cost.",
    profit: lowerBudget.profit,
    change: lowerBudget.profit - simulation.profit,
  });

  const targetAudience = 70;
  const currentAudience = Math.max(1, safe(simulation.audience));

  const audienceWorld =
    worldwide * Math.pow((targetAudience + 80) / (currentAudience + 80), 0.65);

  const audienceAncillary =
    simulation.budget *
    (0.08 + targetAudience / 650 + safe(campaignTuning.ancillaryBudgetRate));

  const averageAudienceScenario = profitAtWorldwideGross(
    simulation,
    audienceWorld,
    {
      ancillary: audienceAncillary,
    },
  );

  scenarios.push({
    label: "Audience score normalized to 70",
    description: "Shows how much the actual audience response helped or hurt.",
    profit: averageAudienceScenario.profit,
    change: averageAudienceScenario.profit - simulation.profit,
  });

  if (S.marketing !== "Mass Awareness") {
    const massCampaign = BALANCE_TUNING.campaigns["Mass Awareness"];
    const currentOpening = safe(MARKETING[S.marketing]?.opening);
    const massOpening = safe(MARKETING["Mass Awareness"]?.opening);

    const campaignFactor =
      (massCampaign.grossMultiplier /
        Math.max(0.01, campaignTuning.grossMultiplier)) *
      (1 + (massOpening - currentOpening) / 100);

    const massWorld = worldwide * campaignFactor;

    const massAncillary =
      simulation.budget *
      (0.08 +
        simulation.audience / 650 +
        safe(massCampaign.ancillaryBudgetRate));

    const massScenario = profitAtWorldwideGross(simulation, massWorld, {
      ancillary: massAncillary,
    });

    scenarios.push({
      label: "Mass Awareness campaign",
      description:
        "Estimates this same movie using that campaign’s theatrical profile.",
      profit: massScenario.profit,
      change: massScenario.profit - simulation.profit,
    });
  }

  if (cameoOutcomes.length) {
    const cameoOpening = cameoOutcomes.reduce(
      (sum, cameo) => sum + safe(cameo.opening),
      0,
    );

    const cameoAudience = cameoOutcomes.reduce(
      (sum, cameo) => sum + safe(cameo.audience),
      0,
    );

    const cameoWom = cameoOutcomes.reduce(
      (sum, cameo) => sum + safe(cameo.wom),
      0,
    );

    const cameoFactor = Math.max(
      0.72,
      1 + cameoOpening / 100 + cameoAudience / 220 + cameoWom / 250,
    );

    const noCameo = profitAtWorldwideGross(simulation, worldwide / cameoFactor);

    scenarios.push({
      label: "Without cameo effects",
      description:
        "Estimates the release after removing the selected cameo lift or penalty.",
      profit: noCameo.profit,
      change: noCameo.profit - simulation.profit,
    });
  }

  return {
    worldwide,
    studioShare,
    theatricalRevenue,
    distributionShare,
    ancillary,
    totalStudioRevenue,
    totalCost: safe(simulation.totalCost),
    breakEvenGross,
    breakEvenGap,
    breakEvenProgress,
    backendRate,
    openingBase,
    openingSignal,
    demandMultiplier,
    executionMultiplier,
    campaignGrossMultiplier:
      simulation.campaignGrossMultiplier == null
        ? safe(campaignTuning.grossMultiplier, 1)
        : safe(simulation.campaignGrossMultiplier, 1),
    genreGrossMultiplier:
      simulation.genreGrossMultiplier == null
        ? safe(genreTuning.grossMultiplier, 1)
        : safe(simulation.genreGrossMultiplier, 1),
    auditionMultiplier,
    internationalShare,
    helped: helped.slice(0, 6),
    hurt: hurt.slice(0, 6),
    scenarios: scenarios.slice(0, 5),
  };
}

function moneyWaterfallRow(label, value, type = "") {
  const prefix = value > 0 ? "+" : "";

  return `
    <div class="moneyWaterfallRow ${type}">
      <span>${label}</span>
      <b>${prefix}${moneyM(value)}</b>
    </div>
  `;
}

function deltaText(value) {
  return `${value >= 0 ? "+" : ""}${moneyM(value)}`;
}

function resultsPage() {
  recordCompletedCareerRun();

  const simulation = S.simulation;
  const { rows, rank } = yearRank(simulation);
  const awards = simulation.awards;

  const totalWins =
    safe(awards.filmWins) +
    safe(awards.actingWins) +
    safe(awards.technicalWins);

  const why = buildWhyAnalysis(simulation, rank);
  let body = "";

  if (S.endTab === "results") {
    const referenceDifference = S.reference?.revenueM
      ? simulation.world - S.reference.revenueM
      : null;

    body = `
      <div class="resultsGrid">
        <div class="resultCard">
          <div class="mini">Worldwide</div>
          <div class="metric">${moneyM(simulation.world)}</div>
        </div>
        <div class="resultCard">
          <div class="mini">Year rank</div>
          <div class="metric">#${rank}</div>
        </div>
        <div class="resultCard">
          <div class="mini">Commercial result</div>
          <div class="metric smallMetric">${simulation.outcome || "—"}</div>
        </div>
        <div class="resultCard">
          <div class="mini">Awards won</div>
          <div class="metric">${totalWins}</div>
        </div>
      </div>

      <h2 style="margin-top:18px">Studio economics</h2>
      <div class="economicsGrid">
        <div class="resultCard"><div class="mini">Production</div><b>${moneyM(simulation.budget)}</b></div>
        <div class="resultCard"><div class="mini">Marketing</div><b>${moneyM(simulation.marketing)}</b></div>
        <div class="resultCard"><div class="mini">Overhead</div><b>${moneyM(simulation.overhead || 0)}</b></div>
        <div class="resultCard"><div class="mini">Backend</div><b>${moneyM(simulation.backend || 0)}</b></div>
        <div class="resultCard"><div class="mini">Overruns</div><b>${moneyM(simulation.overrun || 0)}</b></div>
        <div class="resultCard"><div class="mini">Profit</div><b class="${simulation.profit >= 0 ? "positive" : "negative"}">${moneyM(simulation.profit)}</b></div>
        <div class="resultCard"><div class="mini">Studio revenue</div><b>${moneyM(why.totalStudioRevenue)}</b></div>
        <div class="resultCard"><div class="mini">Total cost</div><b>${moneyM(simulation.totalCost)}</b></div>
        <div class="resultCard"><div class="mini">Break-even gross</div><b>${moneyM(why.breakEvenGross)}</b></div>
      </div>

      <div class="economicsExplainer">
        Worldwide box office is ticket sales, not money the studio keeps.
        This run retained about <b>${(why.studioShare * 100).toFixed(1)}%</b>
        of theatrical gross before ancillary revenue and costs.
      </div>

      ${
        S.reference
          ? `
        <h2 style="margin-top:18px">Your version vs real movie</h2>
        <div class="comparisonGrid">
          <div class="comparisonCard">
            <div class="mini">Real movie</div>
            <h3>${S.reference.title}</h3>
            <div class="compareLine"><span>Worldwide</span><b>${S.reference.revenueM ? moneyM(S.reference.revenueM) : "Unavailable"}</b></div>
            <div class="compareLine"><span>Audience baseline</span><b>${Math.round(S.reference.vote || 0)}</b></div>
          </div>

          <div class="comparisonCard">
            <div class="mini">Your version</div>
            <h3>${S.project.title}</h3>
            <div class="compareLine"><span>Worldwide</span><b>${moneyM(simulation.world)}</b></div>
            <div class="compareLine"><span>Audience</span><b>${Math.round(simulation.audience)}</b></div>
            <div class="compareLine">
              <span>${referenceDifference >= 0 ? "Ahead of the original by" : "Behind the original by"}</span>
              <b class="${referenceDifference >= 0 ? "positive" : "negative"}">
                ${referenceDifference == null ? "—" : moneyM(Math.abs(referenceDifference))}
              </b>
            </div>
            <div class="referenceDifferenceNote">
              This compares worldwide grosses. It is not the amount your studio made or lost.
            </div>
          </div>
        </div>
      `
          : ""
      }

      <h2 style="margin-top:18px">Year leaderboard</h2>
      <div class="leaderboard">
        ${leaderWindow(rows, rank - 1)
          .map((item) =>
            item.ellipsis
              ? '<div class="callout">•••</div>'
              : `
            <div class="leader ${item.player ? "player" : ""}">
              <b>#${rows.indexOf(item) + 1}</b>
              <span>${item.title}${item.player ? " · Your version" : ""}</span>
              <b>${moneyM(item.revenueM)}</b>
            </div>
          `,
          )
          .join("")}
      </div>
    `;
  }

  if (S.endTab === "why") {
    const profitHeadline =
      simulation.profit >= 0
        ? `Why this movie made ${moneyM(simulation.profit)}`
        : `Why this movie lost ${moneyM(Math.abs(simulation.profit))}`;

    const breakEvenMessage =
      why.breakEvenGap >= 0
        ? `The movie cleared break-even by ${moneyM(why.breakEvenGap)} worldwide.`
        : `The movie needed about ${moneyM(Math.abs(why.breakEvenGap))} more worldwide to break even.`;

    body = `
      <section class="whyHero ${simulation.profit >= 0 ? "profit" : "loss"}">
        <div>
          <div class="mini">Financial explanation</div>
          <h2>${profitHeadline}</h2>
          <p>
            The movie sold ${moneyM(simulation.world)} in tickets, but the
            studio retained ${moneyM(why.theatricalRevenue)} of that theatrical
            gross. Ancillary revenue raised total studio revenue to
            ${moneyM(why.totalStudioRevenue)}, compared with
            ${moneyM(simulation.totalCost)} in total costs.
          </p>
        </div>

        <div class="whyProfitNumber ${simulation.profit >= 0 ? "positive" : "negative"}">
          ${simulation.profit >= 0 ? "+" : ""}${moneyM(simulation.profit)}
        </div>
      </section>

      <div class="whyEconomicsGrid">
        <section class="whyPanel">
          <h3>Where the money went</h3>
          <div class="moneyWaterfall">
            ${moneyWaterfallRow("Worldwide ticket sales", why.worldwide, "gross")}
            ${moneyWaterfallRow("Theaters and distribution", -why.distributionShare, "expense")}
            ${moneyWaterfallRow("Studio theatrical revenue", why.theatricalRevenue, "subtotal")}
            ${moneyWaterfallRow("Ancillary / home-viewing value", why.ancillary, "income")}
            ${moneyWaterfallRow("Total studio revenue", why.totalStudioRevenue, "total")}
            <div class="moneyWaterfallDivider"></div>
            ${moneyWaterfallRow("Production", -safe(simulation.budget), "expense")}
            ${moneyWaterfallRow("Marketing", -safe(simulation.marketing), "expense")}
            ${moneyWaterfallRow("Overhead", -safe(simulation.overhead), "expense")}
            ${moneyWaterfallRow("Backend participation", -safe(simulation.backend), "expense")}
            ${moneyWaterfallRow("Overruns", -safe(simulation.overrun), "expense")}
            ${moneyWaterfallRow("Final studio profit", simulation.profit, "final")}
          </div>
        </section>

        <section class="whyPanel">
          <h3>Break-even progress</h3>
          <div class="breakEvenNumbers">
            <div><span>Your gross</span><b>${moneyM(simulation.world)}</b></div>
            <div><span>Estimated break-even</span><b>${moneyM(why.breakEvenGross)}</b></div>
            <div>
              <span>${why.breakEvenGap >= 0 ? "Above break-even" : "Shortfall"}</span>
              <b class="${why.breakEvenGap >= 0 ? "positive" : "negative"}">${moneyM(Math.abs(why.breakEvenGap))}</b>
            </div>
          </div>

          <div class="breakEvenTrack">
            <span style="width:${why.breakEvenProgress}%"></span>
          </div>

          <p class="breakEvenMessage">${breakEvenMessage}</p>

          <div class="economicsTerms">
            <div><span>Studio ticket share</span><b>${(why.studioShare * 100).toFixed(1)}%</b></div>
            <div><span>Gross / production budget</span><b>${(simulation.world / Math.max(1, simulation.budget)).toFixed(2)}×</b></div>
            <div><span>Profit margin on cost</span><b class="${simulation.profit >= 0 ? "positive" : "negative"}">${((simulation.profit / Math.max(1, simulation.totalCost)) * 100).toFixed(1)}%</b></div>
            <div><span>International share</span><b>${(why.internationalShare * 100).toFixed(1)}%</b></div>
          </div>
        </section>
      </div>

      <div class="whyHelpHurt">
        <section class="whyPanel">
          <h3>What helped</h3>
          <ul class="whyList good">
            ${why.helped.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </section>

        <section class="whyPanel">
          <h3>What hurt</h3>
          <ul class="whyList bad">
            ${why.hurt.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </section>
      </div>

      <section class="whyPanel">
        <h3>How the worldwide gross was built</h3>
        <p class="sub">
          These are multipliers and release signals, not separate piles of money.
        </p>

        <div class="boxOfficeBuild">
          <div><span>Scale-and-marketing opening base</span><b>${moneyM(why.openingBase)}</b></div>
          <div><span>Talent / opening signal</span><b>${why.openingSignal.toFixed(2)}×</b></div>
          <div><span>Scale demand</span><b>${why.demandMultiplier.toFixed(2)}×</b></div>
          <div><span>Execution roll</span><b class="${why.executionMultiplier >= 1 ? "positive" : "negative"}">${why.executionMultiplier.toFixed(2)}×</b></div>
          <div><span>Final opening weekend</span><b>${moneyM(simulation.opening)}</b></div>
          <div><span>Domestic legs</span><b>${simulation.legs.toFixed(2)}×</b></div>
          <div><span>Domestic total</span><b>${moneyM(simulation.domestic)}</b></div>
          <div><span>International share</span><b>${(why.internationalShare * 100).toFixed(1)}%</b></div>
          <div><span>${S.marketing} campaign</span><b>${why.campaignGrossMultiplier.toFixed(2)}×</b></div>
          <div><span>${S.project.genre} market profile</span><b>${why.genreGrossMultiplier.toFixed(2)}×</b></div>
          <div><span>Audition effect</span><b class="${why.auditionMultiplier >= 1 ? "positive" : "negative"}">${why.auditionMultiplier.toFixed(3)}×</b></div>
          <div class="boxOfficeBuildTotal"><span>Worldwide total</span><b>${moneyM(simulation.world)}</b></div>
        </div>
      </section>

      <section class="whyPanel">
        <h3>What would have changed the result?</h3>
        <p class="sub">
          These are controlled estimates using the completed movie as the baseline.
        </p>

        <div class="counterfactualGrid">
          ${why.scenarios
            .map(
              (scenario) => `
            <div class="counterfactualCard">
              <b>${scenario.label}</b>
              <p>${scenario.description}</p>
              <div class="counterfactualResult">
                <span>Estimated profit</span>
                <b class="${scenario.profit >= 0 ? "positive" : "negative"}">${moneyM(scenario.profit)}</b>
              </div>
              <div class="counterfactualDelta ${scenario.change >= 0 ? "positive" : "negative"}">
                ${deltaText(scenario.change)} versus actual
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </section>

      <section class="whyPanel">
        <h3>Cast and crew contribution matrix</h3>
        <p class="sub">
          A Project Impact Score measures improvement relative to a neutral hire.
          It is not millions of dollars and does not guarantee profit.
        </p>

        <div class="impactGrid">
          ${simulation.impacts
            .map(
              (impact) => `
            <div class="impactPerson">
              <div class="slotTop">
                <div>
                  <div class="mini">${impact.slot}</div>
                  <b>${impact.name}</b>
                  ${impact.character ? `<div class="playing">${impact.character}</div>` : ""}
                </div>

                <div class="impactScore">
                  <span>Project impact</span>
                  <b class="${impact.total >= 0 ? "positive" : "negative"}">
                    ${impact.total >= 0 ? "+" : ""}${impact.total}
                  </b>
                </div>
              </div>

              <div class="stats">
                <div class="stat">Opening <b>${impact.opening >= 0 ? "+" : ""}${impact.opening}</b></div>
                <div class="stat">Audience <b>${impact.audience >= 0 ? "+" : ""}${impact.audience}</b></div>
                <div class="stat">Critics <b>${impact.critics >= 0 ? "+" : ""}${impact.critics}</b></div>
                <div class="stat">Stability <b>${impact.stability >= 0 ? "+" : ""}${impact.stability}</b></div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </section>

      ${
        Object.keys(S.cameoOutcomes || {}).length
          ? `
        <section class="whyPanel">
          <h3>Cameo outcomes</h3>
          <div class="impactGrid">
            ${Object.entries(S.cameoOutcomes)
              .map(
                ([slot, cameo]) => `
              <div class="impactPerson">
                <div class="mini">${slot}</div>
                <b>${cameo.actorName} as ${cameo.character}</b>
                <div class="playing">${cameo.title}</div>
                <div class="callout ${cameo.successful ? "good" : "bad"}">
                  ${cameo.successful ? "The cameo connected with audiences." : "The cameo felt forced."}
                </div>
                <div class="stats">
                  <div class="stat">Opening <b>${cameo.opening >= 0 ? "+" : ""}${cameo.opening.toFixed(1)}</b></div>
                  <div class="stat">Audience <b>${cameo.audience >= 0 ? "+" : ""}${cameo.audience.toFixed(1)}</b></div>
                  <div class="stat">Critics <b>${cameo.critic >= 0 ? "+" : ""}${cameo.critic.toFixed(1)}</b></div>
                  <div class="stat">WOM <b>${cameo.wom >= 0 ? "+" : ""}${cameo.wom.toFixed(1)}</b></div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </section>
      `
          : ""
      }

      <section class="whyPanel">
        <h3>Awards explanation</h3>
        <div class="awardExplanationGrid">
          <div><span>Contender status</span><b>${awards.contender ? "Yes" : "No"}</b></div>
          <div><span>Award score</span><b>${awards.awardScore || 0}</b></div>
          <div><span>Competition</span><b>${awards.competition || 0}</b></div>
          <div><span>Total nominations</span><b>${safe(awards.filmNoms) + safe(awards.actingNoms) + safe(awards.technicalNoms)}</b></div>
          <div><span>Total wins</span><b>${totalWins}</b></div>
        </div>
        <p class="sub">
          Strong reviews and prestige increase awards probability, but simulated
          competition can still leave a contender without nominations.
        </p>
      </section>
    `;
  }

  if (S.endTab === "awards") {
    body = `
      <div class="callout ${awards.contender ? "good" : ""}">
        <b>${awards.contender ? "Awards contender" : "Outside the awards conversation"}</b>
        <div class="sub">Contender status does not guarantee a nomination.</div>
      </div>

      <div class="awardsGrid">
        <div class="awardStat"><span class="mini">Film nominations</span><b>${awards.filmNoms}</b></div>
        <div class="awardStat"><span class="mini">Film wins</span><b>${awards.filmWins}</b></div>
        <div class="awardStat"><span class="mini">Best Picture noms</span><b>${awards.pictureNoms || 0}</b></div>
        <div class="awardStat"><span class="mini">Acting nominations</span><b>${awards.actingNoms}</b></div>
        <div class="awardStat"><span class="mini">Acting wins</span><b>${awards.actingWins}</b></div>
        <div class="awardStat"><span class="mini">Technical nominations</span><b>${awards.technicalNoms || 0}</b></div>
        <div class="awardStat"><span class="mini">Technical wins</span><b>${awards.technicalWins || 0}</b></div>
        <div class="awardStat"><span class="mini">Award score</span><b>${awards.awardScore || 0}</b></div>
      </div>

      <h2 style="margin-top:18px">Ceremonies</h2>
      ${awards.shows
        .map(
          (show) => `
        <div class="callout">
          <b>${show.name}</b>
          <div class="sub">${show.nominations} nominations · ${show.wins} wins</div>
        </div>
      `,
        )
        .join("")}

      <div class="card">
        <h2>Share your run</h2>
        <p class="sub">
          Download a clean summary image with project, box office, rank, awards,
          and full team.
        </p>
        <button class="btn primary" id="download">Download PNG</button>
      </div>
    `;
  }

  shell(`
    <h1>Studio results.</h1>
    <div class="tabs">
      ${[
        ["results", "Results"],
        ["why", "Why"],
        ["awards", "Awards & Share"],
      ]
        .map(
          ([id, label]) => `
        <button class="tab ${S.endTab === id ? "active" : ""}" data-endtab="${id}">
          ${label}
        </button>
      `,
        )
        .join("")}
    </div>
    ${body}
  `);

  $$("[data-endtab]").forEach((button) => {
    button.onclick = () => {
      S.endTab = button.dataset.endtab;
      render();
    };
  });

  if ($("#download")) {
    $("#download").onclick = downloadSummary;
  }
}

function leaderWindow(rows, idx) {
  if (idx < 8) return rows.slice(0, 10);
  return [
    ...rows.slice(0, 5),
    {
      ellipsis: true,
    },
    ...rows.slice(Math.max(5, idx - 2), idx + 3),
  ];
}

function downloadSummary() {
  const s = S.simulation,
    { rank } = yearRank(s),
    wins =
      safe(s.awards.filmWins) +
      safe(s.awards.actingWins) +
      safe(s.awards.technicalWins),
    c = document.createElement("canvas");
  c.width = 1600;
  c.height = 2000;
  const x = c.getContext("2d"),
    g = x.createLinearGradient(0, 0, 1600, 2000);
  g.addColorStop(0, "#2b1942");
  g.addColorStop(1, "#09080d");
  x.fillStyle = g;
  x.fillRect(0, 0, 1600, 2000);
  x.fillStyle = "#ffd064";
  x.font = "900 48px Arial";
  x.fillText("GREENLIT", 80, 90);
  x.fillStyle = "white";
  x.font = "900 76px Arial";
  x.fillText(S.project.title.slice(0, 32), 80, 190);
  x.fillStyle = "#aaa0b8";
  x.font = "28px Arial";
  x.fillText(
    `${v28ReleaseYear()} • ${S.project.genre} • ${S.project.scale}`,
    80,
    240,
  );
  const stats = [
    ["WORLDWIDE", moneyM(s.world)],
    ["YEAR RANK", Number.isFinite(rank) ? `#${rank}` : "Unavailable"],
    ["AWARDS WON", String(wins)],
    ["AUDIENCE", Math.round(s.audience)],
    ["CRITICS", Math.round(s.critic)],
    ["PROFIT", moneyM(s.profit)],
  ];
  stats.forEach((a, i) => {
    const col = i % 3,
      row = Math.floor(i / 3),
      px = 80 + col * 480,
      py = 300 + row * 145;
    x.fillStyle = "#17131f";
    x.fillRect(px, py, 445, 120);
    x.fillStyle = "#aaa0b8";
    x.font = "20px Arial";
    x.fillText(a[0], px + 22, py + 34);
    x.fillStyle = "#ffd064";
    x.font = "900 40px Arial";
    x.fillText(String(a[1]), px + 22, py + 84);
  });
  let y = 640;
  x.fillStyle = "white";
  x.font = "900 36px Arial";
  x.fillText("STAFF & CAST", 80, y);
  y += 40;
  slotList().forEach((slot, i) => {
    const p = person(S.roster[slot]);
    if (!p) return;
    x.fillStyle = i % 2 ? "#191521" : "#141119";
    x.fillRect(80, y, 1440, 76);
    x.fillStyle = "white";
    x.font = "900 24px Arial";
    x.fillText(p.name, 105, y + 31);
    x.fillStyle = "#aaa0b8";
    x.font = "18px Arial";
    x.fillText(
      `${slot}${roleName(slot) ? ` • ${roleName(slot)}` : ""}`,
      105,
      y + 57,
    );
    y += 82;
  });
  x.fillStyle = "#aaa0b8";
  x.font = "18px Arial";
  x.fillText(`Seed: ${S.runSeed}`, 80, 1940);
  c.toBlob((blob) => {
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = `greenlit-${S.project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }, "image/png");
}

// =============================================================================
// DATA SETTINGS AND MODAL ENTRY POINTS
// =============================================================================
function dataModal() {
  const saveBytes = new Blob([JSON.stringify(makeSaveState())]).size;
  const activeMode = dataMode();
  const dataStatus = V37_DATA?.getStatus?.() || {
    mode: token() ? "live" : "bundled",
    label: token() ? "TMDB configured" : "Bundled catalog",
    message: token()
      ? "TMDB is configured."
      : "The bundled offline catalog is active.",
  };
  modal(
    `<h2>Data connections</h2>
      <p class="sub">Choose how GREENLIT loads movies and people. Hybrid prioritizes live ages and artwork while keeping the bundled database available if TMDB is slow or unavailable.</p>
      <div class="v37ConnectionCard ${arcadeEsc(dataStatus.mode)}">
        <span class="v37SourceDot"></span>
        <div><small>Current source</small><b>${arcadeEsc(dataStatus.label)}</b><p>${arcadeEsc(dataStatus.message)}</p></div>
      </div>
      <div class="callout good"><b>Optimized V38 save:</b> ${(saveBytes / 1024).toFixed(1)} KB. Loading owners and temporary candidate pools are never saved.</div>
      <div class="v38DataModes" role="radiogroup" aria-label="Global data mode">
        <label><input type="radio" name="dataMode" value="hybrid" ${activeMode === "hybrid" ? "checked" : ""}><span><b>Hybrid · recommended</b><small>TMDB first for ages and banners; cached and bundled data prevent freezes.</small></span></label>
        <label><input type="radio" name="dataMode" value="offline" ${activeMode === "offline" ? "checked" : ""}><span><b>Offline only</b><small>No live requests. Uses cached media when available, then designed bundled fallbacks.</small></span></label>
        <label><input type="radio" name="dataMode" value="tmdb" ${activeMode === "tmdb" ? "checked" : ""}><span><b>TMDB only</b><small>Never uses bundled records. A working token and connection are required.</small></span></label>
      </div>
      ${activeMode === "tmdb" && !token() ? '<div class="callout warn"><b>TMDB-only mode needs a connection.</b> Add a token before searching for movies or people.</div>' : ""}
      <label>${activeMode === "tmdb" ? "Required" : "Optional"} TMDB token or API key</label>
      <input id="key" type="password" value="${arcadeEsc(token())}" placeholder="Leave blank to use the bundled catalog">
      <div class="v37Attribution"><b>TMDB attribution</b><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">The Movie Database</a></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="saveKey">Save connection</button></div>`,
  );
  $("#saveKey").onclick = () => {
    localStorage.setItem("tmdb-token", $("#key").value.trim());
    const selectedMode = document.querySelector('input[name="dataMode"]:checked')?.value || "hybrid";
    localStorage.setItem(DATA_MODE_STORAGE_KEY, selectedMode);
    localStorage.removeItem(LEGACY_OFFLINE_DATABASE_STORAGE_KEY);
    V37_DATA?.setDataMode?.(selectedMode);
    V38_PORTRAITS?.clear?.();
    closeModal();
    render();
  };
}

// =============================================================================
// PLAYER ANALYTICS — CAREER HISTORY
// =============================================================================

const PLAYER_ANALYTICS_STORAGE_KEY = "greenlit-v38-player-analytics";
const PLAYER_ANALYTICS_RUN_LIMIT = 250;

function createCareer(name = "Studio Career") {
  return {
    id: `career-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: Date.now(),
    runs: [],
  };
}

function defaultPlayerAnalyticsStore() {
  const career = createCareer("Studio Career");
  return {
    version: 1,
    activeCareerId: career.id,
    careers: [career],
  };
}

function loadPlayerAnalyticsStore() {
  try {
    const raw = localStorage.getItem(PLAYER_ANALYTICS_STORAGE_KEY);
    if (!raw) return defaultPlayerAnalyticsStore();

    const parsed = JSON.parse(raw);
    const careers = Array.isArray(parsed.careers)
      ? parsed.careers.filter((career) => career && Array.isArray(career.runs))
      : [];

    if (!careers.length) return defaultPlayerAnalyticsStore();

    return {
      version: 1,
      activeCareerId: careers.some(
        (career) => career.id === parsed.activeCareerId,
      )
        ? parsed.activeCareerId
        : careers[0].id,
      careers,
    };
  } catch {
    return defaultPlayerAnalyticsStore();
  }
}

function savePlayerAnalyticsStore(store) {
  const compactStore = {
    ...store,
    careers: (store?.careers || []).map((career) => ({
      ...career,
      runs: (career.runs || []).slice(-PLAYER_ANALYTICS_RUN_LIMIT),
    })),
  };

  try {
    localStorage.setItem(
      PLAYER_ANALYTICS_STORAGE_KEY,
      JSON.stringify(compactStore),
    );
    return true;
  } catch (error) {
    // Career analytics are useful, but they must never block the Results page.
    // The current run remains available through the regular save payload.
    console.warn(
      "GREENLIT career history was not saved because browser storage is full.",
      error,
    );
    return false;
  }
}

function activePlayerCareer(store = loadPlayerAnalyticsStore()) {
  return (
    store.careers.find((career) => career.id === store.activeCareerId) ||
    store.careers[0]
  );
}

function playerCareerRunSnapshot() {
  if (!S.simulation || !S.runSeed) return null;

  const simulation = S.simulation;
  const rank = yearRank(simulation).rank;
  const awards = simulation.awards || {};
  const awardWins =
    safe(awards.filmWins) +
    safe(awards.actingWins) +
    safe(awards.technicalWins);
  const awardNominations =
    safe(awards.filmNoms) +
    safe(awards.actingNoms) +
    safe(awards.technicalNoms);

  return {
    id: S.runSeed,
    completedAt: Date.now(),
    title: S.project.title,
    referenceTitle: S.reference?.title || null,
    referenceGross: safe(S.reference?.revenueM, 0),
    beatReference:
      safe(S.reference?.revenueM, 0) > 0
        ? simulation.world > S.reference.revenueM
        : null,
    year: v28ReleaseYear(),
    genre: S.project.genre,
    scale: S.project.scale,
    type: S.project.type,
    rating: S.project.rating,
    runtime: S.project.runtime,
    mode: S.mode,
    marketing: S.marketing,
    worldwide: simulation.world,
    profit: simulation.profit,
    roi: simulation.roi,
    outcome: simulation.outcome,
    rank,
    opening: simulation.opening,
    audience: simulation.audience,
    critics: simulation.critic,
    packageStrength: simulation.packageStrength,
    catastrophe: Boolean(simulation.catastrophe),
    awardsContender: Boolean(awards.contender),
    awardWins,
    awardNominations,
    pictureNominations: safe(awards.pictureNoms),
    cameoCount: Object.keys(S.cameos || {}).length,
    auditionCount: v24AllAuditions().length,
    roster: slotList()
      .map((slot) => {
        const hired = person(S.roster[slot]);
        if (!hired) return null;

        const audition = v24AuditionFor(slot, hired.id) || S.auditions[slot];
        const cameo = S.cameos[slot];

        return {
          slot,
          character: roleName(slot),
          personId: hired.id,
          tmdbId: hired.tmdbId || null,
          name: hired.name,
          tier: talentTier(hired, slot),
          fit: Math.round(adjusted(hired, slot).fit),
          auditioned: audition?.personId === hired.id,
          auditionTierBefore:
            audition?.personId === hired.id
              ? audition.tierBeforeAudition || null
              : null,
          auditionTierAfter:
            audition?.personId === hired.id ? talentTier(hired, slot) : null,
          cameo: cameo?.personId === hired.id ? cameo.character : null,
          cameoTitle: cameo?.personId === hired.id ? cameo.title : null,
        };
      })
      .filter(Boolean),
  };
}

function recordCompletedCareerRun() {
  const snapshot = playerCareerRunSnapshot();
  if (!snapshot) return;

  const store = loadPlayerAnalyticsStore();
  const career = activePlayerCareer(store);

  const existingIndex = career.runs.findIndex((run) => run.id === snapshot.id);

  if (existingIndex >= 0) {
    const existing = career.runs[existingIndex];
    career.runs[existingIndex] = {
      ...existing,
      ...snapshot,
      completedAt: existing.completedAt || snapshot.completedAt,
      roster: snapshot.roster,
    };
  } else {
    career.runs.push(snapshot);
  }

  career.runs = career.runs.slice(-PLAYER_ANALYTICS_RUN_LIMIT);
  savePlayerAnalyticsStore(store);
}

function analyticsCountBy(runs, key) {
  const counts = {};
  for (const run of runs) {
    const value = run[key] ?? "Unknown";
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function analyticsSum(runs, key) {
  return runs.reduce((sum, run) => sum + safe(run[key]), 0);
}

function analyticsMean(runs, key) {
  return runs.length ? analyticsSum(runs, key) / runs.length : 0;
}

function analyticsCareerSummary(career) {
  const runs = career.runs || [];
  const rankedRuns = runs.filter((run) => Number.isFinite(run.rank));
  const profitable = runs.filter((run) => run.profit > 0).length;
  const referenceEligible = runs.filter((run) => run.beatReference !== null);
  const beatReference = referenceEligible.filter(
    (run) => run.beatReference,
  ).length;
  const totalAwards = analyticsSum(runs, "awardWins");
  const totalGross = analyticsSum(runs, "worldwide");
  const totalProfit = analyticsSum(runs, "profit");

  const castUsage = {};
  for (const run of runs) {
    for (const member of run.roster || []) {
      const key = member.tmdbId || member.personId || member.name;
      if (!castUsage[key]) {
        castUsage[key] = {
          name: member.name,
          appearances: 0,
          gross: 0,
          profit: 0,
          awards: 0,
        };
      }
      castUsage[key].appearances += 1;
      castUsage[key].gross += safe(run.worldwide);
      castUsage[key].profit += safe(run.profit);
      castUsage[key].awards += safe(run.awardWins);
    }
  }

  const mostUsedPeople = Object.values(castUsage)
    .sort((a, b) => b.appearances - a.appearances || b.profit - a.profit)
    .slice(0, 12);

  return {
    runs,
    films: runs.length,
    totalGross,
    totalProfit,
    profitableRate: runs.length ? (profitable / runs.length) * 100 : 0,
    beatReferenceRate: referenceEligible.length
      ? (beatReference / referenceEligible.length) * 100
      : 0,
    totalAwards,
    averageAudience: analyticsMean(runs, "audience"),
    averageCritics: analyticsMean(runs, "critics"),
    averageRank: analyticsMean(rankedRuns, "rank"),
    genres: analyticsCountBy(runs, "genre"),
    scales: analyticsCountBy(runs, "scale"),
    modes: analyticsCountBy(runs, "mode"),
    campaigns: analyticsCountBy(runs, "marketing"),
    outcomes: analyticsCountBy(runs, "outcome"),
    mostUsedPeople,
    highestGross:
      runs.slice().sort((a, b) => b.worldwide - a.worldwide)[0] || null,
    highestProfit: runs.slice().sort((a, b) => b.profit - a.profit)[0] || null,
    biggestLoss: runs.slice().sort((a, b) => a.profit - b.profit)[0] || null,
    bestReviewed:
      runs
        .slice()
        .sort((a, b) => b.audience + b.critics - (a.audience + a.critics))[0] ||
      null,
  };
}

function analyticsCareerGrade(summary) {
  if (!summary.films) return "—";

  const profitPerFilm = summary.totalProfit / summary.films;
  const awardRate = summary.totalAwards / summary.films;
  const score =
    summary.profitableRate * 0.34 +
    summary.beatReferenceRate * 0.18 +
    clamp(profitPerFilm + 25, 0, 100) * 0.2 +
    clamp(awardRate * 22, 0, 100) * 0.12 +
    summary.averageAudience * 0.08 +
    summary.averageCritics * 0.08;

  if (score >= 78) return "S";
  if (score >= 68) return "A";
  if (score >= 58) return "B";
  if (score >= 47) return "C";
  return "D";
}

function analyticsTopEntries(counts, limit = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function analyticsRecordCard(label, run, value) {
  if (!run) {
    return `<div class="careerRecord"><span class="mini">${label}</span><b>No completed runs</b></div>`;
  }

  return `
    <div class="careerRecord">
      <span class="mini">${label}</span>
      <b>${run.title}</b>
      <div class="sub">${value}</div>
    </div>
  `;
}

function analyticsDashboardHtml(career) {
  const summary = analyticsCareerSummary(career);
  const grade = analyticsCareerGrade(summary);

  if (!summary.films) {
    return `
      <div class="careerEmpty">
        <div class="careerGrade">—</div>
        <h2>No completed movies in ${career.name}</h2>
        <p class="sub">
          Finish a release and open Results to add the first entry to this career.
        </p>
      </div>
    `;
  }

  return `
    <div class="careerKpis">
      <div class="careerGradeCard">
        <span class="mini">Career grade</span>
        <div class="careerGrade tier ${grade}">${grade}</div>
      </div>
      <div class="careerKpi"><span class="mini">Films</span><b>${summary.films}</b></div>
      <div class="careerKpi"><span class="mini">Worldwide</span><b>${moneyM(summary.totalGross)}</b></div>
      <div class="careerKpi"><span class="mini">Career profit</span><b class="${summary.totalProfit >= 0 ? "positive" : "negative"}">${moneyM(summary.totalProfit)}</b></div>
      <div class="careerKpi"><span class="mini">Profitable</span><b>${summary.profitableRate.toFixed(1)}%</b></div>
      <div class="careerKpi"><span class="mini">Beat reference</span><b>${summary.beatReferenceRate.toFixed(1)}%</b></div>
      <div class="careerKpi"><span class="mini">Awards won</span><b>${summary.totalAwards}</b></div>
      <div class="careerKpi"><span class="mini">Avg reception</span><b>${((summary.averageAudience + summary.averageCritics) / 2).toFixed(1)}</b></div>
    </div>

    <div class="careerChartGrid">
      <div class="careerChartCard">
        <h3>Profit by release</h3>
        <canvas id="careerProfitChart" width="720" height="310"></canvas>
      </div>
      <div class="careerChartCard">
        <h3>Commercial outcomes</h3>
        <canvas id="careerOutcomeChart" width="720" height="310"></canvas>
      </div>
      <div class="careerChartCard">
        <h3>Gross by scale</h3>
        <canvas id="careerScaleChart" width="720" height="310"></canvas>
      </div>
      <div class="careerChartCard">
        <h3>Mode performance</h3>
        <canvas id="careerModeChart" width="720" height="310"></canvas>
      </div>
    </div>

    <h2>Career records</h2>
    <div class="careerRecords">
      ${analyticsRecordCard("Highest gross", summary.highestGross, moneyM(summary.highestGross?.worldwide))}
      ${analyticsRecordCard("Most profitable", summary.highestProfit, moneyM(summary.highestProfit?.profit))}
      ${analyticsRecordCard("Biggest loss", summary.biggestLoss, moneyM(summary.biggestLoss?.profit))}
      ${analyticsRecordCard(
        "Best reviewed",
        summary.bestReviewed,
        `${Math.round(summary.bestReviewed?.critics || 0)} critics · ${Math.round(summary.bestReviewed?.audience || 0)} audience`,
      )}
    </div>
  `;
}

function analyticsRosterPlainText(run) {
  const roster = run.roster || [];
  if (!roster.length) return "Roster unavailable";

  return roster
    .map((member) => {
      const details = [
        `${member.tier || "—"} tier`,
        `${member.fit ?? "—"} fit`,
        member.auditioned ? "auditioned" : null,
        member.cameo ? `cameo: ${member.cameo}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      const character = member.character ? ` as ${member.character}` : "";
      return `${member.slot}: ${member.name}${character} (${details})`;
    })
    .join(" | ");
}

function analyticsRosterCardHtml(member) {
  const auditionMovement =
    member.auditioned && member.auditionTierBefore && member.auditionTierAfter
      ? `${member.auditionTierBefore} → ${member.auditionTierAfter}`
      : null;

  return `
    <article class="careerRosterMember">
      <div class="careerRosterMemberHead">
        <div>
          <div class="mini">${member.slot || "Position"}</div>
          <b>${member.name || "Unknown person"}</b>
          ${member.character ? `<div class="playing">${member.character}</div>` : ""}
        </div>
        <span class="tier ${member.tier || "D"} careerRosterTier">${member.tier || "—"}</span>
      </div>

      <div class="careerRosterStats">
        <span>Project Fit <b>${member.fit ?? "—"}${member.fit == null ? "" : "%"}</b></span>
        ${member.auditioned ? `<span class="careerRosterBadge auditioned">Auditioned${auditionMovement ? ` · ${auditionMovement}` : ""}</span>` : ""}
        ${member.cameo ? `<span class="careerRosterBadge cameo">Cameo · ${member.cameo}</span>` : ""}
      </div>

      ${member.cameoTitle ? `<div class="careerRosterSource">From ${member.cameoTitle}</div>` : ""}
    </article>
  `;
}

function analyticsRosterGridHtml(run) {
  const roster = run.roster || [];

  if (!roster.length) {
    return `
      <div class="careerRosterUnavailable">
        Full roster data was not recorded for this older run.
      </div>
    `;
  }

  return `
    <div class="careerRosterSummary">
      <span>${roster.length} team members</span>
      <span>${roster.filter((member) => member.auditioned).length} auditioned</span>
      <span>${roster.filter((member) => member.cameo).length} cameos</span>
    </div>
    <div class="careerRosterGrid">
      ${roster.map(analyticsRosterCardHtml).join("")}
    </div>
  `;
}

function analyticsHistoryHtml(career) {
  const runs = (career.runs || [])
    .slice()
    .sort((a, b) => b.completedAt - a.completedAt);

  if (!runs.length) {
    return `<div class="careerEmpty"><h2>No run history yet</h2></div>`;
  }

  return `
    <div class="careerHistory">
      ${runs
        .map(
          (run, index) => `
        <details class="careerRunDetails">
          <summary class="careerRunRow">
            <div class="careerRunIndex">#${runs.length - index}</div>
            <div>
              <b>${run.title}</b>
              <div class="sub">
                ${run.genre} · ${run.scale} · ${run.mode} ·
                ${new Date(run.completedAt).toLocaleDateString()}
              </div>
            </div>
            <span class="careerOutcome">${run.outcome}</span>
            <b>${moneyM(run.worldwide)}</b>
            <b class="${run.profit >= 0 ? "positive" : "negative"}">${moneyM(run.profit)}</b>
            <span>${run.awardWins} wins</span>
            <span class="careerRosterToggle">
              <span class="rosterClosedLabel">View roster</span>
              <span class="rosterOpenLabel">Hide roster</span>
            </span>
          </summary>

          <div class="careerRunRosterPanel">
            <div class="careerRunRosterHeader">
              <div>
                <div class="mini">COMPLETE TEAM</div>
                <h3>${run.title}</h3>
              </div>
              <div class="careerRunRosterMeta">
                <span>${run.auditionCount || 0} auditions</span>
                <span>${run.cameoCount || 0} cameos</span>
              </div>
            </div>
            ${analyticsRosterGridHtml(run)}
          </div>
        </details>
      `,
        )
        .join("")}
    </div>
  `;
}

function analyticsStrategyHtml(career) {
  const summary = analyticsCareerSummary(career);
  const runs = summary.runs;

  if (!runs.length) {
    return `<div class="careerEmpty"><h2>No strategy data yet</h2></div>`;
  }

  const strategyTable = (title, key, counts) => {
    const entries = analyticsTopEntries(counts, 20);

    return `
      <div class="careerStrategyCard">
        <h3>${title}</h3>
        ${entries
          .map(([value, count]) => {
            const matching = runs.filter(
              (run) => String(run[key] ?? "Unknown") === value,
            );
            const avgGross = analyticsMean(matching, "worldwide");
            const avgProfit = analyticsMean(matching, "profit");
            const profitable = matching.length
              ? (matching.filter((run) => run.profit > 0).length /
                  matching.length) *
                100
              : 0;

            return `
            <div class="careerStrategyRow">
              <div><b>${value}</b><small>${count} films</small></div>
              <span>${moneyM(avgGross)} avg gross</span>
              <span class="${avgProfit >= 0 ? "positive" : "negative"}">${moneyM(avgProfit)} avg profit</span>
              <span>${profitable.toFixed(0)}% profitable</span>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  };

  return `
    <div class="careerStrategyGrid">
      ${strategyTable("Genres", "genre", summary.genres)}
      ${strategyTable("Production scales", "scale", summary.scales)}
      ${strategyTable("Campaigns", "marketing", summary.campaigns)}
      ${strategyTable("Hiring modes", "mode", summary.modes)}
    </div>

    <h2>Most-used talent</h2>
    <div class="careerTalentGrid">
      ${summary.mostUsedPeople
        .map(
          (personUsage) => `
        <div class="careerTalent">
          <b>${personUsage.name}</b>
          <span>${personUsage.appearances} appearances</span>
          <span>${moneyM(personUsage.gross / personUsage.appearances)} average gross</span>
          <span class="${personUsage.profit >= 0 ? "positive" : "negative"}">${moneyM(personUsage.profit)} combined profit</span>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function analyticsReportHtml(career) {
  const summary = analyticsCareerSummary(career);
  const firstFive = summary.runs.slice(0, 5);
  const lastFive = summary.runs.slice(-5);
  const earlyProfit = analyticsMean(firstFive, "profit");
  const recentProfit = analyticsMean(lastFive, "profit");
  const trend =
    summary.runs.length < 4
      ? "More completed releases are needed before a career trend can be measured."
      : recentProfit > earlyProfit
        ? `Recent projects average ${moneyM(recentProfit - earlyProfit)} more profit than the beginning of the career.`
        : `Recent projects average ${moneyM(earlyProfit - recentProfit)} less profit than the beginning of the career.`;

  const favoriteGenre = analyticsTopEntries(summary.genres, 1)[0]?.[0] || "—";
  const favoriteScale = analyticsTopEntries(summary.scales, 1)[0]?.[0] || "—";
  const favoriteCampaign =
    analyticsTopEntries(summary.campaigns, 1)[0]?.[0] || "—";

  return `
    <div class="careerReport">
      <div class="careerReportHero">
        <div>
          <div class="mini">Career data report</div>
          <h2>${career.name}</h2>
          <p class="sub">Created ${new Date(career.createdAt).toLocaleDateString()} · ${summary.films} completed releases</p>
        </div>
        <div class="careerGrade tier ${analyticsCareerGrade(summary)}">${analyticsCareerGrade(summary)}</div>
      </div>

      <div class="careerReportNarrative">
        <p>
          This career has generated <b>${moneyM(summary.totalGross)}</b> worldwide
          and <b class="${summary.totalProfit >= 0 ? "positive" : "negative"}">${moneyM(summary.totalProfit)}</b>
          in estimated studio profit. ${summary.profitableRate.toFixed(1)}% of
          projects were profitable, and ${summary.beatReferenceRate.toFixed(1)}%
          outperformed their reference films.
        </p>
        <p>${trend}</p>
      </div>

      <div class="careerRecords">
        <div class="careerRecord"><span class="mini">Most used genre</span><b>${favoriteGenre}</b></div>
        <div class="careerRecord"><span class="mini">Most used scale</span><b>${favoriteScale}</b></div>
        <div class="careerRecord"><span class="mini">Most used campaign</span><b>${favoriteCampaign}</b></div>
        <div class="careerRecord"><span class="mini">Awards won</span><b>${summary.totalAwards}</b></div>
      </div>

      <h3>Report downloads</h3>
      <div class="row">
        <button class="btn primary" id="downloadCareerReport">Download HTML report</button>
        <button class="btn" id="downloadCareerCsv">Download run CSV</button>
        <button class="btn" id="downloadCareerJson">Download career JSON</button>
      </div>
    </div>
  `;
}

function analyticsDrawEmptyCanvas(canvas, message) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#aaa0b8";
  context.font = "16px Arial";
  context.fillText(message, 20, 40);
}

function analyticsDrawLineChart(canvasId, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (!values.length) return analyticsDrawEmptyCanvas(canvas, "No data");

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 42;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(1, max - min);

  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#40354d";
  context.lineWidth = 1;

  for (let line = 0; line <= 4; line++) {
    const y = padding + ((height - padding * 2) * line) / 4;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  const zeroY = padding + (max / range) * (height - padding * 2);

  context.strokeStyle = "#6b5a7a";
  context.beginPath();
  context.moveTo(padding, zeroY);
  context.lineTo(width - padding, zeroY);
  context.stroke();

  context.strokeStyle = "#a46cff";
  context.lineWidth = 4;
  context.beginPath();

  values.forEach((value, index) => {
    const x =
      padding +
      (width - padding * 2) *
        (values.length === 1 ? 0.5 : index / (values.length - 1));
    const y = padding + ((max - value) / range) * (height - padding * 2);

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();

  context.fillStyle = "#ffd064";
  values.forEach((value, index) => {
    const x =
      padding +
      (width - padding * 2) *
        (values.length === 1 ? 0.5 : index / (values.length - 1));
    const y = padding + ((max - value) / range) * (height - padding * 2);

    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
  });
}

function analyticsDrawBarChart(
  canvasId,
  labels,
  values,
  formatter = (value) => String(value),
) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (!values.length) return analyticsDrawEmptyCanvas(canvas, "No data");

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 45;
  const maximum = Math.max(1, ...values);
  const usableWidth = width - padding * 2;
  const barWidth = (usableWidth / values.length) * 0.62;

  context.clearRect(0, 0, width, height);
  context.font = "12px Arial";
  context.textAlign = "center";

  values.forEach((value, index) => {
    const cellWidth = usableWidth / values.length;
    const x = padding + cellWidth * index + (cellWidth - barWidth) / 2;
    const barHeight = ((height - padding * 2) * value) / maximum;
    const y = height - padding - barHeight;

    const gradient = context.createLinearGradient(0, y, 0, height - padding);
    gradient.addColorStop(0, "#a46cff");
    gradient.addColorStop(1, "#ffd064");

    context.fillStyle = gradient;
    context.fillRect(x, y, barWidth, barHeight);

    context.fillStyle = "#ffffff";
    context.fillText(formatter(value), x + barWidth / 2, Math.max(16, y - 8));

    context.fillStyle = "#aaa0b8";
    const shortLabel =
      labels[index].length > 12
        ? `${labels[index].slice(0, 10)}…`
        : labels[index];
    context.fillText(shortLabel, x + barWidth / 2, height - 18);
  });
}

function drawPlayerAnalyticsCharts(career) {
  const runs = career.runs || [];
  const summary = analyticsCareerSummary(career);

  analyticsDrawLineChart(
    "careerProfitChart",
    runs.map((run) => run.profit),
  );

  const outcomeEntries = analyticsTopEntries(summary.outcomes, 8);
  analyticsDrawBarChart(
    "careerOutcomeChart",
    outcomeEntries.map((entry) => entry[0]),
    outcomeEntries.map((entry) => entry[1]),
  );

  const scaleOrder = [
    "Microbudget",
    "Independent",
    "Mid-Budget",
    "Studio Event",
    "Tentpole",
  ];
  analyticsDrawBarChart(
    "careerScaleChart",
    scaleOrder,
    scaleOrder.map((scale) => {
      const matching = runs.filter((run) => run.scale === scale);
      return analyticsMean(matching, "worldwide");
    }),
    (value) => moneyM(value),
  );

  const modeOrder = ["draft", "search"];
  analyticsDrawBarChart(
    "careerModeChart",
    ["Draft", "Search"],
    modeOrder.map((mode) => {
      const matching = runs.filter((run) => run.mode === mode);
      return analyticsMean(matching, "profit");
    }),
    (value) => moneyM(value),
  );
}

function analyticsCsvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function analyticsDownload(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function downloadCareerCsv(career) {
  const rows = career.runs || [];
  if (!rows.length) return;

  const keys = [
    "completedAt",
    "title",
    "referenceTitle",
    "year",
    "genre",
    "scale",
    "mode",
    "marketing",
    "worldwide",
    "profit",
    "roi",
    "outcome",
    "rank",
    "audience",
    "critics",
    "awardWins",
    "awardNominations",
    "beatReference",
    "auditionCount",
    "cameoCount",
    "roster",
  ];

  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys
        .map((key) => {
          let value = row[key];

          if (key === "completedAt") {
            value = new Date(row.completedAt).toISOString();
          }

          if (key === "roster") {
            value = analyticsRosterPlainText(row);
          }

          return analyticsCsvCell(value);
        })
        .join(","),
    ),
  ].join("\n");

  analyticsDownload(
    `${career.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-runs.csv`,
    csv,
    "text/csv;charset=utf-8",
  );
}

function downloadCareerJson(career) {
  analyticsDownload(
    `${career.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-career.json`,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        career,
        summary: analyticsCareerSummary(career),
      },
      null,
      2,
    ),
    "application/json",
  );
}

function downloadCareerHtmlReport(career) {
  const summary = analyticsCareerSummary(career);

  const tableRows = (career.runs || [])
    .slice()
    .sort((a, b) => b.completedAt - a.completedAt)
    .map(
      (run) => `
      <tr>
        <td>${new Date(run.completedAt).toLocaleDateString()}</td>
        <td>${run.title}</td>
        <td>${run.genre}</td>
        <td>${run.scale}</td>
        <td>${run.outcome}</td>
        <td>${moneyM(run.worldwide)}</td>
        <td>${moneyM(run.profit)}</td>
        <td>${run.awardWins}</td>
      </tr>
    `,
    )
    .join("");

  const rosterSections = (career.runs || [])
    .slice()
    .sort((a, b) => b.completedAt - a.completedAt)
    .map(
      (run) => `
      <section class="release">
        <div class="releaseHead">
          <div>
            <div class="sub">${new Date(run.completedAt).toLocaleDateString()} · ${run.genre} · ${run.scale}</div>
            <h3>${run.title}</h3>
          </div>
          <div class="releaseNumbers">
            <b>${moneyM(run.worldwide)}</b>
            <span class="${run.profit >= 0 ? "positive" : "negative"}">${moneyM(run.profit)} profit</span>
          </div>
        </div>

        ${
          (run.roster || []).length
            ? `
          <div class="roster">
            ${(run.roster || [])
              .map(
                (member) => `
              <div class="member">
                <div class="memberHead">
                  <div><small>${member.slot}</small><b>${member.name}</b></div>
                  <strong>${member.tier || "—"}</strong>
                </div>
                ${member.character ? `<div class="character">${member.character}</div>` : ""}
                <div class="memberMeta">
                  <span>Fit ${member.fit ?? "—"}${member.fit == null ? "" : "%"}</span>
                  ${member.auditioned ? '<span class="badge audition">Auditioned</span>' : ""}
                  ${member.cameo ? `<span class="badge cameo">Cameo: ${member.cameo}</span>` : ""}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : '<p class="sub">Roster unavailable for this older run.</p>'
        }
      </section>
    `,
    )
    .join("");

  const documentHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${career.name} — GREENLIT Career Report</title>
<style>
body{font-family:Arial,sans-serif;background:#120f18;color:#f7f2ff;margin:0;padding:36px}
h1,h2,h3{margin:0 0 12px}.sub{color:#b8acc6}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}
.card{background:#1d1725;border:1px solid #40354d;border-radius:12px;padding:16px}.card b{display:block;font-size:24px;color:#ffd064;margin-top:5px}
table{width:100%;border-collapse:collapse;background:#1d1725;margin-top:18px}th,td{padding:10px;border-bottom:1px solid #40354d;text-align:left}th{color:#ffd064}
.positive{color:#70e3a2}.negative{color:#ff8494}.release{margin-top:20px;padding:18px;border:1px solid #40354d;border-radius:14px;background:#1d1725}
.releaseHead,.memberHead{display:flex;justify-content:space-between;gap:14px}.releaseNumbers{text-align:right}.releaseNumbers span{display:block;margin-top:4px}
.roster{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:15px}.member{padding:12px;border:1px solid #40354d;border-radius:10px;background:#100d15}
.member small,.member b,.character{display:block}.member small{color:#b8acc6;text-transform:uppercase}.memberHead strong{display:grid;place-items:center;width:35px;height:35px;border-radius:9px;background:#ffd064;color:#211700}
.character{color:#ffd064;font-size:12px;margin-top:5px}.memberMeta{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;color:#b8acc6;font-size:11px}.badge{padding:3px 6px;border-radius:999px;background:#2b2037}.badge.audition{color:#70e3a2}.badge.cameo{color:#ffd064}
@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}.roster{grid-template-columns:1fr 1fr}}@media(max-width:600px){.roster,.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="sub">GREENLIT PLAYER ANALYTICS</div>
<h1>${career.name}</h1>
<p class="sub">Generated ${new Date().toLocaleString()}</p>
<div class="grid">
  <div class="card">Career grade<b>${analyticsCareerGrade(summary)}</b></div>
  <div class="card">Films<b>${summary.films}</b></div>
  <div class="card">Worldwide<b>${moneyM(summary.totalGross)}</b></div>
  <div class="card">Career profit<b class="${summary.totalProfit >= 0 ? "positive" : "negative"}">${moneyM(summary.totalProfit)}</b></div>
  <div class="card">Profitable<b>${summary.profitableRate.toFixed(1)}%</b></div>
  <div class="card">Beat reference<b>${summary.beatReferenceRate.toFixed(1)}%</b></div>
  <div class="card">Awards won<b>${summary.totalAwards}</b></div>
  <div class="card">Avg reception<b>${((summary.averageAudience + summary.averageCritics) / 2).toFixed(1)}</b></div>
</div>
<h2>Release history</h2>
<table>
<thead><tr><th>Date</th><th>Movie</th><th>Genre</th><th>Scale</th><th>Outcome</th><th>Gross</th><th>Profit</th><th>Awards</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
<h2 style="margin-top:30px">Complete rosters</h2>
${rosterSections}
</body>
</html>`;

  analyticsDownload(
    `${career.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-career-report.html`,
    documentHtml,
    "text/html;charset=utf-8",
  );
}

let PLAYER_ANALYTICS_UI = {
  tab: "overview",
};

function renderPlayerAnalyticsPanel() {
  const store = loadPlayerAnalyticsStore();
  const career = activePlayerCareer(store);
  const panel = $("#playerAnalyticsPanel");
  if (!panel) return;

  const tab = PLAYER_ANALYTICS_UI.tab;
  panel.innerHTML =
    tab === "overview"
      ? analyticsDashboardHtml(career)
      : tab === "history"
        ? analyticsHistoryHtml(career)
        : tab === "strategy"
          ? analyticsStrategyHtml(career)
          : analyticsReportHtml(career);

  $$("[data-player-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.playerTab === tab);
  });

  if (tab === "overview") {
    requestAnimationFrame(() => drawPlayerAnalyticsCharts(career));
  }

  if ($("#downloadCareerReport")) {
    $("#downloadCareerReport").onclick = () => downloadCareerHtmlReport(career);
  }
  if ($("#downloadCareerCsv")) {
    $("#downloadCareerCsv").onclick = () => downloadCareerCsv(career);
  }
  if ($("#downloadCareerJson")) {
    $("#downloadCareerJson").onclick = () => downloadCareerJson(career);
  }
}

function refreshPlayerCareerSelector() {
  const store = loadPlayerAnalyticsStore();
  const select = $("#playerCareerSelect");
  if (!select) return;

  select.innerHTML = store.careers
    .map(
      (career) => `
      <option
        value="${career.id}"
        ${career.id === store.activeCareerId ? "selected" : ""}
      >
        ${career.name} · ${career.runs.length} films
      </option>
    `,
    )
    .join("");
}

function playerAnalyticsModal() {
  const store = loadPlayerAnalyticsStore();
  const career = activePlayerCareer(store);

  modal(
    `
    <div class="balanceHead playerAnalyticsHead">
      <div>
        <div class="mini">PLAYER HISTORY</div>
        <h2>Player Analytics</h2>
        <p class="sub">
          Track complete runs across separate careers without changing the
          balance simulation or your current movie save.
        </p>
      </div>
      <button class="balanceClose" data-close aria-label="Close">×</button>
    </div>

    <section class="careerToolbar">
      <div class="careerSelectWrap">
        <label>Active career</label>
        <select id="playerCareerSelect">
          ${store.careers
            .map(
              (item) => `
            <option value="${item.id}" ${item.id === store.activeCareerId ? "selected" : ""}>
              ${item.name} · ${item.runs.length} films
            </option>
          `,
            )
            .join("")}
        </select>
      </div>
      <button class="btn primary" id="newPlayerCareer">New career</button>
      <button class="btn" id="renamePlayerCareer">Rename</button>
      <button class="btn danger" id="deletePlayerCareer" ${store.careers.length <= 1 ? "disabled" : ""}>Delete</button>
      <div class="careerActiveNote">New completed runs will be added to <b>${career.name}</b>.</div>
    </section>

    <div class="tabs playerAnalyticsTabs">
      <button class="tab active" data-player-tab="overview">Overview</button>
      <button class="tab" data-player-tab="history">Run history</button>
      <button class="tab" data-player-tab="strategy">Strategy & talent</button>
      <button class="tab" data-player-tab="report">Career report</button>
    </div>

    <section id="playerAnalyticsPanel"></section>
  `,
    "balanceModal playerAnalyticsModal",
  );

  refreshPlayerCareerSelector();
  renderPlayerAnalyticsPanel();

  $("#playerCareerSelect").onchange = (event) => {
    const currentStore = loadPlayerAnalyticsStore();
    currentStore.activeCareerId = event.target.value;
    savePlayerAnalyticsStore(currentStore);
    refreshPlayerCareerSelector();
    renderPlayerAnalyticsPanel();
  };

  $("#newPlayerCareer").onclick = () => {
    const name = prompt(
      "Name the new career:",
      `Career ${store.careers.length + 1}`,
    );
    if (!name?.trim()) return;

    const currentStore = loadPlayerAnalyticsStore();
    const newCareer = createCareer(name.trim());
    currentStore.careers.push(newCareer);
    currentStore.activeCareerId = newCareer.id;
    savePlayerAnalyticsStore(currentStore);
    closeModal();
    playerAnalyticsModal();
  };

  $("#renamePlayerCareer").onclick = () => {
    const currentStore = loadPlayerAnalyticsStore();
    const active = activePlayerCareer(currentStore);
    const name = prompt("Rename this career:", active.name);
    if (!name?.trim()) return;

    active.name = name.trim();
    savePlayerAnalyticsStore(currentStore);
    closeModal();
    playerAnalyticsModal();
  };

  $("#deletePlayerCareer").onclick = () => {
    const currentStore = loadPlayerAnalyticsStore();
    if (currentStore.careers.length <= 1) return;

    const active = activePlayerCareer(currentStore);
    if (
      !confirm(
        `Delete “${active.name}” and all ${active.runs.length} recorded runs?`,
      )
    )
      return;

    currentStore.careers = currentStore.careers.filter(
      (careerItem) => careerItem.id !== active.id,
    );
    currentStore.activeCareerId = currentStore.careers[0].id;
    savePlayerAnalyticsStore(currentStore);
    closeModal();
    playerAnalyticsModal();
  };

  $$("[data-player-tab]").forEach((button) => {
    button.onclick = () => {
      PLAYER_ANALYTICS_UI.tab = button.dataset.playerTab;
      renderPlayerAnalyticsPanel();
    };
  });
}

// =============================================================================
// MODAL INFRASTRUCTURE
// =============================================================================
// The active Budget Lab is registered in the current gameplay section below.
function balanceModal() {}

function modal(html, extraClass = "") {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modalBack"><div class="modal ${extraClass}">${html}</div></div>`,
  );
  $$("[data-close]").forEach((x) => (x.onclick = closeModal));
}

function closeModal() {
  $(".modalBack")?.remove();
}

// =============================================================================
// GREENLIT V21 — ARCADE FLOW OVERRIDES
// =============================================================================
// This layer keeps the mature simulation, analytics and data tools while
// replacing the visible run with a faster six-screen loop.

const ARCADE_VERSION = "21.0";
const ARCADE_ACTOR_SLOTS = ["Lead 1", "Lead 2", "Cast 3", "Cast 4", "Cast 5"];
const ARCADE_WEIGHT_STORAGE_KEY = "greenlit-v38-arcade-score-weights";
const ARCADE_TUNING_STORAGE_KEY = "greenlit-v38-arcade-quick-tuning";

const ARCADE_MUSIC_CHOICES = {
  "Genre Pulse": {
    icon: "⚡",
    description:
      "A confident score that gives the audience exactly the emotional language the genre promises.",
    tags: ["Safe", "Coherent", "Audience"],
    music: 76,
    critic: 1,
    audience: 4,
    gross: 1.02,
    awards: 0,
    best: GENRES,
  },
  "Character Motifs": {
    icon: "🎼",
    description:
      "Recurring themes built around the lead characters. Less flashy, more emotionally sticky.",
    tags: ["Craft", "Emotion", "Awards"],
    music: 82,
    critic: 4,
    audience: 1,
    gross: 0.99,
    awards: 4,
    best: [
      "Drama",
      "Romance",
      "History",
      "War",
      "Crime",
      "Fantasy",
      "Animation",
    ],
  },
  "Needle-Drop Heat": {
    icon: "📻",
    description:
      "Recognizable songs, trailer moments and a soundtrack built to escape the movie.",
    tags: ["Buzz", "Opening", "Volatile"],
    music: 78,
    critic: -1,
    audience: 4,
    gross: 1.045,
    awards: -1,
    best: ["Comedy", "Music", "Action", "Family", "Romance", "Adventure"],
  },
  "Contrarian Score": {
    icon: "🌀",
    description:
      "Music that deliberately pushes against the expected tone. Genius when it lands. Weird when it does not.",
    tags: ["Risk", "Identity", "Wildcard"],
    music: 80,
    critic: 2,
    audience: 0,
    gross: 1,
    awards: 3,
    variance: 8,
    best: ["Horror", "Thriller", "Mystery", "Sci-Fi", "Documentary"],
  },
};

const ARCADE_VISUAL_CHOICES = {
  "Classical Coverage": {
    icon: "🎬",
    description:
      "Clear staging, readable geography and dependable coverage. The crew always knows what movie it is making.",
    tags: ["Stable", "Clear", "Efficient"],
    visuals: 74,
    critic: 1,
    audience: 2,
    gross: 1.01,
    awards: 0,
    best: ["Comedy", "Romance", "Family", "Music", "History"],
  },
  "Immersive Handheld": {
    icon: "🏃",
    description:
      "The camera lives beside the characters. Messier frames, stronger immediacy and emotional pressure.",
    tags: ["Intense", "Close", "Human"],
    visuals: 79,
    critic: 3,
    audience: 2,
    gross: 1,
    awards: 2,
    best: ["Drama", "Horror", "Thriller", "War", "Crime", "Documentary"],
  },
  "Precision Frames": {
    icon: "📐",
    description:
      "Controlled compositions, deliberate lighting and visual motifs that reward attention.",
    tags: ["Craft", "Prestige", "Controlled"],
    visuals: 84,
    critic: 4,
    audience: 0,
    gross: 0.99,
    awards: 4,
    best: ["Drama", "Mystery", "History", "Sci-Fi", "Fantasy", "Western"],
  },
  "Kinetic Spectacle": {
    icon: "🚀",
    description:
      "Moving cameras, large-scale images and trailer-ready visual peaks. Subtlety has left the group chat.",
    tags: ["Big", "Fast", "Commercial"],
    visuals: 85,
    critic: -1,
    audience: 4,
    gross: 1.05,
    awards: 2,
    best: ["Action", "Adventure", "Sci-Fi", "Fantasy", "Animation", "War"],
  },
};

const ARCADE_DEFAULT_GENRE_WEIGHTS = {
  Action: { commercial: 25, craft: 15, visuals: 27, music: 10, audience: 23 },
  Adventure: {
    commercial: 23,
    craft: 16,
    visuals: 25,
    music: 11,
    audience: 25,
  },
  Animation: {
    commercial: 19,
    craft: 20,
    visuals: 23,
    music: 14,
    audience: 24,
  },
  Comedy: { commercial: 21, craft: 18, visuals: 10, music: 12, audience: 39 },
  Crime: { commercial: 15, craft: 30, visuals: 18, music: 12, audience: 25 },
  Documentary: {
    commercial: 10,
    craft: 35,
    visuals: 18,
    music: 12,
    audience: 25,
  },
  Drama: { commercial: 14, craft: 34, visuals: 16, music: 13, audience: 23 },
  Family: { commercial: 20, craft: 16, visuals: 18, music: 14, audience: 32 },
  Fantasy: { commercial: 21, craft: 18, visuals: 27, music: 12, audience: 22 },
  History: { commercial: 12, craft: 34, visuals: 20, music: 13, audience: 21 },
  Horror: { commercial: 22, craft: 20, visuals: 20, music: 16, audience: 22 },
  Music: { commercial: 15, craft: 22, visuals: 16, music: 30, audience: 17 },
  Mystery: { commercial: 15, craft: 29, visuals: 19, music: 15, audience: 22 },
  Romance: { commercial: 17, craft: 23, visuals: 13, music: 17, audience: 30 },
  "Sci-Fi": { commercial: 22, craft: 19, visuals: 28, music: 12, audience: 19 },
  Thriller: { commercial: 20, craft: 23, visuals: 19, music: 15, audience: 23 },
  War: { commercial: 13, craft: 31, visuals: 23, music: 13, audience: 20 },
  Western: { commercial: 13, craft: 29, visuals: 25, music: 12, audience: 21 },
};

function arcadeClone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function arcadeEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function arcadeOptimizeImages(root = document) {
  [...root.querySelectorAll("img")].forEach((image, index) => {
    image.decoding = "async";
    if (!image.hasAttribute("loading")) {
      image.loading = index < 2 ? "eager" : "lazy";
    }
  });
}

function arcadeLoadGenreWeights() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(ARCADE_WEIGHT_STORAGE_KEY) || "null",
    );
    if (!parsed || typeof parsed !== "object")
      return arcadeClone(ARCADE_DEFAULT_GENRE_WEIGHTS);
    const merged = arcadeClone(ARCADE_DEFAULT_GENRE_WEIGHTS);
    for (const genre of GENRES) {
      if (!parsed[genre]) continue;
      merged[genre] = { ...merged[genre], ...parsed[genre] };
    }
    return merged;
  } catch {
    return arcadeClone(ARCADE_DEFAULT_GENRE_WEIGHTS);
  }
}

function arcadeLoadQuickTuning() {
  try {
    return {
      boxOffice: 1,
      randomness: 1,
      awards: 1,
      ...(JSON.parse(
        localStorage.getItem(ARCADE_TUNING_STORAGE_KEY) || "null",
      ) || {}),
    };
  } catch {
    return { boxOffice: 1, randomness: 1, awards: 1 };
  }
}

let ARCADE_GENRE_WEIGHTS = arcadeLoadGenreWeights();
let ARCADE_QUICK_TUNING = arcadeLoadQuickTuning();

function arcadeFreshState() {
  return {
    version: ARCADE_VERSION,
    originalCast: [],
    searchStatus: "",
    shortlistOpen: true,
    compareSlots: {},
    crew: {
      directorsPool: [],
      writersPool: [],
      selectedDirectors: [],
      selectedWriters: [],
      spun: false,
      respinUsed: false,
      manualUsed: false,
      spinning: false,
    },
    musicChoice: null,
    visualChoice: null,
    marketingLabel: null,
    customMarketingName: "",
    finalScores: null,
    runBadges: [],
    recommendationTelemetry: {},
  };
}

function ensureArcadeState() {
  if (!S.runSeed) {
    S.runSeed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  S.mode = "search";
  S.project.producers = 0;
  S.project.directors = Math.max(1, Math.min(2, safe(S.project.directors, 1)));
  S.project.writers = Math.max(1, Math.min(2, safe(S.project.writers, 1)));
  S.arcade = {
    ...arcadeFreshState(),
    ...(S.arcade || {}),
    crew: {
      ...arcadeFreshState().crew,
      ...(S.arcade?.crew || {}),
    },
  };
  S.shortlists = S.shortlists || {};
  S.auditions = S.auditions || {};
  S.searchResults = S.searchResults || {};
}

function arcadeCaptureOriginalCast() {
  const cast = (S.referenceCredits?.cast || []).slice(0, 5);
  S.arcade.originalCast = cast.map((credit, index) => ({
    id: credit.id,
    name: credit.name,
    character:
      credit.character ||
      credit.roles?.[0]?.character ||
      S.roles[ARCADE_ACTOR_SLOTS[index]] ||
      `Character ${index + 1}`,
    photo:
      V38_PORTRAITS?.pick(credit) ||
      (credit.profile_path
        ? `https://image.tmdb.org/t/p/w185${credit.profile_path}`
        : null),
    gender: safe(credit.gender, 0),
    age: S.originalAges[ARCADE_ACTOR_SLOTS[index]] ?? null,
  }));
}

function arcadeOriginalForSlot(slot) {
  ensureArcadeState();
  const index = ARCADE_ACTOR_SLOTS.indexOf(slot);
  return index >= 0 ? S.arcade.originalCast[index] || null : null;
}

const ARCADE_ORIGINAL_MAKE_SAVE_STATE = makeSaveState;
makeSaveState = function arcadeMakeSaveState() {
  ensureArcadeState();
  const styleCrew = {
    ...(S.arcade.styleCrew || {}),
    loading: false,
    loadError: null,
  };
  const output = {
    ...ARCADE_ORIGINAL_MAKE_SAVE_STATE(),
    mode: "draft",
    arcade: { ...S.arcade, styleCrew },
  };
  return APP_STATE?.sanitizeSave(output) || output;
};

const ARCADE_ORIGINAL_SELECT_REFERENCE = selectReference;
selectReference = async function arcadeSelectReference(id, type = "movie") {
  const selected = await ARCADE_ORIGINAL_SELECT_REFERENCE(id, type);
  if (!selected) return false;
  ensureArcadeState();
  S.project.directors = 1;
  S.project.writers = 1;
  S.project.producers = 0;
  S.arcade = arcadeFreshState();
  arcadeCaptureOriginalCast();
  render();
  return true;
};

slotList = function arcadeSlotList() {
  ensureArcadeState();
  const crew = [];
  for (let index = 1; index <= S.project.directors; index += 1)
    crew.push(`Director ${index}`);
  for (let index = 1; index <= S.project.writers; index += 1)
    crew.push(`Writer ${index}`);
  return [...ARCADE_ACTOR_SLOTS, ...crew];
};

allowed = function arcadeAllowed() {
  return true;
};

function arcadeAuditionCount() {
  return Object.keys(S.auditions || {}).length;
}

const ARCADE_DIRECTOR_DUOS = [
  ["Anthony Russo", "Joe Russo"],
  ["Joel Coen", "Ethan Coen"],
  ["Lana Wachowski", "Lilly Wachowski"],
  ["Jonathan Dayton", "Valerie Faris"],
  ["Benny Safdie", "Josh Safdie"],
  ["Albert Hughes", "Allen Hughes"],
].map((pair) =>
  pair
    .map((name) => name.toLowerCase())
    .sort()
    .join("|"),
);

function arcadeMediumAdjustment(p, slot) {
  if (!p || !ARCADE_ACTOR_SLOTS.includes(slot || "")) return 0;
  if (S.project.genre === "Animation") {
    if (p.voiceOnly) return 22;
    if (safe(p.voiceShare) >= 0.45) return 12;
    if (safe(p.voiceShare) <= 0.05) return -4;
    return 3;
  }
  if (p.voiceOnly) return -28;
  if (safe(p.voiceShare) >= 0.65) return -16;
  if (safe(p.liveCredits) >= 6) return 4;
  return 0;
}

function arcadeDirectorPairBonus(p, slot) {
  if (!p || !String(slot || "").startsWith("Director")) return 0;
  const others = Object.entries(S.roster || {})
    .filter(([s, id]) => s.startsWith("Director") && id && id !== p.id)
    .map(([, id]) => person(id))
    .filter(Boolean);
  let bonus = 0;
  for (const other of others) {
    const key = [p.name, other.name]
      .map((name) => String(name).toLowerCase())
      .sort()
      .join("|");
    if (ARCADE_DIRECTOR_DUOS.includes(key)) bonus = Math.max(bonus, 18);
    const collaborations =
      safe(p.collabs?.[other.tmdbId], 0) + safe(other.collabs?.[p.tmdbId], 0);
    if (collaborations >= 4) bonus = Math.max(bonus, 12);
    else if (collaborations >= 2) bonus = Math.max(bonus, 7);
  }
  return bonus;
}

const ARCADE_ORIGINAL_BASE_ATTRS = baseAttrs;
baseAttrs = function arcadeBaseAttrs(p, slot) {
  const attrs = ARCADE_ORIGINAL_BASE_ATTRS(p, slot);
  if (ARCADE_ACTOR_SLOTS.includes(slot))
    attrs.fit = clamp(attrs.fit + arcadeMediumAdjustment(p, slot));
  if (slot.startsWith("Director"))
    attrs.chemistry = clamp(attrs.chemistry + arcadeDirectorPairBonus(p, slot));
  return attrs;
};

function arcadeAuditionMods(p, slot, fit) {
  const raw = auditionMods(p, slot, fit);
  const revealBase = clamp(
    (fit - 63) / 15 + (safe(p?.reliability, 55) - 55) / 24,
    -3.1,
    3.4,
  );
  const momentumTilt = clamp((safe(p?.momentum, 55) - 55) / 35, -1.1, 1.3);
  const downsideWeight = fit <= 56 ? 1.2 : fit >= 75 ? 0.9 : 1;
  let seed = hash(`${S.runSeed}|audition-v38|${slot}|${p?.id}`);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const keyBias = {
    craft: 1.05,
    draw: 0.72,
    reliability: 0.95,
    momentum: 0.85,
    chemistry: 1.1,
  };

  const shaped = {};
  for (const [key, value] of Object.entries(raw)) {
    const volatility = (rand() - 0.5) * 4.6 + momentumTilt * 0.6;
    const modifier =
      (value * 0.62 + revealBase * (keyBias[key] || 0.9) + volatility) *
      downsideWeight;
    shaped[key] = Math.round(clamp(modifier, -10.5, 10.5) * 10) / 10;
  }

  const values = Object.values(shaped);
  const hasPositive = values.some((value) => value > 0.2);
  const hasNegative = values.some((value) => value < -0.2);
  if (!hasNegative) {
    const weakest = Object.entries(shaped).sort((a, b) => a[1] - b[1])[0]?.[0];
    if (weakest) shaped[weakest] = Math.round(clamp(shaped[weakest] - 2.6, -10.5, 10.5) * 10) / 10;
  }
  if (!hasPositive) {
    const strongest = Object.entries(shaped).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (strongest) shaped[strongest] = Math.round(clamp(shaped[strongest] + 2.4, -10.5, 10.5) * 10) / 10;
  }

  return shaped;
}

function arcadeTalentBadges(p, slot) {
  if (!p) return [];
  const attrs = adjusted(p, slot);
  const badges = [];
  if (attrs.draw >= 82)
    badges.push({
      icon: "💰",
      name: "Box Office Magnet",
      effect: "+Commercial",
      commercial: 2,
    });
  if (attrs.craft >= 82)
    badges.push({
      icon: "🏆",
      name: "Critics’ Favorite",
      effect: "+Craft",
      craft: 2,
    });
  if (attrs.fit >= 80)
    badges.push({
      icon: "🎯",
      name: "Genre Lock",
      effect: "+Audience",
      audience: 2,
    });
  if (attrs.momentum >= 80)
    badges.push({
      icon: "🔥",
      name: "Rising Heat",
      effect: "+Buzz",
      commercial: 1,
      audience: 1,
    });
  if (attrs.reliability >= 82)
    badges.push({
      icon: "🛡️",
      name: "Safe Hands",
      effect: "+Craft",
      craft: 1.5,
    });
  if (attrs.chemistry >= 72)
    badges.push({
      icon: "⚡",
      name: "Instant Chemistry",
      effect: "+Audience",
      audience: 1.5,
    });
  if (!badges.length)
    badges.push({ icon: "🎲", name: "Wildcard", effect: "Higher variance" });
  return badges.slice(0, 3);
}

function arcadeBadgeTotals() {
  const totals = { commercial: 0, craft: 0, audience: 0 };
  for (const slot of ARCADE_ACTOR_SLOTS) {
    const p = person(S.roster[slot]);
    for (const badge of arcadeTalentBadges(p, slot)) {
      totals.commercial += safe(badge.commercial);
      totals.craft += safe(badge.craft);
      totals.audience += safe(badge.audience);
    }
  }
  return totals;
}

function arcadeMoviePoster(movie, size = "w342") {
  return movie?.poster_path
    ? `https://image.tmdb.org/t/p/${size}${movie.poster_path}`
    : null;
}

function arcadeMovieResultButton(movie) {
  const title = movie.media_type === "tv" ? movie.name : movie.title;
  const date = movie.release_date || movie.first_air_date || "";
  return `<button class="arcadeMovieResult" data-ref="${movie.id}" data-type="${movie.media_type || "movie"}" data-testid="movie-result">
    ${arcadeMoviePoster(movie, "w185") ? `<img src="${arcadeMoviePoster(movie, "w185")}" alt="">` : '<div class="arcadePosterFallback">GL</div>'}
    <span><b>${arcadeEsc(title)}</b><small>${arcadeEsc(date.slice(0, 4) || "Year unknown")}</small></span>
    <strong>Pick →</strong>
  </button>`;
}

function arcadeBindMovieResults() {
  $$("[data-ref]").forEach((button) => {
    button.onclick = () =>
      selectReference(+button.dataset.ref, button.dataset.type || "movie");
  });
}

sidebar = function arcadeSidebar() {
  ensureArcadeState();
  const actorRows = ARCADE_ACTOR_SLOTS.map((slot) => {
    const original = arcadeOriginalForSlot(slot);
    const hired = person(S.roster[slot]);
    const displayPhoto = hired?.photo || original?.photo;
    return `<button class="arcadeRosterSlot ${hired ? "filled" : ""}" data-slotnav="${slot}">
      <div class="arcadeOriginalActor arcadeCharacterPortrait">${displayPhoto ? `<img src="${displayPhoto}" alt="">` : "<span>?</span>"}<small>${hired ? "Recast" : "Original"}</small></div>
      <div class="arcadeRosterCopy"><span>${arcadeEsc(hired?.name || original?.name || slot)}</span><b>${arcadeEsc(original?.character || roleName(slot) || "Character")}</b><small>${hired ? `Originally ${arcadeEsc(original?.name || "unknown")}` : "Choose replacement"}</small></div>
      ${original?.photo && hired ? `<img class="arcadeOriginalThumb" src="${original.photo}" title="Original: ${arcadeEsc(original.name)}" alt="">` : ""}
      ${S.auditions[slot] ? '<span class="arcadeTinyBadge">AUD</span>' : ""}
    </button>`;
  }).join("");

  const crewRows =
    [...Array(S.project.directors)]
      .map((_, index) => {
        const slot = `Director ${index + 1}`;
        const hired = person(S.roster[slot]);
        return hired
          ? `<div class="arcadeCrewMini"><span>Director</span><b>${arcadeEsc(hired.name)}</b></div>`
          : "";
      })
      .join("") +
    [...Array(S.project.writers)]
      .map((_, index) => {
        const slot = `Writer ${index + 1}`;
        const hired = person(S.roster[slot]);
        return hired
          ? `<div class="arcadeCrewMini"><span>Writer</span><b>${arcadeEsc(hired.name)}</b></div>`
          : "";
      })
      .join("");

  return `<aside class="sidebar arcadeSidebar">
    <div class="card arcadeProjectCard">
      <div class="mini">Current remake</div>
      <h3>${arcadeEsc(S.project.title)}</h3>
      <div class="sub">${arcadeEsc(S.project.genre)} · ${arcadeEsc(S.project.scale)} · ${S.project.year}</div>
    </div>
    <div class="arcadeSidebarHeading"><h3>Cast</h3><span>${ARCADE_ACTOR_SLOTS.filter((slot) => S.roster[slot]).length}/5</span></div>
    <div class="arcadeRoster">${actorRows}</div>
    ${crewRows ? `<div class="arcadeSidebarHeading"><h3>Crew</h3></div><div class="arcadeCrewMiniList">${crewRows}</div>` : ""}
    ${
      S.arcade.musicChoice || S.arcade.visualChoice
        ? `<div class="card arcadeStyleMini">
      <div><span>Music</span><b>${arcadeEsc(S.arcade.musicChoice || "—")}</b></div>
      <div><span>Camera</span><b>${arcadeEsc(S.arcade.visualChoice || "—")}</b></div>
    </div>`
        : ""
    }
  </aside>`;
};

shell = function arcadeShell(main) {
  ensureArcadeState();
  if (S.screen !== 4) stopReleaseRaceAnimation();
  const labels = [
    "Pick Movie",
    "Cast",
    "Crew & Style",
    "Marketing",
    "Release",
    "Results",
  ];
  const readiness = APP_STATE?.readiness(S) ||
    labels.map((_, index) => ({ complete: index < S.screen }));
  const dataStatus = V37_DATA?.getStatus?.() || {
    mode: token() ? "live" : "bundled",
    label: token() ? "TMDB" : "Bundled",
  };
  const routeGuardMessage = S.arcade?.routeGuardMessage || "";
  $("#app").innerHTML = `<div class="shell arcadeShell">
    <div class="topbar">
      <div class="brand">GREEN<em>LIT</em><small>ARCADE</small></div>
      <div class="actions">
        <span class="v37SourceStatus ${arcadeEsc(dataStatus.mode)}" data-testid="source-status"><i></i>${arcadeEsc(dataStatus.label)}</span>
        <button class="btn" id="data">Data</button>
        <button class="btn" id="playerAnalytics">Player Analytics</button>
        <button class="btn" id="balance">Balance Lab</button>
        <button class="btn" id="newRun">New Run</button>
      </div>
    </div>
    <div class="progress arcadeProgress">${labels.map((label, index) => `<div class="step ${index === S.screen ? "active" : readiness[index]?.complete ? "done" : ""}" data-testid="progress-step-${index}">${index + 1}. ${label}</div>`).join("")}</div>
    <div class="layout">${sidebar()}<main class="main">${routeGuardMessage ? `<div class="callout warn v37RouteGuard" data-testid="route-guard">${arcadeEsc(routeGuardMessage)}</div>` : ""}${main}</main></div>
  </div>`;
  if (S.arcade) delete S.arcade.routeGuardMessage;

  $("#data").onclick = dataModal;
  $("#playerAnalytics").onclick = playerAnalyticsModal;
  $("#balance").onclick = balanceModal;
  $("#newRun").onclick = () => {
    if (!confirm("Start a new arcade run? Career history stays saved.")) return;
    S = structuredClone(DEFAULT);
    ensureArcadeState();
    render();
  };
  $$("[data-slotnav]").forEach((button) => {
    button.onclick = () => {
      S.activeSlot = button.dataset.slotnav;
      S.screen = 1;
      render();
    };
  });
  arcadeOptimizeImages($("#app"));
};

render = function arcadeRender() {
  ACTIVE_RENDER_ID += 1;
  ensureArcadeState();
  S.arcade.version = "38.5";
  if (APP_STATE) {
    const guarded = APP_STATE.guardScreen(S, S.screen);
    if (guarded.redirected) {
      S.screen = guarded.screen;
      S.arcade.routeGuardMessage = guarded.message;
    }
  }
  save();
  return selectScreenRenderer(V38_SCREEN_REGISTRY, S.screen)();
};

const LEGACY_PROJECT_PAGE_V22 = function arcadeProjectPage() {
  ensureArcadeState();
  shell(`<div class="arcadePageHead">
      <div><div class="mini">Step 1</div><h1>Pick the movie.</h1><p class="sub">Search directly, browse with filters, or hit random. Everything else is built around this one film.</p></div>
      <div class="arcadeStepPill">One choice</div>
    </div>

    <section class="arcadeSearchPanel">
      <div class="arcadeSearchTabs">
        <div class="arcadeTitleSearch"><input id="titleSearch" placeholder="Search a movie title…"><button class="btn primary" id="searchTitleBtn">Search</button></div>
        <button class="btn warn" id="randomTitleBtn">🎲 Randomize</button>
      </div>
      <div class="arcadeMovieFilters">
        <div><label>Genre</label><select id="movieGenre"><option value="">Any genre</option>${GENRES.map((genre) => `<option value="${genre}">${genre}</option>`).join("")}</select></div>
        <div><label>From year</label><input id="movieYearFrom" type="number" min="1930" max="${new Date().getFullYear()}" placeholder="1980"></div>
        <div><label>To year</label><input id="movieYearTo" type="number" min="1930" max="${new Date().getFullYear()}" placeholder="2026"></div>
        <div><label>Sort</label><select id="movieSort"><option value="popularity.desc">Popular</option><option value="vote_count.desc">Most rated</option><option value="vote_average.desc">Highest rated</option><option value="revenue.desc">Biggest box office</option><option value="primary_release_date.desc">Newest</option></select></div>
        <button class="btn" id="browseMovies">Browse movies</button>
      </div>
      <div id="searchList" class="arcadeMovieResults"></div>
    </section>

    ${
      S.reference
        ? `<section class="arcadePickedMovie">
      ${S.reference.poster ? `<img src="${S.reference.poster}" alt="">` : '<div class="arcadePosterFallback">GL</div>'}
      <div><div class="mini">Your movie</div><h2>${arcadeEsc(S.reference.title)}</h2><p>${arcadeEsc(S.reference.overview || "No overview available.")}</p><div class="chipRow"><span class="chip active">${arcadeEsc(S.reference.genre)}</span><span class="chip">${S.reference.year}</span><span class="chip">${arcadeEsc(S.reference.scale)}</span></div></div>
      <div class="arcadeMovieBudget"><small>Original budget</small><b>${moneyM(S.reference.budgetM)}</b></div>
    </section>
    <details class="arcadeAdvanced"><summary>Quick project details</summary><div class="formgrid">
      <div><label>Release month</label><select id="month">${MONTHS.map((month) => `<option ${month === S.project.month ? "selected" : ""}>${month}</option>`).join("")}</select></div>
      <div><label>Rating</label><select id="rating">${["G", "PG", "PG-13", "R"].map((rating) => `<option ${rating === S.project.rating ? "selected" : ""}>${rating}</option>`).join("")}</select></div>
      <div><label>Scale</label><select id="scale">${Object.keys(SCALE)
        .map(
          (scale) =>
            `<option ${scale === S.project.scale ? "selected" : ""}>${scale}</option>`,
        )
        .join("")}</select></div>
      <div><label>Your title</label><input id="title" value="${arcadeEsc(S.project.title)}"></div>
    </div></details>
    <button class="btn primary arcadeContinue" id="continue">Start casting →</button>`
        : '<div class="callout">Pick a movie to begin.</div>'
    }`);

  async function showMovies(loader) {
    const box = $("#searchList");
    box.innerHTML = '<div class="callout">Finding movies…</div>';
    try {
      const results = await loader();
      box.innerHTML = results.length
        ? results.slice(0, 12).map(arcadeMovieResultButton).join("")
        : '<div class="callout bad">No movies matched those filters.</div>';
      arcadeBindMovieResults();
    } catch (error) {
      box.innerHTML = `<div class="callout bad">${arcadeEsc(error.message)}</div>`;
    }
  }

  $("#searchTitleBtn").onclick = () =>
    showMovies(async () => {
      const query = $("#titleSearch").value.trim();
      if (!query) return [];
      const data = await api("/search/movie", {
        query,
        include_adult: "false",
      });
      return (data.results || []).map((movie) => ({
        ...movie,
        media_type: "movie",
      }));
    });

  $("#browseMovies").onclick = () =>
    showMovies(async () => {
      const genre = $("#movieGenre").value;
      const fromYear = +$("#movieYearFrom").value || null;
      const toYear = +$("#movieYearTo").value || null;
      const params = {
        include_adult: "false",
        sort_by: $("#movieSort").value,
        page: 1,
        "vote_count.gte":
          $("#movieSort").value === "vote_average.desc" ? 250 : 0,
      };
      if (genre) params.with_genres = GENRE_IDS[genre];
      if (fromYear) params["primary_release_date.gte"] = `${fromYear}-01-01`;
      if (toYear) params["primary_release_date.lte"] = `${toYear}-12-31`;
      const data = await api("/discover/movie", params);
      return (data.results || []).map((movie) => ({
        ...movie,
        media_type: "movie",
      }));
    });

  $("#randomTitleBtn").onclick = async () => {
    const button = $("#randomTitleBtn");
    button.disabled = true;
    button.textContent = "Rolling…";
    try {
      const genre = $("#movieGenre").value;
      const fromYear = +$("#movieYearFrom").value || 1970;
      const toYear = +$("#movieYearTo").value || new Date().getFullYear();
      const page = 1 + Math.floor(Math.random() * 12);
      const params = {
        include_adult: "false",
        sort_by: $("#movieSort").value,
        page,
        "primary_release_date.gte": `${Math.min(fromYear, toYear)}-01-01`,
        "primary_release_date.lte": `${Math.max(fromYear, toYear)}-12-31`,
        "vote_count.gte": 80,
      };
      if (genre) params.with_genres = GENRE_IDS[genre];
      const data = await api("/discover/movie", params);
      const movies = data.results || [];
      if (!movies.length)
        throw new Error("No random movie matched those filters.");
      const movie = movies[Math.floor(Math.random() * movies.length)];
      await selectReference(movie.id, "movie");
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = "🎲 Randomize";
    }
  };

  for (const id of ["month", "rating", "scale", "title"]) {
    if (!$("#" + id)) continue;
    $("#" + id).onchange = (event) => {
      S.project[id] = event.target.value;
      render();
    };
  }

  if ($("#continue"))
    $("#continue").onclick = () => {
      S.screen = 1;
      S.activeSlot =
        ARCADE_ACTOR_SLOTS.find((slot) => !S.roster[slot]) ||
        ARCADE_ACTOR_SLOTS[0];
      render();
    };

  const starterBox = $("#searchList");
  if (
    starterBox &&
    !S.reference &&
    !String(starterBox.innerHTML || "").trim()
  ) {
    const mode = dataMode();
    if (mode === "offline" || (mode === "hybrid" && !token())) {
      const starters = V37_CATALOG?.searchMovies("", {
        sort_by: "popularity.desc",
      }) || [];
      starterBox.innerHTML = starters
        .slice(0, 8)
        .map((movie) =>
          arcadeMovieResultButton({ ...movie, media_type: "movie" }),
        )
        .join("");
      arcadeBindMovieResults();
    } else if (token()) {
      const renderId = ACTIVE_RENDER_ID;
      starterBox.innerHTML = '<div class="callout">Loading live movie banners and stats…</div>';
      void api("/discover/movie", {
        include_adult: "false",
        sort_by: "popularity.desc",
        page: 1,
        "vote_count.gte": 250,
      })
        .then((data) => {
          if (renderId !== ACTIVE_RENDER_ID || !document.body.contains(starterBox)) return;
          starterBox.innerHTML = (data.results || [])
            .slice(0, 12)
            .map((movie) =>
              arcadeMovieResultButton({ ...movie, media_type: "movie" }),
            )
            .join("");
          arcadeBindMovieResults();
        })
        .catch((error) => {
          if (renderId !== ACTIVE_RENDER_ID || !document.body.contains(starterBox)) return;
          starterBox.innerHTML = `<div class="callout bad">${arcadeEsc(error.message)}</div>`;
        });
    } else {
      starterBox.innerHTML = '<div class="callout warn">TMDB-only mode needs a token. Open Data to connect, or switch to Hybrid/Offline.</div>';
    }
  }
};

async function arcadeHydrateRawPeople(
  rawPeople,
  slot,
  credits = { cast: [], crew: [] },
  limit = 14,
) {
  const unique = [
    ...new Map(
      (rawPeople || []).filter(Boolean).map((raw) => [raw.id, raw]),
    ).values(),
  ].slice(0, limit);
  const settled = await Promise.allSettled(
    unique.map((raw) => hydrate(raw, slot, credits)),
  );
  return settled
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value);
}

function arcadeFilterActors(people, filters = {}) {
  return people.filter((p) => {
    const age = ageAtYear(p);
    if (filters.minAge != null && (age == null || age < filters.minAge))
      return false;
    if (filters.maxAge != null && (age == null || age > filters.maxAge))
      return false;
    if (filters.genre && safe(p.fit?.[filters.genre], 0) < 45) return false;
    return true;
  });
}

async function arcadeActorsFromMovie(movieQuery, slot) {
  const search = await api("/search/movie", {
    query: movieQuery,
    include_adult: "false",
  });
  const movie = search.results?.[0];
  if (!movie) return [];
  const details = await api(`/movie/${movie.id}`, {
    append_to_response: "credits",
    language: "en-US",
  });
  return arcadeHydrateRawPeople(
    (details.credits?.cast || []).slice(0, 18),
    slot,
    details.credits,
    14,
  );
}

async function arcadeActorsFromDiscover(filters, slot, target = 16) {
  const params = {
    include_adult: "false",
    sort_by: "popularity.desc",
    page: 1 + Math.floor(Math.random() * 4),
    "vote_count.gte": 80,
  };
  const genre = filters.genre || S.project.genre;
  if (genre) params.with_genres = GENRE_IDS[genre];
  if (filters.year) params.primary_release_year = filters.year;
  if (filters.yearFrom)
    params["primary_release_date.gte"] = `${filters.yearFrom}-01-01`;
  if (filters.yearTo)
    params["primary_release_date.lte"] = `${filters.yearTo}-12-31`;
  if (!filters.year && !filters.yearFrom)
    params["primary_release_date.gte"] =
      `${Math.max(1930, S.project.year - 20)}-01-01`;
  if (!filters.year && !filters.yearTo)
    params["primary_release_date.lte"] =
      `${Math.min(new Date().getFullYear(), S.project.year + 20)}-12-31`;

  const data = await api("/discover/movie", params);
  const movies = (data.results || []).slice(0, 5);
  const raw = [];
  for (const movie of movies) {
    try {
      const details = await api(`/movie/${movie.id}`, {
        append_to_response: "credits",
        language: "en-US",
      });
      for (const candidate of (details.credits?.cast || []).slice(0, 8))
        raw.push({ candidate, credits: details.credits });
    } catch {}
    if (raw.length >= target * 2) break;
  }
  const unique = [
    ...new Map(raw.map((item) => [item.candidate.id, item])).values(),
  ].slice(0, target);
  const settled = await Promise.allSettled(
    unique.map((item) => hydrate(item.candidate, slot, item.credits)),
  );
  return settled
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value);
}

async function arcadeSearchActors(filters, slot) {
  let people = [];
  if (filters.movie) {
    people = await arcadeActorsFromMovie(filters.movie, slot);
  } else if (filters.name) {
    const data = await api("/search/person", {
      query: filters.name,
      include_adult: "false",
    });
    people = await arcadeHydrateRawPeople(
      data.results || [],
      slot,
      { cast: [], crew: [] },
      14,
    );
  } else {
    people = await arcadeActorsFromDiscover(filters, slot, 18);
  }
  return arcadeFilterActors(people, filters).slice(0, 12);
}

async function arcadeSimilarActors(slot) {
  const original = arcadeOriginalForSlot(slot);
  const candidates = await arcadeActorsFromDiscover(
    { genre: S.project.genre },
    slot,
    28,
  );
  let originalPerson = null;
  if (original?.id) {
    try {
      originalPerson = await hydrate(
        { id: original.id },
        slot,
        S.referenceCredits || { cast: [], crew: [] },
      );
    } catch {}
  }
  const originalAge = originalPerson
    ? ageAtYear(originalPerson)
    : S.originalAges[slot];
  return candidates
    .filter((candidate) => candidate.tmdbId !== original?.id)
    .map((candidate) => {
      const age = ageAtYear(candidate);
      const ageDistance =
        age != null && originalAge != null ? Math.abs(age - originalAge) : 12;
      const attributeDistance = originalPerson
        ? Math.abs(candidate.craft - originalPerson.craft) * 0.22 +
          Math.abs(candidate.draw - originalPerson.draw) * 0.2
        : 0;
      const score =
        ageDistance * 1.5 +
        attributeDistance -
        safe(candidate.fit?.[S.project.genre], 50) * 0.22;
      return { candidate, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((item) => item.candidate);
}

function arcadeActorMediumLabel(p) {
  if (p.voiceOnly)
    return S.project.genre === "Animation"
      ? "Voice specialist · ideal medium"
      : "Voice specialist · live-action risk";
  if (safe(p.voiceShare) >= 0.45)
    return S.project.genre === "Animation"
      ? "Strong voice résumé"
      : "Voice-heavy résumé";
  return S.project.genre === "Animation"
    ? "Limited animation résumé"
    : "Live-action proven";
}
function arcadeStatCell(label, before, after) {
  const d = after - before;
  return `<div><span>${label}</span><b>${Math.round(after)}${Math.abs(d) >= 0.1 ? `<em class="${d >= 0 ? "positive" : "negative"}">${d >= 0 ? "+" : ""}${d.toFixed(1)}</em>` : ""}</b></div>`;
}
function arcadeCandidateCard(p, slot, compact = false) {
  const before = adjusted(p, slot, false),
    attrs = adjusted(p, slot, true),
    shortlisted = (S.shortlists[slot] || []).includes(p.id),
    audition = S.auditions[slot]?.personId === p.id ? S.auditions[slot] : null,
    selected = S.roster[slot] === p.id,
    badges = arcadeTalentBadges(p, slot),
    age = ageAtYear(p);
  let tier = "B",
    tierBefore = "B";
  try {
    tier = talentTier(p, slot);
    tierBefore = audition?.tierBeforeAudition || baseTalentTier(p, slot);
  } catch {}
  return `<article class="arcadeActorCard ${selected ? "selected" : ""} ${compact ? "compactCompare" : ""}"><div class="arcadeActorImage">${
    p.photo
      ? `<img src="${p.photo}" alt="">`
      : `<div class="fallback">${arcadeEsc(
          p.name
            .split(/\s+/)
            .map((x) => x[0])
            .join("")
            .slice(0, 2),
        )}</div>`
  }<div class="tier ${tier}">${tier}</div></div><div class="arcadeActorBody"><div class="arcadeActorName"><div><h3>${arcadeEsc(p.name)}</h3><span>${age != null ? `Age ${age}` : "Age unknown"} · ${Math.round(attrs.fit)}% fit</span></div>${selected ? '<b class="arcadeHiredFlag">HIRED</b>' : ""}</div><div class="arcadeMediumFit ${p.voiceOnly && S.project.genre !== "Animation" ? "bad" : p.voiceOnly ? "good" : ""}">${arcadeEsc(arcadeActorMediumLabel(p))}</div><div class="arcadeBadgeRow">${badges.map((b) => `<span title="${arcadeEsc(b.effect)}">${b.icon} ${arcadeEsc(b.name)}</span>`).join("")}</div><div class="arcadeQuickStats">${arcadeStatCell("Craft", before.craft, attrs.craft)}${arcadeStatCell("Draw", before.draw, attrs.draw)}${arcadeStatCell("Reliability", before.reliability, attrs.reliability)}${arcadeStatCell("Momentum", before.momentum, attrs.momentum)}${arcadeStatCell("Chemistry", before.chemistry, attrs.chemistry)}</div>${audition ? `<div class="arcadeAuditionRead"><b>Audition upgrade</b><span>${tierBefore !== tier ? `${tierBefore} → ${tier} tier` : "Stats permanently raised for this run."}</span></div>` : ""}<div class="arcadeActorActions"><button class="btn" data-short="${p.id}">${shortlisted ? "★ Shortlisted" : "☆ Shortlist"}</button><button class="btn" data-aud="${p.id}" ${!shortlisted || audition || arcadeAuditionCount() >= 3 ? "disabled" : ""}>Audition</button><button class="btn primary" data-hire="${p.id}">${selected ? "Selected" : "Hire"}</button></div>${compact ? "" : `<details><summary>Details</summary><p class="sub">${arcadeEsc((p.bio || "Biography unavailable.").slice(0, 230))}</p></details>`}</div></article>`;
}
function arcadeShortlistDrawer(slot) {
  const ids = S.shortlists[slot] || [];
  if (!ids.length)
    return `<div class="arcadeShortlistEmpty">Shortlist actors, then drag them into the comparison board. Auditions are shortlist-only.</div>`;
  return `<div class="arcadeShortlistStrip">${ids
    .map((id) => {
      const p = person(id);
      if (!p) return "";
      return `<div class="arcadeShortChip" draggable="true" data-drag-short="${p.id}">${p.photo ? `<img src="${p.photo}" alt="">` : "<span>?</span>"}<div><b>${arcadeEsc(p.name)}</b><small>${S.auditions[slot]?.personId === p.id ? "Auditioned" : `${Math.round(adjusted(p, slot).fit)}% fit · drag to compare`}</small></div><button data-compare-add="${p.id}">⇩</button><button data-short-remove="${p.id}">×</button></div>`;
    })
    .join("")}</div>`;
}
function arcadeComparisonBoard(slot) {
  const ids = (S.arcade.compareSlots?.[slot] || [])
    .filter((id) => person(id))
    .slice(0, 3);
  return `<section class="arcadeComparisonBoard"><div class="arcadeDrawerHead"><div><span class="mini">Comparison board</span><b>Up to 3 actors</b></div><span>Drop shortlisted actors here.</span></div><div class="arcadeCompareGrid">${Array.from(
    { length: 3 },
    (_, i) => {
      const p = person(ids[i]);
      return `<div class="arcadeCompareDrop ${p ? "filled" : ""}" data-compare-drop="${i}">${p ? `<button class="arcadeCompareRemove" data-compare-remove="${p.id}">×</button>${arcadeCandidateCard(p, slot, true)}` : `<div><b>Comparison ${i + 1}</b><span>Drag a shortlisted actor here</span></div>`}</div>`;
    },
  ).join("")}</div></section>`;
}
const LEGACY_HIRE_PAGE_V22 = async function arcadeHirePage() {
  ensureArcadeState();
  const slot = ARCADE_ACTOR_SLOTS.includes(S.activeSlot)
    ? S.activeSlot
    : ARCADE_ACTOR_SLOTS.find((x) => !S.roster[x]) || ARCADE_ACTOR_SLOTS[0];
  S.activeSlot = slot;
  const original = arcadeOriginalForSlot(slot);
  if (!S.sourcePools[slot]?.length) {
    shell(
      '<h1>Rolling three similar movies…</h1><div class="callout">Building the draft from real films in the same genre and era.</div>',
    );
    return ensurePool(slot);
  }
  const pools = S.sourcePools[slot] || [],
    index = clamp(S.sourceIndex[slot] || 0, 0, Math.max(0, pools.length - 1)),
    pool = pools[index],
    candidates = pool?.people || [];
  shell(
    `<div class="arcadePageHead"><div><div class="mini">Step 2 · ${ARCADE_ACTOR_SLOTS.indexOf(slot) + 1} of 5</div><h1>Cast ${arcadeEsc(original?.character || roleName(slot) || slot)}.</h1><p class="sub">Choose one of three similar films, shortlist candidates, compare them, then hire.</p></div><div class="arcadeTokenStack"><span>Auditions</span><b>${3 - arcadeAuditionCount()} left</b></div></div><div class="arcadeRoleTabs">${ARCADE_ACTOR_SLOTS.map(
      (as) => {
        const o = arcadeOriginalForSlot(as),
          h = person(S.roster[as]),
          img = h?.photo || o?.photo;
        return `<button class="arcadeRoleTab ${as === slot ? "active" : ""} ${h ? "done" : ""}" data-jump="${as}">${img ? `<img src="${img}" alt="">` : "<span>?</span>"}<small>${arcadeEsc(h?.name || o?.character || as)}</small></button>`;
      },
    ).join(
      "",
    )}</div><section class="arcadeDraftPicker"><div class="arcadeDrawerHead"><div><span class="mini">Movie draft</span><b>Pick a source cast</b></div><button class="btn" id="refreshDraft">Reroll all 3</button></div><div class="sourceTabs arcadeSourceTabs">${pools.map((e, i) => `<button class="sourceTab ${i === index ? "active" : ""}" data-source="${i}">${e.film.poster ? `<img src="${e.film.poster}" alt="">` : "<div></div>"}<span><b>${arcadeEsc(e.film.title)}</b><small>${arcadeEsc(e.film.genre)} · ${arcadeEsc(e.film.year)}</small></span></button>`).join("")}</div><div class="sourceHero arcadeDraftHero">${pool?.film.poster ? `<img src="${pool.film.poster}" alt="">` : "<div></div>"}<div><div class="mini">Current draft film</div><h2>${arcadeEsc(pool?.film.title || "Similar film")}</h2><div class="sub">${arcadeEsc(pool?.film.overview || "Choose from this film’s cast.")}</div></div></div></section><section class="arcadeShortlistDrawer"><div class="arcadeDrawerHead"><div><span class="mini">Shortlist</span><b>${(S.shortlists[slot] || []).length}/8 saved</b></div><span>Drag from here into the board below.</span></div>${arcadeShortlistDrawer(slot)}</section>${arcadeComparisonBoard(slot)}<div class="arcadeActorGrid">${candidates.map((p) => arcadeCandidateCard(p, slot)).join("")}</div><div class="arcadeFooterNav"><button class="btn" id="backProject">← Movie</button><button class="btn primary" id="toProduction" ${ARCADE_ACTOR_SLOTS.every((x) => S.roster[x]) ? "" : "disabled"}>Crew wheel →</button></div>`,
  );
  $$("[data-jump]").forEach(
    (b) =>
      (b.onclick = () => {
        S.activeSlot = b.dataset.jump;
        render();
      }),
  );
  $$("[data-source]").forEach(
    (b) =>
      (b.onclick = () => {
        S.sourceIndex[slot] = +b.dataset.source;
        S.tierCache[slot] = {};
        render();
      }),
  );
  $("#refreshDraft").onclick = async () => {
    delete S.sourcePools[slot];
    S.tierCache[slot] = {};
    await ensurePool(slot);
  };
  function addCompare(id, i = null) {
    if (!(S.shortlists[slot] || []).includes(id)) return;
    const cur = (S.arcade.compareSlots?.[slot] || []).filter(
      (x) => x !== id && person(x),
    );
    i == null ? cur.push(id) : cur.splice(i, 0, id);
    S.arcade.compareSlots[slot] = cur.slice(0, 3);
    render();
  }
  $$("[data-drag-short]").forEach(
    (c) =>
      (c.ondragstart = (e) =>
        e.dataTransfer.setData("text/plain", c.dataset.dragShort)),
  );
  $$("[data-compare-drop]").forEach((z) => {
    z.ondragover = (e) => {
      e.preventDefault();
      z.classList.add("dragover");
    };
    z.ondragleave = () => z.classList.remove("dragover");
    z.ondrop = (e) => {
      e.preventDefault();
      addCompare(e.dataTransfer.getData("text/plain"), +z.dataset.compareDrop);
    };
  });
  $$("[data-compare-add]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        addCompare(b.dataset.compareAdd);
      }),
  );
  $$("[data-compare-remove]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        S.arcade.compareSlots[slot] = (
          S.arcade.compareSlots[slot] || []
        ).filter((x) => x !== b.dataset.compareRemove);
        render();
      }),
  );
  $$("[data-short]").forEach(
    (b) =>
      (b.onclick = () => {
        const l = S.shortlists[slot] || [],
          id = b.dataset.short;
        if (l.includes(id)) {
          S.shortlists[slot] = l.filter((x) => x !== id);
          S.arcade.compareSlots[slot] = (
            S.arcade.compareSlots[slot] || []
          ).filter((x) => x !== id);
        } else if (l.length < 8) S.shortlists[slot] = [...l, id];
        else alert("The shortlist holds eight actors.");
        render();
      }),
  );
  $$("[data-short-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.shortRemove;
        S.shortlists[slot] = (S.shortlists[slot] || []).filter((x) => x !== id);
        S.arcade.compareSlots[slot] = (
          S.arcade.compareSlots[slot] || []
        ).filter((x) => x !== id);
        render();
      }),
  );
  $$("[data-aud]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.aud;
        if (
          !(S.shortlists[slot] || []).includes(id) ||
          arcadeAuditionCount() >= 3
        )
          return;
        ensureSeed();
        const c = person(id),
          fit = Math.round(baseAttrs(c, slot).fit),
          tierBeforeAudition = baseTalentTier(c, slot);
        S.auditions[slot] = {
          personId: id,
          fit,
          mods: arcadeAuditionMods(c, slot, fit),
          tierBeforeAudition,
          eligibleBeforeAudition: true,
        };
        render();
      }),
  );
  $$("[data-hire]").forEach(
    (b) =>
      (b.onclick = () => {
        S.roster[slot] = b.dataset.hire;
        const next = ARCADE_ACTOR_SLOTS.find((x) => !S.roster[x]);
        S.activeSlot = next || slot;
        render();
      }),
  );
  $("#backProject").onclick = () => {
    S.screen = 0;
    render();
  };
  $("#toProduction").onclick = () => {
    ensureSeed();
    S.screen = 2;
    render();
  };
};

async function arcadeBuildCrewPool(kind) {
  const isDirector = kind === "directors";
  const params = {
    include_adult: "false",
    sort_by: "vote_count.desc",
    with_genres: GENRE_IDS[S.project.genre],
    "primary_release_date.gte": `${Math.max(1930, S.project.year - 25)}-01-01`,
    "primary_release_date.lte": `${Math.min(new Date().getFullYear(), S.project.year + 25)}-12-31`,
    page: 1 + Math.floor(Math.random() * 5),
  };
  const data = await api("/discover/movie", params);
  const entries = [];
  for (const movie of (data.results || []).slice(0, 8)) {
    try {
      const details = await api(`/movie/${movie.id}`, {
        append_to_response: "credits",
        language: "en-US",
      });
      const raw = (details.credits?.crew || []).filter((credit) =>
        isDirector
          ? credit.job === "Director"
          : ["Writer", "Screenplay", "Story"].includes(credit.job),
      );
      for (const candidate of raw)
        entries.push({ candidate, credits: details.credits });
    } catch {}
    if (entries.length >= 18) break;
  }
  const unique = [
    ...new Map(entries.map((item) => [item.candidate.id, item])).values(),
  ].slice(0, 12);
  const slot = isDirector ? "Director 1" : "Writer 1";
  const settled = await Promise.allSettled(
    unique.map((item) => hydrate(item.candidate, slot, item.credits)),
  );
  const people = settled
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value);
  const random = rng(`crew-${kind}-${Date.now()}`);
  return people.sort(() => random() - 0.5).slice(0, 5);
}

function arcadeCrewSelected(kind, id) {
  const key = kind === "directors" ? "selectedDirectors" : "selectedWriters";
  return S.arcade.crew[key].includes(id);
}

function arcadeSyncCrewRoster() {
  for (const slot of Object.keys(S.roster)) {
    if (slot.startsWith("Director") || slot.startsWith("Writer"))
      delete S.roster[slot];
  }
  S.project.directors = Math.max(
    1,
    S.arcade.crew.selectedDirectors.length || 1,
  );
  S.project.writers = Math.max(1, S.arcade.crew.selectedWriters.length || 1);
  S.arcade.crew.selectedDirectors.forEach((id, index) => {
    S.roster[`Director ${index + 1}`] = id;
  });
  S.arcade.crew.selectedWriters.forEach((id, index) => {
    S.roster[`Writer ${index + 1}`] = id;
  });
}

function arcadeToggleCrew(kind, id) {
  const key = kind === "directors" ? "selectedDirectors" : "selectedWriters";
  const list = S.arcade.crew[key];
  if (list.includes(id)) {
    S.arcade.crew[key] = list.filter((item) => item !== id);
  } else {
    const total =
      S.arcade.crew.selectedDirectors.length +
      S.arcade.crew.selectedWriters.length;
    if (list.length >= 2) return alert(`You can choose at most two ${kind}.`);
    if (total >= 3)
      return alert(
        "The arcade package allows three total writer/director slots.",
      );
    S.arcade.crew[key] = [...list, id];
  }
  arcadeSyncCrewRoster();
  render();
}

function arcadeCrewCard(p, kind) {
  const slot = kind === "directors" ? "Director 1" : "Writer 1";
  const attrs = adjusted(p, slot);
  const selected = arcadeCrewSelected(kind, p.id);
  let tier = "B";
  try {
    tier = baseTalentTier(p, slot);
  } catch {}
  return `<button class="arcadeCrewCard ${selected ? "selected" : ""}" data-crew-kind="${kind}" data-crew-id="${p.id}">
    ${p.photo ? `<img src="${p.photo}" alt="">` : '<span class="arcadeCrewFallback">GL</span>'}
    <div><b>${arcadeEsc(p.name)}</b><small>${Math.round(attrs.craft)} craft · ${Math.round(attrs.fit)}% genre fit</small><span>${selected ? "✓ Selected" : "Choose"}</span></div>
    <strong class="tier ${tier}">${tier}</strong>
  </button>`;
}

function arcadeChoiceCards(choices, selected, attribute) {
  return Object.entries(choices)
    .map(([name, choice]) => {
      const recommended = choice.best.includes(S.project.genre);
      return `<button class="arcadeCreativeChoice ${selected === name ? "selected" : ""}" data-${attribute}="${name}">
      <div class="arcadeCreativeIcon">${choice.icon}</div>
      <div><div class="arcadeCreativeTitle"><b>${arcadeEsc(name)}</b>${recommended ? "<span>Genre fit</span>" : ""}</div><p>${arcadeEsc(choice.description)}</p><div class="chipRow">${choice.tags.map((tag) => `<span class="chip">${tag}</span>`).join("")}</div></div>
    </button>`;
    })
    .join("");
}

function arcadeCrewSearchModal() {
  if (S.arcade.crew.manualUsed) return;
  modal(`<div class="arcadeModalHead"><div><div class="mini">One manual add</div><h2>Add a writer or director</h2></div><button class="balanceClose" data-close>×</button></div>
    <div class="formgrid"><div><label>Role</label><select id="manualCrewKind"><option value="directors">Director</option><option value="writers">Writer</option></select></div><div><label>Name</label><input id="manualCrewName" placeholder="Search a person"></div></div>
    <button class="btn primary" id="manualCrewSearch">Search credits</button><div id="manualCrewResults" class="searchResults"></div>`);
  $("#manualCrewSearch").onclick = async () => {
    const box = $("#manualCrewResults");
    const kind = $("#manualCrewKind").value;
    const query = $("#manualCrewName").value.trim();
    box.innerHTML = '<div class="callout">Checking credits…</div>';
    try {
      const data = await api("/search/person", {
        query,
        include_adult: "false",
      });
      const valid = [];
      for (const raw of (data.results || []).slice(0, 8)) {
        try {
          const details = await api(`/person/${raw.id}`, {
            append_to_response: "combined_credits",
            language: "en-US",
          });
          const jobs = details.combined_credits?.crew || [];
          const works = jobs.some((credit) =>
            kind === "directors"
              ? credit.job === "Director"
              : ["Writer", "Screenplay", "Story"].includes(credit.job),
          );
          if (!works) continue;
          const p = await hydrate(
            raw,
            kind === "directors" ? "Director 1" : "Writer 1",
            { cast: [], crew: [] },
          );
          if (p) valid.push(p);
        } catch {}
      }
      box.innerHTML = valid.length
        ? valid
            .map(
              (p) =>
                `<button class="searchItem" data-manual-person="${p.id}" data-manual-kind="${kind}">${p.photo ? `<img src="${p.photo}" alt="">` : "<div></div>"}<div><b>${arcadeEsc(p.name)}</b><span class="sub">Verified ${kind === "directors" ? "director" : "writer"} credit</span></div><strong>Add</strong></button>`,
            )
            .join("")
        : '<div class="callout bad">No matching credits found.</div>';
      $$("[data-manual-person]").forEach(
        (button) =>
          (button.onclick = () => {
            const targetKind = button.dataset.manualKind;
            const poolKey =
              targetKind === "directors" ? "directorsPool" : "writersPool";
            if (!S.arcade.crew[poolKey].includes(button.dataset.manualPerson))
              S.arcade.crew[poolKey].unshift(button.dataset.manualPerson);
            S.arcade.crew.manualUsed = true;
            closeModal();
            arcadeToggleCrew(targetKind, button.dataset.manualPerson);
          }),
      );
    } catch (error) {
      box.innerHTML = `<div class="callout bad">${arcadeEsc(error.message)}</div>`;
    }
  };
}

const LEGACY_PRODUCTION_PAGE_V22 = function arcadeProductionPage() {
  ensureArcadeState();
  const crew = S.arcade.crew;
  const directorPeople = crew.directorsPool.map(person).filter(Boolean);
  const writerPeople = crew.writersPool.map(person).filter(Boolean);
  const totalSelected =
    crew.selectedDirectors.length + crew.selectedWriters.length;
  const crewReady =
    crew.selectedDirectors.length >= 1 &&
    crew.selectedWriters.length >= 1 &&
    totalSelected <= 3;
  const creativeReady = Boolean(S.arcade.musicChoice && S.arcade.visualChoice);

  shell(`<div class="arcadePageHead"><div><div class="mini">Step 3</div><h1>Roll the crew. Set the style.</h1><p class="sub">One reel for directors, one for writers, then two fast creative calls.</p></div><div class="arcadeTokenStack"><span>Package</span><b>${totalSelected}/3 crew</b></div></div>

    ${
      !crew.spun
        ? `<section class="arcadeWheelIntro"><div class="arcadeBigReel">↕</div><h2>Genre crew wheel</h2><p>Roll five directors and five writers with credits in ${arcadeEsc(S.project.genre)} movies.</p><button class="btn warn" id="spinCrew">ROLL THE REELS</button></section>`
        : `<section class="arcadeCrewWheels ${crew.spinning ? "spinning" : ""}">
      <div class="arcadeCrewColumn"><div class="arcadeCrewColumnHead"><div><span class="mini">Reel A</span><h2>Directors</h2></div><button class="btn" data-respin="directors" ${crew.respinUsed ? "disabled" : ""}>↻ Respin</button></div><div class="arcadeCrewReel">${directorPeople.map((p) => arcadeCrewCard(p, "directors")).join("")}</div></div>
      <div class="arcadeCrewColumn"><div class="arcadeCrewColumnHead"><div><span class="mini">Reel B</span><h2>Writers</h2></div><button class="btn" data-respin="writers" ${crew.respinUsed ? "disabled" : ""}>↻ Respin</button></div><div class="arcadeCrewReel">${writerPeople.map((p) => arcadeCrewCard(p, "writers")).join("")}</div></div>
    </section>
    <div class="arcadeCrewRules"><span>Choose 1+ director</span><span>Choose 1+ writer</span><span>Maximum 3 total</span><button class="btn" id="manualCrew" ${crew.manualUsed ? "disabled" : ""}>+ Manual search</button></div>`
    }

    <section class="arcadeCreativeBoard ${crew.spun ? "" : "locked"}">
      <div class="arcadeBoardHead"><div><span class="mini">Fast creative call 1</span><h2>Music identity</h2></div><span>Pick one</span></div>
      <div class="arcadeCreativeGrid">${arcadeChoiceCards(ARCADE_MUSIC_CHOICES, S.arcade.musicChoice, "music")}</div>
      <div class="arcadeBoardHead"><div><span class="mini">Fast creative call 2</span><h2>Camera language</h2></div><span>Pick one</span></div>
      <div class="arcadeCreativeGrid">${arcadeChoiceCards(ARCADE_VISUAL_CHOICES, S.arcade.visualChoice, "visual")}</div>
    </section>

    <div class="arcadeFooterNav"><button class="btn" id="backHire">← Cast</button><button class="btn primary" id="toMarketing" ${crewReady && creativeReady ? "" : "disabled"}>Marketing report →</button></div>`);

  if ($("#spinCrew"))
    $("#spinCrew").onclick = async () => {
      const button = $("#spinCrew");
      button.disabled = true;
      button.textContent = "ROLLING…";
      try {
        const [directors, writers] = await Promise.all([
          arcadeBuildCrewPool("directors"),
          arcadeBuildCrewPool("writers"),
        ]);
        S.arcade.crew.directorsPool = directors.map((p) => p.id);
        S.arcade.crew.writersPool = writers.map((p) => p.id);
        v38RecordCrewRollTelemetry("directors", directors);
        v38RecordCrewRollTelemetry("writers", writers);
        S.arcade.crew.spun = true;
        S.arcade.crew.spinning = true;
        render();
        setTimeout(() => {
          S.arcade.crew.spinning = false;
          save();
          document
            .querySelector(".arcadeCrewWheels")
            ?.classList.remove("spinning");
        }, 850);
      } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = "ROLL THE REELS";
      }
    };

  $$("[data-crew-id]").forEach(
    (button) =>
      (button.onclick = () =>
        arcadeToggleCrew(button.dataset.crewKind, button.dataset.crewId)),
  );
  $$("[data-respin]").forEach(
    (button) =>
      (button.onclick = async () => {
        if (S.arcade.crew.respinUsed) return;
        const kind = button.dataset.respin;
        button.disabled = true;
        button.textContent = "Rolling…";
        try {
          const people = await arcadeBuildCrewPool(kind);
          S.arcade.crew[
            kind === "directors" ? "directorsPool" : "writersPool"
          ] = people.map((p) => p.id);
          v38RecordCrewRollTelemetry(kind, people);
          S.arcade.crew[
            kind === "directors" ? "selectedDirectors" : "selectedWriters"
          ] = [];
          S.arcade.crew.respinUsed = true;
          arcadeSyncCrewRoster();
          render();
        } catch (error) {
          alert(error?.message || "The crew reel could not be refreshed.");
          button.disabled = false;
          button.textContent = "↻ Respin";
        }
      }),
  );
  if ($("#manualCrew")) $("#manualCrew").onclick = arcadeCrewSearchModal;
  $$("[data-music]").forEach(
    (button) =>
      (button.onclick = () => {
        S.arcade.musicChoice = button.dataset.music;
        render();
      }),
  );
  $$("[data-visual]").forEach(
    (button) =>
      (button.onclick = () => {
        S.arcade.visualChoice = button.dataset.visual;
        render();
      }),
  );
  $("#backHire").onclick = () => {
    S.screen = 1;
    render();
  };
  $("#toMarketing").onclick = () => {
    arcadeSyncCrewRoster();
    S.screen = 3;
    render();
  };
};

const ARCADE_MARKETING_PRESETS = {
  "Prestige Focus": {
    awareness: 42,
    fandom: 38,
    prestige: 88,
    base: "Prestige Campaign",
  },
  "Wide Release Blitz": {
    awareness: 90,
    fandom: 52,
    prestige: 28,
    base: "Mass Awareness",
  },
  "Fanbase Ignition": {
    awareness: 58,
    fandom: 92,
    prestige: 34,
    base: "Fan Convention",
  },
};
function arcadeCampaignRecommendations() {
  const actors = ARCADE_ACTOR_SLOTS.map((s) => person(S.roster[s])).filter(
      Boolean,
    ),
    avg = (k) =>
      actors.length
        ? average(actors.map((p, i) => adjusted(p, ARCADE_ACTOR_SLOTS[i])[k]))
        : 55,
    draw = avg("draw"),
    craft = avg("craft"),
    fit = avg("fit");
  return [
    {
      name: "Prestige Focus",
      score:
        craft +
        (["Drama", "History", "War", "Crime", "Documentary"].includes(
          S.project.genre,
        )
          ? 24
          : 0),
      reason: `Craft is ${Math.round(craft)}, so reviews and awards are a credible hook.`,
    },
    {
      name: "Wide Release Blitz",
      score:
        draw +
        (["Studio Event", "Tentpole"].includes(S.project.scale) ? 22 : 4),
      reason: `Cast draw is ${Math.round(draw)}, supporting broad awareness.`,
    },
    {
      name: "Fanbase Ignition",
      score:
        fit +
        ([
          "Action",
          "Adventure",
          "Fantasy",
          "Sci-Fi",
          "Horror",
          "Animation",
        ].includes(S.project.genre)
          ? 24
          : 4),
      reason: `${S.project.genre} fit is ${Math.round(fit)}%, so targeted fandom can carry the pitch.`,
    },
  ].sort((a, b) => b.score - a.score);
}
function arcadeCreativeEffects() {
  const music =
    ARCADE_MUSIC_CHOICES[S.arcade.musicChoice] ||
    ARCADE_MUSIC_CHOICES["Genre Pulse"];
  const visual =
    ARCADE_VISUAL_CHOICES[S.arcade.visualChoice] ||
    ARCADE_VISUAL_CHOICES["Classical Coverage"];
  const random = rng("arcade-creative");
  const musicFit = music.best.includes(S.project.genre) ? 5 : -2;
  const visualFit = visual.best.includes(S.project.genre) ? 5 : -2;
  const musicSwing = music.variance
    ? (random() * 2 - 1) * music.variance * ARCADE_QUICK_TUNING.randomness
    : 0;
  const marketing = {
    awareness: 60,
    fandom: 55,
    prestige: 45,
    ...(S.arcade.marketingSliders || {}),
  };
  const marketingGross =
    1 + (marketing.awareness - 50) / 700 + (marketing.fandom - 50) / 1000;
  const marketingAudience = (marketing.fandom - 50) / 18;
  const marketingCritic = (marketing.prestige - 50) / 20;
  const marketingAwards = (marketing.prestige - 50) / 12;
  return {
    music,
    visual,
    musicFit,
    visualFit,
    musicSwing,
    critic: music.critic + visual.critic + musicSwing * 0.35 + marketingCritic,
    audience:
      music.audience + visual.audience + musicSwing * 0.25 + marketingAudience,
    gross: music.gross * visual.gross * marketingGross,
    awards: music.awards + visual.awards + marketingAwards,
    musicScore: clamp(
      music.music +
        musicFit +
        musicSwing +
        (S.simulation?.audience || 70) * 0.04,
    ),
    visualScore: clamp(
      visual.visuals + visualFit + (S.simulation?.critic || 70) * 0.035,
    ),
  };
}

function arcadeGradeLetter(score) {
  if (score >= 93) return "S";
  if (score >= 88) return "A+";
  if (score >= 83) return "A";
  if (score >= 78) return "B+";
  if (score >= 72) return "B";
  if (score >= 66) return "C+";
  if (score >= 60) return "C";
  return "D";
}

function arcadeCalculateScores(simulation, effects) {
  const actors = ARCADE_ACTOR_SLOTS.map((slot) => ({
    slot,
    p: person(S.roster[slot]),
  })).filter((item) => item.p);
  const crewSlots = slotList().filter(
    (slot) => slot.startsWith("Director") || slot.startsWith("Writer"),
  );
  const crew = crewSlots
    .map((slot) => ({ slot, p: person(S.roster[slot]) }))
    .filter((item) => item.p);
  const actorCraft = actors.length
    ? average(actors.map((item) => adjusted(item.p, item.slot).craft))
    : 55;
  const actorFit = actors.length
    ? average(actors.map((item) => adjusted(item.p, item.slot).fit))
    : 55;
  const crewCraft = crew.length
    ? average(crew.map((item) => adjusted(item.p, item.slot).craft))
    : 55;
  const crewFit = crew.length
    ? average(crew.map((item) => adjusted(item.p, item.slot).fit))
    : 55;
  const referenceRatio =
    S.reference?.revenueM > 0 ? simulation.world / S.reference.revenueM : 1;
  const badges = arcadeBadgeTotals();

  const commercial = clamp(
    52 +
      simulation.roi * 34 +
      Math.log2(Math.max(0.25, referenceRatio)) * 10 +
      badges.commercial,
  );
  const craft = clamp(
    simulation.critic * 0.42 +
      actorCraft * 0.28 +
      crewCraft * 0.22 +
      crewFit * 0.08 +
      badges.craft,
  );
  const visuals = clamp(
    effects.visual.visuals +
      effects.visualFit +
      simulation.critic * 0.08 +
      crewCraft * 0.06,
  );
  const music = clamp(
    effects.music.music +
      effects.musicFit +
      effects.musicSwing +
      simulation.audience * 0.07,
  );
  const audience = clamp(
    simulation.audience * 0.82 + actorFit * 0.18 + badges.audience,
  );
  const categories = { commercial, craft, visuals, music, audience };
  const weights =
    ARCADE_GENRE_WEIGHTS[S.project.genre] || ARCADE_DEFAULT_GENRE_WEIGHTS.Drama;
  const weightTotal =
    Object.values(weights).reduce((sum, value) => sum + safe(value), 0) || 100;
  const total = Object.entries(categories).reduce(
    (sum, [key, value]) => sum + (value * safe(weights[key])) / weightTotal,
    0,
  );
  return {
    categories,
    weights,
    total: clamp(total),
    grade: arcadeGradeLetter(total),
  };
}

function arcadeRunBadges(simulation, scores) {
  const badges = [];
  const completedAuditions = v24AllAuditions();
  const avgFit = average(
    ARCADE_ACTOR_SLOTS.map((slot) => person(S.roster[slot]))
      .filter(Boolean)
      .map((p, index) => adjusted(p, ARCADE_ACTOR_SLOTS[index]).fit),
  );
  if (avgFit >= 80)
    badges.push({
      icon: "🎯",
      name: "Perfect Recast",
      text: "The cast matched the genre and roles.",
    });
  if (
    completedAuditions.length === 3 &&
    average(
      completedAuditions.map((aud) =>
        average(Object.values(aud.mods || {})),
      ),
    ) > 1
  )
    badges.push({
      icon: "🎭",
      name: "Casting Instinct",
      text: "All three auditions paid off.",
    });
  if (scores.categories.visuals >= 86)
    badges.push({
      icon: "📸",
      name: "Frame Stealer",
      text: "The visual identity became a headline.",
    });
  if (scores.categories.music >= 86)
    badges.push({
      icon: "🎵",
      name: "Soundtrack Escape",
      text: "The music became bigger than the assignment.",
    });
  if (simulation.roi >= 0.58)
    badges.push({
      icon: "💸",
      name: "Money Printer",
      text: "The studio economics landed hard.",
    });
  if (simulation.critic >= 86)
    badges.push({
      icon: "🖋️",
      name: "Critic Bait, Affectionate",
      text: "Reviewers fully bought the creative package.",
    });
  if (simulation.audience >= 88)
    badges.push({
      icon: "🍿",
      name: "Crowd Roar",
      text: "Audience response carried the release.",
    });
  if (scores.total >= 90)
    badges.push({
      icon: "🟢",
      name: "GREENLIT Legend",
      text: "An elite all-around run.",
    });
  return badges.slice(0, 6);
}

const ARCADE_ORIGINAL_SIMULATE = simulate;
simulate = function arcadeSimulate() {
  ensureArcadeState();
  const simulation = ARCADE_ORIGINAL_SIMULATE();
  const effects = arcadeCreativeEffects();
  const worldMultiplier = effects.gross * ARCADE_QUICK_TUNING.boxOffice;
  simulation.critic = clamp(simulation.critic + effects.critic);
  simulation.audience = clamp(simulation.audience + effects.audience);
  simulation.world = Math.max(0, simulation.world * worldMultiplier);
  simulation.opening = Math.max(
    0,
    simulation.opening * Math.sqrt(worldMultiplier),
  );
  simulation.domestic = Math.max(0, simulation.domestic * worldMultiplier);
  simulation.theatricalRevenue = simulation.world * simulation.studioShare;
  simulation.distributionShare = Math.max(
    0,
    simulation.world - simulation.theatricalRevenue,
  );
  simulation.ancillary = simulation.ancillary * (1 + effects.audience / 100);
  simulation.backend = simulation.world * safe(scaleEconomy().backendRate);
  simulation.totalCost =
    safe(simulation.budget) +
    safe(simulation.marketingCost) +
    safe(simulation.overhead) +
    safe(simulation.backend) +
    safe(simulation.overrun);
  simulation.totalStudioRevenue =
    simulation.theatricalRevenue + simulation.ancillary;
  simulation.profit = simulation.totalStudioRevenue - simulation.totalCost;
  const outcome = classifyOutcome({
    gross: simulation.world,
    profit: simulation.profit,
    totalCost: simulation.totalCost,
    productionBudget: simulation.budget,
  });
  simulation.roi = outcome.roi;
  simulation.outcome = outcome.label;
  simulation.awards.awardScore = Math.round(
    safe(simulation.awards.awardScore) +
      effects.awards * ARCADE_QUICK_TUNING.awards,
  );
  simulation.creative = {
    musicChoice: S.arcade.musicChoice,
    visualChoice: S.arcade.visualChoice,
    musicScore: clamp(
      effects.music.music +
        effects.musicFit +
        effects.musicSwing +
        simulation.audience * 0.07,
    ),
    visualScore: clamp(
      effects.visual.visuals + effects.visualFit + simulation.critic * 0.08,
    ),
  };
  simulation.arcadeScores = arcadeCalculateScores(simulation, effects);
  simulation.runBadges = arcadeRunBadges(simulation, simulation.arcadeScores);
  S.arcade.finalScores = simulation.arcadeScores;
  S.arcade.runBadges = simulation.runBadges;
  return simulation;
};

// Optional browser-console bridge for testing custom datasets and UI states.
// It is intentionally enabled only when the page URL contains ?debug=1.
if (
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "1"
) {
  window.GREENLIT_ARCADE_DEBUG = {
    state: () => S,
    patch: (patch) => {
      S = { ...S, ...patch };
      ensureArcadeState();
      render();
      return S;
    },
    render: () => render(),
  };
}

ensureArcadeState();

// Initial rendering is intentionally deferred until the end of this module.
// Later version sections replace page renderers such as productionPage.
// Rendering here would show an obsolete screen until another event rerenders it.
// =============================================================================
// GREENLIT ARCADE V23 — MOVIES + SHOWS, CREATIVE DIRECTION, FIT AND IDENTITIES
// =============================================================================
const ARCADE_V23_VERSION = "23.0";
const ARCADE_DIRECTIONS = {
  Faithful: { fit: 1.35, originality: -3, craft: 2, audience: 2 },
  "Modern Reimagining": { fit: 1, originality: 2, craft: 1, audience: 1 },
  "Bold Reinvention": { fit: 0.55, originality: 7, craft: 3, audience: -1 },
};

const ARCADE_SHOW_RELEASES = {
  Weekly: { opening: 0.9, growth: 1.12, finale: 6, completion: 3 },
  Binge: { opening: 1.12, growth: 0.92, finale: 1, completion: -1 },
};

const ARCADE_ORIGINAL_ENSURE_STATE_V23 = ensureArcadeState;
ensureArcadeState = function ensureArcadeStateV23() {
  ARCADE_ORIGINAL_ENSURE_STATE_V23();
  S.arcade.version = ARCADE_V23_VERSION;
  S.arcade.projectKind =
    S.arcade.projectKind || (S.reference?.type === "tv" ? "show" : "movie");
  S.arcade.creativeDirection =
    S.arcade.creativeDirection || "Modern Reimagining";
  S.arcade.fitMode = S.arcade.fitMode || "Arcade";
  S.arcade.releaseModel = S.arcade.releaseModel || "Weekly";
  S.arcade.episodeCount = safe(S.arcade.episodeCount, 8);
  S.arcade.episodeLength = safe(S.arcade.episodeLength, 50);
  S.arcade.identity = S.arcade.identity || null;
  S.arcade.originality = safe(S.arcade.originality, 50);
};

const ARCADE_ORIGINAL_HYDRATE_V23 = hydrate;
hydrate = async function hydrateV23(x, slot, credits) {
  const personResult = await ARCADE_ORIGINAL_HYDRATE_V23(x, slot, credits);
  if (!personResult) return null;
  if (personResult.gender == null) {
    try {
      const details = await api(`/person/${x.id}`, { language: "en-US" });
      personResult.gender = safe(details.gender, 0);
      personResult.department = details.known_for_department || "";
    } catch {
      personResult.gender = 0;
    }
  }
  return personResult;
};

const ARCADE_ORIGINAL_CAPTURE_CAST_V23 = arcadeCaptureOriginalCast;
arcadeCaptureOriginalCast = function arcadeCaptureOriginalCastV23() {
  ARCADE_ORIGINAL_CAPTURE_CAST_V23();
  const cast = (S.referenceCredits?.cast || []).slice(0, 5);
  S.arcade.originalCast = (S.arcade.originalCast || []).map((entry, index) => ({
    ...entry,
    gender: safe(cast[index]?.gender, 0),
  }));
};

function arcadeIsShow() {
  return S.arcade.projectKind === "show" || S.reference?.type === "tv";
}

function arcadeDirectionConfig() {
  return (
    ARCADE_DIRECTIONS[S.arcade.creativeDirection] ||
    ARCADE_DIRECTIONS["Modern Reimagining"]
  );
}

function arcadeStrictFitAdjustment(p, slot) {
  if (!ARCADE_ACTOR_SLOTS.includes(slot)) return 0;
  const original = arcadeOriginalForSlot(slot);
  const age = ageAtYear(p);
  const originalAge = S.originalAges?.[slot];
  let score = 0;
  if (S.arcade.fitMode === "Realistic") {
    if (age != null && originalAge != null) {
      const difference = Math.abs(age - originalAge);
      score +=
        difference <= 3
          ? 8
          : difference <= 8
            ? 2
            : difference <= 15
              ? -10
              : -22;
    }
    if (original?.gender && p.gender)
      score += original.gender === p.gender ? 7 : -18;
  } else {
    if (age != null && originalAge != null)
      score += Math.abs(age - originalAge) <= 10 ? 3 : -3;
    if (original?.gender && p.gender && original.gender !== p.gender)
      score -= 2;
  }
  return score * arcadeDirectionConfig().fit;
}

const ARCADE_BASE_ATTRS_V22 = baseAttrs;
baseAttrs = function baseAttrsV23(p, slot) {
  const attrs = ARCADE_BASE_ATTRS_V22(p, slot);
  if (ARCADE_ACTOR_SLOTS.includes(slot))
    attrs.fit = clamp(attrs.fit + arcadeStrictFitAdjustment(p, slot));
  return attrs;
};

function arcadeRoleFitLabel(p, slot) {
  const original = arcadeOriginalForSlot(slot);
  const age = ageAtYear(p);
  const target = S.originalAges?.[slot];
  const genderNames = { 1: "Woman", 2: "Man", 3: "Nonbinary" };
  const notes = [];
  if (age != null && target != null) notes.push(`${age} vs target ${target}`);
  if (S.arcade.fitMode === "Realistic" && original?.gender)
    notes.push(
      `${genderNames[p.gender] || "Unknown"} / target ${genderNames[original.gender] || "Unknown"}`,
    );
  notes.push(arcadeActorMediumLabel(p));
  return notes.join(" · ");
}

function arcadeCrewLabels() {
  return arcadeIsShow()
    ? {
        director: "Episode Director",
        writer: "Writers’ Room",
        captain: "Showrunner",
      }
    : { director: "Director", writer: "Writer", captain: "Director" };
}

function arcadeIdentityFor(simulation, scores) {
  const c = scores.categories || {};
  const commercial = safe(c.commercial),
    craft = safe(c.craft),
    visuals = safe(c.visuals),
    music = safe(c.music),
    audience = safe(c.audience);
  if (arcadeIsShow() && simulation.renewalOdds >= 82 && audience >= 78)
    return {
      icon: "📺",
      name: "Renewal Machine",
      text: "Built to keep viewers and survive another season.",
    };
  if (commercial >= 90 && audience >= 82)
    return {
      icon: "🌍",
      name: "Global Phenomenon",
      text: "Huge reach and a crowd-sized pulse.",
    };
  if (craft >= 88 && simulation.critic >= 84)
    return {
      icon: "🎭",
      name: "Oscar Darling",
      text: "Prestige, execution and reviews all aligned.",
    };
  if (visuals >= 88 && commercial >= 75)
    return {
      icon: "💥",
      name: "Popcorn Spectacle",
      text: "Big images, big moments, very little whispering.",
    };
  if (music >= 88)
    return {
      icon: "🎼",
      name: "Musical Masterpiece",
      text: "The score became part of the project’s identity.",
    };
  if (audience >= 88 && commercial < 72)
    return {
      icon: "👥",
      name: arcadeIsShow() ? "Comfort Classic" : "Cult Classic",
      text: "The audience loved it more deeply than broadly.",
    };
  if (S.arcade.creativeDirection === "Bold Reinvention" && craft >= 76)
    return {
      icon: "🧪",
      name: "Experimental Gem",
      text: "A risky reinterpretation that found a creative reason to exist.",
    };
  if (commercial >= 82 && craft < 62)
    return {
      icon: "🍿",
      name: "Popcorn Hit",
      text: "The business worked even when subtlety took the day off.",
    };
  if (simulation.critic < 45 && audience >= 70)
    return {
      icon: "💀",
      name: "So Bad It’s Good",
      text: "Reviewers panicked. Viewers made memes.",
    };
  return {
    icon: "🎬",
    name: "Studio Original",
    text: "A balanced project with its own recognizable profile.",
  };
}

const ARCADE_SCORE_V22 = arcadeCalculateScores;
arcadeCalculateScores = function arcadeCalculateScoresV23(simulation, effects) {
  const result = ARCADE_SCORE_V22(simulation, effects);
  const direction = arcadeDirectionConfig();
  const avgFit = average(
    ARCADE_ACTOR_SLOTS.map((slot) => person(S.roster[slot]))
      .filter(Boolean)
      .map((p, i) => adjusted(p, ARCADE_ACTOR_SLOTS[i]).fit),
  );
  result.categories.craft = clamp(
    result.categories.craft + direction.craft + (avgFit - 65) * 0.08,
  );
  result.categories.audience = clamp(
    result.categories.audience + direction.audience + (avgFit - 65) * 0.07,
  );
  if (S.arcade.creativeDirection === "Bold Reinvention")
    result.categories.visuals = clamp(result.categories.visuals + 4);
  if (arcadeIsShow()) {
    result.categories.commercial = clamp(
      (safe(simulation.completionRate, 60) + safe(simulation.renewalOdds, 50)) /
        2,
    );
    result.categories.audience = clamp(
      (result.categories.audience + safe(simulation.finaleSatisfaction, 60)) /
        2,
    );
  }
  const weights = result.weights;
  result.total = clamp(
    Object.entries(result.categories).reduce(
      (sum, [key, value]) => sum + (value * safe(weights[key])) / 100,
      0,
    ),
  );
  result.grade = arcadeGradeLetter(result.total);
  return result;
};

const ARCADE_SIMULATE_V22 = simulate;
simulate = function simulateV23() {
  const simulation = ARCADE_SIMULATE_V22();
  const direction = arcadeDirectionConfig();
  simulation.critic = clamp(
    simulation.critic + direction.craft + direction.originality * 0.25,
  );
  simulation.audience = clamp(simulation.audience + direction.audience);
  if (arcadeIsShow()) {
    const model =
      ARCADE_SHOW_RELEASES[S.arcade.releaseModel] ||
      ARCADE_SHOW_RELEASES.Weekly;
    const lengthRisk = Math.max(0, S.arcade.episodeCount - 10) * 1.7;
    simulation.pilotScore = clamp(
      (simulation.opening / Math.max(1, simulation.budget)) *
        105 *
        model.opening +
        simulation.audience * 0.35,
    );
    simulation.completionRate = clamp(
      48 +
        simulation.audience * 0.42 +
        model.completion -
        lengthRisk +
        (S.arcade.episodeLength <= 55 ? 3 : -2),
    );
    simulation.audienceGrowth = clamp(
      (simulation.vars?.wom || 60) * model.growth +
        simulation.audience * 0.2 -
        20,
    );
    simulation.finaleSatisfaction = clamp(
      simulation.critic * 0.42 +
        simulation.audience * 0.38 +
        model.finale +
        (S.project.writers > 1 ? 3 : 0),
    );
    simulation.renewalOdds = clamp(
      simulation.completionRate * 0.34 +
        simulation.audienceGrowth * 0.25 +
        simulation.finaleSatisfaction * 0.25 +
        simulation.critic * 0.16,
    );
    simulation.world = simulation.world * 0.55;
    simulation.profit =
      simulation.profit * 0.55 + (simulation.renewalOdds - 50) * 0.7;
  }
  simulation.arcadeScores = arcadeCalculateScores(
    simulation,
    arcadeCreativeEffects(),
  );
  simulation.identity = arcadeIdentityFor(simulation, simulation.arcadeScores);
  S.arcade.identity = simulation.identity;
  S.arcade.finalScores = simulation.arcadeScores;
  return simulation;
};

const ARCADE_SIDEBAR_V22 = sidebar;
sidebar = function sidebarV23() {
  const html = ARCADE_SIDEBAR_V22();
  const labels = arcadeCrewLabels();
  return html
    .replaceAll(
      "Current remake",
      arcadeIsShow() ? "Current series" : "Current remake",
    )
    .replaceAll(">Director<", `>${labels.director}<`)
    .replaceAll(">Writer<", `>${labels.writer}<`);
};

// =============================================================================
// GREENLIT ARCADE V24 — MOVIE-ONLY CLARITY PASS
// =============================================================================

const V24_CREW_DUOS = [
  ["Anthony Russo", "Joe Russo"],
  ["Joel Coen", "Ethan Coen"],
  ["Lana Wachowski", "Lilly Wachowski"],
  ["Benny Safdie", "Josh Safdie"],
  ["Daniel Kwan", "Daniel Scheinert"],
  ["Albert Hughes", "Allen Hughes"],
  ["Peter Farrelly", "Bobby Farrelly"],
  ["John Francis Daley", "Jonathan Goldstein"],
  ["Christopher Markus", "Stephen McFeely"],
  ["Rhett Reese", "Paul Wernick"],
  ["Scott Alexander", "Larry Karaszewski"],
];

function v24EnsureState() {
  ensureArcadeState();
  S.arcade.projectKind = "movie";
  S.arcade.auditionHistory = S.arcade.auditionHistory || {};
  S.arcade.marketingSliders = v24NormalizeMarketing(
    S.arcade.marketingSliders || { awareness: 45, fandom: 30, prestige: 25 },
  );
  S.arcade.fitMode = S.arcade.fitMode || "Arcade";
}

function v24NormalizeMarketing(values, changedKey = null, changedValue = null) {
  const keys = ["awareness", "fandom", "prestige"];
  const current = {
    awareness: 45,
    fandom: 30,
    prestige: 25,
    ...(values || {}),
  };
  if (changedKey) {
    const next = clamp(changedValue, 0, 100);
    const remaining = 100 - next;
    const others = keys.filter((key) => key !== changedKey);
    const oldOtherTotal = others.reduce(
      (sum, key) => sum + safe(current[key]),
      0,
    );
    current[changedKey] = next;
    if (oldOtherTotal <= 0) {
      current[others[0]] = Math.round(remaining / 2);
      current[others[1]] = remaining - current[others[0]];
    } else {
      current[others[0]] = Math.round(
        (remaining * current[others[0]]) / oldOtherTotal,
      );
      current[others[1]] = remaining - current[others[0]];
    }
  }
  let total = keys.reduce(
    (sum, key) => sum + Math.max(0, safe(current[key])),
    0,
  );
  if (!total) return { awareness: 34, fandom: 33, prestige: 33 };
  const out = {};
  let used = 0;
  keys.forEach((key, index) => {
    out[key] =
      index === keys.length - 1
        ? 100 - used
        : Math.round((Math.max(0, safe(current[key])) / total) * 100);
    used += out[key];
  });
  return out;
}

function v24GenderName(value) {
  return (
    { 1: "Woman", 2: "Man", 3: "Non-binary" }[safe(value)] || "Unspecified"
  );
}

function v24FitEffects(p, slot) {
  const original = arcadeOriginalForSlot(slot);
  const actorAge = ageAtYear(p);
  const targetAge = original?.age ?? S.originalAges[slot] ?? null;
  let ageFit = 0;
  if (actorAge != null && targetAge != null) {
    const distance = Math.abs(actorAge - targetAge);
    ageFit =
      distance <= 3
        ? 5
        : distance <= 7
          ? 1
          : distance <= 12
            ? -5
            : distance <= 20
              ? -11
              : -18;
  }
  const actorGender = safe(p.gender, 0);
  const roleGender = safe(original?.gender, 0);
  let genderFit = 0;
  if (actorGender && roleGender)
    genderFit = actorGender === roleGender ? 3 : -14;
  const direction = S.arcade.creativeDirection || "Modern Reimagining";
  const strictness =
    S.arcade.fitMode === "Realistic"
      ? direction === "Faithful"
        ? 1.15
        : direction === "Bold Reinvention"
          ? 0.6
          : 0.9
      : 0.2;
  return {
    age: Math.round(ageFit * strictness * 10) / 10,
    gender: Math.round(genderFit * strictness * 10) / 10,
    actorAge,
    targetAge,
    actorGender,
    roleGender,
  };
}

const V24_BASE_ATTRS = baseAttrs;
baseAttrs = function v24BaseAttrs(p, slot) {
  const attrs = V24_BASE_ATTRS(p, slot);
  if (ARCADE_ACTOR_SLOTS.includes(slot)) {
    const effects = v24FitEffects(p, slot);
    attrs.fit = clamp(attrs.fit + effects.age + effects.gender);
    if (S.arcade.fitMode === "Realistic") {
      attrs.chemistry = clamp(
        attrs.chemistry + effects.age * 0.18 + effects.gender * 0.28,
      );
      attrs.reliability = clamp(attrs.reliability + effects.age * 0.08);
      attrs.momentum = clamp(attrs.momentum + effects.gender * 0.06);
    }
  }
  return attrs;
};

function v24AuditionFor(slot, personId) {
  return S.arcade?.auditionHistory?.[slot]?.[personId] || null;
}

function v24HiredAuditions() {
  return ARCADE_ACTOR_SLOTS.map((slot) => {
    const hiredId = S.roster?.[slot];
    if (!hiredId) return null;
    return (
      v24AuditionFor(slot, hiredId) ||
      (S.auditions?.[slot]?.personId === hiredId ? S.auditions[slot] : null)
    );
  }).filter(Boolean);
}

function v24AllAuditions() {
  const history = Object.values(S.arcade?.auditionHistory || {}).flatMap(
    (slotHistory) => Object.values(slotHistory || {}),
  );
  return history.length ? history : Object.values(S.auditions || {});
}

const V24_ADJUSTED = adjusted;
adjusted = function v24Adjusted(p, slot, includeAudition = true) {
  v24EnsureState();
  const persistent = includeAudition ? v24AuditionFor(slot, p?.id) : null;
  if (!persistent) return V24_ADJUSTED(p, slot, includeAudition);
  const previous = S.auditions[slot];
  S.auditions[slot] = persistent;
  const result = V24_ADJUSTED(p, slot, true);
  if (previous) S.auditions[slot] = previous;
  else delete S.auditions[slot];
  return result;
};

const V24_TALENT_TIER = talentTier;
talentTier = function v24TalentTier(p, slot) {
  const persistent = v24AuditionFor(slot, p?.id);
  if (!persistent) return V24_TALENT_TIER(p, slot);
  const previous = S.auditions[slot];
  S.auditions[slot] = persistent;
  const result = V24_TALENT_TIER(p, slot);
  if (previous) S.auditions[slot] = previous;
  else delete S.auditions[slot];
  return result;
};

arcadeAuditionCount = function v24AuditionCount() {
  v24EnsureState();
  return Object.values(S.arcade.auditionHistory || {}).reduce(
    (sum, group) => sum + Object.keys(group || {}).length,
    0,
  );
};

function v24KnownProjects(p) {
  const projects = (p.known || []).filter(Boolean).slice(0, 5);
  return projects.length
    ? `<div class="v24Known"><span>Most known projects</span>${projects.map((title) => `<b>${arcadeEsc(title)}</b>`).join("")}</div>`
    : '<div class="v24Known"><span>Most known projects</span><b>Credits unavailable</b></div>';
}

arcadeCandidateCard = function v24CandidateCard(p, slot) {
  const before = adjusted(p, slot, false);
  const attrs = adjusted(p, slot, true);
  const effects = v24FitEffects(p, slot);
  const shortlisted = (S.shortlists[slot] || []).includes(p.id);
  const audition = v24AuditionFor(slot, p.id);
  const selected = S.roster[slot] === p.id;
  const badges = arcadeTalentBadges(p, slot);
  const age = ageAtYear(p);
  const original = arcadeOriginalForSlot(slot);
  let tier = "B",
    tierBefore = "B";
  try {
    tier = talentTier(p, slot);
    tierBefore = audition?.tierBeforeAudition || baseTalentTier(p, slot);
  } catch {}
  const fitImpact =
    S.arcade.fitMode === "Realistic"
      ? `<div class="v24FitImpact"><div><span>Age fit</span><b class="${effects.age >= 0 ? "positive" : "negative"}">${effects.age >= 0 ? "+" : ""}${effects.age.toFixed(1)}</b><small>Age ${age ?? "?"} when ${S.project.title} released · target ${effects.targetAge ?? "?"}</small></div><div><span>Gender fit</span><b class="${effects.gender >= 0 ? "positive" : "negative"}">${effects.gender >= 0 ? "+" : ""}${effects.gender.toFixed(1)}</b><small>${v24GenderName(effects.actorGender)} actor · ${v24GenderName(effects.roleGender)} original role</small></div></div>`
      : `<div class="v24FitImpact soft"><span>Arcade fit</span><small>Age and gender have only a small effect in this mode.</small></div>`;
  return `<article class="arcadeActorCard ${selected ? "selected" : ""}">
    <div class="arcadeActorImage">${
      p.photo
        ? `<img src="${p.photo}" alt="">`
        : `<div class="fallback">${arcadeEsc(
            p.name
              .split(/\s+/)
              .map((x) => x[0])
              .join("")
              .slice(0, 2),
          )}</div>`
    }<div class="tier ${tier}">${tier}</div></div>
    <div class="arcadeActorBody"><div class="arcadeActorName"><div><h3>${arcadeEsc(p.name)}</h3><span>Age ${age ?? "unknown"} in ${S.project.year} · ${Math.round(attrs.fit)}% fit</span></div>${selected ? '<b class="arcadeHiredFlag">HIRED</b>' : ""}</div>
    <div class="arcadeMediumFit ${p.voiceOnly && S.project.genre !== "Animation" ? "bad" : p.voiceOnly ? "good" : ""}">${arcadeEsc(arcadeActorMediumLabel(p))}</div>
    ${fitImpact}<div class="arcadeBadgeRow">${badges.map((b) => `<span title="${arcadeEsc(b.effect)}">${b.icon} ${arcadeEsc(b.name)}</span>`).join("")}</div>
    <div class="arcadeQuickStats">${arcadeStatCell("Craft", before.craft, attrs.craft)}${arcadeStatCell("Draw", before.draw, attrs.draw)}${arcadeStatCell("Reliability", before.reliability, attrs.reliability)}${arcadeStatCell("Momentum", before.momentum, attrs.momentum)}${arcadeStatCell("Chemistry", before.chemistry, attrs.chemistry)}</div>
    ${
      audition
        ? `
      <div class="arcadeAuditionRead">
        <b>Audition locked in</b>
        <span>
          ${
            tierBefore !== tier
              ? `${tierBefore} → ${tier} tier`
              : "Revealed performance remains for this run."
          }
        </span>
      </div>
    `
        : ""
    }

    ${v25CareerTimeline(p)}

    <div class="arcadeActorActions">
      <button class="btn" data-short="${p.id}">
        ${shortlisted ? "★ Pinned" : "☆ Pin"}
      </button>

      <button
        class="btn"
        data-aud="${p.id}"
        ${audition || arcadeAuditionCount() >= 3 ? "disabled" : ""}
      >
        ${audition ? "Auditioned" : "Audition"}
      </button>

      <button class="btn primary" data-hire="${p.id}">
        ${selected ? "Selected" : "Hire"}
      </button>
    </div>
    ${v24KnownProjects(p)}
    <div class="arcadeActorActions"><button class="btn" data-short="${p.id}">${shortlisted ? "★ Saved pick" : "☆ Save pick"}</button><button class="btn" data-aud="${p.id}" ${audition || arcadeAuditionCount() >= 3 ? "disabled" : ""}>${audition ? "Auditioned" : "Audition"}</button><button class="btn primary" data-hire="${p.id}">${selected ? "Selected" : "Hire"}</button></div>
    <button class="cameoBtn ${S.cameos[slot]?.personId === p.id ? "active" : ""}" data-cameo-person="${p.id}" data-cameo-slot="${slot}">${S.cameos[slot]?.personId === p.id ? `Cameo: ${arcadeEsc(S.cameos[slot].character)}` : "Use iconic-role cameo"}</button>
    </div></article>`;
};

function v24SavedPicks(slot) {
  const ids = S.shortlists[slot] || [];
  if (!ids.length)
    return '<div class="arcadeShortlistEmpty">Save interesting actors here so you can return to them later. Auditions do not require saving.</div>';
  return `<div class="arcadeShortlistStrip">${ids
    .map((id) => {
      const p = person(id);
      if (!p) return "";
      const aud = v24AuditionFor(slot, id);
      return `<button class="arcadeShortChip" data-saved-open="${id}">${p.photo ? `<img src="${p.photo}" alt="">` : "<span>?</span>"}<div><b>${arcadeEsc(p.name)}</b><small>${aud ? "Auditioned · permanent boost" : `${Math.round(adjusted(p, slot).fit)}% fit`}</small></div><span data-short-remove="${id}">×</span></button>`;
    })
    .join("")}</div>`;
}

const LEGACY_HIRE_PAGE_V24 = async function v24HirePage() {
  v24EnsureState();
  const slot = ARCADE_ACTOR_SLOTS.includes(S.activeSlot)
    ? S.activeSlot
    : ARCADE_ACTOR_SLOTS.find((x) => !S.roster[x]) || ARCADE_ACTOR_SLOTS[0];
  S.activeSlot = slot;
  const original = arcadeOriginalForSlot(slot);
  if (!S.sourcePools[slot]?.length) {
    shell(
      '<h1>Rolling three similar movies…</h1><div class="callout">Building the draft from real films in the same genre and era.</div>',
    );
    return ensurePool(slot);
  }
  const pools = S.sourcePools[slot] || [];
  const index = clamp(
    S.sourceIndex[slot] || 0,
    0,
    Math.max(0, pools.length - 1),
  );
  const pool = pools[index];
  const candidates = pool?.people || [];
  shell(`<div class="arcadePageHead"><div><div class="mini">Step 2 · ${ARCADE_ACTOR_SLOTS.indexOf(slot) + 1} of 5</div><h1>Cast ${arcadeEsc(original?.character || roleName(slot) || slot)}.</h1><p class="sub">Draft from three similar movies. Save favorites, audition anyone, or hire immediately.</p></div><div class="arcadeTokenStack"><span>Auditions</span><b>${3 - arcadeAuditionCount()} left</b></div></div>
  <div class="arcadeRoleTabs">${ARCADE_ACTOR_SLOTS.map((as) => {
    const o = arcadeOriginalForSlot(as),
      h = person(S.roster[as]),
      img = h?.photo || o?.photo;
    return `<button class="arcadeRoleTab ${as === slot ? "active" : ""} ${h ? "done" : ""}" data-jump="${as}">${img ? `<img src="${img}" alt="">` : "<span>?</span>"}<small>${arcadeEsc(h?.name || o?.character || as)}</small></button>`;
  }).join("")}</div>
  <section class="arcadeDraftPicker"><div class="arcadeDrawerHead"><div><span class="mini">Movie draft</span><b>Pick a source cast</b></div><button class="btn" id="refreshDraft">Reroll all 3</button></div><div class="sourceTabs arcadeSourceTabs">${pools.map((entry, i) => `<button class="sourceTab ${i === index ? "active" : ""}" data-source="${i}">${entry.film.poster ? `<img src="${entry.film.poster}" alt="">` : "<div></div>"}<span><b>${arcadeEsc(entry.film.title)}</b><small>${arcadeEsc(entry.film.genre)} · ${arcadeEsc(entry.film.year)}</small></span></button>`).join("")}</div><div class="sourceHero arcadeDraftHero">${pool?.film.poster ? `<img src="${pool.film.poster}" alt="">` : "<div></div>"}<div><div class="mini">Current draft film</div><h2>${arcadeEsc(pool?.film.title || "Similar film")}</h2><div class="sub">${arcadeEsc(pool?.film.overview || "Choose from this film’s cast.")}</div></div></div></section>
  <section class="arcadeShortlistDrawer"><div class="arcadeDrawerHead"><div><span class="mini">Saved picks</span><b>${(S.shortlists[slot] || []).length}/8</b></div><span>A bookmark, not a requirement.</span></div>${v24SavedPicks(slot)}</section>
  <div class="arcadeActorGrid">${candidates.map((p) => arcadeCandidateCard(p, slot)).join("")}</div><div class="arcadeFooterNav"><button class="btn" id="backProject">← Movie</button><button class="btn primary" id="toProduction" ${ARCADE_ACTOR_SLOTS.every((x) => S.roster[x]) ? "" : "disabled"}>Crew wheel →</button></div>`);
  $$("[data-jump]").forEach(
    (b) =>
      (b.onclick = () => {
        S.activeSlot = b.dataset.jump;
        render();
      }),
  );
  $$("[data-source]").forEach(
    (b) =>
      (b.onclick = () => {
        S.sourceIndex[slot] = +b.dataset.source;
        S.tierCache[slot] = {};
        render();
      }),
  );
  $("#refreshDraft").onclick = async () => {
    delete S.sourcePools[slot];
    S.tierCache[slot] = {};
    await ensurePool(slot);
  };
  $$("[data-short]").forEach(
    (b) =>
      (b.onclick = () => {
        const list = S.shortlists[slot] || [],
          id = b.dataset.short;
        if (list.includes(id))
          S.shortlists[slot] = list.filter((x) => x !== id);
        else if (list.length < 8) S.shortlists[slot] = [...list, id];
        else alert("Saved picks holds eight actors.");
        render();
      }),
  );
  $$("[data-short-remove]").forEach(
    (b) =>
      (b.onclick = (event) => {
        event.stopPropagation();
        S.shortlists[slot] = (S.shortlists[slot] || []).filter(
          (x) => x !== b.dataset.shortRemove,
        );
        render();
      }),
  );
  $$("[data-saved-open]").forEach(
    (b) =>
      (b.onclick = () => {
        const card = document
          .querySelector(`[data-hire="${b.dataset.savedOpen}"]`)
          ?.closest(".arcadeActorCard");
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        card?.classList.add("v24Pulse");
        setTimeout(() => card?.classList.remove("v24Pulse"), 900);
      }),
  );
  $$("[data-aud]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.aud;
        if (v24AuditionFor(slot, id) || arcadeAuditionCount() >= 3) return;
        ensureSeed();
        const candidate = person(id),
          fit = Math.round(baseAttrs(candidate, slot).fit),
          tierBeforeAudition = baseTalentTier(candidate, slot);
        S.arcade.auditionHistory[slot] = S.arcade.auditionHistory[slot] || {};
        S.arcade.auditionHistory[slot][id] = {
          personId: id,
          fit,
          mods: arcadeAuditionMods(candidate, slot, fit),
          tierBeforeAudition,
          eligibleBeforeAudition: true,
        };
        S.auditions[slot] = S.arcade.auditionHistory[slot][id];
        render();
      }),
  );
  $$("[data-hire]").forEach(
    (b) =>
      (b.onclick = () => {
        S.roster[slot] = b.dataset.hire;
        if (S.cameos[slot]?.personId !== b.dataset.hire) {
          delete S.cameos[slot];
          delete S.cameoOutcomes[slot];
        }
        const next = ARCADE_ACTOR_SLOTS.find((x) => !S.roster[x]);
        S.activeSlot = next || slot;
        render();
      }),
  );
  $$("[data-cameo-person]").forEach(
    (b) =>
      (b.onclick = () => {
        const candidate = person(b.dataset.cameoPerson);
        if (candidate) cameoModal(candidate, b.dataset.cameoSlot);
      }),
  );
  $("#backProject").onclick = () => {
    S.screen = 0;
    render();
  };
  $("#toProduction").onclick = () => {
    ensureSeed();
    S.screen = 2;
    render();
  };
};

// Movie-only setup: TV and streaming are intentionally absent from every search path.
const ACTIVE_PROJECT_PAGE_V24 = function v24ProjectPage() {
  v24EnsureState();
  const maxYear = new Date().getFullYear();
  shell(`<div class="arcadePageHead"><div><div class="mini">Step 1</div><h1>Build a movie.</h1><p class="sub">Choose a reference film, creative direction, and fit rules.</p></div><div class="arcadeStepPill">Movies only</div></div>
  <section class="v23SetupGrid"><div class="v23ChoicePanel"><label>Creative direction</label><select id="creativeDirection">${Object.keys(
    ARCADE_DIRECTIONS,
  )
    .map(
      (x) =>
        `<option ${x === S.arcade.creativeDirection ? "selected" : ""}>${x}</option>`,
    )
    .join(
      "",
    )}</select><small>${S.arcade.creativeDirection === "Faithful" ? "Fit matters most." : S.arcade.creativeDirection === "Bold Reinvention" ? "Originality is rewarded." : "Balanced freedom and familiarity."}</small></div><div class="v23ChoicePanel"><label>Fit mode</label><div class="v23Segment"><button data-fitmode="Arcade" class="${S.arcade.fitMode === "Arcade" ? "active" : ""}">Arcade</button><button data-fitmode="Realistic" class="${S.arcade.fitMode === "Realistic" ? "active" : ""}">Realistic</button></div><small>${S.arcade.fitMode === "Realistic" ? "Age, gender, and medium visibly alter stats. Body type is never used." : "Character details lightly influence the arcade draft."}</small></div></section>
  <section class="arcadeSearchPanel"><div class="arcadeSearchTabs"><div class="arcadeTitleSearch"><input id="titleSearch" placeholder="Search a movie title…"><button class="btn primary" id="searchTitleBtn">Search</button></div><button class="btn warn" id="randomTitleBtn">🎲 Randomize</button></div><div class="arcadeMovieFilters"><div><label>Genre</label><select id="movieGenre"><option value="">Any genre</option>${GENRES.map((g) => `<option value="${g}">${g}</option>`).join("")}</select></div><div><label>From year</label><input id="movieYearFrom" type="number" min="1930" max="${maxYear}" placeholder="1980"></div><div><label>To year</label><input id="movieYearTo" type="number" min="1930" max="${maxYear}" placeholder="${maxYear}"></div><button class="btn" id="browseMovies">Browse</button></div><div id="searchList" class="arcadeMovieResults"></div></section>
  ${S.reference ? `<section class="arcadePickedMovie">${S.reference.poster ? `<img src="${S.reference.poster}" alt="">` : '<div class="arcadePosterFallback">GL</div>'}<div><div class="mini">Reference movie</div><h2>${arcadeEsc(S.reference.title)}</h2><p>${arcadeEsc(S.reference.overview || "")}</p><div class="chipRow"><span class="chip active">${arcadeEsc(S.reference.genre)}</span><span class="chip">${S.reference.year}</span><span class="chip">${arcadeEsc(S.arcade.creativeDirection)}</span><span class="chip">${arcadeEsc(S.arcade.fitMode)} fit</span></div></div></section><button class="btn primary arcadeContinue" id="continue">Start casting →</button>` : '<div class="callout">Pick a reference movie to begin.</div>'}`);
  $$("[data-fitmode]").forEach(
    (b) =>
      (b.onclick = () => {
        S.arcade.fitMode = b.dataset.fitmode;
        render();
      }),
  );
  $("#creativeDirection").onchange = (e) => {
    S.arcade.creativeDirection = e.target.value;
    render();
  };
  const showResults = async (loader) => {
    const box = $("#searchList");
    box.innerHTML = '<div class="callout">Searching…</div>';
    try {
      const rows = await loader();
      box.innerHTML =
        rows
          .slice(0, 12)
          .map((x) => arcadeMovieResultButton({ ...x, media_type: "movie" }))
          .join("") || '<div class="callout bad">No matches.</div>';
      arcadeBindMovieResults();
    } catch (e) {
      box.innerHTML = `<div class="callout bad">${arcadeEsc(e.message)}</div>`;
    }
  };
  $("#searchTitleBtn").onclick = () =>
    showResults(
      async () =>
        (
          await api("/search/movie", {
            query: $("#titleSearch").value.trim(),
            include_adult: "false",
          })
        ).results || [],
    );
  $("#browseMovies").onclick = () =>
    showResults(async () => {
      const params = {
        include_adult: "false",
        sort_by: "popularity.desc",
        page: 1,
      };
      const genre = $("#movieGenre").value;
      if (genre) params.with_genres = GENRE_IDS[genre];
      const from = +$("#movieYearFrom").value,
        to = +$("#movieYearTo").value;
      if (from) params["primary_release_date.gte"] = `${from}-01-01`;
      if (to) params["primary_release_date.lte"] = `${to}-12-31`;
      return (await api("/discover/movie", params)).results || [];
    });
  $("#randomTitleBtn").onclick = async () => {
    try {
      const params = {
        include_adult: "false",
        sort_by: "popularity.desc",
        page: 1 + Math.floor(Math.random() * 10),
        "vote_count.gte": 100,
      };
      const genre = $("#movieGenre").value;
      if (genre) params.with_genres = GENRE_IDS[genre];
      const rows = (await api("/discover/movie", params)).results || [];
      if (!rows.length) throw new Error("No movie matched.");
      await selectReference(
        rows[Math.floor(Math.random() * rows.length)].id,
        "movie",
      );
    } catch (e) {
      alert(e.message);
    }
  };
  if ($("#continue"))
    $("#continue").onclick = () => {
      S.screen = 1;
      S.activeSlot = ARCADE_ACTOR_SLOTS[0];
      render();
    };
};

const V24_SELECT_REFERENCE = selectReference;
selectReference = async function v24SelectReference(id) {
  const selected = await V24_SELECT_REFERENCE(id, "movie");
  if (!selected) return false;
  S.arcade.projectKind = "movie";
  return true;
};

// Crew search verifies both skill sets and lets dual-role creators be viewed side by side.
function v24CrewRolePanel(p, role) {
  const slot = role === "directors" ? "Director 1" : "Writer 1";
  const attrs = adjusted(p, slot);
  return `<div class="v24CrewRole"><div class="mini">${role === "directors" ? "Director card" : "Writer card"}</div><h3>${arcadeEsc(p.name)}</h3><div class="arcadeQuickStats"><div><span>Craft</span><b>${Math.round(attrs.craft)}</b></div><div><span>Fit</span><b>${Math.round(attrs.fit)}</b></div><div><span>Reliability</span><b>${Math.round(attrs.reliability)}</b></div><div><span>Chemistry</span><b>${Math.round(attrs.chemistry)}</b></div></div><button class="btn primary" data-v24-add-role="${role}" data-v24-add-person="${p.id}">Add as ${role === "directors" ? "director" : "writer"}</button></div>`;
}

arcadeCrewSearchModal = function v24CrewSearchModal() {
  if (S.arcade.crew.manualUsed) return;
  modal(
    `<div class="arcadeModalHead"><div><div class="mini">One manual add</div><h2>Search a writer or director</h2><p class="sub">People with both credits will show both role cards for a direct comparison.</p></div><button class="balanceClose" data-close>×</button></div><div class="row"><input id="manualCrewName" placeholder="Search a person"><button class="btn primary" id="manualCrewSearch">Search credits</button></div><div id="manualCrewResults" class="searchResults"></div>`,
  );
  $("#manualCrewSearch").onclick = async () => {
    const box = $("#manualCrewResults"),
      query = $("#manualCrewName").value.trim();
    box.innerHTML =
      '<div class="callout">Checking directing and writing credits…</div>';
    try {
      const data = await api("/search/person", {
        query,
        include_adult: "false",
      });
      const valid = [];
      for (const raw of (data.results || []).slice(0, 8)) {
        try {
          const details = await api(`/person/${raw.id}`, {
            append_to_response: "combined_credits",
            language: "en-US",
          });
          const jobs = details.combined_credits?.crew || [];
          const director = jobs.some((c) => c.job === "Director");
          const writer = jobs.some((c) =>
            ["Writer", "Screenplay", "Story"].includes(c.job),
          );
          if (!director && !writer) continue;
          const p = await hydrate(raw, director ? "Director 1" : "Writer 1", {
            cast: [],
            crew: [],
          });
          if (p) valid.push({ p, director, writer });
        } catch {}
      }
      box.innerHTML = valid.length
        ? valid
            .map(
              (item) =>
                `<section class="v24DualCrewResult">${item.p.photo ? `<img src="${item.p.photo}" alt="">` : '<div class="arcadeCrewFallback">GL</div>'}<div><h2>${arcadeEsc(item.p.name)}</h2><div class="v24DualRoleGrid">${item.director ? v24CrewRolePanel(item.p, "directors") : ""}${item.writer ? v24CrewRolePanel(item.p, "writers") : ""}</div></div></section>`,
            )
            .join("")
        : '<div class="callout bad">No verified writing or directing credits found.</div>';
      $$("[data-v24-add-role]").forEach(
        (button) =>
          (button.onclick = () => {
            const role = button.dataset.v24AddRole,
              id = button.dataset.v24AddPerson,
              poolKey = role === "directors" ? "directorsPool" : "writersPool";
            if (!S.arcade.crew[poolKey].includes(id))
              S.arcade.crew[poolKey].unshift(id);
            S.arcade.crew.manualUsed = true;
            closeModal();
            arcadeToggleCrew(role, id);
          }),
      );
    } catch (error) {
      box.innerHTML = `<div class="callout bad">${arcadeEsc(error.message)}</div>`;
    }
  };
};

const V24_BUILD_CREW_POOL = arcadeBuildCrewPool;
arcadeBuildCrewPool = async function v24BuildCrewPool(kind) {
  const pool = await V24_BUILD_CREW_POOL(kind);
  const names = new Set(pool.map((p) => p.name.toLowerCase()));
  const random = rng(`duo-66-${kind}-${Date.now()}`);
  for (const pair of V24_CREW_DUOS) {
    const first = names.has(pair[0].toLowerCase()),
      second = names.has(pair[1].toLowerCase());
    if (first === second || random() > 0.66) continue;
    const missing = first ? pair[1] : pair[0];
    try {
      const search = await api("/search/person", {
        query: missing,
        include_adult: "false",
      });
      const raw =
        (search.results || []).find(
          (x) => x.name.toLowerCase() === missing.toLowerCase(),
        ) || search.results?.[0];
      if (!raw) continue;
      const partner = await hydrate(
        raw,
        kind === "directors" ? "Director 1" : "Writer 1",
        { cast: [], crew: [] },
      );
      if (partner && !pool.some((p) => p.id === partner.id))
        pool.splice(Math.min(pool.length, 4), 0, partner);
    } catch {}
  }
  return pool.slice(0, 5);
};

// Balance-data corrections: slightly less catastrophe dominance, more stability value,
// and a restrained marketing multiplier so choices matter without becoming exploits.
for (const scale of Object.values(BALANCE_TUNING.economy)) {
  scale.catastropheChance = Math.max(0.025, scale.catastropheChance * 0.72);
  scale.overrunVolatility *= 0.9;
}
BALANCE_TUNING.grossModel.catastropheGrossMinimum = Math.max(
  0.32,
  BALANCE_TUNING.grossModel.catastropheGrossMinimum,
);
BALANCE_TUNING.grossModel.catastropheGrossMaximum = Math.max(
  0.62,
  BALANCE_TUNING.grossModel.catastropheGrossMaximum,
);
BALANCE_TUNING.auditions.grossDivisor = Math.max(
  220,
  BALANCE_TUNING.auditions.grossDivisor,
);
ARCADE_QUICK_TUNING.randomness = Math.min(
  0.9,
  safe(ARCADE_QUICK_TUNING.randomness, 1),
);

// Remove TV/streaming wording from navigation and saved legacy runs.
const V24_SHELL = shell;
shell = function v24Shell(main) {
  v24EnsureState();
  S.arcade.projectKind = "movie";
  V24_SHELL(main);
  document.querySelectorAll("option").forEach((option) => {
    if (/streaming|binge|show/i.test(option.textContent)) option.remove();
  });
};

v24EnsureState();

// =============================================================================
// GREENLIT V25 — CAREER ERA, LIVING FILMOGRAPHY, SAVED PICKS AND STYLE STUDIO
// =============================================================================
const V25_VERSION = "25.0";
const V25_CREATIVE_EMPHASES = {
  music: {
    "Character Themes": {
      icon: "🎭",
      music: 8,
      craft: 3,
      audience: 2,
      risk: 0,
      text: "Recurring motifs make characters feel connected and memorable.",
    },
    Atmosphere: {
      icon: "🌫️",
      music: 6,
      craft: 2,
      audience: 1,
      risk: 2,
      text: "Texture and mood lead; melody takes a back seat.",
    },
    Emotion: {
      icon: "❤️",
      music: 7,
      craft: 1,
      audience: 4,
      risk: 0,
      text: "The score pushes emotional clarity and broad audience response.",
    },
    "Action Drive": {
      icon: "⚡",
      music: 5,
      craft: 0,
      audience: 3,
      commercial: 3,
      risk: 1,
      text: "Rhythm and momentum support pace, trailers and set pieces.",
    },
    "Strategic Silence": {
      icon: "🤫",
      music: 3,
      craft: 5,
      audience: -1,
      risk: 4,
      text: "Music is withheld so sound design and tension can carry scenes.",
    },
  },
  visual: {
    "Natural Light": {
      icon: "☀️",
      visuals: 6,
      craft: 3,
      audience: 1,
      risk: 1,
      text: "Available light and grounded textures create intimacy.",
    },
    "Long Takes": {
      icon: "➰",
      visuals: 8,
      craft: 4,
      audience: 0,
      risk: 4,
      text: "Complex blocking raises the ceiling and the production risk.",
    },
    "Large Format": {
      icon: "🎞️",
      visuals: 9,
      craft: 1,
      audience: 3,
      commercial: 2,
      risk: 2,
      text: "Scale, clarity and spectacle become part of the selling point.",
    },
    "Subjective Camera": {
      icon: "👁️",
      visuals: 6,
      craft: 3,
      audience: 2,
      risk: 3,
      text: "The camera reflects a character’s unstable or intimate perspective.",
    },
    "Graphic Composition": {
      icon: "📐",
      visuals: 8,
      craft: 4,
      audience: 0,
      risk: 2,
      text: "Controlled geometry and recurring visual motifs reward attention.",
    },
  },
};

const V25_COMPOSER_PACKAGES = [
  {
    id: "heroic-orchestra",
    name: "Heroic Orchestra",
    reference: "Williams-style",
    icon: "🎺",
    tags: ["Orchestral", "Heroic", "Themes"],
    base: 82,
    fit: ["Adventure", "Fantasy", "Family", "Sci-Fi", "War"],
    risk: 1,
  },
  {
    id: "pulse-electronic",
    name: "Pulse & Electronics",
    reference: "Zimmer-style",
    icon: "🥁",
    tags: ["Driving", "Percussion", "Electronic"],
    base: 81,
    fit: ["Action", "Sci-Fi", "Thriller", "War"],
    risk: 2,
  },
  {
    id: "industrial-minimal",
    name: "Industrial Minimalism",
    reference: "Reznor/Ross-style",
    icon: "⚙️",
    tags: ["Industrial", "Minimal", "Psychological"],
    base: 80,
    fit: ["Thriller", "Crime", "Mystery", "Drama", "Horror"],
    risk: 4,
  },
  {
    id: "melodic-fantasy",
    name: "Melodic Wonder",
    reference: "Hisaishi-style",
    icon: "🌱",
    tags: ["Melodic", "Fantasy", "Emotional"],
    base: 83,
    fit: ["Animation", "Fantasy", "Family", "Romance", "Drama"],
    risk: 2,
  },
  {
    id: "whimsical-adventure",
    name: "Whimsical Adventure",
    reference: "Giacchino-style",
    icon: "🪁",
    tags: ["Whimsical", "Themes", "Adventure"],
    base: 79,
    fit: ["Animation", "Adventure", "Family", "Comedy", "Sci-Fi"],
    risk: 1,
  },
  {
    id: "genre-disruption",
    name: "Contrarian Sound",
    reference: "Experimental package",
    icon: "🧪",
    tags: ["Unexpected", "Sparse", "Identity"],
    base: 77,
    fit: ["Horror", "Documentary", "Mystery", "Music"],
    risk: 6,
  },
];

const V25_CAMERA_PACKAGES = [
  {
    id: "landscape-natural",
    name: "Luminous Landscapes",
    reference: "Deakins-style",
    icon: "🌄",
    tags: ["Natural", "Landscapes", "Controlled"],
    base: 84,
    fit: ["Drama", "Crime", "War", "Western", "Sci-Fi"],
    risk: 2,
  },
  {
    id: "large-format",
    name: "Large-Format Immersion",
    reference: "Van Hoytema-style",
    icon: "🛰️",
    tags: ["IMAX", "Scale", "Cool"],
    base: 84,
    fit: ["Action", "Sci-Fi", "Adventure", "War"],
    risk: 3,
  },
  {
    id: "long-take-natural",
    name: "Floating Naturalism",
    reference: "Lubezki-style",
    icon: "🌬️",
    tags: ["Long Takes", "Natural Light", "Wide"],
    base: 85,
    fit: ["Drama", "Adventure", "War", "Fantasy"],
    risk: 5,
  },
  {
    id: "neon-graphic",
    name: "Neon Geometry",
    reference: "Graphic package",
    icon: "🌃",
    tags: ["Neon", "Symmetry", "High Contrast"],
    base: 81,
    fit: ["Crime", "Thriller", "Sci-Fi", "Music"],
    risk: 4,
  },
  {
    id: "handheld-intimacy",
    name: "Handheld Intimacy",
    reference: "Documentary package",
    icon: "📹",
    tags: ["Handheld", "Close", "Immediate"],
    base: 78,
    fit: ["Drama", "Horror", "Documentary", "Crime", "Thriller"],
    risk: 3,
  },
  {
    id: "warm-classic",
    name: "Warm Classical Cinema",
    reference: "Studio-classic package",
    icon: "🕯️",
    tags: ["Warm", "Elegant", "Readable"],
    base: 79,
    fit: ["Romance", "History", "Comedy", "Family", "Music"],
    risk: 1,
  },
];

function v25EnsureState() {
  v24EnsureState();
  S.arcade.version = V25_VERSION;
  S.arcade.savedPickSources = S.arcade.savedPickSources || {};
  S.arcade.cardFocus = S.arcade.cardFocus || null;
  S.arcade.style = {
    composerId: null,
    cameraId: null,
    musicEmphasis: null,
    visualEmphasis: null,
    ...(S.arcade.style || {}),
  };
  S.arcade.recommendationView = S.arcade.recommendationView || "All";
}

function v25SourceYearFor(p, slot) {
  return safe(
    p?.sourceMovieYear,
    safe(
      S.sourcePools?.[slot]?.[S.sourceIndex?.[slot] || 0]?.film?.year,
      S.project.year,
    ),
  );
}

function v25CastingAge(p, slot) {
  const year = v25SourceYearFor(p, slot);
  return p?.birthYear ? year - p.birthYear : null;
}

function v25OriginalAge(slot) {
  return arcadeOriginalForSlot(slot)?.age ?? S.originalAges?.[slot] ?? null;
}

function v25GenderMatch(p, slot) {
  const original = arcadeOriginalForSlot(slot);
  const actorGender = safe(p?.gender, 0);
  const roleGender = safe(original?.gender, 0);
  if (!actorGender || !roleGender)
    return { status: "Unknown", match: null, penalty: 0 };
  const match = actorGender === roleGender;
  return {
    status: match ? "Matches" : "Does not match",
    match,
    penalty: match ? 0 : -12,
  };
}

v24FitEffects = function v25FitEffects(p, slot) {
  v25EnsureState();
  const actorAge = v25CastingAge(p, slot);
  const targetAge = v25OriginalAge(slot);
  let age = 0;
  let ageLabel = "Unknown";
  if (actorAge != null && targetAge != null) {
    const d = Math.abs(actorAge - targetAge);
    if (d <= 4) {
      age = 0;
      ageLabel = "Excellent";
    } else if (d <= 9) {
      age = -3;
      ageLabel = "Close";
    } else if (d <= 14) {
      age = -7;
      ageLabel = "Noticeable";
    } else if (d <= 24) {
      age = -13;
      ageLabel = "Major mismatch";
    } else {
      age = -20;
      ageLabel = "Extreme mismatch";
    }
  }
  const gender = v25GenderMatch(p, slot);
  const realistic = S.arcade.fitMode === "Realistic";
  return {
    age: realistic ? age : age * 0.15,
    gender: realistic ? gender.penalty : 0,
    ageLabel,
    genderLabel: gender.status,
    actorAge,
    targetAge,
    actorGender: safe(p?.gender, 0),
    roleGender: safe(arcadeOriginalForSlot(slot)?.gender, 0),
  };
};

// Attach source-film context to every drafted performer.
const V25_BUILD_POOL_BASE = buildPool;
buildPool = async function v25BuildPool(slot) {
  await V25_BUILD_POOL_BASE(slot);
  for (const entry of S.sourcePools?.[slot] || []) {
    for (const p of entry.people || []) {
      p.sourceMovieId = entry.film.id;
      p.sourceMovieTitle = entry.film.title;
      p.sourceMovieYear = safe(entry.film.year, S.project.year);
      p.sourceMoviePoster = entry.film.poster || null;
    }
  }
};

async function v25EnrichCareerEra(p, slot) {
  if (!p || p.v25EraLoaded) return p;
  try {
    const details = await api(`/person/${p.tmdbId}`, {
      append_to_response: "combined_credits",
      language: "en-US",
    });
    const sourceYear = v25SourceYearFor(p, slot);
    const cast = (details.combined_credits?.cast || [])
      .filter((c) => c.media_type === "movie" && c.title && c.release_date)
      .map((c) => ({
        id: c.id,
        title: c.title,
        year: +c.release_date.slice(0, 4),
        votes: safe(c.vote_count),
        rating: safe(c.vote_average),
        popularity: safe(c.popularity),
        character: c.character || "",
      }))
      .filter((c) => c.year && c.year <= sourceYear);
    const ranked = cast.slice().sort((a, b) => {
      const score = (x) =>
        Math.log10(x.votes + 1) * 30 +
        x.popularity * 0.3 +
        x.rating * 4 +
        Math.max(0, 12 - (sourceYear - x.year));
      return score(b) - score(a);
    });
    p.eraCredits = cast;
    p.eraKnownProjects = ranked.slice(0, 5);
    const recent = cast.filter((c) => c.year >= sourceYear - 5);
    const prior = cast.filter(
      (c) => c.year < sourceYear - 5 && c.year >= sourceYear - 10,
    );
    const recentHeat = recent.reduce(
      (s, c) => s + Math.log10(c.votes + 1) + c.rating / 5,
      0,
    );
    const priorHeat = prior.reduce(
      (s, c) => s + Math.log10(c.votes + 1) + c.rating / 5,
      0,
    );
    const ratio = (recentHeat + 1) / (priorHeat + 1);
    p.careerMomentumLabel =
      recent.length <= 1
        ? "Selective"
        : ratio > 1.65
          ? "Breakout"
          : ratio > 1.2
            ? "Rising"
            : ratio < 0.65
              ? "Cooling"
              : cast.length > 28
                ? "Veteran"
                : "Steady";
    const genreCounts = {};
    const collaborations = p.collabs || {};
    cast.forEach((c) => {
      /* genres are already summarized in p.fit */
    });
    const animationShare = cast.length
      ? cast.filter((c) => /voice/i.test(c.character)).length / cast.length
      : 0;
    const traits = [];
    if (Object.values(collaborations).some((v) => v >= 3))
      traits.push({
        name: "Frequent Collaborator",
        effect: "Higher chemistry with repeat collaborators.",
      });
    if (animationShare >= 0.45 || p.voiceOnly)
      traits.push({
        name: "Voice Specialist",
        effect: "Excels in animation; weak live-action medium fit.",
      });
    if (cast.length >= 35)
      traits.push({
        name: "High-Volume Performer",
        effect: "Strong experience with slightly wider outcome variance.",
      });
    if (
      cast.length <= 12 &&
      sourceYear - safe(p.birthYear, sourceYear - 30) > 30
    )
      traits.push({
        name: "Selective Performer",
        effect: "Higher craft confidence, lower availability.",
      });
    const genreValues = Object.values(p.fit || {});
    if (
      genreValues.length &&
      Math.max(...genreValues) - Math.min(...genreValues) < 20
    )
      traits.push({
        name: "Genre Chameleon",
        effect: "Smaller genre-fit penalties.",
      });
    else
      traits.push({
        name: "Genre Specialist",
        effect: "Higher ceiling in their strongest genres.",
      });
    if (ranked.some((c) => c.votes > 10000))
      traits.push({
        name: "Franchise Veteran",
        effect: "Higher commercial confidence, lower reinvention novelty.",
      });
    p.workingStyleTraits = traits.slice(0, 3);
    p.v25EraLoaded = true;
  } catch {
    p.v25EraLoaded = true;
  }
  return p;
}

function v25CareerTimeline(p) {
  const rows = p.eraKnownProjects || [];
  if (!rows.length)
    return `<div class="v25FilmographyEmpty">Era filmography is loading…</div>`;
  return `<div class="v25Filmography"><div class="v25FilmographyHead"><span>Known at this point</span><b>${arcadeEsc(p.careerMomentumLabel || "Steady")}</b></div>${rows.map((x, i) => `<div class="v25FilmRow"><span>${x.year}</span><div><b>${arcadeEsc(x.title)}</b><small>${i === 0 ? "Career-defining" : i === 1 ? "Recent / major project" : x.rating >= 7.5 ? "Acclaimed project" : "Notable credit"}</small></div><em>${"●".repeat(Math.max(1, Math.min(5, Math.round(Math.log10(x.votes + 1)))))}</em></div>`).join("")}</div>`;
}

function v25RecommendationScores(p, slot) {
  const a = adjusted(p, slot);
  const reliability = safe(a.reliability, 55);
  const fit = safe(a.fit, 55);
  const chemistry = safe(a.chemistry, 55);
  const craft = safe(a.craft, 55);
  const draw = safe(a.draw, 55);
  const momentum = safe(a.momentum, 55);
  const sourceYear = v25SourceYearFor(p, slot);
  const experience = clamp((p.eraCredits?.length || 8) * 2.2, 20, 95);
  const novelty = clamp(100 - fit * 0.45 + experience * 0.15, 20, 95);
  const confidence = clamp(
    reliability * 0.55 +
      experience * 0.25 +
      fit * 0.2 -
      (p.workingStyleTraits?.some((t) => t.name === "High-Volume Performer")
        ? 5
        : 0),
  );
  return {
    "Best Fit": fit * 0.55 + craft * 0.25 + chemistry * 0.2,
    "Commercial Pick": draw * 0.55 + momentum * 0.25 + reliability * 0.2,
    "Creative Pick":
      craft * 0.42 + novelty * 0.3 + chemistry * 0.13 + fit * 0.15,
    "Safe Pick": reliability * 0.45 + confidence * 0.35 + fit * 0.2,
    Wildcard: novelty * 0.5 + craft * 0.2 + (100 - confidence) * 0.3,
    confidence,
    sourceYear,
  };
}

function v25RecommendationBadge(p, slot) {
  const candidates = poolPeople(slot);
  const labels = [
    "Best Fit",
    "Commercial Pick",
    "Creative Pick",
    "Safe Pick",
    "Wildcard",
  ];
  const winners = {};
  for (const label of labels) {
    winners[label] = candidates
      .slice()
      .sort(
        (a, b) =>
          v25RecommendationScores(b, slot)[label] -
          v25RecommendationScores(a, slot)[label],
      )[0]?.id;
  }
  const won = labels.filter((label) => winners[label] === p.id);
  return won[0] || null;
}

function v25StyleEffects() {
  const style = S.arcade.style || {};
  const composer =
    V25_COMPOSER_PACKAGES.find((x) => x.id === style.composerId) ||
    V25_COMPOSER_PACKAGES[0];
  const camera =
    V25_CAMERA_PACKAGES.find((x) => x.id === style.cameraId) ||
    V25_CAMERA_PACKAGES[0];
  const musicE =
    V25_CREATIVE_EMPHASES.music[style.musicEmphasis] ||
    Object.values(V25_CREATIVE_EMPHASES.music)[0];
  const visualE =
    V25_CREATIVE_EMPHASES.visual[style.visualEmphasis] ||
    Object.values(V25_CREATIVE_EMPHASES.visual)[0];
  const musicFit = composer.fit.includes(S.project.genre) ? 7 : -3;
  const visualFit = camera.fit.includes(S.project.genre) ? 7 : -3;
  return {
    composer,
    camera,
    musicE,
    visualE,
    musicScore: clamp(composer.base + musicFit + musicE.music),
    visualScore: clamp(camera.base + visualFit + visualE.visuals),
    critic: (musicE.craft || 0) * 0.45 + (visualE.craft || 0) * 0.55,
    audience: (musicE.audience || 0) + (visualE.audience || 0),
    gross: 1 + ((musicE.commercial || 0) + (visualE.commercial || 0)) / 100,
    awards: (musicE.craft || 0) * 0.5 + (visualE.craft || 0) * 0.7,
    risk: composer.risk + camera.risk + musicE.risk + visualE.risk,
  };
}

// Replace original creative effects with the richer style packages.
arcadeCreativeEffects = function v25CreativeEffects() {
  const e = v25StyleEffects();
  const marketing = {
    awareness: 34,
    fandom: 33,
    prestige: 33,
    ...(S.arcade.marketingSliders || {}),
  };
  return {
    music: e.composer,
    visual: e.camera,
    musicFit: e.composer.fit.includes(S.project.genre) ? 7 : -3,
    visualFit: e.camera.fit.includes(S.project.genre) ? 7 : -3,
    musicSwing: 0,
    critic: e.critic + (marketing.prestige - 33) / 18,
    audience: e.audience + (marketing.fandom - 33) / 16,
    gross: e.gross * (1 + (marketing.awareness - 33) / 500),
    awards: e.awards + (marketing.prestige - 33) / 10,
    musicScore: e.musicScore,
    visualScore: e.visualScore,
  };
};

function v25StylePackageCard(item, kind, selected) {
  return `<button class="v25PackageCard ${selected === item.id ? "selected" : ""}" data-v25-package-kind="${kind}" data-v25-package="${item.id}"><span class="v25PackageIcon">${item.icon}</span><div><h3>${arcadeEsc(item.name)}</h3><small>${arcadeEsc(item.reference)}</small><div class="arcadeBadgeRow">${item.tags.map((t) => `<span>${arcadeEsc(t)}</span>`).join("")}</div><p>${item.fit.includes(S.project.genre) ? `Strong ${arcadeEsc(S.project.genre)} match` : "Bold cross-genre choice"} · risk ${item.risk}/6</p></div></button>`;
}

function v25EmphasisCards(kind, selected) {
  return Object.entries(V25_CREATIVE_EMPHASES[kind])
    .map(
      ([name, x]) =>
        `<button class="v25EmphasisCard ${selected === name ? "selected" : ""}" data-v25-emphasis-kind="${kind}" data-v25-emphasis="${arcadeEsc(name)}"><span>${x.icon}</span><div><b>${arcadeEsc(name)}</b><small>${arcadeEsc(x.text)}</small></div></button>`,
    )
    .join("");
}

function v25PosterPreview() {
  const e = v25StyleEffects();
  const title = arcadeEsc(S.project.title || "UNTITLED");
  return `<div class="v25PosterPreview" data-camera="${e.camera.id}" data-composer="${e.composer.id}"><div class="v25PosterNoise"></div><div class="v25PosterTop">A GREENLIT PRODUCTION</div><div class="v25PosterTitle">${title}</div><div class="v25PosterCredits">${arcadeEsc(e.camera.name)} VISUALS<br>${arcadeEsc(e.composer.name)} SCORE</div><div class="v25Wave">${Array.from({ length: 24 }, (_, i) => `<i style="height:${20 + ((i * 17) % 65)}%"></i>`).join("")}</div></div>`;
}

// Style Studio replaces the older static music/camera choice section while preserving the crew reels.
const V25_PRODUCTION_BASE = LEGACY_PRODUCTION_PAGE_V22;
const ACTIVE_PRODUCTION_PAGE_V25 = function v25ProductionPage() {
  v25EnsureState();
  // Render existing crew page first, then replace its creative board.
  V25_PRODUCTION_BASE();
  const board = document.querySelector(".arcadeCreativeBoard");
  if (!board) return;
  const style = S.arcade.style;
  board.innerHTML = `<div class="v25StyleHeader"><div><span class="mini">Style Studio</span><h1>Build the film’s creative identity.</h1><p>Choose a package, then direct how it should be used. Strong genre matches are safer; cross-genre choices create identity and risk.</p></div></div>
    <div class="v25StyleLayout"><div class="v25StyleControls">
      <section><div class="arcadeBoardHead"><div><span class="mini">Score draft</span><h2>Sound package</h2></div><span>Pick one</span></div><div class="v25PackageGrid">${V25_COMPOSER_PACKAGES.map((x) => v25StylePackageCard(x, "composer", style.composerId)).join("")}</div><div class="arcadeBoardHead compact"><div><span class="mini">Direction note</span><h3>Music emphasis</h3></div></div><div class="v25EmphasisGrid">${v25EmphasisCards("music", style.musicEmphasis)}</div></section>
      <section><div class="arcadeBoardHead"><div><span class="mini">Cinematography draft</span><h2>Visual package</h2></div><span>Pick one</span></div><div class="v25PackageGrid">${V25_CAMERA_PACKAGES.map((x) => v25StylePackageCard(x, "camera", style.cameraId)).join("")}</div><div class="arcadeBoardHead compact"><div><span class="mini">Direction note</span><h3>Camera emphasis</h3></div></div><div class="v25EmphasisGrid">${v25EmphasisCards("visual", style.visualEmphasis)}</div></section>
    </div><aside class="v25StylePreview">${v25PosterPreview()}<div class="v25StyleReadout"><div><span>Music ceiling</span><b>${Math.round(v25StyleEffects().musicScore)}</b></div><div><span>Visual ceiling</span><b>${Math.round(v25StyleEffects().visualScore)}</b></div><div><span>Creative risk</span><b>${v25StyleEffects().risk}</b></div></div></aside></div>`;
  $$("[data-v25-package]").forEach(
    (b) =>
      (b.onclick = () => {
        S.arcade.style[b.dataset.v25PackageKind + "Id"] = b.dataset.v25Package;
        render();
      }),
  );
  $$("[data-v25-emphasis]").forEach(
    (b) =>
      (b.onclick = () => {
        S.arcade.style[b.dataset.v25EmphasisKind + "Emphasis"] =
          b.dataset.v25Emphasis;
        render();
      }),
  );
  const next = $("#toMarketing");
  if (next)
    next.disabled = !(
      S.arcade.style.composerId &&
      S.arcade.style.cameraId &&
      S.arcade.style.musicEmphasis &&
      S.arcade.style.visualEmphasis &&
      arcadeCrewReady()
    );
};

// Candidate cards now show the source-era performer, dynamic recommendations,
// confidence, living filmography and neutral working-style traits.

// =============================================================================
// ACTOR CARD SCORE COLORS + EXPANDABLE DETAILS
// =============================================================================

// A value equal to the average appears yellow.
// A value around average - spread appears red.
// A value around average + spread appears green.
const ACTOR_CARD_AVERAGES = {
  characterFit: 65,
  commercial: 65,
  creative: 65,
  confidence: 70,
};

const ACTOR_CARD_COLOR_SPREAD = {
  characterFit: 25,
  commercial: 25,
  creative: 25,
  confidence: 20,
};

function actorScoreColor(value, average, spread = 25) {
  const numericValue = safe(value, average);

  // Converts the score into a 0–1 range:
  // 0 = red, .5 = yellow, 1 = green.
  const position = clamp(
    (numericValue - (average - spread)) / (spread * 2),
    0,
    1,
  );

  // HSL hue:
  // 0 degrees = red
  // 60 degrees = yellow
  // 120 degrees = green
  const hue = Math.round(position * 120);

  return {
    hue,
    text: `hsl(${hue} 82% 67%)`,
    border: `hsl(${hue} 62% 48% / .72)`,
    background: `linear-gradient(
      145deg,
      hsl(${hue} 52% 20% / .88),
      hsl(${hue} 38% 11% / .94)
    )`,
    glow: `0 0 18px hsl(${hue} 72% 52% / .13)`,
  };
}

function actorHeadlineStat(label, value, average, spread, suffix = "") {
  const rounded = Math.round(safe(value));
  const color = actorScoreColor(rounded, average, spread);
  const difference = rounded - average;

  const comparison =
    difference > 0
      ? `${difference} above average`
      : difference < 0
        ? `${Math.abs(difference)} below average`
        : "Exactly average";

  return `
    <div
      class="v29HeadlineStat"
      style="
        --score-text: ${color.text};
        --score-border: ${color.border};
        --score-background: ${color.background};
        --score-glow: ${color.glow};
      "
      title="Average: ${average} · ${comparison}"
    >
      <span>${arcadeEsc(label)}</span>

      <b>
        ${rounded}${suffix}
      </b>

      <small>
        Avg ${average}
      </small>
    </div>
  `;
}

function actorHiddenStat(label, hint = "Revealed after audition") {
  return `
    <div class="v29HeadlineStat" title="${arcadeEsc(hint)}">
      <span>${arcadeEsc(label)}</span>
      <b>—</b>
      <small>${arcadeEsc(hint)}</small>
    </div>
  `;
}

arcadeCandidateCard = function v25CandidateCard(p, slot) {
  const attrs = adjusted(p, slot, true);
  const before = adjusted(p, slot, false);
  const effects = v24FitEffects(p, slot);
  const audition = v24AuditionFor(slot, p.id);
  const fitRevealed = Boolean(audition);
  const visibleAfter = fitRevealed ? attrs : before;
  const shortlisted = (S.shortlists[slot] || []).includes(p.id);
  const selected = S.roster[slot] === p.id;
  let tier = "B",
    tierBefore = "B";
  try {
    tier = talentTier(p, slot);
    tierBefore = audition?.tierBeforeAudition || baseTalentTier(p, slot);
  } catch {}
  const recommendation = v25RecommendationBadge(p, slot);
  const scores = fitRevealed ? v25RecommendationScores(p, slot) : null;
  const traits = p.workingStyleTraits || [];
  const sourceTitle =
    p.sourceMovieTitle ||
    S.sourcePools?.[slot]?.[S.sourceIndex?.[slot] || 0]?.film?.title ||
    "source film";
  const sourceYear = v25SourceYearFor(p, slot);
  const gender = v25GenderMatch(p, slot);
  return `<article class="arcadeActorCard v25ActorCard ${selected ? "selected" : ""}" data-card-person="${p.id}">
    <div class="arcadeActorImage">
      <div class="fallback">${arcadeEsc(v38ActorInitials(p.name))}</div>
      ${p.photo ? `<img src="${arcadeEsc(p.photo)}" alt="${arcadeEsc(p.name)}" decoding="async" data-v38-portrait>` : ""}
      <div class="tier ${tier}">${tier}</div>${recommendation ? `<span class="v25Recommendation">${arcadeEsc(recommendation)}</span>` : ""}
    </div>
    <button type="button" class="v38LoadPhoto ${p.photo ? "v38PhotoReady" : ""}" data-load-photo="${p.id}">${p.photo ? "Reload photo" : "Load photo"}</button>
    <div class="arcadeActorBody"><div class="arcadeActorName"><div><h3>${arcadeEsc(p.name)}</h3><span>Age <b data-v38-age="${p.id}">${v25CastingAge(p, slot) ?? "Unavailable offline"}</b> in ${arcadeEsc(sourceTitle)} (${sourceYear})</span></div>${selected ? '<b class="arcadeHiredFlag">HIRED</b>' : ""}</div>
    <div class="v25ThreeScores">
    ${
      fitRevealed
        ? actorHeadlineStat(
            "Character fit",
            attrs.fit,
            ACTOR_CARD_AVERAGES.characterFit,
            ACTOR_CARD_COLOR_SPREAD.characterFit,
          )
        : actorHiddenStat("Character fit", "Reveal with audition")
    }

    ${
      fitRevealed
        ? actorHeadlineStat(
            "Commercial",
            scores["Commercial Pick"],
            ACTOR_CARD_AVERAGES.commercial,
            ACTOR_CARD_COLOR_SPREAD.commercial,
          )
        : actorHiddenStat("Commercial", "Hidden until audition")
    }

    ${
      fitRevealed
        ? actorHeadlineStat(
            "Creative",
            scores["Creative Pick"],
            ACTOR_CARD_AVERAGES.creative,
            ACTOR_CARD_COLOR_SPREAD.creative,
          )
        : actorHiddenStat("Creative", "Hidden until audition")
    }

    ${
      fitRevealed
        ? actorHeadlineStat(
            "Confidence",
            scores.confidence,
            ACTOR_CARD_AVERAGES.confidence,
            ACTOR_CARD_COLOR_SPREAD.confidence,
            "%",
          )
        : actorHiddenStat("Confidence", "Hidden until audition")
    }
  </div>

  <details class="v29ActorDetails">
    <summary>
      <span>
        View detailed scouting report
      </span>

      <small>
        Fit, stats, traits and filmography
      </small>
    </summary>

    <div class="v29ActorDetailsBody">
    ${S.arcade.fitMode === "Realistic" && fitRevealed ? `<div class="v24FitImpact"><div><span>Age fit</span><b class="${effects.age >= 0 ? "positive" : "negative"}">${arcadeEsc(effects.ageLabel)}</b><small>${effects.actorAge ?? "?"} vs target ${effects.targetAge ?? "?"}</small></div><div><span>Gender fit</span><b class="${gender.match === false ? "negative" : "positive"}">${arcadeEsc(gender.status)}</b><small>${gender.match === false ? "Fixed fit penalty; binary rule." : "No gender penalty."}</small></div></div>` : ""}
    <div class="arcadeQuickStats">${arcadeStatCell("Craft", before.craft, visibleAfter.craft)}${arcadeStatCell("Draw", before.draw, visibleAfter.draw)}${arcadeStatCell("Reliability", before.reliability, visibleAfter.reliability)}${arcadeStatCell("Momentum", before.momentum, visibleAfter.momentum)}${arcadeStatCell("Chemistry", before.chemistry, visibleAfter.chemistry)}</div>
    ${traits.length ? `<div class="v25Traits"><span>Working style</span>${traits.map((t) => `<b title="${arcadeEsc(t.effect)}">${arcadeEsc(t.name)}</b>`).join("")}</div>` : ""}
    ${audition ? `<div class="arcadeAuditionRead"><b>Audition locked in</b><span>${tierBefore !== tier ? `${tierBefore} → ${tier} tier` : "Revealed performance remains for this run."}</span></div>` : `<div class="arcadeAuditionRead"><b>Scouting only</b><span>Fit and true upside/downside stay hidden until audition.</span></div>`}
    ${v25CareerTimeline(p)}
    </div>
  </details>
    <div class="arcadeActorActions"><button class="btn" data-short="${p.id}">${shortlisted ? "★ Pinned" : "☆ Pin"}</button><button class="btn" data-aud="${p.id}" ${audition || arcadeAuditionCount() >= 3 ? "disabled" : ""}>${audition ? "Auditioned" : "Reveal fit"}</button><button class="btn primary" data-hire="${p.id}">${selected ? "Selected" : "Hire"}</button></div>
    <button class="cameoBtn ${S.cameos[slot]?.personId === p.id ? "active" : ""}" data-cameo-person="${p.id}" data-cameo-slot="${slot}">${S.cameos[slot]?.personId === p.id ? `Cameo: ${arcadeEsc(S.cameos[slot].character)}` : "Use iconic-role cameo"}</button></div></article>`;
};

// Upgrade saved picks so clicking one jumps to its original film and card.
function v25RememberSavedSource(slot, personId) {
  S.arcade.savedPickSources[slot] = S.arcade.savedPickSources[slot] || {};
  const pools = S.sourcePools?.[slot] || [];
  let index = pools.findIndex((entry) =>
    (entry.people || []).some((p) => p.id === personId),
  );
  if (index < 0) index = S.sourceIndex?.[slot] || 0;
  S.arcade.savedPickSources[slot][personId] = index;
}

v24SavedPicks = function v25SavedPicks(slot) {
  const ids = S.shortlists[slot] || [];
  if (!ids.length)
    return '<div class="arcadeShortlistEmpty">Pin actors to create a cross-film watchlist. Click a pin later to jump straight back to that actor’s source film and card.</div>';
  return `<div class="arcadeShortlistStrip">${ids
    .map((id) => {
      const p = person(id);
      if (!p) return "";
      return `<button class="arcadeShortChip" data-saved-open="${id}">${p.photo ? `<img src="${p.photo}" alt="">` : "<span>?</span>"}<div><b>${arcadeEsc(p.name)}</b><small>${arcadeEsc(p.sourceMovieTitle || "Saved actor")} · age ${v25CastingAge(p, slot) ?? "?"}</small></div><span data-short-remove="${id}">×</span></button>`;
    })
    .join("")}</div>`;
};

// Persist source and era metadata in saves.
const V25_COMPACT_PERSON_BASE = compactPerson;
compactPerson = function v25CompactPerson(p, rosterTmdbIds) {
  const out = V25_COMPACT_PERSON_BASE(p, rosterTmdbIds);
  if (!out) return out;
  return {
    ...out,
    gender: p.gender || 0,
    sourceMovieId: p.sourceMovieId || null,
    sourceMovieTitle: p.sourceMovieTitle || null,
    sourceMovieYear: p.sourceMovieYear || null,
    sourceMoviePoster: p.sourceMoviePoster || null,
    eraKnownProjects: (p.eraKnownProjects || []).slice(0, 5),
    careerMomentumLabel: p.careerMomentumLabel || null,
    workingStyleTraits: (p.workingStyleTraits || []).slice(0, 3),
    v25EraLoaded: Boolean(p.v25EraLoaded),
  };
};

// Update master copy labels.
const V25_SHELL_BASE = shell;
shell = function v25Shell(main) {
  v25EnsureState();
  V25_SHELL_BASE(main);
  document
    .querySelector(".brand")
    ?.setAttribute("title", "GREENLIT Arcade V25");
};

v25EnsureState();

function arcadeCrewReady() {
  const crew = S.arcade?.crew || {};
  const directors = (crew.selectedDirectors || []).length;
  const writers = (crew.selectedWriters || []).length;
  return directors >= 1 && writers >= 1 && directors + writers <= 3;
}

// =============================================================================
// GREENLIT V26 — MOVIE ERA, ARCADE RELEASE CURVES, STYLE FIXES
// =============================================================================
const V26_VERSION = "26.0";

function v26EnsureState() {
  ensureArcadeState();
  S.arcade.version = V26_VERSION;
  S.arcade.releaseYear = safe(
    S.arcade.releaseYear,
    safe(S.project.year, new Date().getFullYear()),
  );
  S.arcade.customMovie = Boolean(S.arcade.customMovie);
  S.arcade.releaseProfile = S.arcade.releaseProfile || null;
  ARCADE_QUICK_TUNING = {
    boxOffice: 1,
    randomness: 0.88,
    awards: 1,
    arcadeAssist: 1.12,
    allTimeHitTarget: 10,
    ...(ARCADE_QUICK_TUNING || {}),
  };
}

// Remove the yellow Best Fit recommendation while preserving the other lenses.
const V26_RECOMMENDATION_BADGE_BASE = v25RecommendationBadge;
v25RecommendationBadge = function v26RecommendationBadge(p, slot) {
  const result = V26_RECOMMENDATION_BADGE_BASE(p, slot);
  return result === "Best Fit" ? null : result;
};

// Cameos are deliberately transformative and ignore age/gender casting constraints.
const V26_BASE_ATTRS_BASE = baseAttrs;
baseAttrs = function v26BaseAttrs(p, slot) {
  const attrs = V26_BASE_ATTRS_BASE(p, slot);
  if (
    ARCADE_ACTOR_SLOTS.includes(slot) &&
    S.cameos?.[slot]?.personId === p?.id
  ) {
    const fit = v24FitEffects(p, slot);
    attrs.fit = clamp(attrs.fit - fit.age - fit.gender);
    if (S.arcade.fitMode === "Realistic") {
      attrs.chemistry = clamp(
        attrs.chemistry - fit.age * 0.18 - fit.gender * 0.28,
      );
      attrs.reliability = clamp(attrs.reliability - fit.age * 0.08);
      attrs.momentum = clamp(attrs.momentum - fit.gender * 0.06);
    }
  }
  return attrs;
};

function v26GenreEraMultiplier(genre, year, reference = S.reference) {
  const y = safe(year, 2020);
  const titleText =
    `${reference?.title || ""} ${reference?.overview || ""}`.toLowerCase();
  const superhero =
    /superhero|super hero|avengers|batman|superman|spider|marvel|dc |wonder woman|supergirl|x-men|iron man|thor|captain america/.test(
      titleText,
    );
  let multiplier = 1;
  const era =
    {
      Action: [
        [1984, 1999, 1.08],
        [2008, 2019, 1.12],
        [2020, 2024, 0.96],
      ],
      Adventure: [
        [1977, 1989, 1.08],
        [2001, 2019, 1.1],
      ],
      Animation: [
        [1989, 1999, 1.1],
        [2001, 2019, 1.12],
        [2020, 2026, 1.06],
      ],
      Comedy: [
        [1980, 2008, 1.08],
        [2018, 2026, 0.93],
      ],
      Crime: [
        [1970, 1979, 1.1],
        [1990, 2007, 1.06],
      ],
      Drama: [
        [1970, 1999, 1.05],
        [2016, 2026, 0.96],
      ],
      Family: [
        [1985, 2007, 1.08],
        [2013, 2019, 1.06],
      ],
      Fantasy: [
        [2001, 2014, 1.14],
        [2015, 2026, 0.98],
      ],
      Horror: [
        [1973, 1988, 1.08],
        [2017, 2026, 1.13],
      ],
      Music: [
        [1977, 1987, 1.08],
        [2016, 2024, 1.06],
      ],
      Romance: [
        [1989, 2008, 1.1],
        [2015, 2026, 0.94],
      ],
      "Sci-Fi": [
        [1977, 1986, 1.11],
        [1999, 2019, 1.1],
        [2020, 2026, 1.02],
      ],
      Thriller: [
        [1987, 2004, 1.08],
        [2014, 2026, 1.04],
      ],
      War: [[1998, 2017, 1.06]],
      Western: [
        [1952, 1971, 1.15],
        [1990, 1995, 1.07],
        [2010, 2016, 1.05],
      ],
    }[genre] || [];
  for (const [from, to, value] of era)
    if (y >= from && y <= to) multiplier *= value;
  if (superhero) {
    if (y >= 2008 && y <= 2019) multiplier *= 1.18;
    else if (y >= 2020 && y <= 2026) multiplier *= 0.88;
    else if (y >= 1998 && y <= 2007) multiplier *= 1.04;
  }
  return clamp(multiplier, 0.85, 1.18);
}

// Fix Style Studio scoring by consuming the final style scores directly.
const V26_SCORE_BASE = arcadeCalculateScores;
arcadeCalculateScores = function v26CalculateScores(simulation, effects) {
  const result = V26_SCORE_BASE(simulation, effects);
  const style = v25StyleEffects();
  const chosen = S.arcade?.style || {};
  const completeMusic = Boolean(chosen.composerId && chosen.musicEmphasis);
  const completeVisuals = Boolean(chosen.cameraId && chosen.visualEmphasis);
  result.categories.music = clamp(
    completeMusic ? style.musicScore + simulation.audience * 0.05 : 55,
  );
  result.categories.visuals = clamp(
    completeVisuals ? style.visualScore + simulation.critic * 0.045 : 55,
  );
  const weights =
    result.weights ||
    ARCADE_DEFAULT_GENRE_WEIGHTS[S.project.genre] ||
    ARCADE_DEFAULT_GENRE_WEIGHTS.Drama;
  const totalWeight =
    Object.values(weights).reduce((sum, n) => sum + safe(n), 0) || 100;
  result.total = clamp(
    Object.entries(result.categories).reduce(
      (sum, [key, value]) => sum + (value * safe(weights[key])) / totalWeight,
      0,
    ),
  );
  result.grade = arcadeGradeLetter(result.total);
  return result;
};

function v26ChooseReleaseProfile(simulation) {
  const r = rng("v26-release-profile");
  const wom = safe(simulation.vars?.wom, 60);
  const audience = safe(simulation.audience, 60);
  const profiles = [];
  profiles.push(["standard", 35]);
  profiles.push(["stable", 12 + Math.max(0, audience - 65) * 0.45]);
  profiles.push(["sleeper", 7 + Math.max(0, wom - 68) * 0.7]);
  profiles.push([
    "phenomenon",
    2 + Math.max(0, wom - 82) * 0.65 + Math.max(0, audience - 86) * 0.45,
  ]);
  profiles.push([
    "rerelease",
    5 +
      (S.project.genre === "Horror" ||
      S.project.genre === "Animation" ||
      S.project.genre === "Sci-Fi"
        ? 3
        : 0),
  ]);
  const total = profiles.reduce((s, x) => s + x[1], 0);
  let draw = r() * total;
  for (const [name, weight] of profiles) {
    draw -= weight;
    if (draw <= 0) return name;
  }
  return "standard";
}

function v26WeeklyProfile(total, startWeek, seed, opening, profile) {
  const random = raceRandom(seed);
  const weekly = Array(52).fill(0);
  const weights = [];
  for (let week = startWeek; week < 52; week += 1) {
    const age = week - startWeek;
    let w = 0;
    if (profile === "stable")
      w = age < 7 ? 0.86 + random() * 0.24 : Math.pow(0.77, age - 6) * 0.8;
    else if (profile === "sleeper")
      w = age < 6 ? 0.55 + age * 0.16 : Math.pow(0.72, age - 5) * 1.38;
    else if (profile === "phenomenon")
      w = age < 7 ? 0.48 + age * 0.22 : Math.pow(0.74, age - 6) * 1.72;
    else if (profile === "rerelease") {
      w = Math.pow(0.67, age);
      const comeback = 20 + Math.floor(random() * 16);
      if (age >= comeback && age <= comeback + 3)
        w += [1.1, 1.65, 1.25, 0.7][age - comeback];
    } else w = Math.pow(0.66 + random() * 0.05, age);
    w *= 0.82 + random() * 0.36;
    weights.push([week, Math.max(0.001, w)]);
  }
  if (opening != null && weights.length)
    weights[0][1] *= clamp(opening / Math.max(1, total * 0.12), 0.65, 2.6);
  const sum = weights.reduce((s, x) => s + x[1], 0) || 1;
  for (const [week, w] of weights) weekly[week] = (total * w) / sum;
  return weekly;
}

const V26_BUILD_RELEASE_BASE = buildReleaseRace;
buildReleaseRace = function v26BuildReleaseRace(simulation) {
  const race = V26_BUILD_RELEASE_BASE(simulation);
  const player = race.find((movie) => movie.player);
  if (!player) return race;
  const profile =
    S.arcade.releaseProfile || v26ChooseReleaseProfile(simulation);
  S.arcade.releaseProfile = profile;
  player.weekly = v26WeeklyProfile(
    player.revenueM,
    player.releaseWeek,
    `${S.runSeed}|v26|${profile}`,
    simulation.opening,
    profile,
  );
  let running = 0;
  player.cumulative = player.weekly.map((value) => (running += value));
  player.releaseProfile = profile;
  return race;
};

const V26_SIMULATE_BASE = simulate;
simulate = function v26Simulate() {
  v26EnsureState();
  S.project.year = safe(S.arcade.releaseYear, S.project.year);
  const simulation = V26_SIMULATE_BASE();
  const era = v26GenreEraMultiplier(S.project.genre, S.project.year);
  let multiplier = era;
  if (S.arcade.fitMode === "Arcade") {
    multiplier *= safe(ARCADE_QUICK_TUNING.arcadeAssist, 1.12);
    const target =
      clamp(safe(ARCADE_QUICK_TUNING.allTimeHitTarget, 10), 0, 30) / 100;
    const packageSignal = clamp(
      (safe(simulation.audience, 60) +
        safe(simulation.critic, 60) +
        safe(simulation.vars?.wom, 60)) /
        300,
      0.55,
      1.15,
    );
    if (rng("v26-arcade-jackpot")() < target * packageSignal) {
      multiplier *= 2.1 + rng("v26-arcade-jackpot-size")() * 1.7;
      simulation.arcadeBreakout = true;
    }
  }
  simulation.genreEraMultiplier = era;
  simulation.world *= multiplier;
  simulation.opening *= Math.sqrt(multiplier);
  simulation.domestic *= multiplier;
  simulation.theatricalRevenue = simulation.world * simulation.studioShare;
  simulation.distributionShare = Math.max(
    0,
    simulation.world - simulation.theatricalRevenue,
  );
  simulation.backend = simulation.world * safe(scaleEconomy().backendRate);
  simulation.totalCost =
    safe(simulation.budget) +
    safe(simulation.marketing) +
    safe(simulation.overhead) +
    safe(simulation.backend) +
    safe(simulation.overrun);
  simulation.totalStudioRevenue =
    simulation.theatricalRevenue + safe(simulation.ancillary);
  simulation.profit = simulation.totalStudioRevenue - simulation.totalCost;
  const outcome = classifyOutcome({
    gross: simulation.world,
    profit: simulation.profit,
    totalCost: simulation.totalCost,
    productionBudget: simulation.budget,
  });
  simulation.roi = outcome.roi;
  simulation.outcome = outcome.label;
  simulation.arcadeScores = arcadeCalculateScores(
    simulation,
    arcadeCreativeEffects(),
  );
  simulation.identity = arcadeIdentityFor(simulation, simulation.arcadeScores);
  S.arcade.finalScores = simulation.arcadeScores;
  S.arcade.identity = simulation.identity;
  return simulation;
};

// Visually identify complete director/writer pairs when both are in the same reel.
const V26_CREW_CARD_BASE = arcadeCrewCard;
arcadeCrewCard = function v26CrewCard(p, kind) {
  let html = V26_CREW_CARD_BASE(p, kind);
  const poolIds =
    S.arcade?.crew?.[kind === "directors" ? "directorsPool" : "writersPool"] ||
    [];
  const poolNames = poolIds
    .map((id) => person(id)?.name?.toLowerCase())
    .filter(Boolean);
  const name = p?.name?.toLowerCase();
  const paired = ARCADE_DIRECTOR_DUOS.some((key) => {
    const pair = key.split("|");
    return (
      pair.includes(name) && pair.every((member) => poolNames.includes(member))
    );
  });
  if (paired)
    html = html
      .replace("arcadeCrewCard ", "arcadeCrewCard v26DuoCard ")
      .replace("<div><b>", '<div><span class="v26DuoLabel">PAIR</span><b>');
  return html;
};

function v26CreateCustomMovie(values) {
  resetRunState(true);
  ensureArcadeState();
  const year = safe(values.year, new Date().getFullYear());
  S.reference = {
    id: `custom-${Date.now()}`,
    type: "movie",
    title: values.title || "Untitled Original",
    year,
    month: values.month || "July",
    genre: values.genre || "Drama",
    genres: [values.genre || "Drama"],
    scale: values.scale || "Mid-Budget",
    budgetM: average(SCALE[values.scale || "Mid-Budget"].budget),
    revenueM: 0,
    poster: null,
    overview: values.logline || "An original GREENLIT project.",
    vote: 0,
    custom: true,
  };
  S.project = {
    ...S.project,
    title: S.reference.title,
    genre: S.reference.genre,
    year,
    month: S.reference.month,
    scale: S.reference.scale,
    type: "Original",
    directors: 1,
    writers: 1,
    producers: 0,
  };
  S.roles = {
    "Lead 1": values.role1 || "Lead Character",
    "Lead 2": values.role2 || "Second Lead",
    "Cast 3": values.role3 || "Supporting Character",
    "Cast 4": values.role4 || "Supporting Character",
    "Cast 5": values.role5 || "Supporting Character",
  };
  S.originalAges = {};
  S.referenceCredits = { cast: [], crew: [] };
  S.arcade = arcadeFreshState();
  S.arcade.customMovie = true;
  S.arcade.releaseYear = year;
  S.arcade.originalCast = ARCADE_ACTOR_SLOTS.map((slot, index) => ({
    id: `custom-role-${index}`,
    name: "Open casting",
    character: S.roles[slot],
    photo: null,
    gender: 0,
    age: null,
  }));
  render();
}

function v26CustomMovieModal() {
  modal(
    `<div class="arcadeModalHead"><div><div class="mini">Original project</div><h2>Create your own movie</h2><p class="sub">Build a clean role template, then cast and release it like any other run.</p></div><button class="balanceClose" data-close>×</button></div>
  <div class="formgrid"><div><label>Title</label><input id="v26CustomTitle" value="Untitled Original"></div><div><label>Genre</label><select id="v26CustomGenre">${GENRES.map((g) => `<option>${g}</option>`).join("")}</select></div><div><label>Release year</label><input id="v26CustomYear" type="number" min="1930" max="2040" value="${new Date().getFullYear()}"></div><div><label>Scale</label><select id="v26CustomScale">${Object.keys(
    SCALE,
  )
    .map((x) => `<option>${x}</option>`)
    .join(
      "",
    )}</select></div><div style="grid-column:1/-1"><label>Logline</label><input id="v26CustomLogline" placeholder="A one-sentence movie premise"></div>${[1, 2, 3, 4, 5].map((i) => `<div><label>Character ${i}</label><input id="v26Role${i}" value="${i === 1 ? "Lead Character" : i === 2 ? "Second Lead" : "Supporting Character"}"></div>`).join("")}</div><button class="btn primary" id="v26CreateMovie">Create movie →</button>`,
    "v26CustomMovieModal",
  );
  $("#v26CreateMovie").onclick = () => {
    const values = {
      title: $("#v26CustomTitle").value.trim(),
      genre: $("#v26CustomGenre").value,
      year: +$("#v26CustomYear").value,
      scale: $("#v26CustomScale").value,
      logline: $("#v26CustomLogline").value.trim(),
    };
    for (let i = 1; i <= 5; i++)
      values[`role${i}`] = $(`#v26Role${i}`).value.trim();
    closeModal();
    v26CreateCustomMovie(values);
  };
}

const V26_PROJECT_PAGE_BASE = ACTIVE_PROJECT_PAGE_V24;
const ACTIVE_PROJECT_PAGE_V26 = function v26ProjectPage() {
  v26EnsureState();
  V26_PROJECT_PAGE_BASE();
  const searchPanel = document.querySelector(".arcadeSearchPanel");
  if (searchPanel && !$("#v26CreateCustom"))
    searchPanel.insertAdjacentHTML(
      "afterbegin",
      `<div class="v26ProjectActions"><button class="btn primary" id="v26CreateCustom">＋ Create original movie</button><span>or recast an existing movie below</span></div>`,
    );
  if ($("#v26CreateCustom"))
    $("#v26CreateCustom").onclick = v26CustomMovieModal;
  const picked = document.querySelector(".arcadePickedMovie");
  if (picked && !$("#v26ReleaseYear")) {
    picked.insertAdjacentHTML(
      "beforeend",
      `<div class="v26ReleaseYear"><label>Your release year</label><input id="v26ReleaseYear" type="number" min="1930" max="2040" value="${safe(S.arcade.releaseYear, S.project.year)}"><small>Genre popularity and yearly competition use this date. The original film remains the casting template.</small><div class="v26EraReadout">Era demand: <b>${v26GenreEraMultiplier(S.project.genre, safe(S.arcade.releaseYear, S.project.year)).toFixed(2)}×</b></div></div>`,
    );
    $("#v26ReleaseYear").onchange = (e) => {
      S.arcade.releaseYear = +e.target.value;
      render();
    };
  }
};

const V26_SHELL_BASE = shell;
shell = function v26Shell(main) {
  v26EnsureState();
  V26_SHELL_BASE(main);
  document
    .querySelector(".brand")
    ?.setAttribute("title", "GREENLIT Arcade V26");
};

v26EnsureState();

// =============================================================================
// GREENLIT ARCADE V27 — STORY-FIRST THEATRICAL RUN
// =============================================================================

const V27_MONTH_ENVIRONMENTS = {
  January: {
    demand: 0.88,
    competition: 0.72,
    marketing: 0.84,
    awards: 0.25,
    sleeper: 1.35,
    holiday: 0,
    label: "Counterprogramming window",
  },
  February: {
    demand: 0.94,
    competition: 0.82,
    marketing: 0.9,
    awards: 0.3,
    sleeper: 1.15,
    holiday: 0,
    label: "Romance and genre window",
  },
  March: {
    demand: 1.0,
    competition: 0.92,
    marketing: 0.96,
    awards: 0.34,
    sleeper: 1.04,
    holiday: 0,
    label: "Spring expansion",
  },
  April: {
    demand: 1.02,
    competition: 0.98,
    marketing: 1.0,
    awards: 0.38,
    sleeper: 1.02,
    holiday: 0,
    label: "Pre-summer launchpad",
  },
  May: {
    demand: 1.13,
    competition: 1.22,
    marketing: 1.14,
    awards: 0.42,
    sleeper: 0.9,
    holiday: 0,
    label: "Summer kickoff",
  },
  June: {
    demand: 1.17,
    competition: 1.28,
    marketing: 1.18,
    awards: 0.4,
    sleeper: 0.86,
    holiday: 0,
    label: "Peak summer market",
  },
  July: {
    demand: 1.18,
    competition: 1.3,
    marketing: 1.2,
    awards: 0.42,
    sleeper: 0.84,
    holiday: 0,
    label: "Event-movie battleground",
  },
  August: {
    demand: 1.03,
    competition: 1.02,
    marketing: 1.02,
    awards: 0.38,
    sleeper: 1.08,
    holiday: 0,
    label: "Late-summer opportunity",
  },
  September: {
    demand: 0.96,
    competition: 0.78,
    marketing: 0.9,
    awards: 0.62,
    sleeper: 1.22,
    holiday: 0,
    label: "Festival and sleeper season",
  },
  October: {
    demand: 1.04,
    competition: 0.96,
    marketing: 1.02,
    awards: 0.82,
    sleeper: 1.08,
    holiday: 0.15,
    label: "Prestige and horror season",
  },
  November: {
    demand: 1.13,
    competition: 1.24,
    marketing: 1.16,
    awards: 1.18,
    sleeper: 0.92,
    holiday: 0.65,
    label: "Holiday launch corridor",
  },
  December: {
    demand: 1.15,
    competition: 1.38,
    marketing: 1.22,
    awards: 1.35,
    sleeper: 0.88,
    holiday: 1.3,
    label: "Holiday and awards showdown",
  },
};

const V27_GENRE_MONTH_FIT = {
  Action: { May: 1.08, June: 1.12, July: 1.12, August: 1.04 },
  Adventure: { May: 1.07, June: 1.1, July: 1.1, December: 1.05 },
  Animation: {
    March: 1.04,
    June: 1.1,
    July: 1.1,
    November: 1.07,
    December: 1.12,
  },
  Comedy: {
    February: 1.04,
    June: 1.06,
    July: 1.06,
    November: 1.05,
    December: 1.06,
  },
  Crime: { September: 1.05, October: 1.08, November: 1.05 },
  Documentary: { September: 1.08, October: 1.1, November: 1.08 },
  Drama: { September: 1.07, October: 1.1, November: 1.12, December: 1.12 },
  Family: {
    March: 1.04,
    June: 1.08,
    July: 1.08,
    November: 1.1,
    December: 1.14,
  },
  Fantasy: { June: 1.06, July: 1.07, November: 1.08, December: 1.12 },
  History: { September: 1.05, October: 1.08, November: 1.12, December: 1.1 },
  Horror: { January: 1.08, September: 1.06, October: 1.18 },
  Music: { June: 1.04, September: 1.05, November: 1.07, December: 1.08 },
  Mystery: { January: 1.05, September: 1.07, October: 1.1 },
  Romance: { February: 1.18, November: 1.04, December: 1.06 },
  "Sci-Fi": { May: 1.08, June: 1.1, July: 1.1, December: 1.04 },
  Thriller: { January: 1.1, September: 1.08, October: 1.08 },
  War: { September: 1.04, October: 1.07, November: 1.1 },
  Western: { June: 1.04, July: 1.05, September: 1.06 },
};

const V27_PROFILE_LABELS = {
  juggernaut: "The Juggernaut",
  sleeper: "The Sleeper",
  phenomenon: "Word-of-Mouth Phenomenon",
  holiday: "Holiday Classic",
  awards: "Awards Revival",
  cult: "Cult Rebound",
  international: "International Breakout",
  viral: "Viral Resurgence",
  frontloaded: "Frontloaded Event",
  stable: "Steady Performer",
  standard: "Standard Run",
};

function v27EnsureState() {
  v26EnsureState();
  S.arcade.storyLog = S.arcade.storyLog || [];
  S.arcade.releaseStory = S.arcade.releaseStory || null;
  S.arcade.legacy = S.arcade.legacy || null;
  S.arcade.releaseWeekCursor = safe(S.arcade.releaseWeekCursor, 0);
}

function v27MonthEnvironment(month = S.project.month) {
  return V27_MONTH_ENVIRONMENTS[month] || V27_MONTH_ENVIRONMENTS.July;
}
function v27GenreMonthFit(genre = S.project.genre, month = S.project.month) {
  const primary = safe(V27_GENRE_MONTH_FIT[genre]?.[month], 1);
  const secondary = S.arcade?.secondaryGenre;
  if (!secondary || secondary === genre) return primary;
  return (
    primary * 0.85 + safe(V27_GENRE_MONTH_FIT[secondary]?.[month], 1) * 0.15
  );
}

function v27ReleaseStrategy() {
  const env = v27MonthEnvironment(),
    fit = v27GenreMonthFit();
  const opportunity = clamp(
    (env.demand * fit) / (env.competition || 1),
    0.5,
    1.6,
  );
  const risk = clamp(env.competition * env.marketing, 0.55, 1.75);
  return { env, fit, opportunity, risk };
}

function v27StorySeed(tag) {
  return rng(`v27-story-${tag}`);
}
function v27StoryEntry(chapter, title, text, tone = "neutral", icon = "•") {
  return { chapter, title, text, tone, icon };
}

function v27BuildPreReleaseStory(sim) {
  const entries = [];
  const strategy = v27ReleaseStrategy();
  const style = v25StyleEffects();
  const cast = ARCADE_ACTOR_SLOTS.map((slot) => person(S.roster[slot])).filter(
    Boolean,
  );
  const auditions = arcadeAuditionCount();
  entries.push(
    v27StoryEntry(
      "The Pitch",
      "A release window is chosen",
      `${S.project.month} ${S.project.year} is a ${strategy.env.label.toLowerCase()}. Demand is ${strategy.env.demand >= 1.08 ? "high" : strategy.env.demand < 0.95 ? "soft" : "steady"}, but competition is ${strategy.env.competition >= 1.2 ? "fierce" : strategy.env.competition < 0.85 ? "light" : "moderate"}.`,
      "neutral",
      "🗓️",
    ),
  );
  if (S.reference?.custom)
    entries.push(
      v27StoryEntry(
        "The Pitch",
        "An original project enters development",
        `${S.project.title} begins without an established audience, giving the campaign more freedom and more uncertainty.`,
        "neutral",
        "💡",
      ),
    );
  else
    entries.push(
      v27StoryEntry(
        "The Pitch",
        "A familiar title is rebuilt",
        `${S.project.title} uses ${S.reference.title} as its role template while targeting a ${S.arcade?.direction || "Modern Reimagining"} approach.`,
        "neutral",
        "🎬",
      ),
    );
  if (cast.length)
    entries.push(
      v27StoryEntry(
        "Casting",
        "The ensemble locks",
        `${cast
          .map((p) => p.name)
          .slice(0, 3)
          .join(
            ", ",
          )}${cast.length > 3 ? " and the rest of the ensemble" : ""} give the project ${Math.round(average(cast.map((p, i) => adjusted(p, ARCADE_ACTOR_SLOTS[i]).chemistry)))} chemistry.`,
        "good",
        "🎭",
      ),
    );
  if (auditions)
    entries.push(
      v27StoryEntry(
        "Casting",
        "Auditions alter expectations",
        `${auditions} audition${auditions === 1 ? "" : "s"} revealed hidden role fit and role-specific upside/downside that now stay attached to those performers.`,
        "good",
        "✨",
      ),
    );
  if (style.musicScore >= 78 || style.visualScore >= 78)
    entries.push(
      v27StoryEntry(
        "Creative Direction",
        "The film finds a signature",
        `${style.musicScore >= style.visualScore ? "The score" : "The cinematography"} becomes the clearest creative calling card before release.`,
        "good",
        "🎨",
      ),
    );
  const m = S.arcade?.marketingMix || { awards: 34, fans: 33, global: 33 };
  entries.push(
    v27StoryEntry(
      "Campaign",
      "The campaign declares its priorities",
      `The campaign spends most heavily on ${m.awards >= m.fans && m.awards >= m.global ? "prestige" : m.fans >= m.global ? "core fans" : "worldwide reach"}, shaping both expectations and the likely release path.`,
      "neutral",
      "📣",
    ),
  );
  return entries;
}

function v27Projection(sim) {
  const r = v27StorySeed("projection");
  const uncertainty = S.arcade?.fitMode === "Arcade" ? 0.22 : 0.3;
  const center = safe(sim.world, 100) / (0.92 + (r() - 0.5) * 0.12);
  return {
    openingLow: sim.opening * (1 - uncertainty),
    openingHigh: sim.opening * (1 + uncertainty),
    grossLow: center * (1 - uncertainty),
    grossHigh: center * (1 + uncertainty),
    confidence: Math.round(
      clamp(82 - uncertainty * 70 - safe(sim.vars?.coord, 0) * 0.15, 42, 92),
    ),
  };
}

function v27ChooseProfile(sim) {
  const r = rng("v27-profile");
  const env = v27MonthEnvironment();
  const fit = v27GenreMonthFit();
  const wom = safe(sim.vars?.wom, 60),
    aud = safe(sim.audience, 60),
    crit = safe(sim.critic, 60),
    opening = safe(sim.vars?.opening, 60);
  const weights = {
    standard: 18,
    juggernaut: Math.max(0, opening - 72) * 0.7 + 5,
    sleeper: 8 * env.sleeper + Math.max(0, wom - 67) * 0.65,
    phenomenon: 2 + Math.max(0, wom - 80) * 0.9 + Math.max(0, aud - 84) * 0.55,
    holiday:
      env.holiday * 8 +
      (["Family", "Animation", "Fantasy", "Comedy"].includes(S.project.genre)
        ? env.holiday * 5
        : 0),
    awards: env.awards * 5 + Math.max(0, crit - 76) * 0.45,
    cult:
      4 +
      Math.max(0, crit - aud) * 0.18 +
      (S.arcade?.creativeDirection === "Bold Reinvention" ? 5 : 0),
    international: 5 + Math.max(0, safe(sim.vars?.intl, 60) - 68) * 0.4,
    viral: 5 + Math.max(0, aud - crit) * 0.25,
    frontloaded: 5 + Math.max(0, opening - wom) * 0.35,
    stable: 9 + Math.max(0, aud - 68) * 0.35,
  };
  if (S.arcade?.fitMode === "Arcade") {
    weights.sleeper *= 1.18;
    weights.phenomenon *= 1.25;
    weights.viral *= 1.18;
    weights.frontloaded *= 0.72;
  }
  const entries = Object.entries(weights).map(([k, v]) => [
    k,
    Math.max(0.1, v * fit),
  ]);
  let draw = r() * entries.reduce((s, x) => s + x[1], 0);
  for (const [k, w] of entries) {
    draw -= w;
    if (draw <= 0) return k;
  }
  return "standard";
}

function v27FullRunWeights(profile, seed) {
  const r = raceRandom(seed);
  const weights = [];
  const comeback = 22 + Math.floor(r() * 18);
  for (let age = 0; age < 52; age++) {
    let w;
    if (profile === "juggernaut")
      w = Math.pow(0.74, age) * (age < 4 ? 1.25 : 1);
    else if (profile === "sleeper")
      w = age < 7 ? 0.45 + age * 0.15 : Math.pow(0.75, age - 6) * 1.35;
    else if (profile === "phenomenon")
      w = age < 8 ? 0.38 + age * 0.19 : Math.pow(0.77, age - 7) * 1.55;
    else if (profile === "holiday")
      w =
        Math.pow(0.7, age) +
        (age >= 3 && age <= 8 ? [0.25, 0.5, 0.9, 1.1, 0.8, 0.4][age - 3] : 0);
    else if (profile === "awards")
      w =
        Math.pow(0.67, age) +
        (age >= 10 && age <= 16
          ? [0.1, 0.18, 0.3, 0.55, 0.8, 0.58, 0.32][age - 10]
          : 0);
    else if (profile === "cult")
      w =
        Math.pow(0.62, age) +
        (age >= comeback && age <= comeback + 4
          ? [0.35, 0.75, 1.15, 0.8, 0.4][age - comeback]
          : 0);
    else if (profile === "international")
      w = Math.pow(0.7, age) * (age < 12 ? 1 : 0.8);
    else if (profile === "viral")
      w =
        Math.pow(0.65, age) +
        (age >= 6 && age <= 10 ? [0.2, 0.65, 1.25, 0.85, 0.4][age - 6] : 0);
    else if (profile === "frontloaded")
      w = Math.pow(0.49, age) * (age === 0 ? 2.25 : 1);
    else if (profile === "stable")
      w =
        age < 10
          ? 0.92 + Math.sin(age * 0.9) * 0.08
          : Math.pow(0.76, age - 9) * 0.85;
    else w = Math.pow(0.66, age);
    w *= 0.88 + r() * 0.24;
    weights.push(Math.max(0.001, w));
  }
  return weights;
}

function v27TheatricalRun(sim) {
  v27EnsureState();
  const profile = S.arcade.releaseProfile || v27ChooseProfile(sim);
  S.arcade.releaseProfile = profile;
  const weights = v27FullRunWeights(profile, `${S.runSeed}|v27|${profile}`);
  const total = Math.max(0, safe(sim.world));
  const opening = Math.min(total, Math.max(0, safe(sim.opening)));
  const tailWeights = weights.slice(1);
  const tailSum = tailWeights.reduce((a, b) => a + b, 0) || 1;
  const remaining = Math.max(0, total - opening);
  const weekly = [
    opening,
    ...tailWeights.map((weight) => (remaining * weight) / tailSum),
  ];
  const cumulative = [];
  let running = 0;
  weekly.forEach((v) => cumulative.push((running += v)));
  const turning = [];
  const maxWeek = weekly.indexOf(Math.max(...weekly));
  turning.push({
    week: 0,
    title: "Opening weekend",
    text: `${moneyM(weekly[0])} starts the theatrical story.`,
    icon: "🎟️",
  });
  if (maxWeek > 0)
    turning.push({
      week: maxWeek,
      title: "The run finds another gear",
      text: `Weekly gross peaks in week ${maxWeek + 1}, a rare reversal of the normal decline.`,
      icon: "📈",
    });
  if (["awards", "viral", "cult", "holiday"].includes(profile)) {
    const w =
      profile === "awards"
        ? 13
        : profile === "viral"
          ? 8
          : profile === "holiday"
            ? 5
            : Math.min(
                40,
                weekly.slice(12).indexOf(Math.max(...weekly.slice(12))) + 12,
              );
    turning.push({
      week: w,
      title: V27_PROFILE_LABELS[profile],
      text:
        profile === "awards"
          ? "Nominations restore public attention."
          : profile === "holiday"
            ? "Seasonal attendance strengthens the hold."
            : profile === "viral"
              ? "Online attention creates a sudden resurgence."
              : "Special screenings bring the movie back into the conversation.",
      icon: profile === "awards" ? "🏆" : profile === "holiday" ? "🎄" : "🔥",
    });
  }
  const strategy = v27ReleaseStrategy();
  return {
    profile,
    weekly,
    cumulative,
    turning,
    projection: v27Projection(sim),
    strategy,
  };
}

function v27LegacyFor(sim, run) {
  const scores = sim.arcadeScores?.categories || {};
  const profile = run.profile;
  if (profile === "cult" || (scores.craft > 82 && sim.profit < 0))
    return {
      name: "Cult Favorite",
      icon: "🧪",
      text: "Its first release was not the whole story; the film keeps finding new believers.",
    };
  if (profile === "holiday")
    return {
      name: "Seasonal Classic",
      icon: "🎄",
      text: "The movie becomes tied to a recurring time of year and future repertory play.",
    };
  if (
    profile === "awards" ||
    safe(sim.awards?.filmWins) +
      safe(sim.awards?.actingWins) +
      safe(sim.awards?.technicalWins) >
      1
  )
    return {
      name: "Awards Staple",
      icon: "🏆",
      text: "Its prestige campaign gives the film a durable place in awards-season conversation.",
    };
  if (scores.music >= 88)
    return {
      name: "Soundtrack Phenomenon",
      icon: "🎼",
      text: "The score develops a life beyond the movie itself.",
    };
  if (scores.visuals >= 88)
    return {
      name: "Visual Landmark",
      icon: "📷",
      text: "Its images become the element people remember and imitate.",
    };
  if (sim.world >= 1000)
    return {
      name: "Global Event",
      icon: "🌍",
      text: "The release becomes a worldwide cultural moment.",
    };
  if (sim.profit >= 0)
    return {
      name: "Enduring Studio Success",
      icon: "🎬",
      text: "A profitable release with a clear identity remains useful to the studio long after opening.",
    };
  return {
    name: "Forgotten Release",
    icon: "🌫️",
    text: "The movie struggles to build a lasting identity beyond its initial campaign.",
  };
}

const V27_SIM_BASE = simulate;
simulate = function v27Simulate() {
  v27EnsureState();
  const sim = V27_SIM_BASE();
  const { env, fit } = v27ReleaseStrategy();
  const demandEffect = clamp(env.demand * fit, 0.75, 1.35);
  const competitionEffect = clamp(
    1 / Math.pow(env.competition, 0.28),
    0.82,
    1.12,
  );
  const oldMarketing = sim.marketing;
  sim.marketing *= env.marketing;
  sim.totalCost += sim.marketing - oldMarketing;
  sim.world *= demandEffect * competitionEffect;
  sim.opening *= Math.sqrt(demandEffect) * Math.pow(env.competition, 0.08);
  sim.domestic *= demandEffect * competitionEffect;
  sim.theatricalRevenue = sim.world * sim.studioShare;
  sim.distributionShare = Math.max(0, sim.world - sim.theatricalRevenue);
  sim.backend = sim.world * safe(scaleEconomy().backendRate);
  sim.totalCost =
    safe(sim.budget) +
    safe(sim.marketing) +
    safe(sim.overhead) +
    safe(sim.backend) +
    safe(sim.overrun);
  sim.totalStudioRevenue = sim.theatricalRevenue + safe(sim.ancillary);
  sim.profit = sim.totalStudioRevenue - sim.totalCost;
  const outcome = classifyOutcome({
    gross: sim.world,
    profit: sim.profit,
    totalCost: sim.totalCost,
    productionBudget: sim.budget,
  });
  sim.roi = outcome.roi;
  sim.outcome = outcome.label;
  sim.releaseEnvironment = {
    month: S.project.month,
    ...env,
    genreMonthFit: fit,
  };
  sim.arcadeScores = arcadeCalculateScores(sim, arcadeCreativeEffects());
  sim.identity = arcadeIdentityFor(sim, sim.arcadeScores);
  S.arcade.finalScores = sim.arcadeScores;
  S.arcade.identity = sim.identity;
  return sim;
};

function v27LinePath(values, w = 900, h = 300, p = 18) {
  const max = Math.max(...values, 1),
    min = 0;
  return values
    .map(
      (v, i) =>
        `${i ? "L" : "M"} ${p + (i * (w - p * 2)) / (values.length - 1)} ${h - p - ((v - min) / (max - min)) * (h - p * 2)}`,
    )
    .join(" ");
}
function v27AreaPath(values, w = 900, h = 300, p = 18) {
  return `${v27LinePath(values, w, h, p)} L ${w - p} ${h - p} L ${p} ${h - p} Z`;
}

function v27RenderRunWeek(run, week, sim) {
  week = clamp(week, 0, 51);
  S.arcade.releaseWeekCursor = week;
  const weekly = run.weekly[week],
    total = run.cumulative[week],
    date = new Date(
      S.project.year,
      MONTHS.indexOf(S.project.month),
      12 + week * 7,
    );
  if ($("#v27Week")) $("#v27Week").textContent = `Week ${week + 1}`;
  if ($("#v27Date"))
    $("#v27Date").textContent = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  if ($("#v27Weekly")) $("#v27Weekly").textContent = moneyM(weekly);
  if ($("#v27Total")) $("#v27Total").textContent = moneyM(total);
  const marker = $("#v27Marker");
  if (marker) marker.style.left = `${(week / 51) * 100}%`;
  $$(".v27TurningPoint").forEach((n) =>
    n.classList.toggle("active", +n.dataset.week <= week),
  );
}

const ACTIVE_RELEASE_PAGE_V27 = function v27ReleasePage() {
  v27EnsureState();
  const sim = S.simulation || simulate();
  S.simulation = sim;
  const run = S.arcade.releaseStory || v27TheatricalRun(sim);
  S.arcade.releaseStory = run;
  S.arcade.storyLog = v27BuildPreReleaseStory(sim);
  S.arcade.legacy = v27LegacyFor(sim, run);
  const p = run.projection,
    env = run.strategy.env;
  shell(`<section class="v27ReleaseHero"><div><span class="eyebrow">THE THEATRICAL STORY</span><h1>${V27_PROFILE_LABELS[run.profile]}</h1><p>${S.project.title} receives a full 52-week run beginning in ${S.project.month} ${S.project.year}; late-year releases now continue naturally into the following year.</p></div><div class="v27RunTotal"><span id="v27Date">${S.project.month} ${S.project.year}</span><b id="v27Total">$0</b><small>cumulative worldwide</small></div></section>
  <div class="v27ExpectationGrid"><article><span>Projected opening</span><b>${moneyM(p.openingLow)}–${moneyM(p.openingHigh)}</b></article><article><span>Projected lifetime</span><b>${moneyM(p.grossLow)}–${moneyM(p.grossHigh)}</b></article><article><span>Forecast confidence</span><b>${p.confidence}%</b></article><article><span>Release environment</span><b>${env.label}</b></article></div>
  <section class="v27ChartPanel"><div class="v27ChartHead"><div><span class="eyebrow">52-WEEK THEATRICAL LIFE</span><h2 id="v27Week">Week 1</h2></div><div><span>Current week</span><b id="v27Weekly">${moneyM(run.weekly[0])}</b></div></div><div class="v27ChartWrap"><svg viewBox="0 0 900 300" preserveAspectRatio="none" aria-label="Weekly box office"><defs><linearGradient id="v27fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".42"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="v27Area" d="${v27AreaPath(run.weekly)}"/><path class="v27Line" d="${v27LinePath(run.weekly)}"/></svg><div class="v27Marker" id="v27Marker"></div></div><input class="v27WeekSlider" id="v27WeekSlider" type="range" min="0" max="51" value="${safe(S.arcade.releaseWeekCursor, 0)}"></section>
  <section class="v27StoryGrid"><div><span class="eyebrow">TURNING POINTS</span><h2>The movie changes course.</h2>${run.turning.map((t) => `<article class="v27TurningPoint" data-week="${t.week}"><span>${t.icon}</span><div><small>Week ${t.week + 1}</small><b>${t.title}</b><p>${t.text}</p></div></article>`).join("")}</div><div><span class="eyebrow">PROJECT STORY LOG</span><h2>How this film got here.</h2>${S.arcade.storyLog.map((e) => `<article class="v27Log ${e.tone}"><span>${e.icon}</span><div><small>${e.chapter}</small><b>${e.title}</b><p>${e.text}</p></div></article>`).join("")}</div></section>
  <section class="v27ReleaseFooter"><div><span class="eyebrow">FINAL OUTLOOK</span><h2>${sim.outcome} · ${moneyM(sim.profit)} profit</h2><p>${S.arcade.legacy.icon} <b>${S.arcade.legacy.name}</b> — ${S.arcade.legacy.text}</p></div><button class="btn primary v27ResultsBtn" id="v27Results">Open studio results →</button></section>`);
  const slider = $("#v27WeekSlider");
  slider.oninput = (e) => v27RenderRunWeek(run, +e.target.value, sim);
  v27RenderRunWeek(run, +slider.value, sim);
  $("#v27Results").onclick = () => {
    S.releaseRaceCompleted = true;
    S.screen = 5;
    render();
  };
};

const V27_PROJECT_BASE = ACTIVE_PROJECT_PAGE_V26;
const ACTIVE_PROJECT_PAGE_V27 = function v27ProjectPage() {
  V27_PROJECT_BASE();
  const picked = document.querySelector(".arcadePickedMovie");
  if (picked && !document.querySelector(".v27ReleaseWindow")) {
    const env = v27MonthEnvironment(),
      fit = v27GenreMonthFit();
    picked.insertAdjacentHTML(
      "beforeend",
      `<section class="v27ReleaseWindow"><div><span class="eyebrow">RELEASE STRATEGY</span><h3>${S.project.month}: ${env.label}</h3><p>Demand ${env.demand.toFixed(2)}× · Competition ${env.competition.toFixed(2)}× · Marketing cost ${env.marketing.toFixed(2)}× · ${S.project.genre} seasonal fit ${fit.toFixed(2)}×</p></div><div class="v27MonthStrip">${MONTHS.map((m) => `<button class="${m === S.project.month ? "active" : ""}" data-v27-month="${m}">${m.slice(0, 3)}</button>`).join("")}</div></section>`,
    );
    $$("[data-v27-month]").forEach(
      (b) =>
        (b.onclick = () => {
          S.project.month = b.dataset.v27Month;
          render();
        }),
    );
  }
};

const V27_SHELL_BASE = shell;
shell = function v27Shell(main) {
  v27EnsureState();
  V27_SHELL_BASE(main);
  document.body.classList.add("greenlit-v27");
  document
    .querySelector(".brand")
    ?.setAttribute("title", "GREENLIT Arcade V38");
};

v27EnsureState();

// =============================================================================
// GREENLIT V28 — RELEASE YEAR / ERA DEMAND
// =============================================================================

const V28_YEAR_BOUNDS_CACHE_KEY = "greenlit-v38-tmdb-year-bounds";
const V28_YEAR_BOUNDS_CACHE_MS = 24 * 60 * 60 * 1000;

let V28_TMDB_YEAR_BOUNDS = {
  min: 1874,
  max: new Date().getFullYear() + 3,
  loaded: false,
};
let V28_YEAR_BOUNDS_REQUEST = null;

function v28ValidReleaseYear(value, fallback = new Date().getFullYear()) {
  const numeric = Math.round(safe(value, fallback));

  return clamp(numeric, V28_TMDB_YEAR_BOUNDS.min, V28_TMDB_YEAR_BOUNDS.max);
}

function v28ReleaseYear() {
  return v28ValidReleaseYear(
    S.arcade?.releaseYear,
    S.reference?.year || S.project.year || new Date().getFullYear(),
  );
}

function v28ReadYearBoundsCache() {
  try {
    const cached = JSON.parse(
      localStorage.getItem(V28_YEAR_BOUNDS_CACHE_KEY) || "null",
    );

    if (
      cached &&
      Number.isFinite(cached.min) &&
      Number.isFinite(cached.max) &&
      Date.now() - safe(cached.savedAt) < V28_YEAR_BOUNDS_CACHE_MS
    ) {
      return cached;
    }
  } catch {}

  return null;
}

function v28LoadTmdbYearBounds() {
  if (!V28_YEAR_BOUNDS_REQUEST) {
    V28_YEAR_BOUNDS_REQUEST = v28FetchTmdbYearBounds();
  }
  return V28_YEAR_BOUNDS_REQUEST;
}

async function v28FetchTmdbYearBounds() {
  const cached = v28ReadYearBoundsCache();

  if (cached) {
    V28_TMDB_YEAR_BOUNDS = {
      min: cached.min,
      max: cached.max,
      loaded: true,
    };

    return V28_TMDB_YEAR_BOUNDS;
  }

  try {
    const [oldestResponse, newestResponse] = await Promise.all([
      api("/discover/movie", {
        include_adult: "false",
        sort_by: "primary_release_date.asc",
        "vote_count.gte": 1,
        page: 1,
      }),

      api("/discover/movie", {
        include_adult: "false",
        sort_by: "primary_release_date.desc",
        "vote_count.gte": 1,
        page: 1,
      }),
    ]);

    const firstYear = (results) => {
      for (const movie of results || []) {
        const year = Number.parseInt(
          (movie.primary_release_date || "").slice(0, 4),
          10,
        );

        if (Number.isFinite(year)) {
          return year;
        }
      }

      return null;
    };

    const minimum = firstYear(oldestResponse.results);
    const maximum = firstYear(newestResponse.results);

    if (minimum && maximum && minimum <= maximum) {
      V28_TMDB_YEAR_BOUNDS = {
        min: minimum,
        max: maximum,
        loaded: true,
      };

      localStorage.setItem(
        V28_YEAR_BOUNDS_CACHE_KEY,
        JSON.stringify({
          ...V28_TMDB_YEAR_BOUNDS,
          savedAt: Date.now(),
        }),
      );
    }
  } catch (error) {
    console.warn(
      "GREENLIT could not refresh TMDB year bounds; using fallback limits.",
      error,
    );
  }

  return V28_TMDB_YEAR_BOUNDS;
}

// -----------------------------------------------------------------------------
// ERA DEMAND
// -----------------------------------------------------------------------------

// Keep the historical era table, but stop it from becoming too powerful.
const V28_GENRE_ERA_BASE = v26GenreEraMultiplier;

v26GenreEraMultiplier = function v28GenreEraMultiplier(
  genre,
  year,
  reference = S.reference,
) {
  return clamp(V28_GENRE_ERA_BASE(genre, year, reference), 0.85, 1.18);
};

// Only part of the era multiplier affects gross directly.
// The rest is represented through competition, month fit and profiles.

function v28LifetimeEraEffect(era) {
  return 1 + (safe(era, 1) - 1) * 0.55;
}

function v28OpeningEraEffect(era) {
  return 1 + (safe(era, 1) - 1) * 0.35;
}

// -----------------------------------------------------------------------------
// RECALCULATE ECONOMICS AFTER ERA SOFTENING
// -----------------------------------------------------------------------------

function v28RecalculateEconomics(simulation) {
  simulation.theatricalRevenue = simulation.world * simulation.studioShare;

  simulation.distributionShare = Math.max(
    0,
    simulation.world - simulation.theatricalRevenue,
  );

  simulation.backend = simulation.world * safe(scaleEconomy().backendRate);

  simulation.totalCost =
    safe(simulation.budget) +
    safe(simulation.marketing) +
    safe(simulation.overhead) +
    safe(simulation.backend) +
    safe(simulation.overrun);

  simulation.totalStudioRevenue =
    simulation.theatricalRevenue + safe(simulation.ancillary);

  simulation.profit = simulation.totalStudioRevenue - simulation.totalCost;

  const outcome = classifyOutcome({
    gross: simulation.world,
    profit: simulation.profit,
    totalCost: simulation.totalCost,
    productionBudget: simulation.budget,
  });

  simulation.roi = outcome.roi;
  simulation.outcome = outcome.label;

  simulation.arcadeScores = arcadeCalculateScores(
    simulation,
    arcadeCreativeEffects(),
  );

  simulation.identity = arcadeIdentityFor(simulation, simulation.arcadeScores);

  S.arcade.finalScores = simulation.arcadeScores;

  S.arcade.identity = simulation.identity;
}

// -----------------------------------------------------------------------------
// KEEP ORIGINAL MOVIE YEAR SEPARATE FROM RELEASE YEAR
// -----------------------------------------------------------------------------

const V28_SIMULATE_BASE = simulate;

simulate = function v28Simulate() {
  const templateYear = safe(S.reference?.year, S.project.year);

  const releaseYear = v28ReleaseYear();

  let simulation;

  S.arcade.releaseYear = releaseYear;

  // The existing simulator expects project.year during
  // release calculations, so temporarily give it the
  // release year.
  S.project.year = releaseYear;

  try {
    simulation = V28_SIMULATE_BASE();
  } finally {
    // Immediately restore the original movie year so
    // casting and source-film logic remain historical.
    S.project.year = templateYear;
  }

  const rawEra = safe(simulation.genreEraMultiplier, 1);

  const lifetimeEffect = v28LifetimeEraEffect(rawEra);

  const openingEffect = v28OpeningEraEffect(rawEra);

  // Remove the old full-strength era effect and apply
  // the gentler version instead.
  simulation.world *= lifetimeEffect / Math.max(0.01, rawEra);

  simulation.domestic *= lifetimeEffect / Math.max(0.01, rawEra);

  simulation.opening *= openingEffect / Math.max(0.01, Math.sqrt(rawEra));

  simulation.releaseYear = releaseYear;

  simulation.templateYear = templateYear;

  simulation.genreEraGrossEffect = lifetimeEffect;

  simulation.genreEraOpeningEffect = openingEffect;

  v28RecalculateEconomics(simulation);

  return simulation;
};

// Competition should use release year.

const V28_LOAD_COMPETITION_BASE = loadCompetition;

loadCompetition = async function v28LoadCompetition() {
  const templateYear = S.project.year;

  S.project.year = v28ReleaseYear();

  try {
    return await V28_LOAD_COMPETITION_BASE();
  } finally {
    S.project.year = templateYear;
  }
};

// Annual leaderboard should use release year.

const V28_BUILD_RELEASE_RACE_BASE = buildReleaseRace;

buildReleaseRace = function v28BuildReleaseRace(simulation) {
  const templateYear = S.project.year;

  S.project.year = v28ReleaseYear();

  try {
    return V28_BUILD_RELEASE_RACE_BASE(simulation);
  } finally {
    S.project.year = templateYear;
  }
};

// -----------------------------------------------------------------------------
// CUSTOM RELEASE-YEAR CONTROL
// -----------------------------------------------------------------------------

function v28ReleaseYearMarkup() {
  const year = v28ReleaseYear();

  const era = v26GenreEraMultiplier(S.project.genre, year);

  const lifetimeEffect = v28LifetimeEraEffect(era);

  const openingEffect = v28OpeningEraEffect(era);

  const lifetimeText =
    `${lifetimeEffect >= 1 ? "+" : ""}` +
    `${((lifetimeEffect - 1) * 100).toFixed(1)}%`;

  const openingText =
    `${openingEffect >= 1 ? "+" : ""}` +
    `${((openingEffect - 1) * 100).toFixed(1)}%`;

  return `
    <label>Your release year</label>

    <div class="greenlitNumberInput">
      <input
        id="v26ReleaseYear"
        type="number"
        inputmode="numeric"
        min="${V28_TMDB_YEAR_BOUNDS.min}"
        max="${V28_TMDB_YEAR_BOUNDS.max}"
        value="${year}"
        aria-label="Release year"
      >

      <div class="greenlitNumberControls">
        <button
          type="button"
          class="greenlitNumberButton"
          id="v28YearUp"
          aria-label="Increase release year"
        >▲</button>

        <button
          type="button"
          class="greenlitNumberButton"
          id="v28YearDown"
          aria-label="Decrease release year"
        >▼</button>
      </div>
    </div>

    <small>
      TMDB currently limits this control to
      ${V28_TMDB_YEAR_BOUNDS.min}–${V28_TMDB_YEAR_BOUNDS.max - 3}.
      The original movie year remains the casting template.
    </small>

    <div class="v26EraReadout">
      Era demand:
      <b>${era.toFixed(2)}×</b>

      <span>
        Lifetime effect ${lifetimeText}
        · opening effect ${openingText}
      </span>
    </div>
  `;
}

function v28SetReleaseYear(value) {
  S.arcade.releaseYear = v28ValidReleaseYear(value, v28ReleaseYear());

  render();
}

function v28BindReleaseYearControl() {
  const input = $("#v26ReleaseYear");

  if (!input) return;

  input.min = V28_TMDB_YEAR_BOUNDS.min;

  input.max = V28_TMDB_YEAR_BOUNDS.max;

  input.onchange = () => {
    v28SetReleaseYear(input.value);
  };

  input.onkeydown = (event) => {
    if (event.key === "Enter") {
      v28SetReleaseYear(input.value);
    }
  };

  const up = $("#v28YearUp");

  const down = $("#v28YearDown");

  if (up) {
    up.onclick = () => {
      v28SetReleaseYear(Number(input.value) + 1);
    };
  }

  if (down) {
    down.onclick = () => {
      v28SetReleaseYear(Number(input.value) - 1);
    };
  }
}

// -----------------------------------------------------------------------------
// PATCH PROJECT PAGE
// -----------------------------------------------------------------------------

const V28_PROJECT_PAGE_BASE = ACTIVE_PROJECT_PAGE_V27;

const ACTIVE_PROJECT_PAGE_V28 = function v28ProjectPage() {
  V28_PROJECT_PAGE_BASE();

  const releaseCard = document.querySelector(".v26ReleaseYear");

  if (releaseCard) {
    releaseCard.innerHTML = v28ReleaseYearMarkup();

    v28BindReleaseYearControl();
  }

  // Also apply API bounds to movie search filters.
  for (const id of ["movieYearFrom", "movieYearTo"]) {
    const input = document.getElementById(id);

    if (input) {
      input.min = V28_TMDB_YEAR_BOUNDS.min;

      input.max = V28_TMDB_YEAR_BOUNDS.max;
    }
  }

  // Refresh the true limits from TMDB.
  v28LoadTmdbYearBounds().then((bounds) => {
    const input = $("#v26ReleaseYear");

    if (!input) return;

    input.min = bounds.min;
    input.max = bounds.max;

    const clamped = v28ValidReleaseYear(input.value);

    if (clamped !== Number(input.value)) {
      S.arcade.releaseYear = clamped;

      render();
      return;
    }

    const card = document.querySelector(".v26ReleaseYear");

    if (card) {
      card.innerHTML = v28ReleaseYearMarkup();

      v28BindReleaseYearControl();
    }
  });
};

// -----------------------------------------------------------------------------
// APPLY API LIMITS TO CREATE-ORIGINAL-MOVIE MODAL
// -----------------------------------------------------------------------------

const V28_CUSTOM_MOVIE_MODAL_BASE = v26CustomMovieModal;

v26CustomMovieModal = function v28CustomMovieModal() {
  V28_CUSTOM_MOVIE_MODAL_BASE();

  const input = $("#v26CustomYear");

  if (!input) return;

  input.min = V28_TMDB_YEAR_BOUNDS.min;

  input.max = V28_TMDB_YEAR_BOUNDS.max;

  input.value = v28ValidReleaseYear(input.value);

  v28LoadTmdbYearBounds().then((bounds) => {
    const currentInput = $("#v26CustomYear");

    if (!currentInput) return;

    currentInput.min = bounds.min;

    currentInput.max = bounds.max;

    currentInput.value = v28ValidReleaseYear(currentInput.value);
  });
};

// Begin loading the API limits immediately.

v28LoadTmdbYearBounds();

// =============================================================================
// GREENLIT V30 — CONSOLIDATED CASTING DRAFT + CAMEO SIDEBAR PASS
// =============================================================================

const V30_CURRENT_YEAR = new Date().getFullYear();
const V30_DRAFT_FILM_COUNT = 5;
const V30_CANDIDATES_PER_SOURCE = 6;
const V30_SOURCE_BATCH_SIZE = 2;
const V30_MAX_SOURCE_ATTEMPTS = 20;
const V30_DRAFT_ARCHETYPES = [
  "current-fit",
  "character-fit",
  "star-power",
  "wildcard",
  "budget-friendly",
];
const V30_DRAFT_ARCHETYPE_LABELS = {
  "current-fit": "Current movie fit",
  "character-fit": "Character fit",
  "star-power": "Star-power",
  wildcard: "Wildcard",
  "budget-friendly": "Budget-friendly",
  fallback: "Curated fallback",
};

function v30ScaleBudgetBand(scale = S.project.scale) {
  const [minBudget = 1, maxBudget = 300] = SCALE[scale]?.budget || [1, 300];
  return {
    min: Math.max(1, safe(minBudget, 1)),
    max: Math.max(1, safe(maxBudget, 300)),
    center: average([safe(minBudget, 1), safe(maxBudget, 300)]),
  };
}

function v38BudgetScope(scale = S.project.scale) {
  if (scale === "Microbudget") return "low";
  if (scale === "Independent") return "low-mid";
  if (scale === "Mid-Budget") return "mid";
  if (scale === "Studio Event") return "mid-high";
  return "high";
}

function v38PreferredCrewTiers(scale = S.project.scale) {
  const scope = v38BudgetScope(scale);
  if (scope === "low") return ["C", "B", "A"];
  if (scope === "low-mid") return ["B", "C", "A"];
  if (scope === "mid") return ["B", "A", "S"];
  if (scope === "mid-high") return ["A", "B", "S"];
  return ["A", "S", "B"];
}

function v38TierThresholds(scale = S.project.scale) {
  const scope = v38BudgetScope(scale);
  if (scope === "low") return { S: 90, A: 80, B: 69, C: 58 };
  if (scope === "low-mid") return { S: 87, A: 78, B: 67, C: 57 };
  if (scope === "mid") return { S: 84, A: 75, B: 65, C: 56 };
  if (scope === "mid-high") return { S: 82, A: 73, B: 64, C: 55 };
  return { S: 80, A: 71, B: 63, C: 54 };
}

function v38TierFromScore(score, scale = S.project.scale) {
  const thresholds = v38TierThresholds(scale);
  if (score >= thresholds.S) return "S";
  if (score >= thresholds.A) return "A";
  if (score >= thresholds.B) return "B";
  if (score >= thresholds.C) return "C";
  return "D";
}

function v38EstimatedPackageTarget(scale = S.project.scale) {
  const originalBudget = Math.max(
    1,
    safe(S.reference?.budgetM, average(SCALE[scale].budget)),
  );
  const share = safe(
    V34_BUDGET?.shares?.[scale],
    V34_BUDGET_DEFAULTS?.shares?.[scale] || 0.24,
  );
  return originalBudget * share;
}

function v38BudgetOptionCaps(scale = S.project.scale) {
  const target = Math.max(0.01, v38EstimatedPackageTarget(scale));
  return {
    crewDirector: target * 0.24,
    crewWriter: target * 0.19,
    creativeDuo: target * 0.32,
  };
}

function v38RecordCrewRollTelemetry(kind, people) {
  ensureArcadeState();
  S.arcade.budgetAudit = S.arcade.budgetAudit || { crewRolls: [], styleRolls: [] };
  const caps = v38BudgetOptionCaps();
  const slot = kind === "directors" ? "Director 1" : "Writer 1";
  const cap = kind === "directors" ? caps.crewDirector : caps.crewWriter;
  const options = (people || []).map((candidate) => ({
    id: candidate.id,
    tier: v32TalentTier(candidate, slot),
    fee: v32PersonFee(candidate, slot),
  }));
  S.arcade.budgetAudit.crewRolls.push({
    scale: S.project.scale,
    kind,
    maxAffordableFee: cap,
    packageTarget: v38EstimatedPackageTarget(),
    options,
    at: Date.now(),
  });
}

function v38RecordStyleRollTelemetry(composers, cinematographers, duoPackages) {
  ensureArcadeState();
  S.arcade.budgetAudit = S.arcade.budgetAudit || { crewRolls: [], styleRolls: [] };
  const caps = v38BudgetOptionCaps();
  const composerById = new Map((composers || []).map((candidate) => [candidate.id, candidate]));
  const cameraById = new Map(
    (cinematographers || []).map((candidate) => [candidate.id, candidate]),
  );
  const options = (duoPackages || []).map((pkg) => {
    const composer = composerById.get(pkg.composerId) || person(pkg.composerId);
    const camera = cameraById.get(pkg.cinematographerId) || person(pkg.cinematographerId);
    return {
      id: pkg.id,
      fit: safe(pkg.fit),
      fee: v36CreativeDuoFee(pkg),
      composerTier: composer ? v35CrewTier(composer, "composer") : "D",
      cinematographerTier: camera ? v35CrewTier(camera, "cinematographer") : "D",
    };
  });
  S.arcade.budgetAudit.styleRolls.push({
    scale: S.project.scale,
    maxAffordableFee: caps.creativeDuo,
    packageTarget: v38EstimatedPackageTarget(),
    options,
    at: Date.now(),
  });
}

function v30EstimatedMovieBudgetM(stub) {
  if (safe(stub?.budget) > 0) return safe(stub.budget) / 1e6;
  const popularity = safe(stub?.popularity, 35);
  const votes = safe(stub?.vote_count, 200);
  const rating = safe(stub?.vote_average, 6.2);
  const score =
    popularity * 0.52 + Math.log10(votes + 1) * 11 + Math.max(0, rating - 5) * 7;
  return clamp(score, 2, 320);
}

function v30BudgetAffinityScore(stub, scale = S.project.scale) {
  const budget = v30EstimatedMovieBudgetM(stub);
  const band = v30ScaleBudgetBand(scale);
  if (budget >= band.min && budget <= band.max) return 100;
  const distance = budget < band.min ? band.min - budget : budget - band.max;
  const spread = Math.max(1, band.max - band.min);
  return clamp(100 - (distance / spread) * 110, 0, 100);
}

function v30Tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function v30CurrentMovieFitScore(stub) {
  const sourceYear = safe(S.reference?.year, safe(S.project?.year, V30_CURRENT_YEAR));
  const movieYear = Number.parseInt(String(stub?.release_date || "").slice(0, 4), 10);
  const yearGap = Math.abs(safe(movieYear, sourceYear) - sourceYear);
  const yearScore = clamp(100 - yearGap * 2.8, 10, 100);
  const referenceTokens = new Set(v30Tokenize(S.reference?.title));
  const movieTokens = new Set(v30Tokenize(`${stub?.title || ""} ${stub?.overview || ""}`));
  let overlap = 0;
  referenceTokens.forEach((token) => {
    if (movieTokens.has(token)) overlap += 1;
  });
  const overlapScore = referenceTokens.size
    ? (overlap / referenceTokens.size) * 100
    : 40;
  return clamp(yearScore * 0.72 + overlapScore * 0.28, 0, 100);
}

function v30CharacterFitScore(stub, slot) {
  const roleTokens = v30Tokenize(roleName(slot));
  const movieTokens = new Set(v30Tokenize(`${stub?.title || ""} ${stub?.overview || ""}`));
  let hits = 0;
  roleTokens.forEach((token) => {
    if (movieTokens.has(token)) hits += 1;
  });
  const roleScore = roleTokens.length ? (hits / roleTokens.length) * 100 : 35;
  const genreIds = Array.isArray(stub?.genre_ids) ? stub.genre_ids : [];
  const genreScore = genreIds.includes(GENRE_IDS[S.project.genre])
    ? 100
    : 45;
  return clamp(roleScore * 0.72 + genreScore * 0.28, 0, 100);
}

function v30StarPowerScore(stub) {
  const popularity = clamp((safe(stub?.popularity, 0) / 130) * 100, 0, 100);
  const votes = clamp((Math.log10(safe(stub?.vote_count, 0) + 1) / 5.4) * 100, 0, 100);
  const rating = clamp((safe(stub?.vote_average, 0) / 10) * 100, 0, 100);
  return clamp(popularity * 0.58 + votes * 0.27 + rating * 0.15, 0, 100);
}

function v30ArchetypeScores(stub, slot) {
  const budgetAffinity = v30BudgetAffinityScore(stub);
  const currentFit = v30CurrentMovieFitScore(stub);
  const characterFit = v30CharacterFitScore(stub, slot);
  const starPower = v30StarPowerScore(stub);
  const fitBudgetInfluence = safe(BALANCE_TUNING.sourceDraft?.fitBudgetInfluence, 0.15);
  const fitWeight = clamp(1 - fitBudgetInfluence, 0.8, 0.9);
  return {
    budgetAffinity,
    "current-fit": currentFit * fitWeight + budgetAffinity * fitBudgetInfluence,
    "character-fit":
      characterFit * fitWeight + budgetAffinity * fitBudgetInfluence,
    "star-power": starPower * safe(BALANCE_TUNING.sourceDraft?.starPowerWeight, 0.82) +
      currentFit * (1 - safe(BALANCE_TUNING.sourceDraft?.starPowerWeight, 0.82)),
    wildcard: Math.random() * 100,
    "budget-friendly":
      budgetAffinity * safe(BALANCE_TUNING.sourceDraft?.budgetFriendlyWeight, 0.72) +
      currentFit * 0.2 +
      (100 - starPower) * 0.08,
  };
}

function v30PickDraftSources(stubs, slot) {
  const scored = stubs.map((stub) => ({
    stub,
    score: v30ArchetypeScores(stub, slot),
  }));
  const used = new Set();
  const picks = [];
  for (const archetype of V30_DRAFT_ARCHETYPES) {
    const ranked = scored
      .slice()
      .sort((a, b) => safe(b.score[archetype]) - safe(a.score[archetype]));
    const selected = ranked.find(({ stub }) => !used.has(stub.id));
    if (!selected) continue;
    used.add(selected.stub.id);
    picks.push({
      stub: selected.stub,
      archetype,
      score: selected.score,
    });
  }

  for (const candidate of scored) {
    if (picks.length >= V30_DRAFT_FILM_COUNT) break;
    if (used.has(candidate.stub.id)) continue;
    used.add(candidate.stub.id);
    picks.push({
      stub: candidate.stub,
      archetype: "fallback",
      score: candidate.score,
    });
  }

  return picks
    .slice(0, V30_DRAFT_FILM_COUNT)
    .sort(() => Math.random() - 0.5);
}

function v30SourceArchetypeLabel(entry) {
  return (
    V30_DRAFT_ARCHETYPE_LABELS[entry?.film?.archetypeId] ||
    entry?.film?.archetypeLabel ||
    "Curated draft"
  );
}

function v30RecordDraftTelemetry(slot, pools) {
  ensureArcadeState();
  S.arcade.recommendationTelemetry = S.arcade.recommendationTelemetry || {};
  S.arcade.recommendationTelemetry[slot] = {
    slot,
    createdAt: Date.now(),
    scale: S.project.scale,
    entries: (pools || []).map((entry, index) => ({
      sourceIndex: index,
      sourceId: entry?.film?.id || null,
      title: entry?.film?.title || null,
      archetype: entry?.film?.archetypeId || "fallback",
      budgetAffinity: safe(entry?.film?.budgetAffinity),
      estimatedBudgetM: safe(entry?.film?.estimatedBudgetM),
      scoreBreakdown: entry?.film?.archetypeScores || {},
    })),
    selectedSourceIndex: clamp(
      safe(S.sourceIndex?.[slot], 0),
      0,
      Math.max(0, (pools || []).length - 1),
    ),
  };
}

function v30TrackDraftSelection(slot, sourceIndex) {
  const telemetry = S.arcade?.recommendationTelemetry?.[slot];
  if (!telemetry) return;
  telemetry.selectedSourceIndex = sourceIndex;
  const selected = telemetry.entries?.[sourceIndex];
  if (selected) {
    telemetry.selectedSourceId = selected.sourceId;
    telemetry.selectedArchetype = selected.archetype;
  }
}

function v30EnsureState() {
  v25EnsureState();
  S.arcade.version = "30.0";
  S.arcade.castRerollsUsed = S.arcade.castRerollsUsed || {};
  S.arcade.recommendationTelemetry = S.arcade.recommendationTelemetry || {};
  S.arcade.releaseYear = clamp(
    safe(S.arcade.releaseYear, safe(S.reference?.year, V30_CURRENT_YEAR)),
    safe(V28_TMDB_YEAR_BOUNDS?.min, 1874),
    V30_CURRENT_YEAR,
  );
}

// TMDB contains announced future titles, but GREENLIT release years stop at the
// current calendar year so historical competition remains grounded.
V28_TMDB_YEAR_BOUNDS.max = V30_CURRENT_YEAR;

const V30_LOAD_YEAR_BOUNDS_BASE = v28LoadTmdbYearBounds;
v28LoadTmdbYearBounds = async function v30LoadTmdbYearBounds() {
  const bounds = await V30_LOAD_YEAR_BOUNDS_BASE();
  V28_TMDB_YEAR_BOUNDS.min = safe(bounds?.min, V28_TMDB_YEAR_BOUNDS.min);
  V28_TMDB_YEAR_BOUNDS.max = V30_CURRENT_YEAR;
  V28_TMDB_YEAR_BOUNDS.loaded = true;
  return V28_TMDB_YEAR_BOUNDS;
};

v28ValidReleaseYear = function v30ValidReleaseYear(
  value,
  fallback = V30_CURRENT_YEAR,
) {
  return clamp(
    Math.round(safe(value, fallback)),
    safe(V28_TMDB_YEAR_BOUNDS.min, 1874),
    V30_CURRENT_YEAR,
  );
};

v28ReleaseYearMarkup = function v30ReleaseYearMarkup() {
  const year = v28ReleaseYear();
  const era = v26GenreEraMultiplier(S.project.genre, year);
  const lifetimeEffect = v28LifetimeEraEffect(era);
  const openingEffect = v28OpeningEraEffect(era);
  const lifetimeText = `${lifetimeEffect >= 1 ? "+" : ""}${(
    (lifetimeEffect - 1) *
    100
  ).toFixed(1)}%`;
  const openingText = `${openingEffect >= 1 ? "+" : ""}${(
    (openingEffect - 1) *
    100
  ).toFixed(1)}%`;

  return `
    <label>Your release year</label>
    <div class="greenlitNumberInput">
      <input
        id="v26ReleaseYear"
        type="number"
        inputmode="numeric"
        min="${V28_TMDB_YEAR_BOUNDS.min}"
        max="${V30_CURRENT_YEAR}"
        value="${year}"
        aria-label="Release year"
      >
      <div class="greenlitNumberControls">
        <button type="button" class="greenlitNumberButton" id="v28YearUp" aria-label="Increase release year">▲</button>
        <button type="button" class="greenlitNumberButton" id="v28YearDown" aria-label="Decrease release year">▼</button>
      </div>
    </div>
    <small>
      Choose any year from ${V28_TMDB_YEAR_BOUNDS.min} through ${V30_CURRENT_YEAR}.
      Future announced movies are excluded from playable release years.
    </small>
    <div class="v26EraReadout">
      Era demand: <b>${era.toFixed(2)}×</b>
      <span>Lifetime effect ${lifetimeText} · opening effect ${openingText}</span>
    </div>
  `;
};

function v30CameoForSlot(slot, hired) {
  const cameo = S.cameos?.[slot];
  return cameo && hired && cameo.personId === hired.id ? cameo : null;
}

// Rebuilt sidebar: the active actor portrait fully replaces the original. A
// cameo replaces the character label and receives a gold treatment.
sidebar = function v30Sidebar() {
  v30EnsureState();

  const actorRows = ARCADE_ACTOR_SLOTS.map((slot) => {
    const original = arcadeOriginalForSlot(slot);
    const hired = person(S.roster[slot]);
    const cameo = v30CameoForSlot(slot, hired);
    const portrait = hired?.photo || original?.photo;
    const character =
      cameo?.character || original?.character || roleName(slot) || "Character";
    const sourceLine = cameo
      ? `Cameo from ${cameo.title}`
      : hired
        ? `Originally ${original?.name || "unknown"}`
        : "Choose replacement";

    return `
      <button class="arcadeRosterSlot ${hired ? "filled" : ""} ${cameo ? "hasCameo" : ""}" data-slotnav="${slot}">
        <div class="arcadeOriginalActor arcadeCharacterPortrait">
          ${portrait ? `<img src="${portrait}" alt="">` : "<span>?</span>"}
          <small>${hired ? "Recast" : "Original"}</small>
        </div>
        <div class="arcadeRosterCopy">
          <span>${arcadeEsc(hired?.name || original?.name || slot)}</span>
          <b class="${cameo ? "v30CameoCharacter" : ""}">${arcadeEsc(character)}</b>
          <small class="${cameo ? "v30CameoSource" : ""}">${arcadeEsc(sourceLine)}</small>
        </div>
        ${v24AuditionFor(slot, hired?.id) ? '<span class="arcadeTinyBadge">AUD</span>' : ""}
        ${cameo ? '<span class="v30CameoBadge">CAMEO</span>' : ""}
      </button>
    `;
  }).join("");

  const crewRows = [
    ...(S.arcade.crew?.selectedDirectors || []).map((id) => ({
      label: "Director",
      member: person(id),
    })),
    ...(S.arcade.crew?.selectedWriters || []).map((id) => ({
      label: "Writer",
      member: person(id),
    })),
  ]
    .filter((entry) => entry.member)
    .map(
      ({ label, member }) => `
        <div class="arcadeCrewMini">
          <span>${label}</span>
          <b>${arcadeEsc(member.name)}</b>
        </div>
      `,
    )
    .join("");

  const style = S.arcade.style || {};
  const composer = V25_COMPOSER_PACKAGES.find(
    (item) => item.id === style.composerId,
  );
  const camera = V25_CAMERA_PACKAGES.find((item) => item.id === style.cameraId);

  return `
    <aside class="sidebar arcadeSidebar">
      <div class="card arcadeProjectCard">
        <div class="mini">Current remake</div>
        <h3>${arcadeEsc(S.project.title)}</h3>
        <div class="sub">${arcadeEsc(S.project.genre)} · ${arcadeEsc(S.project.scale)} · ${v28ReleaseYear()}</div>
      </div>
      <div class="arcadeSidebarHeading">
        <h3>Cast</h3>
        <span>${ARCADE_ACTOR_SLOTS.filter((slot) => S.roster[slot]).length}/5</span>
      </div>
      <div class="arcadeRoster">${actorRows}</div>
      ${
        crewRows
          ? `<div class="arcadeSidebarHeading"><h3>Crew</h3></div><div class="arcadeCrewMiniList">${crewRows}</div>`
          : ""
      }
      ${
        composer || camera
          ? `<div class="card arcadeStyleMini">
              <div><span>Music</span><b>${arcadeEsc(composer?.name || "—")}</b></div>
              <div><span>Camera</span><b>${arcadeEsc(camera?.name || "—")}</b></div>
            </div>`
          : ""
      }
    </aside>
  `;
};

// Five source films, with each actor card tied to the exact source-film era.
buildPool = async function v30BuildPool(slot) {
  const films = await comparableMovies(slot);
  const output = [];
  const sourceAttempts = films.slice(0, V30_MAX_SOURCE_ATTEMPTS);
  const draftPicks = v30PickDraftSources(sourceAttempts, slot);
  const selectedById = new Map(
    draftPicks.map((pick) => [pick.stub.id, pick]),
  );
  const orderedAttempts = [
    ...draftPicks.map((pick) => pick.stub),
    ...sourceAttempts.filter((stub) => !selectedById.has(stub.id)),
  ];
  const builtSourceIds = new Set();

  for (
    let index = 0;
    index < orderedAttempts.length;
    index += V30_SOURCE_BATCH_SIZE
  ) {
    if (output.length >= V30_DRAFT_FILM_COUNT) break;
    const batch = orderedAttempts.slice(index, index + V30_SOURCE_BATCH_SIZE);

    await Promise.all(
      batch.map(async (stub) => {
        if (output.length >= V30_DRAFT_FILM_COUNT || builtSourceIds.has(stub.id))
          return;
        try {
          const movie = await api(`/movie/${stub.id}`, {
            append_to_response: "credits",
            language: "en-US",
          });

          if (!movie.credits) return;

          const roleType = typeOf(slot);
          let rawCredits =
            roleType === "Lead" || roleType === "Cast"
              ? (movie.credits.cast || []).slice(0, 18)
              : (movie.credits.crew || []).filter((credit) => {
                  const department =
                    roleType === "Director"
                      ? "Directing"
                      : roleType === "Writer"
                        ? "Writing"
                        : "Production";
                  return credit.department === department;
                });

          if (roleType === "Director") {
            rawCredits = rawCredits.filter(
              (credit) => credit.job === "Director",
            );
          }
          if (roleType === "Writer") {
            rawCredits = rawCredits.filter((credit) =>
              ["Writer", "Screenplay", "Story"].includes(credit.job),
            );
          }

          rawCredits = [
            ...new Map(
              rawCredits.map((credit) => [credit.id, credit]),
            ).values(),
          ];
          if (rawCredits.length < 2) return;

          const settled = await Promise.allSettled(
            rawCredits
              .slice(0, V30_CANDIDATES_PER_SOURCE)
              .map((credit) => hydrate(credit, slot, movie.credits)),
          );

          const people = settled
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => {
              const base = result.value;
              const sourcePerson = {
                ...base,
                id: `${base.id}-source-${movie.id}`,
                sourceMovieId: movie.id,
                sourceMovieTitle: movie.title,
                sourceMovieYear: safe(
                  (movie.release_date || "").slice(0, 4),
                  S.project.year,
                ),
                sourceMoviePoster: movie.poster_path
                  ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                  : null,
                v25EraLoaded: false,
              };
              S.people[sourcePerson.id] = sourcePerson;
              return sourcePerson;
            });

          if (people.length < 2) return;

          const draftPick = selectedById.get(stub.id) || null;
          const archetypeId = draftPick?.archetype || "fallback";
          const scoreBreakdown = draftPick?.score || v30ArchetypeScores(stub, slot);
          const estimatedBudgetM = v30EstimatedMovieBudgetM(movie);
          const budgetAffinity = v30BudgetAffinityScore(movie);

          output.push({
            film: {
              id: movie.id,
              title: movie.title,
              year: safe(
                (movie.release_date || "").slice(0, 4),
                S.project.year,
              ),
              genre: (movie.genres || [])
                .map((genre) => genre.name)
                .join(" / "),
              poster: movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : null,
              backdrop: movie.backdrop_path
                ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
                : null,
              overview: movie.overview || "",
              popularity: safe(movie.popularity),
              rating: safe(movie.vote_average),
              votes: safe(movie.vote_count),
              estimatedBudgetM,
              budgetAffinity,
              archetypeId,
              archetypeLabel:
                V30_DRAFT_ARCHETYPE_LABELS[archetypeId] || "Curated draft",
              archetypeScores: {
                "current-fit": Math.round(safe(scoreBreakdown["current-fit"])),
                "character-fit": Math.round(
                  safe(scoreBreakdown["character-fit"]),
                ),
                "star-power": Math.round(safe(scoreBreakdown["star-power"])),
                wildcard: Math.round(safe(scoreBreakdown.wildcard)),
                "budget-friendly": Math.round(
                  safe(scoreBreakdown["budget-friendly"]),
                ),
              },
            },
            people,
          });
          builtSourceIds.add(movie.id);

          if (!S.usedSources.includes(movie.id)) S.usedSources.push(movie.id);
        } catch (error) {
          console.warn("Skipped invalid draft source", stub?.id, error);
        }
      }),
    );
  }

  if (!output.length)
    throw new Error("No valid comparable source films found.");

  const finalPools = output.slice(0, V30_DRAFT_FILM_COUNT);
  v30RecordDraftTelemetry(slot, finalPools);
  return finalPools;
};

function v30MovieDraftTile(entry, sourceIndex, selectedIndex, rank) {
  const selected = sourceIndex === selectedIndex;
  const featured = rank === 0;
  const film = entry.film;
  const image = film.backdrop || film.poster;

  return `
    <button
      class="v30MovieDraftTile ${selected ? "selected" : ""} ${featured ? "featured" : ""}"
      data-source="${sourceIndex}"
      style="${image ? `--draft-image:url('${image}')` : ""}"
    >
      <span class="v30MovieShade"></span>
      ${featured ? '<span class="v30MovieRibbon">Most popular</span>' : ""}
      ${selected ? '<span class="v30MovieSelected">Selected</span>' : ""}
      <div class="v30MovieTileCopy">
        <small>${arcadeEsc(v30SourceArchetypeLabel(entry))}</small>
        <h3>${arcadeEsc(film.title)}</h3>
        <p>${film.year} · ★ ${film.rating.toFixed(1)} · ${arcadeEsc(film.genre || S.project.genre)}</p>
      </div>
    </button>
  `;
}

function v30RenderDraftMosaic(pools, selectedIndex) {
  return pools
    .map((entry, sourceIndex) => ({ entry, sourceIndex }))
    .sort((a, b) => b.entry.film.popularity - a.entry.film.popularity)
    .map(({ entry, sourceIndex }, rank) =>
      v30MovieDraftTile(entry, sourceIndex, selectedIndex, rank),
    )
    .join("");
}

// Final consolidated casting page. This replaces the repeated V21–V25 page
// wrappers while preserving auditions, saved picks, cameos, and era cards.
const ACTIVE_HIRE_PAGE_V30 = async function v30HirePage() {
  v30EnsureState();
  const renderId = ACTIVE_RENDER_ID;

  const slot = ARCADE_ACTOR_SLOTS.includes(S.activeSlot)
    ? S.activeSlot
    : ARCADE_ACTOR_SLOTS.find((candidateSlot) => !S.roster[candidateSlot]) ||
      ARCADE_ACTOR_SLOTS[0];
  S.activeSlot = slot;

  const original = arcadeOriginalForSlot(slot);

  if (!S.sourcePools[slot]?.length) {
    shell(`
      <h1>Rolling five similar movies…</h1>
      <div class="callout">Building current-fit, character-fit, star-power, wildcard, and budget-friendly source casts.</div>
    `);
    return ensurePool(slot);
  }

  const pools = S.sourcePools[slot];
  const selectedIndex = clamp(
    S.sourceIndex[slot] || 0,
    0,
    Math.max(0, pools.length - 1),
  );
  const pool = pools[selectedIndex];

  if (pool?.people?.length) {
    await Promise.all(
      pool.people.map((candidate) => v25EnrichCareerEra(candidate, slot)),
    );
  }

  if (
    renderId !== ACTIVE_RENDER_ID ||
    S.screen !== 1 ||
    S.activeSlot !== slot
  ) {
    return;
  }

  const candidates = pool?.people || [];
  const rerollUsed = Boolean(S.arcade.castRerollsUsed[slot]);

  shell(`
    <div class="arcadePageHead">
      <div>
        <div class="mini">Step 2 · ${ARCADE_ACTOR_SLOTS.indexOf(slot) + 1} of 5</div>
        <h1>Cast ${arcadeEsc(original?.character || roleName(slot) || slot)}.</h1>
        <p class="sub">Choose one of five source movies. Each casting position gets one complete reroll.</p>
      </div>
      <div class="arcadeTokenStack"><span>Auditions</span><b>${3 - arcadeAuditionCount()} left</b></div>
    </div>

    <div class="arcadeRoleTabs">
      ${ARCADE_ACTOR_SLOTS.map((actorSlot) => {
        const roleOriginal = arcadeOriginalForSlot(actorSlot);
        const hired = person(S.roster[actorSlot]);
        const cameo = v30CameoForSlot(actorSlot, hired);
        const image = hired?.photo || roleOriginal?.photo;
        return `
          <button class="arcadeRoleTab ${actorSlot === slot ? "active" : ""} ${hired ? "done" : ""}" data-jump="${actorSlot}">
            ${image ? `<img src="${image}" alt="">` : "<span>?</span>"}
            <small class="${cameo ? "v30CameoCharacter" : ""}">${arcadeEsc(cameo?.character || hired?.name || roleOriginal?.character || actorSlot)}</small>
          </button>
        `;
      }).join("")}
    </div>

    <section class="arcadeDraftPicker v30DraftPicker">
      <div class="arcadeDrawerHead">
        <div><span class="mini">Movie draft</span><b>Pick a source cast</b></div>
        <button class="btn" id="refreshDraft" ${rerollUsed ? "disabled" : ""}>
          ${rerollUsed ? "Reroll used" : "Reroll five movies"}
        </button>
      </div>

      <div class="v30MovieDraftGrid">
        ${v30RenderDraftMosaic(pools, selectedIndex)}
      </div>

      <div class="sourceHero arcadeDraftHero v30SelectedFilm">
        ${pool?.film.poster ? `<img src="${pool.film.poster}" alt="">` : "<div></div>"}
        <div>
          <div class="mini">Current draft film</div>
          <h2>${arcadeEsc(pool?.film.title || "Similar film")}</h2>
          <div class="sub">${arcadeEsc(pool?.film.overview || "Choose from this film’s cast.")}</div>
        </div>
      </div>
    </section>

    <section class="arcadeShortlistDrawer">
      <div class="arcadeDrawerHead">
        <div><span class="mini">Saved picks</span><b>${(S.shortlists[slot] || []).length}/8</b></div>
        <span>Click a pin to return to its exact source movie and card.</span>
      </div>
      ${v24SavedPicks(slot)}
    </section>

    <div class="arcadeActorGrid">${candidates.map((candidate) => arcadeCandidateCard(candidate, slot)).join("")}</div>

    <div class="arcadeFooterNav">
      <button class="btn" id="backProject">← Movie</button>
      <button class="btn primary" id="toProduction" ${ARCADE_ACTOR_SLOTS.every((actorSlot) => S.roster[actorSlot]) ? "" : "disabled"}>Crew wheel →</button>
    </div>
  `);

  $$("[data-jump]").forEach((button) => {
    button.onclick = () => {
      S.activeSlot = button.dataset.jump;
      render();
    };
  });

  $$("[data-source]").forEach((button) => {
    button.onclick = () => {
      S.sourceIndex[slot] = Number(button.dataset.source);
      v30TrackDraftSelection(slot, S.sourceIndex[slot]);
      S.tierCache[slot] = {};
      render();
    };
  });

  if ($("#refreshDraft")) {
    $("#refreshDraft").onclick = async () => {
      if (S.arcade.castRerollsUsed[slot]) return;
      S.arcade.castRerollsUsed[slot] = true;
      delete S.sourcePools[slot];
      S.tierCache[slot] = {};
      await ensurePool(slot);
    };
  }

  $$("[data-short]").forEach((button) => {
    button.onclick = () => {
      const list = S.shortlists[slot] || [];
      const id = button.dataset.short;
      const wasPinned = list.includes(id);

      if (wasPinned) {
        S.shortlists[slot] = list.filter((savedId) => savedId !== id);
      } else if (list.length < 8) {
        S.shortlists[slot] = [...list, id];
        v25RememberSavedSource(slot, id);
      } else {
        alert("Saved picks holds eight actors.");
      }
      render();
    };
  });

  $$("[data-short-remove]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      S.shortlists[slot] = (S.shortlists[slot] || []).filter(
        (savedId) => savedId !== button.dataset.shortRemove,
      );
      render();
    };
  });

  $$("[data-saved-open]").forEach((button) => {
    button.onclick = (event) => {
      if (event.target.closest("[data-short-remove]")) return;
      const id = button.dataset.savedOpen;
      const sourceIndex = S.arcade.savedPickSources?.[slot]?.[id];
      if (Number.isFinite(sourceIndex)) {
        S.sourceIndex[slot] = sourceIndex;
        v30TrackDraftSelection(slot, sourceIndex);
      }
      S.arcade.cardFocus = id;
      render();
    };
  });

  if (S.arcade.cardFocus) {
    const id = S.arcade.cardFocus;
    S.arcade.cardFocus = null;
    setTimeout(() => {
      document
        .querySelector(`[data-card-person="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  $$("[data-aud]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.aud;
      if (v24AuditionFor(slot, id) || arcadeAuditionCount() >= 3) return;

      ensureSeed();
      const candidate = person(id);
      const fit = Math.round(baseAttrs(candidate, slot).fit);
      const audition = {
        personId: id,
        fit,
        mods: arcadeAuditionMods(candidate, slot, fit),
        tierBeforeAudition: baseTalentTier(candidate, slot),
        eligibleBeforeAudition: true,
      };

      S.arcade.auditionHistory[slot] = S.arcade.auditionHistory[slot] || {};
      S.arcade.auditionHistory[slot][id] = audition;
      S.auditions[slot] = audition;
      render();
    };
  });

  $$("[data-hire]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.hire;
      S.roster[slot] = id;
      if (S.cameos[slot]?.personId !== id) {
        delete S.cameos[slot];
        delete S.cameoOutcomes[slot];
      }
      const nextSlot = ARCADE_ACTOR_SLOTS.find(
        (actorSlot) => !S.roster[actorSlot],
      );
      S.activeSlot = nextSlot || slot;
      render();
    };
  });

  $$("[data-cameo-person]").forEach((button) => {
    button.onclick = () => {
      const candidate = person(button.dataset.cameoPerson);
      if (candidate) cameoModal(candidate, button.dataset.cameoSlot);
    };
  });

  $("#backProject").onclick = () => {
    S.screen = 0;
    render();
  };

  $("#toProduction").onclick = () => {
    ensureSeed();
    S.screen = 2;
    render();
  };
};

v30EnsureState();

// =============================================================================
// GREENLIT V31 — GLOBAL REPORTS, BENTO DRAFT, ERA CAMEOS, CREATIVE CREW DRAFTS
// =============================================================================

let V36_STYLE_CREW_IN_FLIGHT = null;

function v31EnsureState() {
  v30EnsureState();
  S.arcade.version = "31.0";
  S.arcade.allReportsOpen = Boolean(S.arcade.allReportsOpen);
  const styleCrew =
    S.arcade.styleCrew && typeof S.arcade.styleCrew === "object"
      ? S.arcade.styleCrew
      : {};
  styleCrew.composerPool = Array.isArray(styleCrew.composerPool)
    ? styleCrew.composerPool
    : [];
  styleCrew.cinematographerPool = Array.isArray(
    styleCrew.cinematographerPool,
  )
    ? styleCrew.cinematographerPool
    : [];
  styleCrew.composerId = styleCrew.composerId || null;
  styleCrew.cinematographerId = styleCrew.cinematographerId || null;
  styleCrew.loaded = Boolean(styleCrew.loaded);
  styleCrew.loadError = styleCrew.loadError || null;
  styleCrew.loading = Boolean(V36_STYLE_CREW_IN_FLIGHT);
  S.arcade.styleCrew = styleCrew;
  const stylePoolIds = [
    ...styleCrew.composerPool,
    ...styleCrew.cinematographerPool,
  ];
  if (
    styleCrew.loaded &&
    (!stylePoolIds.length || stylePoolIds.some((id) => !S.people[id]))
  ) {
    styleCrew.composerPool = [];
    styleCrew.cinematographerPool = [];
    styleCrew.loading = false;
    styleCrew.loaded = false;
    styleCrew.loadError = null;
  }
}

function v31WithViewTransition(change) {
  if (document.startViewTransition) {
    document.startViewTransition(change);
  } else {
    change();
  }
}

// -----------------------------------------------------------------------------
// GLOBAL SCOUTING REPORT TOGGLE
// -----------------------------------------------------------------------------

function v31SyncReportControls() {
  const reports = [...document.querySelectorAll(".v29ActorDetails")];
  if (!reports.length) return;

  const anyOpen = reports.some((report) => report.open);
  const showGlobalButton = anyOpen || S.arcade.allReportsOpen;

  document.querySelectorAll(".v31AllReportsButton").forEach((button) => {
    button.hidden = !showGlobalButton;
    button.textContent = S.arcade.allReportsOpen
      ? "Collapse all reports"
      : "Open all reports";
    button.setAttribute("aria-pressed", String(S.arcade.allReportsOpen));
  });
}

function v31BindReportControls() {
  const reports = [...document.querySelectorAll(".v29ActorDetails")];
  if (!reports.length) return;

  reports.forEach((report) => {
    report.open = S.arcade.allReportsOpen || report.open;

    if (!report.nextElementSibling?.classList.contains("v31AllReportsButton")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "v31AllReportsButton";
      report.insertAdjacentElement("afterend", button);
    }

    report.addEventListener("toggle", v31SyncReportControls);
  });

  document.querySelectorAll(".v31AllReportsButton").forEach((button) => {
    button.onclick = () => {
      S.arcade.allReportsOpen = !S.arcade.allReportsOpen;
      document.querySelectorAll(".v29ActorDetails").forEach((report) => {
        report.open = S.arcade.allReportsOpen;
      });
      save();
      v31SyncReportControls();
    };
  });

  v31SyncReportControls();
}

// -----------------------------------------------------------------------------
// FIXED BENTO MOVIE DRAFT
// -----------------------------------------------------------------------------

function v31MovieIdentity(film) {
  if (film.rating >= 7.6 && film.votes >= 2500) return "Critical darling";
  if (film.popularity >= 100) return "Audience magnet";
  if (/Music/i.test(film.genre)) return "Famous score";
  if (/Animation/i.test(film.genre)) return "Animation showcase";
  if (/Drama|History|War/i.test(film.genre)) return "Prestige production";
  if (/Action|Adventure|Sci-Fi|Fantasy/i.test(film.genre))
    return "Visual spectacle";
  if (/Comedy|Family/i.test(film.genre)) return "Crowd pleaser";
  if (/Horror|Mystery|Thriller/i.test(film.genre)) return "Genre standout";
  return "Ensemble showcase";
}

function v31MovieDraftTile(
  entry,
  sourceIndex,
  selectedIndex,
  position,
  popularId,
) {
  const film = entry.film;
  const selected = sourceIndex === selectedIndex;
  const mostPopular = film.id === popularId;
  const image = film.backdrop || film.poster;

  return `
    <button
      class="v30MovieDraftTile v31MovieTile v31MovieTile--${position} ${selected ? "selected" : ""}"
      data-source="${sourceIndex}"
      style="${image ? `--draft-image:url('${image}');` : ""} view-transition-name: movie-${film.id};"
      aria-pressed="${selected}"
    >
      <span class="v30MovieShade"></span>
      ${mostPopular ? '<span class="v30MovieRibbon">Most popular</span>' : ""}
      ${selected ? '<span class="v30MovieSelected">Selected</span>' : ""}
      <div class="v30MovieTileCopy">
        <small>${arcadeEsc(v30SourceArchetypeLabel(entry))}</small>
        <h3>${arcadeEsc(film.title)}</h3>
        <p>${film.year} · ★ ${film.rating.toFixed(1)} · ${arcadeEsc(film.genre || S.project.genre)}</p>
      </div>
    </button>
  `;
}

v30RenderDraftMosaic = function v31RenderDraftMosaic(pools, selectedIndex) {
  const popular = pools
    .slice()
    .sort((a, b) => b.film.popularity - a.film.popularity)[0];
  const selected = pools[selectedIndex] || pools[0];
  const remaining = pools
    .map((entry, sourceIndex) => ({ entry, sourceIndex }))
    .filter(({ sourceIndex }) => sourceIndex !== selectedIndex)
    .sort((a, b) => b.entry.film.popularity - a.entry.film.popularity);

  const arranged = [
    { entry: selected, sourceIndex: selectedIndex, position: "hero" },
    ...remaining.map((item, index) => ({
      ...item,
      position: `support-${index + 1}`,
    })),
  ];

  return arranged
    .map(({ entry, sourceIndex, position }) =>
      v31MovieDraftTile(
        entry,
        sourceIndex,
        selectedIndex,
        position,
        popular?.film.id,
      ),
    )
    .join("");
};

// -----------------------------------------------------------------------------
// ERA-CORRECT CAMEOS
// -----------------------------------------------------------------------------

async function v31LoadEraCameos(p) {
  const cutoffYear = safe(p.sourceMovieYear, S.project.year);
  let roles = (p.iconicRoles || []).filter(
    (role) => !role.year || safe(role.year) <= cutoffYear,
  );

  if (!roles.length || roles.some((role) => !role.year)) {
    try {
      const details = await api(`/person/${p.tmdbId}`, {
        append_to_response: "combined_credits",
        language: "en-US",
      });
      roles = [
        ...new Map(
          (details.combined_credits?.cast || [])
            .filter((credit) => {
              const year = Number.parseInt(
                (credit.release_date || "").slice(0, 4),
                10,
              );
              return (
                credit.media_type === "movie" &&
                credit.title &&
                credit.character &&
                Number.isFinite(year) &&
                year <= cutoffYear
              );
            })
            .sort((a, b) => safe(b.vote_count) - safe(a.vote_count))
            .map((credit) => [
              `${credit.id}|${credit.character}`,
              {
                title: credit.title,
                character: credit.character,
                year: Number.parseInt(credit.release_date.slice(0, 4), 10),
                movieId: credit.id,
              },
            ]),
        ).values(),
      ].slice(0, 10);
      p.iconicRoles = roles;
    } catch (error) {
      console.warn("Could not load era cameo roles", p.name, error);
    }
  }

  return roles.filter((role) => !role.year || role.year <= cutoffYear);
}

cameoModal = async function v31CameoModal(p, slot) {
  const cutoffYear = safe(p.sourceMovieYear, S.project.year);
  const options = await v31LoadEraCameos(p);

  if (!options.length) {
    alert(`${p.name} has no loaded movie roles available by ${cutoffYear}.`);
    return;
  }

  const current = S.cameos[slot]?.personId === p.id ? S.cameos[slot] : null;

  modal(
    `
    <div class="cameoModalHead">
      <div>
        <div class="mini">Era-correct iconic cameo</div>
        <h2>${arcadeEsc(p.name)}</h2>
      </div>
      <button class="balanceClose" data-close aria-label="Close">×</button>
    </div>
    <p class="sub">Only roles released by ${cutoffYear}, the year of this drafted version of ${arcadeEsc(p.name)}, are eligible.</p>
    <div class="cameoOptions">
      ${options
        .map(
          (role, index) => `
            <button class="cameoOption ${current?.character === role.character ? "selected" : ""}" data-cameo-option="${index}">
              <b>${arcadeEsc(role.character)}</b>
              <span>${arcadeEsc(role.title)}${role.year ? ` · ${role.year}` : ""}</span>
            </button>
          `,
        )
        .join("")}
    </div>
    ${current ? '<button class="btn danger" id="removeCameo">Remove current cameo</button>' : ""}
  `,
    "cameoModal",
  );

  $$("[data-cameo-option]").forEach((button) => {
    button.onclick = () => {
      const role = options[Number(button.dataset.cameoOption)];
      S.roster[slot] = p.id;
      S.cameos[slot] = {
        personId: p.id,
        actorName: p.name,
        title: role.title,
        character: role.character,
        year: role.year || null,
      };
      delete S.cameoOutcomes[slot];
      record("cameo_selected", { slot, personId: p.id, ...role });
      closeModal();
      render();
    };
  });

  if ($("#removeCameo")) {
    $("#removeCameo").onclick = () => {
      delete S.cameos[slot];
      delete S.cameoOutcomes[slot];
      closeModal();
      render();
    };
  }
};

// -----------------------------------------------------------------------------
// REAL COMPOSER + CINEMATOGRAPHER DRAFTS
// -----------------------------------------------------------------------------

function v31StyleCrewSlot(kind) {
  return kind === "composer" ? "Writer 1" : "Director 1";
}

const V36_STYLE_CREW_SOURCE_LIMIT = 6;
const V36_STYLE_CREW_CANDIDATE_LIMIT = 5;
const V36_STYLE_CREW_CONCURRENCY = 2;
const V36_STYLE_CREW_TIMEOUT_MS = 16000;

function v36WithDeadline(promise, milliseconds, message) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(message)),
      milliseconds,
    );
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function v36StyleCrewKindForCredit(credit) {
  if (["Original Music Composer", "Music", "Composer"].includes(credit.job)) {
    return "composer";
  }
  if (["Director of Photography", "Cinematography"].includes(credit.job)) {
    return "cinematographer";
  }
  return null;
}

function v38SelectBudgetScopedStyleCrewPool(candidates, kind) {
  const preferred = v38PreferredCrewTiers();
  const caps = v38BudgetOptionCaps();
  const slot = v31StyleCrewSlot(kind);
  const maxFee =
    kind === "composer" ? caps.creativeDuo * 0.5 : caps.creativeDuo * 0.52;
  const unique = [
    ...new Map((candidates || []).map((candidate) => [candidate.id, candidate])).values(),
  ];
  const tierBuckets = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  };

  unique.forEach((candidate) => {
    const tier = v35CrewTier(candidate, kind);
    if (tierBuckets[tier]) tierBuckets[tier].push(candidate);
  });

  const selected = [];
  const seen = new Set();
  preferred.forEach((tier) => {
    const candidate = (tierBuckets[tier] || [])
      .slice()
      .sort((first, second) => {
        const firstFee = v32PersonFee(first, slot);
        const secondFee = v32PersonFee(second, slot);
        const firstDistance = Math.abs(firstFee - maxFee);
        const secondDistance = Math.abs(secondFee - maxFee);
        return firstDistance - secondDistance;
      })
      .find((item) => !seen.has(item.id));
    if (!candidate || selected.length >= 3) return;
    seen.add(candidate.id);
    selected.push(candidate);
  });

  if (selected.length < 3) {
    unique.forEach((candidate) => {
      if (selected.length >= 3 || seen.has(candidate.id)) return;
      seen.add(candidate.id);
      selected.push(candidate);
    });
  }

  return selected.slice(0, 3);
}

async function v36AllSettledBatched(
  taskFactories,
  batchSize = V36_STYLE_CREW_CONCURRENCY,
) {
  const settled = [];
  const size = Math.max(1, Math.floor(safe(batchSize, 1)));
  for (let index = 0; index < taskFactories.length; index += size) {
    const batch = taskFactories.slice(index, index + size);
    settled.push(...(await Promise.allSettled(batch.map((task) => task()))));
    if (index + size < taskFactories.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return settled;
}

async function v36BuildStyleCrewPools() {
  const data = await api("/discover/movie", {
    with_genres: GENRE_IDS[S.project.genre],
    include_adult: "false",
    sort_by: "popularity.desc",
    "primary_release_date.lte": `${new Date().getFullYear()}-12-31`,
    page: 1 + Math.floor(Math.random() * 3),
  });

  const detailResults = await v36AllSettledBatched(
    (data.results || [])
      .slice(0, V36_STYLE_CREW_SOURCE_LIMIT)
      .map((movie) =>
        () =>
          api(`/movie/${movie.id}`, {
            append_to_response: "credits",
            language: "en-US",
          }),
      ),
  );
  const candidates = { composer: [], cinematographer: [] };

  for (const result of detailResults) {
    if (result.status !== "fulfilled") continue;
    const credits = result.value.credits || { crew: [] };
    for (const credit of credits.crew || []) {
      const kind = v36StyleCrewKindForCredit(credit);
      if (kind) candidates[kind].push({ credit, credits });
    }
  }

  const uniqueByKind = Object.fromEntries(
    ["composer", "cinematographer"].map((kind) => [
      kind,
      [
        ...new Map(
          candidates[kind].map((item) => [item.credit.id, item]),
        ).values(),
      ].slice(0, V36_STYLE_CREW_CANDIDATE_LIMIT),
    ]),
  );
  const hydrationResults = await v36AllSettledBatched(
    Object.entries(uniqueByKind).flatMap(([kind, entries]) =>
      entries.map((item) => async () => ({
        kind,
        candidate: await hydrate(
          item.credit,
          v31StyleCrewSlot(kind),
          item.credits,
        ),
      })),
    ),
  );
  const hydrated = { composer: [], cinematographer: [] };
  for (const result of hydrationResults) {
    if (result.status !== "fulfilled" || !result.value.candidate) continue;
    hydrated[result.value.kind].push(result.value.candidate);
  }
  const composers = v38SelectBudgetScopedStyleCrewPool(
    hydrated.composer,
    "composer",
  );
  const cinematographers = v38SelectBudgetScopedStyleCrewPool(
    hydrated.cinematographer,
    "cinematographer",
  );
  return { composers, cinematographers };
}

async function v31EnsureStyleCrewPools(force = false) {
  v31EnsureState();
  const crew = S.arcade.styleCrew;
  if (crew.loaded || V36_STYLE_CREW_IN_FLIGHT || (crew.loadError && !force)) {
    return V36_STYLE_CREW_IN_FLIGHT;
  }
  crew.loading = true;
  crew.loadError = null;
  V36_STYLE_CREW_IN_FLIGHT = (async () => {
    try {
      const { composers, cinematographers } = await v36WithDeadline(
        v36BuildStyleCrewPools(),
        V36_STYLE_CREW_TIMEOUT_MS,
        "The artist draft took too long. Check the connection and retry.",
      );
      if (!composers.length || !cinematographers.length) {
        throw new Error("No style-crew candidates were returned.");
      }
      crew.composerPool = composers.map((person) => person.id);
      crew.cinematographerPool = cinematographers.map((person) => person.id);
      crew.duoPackages = v36BuildCreativeDuoPackages(
        crew.composerPool,
        crew.cinematographerPool,
        crew.duoRoll,
      );
      v38RecordStyleRollTelemetry(
        composers,
        cinematographers,
        crew.duoPackages,
      );
      if (crew.duoPackages.length < 3) {
        throw new Error("Not enough real artists were returned for three duos.");
      }
      crew.loaded = true;
    } catch (error) {
      crew.loadError = error?.message || "The style-crew draft could not load.";
      console.warn("Style crew draft failed", error);
    } finally {
      V36_STYLE_CREW_IN_FLIGHT = null;
      crew.loading = false;
      if (S.screen === 2) render();
    }
  })();
  return V36_STYLE_CREW_IN_FLIGHT;
}

function v31StyleCrewCard(p, kind, selectedId) {
  const selected = p.id === selectedId;
  const attrs = adjusted(p, v31StyleCrewSlot(kind));
  return `
    <button class="v31StyleCrewCard ${selected ? "selected" : ""}" data-style-crew-kind="${kind}" data-style-crew-id="${p.id}">
      ${p.photo ? `<img src="${p.photo}" alt="">` : '<span class="arcadeCrewFallback">GL</span>'}
      <div>
        <span class="mini">${kind === "composer" ? "Composer" : "Cinematographer"}</span>
        <h3>${arcadeEsc(p.name)}</h3>
        <p>${Math.round(attrs.craft)} craft · ${Math.round(attrs.reliability)} reliability · ${Math.round(attrs.fit)}% genre fit</p>
      </div>
      <strong>${selected ? "Selected" : "Choose"}</strong>
    </button>
  `;
}

const V31_CREATIVE_EFFECTS_BASE = arcadeCreativeEffects;
arcadeCreativeEffects = function v31CreativeEffects() {
  const effects = V31_CREATIVE_EFFECTS_BASE();
  const composer = person(S.arcade.styleCrew?.composerId);
  const cinematographer = person(S.arcade.styleCrew?.cinematographerId);

  if (composer) {
    const attrs = adjusted(composer, "Writer 1");
    effects.musicScore = clamp(
      effects.musicScore + (attrs.craft - 60) * 0.18 + (attrs.fit - 60) * 0.1,
    );
    effects.critic += (attrs.craft - 60) * 0.025;
    effects.awards += (attrs.craft - 60) * 0.04;
  }

  if (cinematographer) {
    const attrs = adjusted(cinematographer, "Director 1");
    effects.visualScore = clamp(
      effects.visualScore + (attrs.craft - 60) * 0.18 + (attrs.fit - 60) * 0.1,
    );
    effects.critic += (attrs.craft - 60) * 0.025;
    effects.awards += (attrs.craft - 60) * 0.04;
  }

  return effects;
};

const V31_PRODUCTION_BASE = ACTIVE_PRODUCTION_PAGE_V25;
const ACTIVE_PRODUCTION_PAGE_V31 = function v31ProductionPage() {
  v31EnsureState();
  V31_PRODUCTION_BASE();
  v31EnsureStyleCrewPools();

  const board = document.querySelector(".arcadeCreativeBoard");
  if (!board) return;

  const style = S.arcade.style;
  const crew = S.arcade.styleCrew;
  const composers = crew.composerPool.map(person).filter(Boolean);
  const cinematographers = crew.cinematographerPool.map(person).filter(Boolean);

  board.innerHTML = `
    <div class="v25StyleHeader">
      <div>
        <span class="mini">Style Studio</span>
        <h1>Draft the artists. Choose the inspiration.</h1>
        <p>Composer and cinematographer data comes from verified TMDB movie crew credits. Inspiration packages remain the creative direction you give them.</p>
      </div>
    </div>
    <div class="v31StyleDepartments">
      <section class="v31StyleDepartment">
        <div class="arcadeBoardHead"><div><span class="mini">Score department</span><h2>Draft a composer</h2></div><span>Pick one</span></div>
        <div class="v31StyleCrewGrid">
          ${crew.loading && !composers.length ? '<div class="v31LoadingCard">Loading composers…</div>' : composers.map((p) => v31StyleCrewCard(p, "composer", crew.composerId)).join("") || '<div class="callout">No composer pool loaded. The inspiration package still works.</div>'}
        </div>
        <div class="arcadeBoardHead compact"><div><span class="mini">Musical inspiration</span><h3>Choose the intended sound</h3></div></div>
        <div class="v25PackageGrid">${V25_COMPOSER_PACKAGES.map((x) => v25StylePackageCard(x, "composer", style.composerId)).join("")}</div>
        <div class="v25EmphasisGrid">${v25EmphasisCards("music", style.musicEmphasis)}</div>
      </section>
      <section class="v31StyleDepartment">
        <div class="arcadeBoardHead"><div><span class="mini">Camera department</span><h2>Draft a cinematographer</h2></div><span>Pick one</span></div>
        <div class="v31StyleCrewGrid">
          ${crew.loading && !cinematographers.length ? '<div class="v31LoadingCard">Loading cinematographers…</div>' : cinematographers.map((p) => v31StyleCrewCard(p, "cinematographer", crew.cinematographerId)).join("") || '<div class="callout">No cinematographer pool loaded. The inspiration package still works.</div>'}
        </div>
        <div class="arcadeBoardHead compact"><div><span class="mini">Visual inspiration</span><h3>Choose the intended visual language</h3></div></div>
        <div class="v25PackageGrid">${V25_CAMERA_PACKAGES.map((x) => v25StylePackageCard(x, "camera", style.cameraId)).join("")}</div>
        <div class="v25EmphasisGrid">${v25EmphasisCards("visual", style.visualEmphasis)}</div>
      </section>
    </div>
    <aside class="v25StylePreview">${v25PosterPreview()}<div class="v25StyleReadout"><div><span>Music ceiling</span><b>${Math.round(v25StyleEffects().musicScore)}</b></div><div><span>Visual ceiling</span><b>${Math.round(v25StyleEffects().visualScore)}</b></div><div><span>Creative risk</span><b>${v25StyleEffects().risk}</b></div></div></aside>
  `;

  $$("[data-style-crew-id]").forEach((button) => {
    button.onclick = () => {
      S.arcade.styleCrew[`${button.dataset.styleCrewKind}Id`] =
        button.dataset.styleCrewId;
      render();
    };
  });

  $$("[data-v25-package]").forEach((button) => {
    button.onclick = () => {
      S.arcade.style[`${button.dataset.v25PackageKind}Id`] =
        button.dataset.v25Package;
      render();
    };
  });

  $$("[data-v25-emphasis]").forEach((button) => {
    button.onclick = () => {
      S.arcade.style[`${button.dataset.v25EmphasisKind}Emphasis`] =
        button.dataset.v25Emphasis;
      render();
    };
  });

  const next = $("#toMarketing");
  if (next) {
    next.disabled = !(
      arcadeCrewReady() &&
      crew.composerId &&
      crew.cinematographerId &&
      style.composerId &&
      style.cameraId &&
      style.musicEmphasis &&
      style.visualEmphasis
    );
  }
};

// Wrap the consolidated casting screen to add report controls and animated source switching.
const V31_HIRE_PAGE_BASE = ACTIVE_HIRE_PAGE_V30;
const ACTIVE_HIRE_PAGE_V31 = async function v31HirePage() {
  const renderId = ACTIVE_RENDER_ID;
  await V31_HIRE_PAGE_BASE();
  if (renderId !== ACTIVE_RENDER_ID || S.screen !== 1) return;
  v31BindReportControls();

  $$("[data-source]").forEach((button) => {
    button.onclick = () => {
      v31WithViewTransition(() => {
        const activeSlot = S.activeSlot;
        S.sourceIndex[activeSlot] = Number(button.dataset.source);
        v30TrackDraftSelection(activeSlot, S.sourceIndex[activeSlot]);
        S.tierCache[activeSlot] = {};
        render();
      });
    };
  });
};

v31EnsureState();

// =============================================================================
// GREENLIT V32 — SIMPLIFIED DRAFTS, PACKAGE BUDGET, FIXED MARKETING STRATEGIES
// =============================================================================

const V32_VERSION = "32.0";

const V32_BALANCE = {
  packageBudgetShare: 0.24,
  packageCostStrength: 1,
  packageOverageWeight: 0.7,
  packageSavingsWeight: 0.35,
  marketingSpendStrength: 1,
  allTimeHitTarget: 0.1,
};

const V32_TIER_FEES = {
  S: 10,
  A: 4.5,
  B: 1.8,
  C: 0.65,
  D: 0.2,
};

const V32_MARKETING_STRATEGIES = {
  "Blockbuster Blitz": {
    icon: "💥",
    base: "Mass Awareness",
    sliders: { awareness: 72, fandom: 18, prestige: 10 },
    spendMultiplier: 1.28,
    trailer:
      "Large-scale theatrical trailer built around spectacle and cast recognition.",
    promotion:
      "Heavy television, outdoor, premium-format and opening-week saturation.",
    strengths: ["Action", "Adventure", "Animation", "Fantasy", "Sci-Fi"],
    scales: ["Studio Event", "Tentpole"],
  },
  "Fan Mobilization": {
    icon: "🎟️",
    base: "Fan Convention",
    sliders: { awareness: 24, fandom: 66, prestige: 10 },
    spendMultiplier: 1.02,
    trailer:
      "Lore-forward trailer aimed at existing fans and recognizable character moments.",
    promotion:
      "Conventions, fan screenings, creator interviews and collectible partnerships.",
    strengths: [
      "Action",
      "Adventure",
      "Fantasy",
      "Horror",
      "Sci-Fi",
      "Animation",
    ],
    scales: ["Mid-Budget", "Studio Event", "Tentpole"],
  },
  "Prestige Roadshow": {
    icon: "🏆",
    base: "Prestige Campaign",
    sliders: { awareness: 16, fandom: 12, prestige: 72 },
    spendMultiplier: 0.96,
    trailer:
      "Performance-led trailer emphasizing reviews, themes and filmmaking craft.",
    promotion:
      "Festivals, critics screenings, guild events and awards-season placements.",
    strengths: ["Drama", "History", "War", "Crime", "Documentary", "Music"],
    scales: ["Independent", "Mid-Budget", "Studio Event"],
  },
  "Mystery Tease": {
    icon: "🕯️",
    base: "Mystery Box",
    sliders: { awareness: 32, fandom: 42, prestige: 26 },
    spendMultiplier: 0.82,
    trailer:
      "A restrained trailer that protects the premise and sells questions over answers.",
    promotion:
      "Clue-based posters, selective footage, experiential stunts and controlled reveals.",
    strengths: ["Horror", "Mystery", "Thriller", "Crime", "Sci-Fi"],
    scales: ["Microbudget", "Independent", "Mid-Budget"],
  },
  "Viral Spark": {
    icon: "📱",
    base: "Viral / Creator",
    sliders: { awareness: 36, fandom: 54, prestige: 10 },
    spendMultiplier: 0.72,
    trailer:
      "Short, remixable trailer cuts designed around one highly shareable hook.",
    promotion:
      "Creator partnerships, social challenges, clips, memes and fast reaction marketing.",
    strengths: ["Comedy", "Horror", "Music", "Romance", "Animation"],
    scales: ["Microbudget", "Independent", "Mid-Budget"],
  },
  "Global Tour": {
    icon: "🌍",
    base: "Celebrity Tour",
    sliders: { awareness: 48, fandom: 34, prestige: 18 },
    spendMultiplier: 1.12,
    trailer:
      "Accessible international trailer emphasizing stars, scale and universal stakes.",
    promotion:
      "Cast appearances, localized trailers, market premieres and regional partnerships.",
    strengths: [
      "Action",
      "Adventure",
      "Animation",
      "Family",
      "Fantasy",
      "Romance",
    ],
    scales: ["Mid-Budget", "Studio Event", "Tentpole"],
  },
};

function v32EnsureState() {
  v31EnsureState();
  S.arcade.version = V32_VERSION;
  S.arcade.marketingStrategy =
    S.arcade.marketingStrategy || "Blockbuster Blitz";
  S.arcade.marketingConfirmed = Boolean(S.arcade.marketingConfirmed);
  S.arcade.rerollsUsed = S.arcade.rerollsUsed || {};
}

function v32TalentTier(p, slot) {
  try {
    return talentTier(p, slot);
  } catch {
    const score = stableTierScore(p, slot);
    return v38TierFromScore(score);
  }
}

function v32PersonFee(p, slot) {
  if (!p) return 0;
  const audition = typeof v24AuditionFor === "function" ? v24AuditionFor(slot, p.id) : null;
  const tier = audition?.tierBeforeAudition || v32TalentTier(p, slot);
  const base = V32_TIER_FEES[tier] || V32_TIER_FEES.D;
  const roleMultiplier = slot.startsWith("Lead 1")
    ? 1.45
    : slot.startsWith("Lead")
      ? 1.2
      : slot.startsWith("Cast")
        ? 0.72
        : slot.startsWith("Director")
          ? 1.15
          : slot.startsWith("Writer")
            ? 0.68
            : 0.7;
  const marketMultiplier = clamp(0.75 + safe(p.draw, 50) / 120, 0.8, 1.55);
  return (
    base * roleMultiplier * marketMultiplier * V32_BALANCE.packageCostStrength
  );
}

function v32StyleCrewFee(kind) {
  const id = S.arcade.styleCrew?.[`${kind}Id`];
  const p = person(id);
  if (!p) return 0;
  const slot = kind === "composer" ? "Writer 1" : "Director 1";
  return v32PersonFee(p, slot) * (kind === "composer" ? 0.58 : 0.62);
}

function v32PackageBudget() {
  const originalBudget = Math.max(
    1,
    safe(S.reference?.budgetM, average(SCALE[S.project.scale].budget)),
  );
  const target = originalBudget * V32_BALANCE.packageBudgetShare;
  let spent = 0;

  ARCADE_ACTOR_SLOTS.forEach((slot) => {
    spent += v32PersonFee(person(S.roster[slot]), slot);
  });

  (S.arcade.crew?.selectedDirectors || []).forEach((id, index) => {
    spent += v32PersonFee(person(id), `Director ${index + 1}`);
  });

  (S.arcade.crew?.selectedWriters || []).forEach((id, index) => {
    spent += v32PersonFee(person(id), `Writer ${index + 1}`);
  });

  spent += v32StyleCrewFee("composer") + v32StyleCrewFee("cinematographer");

  return {
    originalBudget,
    target,
    spent,
    remaining: target - spent,
    percent: target ? (spent / target) * 100 : 0,
  };
}

function v32BudgetWidget() {
  const budget = v32PackageBudget();
  const state =
    budget.percent > 115 ? "over" : budget.percent > 90 ? "warn" : "good";
  return `
    <section class="v32BudgetWidget ${state}">
      <div class="v32BudgetHeader">
        <div><span>Package spending</span><b>${moneyM(budget.spent)} / ${moneyM(budget.target)}</b></div>
        <strong>${Math.round(budget.percent)}%</strong>
      </div>
      <div class="v32BudgetTrack"><span style="width:${clamp(budget.percent, 0, 140)}%"></span></div>
      <small>${budget.remaining >= 0 ? `${moneyM(budget.remaining)} remains in the talent package` : `${moneyM(Math.abs(budget.remaining))} over the package target`} · original production estimate ${moneyM(budget.originalBudget)}</small>
    </section>
  `;
}

function v38ForecastConfidenceLabel(confidence) {
  const value = safe(confidence, 60);
  if (value >= 80) return "Low uncertainty";
  if (value >= 65) return "Medium uncertainty";
  return "High uncertainty";
}

function v38FinancialForecastWidget() {
  if (S.screen < 1 || S.screen > 4) return "";
  if (!S.reference) {
    return `
      <section class="v32BudgetWidget">
        <div class="v32BudgetHeader">
          <div><span>Forecast</span><b>Unavailable</b></div>
          <strong>—</strong>
        </div>
        <small>Select a movie to unlock projected gross and break-even guidance.</small>
      </section>
    `;
  }
  try {
    const simulation = simulate();
    const projection = v27Projection(simulation);
    const why = buildWhyAnalysis(simulation, null);
    const uncertainty = clamp(100 - safe(projection.confidence, 60), 8, 58);
    return `
      <section class="v32BudgetWidget">
        <div class="v32BudgetHeader">
          <div><span>Forecast</span><b>${moneyM(projection.grossLow)} – ${moneyM(projection.grossHigh)}</b></div>
          <strong>${projection.confidence}%</strong>
        </div>
        <div class="v32BudgetTrack"><span style="width:${clamp(projection.confidence, 0, 100)}%"></span></div>
        <small>${v38ForecastConfidenceLabel(projection.confidence)} · ±${Math.round(uncertainty)}% range</small>
        <small>Estimated break-even: ${moneyM(why.breakEvenGross)} · ${why.breakEvenGap >= 0 ? `${moneyM(why.breakEvenGap)} above` : `${moneyM(Math.abs(why.breakEvenGap))} short`}</small>
      </section>
    `;
  } catch {
    return `
      <section class="v32BudgetWidget">
        <div class="v32BudgetHeader">
          <div><span>Forecast</span><b>Unavailable</b></div>
          <strong>—</strong>
        </div>
        <small>Financial outlook will appear after enough package inputs are set.</small>
      </section>
    `;
  }
}

// -----------------------------------------------------------------------------
// SIMPLE FIVE-POSTER SOURCE DRAFT
// -----------------------------------------------------------------------------

v30RenderDraftMosaic = function v32RenderDraftPosters(pools, selectedIndex) {
  return pools
    .map((entry, sourceIndex) => {
      const film = entry.film;
      const selected = sourceIndex === selectedIndex;
      const image = film.poster || film.backdrop;
      return `
        <button class="v32DraftPoster ${selected ? "selected" : ""}" data-source="${sourceIndex}" aria-pressed="${selected}">
          <div class="v32DraftPosterImage" style="${image ? `background-image:url('${image}')` : ""}">
            ${selected ? '<span class="v32SelectedLabel">Selected</span>' : ""}
          </div>
          <div class="v32DraftPosterCopy">
            <b>${arcadeEsc(film.title)}</b>
            <span>${film.year} · ★ ${safe(film.rating).toFixed(1)}</span>
            <span>${arcadeEsc(v30SourceArchetypeLabel(entry))}</span>
          </div>
        </button>
      `;
    })
    .join("");
};

// All major crew wheels now show three people at a time.
const V32_ARCADE_BUILD_CREW_POOL_BASE = arcadeBuildCrewPool;
arcadeBuildCrewPool = async function v32ArcadeBuildCrewPool(kind) {
  return V32_ARCADE_BUILD_CREW_POOL_BASE(kind);
};

// -----------------------------------------------------------------------------
// SIMPLE STYLE CARDS + BASIC CREW TIERS
// -----------------------------------------------------------------------------

v25StylePackageCard = function v32StylePackageCard(item, kind, selected) {
  return `
    <button class="v32InspirationCard ${selected === item.id ? "selected" : ""}" data-v25-package-kind="${kind}" data-v25-package="${item.id}">
      <span>${item.icon}</span>
      <b>${arcadeEsc(item.name)}</b>
    </button>
  `;
};

v25EmphasisCards = function v32EmphasisCards(kind, selected) {
  return Object.entries(V25_CREATIVE_EMPHASES[kind])
    .map(
      ([name, item]) => `
        <button class="v32EmphasisCard ${selected === name ? "selected" : ""}" data-v25-emphasis-kind="${kind}" data-v25-emphasis="${arcadeEsc(name)}">
          <span>${item.icon}</span>
          <b>${arcadeEsc(name)}</b>
        </button>
      `,
    )
    .join("");
};

v31StyleCrewCard = function v32StyleCrewCard(p, kind, selectedId) {
  const selected = p.id === selectedId;
  const slot = v31StyleCrewSlot(kind);
  const tier = v32TalentTier(p, slot);
  return `
    <button class="v32StyleCrewCard ${selected ? "selected" : ""}" data-style-crew-kind="${kind}" data-style-crew-id="${p.id}">
      ${p.photo ? `<img src="${p.photo}" alt="">` : '<span class="arcadeCrewFallback">GL</span>'}
      <div><span>${kind === "composer" ? "Composer" : "Cinematographer"}</span><b>${arcadeEsc(p.name)}</b></div>
      <strong class="tier ${tier}">${tier}</strong>
    </button>
  `;
};

// -----------------------------------------------------------------------------
// SIX FIXED MARKETING STRATEGIES
// -----------------------------------------------------------------------------

function v32MarketingFit(strategy) {
  const primaryMatch = strategy.strengths.includes(S.project.genre);
  const secondaryMatch = strategy.strengths.includes(S.arcade?.secondaryGenre);
  const genreMatch = (primaryMatch ? 32 : 8) + (secondaryMatch ? 4 : 0);
  const scaleMatch = strategy.scales.includes(S.project.scale) ? 24 : 6;
  const actors = ARCADE_ACTOR_SLOTS.map((slot) =>
    person(S.roster[slot]),
  ).filter(Boolean);
  const avgDraw = actors.length
    ? average(actors.map((p) => safe(p.draw, 50)))
    : 50;
  const avgCraft = actors.length
    ? average(actors.map((p) => safe(p.craft, 50)))
    : 50;
  const baseBonus =
    strategy.base === "Prestige Campaign" ? avgCraft * 0.35 : avgDraw * 0.35;
  const budgetFit = v38MarketingBudgetFit(strategy);
  return clamp(
    24 + genreMatch + scaleMatch + baseBonus * 0.3 + budgetFit * 0.18,
    0,
    100,
  );
}

function v38MarketingScaleSpendFactor(scale = S.project.scale) {
  if (scale === "Microbudget") return 0.72;
  if (scale === "Independent") return 0.84;
  if (scale === "Mid-Budget") return 1;
  if (scale === "Studio Event") return 1.06;
  return 1.12;
}

function v38MarketingBudgetFit(strategy) {
  const target = v38MarketingScaleSpendFactor();
  const distance = Math.abs(safe(strategy?.spendMultiplier, 1) - target);
  return clamp(100 - distance * 180, 8, 100);
}

function v38MarketingFitMultiplier(score) {
  return clamp(1 + (safe(score, 68) - 68) / 500, 0.94, 1.06);
}

function v38PackageBudgetAdjustment(packageBudget) {
  const target = Math.max(0, safe(packageBudget?.target));
  const spent = Math.max(0, safe(packageBudget?.spent));
  const difference = spent - target;
  const settings = V34_BUDGET || V34_BUDGET_DEFAULTS;
  const tolerance = target * clamp(safe(settings.overageTolerance, 0.16), 0, 1);
  const overage = Math.max(0, difference);
  const excess = Math.max(0, overage - tolerance);
  const penalty = excess * Math.max(0, safe(settings.overagePenalty, 0.62));
  const savings = Math.max(0, -difference);
  const reward = savings * Math.max(0, safe(settings.savingsReward, 0.22));

  return {
    difference,
    tolerance,
    overage,
    excess,
    penalty,
    reward,
    adjustment: overage + penalty - reward,
  };
}

function v32FitGrade(score) {
  if (score >= 88) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 48) return "D";
  return "F";
}

const ACTIVE_MARKETING_PAGE_V32 = function v32MarketingPage() {
  v32EnsureState();
  const selected = S.arcade.marketingStrategy;
  const orderedStrategies = Object.entries(V32_MARKETING_STRATEGIES).sort(
    ([firstName, firstStrategy], [secondName, secondStrategy]) => {
      const firstSelected = firstName === selected ? 1 : 0;
      const secondSelected = secondName === selected ? 1 : 0;
      if (firstSelected !== secondSelected) return secondSelected - firstSelected;
      return (
        v38MarketingBudgetFit(secondStrategy) - v38MarketingBudgetFit(firstStrategy)
      );
    },
  );
  shell(`
    <div class="v32MarketingHeader">
      <div><span class="mini">Step 4 · Marketing</span><h1>Choose one campaign plan.</h1><p>Each strategy locks its trailer style, promotional approach and spending level. No manual slider homework.</p></div>
      ${v32BudgetWidget()}
    </div>
    ${v38LedgerSummaryMarkup("The campaign inherits this thesis")}
    <div class="v32MarketingGrid">
      ${orderedStrategies
        .map(([name, strategy]) => {
          const score = v32MarketingFit(strategy);
          const budgetFit = v38MarketingBudgetFit(strategy);
          return `
            <button class="v32MarketingCard ${selected === name ? "selected" : ""}" data-v32-marketing="${arcadeEsc(name)}">
              <span class="v32MarketingIcon">${strategy.icon}</span>
              <div class="v32MarketingTitle"><h2>${arcadeEsc(name)}</h2><strong>${v32FitGrade(score)}</strong></div>
              <p>${arcadeEsc(strategy.trailer)}</p>
              <div class="v32MarketingDetails">
                <span><b>Promotion</b>${arcadeEsc(strategy.promotion)}</span>
                <span><b>Spend</b>${Math.round(strategy.spendMultiplier * 100)}% of standard marketing</span>
                <span><b>Budget fit</b>${Math.round(budgetFit)}%</span>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
    <div class="arcadeFooterNav"><button class="btn" id="backProd">← Crew & style</button><button class="btn warn" id="launch" ${selected ? "" : "disabled"}>Launch release</button></div>
  `);

  $$("[data-v32-marketing]").forEach((button) => {
    button.onclick = () => {
      const name = button.dataset.v32Marketing;
      const strategy = V32_MARKETING_STRATEGIES[name];
      S.arcade.marketingStrategy = name;
      S.arcade.marketingConfirmed = true;
      S.arcade.marketingLabel = name;
      S.arcade.marketingSliders = { ...strategy.sliders };
      S.marketing = strategy.base;
      render();
    };
  });

  $("#backProd").onclick = () => {
    S.screen = 2;
    render();
  };

  $("#launch").onclick = async () => {
    S.arcade.marketingConfirmed = true;
    S.simulation = simulate();
    await loadCompetition();
    S.releaseRace = buildReleaseRace(S.simulation);
    S.releaseRaceCompleted = false;
    S.screen = 4;
    render();
  };
};

// -----------------------------------------------------------------------------
// MONEY EFFECTS
// -----------------------------------------------------------------------------

const V32_SIMULATE_BASE = simulate;
simulate = function v32Simulate() {
  const simulation = V32_SIMULATE_BASE();
  const packageBudget = v32PackageBudget();
  const packageImpact = v38PackageBudgetAdjustment(packageBudget);

  simulation.packageSpend = packageBudget.spent;
  simulation.packageTarget = packageBudget.target;
  simulation.packageTolerance = packageImpact.tolerance;
  simulation.packageOverage = packageImpact.overage;
  simulation.packagePenalty = packageImpact.penalty;
  simulation.packageSavingsReward = packageImpact.reward;
  simulation.packageBudgetAdjustment = packageImpact.adjustment;
  simulation.budget = Math.max(
    1,
    safe(simulation.budget) + packageImpact.adjustment,
  );

  const strategy =
    V32_MARKETING_STRATEGIES[S.arcade.marketingStrategy] ||
    V32_MARKETING_STRATEGIES["Blockbuster Blitz"];
  const scaleSpendFactor = v38MarketingScaleSpendFactor();
  simulation.marketing *=
    strategy.spendMultiplier *
    V32_BALANCE.marketingSpendStrength *
    scaleSpendFactor;
  simulation.marketingStrategy = S.arcade.marketingStrategy;
  simulation.marketingFit = v32MarketingFit(strategy);
  simulation.marketingFitMultiplier = v38MarketingFitMultiplier(
    simulation.marketingFit,
  );
  const marketingLuck = rng(
    `v38-marketing-luck|${S.runSeed || "run"}|${S.project.scale}|${strategy.base}`,
  );
  const breakoutChance =
    ["Microbudget", "Independent"].includes(S.project.scale)
      ? clamp((simulation.marketingFit - 62) / 280, 0.04, 0.2)
      : 0.03;
  if (marketingLuck() < breakoutChance) {
    const breakoutBoost =
      ["Microbudget", "Independent"].includes(S.project.scale)
        ? 1.16 + marketingLuck() * 0.44
        : 1.08 + marketingLuck() * 0.24;
    simulation.world *= breakoutBoost;
    simulation.domestic *= breakoutBoost;
    simulation.opening *= Math.sqrt(breakoutBoost);
    simulation.marketingBreakout = true;
    simulation.marketingBreakoutBoost = breakoutBoost;
  } else {
    simulation.marketingBreakout = false;
  }
  simulation.world *= simulation.marketingFitMultiplier;
  simulation.domestic *= simulation.marketingFitMultiplier;
  simulation.opening *= Math.sqrt(simulation.marketingFitMultiplier);
  simulation.audience = clamp(
    safe(simulation.audience) + (simulation.marketingFit - 68) / 24,
  );

  if (typeof v28RecalculateEconomics === "function") {
    v28RecalculateEconomics(simulation);
  }

  return simulation;
};

// -----------------------------------------------------------------------------
// SIDEBAR PACKAGE BUDGET
// -----------------------------------------------------------------------------

const V32_SIDEBAR_BASE = sidebar;
sidebar = function v32Sidebar() {
  const html = V32_SIDEBAR_BASE();
  return html.replace(
    "</aside>",
    `${v32BudgetWidget()}${v38FinancialForecastWidget()}</aside>`,
  );
};

// -----------------------------------------------------------------------------
// PRESS-AND-HOLD YEAR CONTROLS
// -----------------------------------------------------------------------------

const V32_BIND_YEAR_BASE = v28BindReleaseYearControl;
v28BindReleaseYearControl = function v32BindReleaseYearControl() {
  V32_BIND_YEAR_BASE();
  const input = $("#v26ReleaseYear");
  if (!input) return;

  const bindHold = (button, direction) => {
    if (!button) return;
    let delayTimer = null;
    let repeatTimer = null;

    const step = () => v28SetReleaseYear(Number(input.value) + direction);
    const stop = () => {
      clearTimeout(delayTimer);
      clearInterval(repeatTimer);
      delayTimer = null;
      repeatTimer = null;
    };

    button.onpointerdown = (event) => {
      event.preventDefault();
      step();
      delayTimer = setTimeout(() => {
        repeatTimer = setInterval(step, 85);
      }, 360);
      button.setPointerCapture?.(event.pointerId);
    };
    button.onpointerup = stop;
    button.onpointercancel = stop;
    button.onpointerleave = stop;
  };

  bindHold($("#v28YearUp"), 1);
  bindHold($("#v28YearDown"), -1);
};

// Remove source-film animation and use a plain outline selection.
const V32_HIRE_PAGE_BASE = ACTIVE_HIRE_PAGE_V31;
const ACTIVE_HIRE_PAGE_V32 = async function v32HirePage() {
  const renderId = ACTIVE_RENDER_ID;
  await V32_HIRE_PAGE_BASE();
  if (renderId !== ACTIVE_RENDER_ID || S.screen !== 1) return;
  $$("[data-source]").forEach((button) => {
    button.onclick = () => {
      const activeSlot = S.activeSlot;
      S.sourceIndex[activeSlot] = Number(button.dataset.source);
      v30TrackDraftSelection(activeSlot, S.sourceIndex[activeSlot]);
      S.tierCache[activeSlot] = {};
      render();
    };
  });
};

v32EnsureState();

// =============================================================================
// GREENLIT V33 — STUDIO BUDGET PLAN, FULL POSTER DRAFT, DATA-TUNED ECONOMY
// =============================================================================

const V33_VERSION = "33.0";
const V33_BALANCE_STORAGE_KEY = "greenlit-v38-balance-lab";

const V33_DATA_TUNED_DEFAULTS = {
  packageBudgetShare: 0.24,
  packageCostStrength: 1,
  packageOverageWeight: 0.7,
  packageSavingsWeight: 0.35,
  marketingSpendStrength: 1,
  reserveShare: 0.08,
  allTimeHitTarget: 0.1,
  allTimeHitGross: 900,
  allTimeHitRoi: 0.7,
  blockbusterRoi: 0.52,
  hitRoi: 0.18,
  catastropheStrength: 0.78,
  randomness: 0.86,
  audienceInfluence: 1.12,
  fitInfluence: 1.16,
};

function v33LoadBalanceSettings() {
  try {
    return {
      ...V33_DATA_TUNED_DEFAULTS,
      ...JSON.parse(localStorage.getItem(V33_BALANCE_STORAGE_KEY) || "{}"),
    };
  } catch {
    return { ...V33_DATA_TUNED_DEFAULTS };
  }
}

let V33_BALANCE = v33LoadBalanceSettings();

function v33ApplyBalanceSettings() {
  Object.assign(V32_BALANCE, {
    packageBudgetShare: V33_BALANCE.packageBudgetShare,
    packageCostStrength: V33_BALANCE.packageCostStrength,
    packageOverageWeight: V33_BALANCE.packageOverageWeight,
    packageSavingsWeight: V33_BALANCE.packageSavingsWeight,
    marketingSpendStrength: V33_BALANCE.marketingSpendStrength,
    allTimeHitTarget: V33_BALANCE.allTimeHitTarget,
  });

  Object.assign(BALANCE_TUNING.outcomes, {
    allTimeHitRoi: V33_BALANCE.allTimeHitRoi,
    allTimeHitGross: V33_BALANCE.allTimeHitGross,
    blockbusterRoi: V33_BALANCE.blockbusterRoi,
    hitRoi: V33_BALANCE.hitRoi,
  });

  Object.assign(BALANCE_TUNING.packages["Weak Package"], {
    multiplier: 0.92,
    variance: 0.2,
    upsideChance: 0.22,
    upsideMin: 1.18,
    upsideMax: 1.45,
  });
  Object.assign(BALANCE_TUNING.packages.Average, {
    multiplier: 1.01,
    variance: 0.17,
    upsideChance: 0.09,
    upsideMin: 1.12,
    upsideMax: 1.32,
  });
  Object.assign(BALANCE_TUNING.packages.Strong, {
    multiplier: 1.13,
    variance: 0.17,
    downsideChance: 0.1,
    downsideMin: 0.78,
    downsideMax: 0.96,
  });
  Object.assign(BALANCE_TUNING.packages["Dream Team"], {
    multiplier: 1.28,
    variance: 0.2,
    downsideChance: 0.18,
    downsideMin: 0.68,
    downsideMax: 0.88,
  });

  Object.assign(BALANCE_TUNING.modeEffects, {
    searchDrawBonus: 0.8,
    searchGrossMultiplier: 1.005,
    draftStabilityBonus: 1.2,
    searchStabilityBonus: -1,
  });

  Object.assign(BALANCE_TUNING.auditions, {
    resultMinimum: -4,
    resultMaximum: 12,
    craftWeight: 0.55,
    audienceWeight: 0.5,
    grossDivisor: 225,
  });

  Object.assign(BALANCE_TUNING.reception.critics, {
    craftWeight: 0.48,
    fitWeight: 0.19 * V33_BALANCE.fitInfluence,
    randomAmplitude: 25 * V33_BALANCE.randomness,
  });

  Object.assign(BALANCE_TUNING.reception.audience, {
    base: 33,
    craftWeight: 0.25,
    drawWeight: 0.15,
    fitWeight: 0.2 * V33_BALANCE.fitInfluence,
    auditionWeight: 0.34,
    randomAmplitude: 26 * V33_BALANCE.randomness,
  });

  Object.assign(BALANCE_TUNING.grossModel, {
    drawDivisor: 160,
    audienceIntercept: 0.8,
    audienceDivisor: 220 / V33_BALANCE.audienceInfluence,
    noiseFloor: 0.24 * V33_BALANCE.randomness,
    catastropheGrossMinimum: 0.32 / V33_BALANCE.catastropheStrength,
    catastropheGrossMaximum: 0.62 / V33_BALANCE.catastropheStrength,
  });

  const economyDefaults = {
    Microbudget: [1.14, 0.42, 0.045, 0.05],
    Independent: [1.11, 0.37, 0.055, 0.05],
    "Mid-Budget": [1, 0.3, 0.07, 0.06],
    "Studio Event": [0.93, 0.26, 0.085, 0.07],
    Tentpole: [0.92, 0.245, 0.1, 0.08],
  };

  Object.entries(economyDefaults).forEach(([scale, values]) => {
    Object.assign(BALANCE_TUNING.economy[scale], {
      demandMultiplier: values[0],
      marketingRate: values[1],
      overrunVolatility: values[2] * V33_BALANCE.randomness,
      catastropheChance: values[3] * V33_BALANCE.catastropheStrength,
    });
  });
}

v33ApplyBalanceSettings();

function v33EnsureState() {
  v32EnsureState();
  S.arcade.version = V33_VERSION;
}

// -----------------------------------------------------------------------------
// FULL-HEIGHT POSTER CARDS
// -----------------------------------------------------------------------------

v30RenderDraftMosaic = function v33RenderDraftPosters(pools, selectedIndex) {
  return pools
    .map((entry, sourceIndex) => {
      const film = entry.film;
      const selected = sourceIndex === selectedIndex;
      const image = film.poster || film.backdrop;
      return `
        <button
          class="v33DraftPoster ${selected ? "selected" : ""}"
          data-source="${sourceIndex}"
          aria-pressed="${selected}"
          title="${arcadeEsc(film.title)}"
        >
          ${
            image
              ? `<img src="${image}" alt="${arcadeEsc(film.title)} poster">`
              : '<span class="v33PosterFallback">GREENLIT</span>'
          }
          <span class="v33PosterShade"></span>
          ${selected ? '<span class="v33SelectedLabel">Selected</span>' : ""}
          <span class="v33PosterMeta">
            <b>${arcadeEsc(film.title)}</b>
            <small>${film.year} · ★ ${safe(film.rating).toFixed(1)}</small>
            <small>${arcadeEsc(v30SourceArchetypeLabel(entry))}</small>
          </span>
        </button>
      `;
    })
    .join("");
};

// -----------------------------------------------------------------------------
// FOUR-PART STUDIO BUDGET PLAN
// -----------------------------------------------------------------------------

function v33StudioBudgetPlan() {
  const packageBudget = v32PackageBudget();
  const packageImpact = v38PackageBudgetAdjustment(packageBudget);
  const strategy =
    V32_MARKETING_STRATEGIES[S.arcade.marketingStrategy] ||
    V32_MARKETING_STRATEGIES["Blockbuster Blitz"];
  const economy = scaleEconomy();
  const originalProduction = packageBudget.originalBudget;
  const talentTarget = packageBudget.target;
  const talentSpent = packageBudget.spent;
  const productionForecast = Math.max(0, originalProduction - talentTarget);
  const marketingForecast =
    originalProduction *
    safe(economy.marketingRate, 0.3) *
    safe(strategy.spendMultiplier, 1) *
    V32_BALANCE.marketingSpendStrength *
    v38MarketingScaleSpendFactor();
  const reserveTarget = originalProduction * V33_BALANCE.reserveShare;
  const talentOverage = Math.max(0, talentSpent - talentTarget);
  const reserveRemaining = Math.max(0, reserveTarget - talentOverage);
  const studioPlan = originalProduction + marketingForecast + reserveTarget;
  const committed =
    talentSpent +
    productionForecast +
    marketingForecast +
    packageImpact.penalty;

  return {
    originalProduction,
    talentTarget,
    talentSpent,
    productionForecast,
    marketingForecast,
    reserveTarget,
    reserveRemaining,
    packagePenalty: packageImpact.penalty,
    packageExcess: packageImpact.excess,
    studioPlan,
    committed,
    commitmentPercent: studioPlan ? (committed / studioPlan) * 100 : 0,
  };
}

function v33BudgetBar(label, value, benchmark, note, className = "") {
  const percent = benchmark ? (value / benchmark) * 100 : 0;
  return `
    <div class="v33BudgetLine ${className}">
      <div class="v33BudgetLineHead">
        <span>${label}</span>
        <b>${moneyM(value)}</b>
      </div>
      <div class="v33BudgetLineTrack"><span style="width:${clamp(percent, 0, 100)}%"></span></div>
      <small>${note}</small>
    </div>
  `;
}

v32BudgetWidget = function v33BudgetWidget() {
  const plan = v33StudioBudgetPlan();
  const packageState =
    plan.talentSpent >
    plan.talentTarget * (1 + safe(V34_BUDGET?.overageTolerance, 0.16))
      ? "over"
      : plan.talentSpent > plan.talentTarget
        ? "warn"
        : "good";

  return `
    <section class="v33StudioBudget ${packageState}">
      <div class="v33BudgetTop">
        <div>
          <span>Studio budget plan</span>
          <b>${moneyM(plan.committed)} committed</b>
        </div>
        <strong>${Math.round(plan.commitmentPercent)}%</strong>
      </div>
      <div class="v33BudgetOverviewTrack"><span style="width:${clamp(plan.commitmentPercent, 0, 100)}%"></span></div>
      <div class="v33BudgetLines">
        ${v33BudgetBar(
          "Talent",
          plan.talentSpent,
          plan.talentTarget,
          `${moneyM(plan.talentTarget)} target based on the original production budget`,
          "talent",
        )}
        ${v33BudgetBar(
          "Production",
          plan.productionForecast,
          plan.originalProduction,
          "Sets, crew, locations, VFX and post-production forecast",
          "production",
        )}
        ${v33BudgetBar(
          "Marketing",
          plan.marketingForecast,
          plan.studioPlan,
          `${S.arcade.marketingStrategy || "Campaign not selected"} estimate`,
          "marketing",
        )}
        ${v33BudgetBar(
          "Reserve",
          plan.reserveRemaining,
          plan.reserveTarget,
          plan.reserveRemaining < plan.reserveTarget
            ? `${moneyM(plan.reserveTarget - plan.reserveRemaining)} absorbed by talent overage${plan.packagePenalty ? ` · ${moneyM(plan.packagePenalty)} severe overage penalty` : ""}`
            : "Contingency available for overruns and release surprises",
          "reserve",
        )}
      </div>
      <div class="v33BudgetFooter">
        <span>Total studio plan</span>
        <b>${moneyM(plan.studioPlan)}</b>
      </div>
    </section>
  `;
};

v33EnsureState();

// =============================================================================
// GREENLIT V34 — BUDGET AFFORDABILITY, TIER QUOTAS, SECONDARY GENRES
// =============================================================================

const V34_VERSION = "34.0";
const V34_BUDGET_STORAGE_KEY = "greenlit-v38-budget-lab";

const V34_BUDGET_DEFAULTS = {
  feeStrength: 1,
  lowBudgetDiscount: 0.58,
  highBudgetPremium: 1.12,
  overageTolerance: 0.16,
  savingsReward: 0.22,
  overagePenalty: 0.62,
  shares: {
    Microbudget: 0.36,
    Independent: 0.31,
    "Mid-Budget": 0.26,
    "Studio Event": 0.23,
    Tentpole: 0.2,
  },
};

function v34LoadBudgetSettings() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(V34_BUDGET_STORAGE_KEY) || "{}",
    );
    return {
      ...structuredClone(V34_BUDGET_DEFAULTS),
      ...parsed,
      shares: {
        ...V34_BUDGET_DEFAULTS.shares,
        ...(parsed.shares || {}),
      },
    };
  } catch {
    return structuredClone(V34_BUDGET_DEFAULTS);
  }
}

let V34_BUDGET = v34LoadBudgetSettings();

function v34SaveBudgetSettings() {
  localStorage.setItem(V34_BUDGET_STORAGE_KEY, JSON.stringify(V34_BUDGET));
}

function v34DefaultSecondaryGenre() {
  return (
    (S.reference?.genres || []).find(
      (genre) => GENRES.includes(genre) && genre !== S.project.genre,
    ) || ""
  );
}

function v34EnsureState() {
  v33EnsureState();
  S.arcade.version = V34_VERSION;
  if (!S.arcade.secondaryGenreInitialized) {
    S.arcade.secondaryGenre =
      S.arcade.secondaryGenre || v34DefaultSecondaryGenre();
    S.arcade.secondaryGenreInitialized = true;
  }
  S.arcade.poolTierAssignments = S.arcade.poolTierAssignments || {};
}

function v34TierDistribution(total) {
  if (total <= 0) return { S: 0, A: 0, B: 0, C: 0, D: 0 };

  const desired = {
    S: total * 0.1,
    A: total * 0.2,
    B: total * 0.22,
    C: total * 0.3,
    D: total * 0.18,
  };

  const counts = Object.fromEntries(
    Object.entries(desired).map(([tier, value]) => [tier, Math.floor(value)]),
  );

  let assigned = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const remainderOrder = Object.entries(desired)
    .map(([tier, value]) => ({ tier, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let index = 0;
  while (assigned < total) {
    counts[remainderOrder[index % remainderOrder.length].tier] += 1;
    assigned += 1;
    index += 1;
  }

  return counts;
}

function v34AssignPoolTiers(slot) {
  const pools = S.sourcePools?.[slot] || [];
  const candidates = pools
    .flatMap((entry) => entry.people || [])
    .filter(Boolean)
    .sort((a, b) => stableTierScore(b, slot) - stableTierScore(a, slot));

  const counts = v34TierDistribution(candidates.length);
  const tiers = ["S", "A", "B", "C", "D"];
  const assignment = {};
  let cursor = 0;

  for (const tier of tiers) {
    for (let i = 0; i < counts[tier] && cursor < candidates.length; i += 1) {
      assignment[candidates[cursor].id] = tier;
      cursor += 1;
    }
  }

  S.arcade.poolTierAssignments[slot] = assignment;
  S.tierCache[slot] = {};

  for (const entry of pools) {
    entry.people = (entry.people || []).slice().sort((a, b) => {
      const tierDifference =
        TIER_ORDER[assignment[b.id]] - TIER_ORDER[assignment[a.id]];
      return (
        tierDifference || stableTierScore(b, slot) - stableTierScore(a, slot)
      );
    });
  }
}

const V34_BUILD_POOL_BASE = buildPool;
buildPool = async function v34BuildPool(slot) {
  return V34_BUILD_POOL_BASE(slot);
};

const V34_V32_TALENT_TIER_BASE = v32TalentTier;
v32TalentTier = function v34TalentTier(p, slot) {
  v34EnsureState();
  const assigned = S.arcade.poolTierAssignments?.[slot]?.[p?.id];
  if (!assigned) return V34_V32_TALENT_TIER_BASE(p, slot);

  const audition = v24AuditionFor?.(slot, p.id) || null;
  return audition ? moveTier(assigned, auditionTierShift(audition)) : assigned;
};

function v34ScaleFeeMultiplier(scale = S.project.scale) {
  if (scale === "Microbudget") return clamp(V34_BUDGET.lowBudgetDiscount * 0.9, 0.42, 0.85);
  if (scale === "Independent")
    return clamp(V34_BUDGET.lowBudgetDiscount * 1.08, 0.5, 0.92);
  if (scale === "Studio Event") return 1.04;
  if (scale === "Tentpole") return V34_BUDGET.highBudgetPremium;
  return 1;
}

const V34_PERSON_FEE_BASE = v32PersonFee;
v32PersonFee = function v34PersonFee(p, slot) {
  const base = V34_PERSON_FEE_BASE(p, slot);
  return base * V34_BUDGET.feeStrength * v34ScaleFeeMultiplier();
};

v32PackageBudget = function v34PackageBudget() {
  const originalBudget = Math.max(
    1,
    safe(S.reference?.budgetM, average(SCALE[S.project.scale].budget)),
  );
  const targetShare = safe(
    V34_BUDGET.shares[S.project.scale],
    V34_BUDGET_DEFAULTS.shares[S.project.scale],
  );
  const target = originalBudget * targetShare;
  let spent = 0;

  for (const slot of ARCADE_ACTOR_SLOTS) {
    const hired = person(S.roster[slot]);
    if (hired) spent += v32PersonFee(hired, slot);
  }

  const crew = S.arcade?.crew || {};
  for (const id of crew.selectedDirectors || []) {
    const hired = person(id);
    if (hired) spent += v32PersonFee(hired, "Director 1");
  }
  for (const id of crew.selectedWriters || []) {
    const hired = person(id);
    if (hired) spent += v32PersonFee(hired, "Writer 1");
  }

  spent += v32StyleCrewFee("composer");
  spent += v32StyleCrewFee("cinematographer");

  return {
    originalBudget,
    target,
    spent,
    remaining: target - spent,
    percent: target ? (spent / target) * 100 : 0,
    targetShare,
  };
};

function v34CandidateCostPreview(p, slot) {
  const packageBudget = v32PackageBudget();
  const current = person(S.roster[slot]);
  const currentFee = current ? v32PersonFee(current, slot) : 0;
  const candidateFee = v32PersonFee(p, slot);
  const projected = Math.max(
    0,
    packageBudget.spent - currentFee + candidateFee,
  );
  const projectedPercent = packageBudget.target
    ? (projected / packageBudget.target) * 100
    : 0;
  const remainingAfter = packageBudget.target - projected;

  return {
    candidateFee,
    projected,
    projectedPercent,
    remainingAfter,
  };
}

const V34_CANDIDATE_CARD_BASE = arcadeCandidateCard;
arcadeCandidateCard = function v34CandidateCard(p, slot) {
  const html = V34_CANDIDATE_CARD_BASE(p, slot);
  const cost = v34CandidateCostPreview(p, slot);
  const state =
    cost.projectedPercent > 116
      ? "over"
      : cost.projectedPercent > 100
        ? "warn"
        : "good";

  const budgetMarkup = `
    <div class="v34ActorCost ${state}">
      <div>
        <span>Estimated fee</span>
        <b>${moneyM(cost.candidateFee)}</b>
      </div>
      <div>
        <span>Package after hire</span>
        <b>${Math.round(cost.projectedPercent)}%</b>
      </div>
      <small>${
        cost.remainingAfter >= 0
          ? `${moneyM(cost.remainingAfter)} package room remains`
          : `${moneyM(Math.abs(cost.remainingAfter))} above the talent target`
      }</small>
    </div>
  `;

  return html.replace(
    '<div class="v25ThreeScores">',
    `${budgetMarkup}<div class="v25ThreeScores">`,
  );
};

function v34SecondaryGenreOptions() {
  return ["", ...GENRES.filter((genre) => genre !== S.project.genre)]
    .map(
      (genre) => `
        <option value="${arcadeEsc(genre)}" ${S.arcade.secondaryGenre === genre ? "selected" : ""}>
          ${genre || "No secondary genre"}
        </option>
      `,
    )
    .join("");
}

const V34_PROJECT_PAGE_BASE = ACTIVE_PROJECT_PAGE_V28;
const ACTIVE_PROJECT_PAGE_V34 = function v34ProjectPage() {
  v34EnsureState();
  V34_PROJECT_PAGE_BASE();

  const pickedMovie = document.querySelector(".arcadePickedMovie");
  if (!pickedMovie || document.querySelector(".v34SecondaryGenre")) return;

  const panel = document.createElement("section");
  panel.className = "v34SecondaryGenre";
  panel.innerHTML = `
    <div>
      <span class="mini">Genre adjustment</span>
      <b>Secondary genre</b>
      <small>The main genre remains ${arcadeEsc(S.project.genre)}. The secondary genre lightly influences casting fit, marketing, and seasonal positioning.</small>
    </div>
    <select id="v34SecondaryGenreSelect">${v34SecondaryGenreOptions()}</select>
  `;

  pickedMovie.insertAdjacentElement("afterend", panel);

  $("#v34SecondaryGenreSelect").onchange = (event) => {
    S.arcade.secondaryGenre = event.target.value;
    S.arcade.secondaryGenreInitialized = true;
    render();
  };
};

const V34_BASE_ATTRS_BASE = baseAttrs;
baseAttrs = function v34BaseAttrs(p, slot) {
  const attrs = V34_BASE_ATTRS_BASE(p, slot);
  const secondary = S.arcade?.secondaryGenre;
  if (secondary && ARCADE_ACTOR_SLOTS.includes(slot)) {
    const secondaryFit = safe(p.fit?.[secondary], attrs.fit);
    attrs.fit = clamp(attrs.fit * 0.84 + secondaryFit * 0.16);
  }
  return attrs;
};

function v34BudgetScaleRows() {
  return Object.entries(SCALE)
    .map(([scale, values]) => {
      const midpoint = average(values.budget);
      const share = V34_BUDGET.shares[scale];
      const target = midpoint * share;
      const sampleB =
        V32_TIER_FEES.B * v34ScaleFeeMultiplier(scale) * V34_BUDGET.feeStrength;
      const sampleA =
        V32_TIER_FEES.A * v34ScaleFeeMultiplier(scale) * V34_BUDGET.feeStrength;
      const affordability = target / Math.max(0.01, sampleB * 3 + sampleA * 2);
      const label =
        affordability >= 1.15
          ? "Flexible"
          : affordability >= 0.9
            ? "Balanced"
            : "Tight";
      return `
        <tr>
          <td><b>${scale}</b><small>${moneyM(values.budget[0])}–${moneyM(values.budget[1])}</small></td>
          <td>${Math.round(share * 100)}%</td>
          <td>${moneyM(target)}</td>
          <td><span class="v34Affordability ${label.toLowerCase()}">${label}</span></td>
        </tr>
      `;
    })
    .join("");
}

function v34BudgetControl(
  label,
  key,
  value,
  min,
  max,
  step,
  description,
  suffix = "",
) {
  return `
    <label class="v34BudgetControl">
      <div><b>${label}</b><small>${description}</small></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-v34-budget="${key}">
      <output>${value}${suffix}</output>
    </label>
  `;
}

function v34ExportBudgetPreset() {
  downloadFile(
    `greenlit-v34-budget-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(
      {
        type: "GREENLIT_BUDGET_LAB_V34",
        version: V34_VERSION,
        settings: V34_BUDGET,
      },
      null,
      2,
    ),
    "application/json",
  );
}

function v34ImportBudgetPreset(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const settings = parsed.settings || parsed;
      V34_BUDGET = {
        ...structuredClone(V34_BUDGET_DEFAULTS),
        ...settings,
        shares: {
          ...V34_BUDGET_DEFAULTS.shares,
          ...(settings.shares || {}),
        },
      };
      v34SaveBudgetSettings();
      closeModal();
      balanceModal();
    } catch {
      alert("That file is not a valid GREENLIT budget preset.");
    }
  };
  reader.readAsText(file);
}

balanceModal = function v34BudgetLabModal() {
  modal(
    `
      <div class="v34BudgetLabHead">
        <div>
          <span class="mini">Budget Lab</span>
          <h1>Make every production scale playable.</h1>
          <p>Low budgets receive fee compression and larger talent shares. High budgets have more room, but premium salaries and overage risk prevent automatic dream teams.</p>
        </div>
        <button class="balanceClose" data-close>×</button>
      </div>

      <section class="v34BudgetLabSummary">
        <div><span>Current fee scale</span><b>${Math.round(V34_BUDGET.feeStrength * 100)}%</b></div>
        <div><span>Microbudget discount</span><b>${Math.round((1 - V34_BUDGET.lowBudgetDiscount) * 100)}%</b></div>
        <div><span>Tentpole premium</span><b>+${Math.round((V34_BUDGET.highBudgetPremium - 1) * 100)}%</b></div>
        <div><span>Overage tolerance</span><b>${Math.round(V34_BUDGET.overageTolerance * 100)}%</b></div>
      </section>

      <section class="v34BudgetLabPanel">
        <div class="v34BudgetLabTitle"><span class="mini">Affordability preview</span><h2>Expected room by scale</h2></div>
        <table class="v34BudgetTable">
          <thead><tr><th>Scale</th><th>Talent share</th><th>Midpoint target</th><th>Five-person package</th></tr></thead>
          <tbody>${v34BudgetScaleRows()}</tbody>
        </table>
      </section>

      <section class="v34BudgetLabPanel">
        <div class="v34BudgetLabTitle"><span class="mini">Fee behavior</span><h2>Salary pressure</h2></div>
        ${v34BudgetControl("Global fee strength", "feeStrength", Math.round(V34_BUDGET.feeStrength * 100), 65, 140, 1, "Raises or lowers every estimated talent fee.", "%")}
        ${v34BudgetControl("Low-budget fee discount", "lowBudgetDiscount", Math.round(V34_BUDGET.lowBudgetDiscount * 100), 45, 90, 1, "Compresses salaries for microbudget and independent films.", "%")}
        ${v34BudgetControl("High-budget salary premium", "highBudgetPremium", Math.round(V34_BUDGET.highBudgetPremium * 100), 100, 145, 1, "Makes prestige and star packages more expensive for tentpoles.", "%")}
        ${v34BudgetControl("Overage tolerance", "overageTolerance", Math.round(V34_BUDGET.overageTolerance * 100), 5, 35, 1, "How far a package can exceed target before severe penalties begin.", "%")}
      </section>

      <section class="v34BudgetLabPanel">
        <div class="v34BudgetLabTitle"><span class="mini">Talent allocation</span><h2>Share of production budget</h2></div>
        ${Object.keys(SCALE)
          .map((scale) =>
            v34BudgetControl(
              scale,
              `share:${scale}`,
              Math.round(V34_BUDGET.shares[scale] * 100),
              12,
              45,
              1,
              `Talent-package target for ${scale.toLowerCase()} productions.`,
              "%",
            ),
          )
          .join("")}
      </section>

      <div class="v34BudgetLabActions">
        <button class="btn" id="v34ResetBudget">Reset defaults</button>
        <button class="btn" id="v34ImportBudget">Import budget preset</button>
        <input id="v34ImportBudgetFile" type="file" accept="application/json,.json" hidden>
        <button class="btn primary" id="v34ExportBudget">Export budget preset</button>
      </div>
    `,
    "balanceModal v34BudgetLabModal",
  );

  $$("[data-v34-budget]").forEach((input) => {
    input.oninput = () => {
      const key = input.dataset.v34Budget;
      const value = Number(input.value) / 100;
      if (key.startsWith("share:")) {
        V34_BUDGET.shares[key.slice(6)] = value;
      } else {
        V34_BUDGET[key] = value;
      }
      input.nextElementSibling.textContent = `${input.value}%`;
      v34SaveBudgetSettings();
    };
    input.onchange = () => {
      closeModal();
      balanceModal();
    };
  });

  $("#v34ResetBudget").onclick = () => {
    V34_BUDGET = structuredClone(V34_BUDGET_DEFAULTS);
    v34SaveBudgetSettings();
    closeModal();
    balanceModal();
  };
  $("#v34ExportBudget").onclick = v34ExportBudgetPreset;
  $("#v34ImportBudget").onclick = () => $("#v34ImportBudgetFile").click();
  $("#v34ImportBudgetFile").onchange = (event) => {
    const file = event.target.files?.[0];
    if (file) v34ImportBudgetPreset(file);
  };
};

v34EnsureState();

// =============================================================================
// GREENLIT V35 — RESEARCH-GUIDED CASTING, STYLE, STORY AND RESULTS PASS
// =============================================================================

const V35_VERSION = "35.0";
const V35_TIER_VERSION = 2;

function v35EnsureState() {
  v34EnsureState();
  S.arcade.version = V35_VERSION;
  S.arcade.poolTierVersion = S.arcade.poolTierVersion || {};
  S.arcade.storyEvents = Array.isArray(S.arcade.storyEvents)
    ? S.arcade.storyEvents
    : [];
  S.arcade.styleCrewProfiles = S.arcade.styleCrewProfiles || {};
  const styleCrew = S.arcade.styleCrew;
  styleCrew.duoPackages = Array.isArray(styleCrew.duoPackages)
    ? styleCrew.duoPackages
    : [];
  styleCrew.duoSelectedId = styleCrew.duoSelectedId || null;
  styleCrew.duoRoll = Math.max(0, Math.floor(safe(styleCrew.duoRoll)));
  styleCrew.duoRerollUsed = Boolean(styleCrew.duoRerollUsed);
  S.arcade.decisionLedger = V38_LEDGER?.create(
    S.arcade.decisionLedger,
    S.runSeed,
  ) ||
    S.arcade.decisionLedger || { version: 1, choices: {} };
}

function v35PushStoryEvent(key, event) {
  v35EnsureState();
  if (!key || !event) return;
  const index = S.arcade.storyEvents.findIndex((entry) => entry.key === key);
  const value = { key, ...event };
  if (index >= 0) S.arcade.storyEvents[index] = value;
  else S.arcade.storyEvents.push(value);
  S.arcade.storyEvents = S.arcade.storyEvents.slice(-30);
}

// -----------------------------------------------------------------------------
// RELEASE-YEAR CONTROL — NO STALE-NODE OSCILLATION
// -----------------------------------------------------------------------------

v28BindReleaseYearControl = function v35BindReleaseYearControl() {
  const input = $("#v26ReleaseYear");
  const up = $("#v28YearUp");
  const down = $("#v28YearDown");
  if (!input) return;

  input.min = safe(V28_TMDB_YEAR_BOUNDS.min, 1874);
  input.max = V30_CURRENT_YEAR;

  const setPreviewYear = (nextValue) => {
    const year = v28ValidReleaseYear(nextValue, v28ReleaseYear());
    S.arcade.releaseYear = year;
    input.value = year;

    const era = v26GenreEraMultiplier(S.project.genre, year);
    const lifetimeEffect = v28LifetimeEraEffect(era);
    const openingEffect = v28OpeningEraEffect(era);
    const readout = document.querySelector(".v26EraReadout");
    if (readout) {
      const lifetimeText = `${lifetimeEffect >= 1 ? "+" : ""}${(
        (lifetimeEffect - 1) *
        100
      ).toFixed(1)}%`;
      const openingText = `${openingEffect >= 1 ? "+" : ""}${(
        (openingEffect - 1) *
        100
      ).toFixed(1)}%`;
      readout.innerHTML = `Era demand: <b>${era.toFixed(
        2,
      )}×</b><span>Lifetime effect ${lifetimeText} · opening effect ${openingText}</span>`;
    }
  };

  const commit = () => {
    setPreviewYear(input.value);
    render();
  };

  input.onchange = commit;
  input.onkeydown = (event) => {
    if (event.key === "Enter") commit();
  };

  const bindRepeater = (button, direction) => {
    if (!button) return;
    let delayId = null;
    let intervalId = null;
    let changed = false;

    const step = () => {
      changed = true;
      setPreviewYear(
        safe(S.arcade.releaseYear, Number(input.value)) + direction,
      );
    };

    const stop = () => {
      clearTimeout(delayId);
      clearInterval(intervalId);
      delayId = null;
      intervalId = null;
      if (changed) {
        changed = false;
        render();
      }
    };

    button.onclick = (event) => event.preventDefault();
    button.onpointerdown = (event) => {
      event.preventDefault();
      clearTimeout(delayId);
      clearInterval(intervalId);
      step();
      delayId = setTimeout(() => {
        intervalId = setInterval(step, 95);
      }, 380);
      button.setPointerCapture?.(event.pointerId);
    };
    button.onpointerup = stop;
    button.onpointercancel = stop;
    button.onlostpointercapture = stop;
  };

  bindRepeater(up, 1);
  bindRepeater(down, -1);
};

// -----------------------------------------------------------------------------
// PREDICTABLE TIERS ACROSS ALL FIVE SOURCE MOVIES
// -----------------------------------------------------------------------------

function v35TierDistribution(total) {
  if (total <= 0) return { S: 0, A: 0, B: 0, C: 0, D: 0 };

  const weights = { S: 0.1, A: 0.2, B: 0.2, C: 0.3, D: 0.2 };
  const counts = Object.fromEntries(
    Object.entries(weights).map(([tier, weight]) => [
      tier,
      Math.floor(total * weight),
    ]),
  );

  if (total >= 10) counts.S = Math.max(1, counts.S);
  if (total >= 8) counts.A = Math.max(2, counts.A);

  let assigned = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const order = ["C", "A", "B", "D", "S"];

  while (assigned < total) {
    counts[order[assigned % order.length]] += 1;
    assigned += 1;
  }

  while (assigned > total) {
    const tier = ["C", "D", "B", "A", "S"].find((name) => counts[name] > 0);
    if (!tier) break;
    counts[tier] -= 1;
    assigned -= 1;
  }

  return counts;
}

v34AssignPoolTiers = function v35AssignPoolTiers(slot) {
  v35EnsureState();
  const pools = S.sourcePools?.[slot] || [];
  const unique = new Map();

  for (const entry of pools) {
    for (const candidate of entry.people || []) {
      const score = stableTierScore(candidate, slot);
      const current = unique.get(candidate.id);
      if (!current || score > current.score)
        unique.set(candidate.id, { candidate, score });
    }
  }

  const candidates = [...unique.values()].sort((a, b) => b.score - a.score);
  const counts = v35TierDistribution(candidates.length);
  const remaining = { ...counts };
  const assignment = {};

  // Each source movie receives a visible premium option before the remaining
  // global quota is filled. The strongest film champion receives S when room
  // exists; the other champions receive A whenever possible.
  const champions = pools
    .map((entry, filmIndex) => {
      const candidate = (entry.people || [])
        .slice()
        .sort((a, b) => stableTierScore(b, slot) - stableTierScore(a, slot))
        .find((personValue) => !assignment[personValue.id]);
      return candidate
        ? { candidate, filmIndex, score: stableTierScore(candidate, slot) }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  champions.forEach((champion, index) => {
    let tier =
      index === 0 && remaining.S > 0 ? "S" : remaining.A > 0 ? "A" : null;
    if (!tier) tier = remaining.B > 0 ? "B" : remaining.C > 0 ? "C" : "D";
    assignment[champion.candidate.id] = tier;
    remaining[tier] = Math.max(0, remaining[tier] - 1);
  });

  const tierOrder = ["S", "A", "B", "C", "D"];
  for (const { candidate } of candidates) {
    if (assignment[candidate.id]) continue;
    const tier = tierOrder.find((name) => remaining[name] > 0) || "C";
    assignment[candidate.id] = tier;
    remaining[tier] = Math.max(0, remaining[tier] - 1);
  }

  S.arcade.poolTierAssignments[slot] = assignment;
  S.arcade.poolTierVersion[slot] = V35_TIER_VERSION;
  S.tierCache[slot] = {};

  for (const entry of pools) {
    entry.people = (entry.people || []).slice().sort((a, b) => {
      const tierDifference =
        TIER_ORDER[assignment[b.id] || "D"] -
        TIER_ORDER[assignment[a.id] || "D"];
      return (
        tierDifference || stableTierScore(b, slot) - stableTierScore(a, slot)
      );
    });
  }
};

const V35_BASE_TALENT_TIER = baseTalentTier;
baseTalentTier = function v35BaseTalentTier(p, slot) {
  const assigned = S.arcade?.poolTierAssignments?.[slot]?.[p?.id];
  return assigned || V35_BASE_TALENT_TIER(p, slot);
};

const V35_TALENT_TIER_FALLBACK = talentTier;
talentTier = function v35TalentTier(p, slot) {
  const assigned = S.arcade?.poolTierAssignments?.[slot]?.[p?.id];
  if (!assigned) return V35_TALENT_TIER_FALLBACK(p, slot);
  const audition = v24AuditionFor?.(slot, p.id) || null;
  return audition ? moveTier(assigned, auditionTierShift(audition)) : assigned;
};

v32TalentTier = function v35FeeTier(p, slot) {
  return talentTier(p, slot);
};

// -----------------------------------------------------------------------------
// SOURCE-CAST MOVIE SELECTOR — ACTIVE HERO + FOUR-FILM REEL
// -----------------------------------------------------------------------------

function v38OfflineFilmArt(film, image) {
  if (image) {
    return `style="--v36-source-art:url('${image}')"`;
  }
  const hue = hash(`${film?.id}|${film?.title}`) % 360;
  const mark = String(film?.title || "GL")
    .split(/\s+/)
    .filter((word) => !/^(the|a|an|of|and)$/i.test(word))
    .map((word) => word[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return `data-v38-offline-art data-banner-mark="${arcadeEsc(mark || "GL")}" style="--v38-banner-hue:${hue}"`;
}

v30RenderDraftMosaic = function v35RenderSourceMovies(pools, selectedIndex) {
  if (!pools?.length) {
    return '<div class="callout">No source movies are available.</div>';
  }

  const activeIndex = clamp(
    safe(selectedIndex),
    0,
    Math.max(0, pools.length - 1),
  );
  const activeFilm = pools[activeIndex].film;
  const mostPopular = pools
    .slice()
    .sort((a, b) => safe(b.film.popularity) - safe(a.film.popularity))[0]
    ?.film.id;
  const activeImage = activeFilm.backdrop || activeFilm.poster;

  const hero = `
    <section
      class="v36SourceHero"
      ${v38OfflineFilmArt(activeFilm, activeImage)}
      aria-label="Current draft film: ${arcadeEsc(activeFilm.title)}"
    >
      <span class="v36SourceShade"></span>
      <div class="v36SourceHeroCopy">
        <span class="v36SourceBadges">
          <small>Current draft film</small>
          ${activeFilm.id === mostPopular ? "<em>Most popular</em>" : ""}
          <em>${arcadeEsc(v30SourceArchetypeLabel(pools[activeIndex]))}</em>
          <em>${arcadeEsc(v31MovieIdentity(activeFilm))}</em>
        </span>
        <h2>${arcadeEsc(activeFilm.title)}</h2>
        <p class="v36SourceMeta">
          <span>${activeFilm.year || "—"}</span>
          <span>${arcadeEsc(activeFilm.genre || S.project.genre)}</span>
          <strong>★ ${safe(activeFilm.rating).toFixed(1)}</strong>
        </p>
        <p class="v36SourceOverview">${arcadeEsc(activeFilm.overview || "Choose performers from this movie's source cast.")}</p>
      </div>
    </section>
  `;

  const reel = pools
    .map((entry, sourceIndex) => ({ entry, sourceIndex }))
    .filter(({ sourceIndex }) => sourceIndex !== activeIndex)
    .map(({ entry, sourceIndex }) => {
      const film = entry.film;
      const image = film.backdrop || film.poster;
      return `
        <button
          class="v36SourceReelCard"
          data-source="${sourceIndex}"
          ${v38OfflineFilmArt(film, image)}
          title="Make ${arcadeEsc(film.title)} the active draft film"
        >
          <span class="v36SourceShade"></span>
          ${film.id === mostPopular ? '<span class="v36SourceRibbon">Most popular</span>' : ""}
          <span class="v36SourceReelCopy">
            <small>${arcadeEsc(v30SourceArchetypeLabel(entry))}</small>
            <b>${arcadeEsc(film.title)}</b>
            <span>${film.year || "—"} · ${arcadeEsc(film.genre || S.project.genre)} · <strong>★ ${safe(film.rating).toFixed(1)}</strong></span>
          </span>
        </button>
      `;
    })
    .join("");

  return `${hero}<div class="v36SourceReel" aria-label="Other source movies">${reel}</div>`;
};

const V35_HIRE_PAGE_BASE = ACTIVE_HIRE_PAGE_V32;
const ACTIVE_HIRE_PAGE_V35 = async function v35HirePage() {
  v35EnsureState();
  const renderId = ACTIVE_RENDER_ID;
  const slot = ARCADE_ACTOR_SLOTS.includes(S.activeSlot)
    ? S.activeSlot
    : ARCADE_ACTOR_SLOTS[0];

  if (
    S.sourcePools?.[slot]?.length &&
    S.arcade.poolTierVersion?.[slot] !== V35_TIER_VERSION
  ) {
    v35AssignPoolTiers(slot);
  }

  await V35_HIRE_PAGE_BASE();
  if (
    renderId !== ACTIVE_RENDER_ID ||
    S.screen !== 1 ||
    S.activeSlot !== slot
  )
    return;

  const grid = document.querySelector(".v30MovieDraftGrid");
  const pools = S.sourcePools?.[slot] || [];
  if (grid) grid.classList.add("v35SourceMovieGrid");
  document.querySelector(".v30SelectedFilm")?.remove();

  $$("[data-source]").forEach((button) => {
    button.onclick = null;
  });
  if (grid) {
    grid.onclick = (event) => {
      const button = event.target.closest("[data-source]");
      if (!button) return;
      const sourceIndex = Number(button.dataset.source);
      if (!Number.isInteger(sourceIndex) || !pools[sourceIndex]) return;
      S.sourceIndex[slot] = sourceIndex;
      v30TrackDraftSelection(slot, sourceIndex);
      S.tierCache[slot] = {};
      grid.innerHTML = v30RenderDraftMosaic(pools, sourceIndex);
      render();
    };
  }

  // The portrait is now a direct, accessible hire target.
  $$(".arcadeActorCard .arcadeActorImage").forEach((image) => {
    const card = image.closest(".arcadeActorCard");
    const hireButton = card?.querySelector("[data-hire]");
    if (!hireButton) return;
    image.classList.add("v35HirePortrait");
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute(
      "aria-label",
      `Hire ${card.querySelector("h3")?.textContent || "actor"}`,
    );
    image.onclick = (event) => {
      if (event.target.closest("[data-load-photo]")) return;
      hireButton.click();
    };
    image.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        hireButton.click();
      }
    };
  });

  $$("[data-hire]").forEach((button) => {
    const previous = button.onclick;
    button.onclick = (event) => {
      const candidate = person(button.dataset.hire);
      v35PushStoryEvent(`cast:${slot}`, {
        chapter: "Casting",
        icon: "🎭",
        tone: "good",
        title: `${candidate?.name || "A performer"} joins the cast`,
        text: `${candidate?.name || "The performer"} is hired for ${arcadeOriginalForSlot(slot)?.character || roleName(slot) || slot}.`,
      });
      previous?.(event);
    };
  });

  const visiblePool = pools[S.sourceIndex?.[slot] || 0]?.people || [];
  v38BindActorPortraitControls(visiblePool);
  v31BindReportControls();
};

// -----------------------------------------------------------------------------
// CAREER-DERIVED COMPOSER AND CINEMATOGRAPHER STYLE PROFILES
// -----------------------------------------------------------------------------

function v35TopCareerGenres(p) {
  return Object.entries(p?.fit || {})
    .sort((a, b) => safe(b[1]) - safe(a[1]))
    .slice(0, 3)
    .map(([genre]) => genre);
}

function v35StyleProfile(p, kind) {
  const genres = v35TopCareerGenres(p);
  const has = (...values) => values.some((value) => genres.includes(value));

  if (kind === "composer") {
    if (has("Horror", "Thriller", "Mystery", "Crime")) {
      return {
        name: "Tension & Texture",
        packageId: "industrial-minimal",
        emphasis: "Atmosphere",
        icon: "⚙️",
      };
    }
    if (has("Animation", "Family", "Fantasy", "Romance")) {
      return {
        name: "Melodic Wonder",
        packageId: "melodic-fantasy",
        emphasis: "Character Themes",
        icon: "🌱",
      };
    }
    if (has("Action", "Sci-Fi", "War")) {
      return {
        name: "Pulse & Scale",
        packageId: "pulse-electronic",
        emphasis: "Action Drive",
        icon: "🥁",
      };
    }
    if (has("Comedy", "Adventure", "Music")) {
      return {
        name: "Whimsical Momentum",
        packageId: "whimsical-adventure",
        emphasis: "Emotion",
        icon: "🪁",
      };
    }
    return {
      name: "Emotional Themes",
      packageId: "heroic-orchestra",
      emphasis: "Emotion",
      icon: "🎺",
    };
  }

  if (has("Horror", "Thriller", "Mystery")) {
    return {
      name: "Shadow & Subjectivity",
      packageId: "handheld-intimacy",
      emphasis: "Subjective Camera",
      icon: "👁️",
    };
  }
  if (has("Action", "Sci-Fi", "War")) {
    return {
      name: "Large-Format Spectacle",
      packageId: "large-format",
      emphasis: "Large Format",
      icon: "🎞️",
    };
  }
  if (has("Fantasy", "Adventure", "Animation", "Family")) {
    return {
      name: "Luminous Worlds",
      packageId: "landscape-natural",
      emphasis: "Natural Light",
      icon: "🌄",
    };
  }
  if (has("Crime", "Music")) {
    return {
      name: "Graphic Contrast",
      packageId: "neon-graphic",
      emphasis: "Graphic Composition",
      icon: "🌃",
    };
  }
  if (has("Documentary", "Drama", "Romance")) {
    return {
      name: "Natural Intimacy",
      packageId: "long-take-natural",
      emphasis: "Long Takes",
      icon: "☀️",
    };
  }
  return {
    name: "Classical Clarity",
    packageId: "warm-classic",
    emphasis: "Graphic Composition",
    icon: "🕯️",
  };
}

function v35CrewTier(p, kind) {
  const attrs = adjusted(p, v31StyleCrewSlot(kind));
  const score =
    attrs.craft * 0.52 + attrs.reliability * 0.25 + attrs.fit * 0.23;
  return v38TierFromScore(score);
}

function v36SeededShuffle(values, random) {
  const output = values.slice();
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function v36CreativeDuoFit(composer, cinematographer) {
  if (!composer || !cinematographer) return 0;
  const composerAttrs = adjusted(composer, v31StyleCrewSlot("composer"));
  const cameraAttrs = adjusted(
    cinematographer,
    v31StyleCrewSlot("cinematographer"),
  );
  const composerGenres = new Set(v35TopCareerGenres(composer));
  const cameraGenres = new Set(v35TopCareerGenres(cinematographer));
  const allGenres = new Set([...composerGenres, ...cameraGenres]);
  const overlap = [...composerGenres].filter((genre) => cameraGenres.has(genre));
  const overlapScore = allGenres.size ? overlap.length / allGenres.size : 0;
  const composerProfile = v35StyleProfile(composer, "composer");
  const cameraProfile = v35StyleProfile(cinematographer, "cinematographer");
  const strongPairs = new Set([
    "pulse-electronic|large-format",
    "industrial-minimal|handheld-intimacy",
    "melodic-fantasy|landscape-natural",
    "heroic-orchestra|long-take-natural",
    "whimsical-adventure|warm-classic",
  ]);
  const styleBonus = strongPairs.has(
    `${composerProfile.packageId}|${cameraProfile.packageId}`,
  )
    ? 5
    : 1;

  return Math.round(
    clamp(
      (composerAttrs.fit + cameraAttrs.fit) * 0.34 +
        (composerAttrs.reliability + cameraAttrs.reliability) * 0.07 +
        (composerAttrs.craft + cameraAttrs.craft) * 0.04 +
        overlapScore * 14 +
        styleBonus,
      0,
      100,
    ),
  );
}

function v36CreativeDuoName(composer, cinematographer) {
  const composerProfile = v35StyleProfile(composer, "composer");
  const cameraProfile = v35StyleProfile(cinematographer, "cinematographer");
  const key = `${composerProfile.packageId}|${cameraProfile.packageId}`;
  const names = {
    "pulse-electronic|large-format": "Epic Worldbuilding",
    "industrial-minimal|handheld-intimacy": "Intimate Unease",
    "melodic-fantasy|landscape-natural": "Storybook Wonder",
    "heroic-orchestra|long-take-natural": "Operatic Intimacy",
    "whimsical-adventure|warm-classic": "Playful Classicism",
    "industrial-minimal|neon-graphic": "Graphic Tension",
    "pulse-electronic|neon-graphic": "Electric Momentum",
  };
  return names[key] || `${composerProfile.name} & ${cameraProfile.name}`;
}

function v36BuildCreativeDuoPackages(
  composerIds,
  cinematographerIds,
  roll = 0,
) {
  ensureSeed();
  const random = rng(`creative-duos-${safe(roll)}`);
  const composers = (composerIds || []).map(person).filter(Boolean);
  const cinematographers = (cinematographerIds || [])
    .map(person)
    .filter(Boolean);
  if (composers.length < 3 || cinematographers.length < 3) return [];

  const rankedComposers = v36SeededShuffle(composers, random)
    .map((candidate) => ({
      candidate,
      score:
        adjusted(candidate, v31StyleCrewSlot("composer")).fit + random() * 18,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.candidate);
  const remainingCameras = v36SeededShuffle(cinematographers, random);

  return rankedComposers.map((composer, index) => {
    const cameraOptions = remainingCameras
      .map((candidate) => ({
        candidate,
        score: v36CreativeDuoFit(composer, candidate) + random() * 12,
      }))
      .sort((a, b) => b.score - a.score);
    const cinematographer = cameraOptions[0].candidate;
    remainingCameras.splice(remainingCameras.indexOf(cinematographer), 1);
    return {
      id: `duo-${safe(roll)}-${hash(`${composer.id}|${cinematographer.id}`).toString(36)}`,
      composerId: composer.id,
      cinematographerId: cinematographer.id,
      fit: v36CreativeDuoFit(composer, cinematographer),
      name: v36CreativeDuoName(composer, cinematographer),
      order: index,
    };
  });
}

function v36EnsureCreativeDuoPackages() {
  const crew = S.arcade.styleCrew;
  if (!crew.loaded) return crew.duoPackages;
  if (crew.duoPackages.length < 3) {
    crew.duoPackages = v36BuildCreativeDuoPackages(
      crew.composerPool,
      crew.cinematographerPool,
      crew.duoRoll,
    );
  }
  if (!crew.duoSelectedId && crew.composerId && crew.cinematographerId) {
    crew.duoSelectedId =
      crew.duoPackages.find(
        (pkg) =>
          pkg.composerId === crew.composerId &&
          pkg.cinematographerId === crew.cinematographerId,
      )?.id || null;
  }
  if (
    crew.duoSelectedId &&
    !crew.duoPackages.some((pkg) => pkg.id === crew.duoSelectedId)
  ) {
    crew.duoSelectedId = null;
    crew.composerId = null;
    crew.cinematographerId = null;
  }
  return crew.duoPackages;
}

function v36CreativeDuoFee(pkg) {
  const composer = person(pkg?.composerId);
  const cinematographer = person(pkg?.cinematographerId);
  return (
    v32PersonFee(composer, v31StyleCrewSlot("composer")) * 0.58 +
    v32PersonFee(cinematographer, v31StyleCrewSlot("cinematographer")) * 0.62
  );
}

function v36ArtistCareerText(p) {
  return (p?.eraKnownProjects || p?.known || [])
    .slice(0, 2)
    .map((credit) => (typeof credit === "string" ? credit : credit.title))
    .filter(Boolean)
    .join(" · ");
}

function v36CreativeDuoCard(pkg, selectedId) {
  const composer = person(pkg.composerId);
  const cinematographer = person(pkg.cinematographerId);
  if (!composer || !cinematographer) return "";
  const selected = pkg.id === selectedId;
  const composerProfile = v35StyleProfile(composer, "composer");
  const cameraProfile = v35StyleProfile(cinematographer, "cinematographer");
  const composerTier = v35CrewTier(composer, "composer");
  const cameraTier = v35CrewTier(cinematographer, "cinematographer");
  const composerCredits = v36ArtistCareerText(composer);
  const cameraCredits = v36ArtistCareerText(cinematographer);

  const artistRow = (p, kind, profile, tier, credits) => `
    <span class="v36DuoArtist">
      ${
        p.photo
          ? `<img src="${p.photo}" alt="${arcadeEsc(p.name)}">`
          : '<span class="arcadeCrewFallback">GL</span>'
      }
      <span class="v36DuoArtistCopy">
        <small>${kind === "composer" ? "Composer" : "Cinematographer"}</small>
        <b>${arcadeEsc(p.name)}</b>
        <em>${profile.icon} ${arcadeEsc(profile.name)}</em>
        <span>${arcadeEsc(credits || profile.emphasis)}</span>
      </span>
      <strong class="tier ${tier}">${tier}</strong>
    </span>
  `;

  return `
    <button
      class="v36DuoCard ${selected ? "selected" : ""}"
      data-duo-package="${arcadeEsc(pkg.id)}"
      aria-pressed="${selected}"
    >
      <span class="v36DuoHead">
        <span><small>Creative package</small><b>${arcadeEsc(pkg.name)}</b></span>
        <strong>${Math.round(pkg.fit)}% fit</strong>
      </span>
      ${artistRow(composer, "composer", composerProfile, composerTier, composerCredits)}
      ${artistRow(
        cinematographer,
        "cinematographer",
        cameraProfile,
        cameraTier,
        cameraCredits,
      )}
      <span class="v36DuoMeta">
        <em>${arcadeEsc(composerProfile.emphasis)}</em>
        <em>${arcadeEsc(cameraProfile.emphasis)}</em>
        <em>Package fee ${moneyM(v36CreativeDuoFee(pkg))}</em>
      </span>
      <span class="v36DuoChoose">${selected ? "Selected duo" : "Choose this duo"}</span>
    </button>
  `;
}

function v36SelectCreativeDuo(pkg) {
  if (!pkg) return;
  const crew = S.arcade.styleCrew;
  const composer = person(pkg.composerId);
  const cinematographer = person(pkg.cinematographerId);
  if (!composer || !cinematographer) return;
  crew.duoSelectedId = pkg.id;
  crew.composerId = composer.id;
  crew.cinematographerId = cinematographer.id;
  v35ApplyAttachedStyle("composer", composer);
  v35ApplyAttachedStyle("cinematographer", cinematographer);
  v35PushStoryEvent("artist:duo", {
    chapter: "Creative Direction",
    icon: "🎼",
    tone: "good",
    title: `${composer.name} and ${cinematographer.name} join the film`,
    text: `${pkg.name} pairs ${v35StyleProfile(composer, "composer").name.toLowerCase()} music with ${v35StyleProfile(cinematographer, "cinematographer").name.toLowerCase()} cinematography.`,
  });
}

function v35ApplyAttachedStyle(kind, p) {
  if (!p) return;
  const profile = v35StyleProfile(p, kind);
  S.arcade.styleCrewProfiles[kind] = profile;
  if (kind === "composer") {
    S.arcade.style.composerId = profile.packageId;
    S.arcade.style.musicEmphasis = profile.emphasis;
  } else {
    S.arcade.style.cameraId = profile.packageId;
    S.arcade.style.visualEmphasis = profile.emphasis;
  }
}

function v38LedgerContext() {
  const packageBudget = v32PackageBudget();
  return {
    direction: S.arcade?.creativeDirection,
    marketing: S.arcade?.marketingStrategy || S.arcade?.marketingLabel,
    talentOverageM: Math.max(0, -safe(packageBudget?.remaining)),
  };
}

function v38LedgerSummaryMarkup(title = "Studio thesis") {
  if (!V38_LEDGER) return "";
  v35EnsureState();
  const dilemmas = V38_LEDGER.activeDilemmas(S.arcade.decisionLedger);
  const summary = V38_LEDGER.summary(S.arcade.decisionLedger, v38LedgerContext());
  const completed = V38_LEDGER.completed(S.arcade.decisionLedger);
  const latestCall = V38_LEDGER.choiceResults(S.arcade.decisionLedger).at(-1);
  return `
    <section class="v38LedgerSummary">
      <div class="v38LedgerSummaryHead">
        <div><span class="mini">Decision Ledger</span><h2>${arcadeEsc(title)}</h2><p>This production is betting on <b>${arcadeEsc(summary.thesis)}</b>.</p></div>
        <strong>${completed}/${dilemmas.length} decisions</strong>
      </div>
      ${
        latestCall
          ? `<div class="v38StudioPulse"><span>Studio pulse · ${arcadeEsc(latestCall.chapter)}</span><b>${arcadeEsc(latestCall.title)}</b><p>${arcadeEsc(latestCall.consequence)}</p></div>`
          : '<div class="v38StudioPulse waiting"><span>Studio pulse</span><b>The production desk is waiting.</b><p>Your first call will begin shaping the film\'s internal story.</p></div>'
      }
      <div class="v38LedgerDimensions">
        ${summary.ranked
          .map(([key, value]) => {
            const dimension = V38_LEDGER.DIMENSIONS[key];
            const width = clamp(50 + value * 7, 8, 92);
            return `<div><span>${arcadeEsc(dimension.label)}</span><i><b style="width:${width}%;--ledger-color:${dimension.color}"></b></i><strong class="${value >= 0 ? "positive" : "negative"}">${value > 0 ? "+" : ""}${value}</strong></div>`;
          })
          .join("")}
      </div>
    </section>
  `;
}

function v38DecisionStudioMarkup() {
  if (!V38_LEDGER) return "";
  v35EnsureState();
  const dilemmas = V38_LEDGER.activeDilemmas(S.arcade.decisionLedger);
  return `
    <section class="v38DecisionStudio">
      <header><span class="mini">Production desk</span><h1>Make the calls that define the movie.</h1><p>Every decision writes a promise into the final result. This run drew three calls from a ${V38_LEDGER.backlogSize}-scenario production backlog.</p></header>
      ${v38LedgerSummaryMarkup("Current studio thesis")}
      <div class="v38DilemmaGrid">
        ${dilemmas.map((entry, index) => {
          const selected = V38_LEDGER.selectedChoice(S.arcade.decisionLedger, entry.id);
          return `<article class="v38Dilemma ${selected ? "resolved" : ""}">
            <div class="v38DilemmaNumber">0${index + 1}</div>
            <span class="mini">${arcadeEsc(entry.chapter)}</span>
            <h3>${arcadeEsc(entry.title)}</h3>
            <p>${arcadeEsc(entry.text)}</p>
            <div class="v38DilemmaChoices">
              ${entry.choices
                .map(
                  (choice) => `<button class="${selected?.id === choice.id ? "selected" : ""}" data-v38-dilemma="${entry.id}" data-v38-choice="${choice.id}"><b>${arcadeEsc(choice.label)}</b><span>${arcadeEsc(choice.detail)}</span></button>`,
                )
                .join("")}
            </div>
            ${selected ? `<div class="v38Consequence"><b>Locked consequence</b><span>${arcadeEsc(selected.consequence)}</span></div>` : '<div class="v38Consequence pending">Choose one production response.</div>'}
          </article>`;
        }).join("")}
      </div>
    </section>
  `;
}

function v38BindDecisionStudio() {
  if (!V38_LEDGER) return;
  const dilemmas = V38_LEDGER.activeDilemmas(S.arcade.decisionLedger);
  $$('[data-v38-dilemma]').forEach((button) => {
    button.onclick = () => {
      const entry = dilemmas.find(
        (candidate) => candidate.id === button.dataset.v38Dilemma,
      );
      const choice = entry?.choices.find(
        (candidate) => candidate.id === button.dataset.v38Choice,
      );
      if (!entry || !choice) return;
      S.arcade.decisionLedger = V38_LEDGER.choose(
        S.arcade.decisionLedger,
        entry.id,
        choice.id,
      );
      v35PushStoryEvent(`decision:${entry.id}`, {
        chapter: entry.chapter,
        icon: "◆",
        tone: Object.values(choice.deltas).some((value) => value < 0)
          ? "neutral"
          : "good",
        title: choice.label,
        text: choice.consequence,
      });
      render();
    };
  });
}

const V35_PRODUCTION_PAGE_BASE = ACTIVE_PRODUCTION_PAGE_V31;
const ACTIVE_PRODUCTION_PAGE_V35 = function v35ProductionPage() {
  v35EnsureState();
  V35_PRODUCTION_PAGE_BASE();
  v31EnsureStyleCrewPools();

  const board = document.querySelector(".arcadeCreativeBoard");
  if (!board) return;

  const crew = S.arcade.styleCrew;
  const packages = v36EnsureCreativeDuoPackages();

  if (crew.composerId)
    v35ApplyAttachedStyle("composer", person(crew.composerId));
  if (crew.cinematographerId) {
    v35ApplyAttachedStyle("cinematographer", person(crew.cinematographerId));
  }

  board.innerHTML = `
    <header class="v35ArtistsHeader">
      <span class="mini">Style Studio</span>
      <h1>Draft a creative duo.</h1>
      <p>Each package pairs one real composer with one real cinematographer. Career genres, past films, reliability, and project fit shape the match.</p>
    </header>

    <div class="v36DuoToolbar">
      <span>Three complete packages · one composer + one cinematographer</span>
      <button class="btn" id="v36RerollDuos" ${crew.duoRerollUsed || packages.length < 3 ? "disabled" : ""}>
        ${crew.duoRerollUsed ? "Reroll used" : "Reroll all once"}
      </button>
    </div>

    ${
      crew.loadError
        ? `<div class="callout bad"><b>Creative duos could not load.</b><div class="sub">${arcadeEsc(crew.loadError)}</div><button class="btn" id="v35RetryStyleCrew">Retry scouting</button></div>`
        : ""
    }

    ${
      crew.loading && !packages.length
        ? `<div class="v36DuoLoading">
            ${Array.from({ length: 3 }, () => '<span class="v36DuoSkeleton"><i></i><i></i><i></i></span>').join("")}
            <p>Scouting real credits and building three career-matched partnerships…</p>
          </div>`
        : `<div class="v36DuoGrid">
            ${
              packages
                .map((pkg) => v36CreativeDuoCard(pkg, crew.duoSelectedId))
                .join("") ||
              (crew.loadError
                ? ""
                : '<div class="callout">No complete creative-duo draft is available.</div>')
            }
          </div>`
    }
  `;

  board.insertAdjacentHTML("afterend", v38DecisionStudioMarkup());
  v38BindDecisionStudio();

  $$("[data-duo-package]").forEach((button) => {
    button.onclick = () => {
      const pkg = crew.duoPackages.find(
        (candidate) => candidate.id === button.dataset.duoPackage,
      );
      v36SelectCreativeDuo(pkg);
      render();
    };
  });

  if ($("#v36RerollDuos")) {
    $("#v36RerollDuos").onclick = () => {
      if (crew.duoRerollUsed || packages.length < 3) return;
      crew.duoRerollUsed = true;
      crew.duoRoll += 1;
      crew.duoPackages = v36BuildCreativeDuoPackages(
        crew.composerPool,
        crew.cinematographerPool,
        crew.duoRoll,
      );
      v38RecordStyleRollTelemetry(
        crew.composerPool.map(person).filter(Boolean),
        crew.cinematographerPool.map(person).filter(Boolean),
        crew.duoPackages,
      );
      crew.duoSelectedId = null;
      crew.composerId = null;
      crew.cinematographerId = null;
      delete S.arcade.styleCrewProfiles.composer;
      delete S.arcade.styleCrewProfiles.cinematographer;
      S.arcade.style = {
        ...S.arcade.style,
        composerId: null,
        cameraId: null,
        musicEmphasis: null,
        visualEmphasis: null,
      };
      render();
    };
  }

  if ($("#v35RetryStyleCrew")) {
    $("#v35RetryStyleCrew").onclick = () => {
      crew.loadError = null;
      v31EnsureStyleCrewPools(true);
      render();
    };
  }

  const next = $("#toMarketing");
  if (next) {
    next.disabled = !(
      arcadeCrewReady() &&
      crew.composerId &&
      crew.cinematographerId &&
      (!V38_LEDGER || V38_LEDGER.isComplete(S.arcade.decisionLedger))
    );
  }
};

// -----------------------------------------------------------------------------
// COMPLETE PROJECT STORY LOG
// -----------------------------------------------------------------------------

v27BuildPreReleaseStory = function v35BuildPreReleaseStory(sim) {
  v35EnsureState();
  const entries = [];
  const releaseYear = v28ReleaseYear();
  const secondary = S.arcade.secondaryGenre;
  const strategy = v27ReleaseStrategy();
  const packageBudget = v32PackageBudget();

  entries.push(
    v27StoryEntry(
      "The Pitch",
      S.reference?.custom
        ? "An original movie enters development"
        : "A familiar movie is rebuilt",
      `${S.project.title} is positioned as ${S.project.genre}${secondary ? ` / ${secondary}` : ""} for ${S.project.month} ${releaseYear}.`,
      "neutral",
      "💡",
    ),
  );

  entries.push(
    v27StoryEntry(
      "Release Strategy",
      strategy.env.label,
      `Demand is ${strategy.env.demand >= 1.08 ? "strong" : strategy.env.demand < 0.95 ? "soft" : "steady"}; competition is ${strategy.env.competition >= 1.18 ? "crowded" : strategy.env.competition < 0.88 ? "light" : "moderate"}.`,
      "neutral",
      "🗓️",
    ),
  );

  for (const slot of ARCADE_ACTOR_SLOTS) {
    const actor = person(S.roster[slot]);
    if (!actor) continue;
    const cameo = v30CameoForSlot(slot, actor);
    const role =
      cameo?.character ||
      arcadeOriginalForSlot(slot)?.character ||
      roleName(slot) ||
      slot;
    entries.push(
      v27StoryEntry(
        "Casting",
        cameo
          ? `${actor.name} becomes a cameo event`
          : `${actor.name} is cast as ${role}`,
        cameo
          ? `${actor.name} appears as ${cameo.character} from ${cameo.title}, replacing normal age and gender fit rules with nostalgia risk.`
          : `${actor.name} arrives from ${actor.sourceMovieTitle || "their source film"} at age ${v25CastingAge(actor, slot) ?? "unknown"}.`,
        "good",
        cameo ? "✨" : "🎭",
      ),
    );
  }

  const directors = (S.arcade.crew?.selectedDirectors || [])
    .map(person)
    .filter(Boolean);
  const writers = (S.arcade.crew?.selectedWriters || [])
    .map(person)
    .filter(Boolean);
  if (directors.length || writers.length) {
    entries.push(
      v27StoryEntry(
        "The Package",
        "The creative leadership locks",
        `${directors.map((p) => p.name).join(" & ") || "No director"} directs; ${writers.map((p) => p.name).join(" & ") || "no writer"} shapes the screenplay.`,
        "good",
        "🎬",
      ),
    );
  }

  const composer = person(S.arcade.styleCrew?.composerId);
  const cinematographer = person(S.arcade.styleCrew?.cinematographerId);
  if (composer || cinematographer) {
    entries.push(
      v27StoryEntry(
        "Creative Direction",
        "The movie finds its sound and image",
        `${composer ? `${composer.name} supplies ${v35StyleProfile(composer, "composer").name.toLowerCase()}` : "The score remains undecided"}; ${cinematographer ? `${cinematographer.name} brings ${v35StyleProfile(cinematographer, "cinematographer").name.toLowerCase()}` : "the camera package remains undecided"}.`,
        "good",
        "🎨",
      ),
    );
  }

  entries.push(
    v27StoryEntry(
      "The Budget",
      packageBudget.remaining >= 0
        ? "The package stays controlled"
        : "The package makes a bet",
      packageBudget.remaining >= 0
        ? `${moneyM(packageBudget.remaining)} remains in the talent target after the current cast and crew package.`
        : `The talent package runs ${moneyM(Math.abs(packageBudget.remaining))} above target, raising the break-even point.`,
      packageBudget.remaining >= 0 ? "good" : "bad",
      "💵",
    ),
  );

  const campaign =
    S.arcade.marketingStrategy || S.arcade.marketingLabel || S.marketing;
  entries.push(
    v27StoryEntry(
      "Campaign",
      campaign || "The marketing plan locks",
      `The campaign is designed around ${S.project.genre.toLowerCase()} audiences and the film's current cast, release window and budget pressure.`,
      "neutral",
      "📣",
    ),
  );

  for (const event of S.arcade.storyEvents || []) {
    if (!entries.some((entry) => entry.title === event.title)) {
      entries.push(
        v27StoryEntry(
          event.chapter || "Development",
          event.title,
          event.text,
          event.tone || "neutral",
          event.icon || "•",
        ),
      );
    }
  }

  return entries.filter((entry) => entry?.title).slice(0, 16);
};

const V38_ESTIMATED_RIVAL_TITLES = Object.freeze([
  "Glass Harbor",
  "Northstar",
  "The Last Meridian",
  "Midnight Assembly",
  "Signal Fire",
  "The Long Return",
  "Red Horizon",
  "Second Kingdom",
  "After the Flood",
  "Gravity House",
  "The Quiet Engine",
  "Blackwater Line",
  "Wild Current",
  "The Golden Hour",
  "Borrowed Time",
  "City of Echoes",
  "The Far Shore",
  "Paper Crown",
  "Open Sky",
  "The Ninth Door",
  "Blue Divide",
  "Winter Road",
  "Bright Ruin",
  "The Memory Atlas",
]);

function v38YearLeaderboard(simulation) {
  const releaseYear = v28ReleaseYear();
  const referenceTitle = String(S.reference?.title || "").toLowerCase();
  const seen = new Set();
  const reported = [];

  for (const movie of S.competition || []) {
    const title = String(movie?.title || "").trim();
    const key = title.toLowerCase();
    if (
      !title ||
      !safe(movie?.revenueM) ||
      key === referenceTitle ||
      seen.has(key)
    )
      continue;
    seen.add(key);
    reported.push({ ...movie, title, estimated: Boolean(movie.estimated) });
  }

  const requiredRivals = Math.max(0, 19 - reported.length);
  const estimated = fallbackCompetition(requiredRivals).map((movie, index) => ({
    ...movie,
    title:
      V38_ESTIMATED_RIVAL_TITLES[
        (hash(`${S.runSeed}|leaderboard-titles`) + index) %
          V38_ESTIMATED_RIVAL_TITLES.length
      ],
    estimated: true,
  }));
  const player = {
    id: "player",
    title: S.project.title,
    revenueM: safe(simulation?.world),
    player: true,
    estimated: false,
  };
  const ranked = [...reported.slice(0, 19), ...estimated, player]
    .sort((first, second) => safe(second.revenueM) - safe(first.revenueM))
    .map((movie, index) => ({ ...movie, rank: index + 1 }));
  const playerRow = ranked.find((movie) => movie.player);
  const topTen = ranked.slice(0, 10);

  return {
    releaseYear,
    ranked,
    topTen,
    player: playerRow,
    rank: playerRow?.rank || ranked.length,
    reportedCount: reported.length,
    modeledCount: estimated.length,
  };
}

function v38YearLeaderboardMarkup(simulation) {
  const board = v38YearLeaderboard(simulation);
  const maximum = Math.max(...board.ranked.map((movie) => safe(movie.revenueM)), 1);
  const visibleRows = board.rank <= 10
    ? board.topTen
    : [...board.topTen, { separator: true }, board.player];

  return `
    <section class="v38YearBoard" data-testid="year-box-office">
      <header>
        <div><span class="eyebrow">${board.releaseYear} WORLDWIDE BOX OFFICE</span><h2>Top ten of the year.</h2></div>
        <strong class="v38PlayerRank">Your film: #${board.rank}</strong>
      </header>
      <div class="v38YearRows">
        ${visibleRows
          .map((movie) => {
            if (movie.separator) {
              return '<div class="v38RankSeparator"><span>Outside the top ten</span></div>';
            }
            return `
              <article class="v38YearRow ${movie.player ? "player" : ""}" ${movie.player ? 'data-testid="player-year-rank"' : ""}>
                <span class="v38YearRank">${movie.rank}</span>
                <div class="v38YearTitle"><b>${arcadeEsc(movie.title)}</b><small>${movie.player ? "Your recast" : movie.estimated ? "Modeled rival" : "Reported gross"}</small></div>
                <i><b style="width:${clamp((safe(movie.revenueM) / maximum) * 100)}%"></b></i>
                <strong>${moneyM(movie.revenueM)}</strong>
              </article>
            `;
          })
          .join("")}
      </div>
      <footer>${board.reportedCount} reported rival${board.reportedCount === 1 ? "" : "s"} · ${board.modeledCount} modeled market position${board.modeledCount === 1 ? "" : "s"}. Worldwide grosses are used when the data source provides them.</footer>
    </section>
  `;
}

yearRank = function v38YearRank(simulation) {
  const board = v38YearLeaderboard(simulation);
  return { rows: board.ranked, rank: board.rank, available: true };
};

// -----------------------------------------------------------------------------
// ORIGINAL-MOVIE BENCHMARK ON THE RELEASE GRAPH
// -----------------------------------------------------------------------------

function v35ChartPath(
  values,
  maximum,
  width = 900,
  height = 300,
  padding = 18,
) {
  const max = Math.max(1, maximum);
  return values
    .map((value, index) => {
      const x =
        padding +
        (index * (width - padding * 2)) / Math.max(1, values.length - 1);
      const y = height - padding - (safe(value) / max) * (height - padding * 2);
      return `${index ? "L" : "M"} ${x} ${y}`;
    })
    .join(" ");
}

function v35OriginalPace(run) {
  const originalTotal = safe(S.reference?.revenueM, 0);
  const playerTotal = safe(run.cumulative?.at(-1), 0);
  if (!originalTotal || !playerTotal) return null;
  return run.cumulative.map((value) => originalTotal * (value / playerTotal));
}

function v35RenderRunWeek(run, week) {
  const currentWeek = clamp(week, 0, 51);
  S.arcade.releaseWeekCursor = currentWeek;
  const benchmark = run.originalPace;
  const date = new Date(
    v28ReleaseYear(),
    MONTHS.indexOf(S.project.month),
    12 + currentWeek * 7,
  );

  if ($("#v27Week")) $("#v27Week").textContent = `Week ${currentWeek + 1}`;
  if ($("#v27Date")) {
    $("#v27Date").textContent = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  if ($("#v35PlayerTotal")) {
    $("#v35PlayerTotal").textContent = moneyM(run.cumulative[currentWeek]);
  }
  if ($("#v35OriginalTotal") && benchmark) {
    $("#v35OriginalTotal").textContent = moneyM(benchmark[currentWeek]);
  }
  const marker = $("#v27Marker");
  if (marker) marker.style.left = `${(currentWeek / 51) * 100}%`;
  $$(".v27TurningPoint").forEach((node) => {
    node.classList.toggle("active", +node.dataset.week <= currentWeek);
  });
}

const ACTIVE_RELEASE_PAGE_V35 = function v35ReleasePage() {
  v35EnsureState();
  const sim = S.simulation || simulate();
  S.simulation = sim;
  const run = S.arcade.releaseStory || v27TheatricalRun(sim);
  run.originalPace = v35OriginalPace(run);
  S.arcade.releaseStory = run;
  S.arcade.legacy = v27LegacyFor(sim, run);

  const projection = run.projection;
  const environment = run.strategy.env;
  const originalPace = run.originalPace;
  const maximum = Math.max(...run.cumulative, ...(originalPace || [0]), 1);

  shell(`
    <section class="v27ReleaseHero">
      <div>
        <span class="eyebrow">THE THEATRICAL STORY</span>
        <h1>${arcadeEsc(V27_PROFILE_LABELS[run.profile] || run.profile)}</h1>
        <p>${arcadeEsc(S.project.title)} receives a full 52-week theatrical life beginning in ${arcadeEsc(S.project.month)} ${v28ReleaseYear()}.</p>
      </div>
      <div class="v27RunTotal">
        <span id="v27Date">${arcadeEsc(S.project.month)} ${v28ReleaseYear()}</span>
        <b id="v35PlayerTotal">${moneyM(run.cumulative[0])}</b>
        <small>your cumulative worldwide</small>
      </div>
    </section>

    <div class="v27ExpectationGrid">
      <article><span>Projected opening</span><b>${moneyM(projection.openingLow)}–${moneyM(projection.openingHigh)}</b></article>
      <article><span>Projected lifetime</span><b>${moneyM(projection.grossLow)}–${moneyM(projection.grossHigh)}</b></article>
      <article><span>Forecast confidence</span><b>${projection.confidence}%</b></article>
      <article><span>Release environment</span><b>${arcadeEsc(environment.label)}</b></article>
    </div>

    <section class="v27ChartPanel v35ComparisonChart">
      <div class="v27ChartHead">
        <div><span class="eyebrow">CUMULATIVE 52-WEEK PACE</span><h2 id="v27Week">Week 1</h2></div>
        <div class="v35ChartTotals">
          <span>Your film <b id="v35PlayerTotalHead">${moneyM(run.cumulative[0])}</b></span>
          <span class="benchmark">Original pace <b id="v35OriginalTotal">${originalPace ? moneyM(originalPace[0]) : "Unavailable"}</b></span>
        </div>
      </div>
      <div class="v35ChartLegend">
        <span><i class="player"></i>Your movie</span>
        <span><i class="original"></i>Pace required to match the original</span>
      </div>
      <div class="v27ChartWrap">
        <svg viewBox="0 0 900 300" preserveAspectRatio="none" aria-label="Cumulative box office comparison">
          <defs>
            <linearGradient id="v35fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="currentColor" stop-opacity=".28"/>
              <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="v35PlayerArea" d="${v35ChartPath(run.cumulative, maximum)} L 882 282 L 18 282 Z"/>
          ${originalPace ? `<path class="v35OriginalLine" d="${v35ChartPath(originalPace, maximum)}"/>` : ""}
          <path class="v35PlayerLine" d="${v35ChartPath(run.cumulative, maximum)}"/>
        </svg>
        <div class="v27Marker" id="v27Marker"></div>
      </div>
      <input class="v27WeekSlider" id="v27WeekSlider" type="range" min="0" max="51" value="${safe(S.arcade.releaseWeekCursor, 0)}">
    </section>

    <section class="v27StoryGrid">
      <div>
        <span class="eyebrow">TURNING POINTS</span>
        <h2>The movie changes course.</h2>
        ${run.turning
          .map((turningPoint) => {
            const week = clamp(turningPoint.week, 0, 51);
            return `
              <article class="v27TurningPoint" data-week="${week}">
                <span>${arcadeEsc(turningPoint.icon)}</span>
                <div><small>Week ${week + 1}</small><b>${arcadeEsc(turningPoint.title)}</b><p>${arcadeEsc(turningPoint.text)}</p></div>
              </article>
            `;
          })
          .join("")}
      </div>
      <div>
        ${v38YearLeaderboardMarkup(sim)}
      </div>
    </section>

    <section class="v27ReleaseFooter">
      <div><span class="eyebrow">FINAL OUTLOOK</span><h2>${arcadeEsc(sim.outcome)} · ${moneyM(sim.profit)} profit</h2><p>${arcadeEsc(S.arcade.legacy.icon)} <b>${arcadeEsc(S.arcade.legacy.name)}</b> — ${arcadeEsc(S.arcade.legacy.text)}</p></div>
      <button type="button" class="btn primary v27ResultsBtn" id="v27Results">Open studio results →</button>
    </section>
  `);

  const slider = $("#v27WeekSlider");
  slider.oninput = (event) => {
    v35RenderRunWeek(run, +event.target.value);
    if ($("#v35PlayerTotalHead")) {
      $("#v35PlayerTotalHead").textContent = moneyM(
        run.cumulative[+event.target.value],
      );
    }
  };
  v35RenderRunWeek(run, +slider.value);

  $("#v27Results").onclick = (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Opening results…";
    S.releaseRaceCompleted = true;
    S.endTab = ["results", "why", "awards"].includes(S.endTab)
      ? S.endTab
      : "results";
    S.screen = 5;
    render();
  };
};

// -----------------------------------------------------------------------------
// EXPLICIT CONTRIBUTIONS AND AWARD CATEGORIES
// -----------------------------------------------------------------------------

function v35Signed(value, digits = 1) {
  const number = safe(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function v35PersonImpact(p, slot) {
  const attrs = adjusted(p, slot);
  return {
    craft: (attrs.craft - 55) * 0.12,
    audience: (attrs.draw - 50) * 0.09 + (attrs.fit - 55) * 0.08,
    stability: (attrs.reliability - 55) * 0.08,
    chemistry: (attrs.chemistry - 55) * 0.1,
  };
}

function v35ContributionRows() {
  const rows = [];

  for (const slot of ARCADE_ACTOR_SLOTS) {
    const actor = person(S.roster[slot]);
    if (!actor) continue;
    const cameo = v30CameoForSlot(slot, actor);
    const outcome = S.cameoOutcomes?.[slot];
    const impact = v35PersonImpact(actor, slot);
    rows.push({
      type: cameo ? "Cameo" : "Cast",
      icon: cameo ? "✨" : "🎭",
      name: actor.name,
      role:
        cameo?.character ||
        arcadeOriginalForSlot(slot)?.character ||
        roleName(slot) ||
        slot,
      source: cameo
        ? `${cameo.title}${cameo.year ? ` (${cameo.year})` : ""}`
        : actor.sourceMovieTitle || "Source film",
      cameo: Boolean(cameo),
      metrics: outcome
        ? [
            ["Opening", outcome.opening],
            ["Audience", outcome.audience],
            ["Critics", outcome.critic],
            ["WOM", outcome.wom],
          ]
        : [
            ["Craft", impact.craft],
            ["Audience", impact.audience],
            ["Stability", impact.stability],
            ["Chemistry", impact.chemistry],
          ],
    });
  }

  (S.arcade.crew?.selectedDirectors || [])
    .map(person)
    .filter(Boolean)
    .forEach((p) => {
      const impact = v35PersonImpact(p, "Director 1");
      rows.push({
        type: "Director",
        icon: "🎬",
        name: p.name,
        role: "Director",
        source: (p.known || []).slice(0, 2).join(" · ") || "Career credits",
        metrics: [
          ["Craft", impact.craft * 1.25],
          ["Visuals", impact.audience * 0.55 + impact.craft * 0.45],
          ["Stability", impact.stability],
          ["Chemistry", impact.chemistry],
        ],
      });
    });

  (S.arcade.crew?.selectedWriters || [])
    .map(person)
    .filter(Boolean)
    .forEach((p) => {
      const impact = v35PersonImpact(p, "Writer 1");
      rows.push({
        type: "Writer",
        icon: "✍️",
        name: p.name,
        role: "Writer",
        source: (p.known || []).slice(0, 2).join(" · ") || "Career credits",
        metrics: [
          ["Craft", impact.craft * 1.2],
          ["Audience", impact.audience * 0.6],
          ["Stability", impact.stability],
          ["Chemistry", impact.chemistry],
        ],
      });
    });

  const composer = person(S.arcade.styleCrew?.composerId);
  if (composer) {
    const attrs = adjusted(composer, "Writer 1");
    const profile = v35StyleProfile(composer, "composer");
    rows.push({
      type: "Composer",
      icon: "🎼",
      name: composer.name,
      role: profile.name,
      source:
        (composer.known || []).slice(0, 2).join(" · ") || "Career credits",
      metrics: [
        ["Music", (attrs.craft - 50) * 0.16],
        ["Awards", (attrs.craft - 55) * 0.08],
        ["Fit", (attrs.fit - 55) * 0.1],
        ["Reliability", (attrs.reliability - 55) * 0.07],
      ],
    });
  }

  const cinematographer = person(S.arcade.styleCrew?.cinematographerId);
  if (cinematographer) {
    const attrs = adjusted(cinematographer, "Director 1");
    const profile = v35StyleProfile(cinematographer, "cinematographer");
    rows.push({
      type: "Cinematographer",
      icon: "📷",
      name: cinematographer.name,
      role: profile.name,
      source:
        (cinematographer.known || []).slice(0, 2).join(" · ") ||
        "Career credits",
      metrics: [
        ["Visuals", (attrs.craft - 50) * 0.16],
        ["Awards", (attrs.craft - 55) * 0.08],
        ["Fit", (attrs.fit - 55) * 0.1],
        ["Reliability", (attrs.reliability - 55) * 0.07],
      ],
    });
  }

  return rows;
}

function v35AwardCategoryResults(simulation) {
  if (simulation.awards?.categoryResults?.length) {
    return simulation.awards.categoryResults;
  }

  const scores = simulation.arcadeScores?.categories || {};
  const actors = ARCADE_ACTOR_SLOTS.map((slot) =>
    person(S.roster[slot]),
  ).filter(Boolean);
  const categories = [
    ["Best Picture", safe(scores.craft) + safe(simulation.critic) * 0.3],
    ["Best Director", safe(scores.craft) + safe(scores.visuals) * 0.35],
    [
      "Best Original or Adapted Screenplay",
      safe(scores.craft) + safe(simulation.audience) * 0.2,
    ],
    [
      "Best Film Editing",
      safe(scores.craft) * 0.65 + safe(scores.visuals) * 0.35,
    ],
    ["Best Actor", safe(actors[0]?.craft, 50) + safe(simulation.critic) * 0.25],
    [
      "Best Actress",
      safe(actors[1]?.craft, 50) + safe(simulation.critic) * 0.22,
    ],
    [
      "Best Supporting Performance",
      average(actors.slice(2).map((p) => safe(p.craft, 50))) +
        safe(simulation.critic) * 0.2,
    ],
    ["Best Cinematography", safe(scores.visuals) * 1.15],
    ["Best Original Score", safe(scores.music) * 1.15],
    ["Best Sound", safe(scores.music) * 0.65 + safe(scores.visuals) * 0.35],
    [
      "Best Production Design",
      safe(scores.visuals) * 0.8 + safe(scores.craft) * 0.2,
    ],
    [
      "Best Visual Effects",
      safe(scores.visuals) +
        (["Action", "Adventure", "Fantasy", "Sci-Fi"].includes(S.project.genre)
          ? 10
          : 0),
    ],
    [
      "Best Costume Design",
      safe(scores.visuals) * 0.65 + safe(scores.craft) * 0.3,
    ],
    [
      "Best Makeup and Hairstyling",
      safe(scores.visuals) * 0.55 + safe(simulation.critic) * 0.25,
    ],
    [
      "Best Casting",
      safe(simulation.audience) * 0.35 +
        average(actors.map((p, i) => adjusted(p, ARCADE_ACTOR_SLOTS[i]).fit)) *
          0.65,
    ],
  ].map(([name, score]) => ({ name, score: safe(score) }));

  const totalNominations = Math.min(
    categories.length,
    Math.max(
      0,
      safe(simulation.awards?.filmNoms) +
        safe(simulation.awards?.actingNoms) +
        safe(simulation.awards?.technicalNoms),
    ),
  );
  const totalWins = Math.min(
    totalNominations,
    safe(simulation.awards?.filmWins) +
      safe(simulation.awards?.actingWins) +
      safe(simulation.awards?.technicalWins),
  );

  const random = rng("v35-award-categories");
  const nominated = categories
    .map((category) => ({
      ...category,
      adjusted: category.score + (random() - 0.5) * 8,
    }))
    .sort((a, b) => b.adjusted - a.adjusted)
    .slice(0, totalNominations);

  nominated.forEach((category, index) => {
    category.status = index < totalWins ? "Winner" : "Nominated";
  });

  if (simulation.awards) simulation.awards.categoryResults = nominated;
  return nominated;
}

function v38DecisionEconomicProfile(ledger = S.arcade?.decisionLedger) {
  if (!V38_LEDGER) {
    return { grossMultiplier: 1, costMultiplier: 1, discipline: 0 };
  }
  const context = v38LedgerContext();
  const effects = V38_LEDGER.effects(ledger, context);
  const dimensions = V38_LEDGER.scores(ledger, context);
  const discipline = clamp(safe(dimensions.discipline), -6, 6);
  return {
    effects,
    discipline,
    grossMultiplier: clamp(1 + safe(effects.commercial) * 0.012, 0.95, 1.05),
    costMultiplier: clamp(1 - discipline * 0.006, 0.96, 1.04),
  };
}

function v38ApplyDecisionEffects(simulation, creative) {
  if (!V38_LEDGER) return;
  v35EnsureState();
  const economicProfile = v38DecisionEconomicProfile();
  const effects = economicProfile.effects;
  const worldBefore = safe(simulation.world);
  const fixedCostBefore = ["budget", "marketing", "overhead", "overrun"].reduce(
    (sum, key) => sum + safe(simulation[key]),
    0,
  );
  simulation.critic = clamp(safe(simulation.critic) + effects.critic);
  simulation.audience = clamp(safe(simulation.audience) + effects.audience);
  simulation.world = Math.max(
    0,
    safe(simulation.world) * economicProfile.grossMultiplier,
  );
  simulation.domestic = Math.max(
    0,
    safe(simulation.domestic) * economicProfile.grossMultiplier,
  );
  simulation.opening = Math.max(
    0,
    safe(simulation.opening) * Math.sqrt(economicProfile.grossMultiplier),
  );
  for (const key of ["budget", "marketing", "overhead", "overrun"]) {
    simulation[key] = Math.max(
      0,
      safe(simulation[key]) * economicProfile.costMultiplier,
    );
  }
  simulation.ancillary = Math.max(
    0,
    safe(simulation.ancillary) * (1 + safe(effects.audience) * 0.004),
  );
  if (typeof v28RecalculateEconomics === "function") {
    v28RecalculateEconomics(simulation);
  }
  const fixedCostAfter = ["budget", "marketing", "overhead", "overrun"].reduce(
    (sum, key) => sum + safe(simulation[key]),
    0,
  );
  simulation.decisionEconomics = {
    grossMultiplier: economicProfile.grossMultiplier,
    costMultiplier: economicProfile.costMultiplier,
    discipline: economicProfile.discipline,
    grossDeltaM: safe(simulation.world) - worldBefore,
    fixedCostDeltaM: fixedCostAfter - fixedCostBefore,
  };
  const scores = arcadeCalculateScores(simulation, creative);
  scores.categories.craft = clamp(scores.categories.craft + effects.craft);
  scores.categories.commercial = clamp(
    scores.categories.commercial + effects.commercial,
  );
  const weightTotal =
    Object.values(scores.weights).reduce((sum, value) => sum + safe(value), 0) ||
    100;
  scores.total = clamp(
    Object.entries(scores.categories).reduce(
      (sum, [key, value]) =>
        sum + (safe(value) * safe(scores.weights[key])) / weightTotal,
      0,
    ),
  );
  scores.grade = arcadeGradeLetter(scores.total);
  simulation.arcadeScores = scores;
  simulation.decisionEffects = effects;
  S.arcade.finalScores = scores;
}

function v38ResultsLedgerMarkup(simulation = S.simulation) {
  if (!V38_LEDGER) return "";
  const summary = V38_LEDGER.summary(
    S.arcade.decisionLedger,
    v38LedgerContext(),
  );
  const outcomes = V38_LEDGER.choiceResults(S.arcade.decisionLedger);
  const promiseText = summary.strengths.length
    ? summary.strengths
        .map(([key]) => V38_LEDGER.DIMENSIONS[key].label)
        .join(" + ")
    : "Balanced execution";
  const tensionText = summary.tensions.length
    ? summary.tensions
        .map(([key]) => V38_LEDGER.DIMENSIONS[key].label)
        .join(" + ")
    : "No dominant compromise";
  const economics = simulation?.decisionEconomics;
  const grossShift = safe(economics?.grossDeltaM);
  const costShift = safe(economics?.fixedCostDeltaM);
  return `
    <section class="v38LedgerResults">
      <header><span class="mini">Decision Ledger payoff</span><h2>The movie kept a promise of ${arcadeEsc(summary.thesis)}.</h2></header>
      <div class="v38LedgerVerdicts">
        <div class="good"><span>Promises kept</span><b>${arcadeEsc(promiseText)}</b></div>
        <div class="warn"><span>Creative tension</span><b>${arcadeEsc(tensionText)}</b></div>
      </div>
      ${
        economics
          ? `<div class="v38DecisionEconomics"><span>Production-call impact</span><b>${grossShift >= 0 ? "+" : "−"}${moneyM(Math.abs(grossShift))} market outlook</b><strong>${costShift <= 0 ? "−" : "+"}${moneyM(Math.abs(costShift))} fixed costs</strong></div>`
          : ""
      }
      <div class="v38LedgerOutcomeList">
        ${outcomes
          .map(
            (outcome) => `<article><span>${arcadeEsc(outcome.chapter)}</span><b>${arcadeEsc(outcome.title)}</b><p>${arcadeEsc(outcome.consequence)}</p></article>`,
          )
          .join("")}
      </div>
    </section>
  `;
}

const V35_SIMULATE_BASE = simulate;
simulate = function v35Simulate() {
  const simulation = V35_SIMULATE_BASE();
  const creative = arcadeCreativeEffects();
  v38ApplyDecisionEffects(simulation, creative);
  const awardVars = {
    ...(simulation.vars || {}),
    awards:
      safe(simulation.vars?.awards) +
      (safe(creative.awards) * safe(ARCADE_QUICK_TUNING.awards, 1)) / 0.3,
  };
  simulation.awards = awardSim(
    { ...simulation, vars: awardVars },
    rng("awards"),
  );
  v35AwardCategoryResults(simulation);
  return simulation;
};

function v38RecordCompletedCareerRunSafely() {
  try {
    recordCompletedCareerRun();
  } catch (error) {
    // Analytics are secondary to showing the completed run.
    console.warn("GREENLIT could not update career history.", error);
  }
}

function v38NormalizedResultScores(simulation) {
  const source = simulation?.arcadeScores || S.arcade?.finalScores || {};
  return {
    ...source,
    categories:
      source.categories && typeof source.categories === "object"
        ? source.categories
        : {},
    weights:
      source.weights && typeof source.weights === "object"
        ? source.weights
        : {},
    total: safe(source.total),
    grade: source.grade || "—",
  };
}

const ACTIVE_RESULTS_PAGE_V35 = function v35ResultsPage() {
  v35EnsureState();
  v38RecordCompletedCareerRunSafely();
  const simulation = S.simulation;
  if (!simulation) return shell("<h1>No result yet.</h1>");

  const { rank } = yearRank(simulation);
  const scores = v38NormalizedResultScores(simulation);
  const awards = simulation.awards || {};
  const totalWins =
    safe(awards.filmWins) +
    safe(awards.actingWins) +
    safe(awards.technicalWins);
  const legacy = S.arcade.legacy;
  let body = "";

  if (S.endTab === "results") {
    body = `
      <section class="arcadeGradeHero">
        <div class="arcadeGrade ${String(scores.grade).replace("+", "plus")}">${arcadeEsc(scores.grade)}</div>
        <div><div class="mini">Final studio grade</div><h1>${Math.round(scores.total)}/100</h1><p>Commercial performance, craft, visuals, music and audience response all contribute.</p></div>
        <div class="arcadeOutcomeStamp"><span>${arcadeEsc(simulation.outcome)}</span><b>${moneyM(simulation.profit)} profit</b></div>
      </section>
      ${legacy ? `<section class="v27LegacyCard"><span>${legacy.icon}</span><div><small>LEGACY EPILOGUE</small><h2>${legacy.name}</h2><p>${legacy.text}</p></div></section>` : ""}
      ${v38ResultsLedgerMarkup()}
      <div class="arcadeScoreGrid">
        ${Object.entries(scores.categories)
          .map(
            ([key, value]) => `
              <div class="arcadeScoreCard"><div><span>${arcadeEsc(key)}</span><b>${Math.round(value)}</b></div><div class="meter"><span style="width:${clamp(value)}%"></span></div><small>${Math.round(safe(scores.weights[key]))}% of final grade</small></div>
            `,
          )
          .join("")}
      </div>
      <section class="arcadeResultStats">
        <div><span>Worldwide</span><b>${moneyM(simulation.world)}</b></div>
        <div><span>Year rank</span><b>${Number.isFinite(rank) ? `#${rank}` : "Unavailable"}</b></div>
        <div><span>Critics</span><b>${Math.round(simulation.critic)}</b></div>
        <div><span>Audience</span><b>${Math.round(simulation.audience)}</b></div>
        <div><span>Awards won</span><b>${totalWins}</b></div>
      </section>
      <h2>Run badges</h2>
      <div class="arcadeRunBadges">
        ${
          (simulation.runBadges || [])
            .map(
              (badge) =>
                `<div><span>${badge.icon}</span><b>${arcadeEsc(badge.name)}</b><small>${arcadeEsc(badge.text)}</small></div>`,
            )
            .join("") ||
          "<div><span>🎟️</span><b>First Screening</b><small>Complete more runs to chase special badges.</small></div>"
        }
      </div>
      ${S.reference ? `<section class="arcadeVsOriginal"><div><span>Original worldwide</span><b>${S.reference.revenueM ? moneyM(S.reference.revenueM) : "Unknown"}</b></div><div><span>Your worldwide</span><b>${moneyM(simulation.world)}</b></div><strong class="${simulation.world >= safe(S.reference.revenueM) ? "positive" : "negative"}">${simulation.world >= safe(S.reference.revenueM) ? "You beat the original gross." : "The original kept the box-office crown."}</strong></section>` : ""}
    `;
  }

  if (S.endTab === "why") {
    const contributions = v35ContributionRows();
    const why = buildWhyAnalysis(simulation, rank);
    body = `
      <section class="v35WhyMoney">
        <div><span>Total studio revenue</span><b>${moneyM(why.totalStudioRevenue)}</b></div>
        <div><span>Total cost</span><b>${moneyM(simulation.totalCost)}</b></div>
        <div><span>Break-even gross</span><b>${moneyM(why.breakEvenGross)}</b></div>
        <div><span>Profit</span><b class="${simulation.profit >= 0 ? "positive" : "negative"}">${moneyM(simulation.profit)}</b></div>
      </section>
      <div class="v35ContributionHead"><span class="mini">People behind the result</span><h2>Cast and crew impact</h2><p>These are GREENLIT's project-specific contribution estimates, including actual cameo outcomes.</p></div>
      <section class="v35ContributionGrid">
        ${contributions
          .map(
            (row) => `
              <article class="v35ContributionCard ${row.cameo ? "cameo" : ""}">
                <div class="v35ContributionTitle"><span>${row.icon}</span><div><small>${row.type}</small><h3>${arcadeEsc(row.name)}</h3><b>${arcadeEsc(row.role)}</b><em>${arcadeEsc(row.source)}</em></div></div>
                <div class="v35ContributionStats">
                  ${row.metrics
                    .map(
                      ([label, value]) =>
                        `<div><span>${arcadeEsc(label)}</span><b class="${safe(value) >= 0 ? "positive" : "negative"}">${v35Signed(value)}</b></div>`,
                    )
                    .join("")}
                </div>
              </article>
            `,
          )
          .join("")}
      </section>
    `;
  }

  if (S.endTab === "awards") {
    const categories = v35AwardCategoryResults(simulation);
    body = `
      <div class="callout ${awards.contender ? "good" : ""}"><b>${awards.contender ? "Awards contender" : "Outside the main awards conversation"}</b><div class="sub">Award score ${awards.awardScore || 0} · Competition ${awards.competition || 0}</div></div>
      <section class="v35AwardSummary">
        <div><span>Total nominations</span><b>${categories.length}</b></div>
        <div><span>Total wins</span><b>${categories.filter((item) => item.status === "Winner").length}</b></div>
        <div><span>Award score</span><b>${safe(awards.awardScore)}</b></div>
      </section>
      <section class="v35AwardList">
        <div class="v35ContributionHead"><span class="mini">Category results</span><h2>Nominations and wins</h2></div>
        ${
          categories.length
            ? categories
                .map(
                  (category) => `
                    <article class="${category.status === "Winner" ? "winner" : "nominee"}">
                      <span>${category.status === "Winner" ? "🏆" : "◉"}</span>
                      <b>${arcadeEsc(category.name)}</b>
                      <em>${category.status}</em>
                    </article>
                  `,
                )
                .join("")
            : '<div class="callout">The campaign finished without a major-category nomination.</div>'
        }
      </section>
      <section class="v35AwardShows">
        <div class="v35ContributionHead"><span class="mini">Award bodies</span><h2>Campaign overview</h2></div>
        ${(awards.shows || [])
          .map(
            (show) =>
              `<div><b>${arcadeEsc(show.name)}</b><span>${show.nominations} nomination${show.nominations === 1 ? "" : "s"}</span><strong>${show.wins} win${show.wins === 1 ? "" : "s"}</strong></div>`,
          )
          .join("")}
      </section>
      <div class="card"><h2>Share the run</h2><p class="sub">Download the summary card with the complete team.</p><button class="btn primary" id="download">Download PNG</button></div>
    `;
  }

  shell(`
    <div class="arcadePageHead"><div><div class="mini">Final screen</div><h1>Studio results.</h1></div><div class="arcadeStepPill">${arcadeEsc(scores.grade)} grade</div></div>
    <div class="tabs">
      ${[
        ["results", "Scorecard"],
        ["why", "Why"],
        ["awards", "Awards & Share"],
      ]
        .map(
          ([id, label]) =>
            `<button class="tab ${S.endTab === id ? "active" : ""}" data-endtab="${id}">${label}</button>`,
        )
        .join("")}
    </div>
    ${body}
  `);

  $$("[data-endtab]").forEach((button) => {
    button.onclick = () => {
      S.endTab = button.dataset.endtab;
      render();
    };
  });
  if ($("#download")) $("#download").onclick = downloadSummary;
};

v35EnsureState();

// Keep every creative reel to three visible choices while staying budget-scoped.
function v38SelectBudgetScopedCrewChoices(pool, kind) {
  const slot = kind === "directors" ? "Director 1" : "Writer 1";
  const preferred = v38PreferredCrewTiers();
  const caps = v38BudgetOptionCaps();
  const maxFee = kind === "directors" ? caps.crewDirector : caps.crewWriter;
  const buckets = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  };
  const seen = new Set();

  pool.forEach((candidate) => {
    const tier = v32TalentTier(candidate, slot);
    if (buckets[tier]) buckets[tier].push(candidate);
  });

  const picked = [];
  preferred.forEach((tier) => {
    const candidate = (buckets[tier] || [])
      .slice()
      .sort((first, second) => {
        const firstFee = v32PersonFee(first, slot);
        const secondFee = v32PersonFee(second, slot);
        const firstDistance = Math.abs(firstFee - maxFee);
        const secondDistance = Math.abs(secondFee - maxFee);
        return firstDistance - secondDistance;
      })
      .find((item) => !seen.has(item.id));
    if (!candidate || picked.length >= 3) return;
    seen.add(candidate.id);
    picked.push(candidate);
  });

  if (picked.length < 3) {
    const remaining = pool
      .filter((candidate) => !seen.has(candidate.id))
      .sort((a, b) => {
        const aTier = v32TalentTier(a, slot);
        const bTier = v32TalentTier(b, slot);
        const aIndex = preferred.indexOf(aTier);
        const bIndex = preferred.indexOf(bTier);
        return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
      });
    remaining.forEach((candidate) => {
      if (picked.length >= 3) return;
      seen.add(candidate.id);
      picked.push(candidate);
    });
  }

  return picked.slice(0, 3);
}

const V35_BUILD_CREW_POOL_BASE = arcadeBuildCrewPool;
arcadeBuildCrewPool = async function v35BuildCrewPool(kind) {
  const pool = await V35_BUILD_CREW_POOL_BASE(kind);
  const scoped = v38SelectBudgetScopedCrewChoices(pool, kind);
  const output = scoped.length ? scoped : pool.slice(0, 3);
  if (!pool.length) {
    throw new Error(`No ${kind} candidates were returned. Please try again.`);
  }
  return output;
};

// =============================================================================
// GREENLIT V38 — AUTHORITATIVE APPLICATION BOOT
// =============================================================================
// All renderer overrides have now been registered. Render exactly once using
// the final implementations, preventing the obsolete crew/style page from
// appearing on first navigation.
function v38BalancePercentile(values, percentile) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((first, second) => first - second);
  return sorted[Math.floor((sorted.length - 1) * clamp(percentile, 0, 1))];
}

function v38CanAuditCurrentPackage() {
  return Boolean(
    S.reference &&
      S.arcade?.marketingConfirmed &&
      (!V38_LEDGER || V38_LEDGER.isComplete(S.arcade.decisionLedger)),
  );
}

function v38SummarizeLiveBalance(runs) {
  const outcomes = {};
  runs.forEach((run) => {
    outcomes[run.outcome] = (outcomes[run.outcome] || 0) + 1;
  });
  const gross = runs.map((run) => run.world);
  const profit = runs.map((run) => run.profit);
  const profitable = runs.filter((run) => run.profit >= 0).length;
  const hitPlus = runs.filter((run) =>
    ["Hit", "Blockbuster", "All-Time Hit"].includes(run.outcome),
  ).length;
  return {
    count: runs.length,
    outcomes,
    profitableRate: (profitable / Math.max(1, runs.length)) * 100,
    hitPlusRate: (hitPlus / Math.max(1, runs.length)) * 100,
    grossMedian: v38BalancePercentile(gross, 0.5),
    grossLow: v38BalancePercentile(gross, 0.1),
    grossHigh: v38BalancePercentile(gross, 0.9),
    profitMedian: v38BalancePercentile(profit, 0.5),
    criticMean: average(runs.map((run) => run.critic)),
    audienceMean: average(runs.map((run) => run.audience)),
  };
}

async function v38RunLiveBalanceAudit(runCount = 200, onProgress) {
  if (!v38CanAuditCurrentPackage()) {
    throw new Error("Finish the current package and choose all production calls first.");
  }
  const liveState = S;
  const auditBase = migrate(structuredClone(makeSaveState()));
  const runs = [];
  try {
    for (let index = 0; index < runCount; index += 1) {
      S = migrate(structuredClone(auditBase));
      ensureArcadeState();
      v35EnsureState();
      S.runSeed = `v38-live-balance|${auditBase.runSeed || "run"}|${index}`;
      S.simulation = null;
      S.releaseRace = null;
      S.releaseRaceCompleted = false;
      const simulation = simulate();
      runs.push({
        world: safe(simulation.world),
        profit: safe(simulation.profit),
        roi: safe(simulation.roi),
        outcome: simulation.outcome || "Unknown",
        critic: safe(simulation.critic),
        audience: safe(simulation.audience),
      });
      if ((index + 1) % 20 === 0 || index + 1 === runCount) {
        onProgress?.(index + 1, runCount);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
  } finally {
    S = liveState;
  }
  return { runs, summary: v38SummarizeLiveBalance(runs) };
}

function v38LiveBalanceResultsMarkup(summary) {
  const maximum = Math.max(1, ...Object.values(summary.outcomes));
  return `
    <div class="v38LiveBalanceCards">
      <div><span>Profitable runs</span><b>${summary.profitableRate.toFixed(0)}%</b></div>
      <div><span>Hit or better</span><b>${summary.hitPlusRate.toFixed(0)}%</b></div>
      <div><span>Median worldwide</span><b>${moneyM(summary.grossMedian)}</b></div>
      <div><span>Median profit</span><b>${moneyM(summary.profitMedian)}</b></div>
    </div>
    <div class="v38LiveBalanceRange"><span>Middle 80% worldwide range</span><b>${moneyM(summary.grossLow)}–${moneyM(summary.grossHigh)}</b><small>Average reception: ${summary.criticMean.toFixed(0)} critics · ${summary.audienceMean.toFixed(0)} audience</small></div>
    <div class="v38LiveBalanceOutcomes">
      ${Object.entries(summary.outcomes)
        .sort((first, second) => second[1] - first[1])
        .map(
          ([label, count]) => `<div><span>${arcadeEsc(label)}</span><i><b style="width:${(count / maximum) * 100}%"></b></i><strong>${((count / summary.count) * 100).toFixed(0)}%</strong></div>`,
        )
        .join("")}
    </div>
  `;
}

function v38ScaleParityResultsMarkup(simulation, telemetryAudit, regression) {
  const rows = Object.entries(simulation.byScale || {})
    .map(
      ([scale, report]) => `
        <div>
          <span>${arcadeEsc(scale)}</span>
          <b>${report.successRate.toFixed(1)}%</b>
          <small>n=${report.sampleSize} · avg pressure ${report.averageBudgetPressure.toFixed(1)}%</small>
        </div>
      `,
    )
    .join("");
  const archetypeRows = Object.entries(telemetryAudit.averageBudgetAffinity || {})
    .map(
      ([archetype, affinity]) =>
        `<li>${arcadeEsc(V30_DRAFT_ARCHETYPE_LABELS[archetype] || archetype)}: ${safe(affinity).toFixed(1)}%</li>`,
    )
    .join("");
  return `
    <div class="v38LiveBalanceCards">
      <div><span>Success-rate spread</span><b>${(simulation.successRateSpread * 100).toFixed(1)}%</b></div>
      <div><span>Target spread</span><b>${(simulation.targetSpread * 100).toFixed(1)}%</b></div>
      <div><span>Status</span><b>${simulation.pass ? "Pass" : "Needs tuning"}</b></div>
      <div><span>Slate integrity</span><b>${telemetryAudit.slateIntegrityRate.toFixed(1)}%</b></div>
    </div>
    <div class="v38LiveBalanceRange"><span>Deterministic regression</span><b>${regression.pass ? "Pass" : "Fail"}</b><small>Worst spread ${(regression.worstSpread * 100).toFixed(1)}% across ${regression.runs.length} locked seeds.</small></div>
    <div class="v38LiveBalanceOutcomes">${rows}</div>
    <div class="v38LiveBalanceRange">
      <span>Draft telemetry</span>
      <b>${telemetryAudit.slotCount} slot slates analyzed</b>
      <small>${telemetryAudit.completeCoverageCount}/${telemetryAudit.slotCount || 1} include all five archetypes.</small>
    </div>
    ${
      archetypeRows
        ? `<div class="v38LiveBalanceRange"><span>Average budget affinity by archetype</span><ul>${archetypeRows}</ul></div>`
        : ""
    }
  `;
}

function v38BudgetScopeAuditMarkup(telemetryAudit, stressTest) {
  const rows = Object.entries(telemetryAudit.byScale || {})
    .map(([scale, report]) => {
      const crew = report.crew || {};
      const style = report.style || {};
      return `
        <div>
          <span>${arcadeEsc(scale)}</span>
          <b>${average([safe(crew.overBudgetRate), safe(style.overBudgetRate)]).toFixed(1)}% over budget</b>
          <small>${average([safe(crew.goodChoiceRate), safe(style.goodChoiceRate)]).toFixed(1)}% good-choice rate</small>
        </div>
      `;
    })
    .join("");
  const stressRows = Object.entries(stressTest.byScale || {})
    .map(
      ([scale, report]) =>
        `<div><span>${arcadeEsc(scale)}</span><b>${safe(report.overBudgetRate).toFixed(1)}%</b><small>${report.pass ? "Within target" : "Above target"}</small></div>`,
    )
    .join("");
  return `
    <div class="v38LiveBalanceCards">
      <div><span>Low-budget over-budget rate</span><b>${safe(telemetryAudit.lowBudgetOverBudgetRate).toFixed(1)}%</b></div>
      <div><span>Low-budget good-choice rate</span><b>${safe(telemetryAudit.lowBudgetGoodChoiceRate).toFixed(1)}%</b></div>
      <div><span>Crew rolls tracked</span><b>${telemetryAudit.crewRollCount}</b></div>
      <div><span>Style rolls tracked</span><b>${telemetryAudit.styleRollCount}</b></div>
    </div>
    <div class="v38LiveBalanceOutcomes">${rows}</div>
    <div class="v38LiveBalanceRange">
      <span>Budget stress test target</span>
      <b>${safe(stressTest.targetOverBudgetRate)}% max over-budget rate</b>
      <small>Synthetic over-budget rates by scale:</small>
    </div>
    <div class="v38LiveBalanceOutcomes">${stressRows}</div>
  `;
}

const V38_BALANCE_MODAL_BASE = balanceModal;
balanceModal = function v38BalanceModal() {
  V38_BALANCE_MODAL_BASE();
  const root = document.querySelector(".v34BudgetLabModal");
  const actions = root?.querySelector(".v34BudgetLabActions");
  if (!root || !actions || root.querySelector(".v38LiveBalancePanel")) return;
  const ready = v38CanAuditCurrentPackage();
  actions.insertAdjacentHTML(
    "beforebegin",
    `<section class="v34BudgetLabPanel v38LiveBalancePanel">
      <div class="v34BudgetLabTitle"><span class="mini">V38.4 live simulator</span><h2>Audit this exact package</h2></div>
      <p>Rerun the active cast, crew, marketing plan, production calls, era and release window across fresh deterministic luck. This uses the same simulator as the finished game.</p>
      <div class="v38LiveBalanceControls">
        <label>Runs <input id="v38BalanceRuns" type="range" min="50" max="500" step="50" value="200"><b id="v38BalanceRunsValue">200</b></label>
        <button class="btn primary" id="v38RunLiveBalance" ${ready ? "" : "disabled"}>Run package audit</button>
      </div>
      <div id="v38LiveBalanceStatus" class="v38LiveBalanceStatus">${ready ? "Ready to test the current package." : "Complete casting, crew, marketing and all three production calls to unlock this audit."}</div>
      <div id="v38LiveBalanceResults"></div>
    </section>
    <section class="v34BudgetLabPanel v38LiveBalancePanel">
      <div class="v34BudgetLabTitle"><span class="mini">V38.6 fairness simulator</span><h2>Run scale-parity audit</h2></div>
      <p>Simulate recommendation fairness across all production scales and verify that low/high budget paths stay within the same success-rate difficulty band.</p>
      <div class="v38LiveBalanceControls">
        <label>Runs <input id="v38ScaleParityRuns" type="range" min="200" max="5000" step="200" value="2000"><b id="v38ScaleParityRunsValue">2000</b></label>
        <button class="btn primary" id="v38RunScaleParity">Run parity audit</button>
      </div>
      <div id="v38ScaleParityStatus" class="v38LiveBalanceStatus">Ready to evaluate scale parity and draft telemetry.</div>
      <div id="v38ScaleParityResults"></div>
    </section>
    <section class="v34BudgetLabPanel v38LiveBalancePanel">
      <div class="v34BudgetLabTitle"><span class="mini">V38.6 budget-scope audit</span><h2>Audit over-budget risk and choice quality</h2></div>
      <p>Checks how often rolls go over budget and whether low-budget runs get viable writer/director and creative package options.</p>
      <div class="v38LiveBalanceControls">
        <button class="btn primary" id="v38RunBudgetScopeAudit">Run budget-scope audit</button>
      </div>
      <div id="v38BudgetScopeStatus" class="v38LiveBalanceStatus">Ready to audit current telemetry and stress-test budget tiers.</div>
      <div id="v38BudgetScopeResults"></div>
    </section>`,
  );

  const range = $("#v38BalanceRuns");
  const value = $("#v38BalanceRunsValue");
  const button = $("#v38RunLiveBalance");
  range.oninput = () => {
    value.textContent = range.value;
  };
  button.onclick = async () => {
    button.disabled = true;
    const status = $("#v38LiveBalanceStatus");
    const results = $("#v38LiveBalanceResults");
    results.innerHTML = "";
    try {
      const audit = await v38RunLiveBalanceAudit(
        Number(range.value),
        (completed, total) => {
          if (status) status.textContent = `Testing ${completed} / ${total} outcomes…`;
        },
      );
      if (status)
        status.textContent = `Completed ${audit.summary.count} live-simulator runs.`;
      if (results)
        results.innerHTML = v38LiveBalanceResultsMarkup(audit.summary);
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      if (document.body.contains(button)) button.disabled = false;
    }
  };

  const parityRange = $("#v38ScaleParityRuns");
  const parityValue = $("#v38ScaleParityRunsValue");
  const parityButton = $("#v38RunScaleParity");
  parityRange.oninput = () => {
    parityValue.textContent = parityRange.value;
  };
  parityButton.onclick = () => {
    const status = $("#v38ScaleParityStatus");
    const results = $("#v38ScaleParityResults");
    parityButton.disabled = true;
    try {
      const runCount = Number(parityRange.value);
      const simulation = runScaleParitySimulation({
        iterations: runCount,
        scaleBudgets: Object.fromEntries(
          Object.entries(SCALE).map(([scale, data]) => [scale, data.budget]),
        ),
        targetSpread: safe(BALANCE_TUNING.sourceDraft?.parityTargetSpread, 0.06),
        seed: `${S.runSeed || "seed"}|parity`,
      });
      const regression = runDeterministicParityRegression({
        iterations: 2500,
        scaleBudgets: Object.fromEntries(
          Object.entries(SCALE).map(([scale, data]) => [scale, data.budget]),
        ),
        targetSpread: safe(BALANCE_TUNING.sourceDraft?.parityTargetSpread, 0.06),
      });
      const telemetryAudit = auditDraftRecommendationTelemetry(
        S.arcade?.recommendationTelemetry || {},
      );
      if (status) {
        status.textContent = simulation.pass && regression.pass
          ? "Scale parity and deterministic regressions are inside the target spread."
          : "Parity drift detected; adjust archetype weighting and rerun.";
      }
      if (results) {
        results.innerHTML = v38ScaleParityResultsMarkup(
          simulation,
          telemetryAudit,
          regression,
        );
      }
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      if (document.body.contains(parityButton)) parityButton.disabled = false;
    }
  };

  const budgetScopeButton = $("#v38RunBudgetScopeAudit");
  budgetScopeButton.onclick = () => {
    const status = $("#v38BudgetScopeStatus");
    const results = $("#v38BudgetScopeResults");
    budgetScopeButton.disabled = true;
    try {
      const telemetryAudit = auditBudgetScopeTelemetry(S.arcade?.budgetAudit || {});
      const stressTest = runBudgetScopeStressTest({
        iterations: 2500,
        scaleBudgets: Object.fromEntries(
          Object.entries(SCALE).map(([scale, data]) => [scale, data.budget]),
        ),
        targetOverBudgetRate: 45,
        seed: `${S.runSeed || "seed"}|budget-scope`,
      });
      if (status) {
        status.textContent =
          telemetryAudit.crewRollCount || telemetryAudit.styleRollCount
            ? "Budget-scope telemetry audit complete."
            : "No crew/style telemetry captured yet. Spin crew reels and creative duos first.";
      }
      if (results) {
        results.innerHTML = v38BudgetScopeAuditMarkup(telemetryAudit, stressTest);
      }
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      if (document.body.contains(budgetScopeButton)) {
        budgetScopeButton.disabled = false;
      }
    }
  };
};

const ACTIVE_PROJECT_PAGE = ACTIVE_PROJECT_PAGE_V34;
const ACTIVE_HIRE_PAGE = ACTIVE_HIRE_PAGE_V35;
const ACTIVE_PRODUCTION_PAGE = ACTIVE_PRODUCTION_PAGE_V35;
const ACTIVE_MARKETING_PAGE = ACTIVE_MARKETING_PAGE_V32;
const ACTIVE_RELEASE_PAGE = ACTIVE_RELEASE_PAGE_V35;
const ACTIVE_RESULTS_PAGE = ACTIVE_RESULTS_PAGE_V35;

V38_SCREEN_REGISTRY = createScreenRegistry([
  ACTIVE_PROJECT_PAGE,
  ACTIVE_HIRE_PAGE,
  ACTIVE_PRODUCTION_PAGE,
  ACTIVE_MARKETING_PAGE,
  ACTIVE_RELEASE_PAGE,
  ACTIVE_RESULTS_PAGE,
]);

/*
 * AUTHORITATIVE V38 BOOT BOUNDARY
 * Final runtime entrypoints are captured above and boot starts below.
 * Do not add further renderer/entrypoint reassignment beneath this block.
 */
ensureArcadeState();
render();
