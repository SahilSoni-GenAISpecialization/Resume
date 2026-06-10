import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { query, location } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
    }

    const searchTerm = `${query.trim()}${location?.trim() ? ` in ${location.trim()}` : ''}`;

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchTerm)}&num_pages=3&date_posted=month`,
      {
        headers: {
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          'x-rapidapi-key': process.env.JSEARCH_API_KEY,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Job search API failed: ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = Array.isArray(data?.data) ? data.data : [];

    if (!raw.length) {
      return NextResponse.json({ jobs: [] });
    }

    const seen = new Set();

    const jobs = raw
      .map((job) => ({
        jobId: job.job_id || '',
        title: job.job_title || '',
        company: job.employer_name || '',
        location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', '),
        type: job.job_employment_type || '',
        descriptionPreview: job.job_description || '',
        applyUrl: job.job_apply_link || '',
        postedAt: job.job_posted_at_datetime_utc || '',
        source: job.job_publisher || '',
      }))
      .filter((job) => {
        const key = job.jobId || `${job.title}-${job.company}-${job.applyUrl}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('SEARCH JOBS ERROR:', err);
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 });
  }
}