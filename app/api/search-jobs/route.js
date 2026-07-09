import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchJobs } from '@/lib/job-providers';

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

    const body = await request.json();
    const { query } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Job title or keywords are required.' },
        { status: 400 }
      );
    }

    const result = await searchJobs(body);

    if (!result.ok) {
      const status = result.status && result.status !== 404 ? result.status : 503;
      return NextResponse.json(
        { error: result.error || 'Failed to fetch jobs.' },
        { status: status >= 400 && status < 600 ? status : 503 }
      );
    }

    return NextResponse.json({
      jobs: result.jobs,
      meta: result.meta,
    });
  } catch (err) {
    console.error('SEARCH JOBS ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to search jobs.' },
      { status: 500 }
    );
  }
}
