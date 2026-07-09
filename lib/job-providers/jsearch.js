import { JobProvider, PAGE_SIZE, encodeJobId, htmlToFormattedText } from './types';
import { filterJobsByLocation } from './location-filter';

const HOST = 'jsearch.p.rapidapi.com';
const SEARCH_ENDPOINTS = [
  { path: '/search-v2', version: 'v2' },
  { path: '/search', version: 'v1' },
];

function formatLocation(job) {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return job.job_location || '';
}

function mapEmploymentType(value = '') {
  const v = String(value).trim().toLowerCase();
  if (!v) return '';
  if (v === 'full_time') return 'FULLTIME';
  if (v === 'part_time') return 'PARTTIME';
  if (v === 'contract') return 'CONTRACTOR';
  if (v === 'internship') return 'INTERN';
  if (v === 'temporary') return 'TEMPORARY';
  return value;
}

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

function inferCountryCode(location = '') {
  const text = normalizeText(location);
  if (!text) return '';
  if (/\b(canada|toronto|vancouver|montreal|calgary|edmonton|ottawa|ontario|quebec|mississauga|brampton)\b/.test(text)) {
    return 'ca';
  }
  if (/\b(usa|united states|new york|san francisco|chicago|texas|california|seattle|austin)\b/.test(text)) {
    return 'us';
  }
  if (/\b(uk|united kingdom|london|england|scotland)\b/.test(text)) {
    return 'gb';
  }
  return '';
}

export function getJsearchApiKeys() {
  const primary = process.env.JSEARCH_API_KEY || process.env.JSEARCH_API_KEY_1;
  const secondary = process.env.JSEARCH_API_KEY_2 || process.env.JSEARCH_API_KEY2;
  const keys = [primary, secondary].filter(Boolean);
  return [...new Set(keys)];
}

export function isJsearchQuotaError(status, message = '') {
  const text = String(message).toLowerCase();
  return (
    status === 429 ||
    (status === 403 && text.includes('quota')) ||
    text.includes('monthly quota') ||
    text.includes('exceeded the monthly quota') ||
    text.includes('rate limit')
  );
}

/** True when this JSearch key cannot be used — try the next key or Freehire. */
export function isJsearchKeyUnavailable(status, message = '') {
  const text = String(message).toLowerCase();
  if (isJsearchQuotaError(status, message)) return true;
  if (status === 401 || status === 429) return true;
  if (status === 403) return true;
  return (
    text.includes('not subscribed') ||
    text.includes('subscription') ||
    text.includes('invalid api key') ||
    text.includes('unauthorized') ||
    text.includes('forbidden')
  );
}

function isEndpointMissingError(message = '') {
  return String(message).toLowerCase().includes('does not exist');
}

function shouldTryNextJsearchKey(result) {
  if (!result || result.ok) return false;
  if (result.status === 400) return false;
  return true;
}

function formatDescription(description = '') {
  return htmlToFormattedText(description) || description;
}

function extractSearchJobs(json) {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.jobs)) return json.data.jobs;
  return [];
}

function mapJob(job) {
  const description = formatDescription(job.job_description || '');
  return {
    jobId: encodeJobId(JobProvider.JSEARCH, job.job_id || ''),
    title: job.job_title || '',
    company: job.employer_name || '',
    location: formatLocation(job),
    type: job.job_employment_type || '',
    source: job.job_publisher || 'JSearch',
    applyUrl: job.job_apply_link || job.job_google_link || '',
    descriptionPreview: description,
    postedAt: job.job_posted_at_datetime_utc || '',
    isRemote: !!job.job_is_remote,
    provider: JobProvider.JSEARCH,
  };
}

function buildSearchUrl(path, version, params) {
  const {
    query,
    location,
    datePosted,
    jobType,
    remoteType,
    page = 1,
  } = params;

  const url = new URL(`https://${HOST}${path}`);
  const baseQuery = query.trim();
  const queryWithLocation = location?.trim()
    ? `${baseQuery} in ${location.trim()}`
    : baseQuery;

  url.searchParams.set('query', queryWithLocation);
  url.searchParams.set('page', String(Math.max(1, page)));
  url.searchParams.set('num_pages', '1');

  const country = inferCountryCode(location);
  if (country) url.searchParams.set('country', country);

  if (datePosted) url.searchParams.set('date_posted', datePosted);

  const mappedEmploymentType = mapEmploymentType(jobType);
  if (mappedEmploymentType) url.searchParams.set('employment_types', mappedEmploymentType);

  if (remoteType === 'remote') {
    if (version === 'v2') {
      url.searchParams.set('work_from_home', 'true');
    } else {
      url.searchParams.set('remote_jobs_only', 'true');
    }
  }

  return url;
}

