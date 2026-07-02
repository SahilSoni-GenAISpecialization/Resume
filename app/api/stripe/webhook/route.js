import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

/**
 * Not wired up until the app is deployed with a public URL and this endpoint is registered
 * in the Stripe dashboard (with STRIPE_WEBHOOK_SECRET set). Keeps Pro status in sync for
 * renewals, failed payments, and cancellations without relying on the checkout redirect alone.
 */
export async function POST(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 501 });
  }

  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('STRIPE WEBHOOK SIGNATURE ERROR:', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) break;

        const subscription = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription)
          : null;

        await supabase
          .from('profiles')
          .update({
            is_pro: true,
            stripe_customer_id: session.customer || null,
            stripe_subscription_id: subscription?.id || null,
            pro_current_period_end: subscription?.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            pro_since: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        const isActive = ['active', 'trialing'].includes(subscription.status);

        const query = supabase.from('profiles').update({
          is_pro: isActive,
          pro_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        });

        if (userId) {
          await query.eq('id', userId);
        } else {
          await query.eq('stripe_customer_id', subscription.customer);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;

        const query = supabase.from('profiles').update({ is_pro: false });

        if (userId) {
          await query.eq('id', userId);
        } else {
          await query.eq('stripe_customer_id', subscription.customer);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('STRIPE WEBHOOK HANDLER ERROR:', err);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}
