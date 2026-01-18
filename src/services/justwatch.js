import { fetchCinemetaMeta, getBasicMeta } from "./cinemeta.js";

const AMOUNT = 30;
const AMOUNT_TO_VERIFY = 5;
const SUBREQUEST_LIMIT = 45; // Stay below Cloudflare's 50 limit
const DUPES_CACHE = {};
const DELETED_CACHE = [];

export default {
  verify: true,
  async getLatest(
    type = "MOVIE",
    providers = ["nfx"],
    country = "GB",
    language = "en",
  ) {
    // todo
  },
  async getMetas(
    type = "MOVIE",
    providers = ["nfx"],
    country = "GB",
    language = "en",
  ) {
    let res = null;
    try {
      const response = await fetch("https://apis.justwatch.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationName: "GetPopularTitles",
          variables: {
            popularTitlesSortBy: "TRENDING",
            first: AMOUNT,
            platform: "WEB",
            sortRandomSeed: 0,
            popularAfterCursor: "",
            offset: null,
            popularTitlesFilter: {
              ageCertifications: [],
              excludeGenres: [],
              excludeProductionCountries: [],
              genres: [],
              objectTypes: [type],
              productionCountries: [],
              packages: providers,
              excludeIrrelevantTitles: false,
              presentationTypes: [],
              monetizationTypes: [],
            },
            language: language,
            country: country,
          },
          query:
            "query GetPopularTitles(\n  $country: Country!\n  $popularTitlesFilter: TitleFilter\n  $popularAfterCursor: String\n  $popularTitlesSortBy: PopularTitlesSorting! = POPULAR\n  $first: Int!\n  $language: Language!\n  $offset: Int = 0\n  $sortRandomSeed: Int! = 0\n  $profile: PosterProfile\n  $backdropProfile: BackdropProfile\n  $format: ImageFormat\n) {\n  popularTitles(\n    country: $country\n    filter: $popularTitlesFilter\n    offset: $offset\n    after: $popularAfterCursor\n    sortBy: $popularTitlesSortBy\n    first: $first\n    sortRandomSeed: $sortRandomSeed\n  ) {\n    totalCount\n    pageInfo {\n      startCursor\n      endCursor\n      hasPreviousPage\n      hasNextPage\n      __typename\n    }\n    edges {\n      ...PopularTitleGraphql\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment PopularTitleGraphql on PopularTitlesEdge {\n  cursor\n  node {\n    id\n    objectId\n    objectType\n    content(country: $country, language: $language) {\n      externalIds {\n        imdbId\n      }\n      title\n      shortDescription\n      fullPath\n      scoring {\n        imdbScore\n        __typename\n      }\n      posterUrl(profile: $profile, format: $format)\n      ... on ShowContent {\n        backdrops(profile: $backdropProfile, format: $format) {\n          backdropUrl\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
        }),
      });
      res = { data: await response.json() };
    } catch (e) {
      console.error(e.message);
      return [];
    }

    console.log(providers.join(","), res.data.data.popularTitles.edges.length);

    return (
      await Promise.all(
        res.data.data.popularTitles.edges.map(async (item, index) => {
          let imdbId = item.node.content.externalIds.imdbId;

          if (!imdbId || DELETED_CACHE.includes(imdbId)) {
            if (imdbId) console.log("deleted cache hit");

            return null;
          }

          if (DUPES_CACHE[imdbId]) {
            console.log("dupe cache hit");
            imdbId = DUPES_CACHE[imdbId];
          } else if (index < AMOUNT_TO_VERIFY && this.verify) {
            try {
              const headRes = await fetch(
                `https://www.imdb.com/title/${imdbId}/`,
                {
                  method: "HEAD",
                  redirect: "manual",
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/110.0",
                  },
                },
              );

              if (
                headRes.status === 308 ||
                headRes.status === 301 ||
                headRes.status === 302
              ) {
                const newImdbId = headRes.headers
                  .get("location")
                  ?.split("/")?.[2];
                console.log("DUPE imdb redirects to", newImdbId);
                DUPES_CACHE[imdbId] = newImdbId;
                imdbId = newImdbId;
              } else if (headRes.status === 404) {
                console.log("imdb does not exist");
                DELETED_CACHE.push(imdbId);
                return null;
              }
            } catch (e) {
              console.error("Stop verifying, IMDB error", e.message);
              this.verify = false;
            }
          }

          const posterId = item?.node?.content?.posterUrl
            ?.match(/\/poster\/([0-9]+)\//)
            ?.pop();
          let posterUrl;
          if (posterId) {
            posterUrl = `https://images.justwatch.com/poster/${posterId}/s332/img`;
          } else {
            posterUrl = `https://live.metahub.space/poster/medium/${imdbId}/img`;
          }

          // get better metadata from cinemeta
          const cinemetaMeta = await fetchCinemetaMeta(
            imdbId,
            type,
            item.node.content.title,
          );

          if (cinemetaMeta) {
            return {
              ...cinemetaMeta,
              name: item.node.content.title || cinemetaMeta.name,
              description:
                item.node.content.shortDescription || cinemetaMeta.description,
              poster: posterUrl, // Use JustWatch poster URL
            };
          }

          // Fallback to basic metadata
          return {
            ...getBasicMeta(imdbId, item.node.content.title, type),
            description: item.node.content.shortDescription,
            poster: posterUrl, // Use JustWatch poster URL
          };
        }),
      )
    ).filter((item) => item?.id);
  },
};
