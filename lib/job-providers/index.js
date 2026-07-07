import { JobProvider, parseJobId } from './types';
import { getJsearchJobDetails, isJsearchQuotaError, searchJsearch } from './jsearch';
import { getFreehireJobDetails, searchFreehire } from './freehire';

export { JobProvider, PAGE_SIZE, parseJobId } from './types';

export async function searchJobs(params) {
  const jsearchResult = await searchJsearch(params);

  if (jsearchResult.ok) {
    return jsearchResult;
  }

  const shouldFallback =
    jsearchResult.quotaExceeded ||
    !process.env.JSEARCH_API_KEY ||
    jsearchResult.status === 429 ||
    jsearchResult.status === 403;

  if (!shouldFallback) {
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
        'Job search is temporarily unavailable — the primary API quota is exhausted and the backup source also failed. Try again later or upgrade JSearch when you go live.',
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
        'Could not load job details — JSearch quota is exhausted. Open the apply link from the listing or try again after the monthly reset.',
      status: 503,
    };
  }

  return jsearchResult;
}

export { isJsearchQuotaError };
