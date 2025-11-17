# Netflix Tudum Top 10 API Documentation

This document describes the Netflix Tudum Top 10 data sources discovered through reverse engineering.

## Data Sources

Netflix Tudum exposes Top 10 data through multiple endpoints:

### 1. TSV Files (Public Data)

Netflix provides three TSV files containing Top 10 data:

#### Global Most Popular (All-Time)
- **URL**: `https://www.netflix.com/tudum/top10/data/most-popular.tsv`
- **Description**: Contains the most popular titles across all time (first 91 days)
- **Categories**: 
  - Films (English)
  - Films (Non-English)
  - TV (English)
  - TV (Non-English)
- **Columns**: `category`, `rank`, `show_title`, `season_title`, `hours_viewed_first_91_days`, `runtime`, `views_first_91_days`
- **Use Case**: All-time most popular content

#### All Weeks Global
- **URL**: `http://www.netflix.com/tudum/top10/data/all-weeks-global.tsv`
- **Description**: Complete historical global Top 10 data for all weeks since 2021
- **Columns**: `week`, `category`, `weekly_rank`, `show_title`, `season_title`, `weekly_hours_viewed`, `runtime`, `weekly_views`, `cumulative_weeks_in_top_10`
- **Categories**: 
  - Films (English)
  - Films (Non-English)
  - TV (English)
  - TV (Non-English)
- **Time Range**: From 2021-07-04 to present
- **Use Case**: Global Top 10 lists, historical weekly trends (aggregated across all countries)
- **Update Frequency**: Weekly (typically updated on Sundays)
- **Limitation**: Does not include release year, making it difficult to match titles to IMDB/TMDB IDs

#### All Countries, All Weeks
- **URL**: `https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv`
- **Description**: Complete historical Top 10 data for all countries and all weeks since 2021
- **Columns**: `country_name`, `country_iso2`, `week`, `category`, `weekly_rank`, `show_title`, `season_title`, `cumulative_weeks_in_top_10`
- **Categories**: `Films` or `TV`
- **Countries**: 90+ countries (ISO2 codes)
- **Time Range**: From 2021-07-04 to present
- **Use Case**: Country-specific Top 10 lists, historical data, weekly trends
- **Update Frequency**: Weekly (typically updated on Sundays)
- **Limitation**: Does not include release year, making it difficult to match titles to IMDB/TMDB IDs

### 2. GraphQL API

Netflix Tudum uses a GraphQL API with persisted queries for dynamic Top 10 data.

#### Endpoint
- **URL**: `https://pulse.prod.cloud.netflix.com/graphql`
- **Method**: POST
- **Content-Type**: `application/json`

#### Persisted Query
Netflix uses persisted queries (query ID + version) instead of sending full query strings:

- **Operation Name**: `PulsePageQuery`
- **Persisted Query ID**: `10ca20d3-e892-44af-b52a-f1107400a873`
- **Version**: `102`

#### Query Structure
```json
{
  "operationName": "PulsePageQuery",
  "variables": {
    "withProfile": false,
    "url": "/top10/{country-slug}/{type}",
    "params": {
      "isWebView": false
    }
  },
  "extensions": {
    "persistedQuery": {
      "id": "10ca20d3-e892-44af-b52a-f1107400a873",
      "version": 102
    }
  }
}
```

#### URL Patterns
- Country-specific: `/top10/{country-slug}/tv` or `/top10/{country-slug}` (movies)
- Global: `/top10/global/tv` or `/top10/global` (movies)
- Historical week: `/top10/{country-slug}/tv?week=2021-07-04`

#### Country Slugs
Country slugs are lowercase with hyphens (e.g., `united-kingdom`, `united-states`, `netherlands`).
See `scripts/netflixTop10.js` for the complete mapping of ISO country codes to slugs.

#### Response Structure
The GraphQL response contains:
- `pulsePage.sections[]` - Page sections
- `pulsePage.sections[].entities[]` - Top 10 items (type: `PulseTop10ItemEntity`)
- Each entity contains:
  - `top10.weeklyRank` - Rank (1-10)
  - `top10.weekEndDate` - Week end date
  - `top10.cumulativeWeeksInTop10` - Weeks in top 10
  - `top10Video.title` - Title
  - `top10Video.shortSynopsis` - Synopsis
  - `top10Video.releaseYear` - Release year
  - `top10Video.videoId` - Netflix video ID
  - `top10Video.maturityRating` - Content rating
  - `countryRanks[]` - Country-specific ranks
  - `artwork` - Images (logo, SDP, story art)

