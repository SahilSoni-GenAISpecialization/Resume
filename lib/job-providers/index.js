import { JobProvider, parseJobId } from './types';
import {
  getJsearchApiKeys,
  getJsearchJobDetails,
  isJsearchKeyUnavailable,
  isJsearchQuotaError,
  searchJsearch,
} from './jsearch';
import { getFreehireJobDetails, searchFreehire } from './freehire';

export { JobProvider, PAGE_SIZE, parseJobId } from './types';

/** Use Freehire after every configured JSearch key has been tried without success. */
function shouldFallbackToFreehire(jsearchResult) {
  if (!getJsearchApiKeys().length) return true;
  const configured = jsearchResult?.keysConfigured ?? getJsearchApiKeys().length;
  const attempted = jsearchResult?.keysAttempted ?? 0;
  return attempted >= configured || Boolean(jsearchResult?.allKeysUnavailable);
}

function sanitizeSearchError(message = '') {
  const text = String(message).toLowerCase();
  if (
    isJsearchKeyUnavailable(403, message) ||
    text.includes('not subscribed') ||
    text.includes('rapidapi')
  ) {
    return 'Job search is temporarily unavailable. Please try again later.';
  }
  return message || 'Failed to search jobs.';
}

export async function searchJobs(params) {
  const jsearchResult = await searchJsearch(params);

  if (jsearchResult.ok) {
    return jsearchResult;
  }

  if (!shouldFallbackToFreehire(jsearchResult)) {
    return {
      ...jsearchResult,
      error: sanitizeSearchError(jsearchResult.error),
    };
  }

  console.warn('[job-search] All JSearch keys unavailable — using Freehire backup', {
    keysConfigured: jsearchResult.keysConfigured ?? getJsearchApiKeys().length,
    keysAttempted: jsearchResult.keysAttempted ?? getJsearchApiKeys().length,
    lastStatus: jsearchResult.status,
    lastError: jsearchResult.error,
  });

  const freehireResult = await searchFreehire(params);
  if (freehireResult.ok) {
    return {
      ...freehireResult,
      meta: {
        ...freehireResult.meta,
        jsearchKeysConfigured: jsearchResult.keysConfigured ?? getJsearchApiKeys().length,
        jsearchKeysAttempted: jsearchResult.keysAttempted ?? getJsearchApiKeys().length,
        jsearchKeyAttempts: jsearchResult.keyAttempts ?? [],
      },
    };
  }

  return {
    ok: false,
    error: 'Job search is temporarily unavailable. Please try again later.',
    status: 503,
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

  if (jsearchResult.allKeysUnavailable || jsearchResult.keyUnavailable) {
    return {
      ok: false,
      error:
        'Could not load job details right now. Open the apply link from the listing or try again later.',
      status: 503,
    };
  }

  return jsearchResult;
}

export { isJsearchQuotaError, isJsearchKeyUnavailable, getJsearchApiKeys };
