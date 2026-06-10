import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json({ error: 'job_id is required.' }, { status: 400 });
    }

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/job-details?job_id=${encodeURIComponent(jobId)}`,
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
        { error: `Job details API failed: ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const job = Array.isArray(data?.data) ? data.data[0] : data?.data;

    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        jobId: job.job_id || '',
        title: job.job_title || '',
        company: job.employer_name || '',
        location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', '),
        type: job.job_employment_type || '',
        description: job.job_description || '',
        applyUrl: job.job_apply_link || '',
        postedAt: job.job_posted_at_datetime_utc || '',
        source: job.job_publisher || '',
      },
    });
  } catch (err) {
    console.error('JOB DETAILS ERROR:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch job details' }, { status: 500 });
  }
}