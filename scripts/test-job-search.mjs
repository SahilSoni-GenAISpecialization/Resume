/**
 * Integration test for JSearch search-v2 + key failover (no Next.js bundler required).
 * Usage: node scripts/test-job-search.mjs
 */

import { readFileSync, existsSync } from 'fs';

const HOST = 'jsearch.p.rapidapi.com';
const SEARCH_ENDPOINTS = ['/search-v2', '/search'];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getKeys() {
  return [
    process.env.JSEARCH_API_KEY || process.env.JSEARCH_API_KEY_1,
    process.env.JSEARCH_API_KEY_2 || process.env.JSEARCH_API_KEY2,
  ].filter(Boolean);
}

function extractJobs(json) {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.jobs)) return json.data.jobs;
  return [];
}

function isEndpointMissing(message = '') {
  return String(message).toLowerCase().includes('does not exist');
}

function isQuota(message = '') {
  return String(message).toLowerCase().includes('quota');
}

async function searchWithKey(apiKey, query, location = '') {
  const queryWithLocation = location?.trim() ? `${query} in ${location.trim()}` : query;
  let lastError = null;

  for (const path of SEARCH_ENDPOINTS) {
    const url = new URL(`https://${HOST}${path}`);
    url.searchParams.set('query', queryWithLocation);
    url.searchParams.set('page', '1');
    url.searchParams.set('num_pages', '1');
    if (location?.toLowerCase().includes('toronto')) url.searchParams.set('country', 'ca');

    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': HOST,
      },
    });

    const json = await response.json().catch(() => ({}));
    const message = json?.message || json?.error || '';

    if (!response.ok || json?.status === 'ERROR') {
      lastError = message || `HTTP ${response.status}`;
      if (isEndpointMissing(message)) continue;
      if (isQuota(message)) return { ok: false, quota: true, error: message, path };
      return { ok: false, error: message, path };
    }

    const jobs = extractJobs(json);
    return { ok: true, path, jobs, count: jobs.length };
  }

  return { ok: false, error: lastError || 'No endpoint worked' };
}

async function searchJobs(query, location = '') {
  const keys = getKeys();
  for (let i = 0; i < keys.length; i++) {
    const result = await searchWithKey(keys[i], query, location);
    if (result.ok) return { ...result, keyIndex: i + 1 };
    if (!result.quota) return result;
  }
  return { ok: false, error: 'All keys failed', freehireWouldRun: true };
}

loadEnvFile('.env.local');
loadEnvFile('.env.production');

const tests = [
  ['network engineer', 'toronto'],
  ['RIBO', ''],
];

let failed = 0;

for (const [query, location] of tests) {
  console.log(`\n=== ${query}${location ? ` @ ${location}` : ''} ===`);
  const result = await searchJobs(query, location);

  if (!result.ok) {
    failed += 1;
    console.log('FAIL:', result.error);
    if (result.freehireWouldRun) console.log('(App would fall back to Freehire)');
    continue;
  }

  const sample = result.jobs.slice(0, 2).map((j) => j.job_title).join(' | ');
  console.log('OK');
  console.log('  key #:', result.keyIndex);
  console.log('  endpoint:', result.path);
  console.log('  jobs:', result.count);
  console.log('  sample:', sample || '(none)');

  if (result.count === 0) {
    failed += 1;
    console.log('  expected jobs > 0');
  }
}

console.log(failed === 0 ? '\nAll searches passed' : `\n${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
