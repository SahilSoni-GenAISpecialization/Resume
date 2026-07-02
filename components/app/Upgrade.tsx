'use client';

import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import '@/app/app.css';

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
};

export function UpgradeModal({ open, onClose, onConfirm, loading, error }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="upgrade-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upgrade-modal">
        <div className="upgrade-modal-badge">✨ Applymatic Pro</div>
        <div className="upgrade-price">
          CAD $9.99<span>/month</span>
        </div>

        <ul className="upgrade-benefits">
          <li>Unlimited tailored resumes</li>
          <li>Unlimited tailored cover letters</li>
          <li>Unlimited personalized thank-you emails</li>
          <li>No more monthly limits — ever</li>
        </ul>

        {!!error && <div className="upgrade-error-note">{error}</div>}

        <div className="upgrade-terms">
          Cancel anytime from your billing settings. Payments are non-refundable — if you cancel, you'll keep
          full Pro access through the end of the month you already paid for.
        </div>

        <div className="upgrade-modal-actions">
          <button className="upgrade-btn-cancel" onClick={onClose}>
            Not now
          </button>
          <button className="upgrade-btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Redirecting to checkout...' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
    </div>
  );
}

type UpgradeBannerProps = {
  show: boolean;
  onUpgradeClick: () => void;
};

export function UpgradeBanner({ show, onUpgradeClick }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) return null;

  return (
    <div className="upgrade-banner">
      <button className="upgrade-banner-close" onClick={() => setDismissed(true)} aria-label="Dismiss">
        ✕
      </button>
      <div className="upgrade-banner-copy">
        <span className="upgrade-banner-emoji">✨</span>
        <div>
          <div className="upgrade-banner-title">Upgrade to Pro</div>
          <div className="upgrade-banner-sub">Get unlimited resumes, cover letters &amp; thank-you emails.</div>
        </div>
      </div>
      <button className="upgrade-banner-btn" onClick={onUpgradeClick}>
        Upgrade
      </button>
    </div>
  );
}

/**
 * Handles: opening the modal, creating a Stripe Checkout session and redirecting to it,
 * and verifying a returning `?upgrade=success&session_id=...` redirect from Stripe.
 */
export function useUpgradeFlow(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  callbacks?: {
    refresh?: () => void | Promise<void>;
    markPro?: () => void;
  }
) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyBanner, setVerifyBanner] = useState<'success' | 'error' | null>(null);
  const verifiedRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const refreshRef = useRef(callbacks?.refresh);
  const markProRef = useRef(callbacks?.markPro);
  refreshRef.current = callbacks?.refresh;
  markProRef.current = callbacks?.markPro;

  useEffect(() => {
    if (typeof window === 'undefined' || verifiedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const upgradeParam = params.get('upgrade');

    if (!sessionId || upgradeParam !== 'success') return;
    verifiedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (!res.ok || !json.isPro) throw new Error(json.error || 'Could not verify payment.');

        setVerifyBanner('success');
        markProRef.current?.();

        if (userId) {
          await refreshRef.current?.();
        } else {
          pendingRefreshRef.current = true;
        }
      } catch (err) {
        console.error('Upgrade verification failed:', err);
        setVerifyBanner('error');
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('session_id');
        url.searchParams.delete('upgrade');
        window.history.replaceState({}, '', url.toString());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After Stripe redirect, user id may still be loading — refresh once it is available.
  useEffect(() => {
    if (!pendingRefreshRef.current || !userId) return;
    pendingRefreshRef.current = false;
    void refreshRef.current?.();
  }, [userId]);

  useEffect(() => {
    // Reset a "redirecting to checkout..." state that can get frozen by bfcache when the
    // user hits the browser back button after being sent to Stripe.
    function resetOnRestore(event: Event) {
      if (event.type === 'pageshow' && !(event as PageTransitionEvent).persisted) return;
      setLoading(false);
    }

    window.addEventListener('pageshow', resetOnRestore);
    return () => window.removeEventListener('pageshow', resetOnRestore);
  }, []);

  function openModal() {
    setError('');
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function startCheckout() {
    if (!userId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: window.location.pathname }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.');
      window.location.href = json.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong starting checkout.');
      setLoading(false);
    }
  }

  return {
    modalOpen: open,
    openModal,
    closeModal,
    startCheckout,
    checkoutLoading: loading,
    checkoutError: error,
    verifyBanner,
    dismissVerifyBanner: () => setVerifyBanner(null),
  };
}
