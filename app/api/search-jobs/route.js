import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

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

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      query,
      location,
      company,
      datePosted,
      jobType,
      remoteType,
      experienceLevel,
      sortBy,
    } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Job title or keywords are required.' },
        { status: 400 }
      );
    }

    if (!process.env.JSEARCH_API_KEY) {
      return NextResponse.json(
        { error: 'Missing JSEARCH_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const url = new URL('https://jsearch.p.rapidapi.com/search');

    const baseQuery = query.trim();
    const queryWithLocation = location?.trim()
      ? `${baseQuery} in ${location.trim()}`
      : baseQuery;

    url.searchParams.set('query', queryWithLocation);
    url.searchParams.set('page', '1');
    url.searchParams.set('num_pages', '1');

    if (datePosted) {
      url.searchParams.set('date_posted', datePosted);
    }

    const mappedEmploymentType = mapEmploymentType(jobType);
    if (mappedEmploymentType) {
      url.searchParams.set('employment_types', mappedEmploymentType);
    }

    if (remoteType === 'remote') {
      url.searchParams.set('remote_jobs_only', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      cache: 'no-store',
    });

    const json = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: json?.message || json?.error || 'Failed to fetch jobs.' },
        { status: response.status }
      );
    }

    let jobs = (json.data || []).map((job) => ({
      jobId: job.job_id || '',
      title: job.job_title || '',
      company: job.employer_name || '',
      location: formatLocation(job),
      type: job.job_employment_type || '',
      source: job.job_publisher || '',
      applyUrl: job.job_apply_link || job.job_google_link || '',
      descriptionPreview: job.job_description || '',
      postedAt: job.job_posted_at_datetime_utc || '',
      isRemote: !!job.job_is_remote,
    }));

    if (experienceLevel?.trim()) {
      const level = normalizeText(experienceLevel);
      jobs = jobs.filter((job) => {
        const haystack = normalizeText(
          `${job.title} ${job.descriptionPreview}`
        );
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

    return NextResponse.json({
      jobs,
      meta: {
        total: jobs.length,
        companyFilter: company || '',
        companyFilterApplied,
        companyFilterMatched,
        fallbackUsed: companyFilterApplied && !companyFilterMatched,
        message:
          companyFilterApplied && !companyFilterMatched
            ? `No exact matches found for company "${company}". Showing closest results instead.`
            : '',
      },
    });
  } catch (err) {
    console.error('SEARCH JOBS ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to search jobs.' },
      { status: 500 }
    );
  }
}