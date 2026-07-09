import { JobProvider, parseJobId } from './types';
import { getJsearchApiKeys, getJsearchJobDetails, isJsearchQuotaError, searchJsearch } from './jsearch';
import { getFreehireJobDetails, searchFreehire } from './freehire';

export { JobProvider, PAGE_SIZE, parseJobId } from './types';

/** Only use Freehire after every configured JSearch key has hit quota/rate limits. */
function shouldFallbackToFreehire(jsearchResult) {
  if (!getJsearchApiKeys().length) return true;
  return Boolean(jsearchResult?.allKeysQuotaExhausted);
}

export async function searchJobs(params) {
  const jsearchResult = await searchJsearch(params);

  if (jsearchResult.ok) {
    return jsearchResult;
  }

  if (!shouldFallbackToFreehire(jsearchResult)) {
    return jsearchResult;
  }

  console.warn('[job-search] All JSearch keys exhausted — using Freehire backup', {
    keysConfigured: jsearchResult.keysConfigured ?? getJsearchApiKeys().length,
    keysAttempted: jsearchResult.keysAttempted ?? getJsearchApiKeys().length,
    lastStatus: jsearchResult.status,
  });

  const freehireResult = await searchFreehire(params);
  if (freehireResult.ok) {
    return freehireResult;
  }

  if (jsearchResult.allKeysQuotaExhausted || jsearchResult.quotaExceeded) {
    return {
      ok: false,
      error: 'Job search is temporarily unavailable. Please try again later.',
      status: 503,
    };
  }

  return {
    ok: false,
    error: freehireResult.error || jsearchResult.error || 'Failed to search jobs.',
    status: freehireResult.status || jsearchResult.status || 502,
  };
}

export async function getJobDetails(jobId) {
  const { provider, externalId } = parseJobId(jobId);

  if (!externalId) {
    return { ok: false, error: 'job_id is required.', status: 400 };
  }

  if (provider === JobProvider.FREEHIRE) {
    return getFreehireJobDetails(externalId);
  }

  const jsearchResult = await getJsearchJobDetails(externalId);
  if (jsearchResult.ok) {
    return jsearchResult;
  }

  if (jsearchResult.allKeysQuotaExhausted || jsearchResult.quotaExceeded) {
    return {
      ok: false,
      error:
        'Could not load job details right now. Open the apply link from the listing or try again later.',
      status: 503,
    };
  }

  return jsearchResult;
}

export { isJsearchQuotaError, getJsearchApiKeys };
