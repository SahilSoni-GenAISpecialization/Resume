import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProPriceId, getSiteUrl, getStripe } from '@/lib/stripe';
import { resolveStripeCustomerId } from '@/lib/stripe-profile';

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

    const stripe = getStripe();
    const siteUrl = getSiteUrl(request);

    let returnPath = '/dashboard';
    try {
      const body = await request.json();
      if (body?.returnPath && typeof body.returnPath === 'string' && body.returnPath.startsWith('/')) {
        returnPath = body.returnPath;
      }
    } catch {}

    const customerId = await resolveStripeCustomerId(
      stripe,
      user.id,
      profile?.stripe_customer_id || null
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      client_reference_id: user.id,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      success_url: `${siteUrl}${returnPath}?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${returnPath}?upgrade=cancelled`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('STRIPE CHECKOUT SESSION ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Could not start checkout.' },
      { status: 500 }
    );
  }
}
