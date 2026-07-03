import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import {
  applySubscriptionToProfile,
  readSubscriptionFromProfile,
  resolveStripeCustomerId,
} from '@/lib/stripe-profile';

/**
 * Recovery path for when a Stripe payment succeeded but the local `profiles` row couldn't be
 * updated (e.g. missing columns at the time), or webhooks aren't configured yet. Looks up the
 * user's Stripe customer/subscription directly and re-applies the Pro status.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = await resolveStripeCustomerId(
      stripe,
      user.id,
      profile?.stripe_customer_id || null
    );

    if (!customerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = customers.data[0]?.id || null;
    }

    if (!customerId) {
      return NextResponse.json({ isPro: false, message: 'No Stripe customer found for this account.' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 5,
    });

    const activeSub = subscriptions.data.find((s) => ['active', 'trialing'].includes(s.status));
    const cancelAtPeriodEnd = !!activeSub?.cancel_at_period_end;

    const subscriptionFields = {
      is_pro: !!activeSub,
      stripe_customer_id: customerId,
      stripe_subscription_id: activeSub?.id || null,
      pro_current_period_end: activeSub?.current_period_end
        ? new Date(activeSub.current_period_end * 1000).toISOString()
        : null,
      pro_cancel_at_period_end: cancelAtPeriodEnd,
      pro_since: activeSub ? new Date().toISOString() : null,
    };

    const { error: updateError } = await applySubscriptionToProfile(user, subscriptionFields);

    if (updateError) {
      console.error('SYNC SUBSCRIPTION UPDATE ERROR:', updateError.message || updateError);
      return NextResponse.json(
        { error: 'Found your subscription but could not save it. Have you run the profiles SQL migration?' },
        { status: 500 }
      );
    }

    const { status } = await readSubscriptionFromProfile(user.id);

    return NextResponse.json({
      isPro: status?.isPro ?? !!activeSub,
      cancelAtPeriodEnd: status?.cancelAtPeriodEnd ?? cancelAtPeriodEnd,
      periodEnd: status?.periodEnd ?? subscriptionFields.pro_current_period_end,
    });
  } catch (err) {
    console.error('SYNC SUBSCRIPTION ERROR:', err);
    return NextResponse.json({ error: err.message || 'Could not sync subscription.' }, { status: 500 });
  }
}
