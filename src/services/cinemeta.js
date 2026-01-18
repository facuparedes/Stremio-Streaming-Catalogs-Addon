/**
 * Fetch metadata from Cinemeta API
 * @param {string} imdbId - IMDB ID (e.g., "tt1234567")
 * @param {string} type - Content type: "MOVIE" or "SHOW" (or "movie"/"series")
 * @param {string} fallbackTitle - Title to use if Cinemeta fails
 * @returns {Promise<object|null>} Metadata object or null if fetch fails
 */
export async function fetchCinemetaMeta(imdbId, type, fallbackTitle = null) {
  // Normalize type to cinemeta format
  const cinemetaType =
    type === "MOVIE" || type === "movie" ? "movie" : "series";

  try {
    const response = await fetch(
      `https://v3-cinemeta.strem.io/meta/${cinemetaType}/${imdbId}.json`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (response.ok) {
      const data = await response.json();
      if (data?.meta) {
        return {
          ...data.meta,
          id: imdbId,
          name: data.meta.name || fallbackTitle,
          videos: undefined, // Remove videos array
        };
      }
    }
  } catch (error) {
    console.log(`Cinemeta fetch failed for ${imdbId}:`, error.message);
  }

  return null;
}

/**
 * Get basic metadata fallback when Cinemeta is unavailable
 * @param {string} imdbId - IMDB ID
 * @param {string} title - Title
 * @param {string} type - Content type: "movie" or "series"
 * @returns {object} Basic metadata object
 */
export function getBasicMeta(imdbId, title, type) {
  return {
    id: imdbId,
    name: title,
    type: type === "MOVIE" || type === "movie" ? "movie" : "series",
    poster: `https://live.metahub.space/poster/medium/${imdbId}/img`,
    posterShape: "poster",
  };
}
