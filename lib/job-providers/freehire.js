import { JobProvider, PAGE_SIZE, encodeJobId, htmlToFormattedText } from './types';
import { filterJobsByLocation } from './location-filter';

const DEFAULT_BASE = 'https://freehire.dev/api/v1';

function baseUrl() {
  return (process.env.FREEHIRE_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
}

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

function mapEmploymentType(jobType = '') {
  const v = String(jobType).trim().toLowerCase();
  if (!v) return '';
  if (v === 'full_time') return 'full_time';
  if (v === 'part_time') return 'part_time';
  if (v === 'contract') return 'contract';
  if (v === 'internship') return 'internship';
  if (v === 'temporary') return 'temporary';
  return '';
}

function mapSeniority(experienceLevel = '') {
  const v = String(experienceLevel).trim().toLowerCase();
  if (!v) return '';
  if (v === 'entry') return 'junior';
  if (v === 'associate') return 'middle';
  if (v === 'mid') return 'middle';
  if (v === 'senior') return 'senior';
  if (v === 'director') return 'lead';
  return '';
}

function buildSearchQuery({ query, location, company }) {
  return [query, location, company].map((part) => part?.trim()).filter(Boolean).join(' ');
}

function mapJob(job) {
  const description = job.description || '';
  const plainDescription = htmlToFormattedText(description);
  return {
    jobId: encodeJobId(JobProvider.FREEHIRE, job.public_slug || ''),
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    type: job.enrichment?.employment_type || '',
    source: job.source || 'Freehire',
    applyUrl: job.url || '',
    descriptionPreview: plainDescription,
    postedAt: job.posted_at || job.created_at || '',
    isRemote: job.work_mode === 'remote',
    provider: JobProvider.FREEHIRE,
  };
}

export async function searchFreehire(params) {
  const {
    query,
    location,
    company,
    jobType,
    remoteType,
    experienceLevel,
    sortBy,
    page = 1,
  } = params;

  const url = new URL(`${baseUrl()}/jobs/search`);
  const q = buildSearchQuery({ query, location, company });
  if (q) url.searchParams.set('q', q);

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * PAGE_SIZE;
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));

  const employmentType = mapEmploymentType(jobType);
  if (employmentType) url.searchParams.set('employment_type', employmentType);

  const seniority = mapSeniority(experienceLevel);
  if (seniority) url.searchParams.set('seniority', seniority);

  if (remoteType === 'remote') url.searchParams.set('work_mode', 'remote');

  if (sortBy === 'newest') {
    url.searchParams.set('sort', 'posted_at');
    url.searchParams.set('order', 'desc');
  }

  const response = await fetch(url.toString(), { cache: 'no-store' });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: json?.error || json?.message || 'Failed to fetch jobs from Freehire.',
      status: response.status,
    };
  }

  let jobs = (json.data || []).map(mapJob);
  const total = Number(json.meta?.total ?? jobs.length);
  const hasMore = offset + jobs.length < total;

  let locationFilterApplied = false;
  let locationFilterMatched = false;
  let locationMessage = '';

  if (location?.trim()) {
    const locationResult = filterJobsByLocation(jobs, location);
    locationFilterApplied = locationResult.locationFilterApplied;
    locationFilterMatched = locationResult.locationFilterMatched;
    jobs = locationResult.jobs;
    if (locationFilterApplied && !locationFilterMatched) {
      locationMessage = `No exact matches found in "${location.trim()}". Try a nearby city or broaden your search.`;
    }
  }

  return {
    ok: true,
    jobs,
    meta: {
      page: safePage,
      pageSize: PAGE_SIZE,
      hasMore,
      total: jobs.length,
      provider: JobProvider.FREEHIRE,
      companyFilter: company || '',
      companyFilterApplied: !!company?.trim(),
      companyFilterMatched: !!company?.trim(),
      locationFilter: location || '',
      locationFilterApplied,
      locationFilterMatched,
      fallbackUsed: true,
      message: locationMessage || 'Showing results from our backup job source market.',
    },
  };
}

export async function getFreehireJobDetails(externalId) {
  const response = await fetch(`${baseUrl()}/jobs/${encodeURIComponent(externalId)}`, {
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: json?.error || json?.message || 'Job not found.',
      status: response.status,
    };
  }

  const job = json.data;
  if (!job) {
    return { ok: false, error: 'Job not found.', status: 404 };
  }

  const description = job.description || '';
  return {
    ok: true,
    job: {
      jobId: encodeJobId(JobProvider.FREEHIRE, job.public_slug || ''),
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      type: job.enrichment?.employment_type || '',
      description: htmlToFormattedText(description) || description,
      applyUrl: job.url || '',
      postedAt: job.posted_at || job.created_at || '',
      source: job.source || 'Freehire',
      provider: JobProvider.FREEHIRE,
    },
  };
}
