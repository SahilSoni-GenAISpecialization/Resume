import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobDetails } from '@/lib/job-providers';

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

    const result = await getJobDetails(jobId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch job details' },
        { status: result.status || 502 }
      );
    }

    return NextResponse.json({ job: result.job });
  } catch (err) {
    console.error('JOB DETAILS ERROR:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch job details' }, { status: 500 });
  }
}
