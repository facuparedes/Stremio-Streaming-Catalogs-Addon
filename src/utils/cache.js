import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : "";

const CACHE_DIR = __dirname ? path.join(__dirname, "../../cache") : "/tmp";

/**
 * Ensure cache directory exists
 */
export function ensureCacheDir() {
  try {
    if (fs.existsSync && !fs.existsSync(CACHE_DIR)) {
      if (fs.mkdirSync) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
    }
  } catch (error) {
    // Ignore fs errors in environments like Cloudflare Workers
    console.debug("Cache directory not available:", error.message);
  }
}

/**
 * Load catalog cache from disk
 */
export function loadCatalogCache(refreshInterval = 21600000) {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "catalog-cache.json");

  try {
    if (fs.existsSync && fs.existsSync(cacheFile)) {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      const now = Date.now();

      // Check if cache is still valid
      if (cacheData.timestamp && now - cacheData.timestamp < refreshInterval) {
        console.log("Loading catalog data from cache...");
        return {
          movies: cacheData.movies || {},
          series: cacheData.series || {},
        };
      } else {
        console.log("Cache expired, will fetch fresh data...");
      }
    }
  } catch (error) {
    console.log("Error loading cache:", error.message);
  }
  return null;
}

/**
 * Save catalog cache to disk
 */
export function saveCatalogCache(movies, series) {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "catalog-cache.json");

  try {
    const cacheData = {
      timestamp: Date.now(),
      movies,
      series,
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log("Catalog data cached successfully");
  } catch (error) {
    console.log("Error saving cache:", error.message);
  }
}

/**
 * Clear catalog cache
 */
export function clearCatalogCache() {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "catalog-cache.json");

  try {
    if (fs.existsSync && fs.existsSync(cacheFile)) {
      if (fs.unlinkSync) {
        fs.unlinkSync(cacheFile);
        console.log("Cache cleared successfully");
      }
    }
  } catch (error) {
    console.log("Error clearing cache:", error.message);
  }
}

/**
 * Load resolution cache from disk
 */
export function loadResolutionCache(cacheDurationMs = 7 * 24 * 60 * 60 * 1000) {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "netflix-top10-resolved.json");

  try {
    if (fs.existsSync && fs.existsSync(cacheFile)) {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      const now = Date.now();

      // Check if cache is still valid
      if (cacheData.timestamp && now - cacheData.timestamp < cacheDurationMs) {
        return cacheData.resolutions || {};
      }
    }
  } catch (error) {
    console.log("Error loading resolution cache:", error.message);
  }
  return {};
}

/**
 * Save resolution cache to disk
 */
export function saveResolutionCache(resolutions) {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "netflix-top10-resolved.json");

  try {
    const cacheData = {
      timestamp: Date.now(),
      resolutions,
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.log("Error saving resolution cache:", error.message);
  }
}

/**
 * Load Netflix Top 10 catalog cache from disk
 * Cache duration: 24 hours (daily refresh)
 * Returns object with catalogs and timestamp
 */
export function loadNetflixTop10Cache(cacheDurationMs = 24 * 60 * 60 * 1000) {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "netflix-top10-catalog.json");

  try {
    if (fs.existsSync && fs.existsSync(cacheFile)) {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      const now = Date.now();

      // Check if cache is still valid
      if (cacheData.timestamp && now - cacheData.timestamp < cacheDurationMs) {
        return {
          catalogs: cacheData.catalogs || {},
          timestamp: cacheData.timestamp,
        };
      } else {
        console.log(
          "Netflix Top 10 catalog cache expired, will fetch fresh data",
        );
      }
    }
  } catch (error) {
    console.log("Error loading Netflix Top 10 catalog cache:", error.message);
  }
  return {
    catalogs: {},
    timestamp: null,
  };
}

/**
 * Save Netflix Top 10 catalog cache to disk
 */
export function saveNetflixTop10Cache(catalogs) {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, "netflix-top10-catalog.json");

  try {
    const cacheData = {
      timestamp: Date.now(),
      catalogs,
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log("Netflix Top 10 catalog cache saved successfully");
  } catch (error) {
    console.log("Error saving Netflix Top 10 catalog cache:", error.message);
  }
}
