(function installV37DataService(root, factory) {
  const namespace = root.GreenlitV37 || (root.GreenlitV37 = {});
  const service = factory(namespace.catalog);
  namespace.data = service;
  if (typeof module !== "undefined" && module.exports) module.exports = service;
})(typeof globalThis !== "undefined" ? globalThis : window, function createV37DataService(catalog) {
  "use strict";

  const CACHE_PREFIX = "greenlit-v37-tmdb-cache:";
  const CACHE_SCHEMA = 1;
  const CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
  const LIVE_TIMEOUT_MS = 3500;
  const inFlight = new Map();
  const generationByKey = new Map();
  const controllers = new Map();
  const memoryCache = new Map();
  let lastToken = null;
  let invalidToken = false;
  let dataMode = "hybrid";
  let status = {
    mode: "bundled",
    state: "ready",
    label: "Bundled catalog",
    message: "Offline catalog active. Connect TMDB in Data for optional live results.",
  };

  const clone = (value) =>
    typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

  function storageAvailable(storage) {
    return Boolean(storage && typeof storage.getItem === "function");
  }

  function cacheKey(key) {
    return `${CACHE_PREFIX}${encodeURIComponent(key)}`;
  }

  function readCache(key, storage = globalThis.localStorage) {
    let record = memoryCache.get(key) || null;
    if (!record && storageAvailable(storage)) {
      try {
        record = JSON.parse(storage.getItem(cacheKey(key)) || "null");
      } catch {
        record = null;
      }
    }
    if (
      !record ||
      record.schema !== CACHE_SCHEMA ||
      !Number.isFinite(record.fetchedAt) ||
      Date.now() - record.fetchedAt >= CACHE_TTL_MS ||
      record.payload == null
    ) {
      memoryCache.delete(key);
      if (storageAvailable(storage)) {
        try {
          storage.removeItem(cacheKey(key));
        } catch {}
      }
      return null;
    }
    return clone(record.payload);
  }

  function writeCache(key, payload, storage = globalThis.localStorage) {
    const record = {
      schema: CACHE_SCHEMA,
      fetchedAt: Date.now(),
      payload: clone(payload),
    };
    memoryCache.set(key, record);
    if (storageAvailable(storage)) {
      try {
        storage.setItem(cacheKey(key), JSON.stringify(record));
      } catch {}
    }
  }

  function clearCache(storage = globalThis.localStorage) {
    memoryCache.clear();
    if (!storageAvailable(storage)) return;
    const remove = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(CACHE_PREFIX)) remove.push(key);
      }
      remove.forEach((key) => storage.removeItem(key));
    } catch {}
  }

  function normalizedParams(params = {}) {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value != null)
        .sort(([first], [second]) => first.localeCompare(second)),
    );
  }

  function requestKey(path, params) {
    return `${path}?${new URLSearchParams(normalizedParams(params)).toString()}`;
  }

  function setBundledStatus(message) {
    if (dataMode === "offline") {
      status = {
        mode: "bundled",
        state: "ready",
        label: "Offline only",
        message:
          message ||
          "Cached media and the bundled database are active. Live requests are disabled.",
      };
      return;
    }
    status = {
      mode: "bundled",
      state: invalidToken ? "attention" : "ready",
      label: invalidToken ? "TMDB needs attention" : "Bundled catalog",
      message:
        message ||
        (invalidToken
          ? "Offline catalog active. Reconnect TMDB in Data."
          : "Offline catalog active. Connect TMDB in Data for optional live results."),
    };
  }

  function resetConnection() {
    invalidToken = false;
    lastToken = null;
    for (const controller of controllers.values()) controller.abort();
    controllers.clear();
    inFlight.clear();
    setBundledStatus();
  }

  function setDataMode(value) {
    dataMode = ["hybrid", "offline", "tmdb"].includes(value) ? value : "hybrid";
    resetConnection();
    if (dataMode === "tmdb") {
      status = {
        mode: "live",
        state: "ready",
        label: "TMDB only",
        message: "Live or cached TMDB data is required. Bundled records are disabled.",
      };
    } else if (dataMode === "offline") {
      status = {
        mode: "bundled",
        state: "ready",
        label: "Offline only",
        message: "Cached media and the bundled database are active. Live requests are disabled.",
      };
    }
    return dataMode;
  }

  function getDataMode() {
    return dataMode;
  }

  function setOfflineEnabled(value) {
    return setDataMode(value === false ? "tmdb" : "hybrid");
  }

  function getOfflineEnabled() {
    return dataMode !== "tmdb";
  }

  function getStatus() {
    return { ...status };
  }

  function isFallbackIdPath(path) {
    const match = path.match(/^\/(?:movie|person)\/(-?\d+)$/);
    return Boolean(match && Number(match[1]) < 0);
  }

  function isPositiveIdPath(path) {
    const match = path.match(/^\/(?:movie|person)\/(\d+)$/);
    return Boolean(match && Number(match[1]) > 0);
  }

  function fallback(path, params) {
    const value = catalog?.route?.(path, params);
    if (value == null) return null;
    setBundledStatus();
    return clone(value);
  }

  async function runLive(key, path, params, options, generation) {
    const controller = new AbortController();
    controllers.get(key)?.abort();
    controllers.set(key, controller);
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || LIVE_TIMEOUT_MS);
    try {
      const payload = await options.fetchLive(controller.signal);
      if (generationByKey.get(key) !== generation) {
        const stale = new Error("Stale V37 data response");
        stale.name = "AbortError";
        throw stale;
      }
      writeCache(key, payload, options.storage);
      status = {
        mode: "live",
        state: "ready",
        label: "Live TMDB",
        message:
          options.mode === "tmdb"
            ? "Live TMDB data is connected. Bundled records are disabled."
            : "Live TMDB data is connected. Bundled data remains available as fallback.",
      };
      return clone(payload);
    } catch (error) {
      const code = Number(error?.status || String(error?.message || "").match(/TMDB\s+(\d+)/)?.[1]);
      if (code === 401 || code === 403) {
        invalidToken = true;
        if (options.mode === "tmdb") {
          status = {
            mode: "live",
            state: "attention",
            label: "TMDB needs attention",
            message: "Reconnect TMDB in Data. Bundled records are disabled in TMDB-only mode.",
          };
        } else {
          setBundledStatus("Offline catalog active. Reconnect TMDB in Data.");
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (controllers.get(key) === controller) controllers.delete(key);
    }
  }

  function warmLive(key, path, params, options) {
    if (inFlight.has(key)) return;
    const generation = (generationByKey.get(key) || 0) + 1;
    generationByKey.set(key, generation);
    const promise = runLive(key, path, params, options, generation)
      .catch(() => null)
      .finally(() => {
        if (inFlight.get(key) === promise) inFlight.delete(key);
      });
    inFlight.set(key, promise);
  }

  async function request(path, params = {}, options = {}) {
    const key = requestKey(path, params);
    const token = String(options.token || "").trim();
    const mode = ["hybrid", "offline", "tmdb"].includes(options.mode)
      ? options.mode
      : options.offlineEnabled === false
        ? "tmdb"
        : dataMode;
    const allowBundled = mode !== "tmdb";
    const allowLive = mode !== "offline";
    if (token !== lastToken) {
      invalidToken = false;
      lastToken = token;
    }

    if (allowBundled && isFallbackIdPath(path)) {
      const bundled = fallback(path, params);
      if (bundled != null) return bundled;
    }

    const cached = readCache(key, options.storage);
    if (cached != null) {
      status = {
        mode: "cached",
        state: "ready",
        label: mode === "offline" ? "Offline cache" : "Cached TMDB",
        message:
          mode === "offline"
            ? "Previously loaded TMDB stats and media are available without a live request."
            : "Recent TMDB data is in use. The bundled catalog remains available as fallback.",
      };
      return cached;
    }

    if (!allowLive || !token || invalidToken || typeof options.fetchLive !== "function") {
      if (allowBundled) {
        const bundled = fallback(path, params);
        if (bundled != null) return bundled;
      }
      throw new Error(
        invalidToken
          ? "TMDB connection needs attention."
          : mode === "offline"
            ? "No cached or bundled record matched while offline-only mode is active."
            : "TMDB is required while TMDB-only mode is active.",
      );
    }

    if (inFlight.has(key)) {
      const shared = await inFlight.get(key);
      if (shared != null) return clone(shared);
    }

    const generation = (generationByKey.get(key) || 0) + 1;
    generationByKey.set(key, generation);
    const promise = runLive(key, path, params, options, generation);
    inFlight.set(key, promise);
    try {
      return await promise;
    } catch (error) {
      const cachedAfterFailure = readCache(key, options.storage);
      if (cachedAfterFailure != null) {
        status = {
          mode: "cached",
          state: "attention",
          label: "Cached TMDB",
          message: "Live TMDB was unavailable, so recent cached data is in use.",
        };
        return cachedAfterFailure;
      }
      const fallbackValue = allowBundled ? fallback(path, params) : null;
      if (fallbackValue != null) {
        if (error?.name === "AbortError") {
          setBundledStatus("TMDB took too long, so the offline catalog is active.");
        }
        return fallbackValue;
      }
      if (isPositiveIdPath(path)) throw error;
      throw new Error("Live data was unavailable and no bundled record matched this request.");
    } finally {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    }
  }

  function debugState() {
    return {
      inFlight: inFlight.size,
      controllers: controllers.size,
      invalidToken,
      dataMode,
      status: getStatus(),
    };
  }

  return Object.freeze({
    CACHE_PREFIX,
    CACHE_SCHEMA,
    CACHE_TTL_MS,
    request,
    getStatus,
    resetConnection,
    setDataMode,
    getDataMode,
    setOfflineEnabled,
    getOfflineEnabled,
    clearCache,
    readCache,
    writeCache,
    debugState,
  });
});
