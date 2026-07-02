import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { applySubscriptionToProfile, readSubscriptionFromProfile } from '@/lib/stripe-profile';

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
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id.' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.client_reference_id !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to this user.' }, { status: 403 });
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment has not completed yet.', isPro: false }, { status: 200 });
    }

    const subscription = session.subscription;
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const subscriptionFields = {
      is_pro: true,
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: typeof subscription === 'string' ? subscription : subscription?.id || null,
      pro_current_period_end: periodEnd,
      pro_cancel_at_period_end:
        typeof subscription === 'object' ? !!subscription?.cancel_at_period_end : false,
      pro_since: new Date().toISOString(),
    };

    const { error: updateError } = await applySubscriptionToProfile(user, subscriptionFields);

    if (updateError) {
      console.error('PROFILE PRO UPDATE ERROR:', updateError.message || updateError.code || updateError);
      return NextResponse.json(
        {
          error:
            'Payment succeeded but could not update your account (likely missing `profiles` columns — run the Pro subscription SQL migration in Supabase, then contact support if it persists).',
        },
        { status: 500 }
      );
    }

    const { status } = await readSubscriptionFromProfile(user.id);

    return NextResponse.json({ isPro: status?.isPro ?? true });
  } catch (err) {
    console.error('STRIPE VERIFY SESSION ERROR:', err);
    return NextResponse.json({ error: err.message || 'Could not verify session.' }, { status: 500 });
  }
}
