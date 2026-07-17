(function installV38PortraitService(root, factory) {
  const namespace = root.GreenlitV38 || (root.GreenlitV38 = {});
  const portraits = factory();
  namespace.portraits = portraits;
  if (typeof module !== "undefined" && module.exports) module.exports = portraits;
})(typeof globalThis !== "undefined" ? globalThis : window, function createV38PortraitService() {
  "use strict";

  const resolved = new Map();
  const inFlight = new Map();
  const matches = new Map();
  const profiles = new Map();
  const profileInFlight = new Map();
  const requestQueue = [];
  let activeRequests = 0;
  const MAX_ACTIVE_REQUESTS = 2;

  function pumpQueue() {
    while (activeRequests < MAX_ACTIVE_REQUESTS && requestQueue.length) {
      const job = requestQueue.shift();
      activeRequests += 1;
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          activeRequests -= 1;
          pumpQueue();
        });
    }
  }

  function scheduleRequest(task) {
    return new Promise((resolve, reject) => {
      requestQueue.push({ task, resolve, reject });
      pumpQueue();
    });
  }

  function normalizeName(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function imageUrl(value, size = "w500") {
    const source = String(value || "").trim();
    if (!source) return null;
    if (/^(?:https?:|data:|blob:)/i.test(source)) return source;
    return `https://image.tmdb.org/t/p/${size}${source.startsWith("/") ? source : `/${source}`}`;
  }

  function pick(...records) {
    for (const record of records.flat()) {
      if (!record) continue;
      const url = imageUrl(record.photo || record.profile_path || record.profilePath);
      if (url) return url;
    }
    return null;
  }

  async function resolve(person, options = {}) {
    const immediate = pick(person);
    if (immediate) return immediate;

    const name = String(person?.name || "").trim();
    const key = normalizeName(name);
    if (!key || !options.hasToken || typeof options.request !== "function") return null;
    if (resolved.has(key)) return resolved.get(key);
    if (inFlight.has(key)) return inFlight.get(key);

    const request = Promise.resolve()
      .then(() =>
        scheduleRequest(() =>
          options.request("/search/person", {
            query: name,
            include_adult: false,
            language: "en-US",
            page: 1,
          }),
        ),
      )
      .then((payload) => {
        const exact = (payload?.results || []).find(
          (candidate) =>
            normalizeName(candidate?.name) === key &&
            Boolean(candidate?.profile_path || candidate?.photo),
        );
        matches.set(key, exact || null);
        const url = pick(exact);
        resolved.set(key, url);
        return url;
      })
      .catch(() => {
        resolved.set(key, null);
        return null;
      })
      .finally(() => inFlight.delete(key));

    inFlight.set(key, request);
    return request;
  }

  async function resolveProfile(person, options = {}) {
    const name = String(person?.name || "").trim();
    const key = normalizeName(name);
    const knownBirthday = person?.birthday ||
      (Number.isFinite(person?.birthYear) ? `${person.birthYear}-01-01` : null);
    if (knownBirthday && pick(person)) {
      return { photo: pick(person), birthday: knownBirthday, tmdbId: person.tmdbId || null };
    }
    if (!key || !options.hasToken || typeof options.request !== "function") {
      return { photo: pick(person), birthday: knownBirthday, tmdbId: person?.tmdbId || null };
    }
    if (profiles.has(key)) return { ...profiles.get(key) };
    if (profileInFlight.has(key)) return profileInFlight.get(key);

    const request = Promise.resolve()
      .then(async () => {
        await resolve(person, options);
        const match = matches.get(key);
        const tmdbId = Number(person?.tmdbId) > 0 ? Number(person.tmdbId) : Number(match?.id);
        let details = null;
        if (Number.isFinite(tmdbId) && tmdbId > 0) {
          details = await scheduleRequest(() =>
            options.request(`/person/${tmdbId}`, { language: "en-US" }),
          );
        }
        const profile = {
          photo: pick(details, match, person),
          birthday: details?.birthday || knownBirthday || null,
          tmdbId: Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : null,
        };
        profiles.set(key, profile);
        return { ...profile };
      })
      .catch(() => {
        const profile = { photo: pick(person), birthday: knownBirthday || null, tmdbId: person?.tmdbId || null };
        profiles.set(key, profile);
        return { ...profile };
      })
      .finally(() => profileInFlight.delete(key));

    profileInFlight.set(key, request);
    return request;
  }

  function invalidate(name) {
    const key = normalizeName(name);
    resolved.delete(key);
    matches.delete(key);
    profiles.delete(key);
    inFlight.delete(key);
    profileInFlight.delete(key);
  }

  function clear() {
    resolved.clear();
    inFlight.clear();
    matches.clear();
    profiles.clear();
    profileInFlight.clear();
  }

  function debugState() {
    return {
      resolved: resolved.size,
      inFlight: inFlight.size,
      profiles: profiles.size,
      profileInFlight: profileInFlight.size,
      activeRequests,
      queuedRequests: requestQueue.length,
    };
  }

  return Object.freeze({
    normalizeName,
    imageUrl,
    pick,
    resolve,
    resolveProfile,
    invalidate,
    clear,
    debugState,
  });
});
