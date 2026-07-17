import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const applicationId = body?.application_id;
    if (!applicationId || typeof applicationId !== 'string') {
      return NextResponse.json({ error: 'application_id is required.' }, { status: 400 });
    }

    const { data: app, error } = await supabase
      .from('applications')
      .select('*, job_listings(*)')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('GET APPLICATION ERROR:', error.message);
      return NextResponse.json({ error: 'Could not load application.' }, { status: 500 });
    }

    if (!app) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ application: app });
  } catch (err) {
    console.error('GET APPLICATION ERROR:', err?.message || err);
    return NextResponse.json({ error: 'Could not load application.' }, { status: 500 });
  }
}
