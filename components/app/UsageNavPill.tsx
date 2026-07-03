'use client';

import { useEffect, useState } from 'react';
import '@/app/app.css';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchMonthlyResumeUsage,
  formatUsageLabel,
  FREE_RESUME_LIMIT,
  type ResumeUsage,
} from '@/lib/usage';

const EMPTY_USAGE: ResumeUsage = {
  used: 0,
  limit: FREE_RESUME_LIMIT,
  remaining: FREE_RESUME_LIMIT,
  isPro: false,
  cancelAtPeriodEnd: false,
  periodEnd: null,
};

type UsageNavPillProps = {
  supabase: SupabaseClient;
  userId?: string | null;
  /** Pass from the parent page hook so nav + page share one usage source. */
  usage?: ResumeUsage;
  usageLoading?: boolean;
  className?: string;
  limitHitClassName?: string;
};

export function useResumeUsage(supabase: SupabaseClient, userId?: string | null) {
  const [usage, setUsage] = useState<ResumeUsage>(EMPTY_USAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUsage(EMPTY_USAGE);
      setLoading(false);
      return;
    }

    const activeUserId = userId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const stats = await fetchMonthlyResumeUsage(supabase, activeUserId);
        if (!cancelled) {
          setUsage(stats);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    const refresh = () => {
      cancelled = false;
      load();
    };

    window.addEventListener('focus', refresh);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Browser back/forward cache can restore the page with loading stuck mid-fetch
    // (e.g. after returning from Stripe checkout). Re-fetch when that happens.
    const onPageShow = (event: Event) => {
      if (!(event as PageTransitionEvent).persisted) return;
      cancelled = false;
      load();
    };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [supabase, userId]);

  async function refreshUsage() {
    if (!userId) return;
    setLoading(true);
    try {
      const stats = await fetchMonthlyResumeUsage(supabase, userId);
      setUsage(stats);
    } finally {
      setLoading(false);
    }
  }

  return {
    usage,
    loading,
    refresh: refreshUsage,
    /** Immediately reflect Pro after Stripe checkout, before profile fetch completes. */
    markPro: () =>
      setUsage((prev) => ({
        ...prev,
        isPro: true,
        remaining: Infinity,
        cancelAtPeriodEnd: false,
        periodEnd: null,
      })),
    /** Optimistically bump the used count right when an action starts, before the request resolves. */
    bump: () =>
      setUsage((prev) =>
        prev.isPro
          ? prev
          : {
              ...prev,
              used: prev.used + 1,
              remaining: Math.max(prev.remaining - 1, 0),
            }
      ),
  };
}

export default function UsageNavPill({
  supabase,
  userId,
  usage: usageProp,
  usageLoading,
  className = 'app-usage-pill',
  limitHitClassName = '',
}: UsageNavPillProps) {
  const internal = useResumeUsage(supabase, usageProp ? null : userId);
  const usage = usageProp ?? internal.usage;
  const loading = usageLoading ?? internal.loading;
  const atLimit = !usage.isPro && usage.used >= usage.limit;

  // Hide the usage pill for active (non-cancelling) Pro users. Keep it visible when the
  // subscription is set to cancel so they can see the date access ends.
  if (!loading && usage.isPro && !usage.cancelAtPeriodEnd) return null;

  return (
    <div className={`${className}${atLimit ? ` ${limitHitClassName}` : ''}`.trim()}>
      {loading ? 'Loading usage...' : formatUsageLabel(usage)}
    </div>
  );
}
