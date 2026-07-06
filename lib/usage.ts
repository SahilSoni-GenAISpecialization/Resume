import type { SupabaseClient } from '@supabase/supabase-js';

export const FREE_RESUME_LIMIT = 5;

export function getCurrentUsageMonth() {
  return new Date().toISOString().slice(0, 7);
}

export type ResumeUsage = {
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
  /** True when the subscription is set to cancel at the end of the current period. */
  cancelAtPeriodEnd: boolean;
  /** ISO date the Pro access is paid through (end of current billing period). */
  periodEnd: string | null;
};

export type SubscriptionStatus = {
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
};

const USAGE_CACHE_TTL_MS = 2 * 60 * 1000;
const usageCache = new Map<string, { at: number; usage: ResumeUsage }>();

export function clearUsageCache(userId?: string | null) {
  if (userId) usageCache.delete(userId);
  else usageCache.clear();
}

/**
 * Real subscription status lives on the `profiles` row (set by Stripe checkout/webhooks),
 * not on the monthly `user_usage` row — a subscription persists across calendar months.
 */
export async function fetchSubscription(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<SubscriptionStatus> {
  if (!userId) {
    return { isPro: false, cancelAtPeriodEnd: false, periodEnd: null };
  }

  // Read from profiles via the signed-in user's Supabase client (RLS: own row only).
  // Avoid routing every page load / tab focus through /api/stripe/pro-status.
  let { data, error } = await supabase
    .from('profiles')
    .select('is_pro, pro_current_period_end, pro_cancel_at_period_end')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    const retry = await supabase
      .from('profiles')
      .select('is_pro, pro_current_period_end')
      .eq('id', userId)
      .maybeSingle();
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    console.error(
      'profiles pro-status read failed:',
      error.message || error.code || error,
      '— have you run the `profiles` subscription-columns SQL migration in Supabase?'
    );
    return { isPro: false, cancelAtPeriodEnd: false, periodEnd: null };
  }

  const periodEnd = (data?.pro_current_period_end as string | null) ?? null;
  let isPro = !!data?.is_pro;

  if (isPro && periodEnd) {
    const end = new Date(periodEnd);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
      isPro = false;
    }
  }

  return {
    isPro,
    cancelAtPeriodEnd: !!(data as { pro_cancel_at_period_end?: boolean } | null)?.pro_cancel_at_period_end,
    periodEnd,
  };
}

export async function fetchProStatus(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<boolean> {
  return (await fetchSubscription(supabase, userId)).isPro;
}

/** Shared usage pool for resume tailoring, cover letters, and thank-you emails. */
export async function fetchMonthlyResumeUsage(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  options?: { force?: boolean }
): Promise<ResumeUsage> {
  if (!userId) {
    return {
      used: 0,
      limit: FREE_RESUME_LIMIT,
      remaining: FREE_RESUME_LIMIT,
      isPro: false,
      cancelAtPeriodEnd: false,
      periodEnd: null,
    };
  }

  if (!options?.force && typeof window !== 'undefined') {
    const cached = usageCache.get(userId);
    if (cached && Date.now() - cached.at < USAGE_CACHE_TTL_MS) {
      return cached.usage;
    }
  }

  const month = getCurrentUsageMonth();

  const [{ data: usageRow, error }, sub] = await Promise.all([
    supabase
      .from('user_usage')
      .select('tailor_count')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle(),
    fetchSubscription(supabase, userId),
  ]);

  if (error) {
    console.error('user_usage read failed:', error);
  }

  const used = usageRow?.tailor_count ?? 0;

  const usage: ResumeUsage = {
    used,
    limit: FREE_RESUME_LIMIT,
    remaining: sub.isPro ? Infinity : Math.max(FREE_RESUME_LIMIT - used, 0),
    isPro: sub.isPro,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    periodEnd: sub.periodEnd,
  };

  if (typeof window !== 'undefined') {
    usageCache.set(userId, { at: Date.now(), usage });
  }

  return usage;
}

export async function resetMonthlyResumeUsage(supabase: SupabaseClient, userId: string) {
  const month = getCurrentUsageMonth();

  const { error } = await supabase.from('user_usage').upsert(
    {
      user_id: userId,
      month,
      tailor_count: 0,
    },
    { onConflict: 'user_id,month' }
  );

  if (error) throw error;

  return fetchMonthlyResumeUsage(supabase, userId);
}

export function formatProAccessDate(periodEnd: string | null): string {
  if (!periodEnd) return '';
  const d = new Date(periodEnd);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatUsageLabel(usage: ResumeUsage) {
  if (usage.isPro) {
    if (usage.cancelAtPeriodEnd && usage.periodEnd) {
      return `Pro · ends ${formatProAccessDate(usage.periodEnd)}`;
    }
    return 'Pro · Unlimited';
  }
  return `${usage.used}/${usage.limit} used · ${usage.remaining} left`;
}
