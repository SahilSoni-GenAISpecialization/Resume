import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl, getStripe } from '@/lib/stripe';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found for this account.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl(request);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/dashboard?billing=updated`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('STRIPE PORTAL SESSION ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Could not open billing portal.' },
      { status: 500 }
    );
  }
}
