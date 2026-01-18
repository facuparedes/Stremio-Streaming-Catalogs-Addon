import { fetchNetflixTop10 } from "./fetcher.js";
import {
  loadResolutionCache,
  saveResolutionCache,
  loadNetflixTop10Cache,
  saveNetflixTop10Cache,
} from "../../utils/cache.js";
import { fetchCinemetaMeta, getBasicMeta } from "../cinemeta.js";

// Add delay between JustWatch requests to avoid rate limiting
const JUSTWATCH_DELAY_MS = 200;

const JUSTWATCH_GRAPHQL_ENDPOINT = "https://apis.justwatch.com/graphql";

// In-memory cache for resolved titles
let resolutionCache = loadResolutionCache();

// In-memory cache for Netflix Top 10 catalogs
// Structure: { catalogs: { "US:movies": [...], "NL:shows": [...] }, timestamp: Date.now() }
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
let catalogCacheData = loadNetflixTop10Cache(CACHE_DURATION_MS);
let catalogCache = catalogCacheData.catalogs;

/**
 * Generate cache key for a title
 */
function getCacheKey(title, releaseYear, type, language = "en") {
  return `${type}:${title}:${releaseYear}:${language}`.toLowerCase();
}

/**
 * Search JustWatch for a title by name, year, and optionally Netflix provider
 */
async function searchJustWatchByTitle(
  title,
  releaseYear,
  country = "US",
  type = "MOVIE",
  language = "en",
  withNetflixFilter = true,
) {
  if (!title || !releaseYear) {
    return null;
  }

  const filter = {
    searchQuery: title,
    objectTypes: [], // [type]
  };

  // Optionally filter by Netflix provider
  //if (withNetflixFilter) {
  filter.packages = ["nfx"];
  //}

  const query = {
    operationName: "SearchTitles",
    variables: {
      country,
      language,
      first: 10,
      filter,
    },
    query: `
      query SearchTitles(
        $country: Country!
        $language: Language!
        $first: Int!
        $filter: TitleFilter
      ) {
        popularTitles(
          country: $country
          filter: $filter
          first: $first
          sortBy: POPULAR
        ) {
          edges {
            node {
              id
              objectId
              objectType
              content(country: $country, language: $language) {
                title
                originalReleaseYear
                shortDescription
                posterUrl
                externalIds {
                  imdbId
                }
              }
            }
          }
        }
      }
    `,
  };

  try {
    const rawResponse = await fetch(JUSTWATCH_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(10000),
    });

    const data = await rawResponse.json();

    if (data.errors) {
      return null;
    }

    const edges = data.data?.popularTitles?.edges || [];

    if (edges.length === 0) {
      return null;
    }

    // Try to find best match:
    // 1. Exact title + exact year
    // 2. Exact title + year within ±1
    // 3. Title contains search term + year match (±1)
    // 4. First result with year match (±1)
    // 5. First result (fallback)

    const normalizedSearchTitle = title.toLowerCase().trim();

    // Helper to normalize titles for comparison (remove punctuation, extra spaces)
    const normalizeForMatch = (str) => {
      return str
        .toLowerCase()
        .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
        .replace(/\s+/g, " ") // Normalize spaces
        .trim();
    };

    const normalizedSearch = normalizeForMatch(title);

    // 1. Exact title + exact year
    const exactMatch = edges.find((edge) => {
      const content = edge.node.content;
      const edgeTitle = content?.title?.toLowerCase().trim();
      const edgeYear = content?.originalReleaseYear;
      return edgeTitle === normalizedSearchTitle && edgeYear === releaseYear;
    });

    if (exactMatch) return exactMatch;

    // 2. Normalized title match + exact year
    const normalizedExactMatch = edges.find((edge) => {
      const content = edge.node.content;
      const edgeTitle = normalizeForMatch(content?.title || "");
      const edgeYear = content?.originalReleaseYear;
      return edgeTitle === normalizedSearch && edgeYear === releaseYear;
    });

    if (normalizedExactMatch) return normalizedExactMatch;

    // 3. Exact title + year within ±1
    const fuzzyYearMatch = edges.find((edge) => {
      const content = edge.node.content;
      const edgeTitle = content?.title?.toLowerCase().trim();
      const edgeYear = content?.originalReleaseYear;
      const yearDiff = Math.abs(edgeYear - releaseYear);
      return edgeTitle === normalizedSearchTitle && yearDiff <= 1;
    });

    if (fuzzyYearMatch) return fuzzyYearMatch;

    // 4. Title contains search term
    const containsMatch = edges.find((edge) => {
      const content = edge.node.content;
      const edgeTitle = normalizeForMatch(content?.title || "");
      return (
        edgeTitle.includes(normalizedSearch) ||
        normalizedSearch.includes(edgeTitle)
      );
    });

    if (containsMatch) return containsMatch;

    return null;
  } catch (error) {
    // Don't log 404s or network errors as errors, they're expected
    if (error.response?.status !== 404 && error.code !== "ECONNABORTED") {
      console.error("Error searching JustWatch:", error.message);
    }
    return null;
  }
}

