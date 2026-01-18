import axios from "axios";
import https from "node:https";

const GRAPHQL_ENDPOINT = "https://pulse.prod.cloud.netflix.com/graphql";
const PERSISTED_QUERY_ID = "10ca20d3-e892-44af-b52a-f1107400a873";
const PERSISTED_QUERY_VERSION = 102;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Content-Type": "application/json",
  Accept: "application/json",
};

// Map ISO country codes to Netflix display names
// These are the canonical display names used by Netflix (extracted from reactContext)
const ISO_TO_DISPLAY_NAME = {
  AR: "Argentina",
  AU: "Australia",
  AT: "Austria",
  BS: "Bahamas",
  BH: "Bahrain",
  BD: "Bangladesh",
  BE: "Belgium",
  BO: "Bolivia",
  BR: "Brazil",
  BG: "Bulgaria",
  CA: "Canada",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  GP: "Guadeloupe",
  GT: "Guatemala",
  HN: "Honduras",
  HK: "Hong Kong",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JO: "Jordan",
  KE: "Kenya",
  KW: "Kuwait",
  LV: "Latvia",
  LB: "Lebanon",
  LT: "Lithuania",
  LU: "Luxembourg",
  MY: "Malaysia",
  MV: "Maldives",
  MT: "Malta",
  MQ: "Martinique",
  MU: "Mauritius",
  MX: "Mexico",
  MA: "Morocco",
  NL: "Netherlands",
  NC: "New Caledonia",
  NZ: "New Zealand",
  NI: "Nicaragua",
  NG: "Nigeria",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PA: "Panama",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Romania",
  RU: "Russia",
  SA: "Saudi Arabia",
  RS: "Serbia",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  ZA: "South Africa",
  KR: "South Korea",
  ES: "Spain",
  LK: "Sri Lanka",
  SE: "Sweden",
  CH: "Switzerland",
  TW: "Taiwan",
  TH: "Thailand",
  TT: "Trinidad and Tobago",
  TR: "Türkiye",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  VE: "Venezuela",
  VN: "Vietnam",
};

/**
 * Normalize displayName to urlSegment format used by Netflix
 * Converts to lowercase, replaces spaces with hyphens, and removes accents
 */
function normalizeToUrlSegment(displayName) {
  return displayName
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
}

// Build COUNTRY_SLUGS mapping from ISO codes to urlSegments
// Generated from ISO_TO_DISPLAY_NAME by normalizing display names
const COUNTRY_SLUGS = Object.fromEntries(
  Object.entries(ISO_TO_DISPLAY_NAME).map(([iso, displayName]) => [
    iso,
    normalizeToUrlSegment(displayName),
  ]),
);

function getCountrySlug(countryCode) {
  const code = countryCode.toUpperCase();
  const slug = COUNTRY_SLUGS[code];

  if (!slug) {
    // Fallback to lowercase, but warn that it might not work
    // Most countries need explicit mapping - check https://www.netflix.com/tudum/top10/
    console.warn(
      `Warning: Country code "${code}" not mapped. Using "${code.toLowerCase()}" as slug. This may not work.`,
    );
    return code.toLowerCase();
  }

  return slug;
}

function resolveTypeSegment(type) {
  const key = type?.trim().toLowerCase();
  if (key === "shows") return "tv";
  if (key === "movies") return "";
  throw new Error('type must be "shows" or "movies"');
}

function buildGraphQLQuery(countrySlug, typeSegment, week = null) {
  let url = `/top10/${countrySlug}${typeSegment ? `/${typeSegment}` : ""}`;

  // Add week parameter if specified (format: YYYY-MM-DD)
  // If not specified, defaults to latest week
  if (week) {
    url += `?week=${week}`;
  }

  return {
    operationName: "PulsePageQuery",
    variables: {
      withProfile: false,
      url,
      params: { isWebView: false },
    },
    extensions: {
      persistedQuery: {
        id: PERSISTED_QUERY_ID,
        version: PERSISTED_QUERY_VERSION,
      },
    },
  };
}