See `docs/netflix.graphql` for the complete GraphQL schema.

## Discovery Method

### window.netflix.reactContext

All information was discovered by analyzing `window.netflix.reactContext` embedded in the HTML of Netflix Tudum pages.

#### Location
The `reactContext` is embedded in a `<script>` tag on pages like:
- `https://www.netflix.com/tudum/top10/global/tv`
- `https://www.netflix.com/tudum/top10/{country-slug}/tv`

#### Extraction
```javascript
// Find in HTML
const marker = 'netflix.reactContext = ';
const start = html.indexOf(marker);
const fromMarker = html.slice(start + marker.length);
const end = fromMarker.indexOf('</script>');
const raw = fromMarker.slice(0, end).trim();

// Decode escape sequences
const sanitized = raw.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
  String.fromCharCode(parseInt(hex, 16))
);

const context = JSON.parse(sanitized);
```

#### Contents
The `reactContext` contains:
- `models.graphql.data` - Complete GraphQL response data
- `models.graphql.data.ROOT_QUERY` - Root query data including:
  - `currentCountry` - Current country information
  - `pulsePage` - Top 10 page data
- `countries` - Array of available countries with:
  - `displayName` - Display name (e.g., "Hong Kong", may contain `\x20` for spaces)
  - `urlSegment` - URL slug for the country (e.g., "hong-kong")
- Country slugs can be extracted from `pulsePage` URL keys or from the `countries` array
- Top 10 entries are in `pulsePage.sections[].entities[]`

Example `countries` array entry:
```javascript
{
  "displayName": "Hong\x20Kong",
  "urlSegment": "hong-kong"
}
```

#### GraphQL Query Discovery
The persisted query ID and structure were discovered by:
1. Opening browser DevTools (F12 or right-click → Inspect)
2. Going to Network tab
3. Filtering by "graphql" string
4. Navigating to a Netflix Tudum Top 10 page
5. Finding the GraphQL request to `pulse.prod.cloud.netflix.com/graphql`
6. Inspecting the request payload to see the `persistedQuery.id` and `version`

Example request payload found:
```json
{
  "operationName": "PulsePageQuery",
  "variables": {
    "withProfile": false,
    "url": "/top10/united-kingdom/tv",
    "params": { "isWebView": false }
  },
  "extensions": {
    "persistedQuery": {
      "id": "10ca20d3-e892-44af-b52a-f1107400a873",
      "version": 102
    }
  }
}
```

**Note**: The persisted query ID and version may change over time. If queries start failing, check the Network tab again to find the updated ID/version.

## Usage Notes

### TSV Files
- **Caching**: Recommended to cache TSV files locally (download once per week)
- **File Sizes**: 
  - `all-weeks-countries.tsv` is large (~26MB+) but manageable
  - `all-weeks-global.tsv` is smaller (aggregated data, no country breakdown)
  - `most-popular.tsv` is small (all-time aggregated data)
- **Parsing**: Simple TSV format, easy to parse and index
- **Reliability**: Public endpoints, stable URLs
- **Limitation**: TSV files do not include release year, making it difficult to match titles to IMDB/TMDB IDs. For title matching purposes, the GraphQL API is recommended as it includes `releaseYear` in the response.

### GraphQL API
- **Rate Limiting**: Unknown, but be respectful
- **Authentication**: Some fields require authentication (returns `UNAUTHENTICATED` errors)
- **Errors**: Non-critical errors (UNAUTHENTICATED, video not found) can be ignored
- **Persisted Query**: The query ID and version may change - monitor for updates
- **Week Parameter**: Historical weeks may not be supported for all countries
- **Advantage**: Includes `releaseYear` field, making it easier to match titles to IMDB/TMDB IDs compared to TSV files

### Country Codes
- Use ISO2 country codes (e.g., `US`, `GB`, `NL`)
- Map to country slugs for GraphQL URLs (see `scripts/netflixTop10.js`)
- Country slugs can be extracted from:
  - TSV file: `all-weeks-countries.tsv` (country names mapped to slugs)
  - `reactContext.countries` array (contains `displayName` and `urlSegment` for each country)

## References

- Netflix Tudum Top 10: https://www.netflix.com/tudum/top10/
- TSV Data: https://www.netflix.com/tudum/top10/data/
- GraphQL Endpoint: https://pulse.prod.cloud.netflix.com/graphql