function parseJsearchFailure(response, json) {
  const message =
    json?.message ||
    (typeof json?.error === 'string' ? json.error : json?.error?.message) ||
    '';
  const status = response.ok ? 403 : response.status;

  if (json?.status === 'ERROR' || (message && isJsearchKeyUnavailable(status, message))) {
    return {
      ok: false,
      quotaExceeded: isJsearchQuotaError(status, message),
      keyUnavailable: isJsearchKeyUnavailable(status, message),
      endpointMissing: isEndpointMissingError(message),
      error: message || 'Failed to fetch jobs from JSearch.',
      status,
    };
  }

  if (!response.ok) {
    const keyUnavailable = isJsearchKeyUnavailable(status, message);
    return {
      ok: false,
      quotaExceeded: keyUnavailable,
      keyUnavailable,
      endpointMissing: isEndpointMissingError(message),
      error: message || 'Failed to fetch jobs from JSearch.',
      status,
    };
  }

  return null;
}

function applySearchFilters(jobs, params) {
  const { company, experienceLevel, sortBy, location } = params;

  if (experienceLevel?.trim()) {
    const level = normalizeText(experienceLevel);
    jobs = jobs.filter((job) => {
      const haystack = normalizeText(`${job.title} ${job.descriptionPreview}`);
      if (level === 'entry') return /entry|junior|jr|new grad|graduate/.test(haystack);
      if (level === 'associate') return /associate/.test(haystack);
      if (level === 'mid') return /mid|intermediate/.test(haystack);
      if (level === 'senior') return /senior|sr|lead|staff|principal/.test(haystack);
      if (level === 'director') return /director|head|vp|vice president/.test(haystack);
      return true;
    });
  }

  const originalJobs = [...jobs];
  let companyFilterApplied = false;
  let companyFilterMatched = false;

  if (company?.trim()) {
    companyFilterApplied = true;
    const needle = normalizeText(company);
    const filteredJobs = jobs.filter((job) =>
      normalizeText(job.company).includes(needle)
    );
    if (filteredJobs.length > 0) {
      jobs = filteredJobs;
      companyFilterMatched = true;
    } else {
      jobs = originalJobs;
    }
  }

  if (sortBy === 'newest') {
    jobs.sort((a, b) => {
      const aTime = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const bTime = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  let locationFilterApplied = false;
  let locationFilterMatched = false;

  if (location?.trim()) {
    const locationResult = filterJobsByLocation(jobs, location);
    locationFilterApplied = locationResult.locationFilterApplied;
    locationFilterMatched = locationResult.locationFilterMatched;
    jobs = locationResult.jobs;
  }

  let locationMessage = '';
  if (locationFilterApplied && !locationFilterMatched) {
    locationMessage = `No exact matches found in "${location.trim()}". Try a nearby city or broaden your search.`;
  }

  return {
    jobs,
    companyFilterApplied,
    companyFilterMatched,
    locationFilterApplied,
    locationFilterMatched,
    locationMessage,
  };
}

async function executeSearchRequest(apiKey, endpoint, params) {
  const url = buildSearchUrl(endpoint.path, endpoint.version, params);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': HOST,
    },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  const failure = parseJsearchFailure(response, json);
  if (failure) return failure;

  const rawJobs = extractSearchJobs(json).map(mapJob);
  const hasMore = rawJobs.length >= PAGE_SIZE;
  const filtered = applySearchFilters(rawJobs, params);

  return {
    ok: true,
    jobs: filtered.jobs,
    meta: {
      page: Math.max(1, params.page || 1),
      pageSize: PAGE_SIZE,
      hasMore,
      total: filtered.jobs.length,
      provider: JobProvider.JSEARCH,
      jsearchEndpoint: endpoint.path,
      companyFilter: params.company || '',
      companyFilterApplied: filtered.companyFilterApplied,
      companyFilterMatched: filtered.companyFilterMatched,
      locationFilter: params.location || '',
      locationFilterApplied: filtered.locationFilterApplied,
      locationFilterMatched: filtered.locationFilterMatched,
      fallbackUsed: false,
      message:
        filtered.locationMessage ||
        (filtered.companyFilterApplied && !filtered.companyFilterMatched
          ? `No exact matches found for company "${params.company}". Showing closest results instead.`
          : ''),
    },
  };
}

async function searchJsearchWithKey(apiKey, params) {
  let lastResult = null;

  for (const endpoint of SEARCH_ENDPOINTS) {
    const result = await executeSearchRequest(apiKey, endpoint, params);
    if (result.ok) return result;

    lastResult = result;
    if (result.endpointMissing) continue;
    return result;
  }

  return lastResult;
}

export async function searchJsearch(params) {
  const keys = getJsearchApiKeys();
  if (!keys.length) {
    return {
      ok: false,
      quotaExceeded: true,
      keyUnavailable: true,
      allKeysUnavailable: true,
      error: 'Missing JSEARCH API keys in environment variables.',
      status: 401,
    };
  }

  let lastResult = null;
  const keyAttempts = [];

  for (let i = 0; i < keys.length; i++) {
    const result = await searchJsearchWithKey(keys[i], params);
    keyAttempts.push({
      keyIndex: i + 1,
      ok: result.ok,
      status: result.status || null,
      endpoint: result.meta?.jsearchEndpoint || '',
      reason: result.ok ? '' : String(result.error || '').slice(0, 120),
    });

    if (result.ok) {
      return {
        ...result,
        meta: {
          ...result.meta,
          jsearchKeyUsed: i + 1,
          jsearchKeysConfigured: keys.length,
          jsearchKeyAttempts: keyAttempts,
        },
      };
    }

    lastResult = result;
    const moreKeys = i < keys.length - 1;
    if (moreKeys && shouldTryNextJsearchKey(result)) {
      continue;
    }

    return {
      ...lastResult,
      allKeysUnavailable: !moreKeys,
      keysAttempted: i + 1,
      keysConfigured: keys.length,
      keyAttempts,
    };
  }

  return { ...lastResult, keyAttempts };
}

async function getJsearchJobDetailsWithKey(apiKey, externalId) {
  const response = await fetch(
    `https://${HOST}/job-details?job_id=${encodeURIComponent(externalId)}`,
    {
      headers: {
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': apiKey,
      },
      cache: 'no-store',
    }
  );

  const json = await response.json().catch(() => ({}));
  const message =
    json?.message ||
    (typeof json?.error === 'string' ? json.error : json?.error?.message) ||
    '';

  if (!response.ok || json?.status === 'ERROR') {
    const status = response.ok ? 403 : response.status;
    const keyUnavailable = isJsearchKeyUnavailable(status, message);
    return {
      ok: false,
      quotaExceeded: keyUnavailable,
      keyUnavailable,
      error: message || `Job details API failed: ${JSON.stringify(json)}`,
      status,
    };
  }

  const job = Array.isArray(json?.data) ? json.data[0] : json?.data;

  if (!job?.job_id) {
    return { ok: false, quotaExceeded: false, error: 'Job not found.', status: 404 };
  }

  const description = formatDescription(job.job_description || '');

  return {
    ok: true,
    job: {
      jobId: encodeJobId(JobProvider.JSEARCH, job.job_id || ''),
      title: job.job_title || '',
      company: job.employer_name || '',
      location: formatLocation(job),
      type: job.job_employment_type || '',
      description,
      applyUrl: job.job_apply_link || '',
      postedAt: job.job_posted_at_datetime_utc || '',
      source: job.job_publisher || 'JSearch',
      provider: JobProvider.JSEARCH,
    },
  };
}

export async function getJsearchJobDetails(externalId) {
  const keys = getJsearchApiKeys();
  if (!keys.length) {
    return {
      ok: false,
      quotaExceeded: true,
      keyUnavailable: true,
      allKeysUnavailable: true,
      error: 'Missing JSEARCH API keys in environment variables.',
      status: 401,
    };
  }

  let lastResult = null;
  for (let i = 0; i < keys.length; i++) {
    const result = await getJsearchJobDetailsWithKey(keys[i], externalId);
    if (result.ok) return result;

    lastResult = result;
    const moreKeys = i < keys.length - 1;
    if (moreKeys && shouldTryNextJsearchKey(result)) {
      continue;
    }

    return {
      ...lastResult,
      allKeysUnavailable: !moreKeys,
    };
  }

  return lastResult;
}
