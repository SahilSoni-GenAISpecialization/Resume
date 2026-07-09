/**
 * Verify RapidAPI JSearch keys against jsearch.p.rapidapi.com
 *
 * Usage (on VPS or locally):
 *   JSEARCH_API_KEY=your_key JSEARCH_API_KEY_2=your_key_2 node scripts/test-jsearch-keys.mjs
 *
 * Or load from .env.production on the server:
 *   export $(grep -E '^JSEARCH_' .env.production | xargs) && node scripts/test-jsearch-keys.mjs
 */

const HOST = 'jsearch.p.rapidapi.com';

function maskKey(key = '') {
  const value = String(key).trim();
  if (value.length <= 8) return '(too short)';
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

async function testKey(label, apiKey) {
  const trimmed = String(apiKey || '').trim();
  if (!trimmed) {
    console.log(`\n${label}: NOT SET`);
    return false;
  }

  console.log(`\n${label}: ${maskKey(trimmed)}`);

  const url = `https://${HOST}/search-v2?query=network+engineer&page=1&num_pages=1&country=ca`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': trimmed,
        'X-RapidAPI-Host': HOST,
      },
    });

    const text = await response.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {}

    const message = json?.message || json?.error || '';
    const jobCount = Array.isArray(json?.data)
      ? json.data.length
      : Array.isArray(json?.data?.jobs)
        ? json.data.jobs.length
        : 0;

    if (response.ok && jobCount > 0) {
      console.log(`  ✓ OK — HTTP ${response.status}, ${jobCount} job(s) returned`);
      return true;
    }

    if (response.ok && jobCount === 0) {
      console.log(`  ~ HTTP ${response.status} but 0 jobs (key works; try different query)`);
      return true;
    }

    console.log(`  ✗ FAILED — HTTP ${response.status}`);
    if (message) console.log(`    Message: ${message}`);

    if (String(message).toLowerCase().includes('not subscribed')) {
      console.log('    → This key is NOT linked to a RapidAPI account subscribed to JSearch.');
      console.log('    → Subscribe at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
      console.log('    → Then copy the API key from THAT same logged-in account.');
    }

    return false;
  } catch (err) {
    console.log(`  ✗ ERROR — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('JSearch API key check');
  console.log(`Host: ${HOST}`);
  console.log('Subscribe to JSearch (Mega) on the SAME RapidAPI account as each key.\n');

  const key1 = process.env.JSEARCH_API_KEY || process.env.JSEARCH_API_KEY_1;
  const key2 = process.env.JSEARCH_API_KEY_2 || process.env.JSEARCH_API_KEY2;

  const results = await Promise.all([
    testKey('Key #1 (JSEARCH_API_KEY)', key1),
    testKey('Key #2 (JSEARCH_API_KEY_2)', key2),
  ]);

  const configured = [key1, key2].filter(Boolean).length;
  const passed = results.filter(Boolean).length;

  console.log(`\nSummary: ${passed}/${configured} key(s) working`);

  if (passed === 0 && configured > 0) {
    console.log('\nNext steps:');
    console.log('1. Log into rapidapi.com with the account that has Mega subscription');
    console.log('2. Open https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
    console.log('3. Confirm it shows "Mega" (or your plan) under Subscriptions');
    console.log('4. Go to rapidapi.com/developer/security → copy Default Application API Key');
    console.log('5. Put that key in .env.production, then: pm2 restart applymatic');
    process.exit(1);
  }

  if (configured < 2) {
    console.log('\nNote: Only one key is set. Add JSEARCH_API_KEY_2 for double capacity.');
  }
}

main();
