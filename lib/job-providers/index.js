import { JobProvider, parseJobId } from './types';
import { getJsearchApiKeys, getJsearchJobDetails, isJsearchQuotaError, searchJsearch } from './jsearch';
import { getFreehireJobDetails, searchFreehire } from './freehire';

export { JobProvider, PAGE_SIZE, parseJobId } from './types';

function shouldFallbackToFreehire(jsearchResult) {
  return (
    jsearchResult.quotaExceeded ||
    !getJsearchApiKeys().length ||
    jsearchResult.status === 429 ||
    jsearchResult.status === 403
  );
}

export async function searchJobs(params) {
  const jsearchResult = await searchJsearch(params);

  if (jsearchResult.ok) {
    return jsearchResult;
  }

  if (!shouldFallbackToFreehire(jsearchResult)) {
    return jsearchResult;
  }

  const freehireResult = await searchFreehire(params);
  if (freehireResult.ok) {
    return freehireResult;
  }

  if (jsearchResult.quotaExceeded) {
    return {
      ok: false,
      error:
        'Job search is temporarily unavailable. Please try again later.',
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

  if (jsearchResult.quotaExceeded) {
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
