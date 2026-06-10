import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { application_id } = await req.json();

    const { data: app, error } = await supabase
      .from('applications')
      .select('*, job_listings(*)')
      .eq('id', application_id)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ application: app });

  } catch (err) {
    console.error('ERROR:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}