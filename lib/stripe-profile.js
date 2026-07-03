import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Persist Stripe subscription fields on `profiles`. Uses the service-role client so the write
 * succeeds even when no profile row exists yet (common for users who paid before saving /app).
 */
export async function applySubscriptionToProfile(user, subscriptionFields) {
  const admin = createAdminClient();

  const row = {
    id: user.id,
    email: user.email || null,
    updated_at: new Date().toISOString(),
    ...subscriptionFields,
  };

  let { error } = await admin.from('profiles').upsert(row, { onConflict: 'id' });

  if (error && 'pro_cancel_at_period_end' in row) {
    const { pro_cancel_at_period_end, ...withoutCancelFlag } = row;
    ({ error } = await admin.from('profiles').upsert(withoutCancelFlag, { onConflict: 'id' }));
  }

  return { error };
}

export async function readSubscriptionFromProfile(userId) {
  const admin = createAdminClient();

  let { data, error } = await admin
    .from('profiles')
    .select('is_pro, pro_current_period_end, pro_cancel_at_period_end')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    const retry = await admin
      .from('profiles')
      .select('is_pro, pro_current_period_end')
      .eq('id', userId)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { error, status: null };
  }

  const periodEnd = data?.pro_current_period_end ?? null;
  let isPro = !!data?.is_pro;

  if (isPro && periodEnd) {
    const end = new Date(periodEnd);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
      isPro = false;
    }
  }

  return {
    error: null,
    status: {
      isPro,
      cancelAtPeriodEnd: !!data?.pro_cancel_at_period_end,
      periodEnd,
    },
  };
}

export function isMissingStripeCustomerError(err) {
  const msg = err?.message || '';
  return err?.code === 'resource_missing' || msg.includes('No such customer');
}

/** Remove test-mode or orphaned Stripe IDs so the user can subscribe again in live mode. */
export async function clearStripeBillingFields(userId) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      is_pro: false,
      pro_current_period_end: null,
      pro_cancel_at_period_end: false,
      pro_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  return { error };
}

/** Return a live Stripe customer id, clearing the profile if the stored id is invalid. */
export async function resolveStripeCustomerId(stripe, userId, storedCustomerId) {
  if (!storedCustomerId) return null;

  try {
    await stripe.customers.retrieve(storedCustomerId);
    return storedCustomerId;
  } catch (err) {
    if (!isMissingStripeCustomerError(err)) throw err;
    await clearStripeBillingFields(userId);
    return null;
  }
}