/**
 * Generate title variations for better matching
 */
function generateTitleVariations(title) {
  const variations = [title];

  // Handle "Vol. 1", "Volume 1", "Part 1" variations (for movies)
  const volPatterns = [
    /:\s*Vol\.\s*\d+/i,
    /:\s*Volume\s*\d+/i,
    /:\s*Part\s*\d+/i,
    /\s*Vol\.\s*\d+/i,
    /\s*Volume\s*\d+/i,
    /\s*Part\s*\d+/i,
  ];

  for (const pattern of volPatterns) {
    if (pattern.test(title)) {
      const withoutVol = title.replace(pattern, "").trim();
      if (withoutVol && !variations.includes(withoutVol)) {
        variations.push(withoutVol);
      }
    }
  }

  // Remove "The" prefix for matching
  if (title.match(/^the\s+/i)) {
    const withoutThe = title.replace(/^the\s+/i, "").trim();
    if (withoutThe && !variations.includes(withoutThe)) {
      variations.push(withoutThe);
    }
  }

  return variations;
}

/**
 * Resolve a Netflix title to IMDB ID and metadata
 */
async function resolveTitle(
  title,
  releaseYear,
  type,
  country = "US",
  language = "en",
) {
  if (!title || !releaseYear) {
    return null;
  }

  // Check cache first
  const cacheKey = getCacheKey(title, releaseYear, type, language);
  if (resolutionCache[cacheKey]) {
    return resolutionCache[cacheKey];
  }

  const justwatchType = type === "shows" ? "SHOW" : "MOVIE";

  // Generate title variations
  const titleVariations = generateTitleVariations(title);

  // Try each variation, first with Netflix filter, then without
  let justwatchResult = null;

  for (const searchTitle of titleVariations) {
    // Try with Netflix provider filter first
    justwatchResult = await searchJustWatchByTitle(
      searchTitle,
      releaseYear,
      country,
      justwatchType,
      language,
      true, // withNetflixFilter
    );

    if (justwatchResult) {
      break;
    }

    // If not found with Netflix filter, try without (movie might not be on Netflix in this country)
    justwatchResult = await searchJustWatchByTitle(
      searchTitle,
      releaseYear,
      country,
      justwatchType,
      language,
      false, // withoutNetflixFilter
    );

    if (justwatchResult) {
      break;
    }
  }

  if (!justwatchResult) {
    resolutionCache[cacheKey] = null;
    saveResolutionCache(resolutionCache);
    return null;
  }

  const content = justwatchResult.node.content;
  const imdbId = content?.externalIds?.imdbId;

  if (!imdbId) {
    resolutionCache[cacheKey] = null;
    saveResolutionCache(resolutionCache);
    console.warn(`No IMDB ID found for ${title} (${releaseYear})`);
    return null;
  }

  const posterId = content?.posterUrl?.match(/\/poster\/([0-9]+)\//)?.pop();
  let posterUrl;
  if (posterId) {
    posterUrl = `https://images.justwatch.com/poster/${posterId}/s332/img`;
  }

  const result = {
    imdbId,
    title: content.title,
    year: content.originalReleaseYear,
    description: content.shortDescription,
    poster: posterUrl,
  };

  // Cache the result
  resolutionCache[cacheKey] = result;
  saveResolutionCache(resolutionCache);

  console.log(`Resolved ${title} (${releaseYear}) to IMDB ID ${imdbId}`);

  return result;
}

/**
 * Get cache key for Netflix Top 10 catalog
 */
function getCatalogCacheKey(countryCode, type, language = "en") {
  return `${countryCode.toUpperCase()}:${type}:${language}`;
}

/**
 * Get Netflix Top 10 for a country and resolve titles to Stremio metadata
 * Uses in-memory cache with file persistence (24-hour cache duration)
 */
export async function getNetflixTop10Catalog(
  countryCode,
  type,
  language = "en",
  options = {},
) {
  const cacheKey = getCatalogCacheKey(countryCode, type, language);

  // Check if cache is expired and reload if needed
  const now = Date.now();
  if (
    catalogCacheData.timestamp &&
    now - catalogCacheData.timestamp >= CACHE_DURATION_MS
  ) {
    console.log("Netflix Top 10 catalog cache expired, reloading from disk...");
    catalogCacheData = loadNetflixTop10Cache(CACHE_DURATION_MS);
    catalogCache = catalogCacheData.catalogs;
  }

  // Check in-memory cache first
  if (catalogCache[cacheKey]) {
    console.log(`Netflix Top 10 cache hit: ${cacheKey}`);
    return catalogCache[cacheKey];
  }

  console.log(`Netflix Top 10 cache miss: ${cacheKey}, fetching...`);

  try {
    // Fetch Netflix Top 10
    const netflixData = await fetchNetflixTop10(countryCode, type, options);

    if (
      !netflixData ||
      !netflixData.results ||
      netflixData.results.length === 0
    ) {
      // Cache empty result to avoid repeated fetches
      catalogCache[cacheKey] = [];
      catalogCacheData.catalogs = catalogCache;
      catalogCacheData.timestamp = Date.now();
      saveNetflixTop10Cache(catalogCache);
      return [];
    }

    const stremioType = type === "shows" ? "series" : "movie";
    const justwatchType = type === "shows" ? "SHOW" : "MOVIE";

    // Resolve titles to IMDB IDs and fetch metadata
    const metas = [];
    for (let i = 0; i < netflixData.results.length; i++) {
      const item = netflixData.results[i];

      // Add delay between JustWatch requests
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, JUSTWATCH_DELAY_MS));
      }

      const resolution = await resolveTitle(
        item.title,
        item.releaseYear,
        type,
        countryCode,
        language,
      );

      if (!resolution || !resolution.imdbId) {
        continue;
      }

      const imdbId = resolution.imdbId;

      // Fetch metadata from cinemeta
      const justwatchType = type === "shows" ? "SHOW" : "MOVIE";
      let meta = await fetchCinemetaMeta(
        imdbId,
        justwatchType,
        resolution.title || item.title,
      );

      if (meta) {
        meta.name = resolution.title || meta.name;
        meta.description = resolution.description || meta.description;
        meta.poster = resolution.poster || meta.poster;
      }

      // Fallback: return basic metadata
      if (!meta) {
        meta = getBasicMeta(
          imdbId,
          resolution.title || item.title,
          stremioType,
        );
        meta.description = resolution.description;
        meta.poster = resolution.poster || meta.poster;
      }

      if (meta) {
        metas.push(meta);
      }
    }

    // Cache the resolved metas
    catalogCache[cacheKey] = metas;
    catalogCacheData.catalogs = catalogCache;
    catalogCacheData.timestamp = Date.now();
    saveNetflixTop10Cache(catalogCache);
    console.log(`Netflix Top 10 cached: ${cacheKey} (${metas.length} items)`);

    // Return resolved metas
    return metas;
  } catch (error) {
    console.error(
      `Error getting Netflix Top 10 for ${countryCode} ${type}:`,
      error.message,
    );
    // Cache empty result on error to avoid repeated failed fetches
    catalogCache[cacheKey] = [];
    catalogCacheData.catalogs = catalogCache;
    catalogCacheData.timestamp = Date.now();
    saveNetflixTop10Cache(catalogCache);
    return [];
  }
}

/**
 * Get global Netflix Top 10 (aggregated across all countries)
 * For now, we'll use US as the global source
 */
export async function getNetflixTop10Global(
  type,
  language = "en",
  options = {},
) {
  return getNetflixTop10Catalog("US", type, language, options);
}
