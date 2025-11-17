/**
 * Replace posters with RPDB (Rating Poster DB) URLs if RPDB key is provided
 */
export function replaceRpdbPosters(rpdbKey, metas) {
  if (!rpdbKey) {
    return metas;
  }

  return metas.map(meta => {
    return {
      ...meta,
      poster: `https://api.ratingposterdb.com/${rpdbKey}/imdb/poster-default/${meta.id}.jpg`
    };
  });
}

