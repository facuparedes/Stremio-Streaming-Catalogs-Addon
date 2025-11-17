import axios from 'axios';

/**
 * Fetch metadata from Cinemeta API
 * @param {string} imdbId - IMDB ID (e.g., "tt1234567")
 * @param {string} type - Content type: "MOVIE" or "SHOW" (or "movie"/"series")
 * @param {string} fallbackTitle - Title to use if Cinemeta fails
 * @returns {Promise<object|null>} Metadata object or null if fetch fails
 */
export async function fetchCinemetaMeta(imdbId, type, fallbackTitle = null) {
  // Normalize type to cinemeta format
  const cinemetaType = type === 'MOVIE' || type === 'movie' ? 'movie' : 'series';
  
  try {
    const cinemetaResponse = await axios.get(
      `https://v3-cinemeta.strem.io/meta/${cinemetaType}/${imdbId}.json`,
      { timeout: 5000, validateStatus: (status) => status < 500 } // Don't throw on 404
    );

    if (cinemetaResponse.status === 200 && cinemetaResponse.data?.meta) {
      return {
        ...cinemetaResponse.data.meta,
        id: imdbId,
        name: cinemetaResponse.data.meta.name || fallbackTitle,
        videos: undefined, // Remove videos array
      };
    }
  } catch (error) {
    // If cinemeta fails (network error, timeout, etc), return null
    // 404s are handled by validateStatus above
    if (error.code !== 'ECONNABORTED' && error.response?.status !== 404) {
      console.log(`Cinemeta fetch failed for ${imdbId}:`, error.message);
    }
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
    type: type === 'MOVIE' || type === 'movie' ? 'movie' : 'series',
    poster: `https://live.metahub.space/poster/medium/${imdbId}/img`,
    posterShape: 'poster',
  };
}

