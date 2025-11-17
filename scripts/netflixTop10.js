/**
 * CLI wrapper for Netflix Top 10 fetcher
 * This script provides a command-line interface to test the Netflix Top 10 API
 */
import { fetchNetflixTop10 } from '../src/services/netflix/fetcher.js';
import { fileURLToPath } from 'url';
import path from 'path';

async function runFromCLI() {
  const [, , countryCodeArg, typeArg] = process.argv;
  
  if (!countryCodeArg || !typeArg) {
    console.error('Usage: node scripts/netflixTop10.js <country-code> <shows|movies>');
    console.error('Example: node scripts/netflixTop10.js NL shows');
    process.exitCode = 1;
    return;
  }

  try {
    const data = await fetchNetflixTop10(countryCodeArg, typeArg, {
      allowInsecureTLS: process.env.TUDUM_ALLOW_INSECURE === '1',
    });
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to fetch Netflix Top 10: ${err.message}`);
    process.exitCode = 1;
  }
}

const isCLI = (() => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    return path.resolve(process.argv[1] || '') === __filename;
  } catch {
    return false;
  }
})();

if (isCLI) {
  void runFromCLI();
}
