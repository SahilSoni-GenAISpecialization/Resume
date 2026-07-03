import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl, getStripe } from '@/lib/stripe';
import {
  clearStripeBillingFields,
  isMissingStripeCustomerError,
  resolveStripeCustomerId,
} from '@/lib/stripe-profile';

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
    const customerId = await resolveStripeCustomerId(
      stripe,
      user.id,
      profile?.stripe_customer_id || null
    );

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            'No billing profile found for this account. Subscribe to Pro again if you need access.',
        },
        { status: 400 }
      );
    }

    const siteUrl = getSiteUrl(request);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/dashboard?billing=updated`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    if (isMissingStripeCustomerError(err)) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await clearStripeBillingFields(user.id);
      return NextResponse.json(
        {
          error:
            'Your old billing profile was from test mode and has been reset. Subscribe again if you need Pro.',
        },
        { status: 400 }
      );
    }

    console.error('STRIPE PORTAL SESSION ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Could not open billing portal.' },
      { status: 500 }
    );
  }
}