async function fetchGraphQL(countrySlug, typeSegment, options = {}) {
  const query = buildGraphQLQuery(countrySlug, typeSegment, options.week);

  const axiosOptions = {
    method: "POST",
    url: GRAPHQL_ENDPOINT,
    headers: HEADERS,
    data: query,
    timeout: options.timeout ?? 15000,
  };

  if (options.allowInsecureTLS) {
    axiosOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false });
  }

  const { data } = await axios(axiosOptions);

  // Check for critical errors (non-authentication related, non-video-not-found)
  if (data.errors) {
    const criticalErrors = data.errors.filter(
      (e) =>
        !e.message.includes("UNAUTHENTICATED") &&
        !e.message.includes("Setting Non-null field") &&
        !e.message.includes("not found"),
    );
    if (criticalErrors.length > 0) {
      const errorMessages = criticalErrors.map((e) => e.message).join("; ");
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }
  }

  if (!data.data) {
    throw new Error("No data returned from GraphQL API");
  }

  return data.data;
}

function parseTop10Entries(graphqlData) {
  const pulsePage = graphqlData?.pulsePage;
  if (!pulsePage?.sections) {
    throw new Error("GraphQL response did not contain pulsePage sections");
  }

  const entries = [];
  const seen = new Set();

  for (const section of pulsePage.sections) {
    if (section.__typename !== "PulseEntitiesSection" || !section.entities) {
      continue;
    }

    // Only process top-10-card-list or top-10-table sections
    // If guid is empty/null, check if it contains top-10 entities
    const isTop10Section = section.guid
      ? ["top-10-card-list", "top-10-table"].includes(section.guid)
      : section.entities.some((e) => e.__typename === "PulseTop10ItemEntity");

    if (!isTop10Section) {
      continue;
    }

    for (const entity of section.entities) {
      if (entity.__typename !== "PulseTop10ItemEntity") {
        continue;
      }

      const top10 = entity?.top10;
      const video = entity?.top10Video;
      if (!top10 || !video?.videoId) {
        continue;
      }

      // Deduplicate by videoId (entries appear in both card-list and table)
      if (seen.has(video.videoId)) {
        continue;
      }

      const rank = top10.weeklyRank ?? null;
      if (rank == null) {
        continue;
      }

      seen.add(video.videoId);

      // Use parentShow.title for shows/seasons to get the show title without "Season X" suffix
      // For movies, parentShow will be null, so fall back to video.title
      const title = video.parentShow?.title ?? video.title ?? null;

      entries.push({
        rank,
        title,
        synopsis: video.shortSynopsis ?? null,
        releaseYear: video.releaseYear ?? null,
        weeksInTop10: top10.cumulativeWeeksInTop10 ?? null,
        weekEndDate: top10.weekEndDate ?? null,
        runtimeHours: top10.runtime ?? null,
        videoId: video.videoId ?? null,
        maturityRating: video.maturityRating ?? null,
        artwork: {
          logo: entity?.artwork?.logoArt?.urlsSized?.[0]?.url ?? null,
          sdp: entity?.artwork?.sdpArt?.urlsSized?.[0]?.url ?? null,
          story: entity?.artwork?.storyArt?.urlsSized?.[0]?.url ?? null,
        },
      });
    }
  }

  return entries.sort((a, b) => a.rank - b.rank);
}

/**
 * Fetches Netflix Top 10 for a given country and type.
 *
 * @param {string} countryCode - ISO country code (e.g., "NL", "US", "GB")
 * @param {string} type - Content type: "shows" or "movies"
 * @param {object} options - Optional parameters
 * @param {string} options.week - Optional week date (YYYY-MM-DD format). If omitted, returns latest week.
 * @param {boolean} options.allowInsecureTLS - Allow insecure TLS (for testing)
 * @param {number} options.timeout - Request timeout in ms (default: 15000)
 * @returns {Promise<object>} Top 10 data with results array
 *
 * Note: The persisted query ID stays the same across all weeks. The week parameter
 * is passed in the URL query string. If not specified, defaults to the latest week.
 */
export async function fetchNetflixTop10(countryCode, type, options = {}) {
  if (!countryCode) {
    throw new Error('countryCode is required (e.g., "NL", "US", "GB")');
  }

  if (!type) {
    throw new Error('type is required ("shows" or "movies")');
  }

  const countrySlug = getCountrySlug(countryCode);
  const typeSegment = resolveTypeSegment(type);
  const graphqlData = await fetchGraphQL(countrySlug, typeSegment, options);

  const entries = parseTop10Entries(graphqlData);

  return {
    countryCode: countryCode.toUpperCase(),
    type: typeSegment || "movies",
    weekEndDate: entries[0]?.weekEndDate ?? null,
    results: entries,
  };
}
