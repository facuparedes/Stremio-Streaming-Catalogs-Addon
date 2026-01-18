import {
  getNetflixTop10Catalog,
  getNetflixTop10Global,
} from "../../services/netflix/resolver.js";
import { replaceRpdbPosters } from "../../lib/stremio.js";
import justwatch from "../../services/justwatch.js";

// In-memory cache for localized catalogs
const localizedCache = {
  movie: {},
  series: {},
};

/**
 * Catalog route handler
 */
export async function handleCatalog(req, res, movies, series, mixpanel) {
  res.setHeader(
    "Cache-Control",
    "max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public",
  );
  res.setHeader("content-type", "application/json");

  // Parse config
  // Ensure configuration is URL-decoded before base64 decoding (for Cloudflare)
  const configParam = req.params?.configuration || "";
  const decodedConfigParam = configParam.includes("%")
    ? decodeURIComponent(configParam)
    : configParam;
  const buffer = Buffer.from(decodedConfigParam, "base64");
  const configString = buffer.toString("ascii");
  const configParts = configString.split(":");
  let [
    token,
    selectedProviders,
    rpdbKey,
    countryCode,
    installedAt,
    netflixTop10Global,
    netflixTop10Country,
    netflixTop10CountryCode,
    language,
  ] = configParts;

  // Handle legacy RPDB key format
  if (String(rpdbKey || "").startsWith("16")) {
    installedAt = rpdbKey;
    rpdbKey = null;
  }

  // Default language to English
  language = language || "en";

  mixpanel &&
    mixpanel.track("catalog", {
      ip: req.ip,
      distinct_id: req.ip.replace(/\.|:/g, "Z"),
      configuration: req.params?.configuration,
      selectedProviders,
      rpdbKey,
      countryCode,
      installedAt,
      language,
      catalog_type: req.params.type,
      catalog_id: req.params.id,
      catalog_extra: req.params?.extra,
    });

  let id = req.params.id;

  // Cleanup id and extra if they contain .json extension from the URL
  if (id && id.endsWith(".json")) {
    id = id.replace(".json", "");
  }
  if (req.params.extra && req.params.extra.endsWith(".json")) {
    req.params.extra = req.params.extra.replace(".json", "");
  }

  // Legacy addon, netflix-only catalog support
  if (id === "top") {
    id = "nfx";
  }

  // Jio and Hotstar merged - fallback hst to jhs
  if (id === "hst") {
    id = "jhs";
  }

  // Handle Netflix Top 10 catalogs
  if (id.startsWith("netflix-top10-")) {
    const isGlobal = id === "netflix-top10-global";
    const countryCode = isGlobal ? null : id.replace("netflix-top10-", "");
    const type = req.params.type === "movie" ? "movies" : "shows";

    console.log(
      `Netflix Top 10 request: id=${id}, isGlobal=${isGlobal}, countryCode=${countryCode}, type=${type}`,
    );

    try {
      let metas;
      if (isGlobal) {
        console.log(`Fetching global Netflix Top 10 (${type}) in ${language}`);
        metas = await getNetflixTop10Global(type, language);
      } else {
        console.log(
          `Fetching Netflix Top 10 for country ${countryCode} (${type}) in ${language}`,
        );
        metas = await getNetflixTop10Catalog(countryCode, type, language);
      }
      console.log(`Returning ${metas.length} metas for ${id}`);
      res.send({ metas: replaceRpdbPosters(rpdbKey, metas) });
    } catch (error) {
      console.error(
        `Error fetching Netflix Top 10 catalog ${id}:`,
        error.message,
      );
      if (error.stack) {
        console.error(error.stack);
      }
      // Make sure response hasn't been sent yet
      if (!res.headersSent) {
        res.send({ metas: [] });
      }
    }
    return;
  }

  // Handle regular provider catalogs
  const type = req.params.type;
  const country = countryCode || "US";
  const lang = language || "en";
  // Include type in cache key and use a more descriptive name
  const cacheKey = `${type}:${id}:${country}:${lang}`;

  let metas = [];

  // Use pre-cached data for default language (English)
  // This maintains performance for the majority of users
  if (
    lang === "en" &&
    (type === "movie" ? movies[id] : series[id])?.length > 0
  ) {
    metas = type === "movie" ? movies[id] : series[id];
  } else {
    // Check in-memory localized cache
    if (localizedCache[type] && localizedCache[type][cacheKey]) {
      metas = localizedCache[type][cacheKey];
    } else {
      try {
        console.log(`Fetching localized catalog for ${id} (${type}): ${cacheKey}`);
        metas = await justwatch.getMetas(
          type === "movie" ? "MOVIE" : "SHOW",
          [id],
          country,
          lang,
        );

        // Only cache if we got results
        if (metas && metas.length > 0) {
          if (!localizedCache[type]) localizedCache[type] = {};
          localizedCache[type][cacheKey] = metas;
        }
      } catch (error) {
        console.error(
          `Error fetching localized catalog ${cacheKey}:`,
          error.message,
        );
        metas = [];
      }
    }
  }

  if (!res.headersSent) {
    res.send({ metas: replaceRpdbPosters(rpdbKey, metas || []) });
  }
}
