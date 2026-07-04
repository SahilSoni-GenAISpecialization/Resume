'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FREE_RESUME_LIMIT, formatProAccessDate } from '@/lib/usage';
import UsageNavPill, { useResumeUsage } from '@/components/app/UsageNavPill';
import { UpgradeBanner, UpgradeModal, useUpgradeFlow } from '@/components/app/Upgrade';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { getApiErrorMessage, postJsonApi, readApiJson, sanitizeJobDescription, FREE_LIMIT_MESSAGE } from '@/lib/api-response';
import {
  countSavedGenerations,
  hasCoverLetter,
  hasTailoredResume,
  hasThankYouEmail,
  searchUrlForApplication,
} from '@/lib/application-docs';
import {
  applicationWithThankYou,
  getStoredThankYouEmail,
  saveThankYouEmailToApplication,
} from '@/lib/thank-you-storage';
import '@/app/app.css';

const FREE_TIER_LIMIT = FREE_RESUME_LIMIT;

const STATUS_OPTIONS = ['Tailored', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

const STATUS_COLORS = {
  Tailored: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)', text: '#7c3aed' },
  Applied: { bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.25)', text: '#2563eb' },
  Interviewing: { bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)', text: '#d97706' },
  Offer: { bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.3)', text: '#059669' },
  Rejected: { bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.2)', text: '#dc2626' },
};

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'applied') return 'Applied';
  if (value === 'interviewing' || value === 'interview') return 'Interviewing';
  if (value === 'offer' || value === 'offered') return 'Offer';
  if (value === 'rejected' || value === 'reject') return 'Rejected';
  if (value === 'tailored' || value === 'ready' || value === 'draft' || value === '') return 'Tailored';

  return 'Tailored';
}

function toDisplayStatus(status) {
  return normalizeStatus(status);
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({
    company: '',
    job_title: '',
    status: 'Applied',
    apply_url: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [managingBilling, setManagingBilling] = useState(false);
  const [syncingSub, setSyncingSub] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const { usage, loading: usageLoading, refresh: refreshUsage, markPro } = useResumeUsage(supabase, userId);
  const {
    modalOpen: upgradeModalOpen,
    openModal: openUpgradeModal,
    closeModal: closeUpgradeModal,
    startCheckout,
    checkoutLoading,
    checkoutError,
    verifyBanner,
    dismissVerifyBanner,
  } = useUpgradeFlow(supabase, userId, { refresh: refreshUsage, markPro });
  const [thankYou, setThankYou] = useState({
    open: false,
    app: null,
    details: '',
    loading: false,
    error: '',
    result: null,
    copied: false,
  });
  const [docViewer, setDocViewer] = useState({
    open: false,
    title: '',
    content: '',
    copied: false,
  });
  const [tailorWizard, setTailorWizard] = useState({
    open: false,
    app: null,
    type: 'resume',
    step: 'prompt',
    jobDescription: '',
    loading: false,
    error: '',
  });

  useEffect(() => {
    // If the user navigates away (e.g. to the Stripe billing portal or checkout) and then hits
    // the browser back button, bfcache can restore this page with stale "loading" state frozen
    // mid-redirect. Reset those flags whenever the page becomes visible/restored again.
    function resetStuckLoadingState(event) {
      if (event && event.type === 'pageshow' && !event.persisted) return;
      setManagingBilling(false);
      setSyncingSub(false);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') resetStuckLoadingState();
    }

    window.addEventListener('pageshow', resetStuckLoadingState);
    window.addEventListener('focus', resetStuckLoadingState);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', resetStuckLoadingState);
      window.removeEventListener('focus', resetStuckLoadingState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const [{ data: p }, { data: apps }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('applications').select('*').eq('user_id', user.id).order('applied_at', { ascending: false }),
      ]);

      setProfile(p || null);
      setApplications(apps || []);
      setUserId(user.id);
      setLoading(false);
    }

    load();
  }, [supabase]);

  // When the user returns from the Stripe billing portal (e.g. after cancelling), re-sync their
  // subscription so cancellation / renewal state is reflected right away.
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'updated') return;

    (async () => {
      try {
        await fetch('/api/stripe/sync-subscription', { method: 'POST' });
        markPro();
        await refreshUsage();
      } catch {
        /* non-fatal */
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('billing');
        window.history.replaceState({}, '', url.toString());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const now = new Date();

  const thisMonthApps = applications.filter((a) => {
    if (!a.applied_at) return false;
    const d = new Date(a.applied_at);
    if (Number.isNaN(d.getTime())) return false;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const statusCounts = {
  Applied: applications.filter((a) => normalizeStatus(a.status) === 'Applied').length,
  Interviewing: applications.filter((a) => normalizeStatus(a.status) === 'Interviewing').length,
  Offer: applications.filter((a) => normalizeStatus(a.status) === 'Offer').length,
  Rejected: applications.filter((a) => normalizeStatus(a.status) === 'Rejected').length,
};

  const usagePct = usage.isPro ? 100 : Math.min((usage.used / FREE_TIER_LIMIT) * 100, 100);
  const usageLeft = usage.isPro ? Infinity : Math.max(FREE_TIER_LIMIT - usage.used, 0);
  const savedGenerations = useMemo(() => countSavedGenerations(applications), [applications]);

  const filtered =
    statusFilter === 'This month'
      ? thisMonthApps
      : applications;

  async function handleManageBilling() {
    setManagingBilling(true);
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not open billing portal.');
      window.location.href = json.url;
    } catch (err) {
      alert(err.message || 'Could not open billing portal.');
      setManagingBilling(false);
    }
  }

  async function handleSyncSubscription() {
    setSyncingSub(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/stripe/sync-subscription', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not sync subscription.');
      if (json.isPro) markPro();
      await refreshUsage();
      setSyncMessage(
        json.isPro ? 'Pro status confirmed and applied!' : 'No active subscription found for this account.'
      );
    } catch (err) {
      setSyncMessage(err.message || 'Could not sync subscription.');
    } finally {
      setSyncingSub(false);
    }
  }

  function openAdd() {
    setEditRow(null);
    setForm({
      company: '',
      job_title: '',
      status: 'Applied',
      apply_url: '',
      notes: '',
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditRow(row);
    setForm({
      company: row.company || '',
      job_title: row.job_title || '',
      status: toDisplayStatus(row.status),
      apply_url: row.apply_url || '',
      notes: row.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.company.trim() || !form.job_title.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      company: form.company.trim(),
      job_title: form.job_title.trim(),
      status: toDisplayStatus(form.status),
      apply_url: form.apply_url.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editRow) {
      const { data } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', editRow.id)
        .select()
        .single();

      setApplications((prev) => prev.map((a) => (a.id === editRow.id ? data : a)));
    } else {
      const insertPayload = {
        ...payload,
        user_id: user.id,
        applied_at: new Date().toISOString(),
      };

      const { data } = await supabase
        .from('applications')
        .insert(insertPayload)
        .select()
        .single();

      setApplications((prev) => [data, ...prev]);
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id) {
    await supabase.from('applications').delete().eq('id', id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setDeleteId(null);
  }

  function openThankYou(app) {
    const saved = getStoredThankYouEmail(app);
    setThankYou({
      open: true,
      app,
      details: '',
      loading: false,
      error: '',
      result: saved,
      copied: false,
    });
  }

  function closeThankYou() {
    setThankYou({ open: false, app: null, details: '', loading: false, error: '', result: null, copied: false });
  }

  function openDocViewer(app, type) {
    const title =
      type === 'resume'
        ? `Tailored resume — ${app.job_title} at ${app.company}`
        : `Cover letter — ${app.job_title} at ${app.company}`;
    const content = type === 'resume' ? app.tailored_resume : app.cover_letter;
    setDocViewer({ open: true, title, content: content || '', copied: false });
  }

  function closeDocViewer() {
    setDocViewer({ open: false, title: '', content: '', copied: false });
  }

  function handleCopyDoc() {
    if (!docViewer.content) return;
    navigator.clipboard.writeText(docViewer.content);
    setDocViewer((d) => ({ ...d, copied: true }));
    setTimeout(() => setDocViewer((d) => ({ ...d, copied: false })), 2000);
  }

  function tailorWizardLabel(type) {
    return type === 'cover' ? 'cover letter' : 'tailored resume';
  }

  function tailorWizardTitle(type) {
    return type === 'cover' ? 'Cover letter' : 'Tailored resume';
  }

  function openTailorWizard(app, type) {
    const savedDescription = String(app.job_description || '').trim();
    setTailorWizard({
      open: true,
      app,
      type,
      step: savedDescription ? 'prompt' : 'needs_jd',
      jobDescription: savedDescription,
      loading: false,
      error: '',
    });
  }

  function closeTailorWizard() {
    setTailorWizard({
      open: false,
      app: null,
      type: 'resume',
      step: 'prompt',
      jobDescription: '',
      loading: false,
      error: '',
    });
  }

  async function handleTailorGenerate() {
    const { app, type, jobDescription } = tailorWizard;
    if (!app) return;

    const jd = String(jobDescription || '').trim();
    if (!jd) {
      setTailorWizard((w) => ({ ...w, step: 'needs_jd', error: 'Job description is required to generate this document.' }));
      return;
    }

    if (!profile) {
      setTailorWizard((w) => ({
        ...w,
        error: 'Your saved profile is missing. Complete your profile first, then try again.',
      }));
      return;
    }

    if (!usage.isPro && usage.used >= usage.limit) {
      setTailorWizard((w) => ({ ...w, error: FREE_LIMIT_MESSAGE }));
      return;
    }

    setTailorWizard((w) => ({ ...w, loading: true, error: '' }));

    try {
      const mode = type === 'cover' ? 'cover_letter' : 'resume';
      const json = await postJsonApi('/api/tailor-resume', {
        jobDescription: sanitizeJobDescription(jd),
        jobTitle: String(app.job_title || '').slice(0, 300),
        company: String(app.company || '').slice(0, 200),
        applyUrl: String(app.apply_url || '').slice(0, 500),
        mode,
      });

      const content = type === 'cover' ? json.coverLetter || '' : json.resume || '';
      const appId = app.id;

      setApplications((prev) =>
        prev.map((a) => {
          if (a.id !== appId) return a;
          if (type === 'cover') {
            return { ...a, cover_letter: content, job_description: jd };
          }
          return {
            ...a,
            tailored_resume: content,
            match_score: json.matchScore ?? a.match_score,
            job_description: jd,
          };
        })
      );

      closeTailorWizard();
      openDocViewer(
        {
          ...app,
          tailored_resume: type === 'resume' ? content : app.tailored_resume,
          cover_letter: type === 'cover' ? content : app.cover_letter,
        },
        type
      );
    } catch (err) {
      setTailorWizard((w) => ({
        ...w,
        loading: false,
        error: err.message || 'Something went wrong.',
      }));
    } finally {
      refreshUsage();
    }
  }

  async function handleGenerateThankYou() {
    if (!thankYou.app) return;

    if (!usage.isPro && usage.used >= usage.limit) {
      setThankYou((t) => ({
        ...t,
        error: 'You have used all 5 free generations this month. Upgrade to Pro for unlimited thank-you emails.',
      }));
      return;
    }

    setThankYou((t) => ({ ...t, loading: true, error: '' }));

    try {
      const json = await postJsonApi('/api/generate-thank-you-email', {
        company: thankYou.app.company,
        jobTitle: thankYou.app.job_title,
        interviewDetails: thankYou.details,
        applicationId: thankYou.app.id,
      });

      const result = { subject: json.subject || '', body: json.body || '' };
      const appId = thankYou.app.id;
      const saveMeta = await saveThankYouEmailToApplication(
        supabase,
        appId,
        userId,
        result,
        thankYou.app.notes || ''
      );

      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId ? applicationWithThankYou(a, result, saveMeta) : a
        )
      );

      setThankYou((t) => ({
        ...t,
        loading: false,
        result,
        error: saveMeta.saved ? '' : 'Email generated but could not be saved to your account. Please try again.',
      }));
    } catch (err) {
      setThankYou((t) => ({ ...t, loading: false, error: err.message || 'Something went wrong.' }));
    } finally {
      refreshUsage();
    }
  }

  function handleCopyThankYou() {
    if (!thankYou.result) return;
    const text = `Subject: ${thankYou.result.subject}\n\n${thankYou.result.body}`;
    navigator.clipboard.writeText(text);
    setThankYou((t) => ({ ...t, copied: true }));
    setTimeout(() => setThankYou((t) => ({ ...t, copied: false })), 2000);
  }

  function getThankYouMailto() {
    if (!thankYou.result) return '#';
    const subject = encodeURIComponent(thankYou.result.subject || '');
    const body = encodeURIComponent(thankYou.result.body || '');
    return `mailto:?subject=${subject}&body=${body}`;
  }

  const firstName = profile?.first_name || profile?.full_name?.split(' ')?.[0] || 'there';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .shell { min-height: 100vh; background: radial-gradient(circle at top left, rgba(37,99,235,0.07), transparent 30%), radial-gradient(circle at bottom right, rgba(124,58,237,0.05), transparent 25%), #f8fafc; }

        .topbar { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; border-bottom: 1px solid rgba(15,23,42,0.07); background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); }
        .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .brand-mark { width: 36px; height: 36px; border-radius: 9px; background: linear-gradient(135deg, #2563eb, #7c3aed); display: flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 17px; font-weight: 700; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .btn-ghost { background: rgba(15,23,42,0.05); border: 1px solid rgba(15,23,42,0.1); color: #475569; padding: 9px 14px; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; }
        .btn-ghost:hover { background: rgba(15,23,42,0.09); color: #0f172a; }
        .btn-primary { background: #2563eb; border: none; color: white; padding: 10px 18px; font-size: 14px; font-weight: 700; border-radius: 9px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; }
        .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.3); }

        .layout { max-width: 1280px; margin: 0 auto; padding: 36px 28px; }
        .page-header { margin-bottom: 32px; }
        .page-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
        .page-sub { color: #64748b; font-size: 14px; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .kpi-card { background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.08); border-radius: 16px; padding: 20px 22px; }
        .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; margin-bottom: 10px; }
        .kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; margin-bottom: 4px; }
        .kpi-sub { font-size: 12px; color: #64748b; }
        .kpi-blue { color: #2563eb; }
        .kpi-green { color: #059669; }
        .kpi-yellow { color: #d97706; }

        .usage-bar-wrap { margin-top: 10px; }
        .usage-bar-track { height: 6px; border-radius: 99px; background: rgba(15,23,42,0.07); overflow: hidden; }
        .usage-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }

        .status-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
        .status-pill { padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: all 0.18s; background: rgba(15,23,42,0.04); color: #64748b; border-color: rgba(15,23,42,0.08); }
        .status-pill:hover { background: rgba(15,23,42,0.07); color: #0f172a; }
        .status-pill.active { background: rgba(37,99,235,0.15); color: #2563eb; border-color: rgba(37,99,235,0.3); }
        .status-pill-count { margin-left: 5px; opacity: 0.7; }

        .table-card { background: rgba(15,23,42,0.025); border: 1px solid rgba(15,23,42,0.08); border-radius: 20px; overflow: hidden; }
        .table-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(15,23,42,0.07); }
        .table-title { font-size: 16px; font-weight: 700; }
        .table-count { font-size: 12px; color: #64748b; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        thead th { padding: 12px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; text-align: left; border-bottom: 1px solid rgba(15,23,42,0.06); }
        tbody tr { border-bottom: 1px solid rgba(15,23,42,0.04); transition: background 0.15s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: rgba(15,23,42,0.02); }
        tbody td { padding: 14px 20px; font-size: 13px; vertical-align: middle; }
        .td-company { font-weight: 700; color: #0f172a; }
        .td-role { color: #334155; }
        .td-date { color: #64748b; font-size: 12px; white-space: nowrap; }
        .td-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }

        .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .status-select { background: transparent; border: none; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; outline: none; padding: 4px 10px; border-radius: 99px; appearance: none; -webkit-appearance: none; }

        .icon-btn { background: rgba(15,23,42,0.04); border: 1px solid rgba(15,23,42,0.08); border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; color: #475569; transition: all 0.18s; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; }
        .icon-btn:hover { background: rgba(15,23,42,0.08); color: #0f172a; }
        .icon-btn.danger:hover { background: rgba(220,38,38,0.1); color: #dc2626; border-color: rgba(220,38,38,0.2); }
        .icon-btn.edit:hover { background: rgba(37,99,235,0.1); color: #2563eb; border-color: rgba(37,99,235,0.2); }
        .icon-btn.thank:hover { background: rgba(124,58,237,0.1); color: #7c3aed; border-color: rgba(124,58,237,0.2); }
        .icon-btn.generated { background: rgba(5,150,105,0.12); border-color: rgba(5,150,105,0.32); color: #059669; font-weight: 600; }
        .icon-btn.generated:hover { background: rgba(5,150,105,0.18); color: #047857; border-color: rgba(5,150,105,0.45); }
        .gen-legend { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 0 20px 14px; font-size: 11.5px; color: #64748b; }
        .gen-legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .gen-legend-dot { width: 10px; height: 10px; border-radius: 4px; border: 1px solid rgba(15,23,42,0.1); background: rgba(15,23,42,0.04); }
        .gen-legend-dot.saved { background: rgba(5,150,105,0.15); border-color: rgba(5,150,105,0.35); }
        .doc-preview { width: 100%; min-height: 320px; max-height: 60vh; overflow: auto; background: rgba(15,23,42,0.04); border: 1px solid rgba(15,23,42,0.08); border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.65; white-space: pre-wrap; color: #334155; font-family: inherit; }
        .wizard-card { background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.08); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
        .wizard-lead { font-size: 14px; line-height: 1.65; color: #334155; margin-bottom: 14px; }
        .wizard-role { font-weight: 700; color: #0f172a; }
        .wizard-company { font-weight: 700; color: #2563eb; }
        .wizard-cta { width: 100%; justify-content: center; margin-top: 4px; }
        .wizard-secondary { font-size: 12.5px; color: #64748b; text-align: center; margin-top: 14px; }
        .wizard-secondary a { color: #2563eb; font-weight: 600; text-decoration: none; }
        .wizard-secondary a:hover { text-decoration: underline; }

        .ai-note { background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.2); color: #1d4ed8; padding: 12px 14px; border-radius: 10px; font-size: 12.5px; line-height: 1.6; margin-bottom: 16px; }
        .error-note { background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.2); color: #dc2626; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
        .success-note { background: rgba(5,150,105,0.08); border: 1px solid rgba(5,150,105,0.25); color: #059669; padding: 12px 16px; border-radius: 10px; font-size: 13px; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 64px 32px; color: #94a3b8; }
        .empty-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.5; }
        .empty-title { font-size: 16px; font-weight: 600; color: #64748b; margin-bottom: 6px; }
        .empty-sub { font-size: 13px; color: #94a3b8; line-height: 1.7; max-width: 320px; margin-bottom: 20px; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #ffffff; border: 1px solid rgba(15,23,42,0.1); border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; box-shadow: 0 24px 60px rgba(15,23,42,0.5); }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 22px; }
        .field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
        .label { font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.06em; }
        .input, .select-input, .textarea-input { width: 100%; background: rgba(15,23,42,0.05); border: 1px solid rgba(15,23,42,0.1); color: #0f172a; border-radius: 10px; padding: 11px 13px; font-size: 14px; outline: none; font-family: inherit; transition: all 0.2s; }
        .input::placeholder, .textarea-input::placeholder { color: #94a3b8; }
        .input:focus, .select-input:focus, .textarea-input:focus { border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .textarea-input { resize: vertical; min-height: 80px; line-height: 1.6; }
        .modal-actions { display: flex; gap: 10px; margin-top: 6px; justify-content: flex-end; }
        .btn-cancel { background: rgba(15,23,42,0.05); border: 1px solid rgba(15,23,42,0.1); color: #475569; padding: 10px 18px; font-size: 14px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-cancel:hover { background: rgba(15,23,42,0.08); color: #0f172a; }

        .confirm-bar { background: rgba(220,38,38,0.07); border: 1px solid rgba(220,38,38,0.18); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
        .confirm-text { font-size: 13px; color: #dc2626; }
        .confirm-actions { display: flex; gap: 8px; }
        .btn-danger { background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3); color: #dc2626; padding: 7px 14px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.18s; }
        .btn-danger:hover { background: rgba(220,38,38,0.25); }

        .spin { width: 16px; height: 16px; border: 2px solid rgba(37,99,235,0.2); border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .apply-link { color: #2563eb; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 3px; }
        .apply-link:hover { text-decoration: underline; }

        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr 1fr; }
          .layout { padding: 20px 16px; }
          .topbar { padding: 14px 16px; }
          thead th:nth-child(3), tbody td:nth-child(3) { display: none; }
        }
      `}</style>

      <div className="shell">
        <nav className="topbar">
          <a href="/profile" className="brand">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="14" y2="17" />
              </svg>
            </div>
            <div className="brand-name">Applymatic</div>
          </a>

          <div className="topbar-right">
            <UsageNavPill
              supabase={supabase}
              userId={userId}
              usage={usage}
              usageLoading={usageLoading}
              className="usage-badge"
              limitHitClassName="limit-hit"
            />
            {!loading && !usage.isPro && (
              <button type="button" className="upgrade-pill-btn" onClick={openUpgradeModal}>
                ✨ Upgrade to Pro
              </button>
            )}
            {!loading && !usage.isPro && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleSyncSubscription}
                disabled={syncingSub}
                style={{ fontSize: 12 }}
                title="Already paid but still seeing the free tier? Click to re-check with Stripe."
              >
                {syncingSub ? 'Checking...' : 'Already paid? Sync status'}
              </button>
            )}
            {!loading && usage.isPro && (
              <button type="button" className="btn-ghost" onClick={handleManageBilling} disabled={managingBilling}>
                {managingBilling ? 'Opening...' : 'Manage billing'}
              </button>
            )}
            <a href="/search" className="btn-ghost">Job search</a>
            <a href="/profile" className="btn-ghost">Profile</a>
          </div>
        </nav>

        <main className="layout">
          <div className="page-header">
            <div className="page-title">
              {loading ? 'Dashboard' : `Welcome back, ${firstName} 👋`}
            </div>
            <div className="page-sub">
              Track every application, monitor your free tier usage, and stay on top of your job hunt.
            </div>
          </div>

          {!verifyBanner && !!syncMessage && (
            <div className={syncMessage.includes('confirmed') ? 'success-note' : 'error-note'} style={{ marginBottom: 20 }}>
              {syncMessage}
              <button
                type="button"
                onClick={() => setSyncMessage('')}
                style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

          {verifyBanner === 'success' && (
            <div className="success-note" style={{ marginBottom: 20 }}>
              🎉 You're now on Applymatic Pro — unlimited resumes, cover letters, and thank-you emails.
              <button
                type="button"
                onClick={dismissVerifyBanner}
                style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

          {verifyBanner === 'error' && (
            <div className="error-note" style={{ marginBottom: 20 }}>
              We couldn't confirm your payment automatically.
              <button
                type="button"
                onClick={dismissVerifyBanner}
                style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleSyncSubscription}
                  disabled={syncingSub}
                  style={{ fontSize: 12, padding: '7px 12px' }}
                >
                  {syncingSub ? 'Checking Stripe...' : 'Retry: sync subscription status'}
                </button>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Still stuck? Contact {CONTACT_EMAIL}.
                </span>
              </div>
              {!!syncMessage && <div style={{ marginTop: 8, fontSize: 12.5 }}>{syncMessage}</div>}
            </div>
          )}

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total applications</div>
              <div className="kpi-value kpi-blue">{loading ? '—' : applications.length}</div>
              <div className="kpi-sub">all time</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">This month</div>
              <div className="kpi-value kpi-green">{loading ? '—' : thisMonthApps.length}</div>
              <div className="kpi-sub">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            </div>


            <div className="kpi-card">
              <div className="kpi-label">{usage.isPro ? 'Plan' : 'Free tier usage'}</div>
              {usage.isPro ? (
                <>
                  <div className="kpi-value" style={{ color: usage.cancelAtPeriodEnd ? '#d97706' : '#7c3aed', fontSize: 28 }}>
                    {usage.cancelAtPeriodEnd ? 'Pro (ending)' : 'Pro ✨'}
                  </div>
                  <div className="kpi-sub" style={{ marginTop: 6 }}>
                    {usage.cancelAtPeriodEnd && usage.periodEnd
                      ? `Cancelled — Pro access continues until ${formatProAccessDate(usage.periodEnd)}, then you'll move to the free tier.`
                      : 'Unlimited resumes, cover letters & emails'}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginTop: 12, fontSize: 12, padding: '8px 12px' }}
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                  >
                    {managingBilling
                      ? 'Opening...'
                      : usage.cancelAtPeriodEnd
                        ? 'Manage / resume subscription'
                        : 'Manage / cancel subscription'}
                  </button>
                </>
              ) : (
                <>
                  <div className="kpi-value" style={{ color: usagePct >= 80 ? '#dc2626' : '#059669', fontSize: 28 }}>
                    {loading ? '—' : `${usage.used} / ${FREE_TIER_LIMIT}`}
                  </div>
                  <div className="usage-bar-wrap">
                    <div className="usage-bar-track">
                      <div
                        className="usage-bar-fill"
                        style={{
                          width: loading ? '0%' : `${usagePct}%`,
                          background:
                            usagePct >= 80
                              ? 'linear-gradient(90deg, #dc2626, #dc2626)'
                              : 'linear-gradient(90deg, #059669, #2563eb)',
                        }}
                      />
                    </div>
                    <div className="kpi-sub" style={{ marginTop: 6 }}>
                      {loading ? '' : usageLeft > 0 ? `${usageLeft} generations remaining` : 'Limit reached — upgrade to continue'}
                    </div>
                    {!loading && savedGenerations.total > 0 && (
                      <div className="kpi-sub" style={{ marginTop: 8, lineHeight: 1.5 }}>
                        Saved on your account: {savedGenerations.resumes} resume
                        {savedGenerations.resumes === 1 ? '' : 's'},{' '}
                        {savedGenerations.coverLetters} cover letter
                        {savedGenerations.coverLetters === 1 ? '' : 's'},{' '}
                        {savedGenerations.thankYouEmails} thank-you
                        {savedGenerations.thankYouEmails === 1 ? '' : 's'}
                      </div>
                    )}
                    {!loading && (
                      <button
                        type="button"
                        className="upgrade-pill-btn"
                        style={{ marginTop: 12, fontSize: 12, padding: '8px 12px' }}
                        onClick={openUpgradeModal}
                      >
                        ✨ Upgrade to Pro
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div>
                <div className="table-title">Applications</div>
                <div className="table-count">
                  {filtered.length} {statusFilter === 'All' ? 'total' : 'this month'}
                </div>
              </div>
              <button className="btn-primary" onClick={openAdd}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add application
              </button>
            </div>

            <div style={{ padding: '14px 20px 0', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="status-row">
                {[
                  { label: 'All', count: applications.length },
                  { label: 'This month', count: thisMonthApps.length },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`status-pill${statusFilter === item.label ? ' active' : ''}`}
                    onClick={() => setStatusFilter(item.label)}
                    style={
                      statusFilter === item.label && item.label !== 'All'
                        ? {
                            background: STATUS_COLORS.Tailored.bg,
                            borderColor: STATUS_COLORS.Tailored.border,
                            color: STATUS_COLORS.Tailored.text,
                          }
                        : {}
                    }
                  >
                    {item.label}
                    <span className="status-pill-count">{item.count}</span>
                  </button>
                ))}
              </div>
              <div className="gen-legend">
                <span className="gen-legend-item">
                  <span className="gen-legend-dot saved" /> Green = saved (retrievable on any device)
                </span>
                <span className="gen-legend-item">
                  <span className="gen-legend-dot" /> Gray = not generated yet
                </span>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="spin" style={{ width: 24, height: 24, marginBottom: 16 }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">
                  {statusFilter === 'All' ? 'No applications yet' : 'No applications this month'}
                </div>
                <div className="empty-sub">
                  {statusFilter === 'All'
                    ? 'Start tracking your job applications here. Add one manually or apply directly from the job search.'
                    : 'No applications were added this month yet.'}
                </div>
                {statusFilter === 'All' && (
                  <button className="btn-primary" onClick={openAdd}>Add first application</button>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Applied</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    return (
                      <tr key={app.id}>
                        <td>
                          <div className="td-company">{app.company}</div>
                          {app.apply_url && (
                            <a href={app.apply_url} target="_blank" rel="noopener noreferrer" className="apply-link">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              View posting
                            </a>
                          )}
                        </td>

                        <td className="td-role">{app.job_title}</td>

                        <td className="td-date">
                          {app.applied_at
                            ? new Date(app.applied_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td>
                          <div className="td-actions">
                            {hasTailoredResume(app) ? (
                              <button
                                type="button"
                                className="icon-btn generated"
                                style={{ flex: '1 1 auto', justifyContent: 'center' }}
                                onClick={() => openDocViewer(app, 'resume')}
                                title="View saved tailored resume"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                Tailored resume
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ flex: '1 1 auto', justifyContent: 'center' }}
                                onClick={() => openTailorWizard(app, 'resume')}
                                title="Generate a tailored resume for this application"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                Tailored resume
                              </button>
                            )}

                            {hasCoverLetter(app) ? (
                              <button
                                type="button"
                                className="icon-btn generated"
                                style={{ flex: '1 1 auto', justifyContent: 'center' }}
                                onClick={() => openDocViewer(app, 'cover')}
                                title="View saved cover letter"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M4 4h16v16H4z" />
                                  <path d="M8 8h8" />
                                  <path d="M8 12h8" />
                                  <path d="M8 16h5" />
                                </svg>
                                Cover letter
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ flex: '1 1 auto', justifyContent: 'center' }}
                                onClick={() => openTailorWizard(app, 'cover')}
                                title="Generate a cover letter for this application"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M4 4h16v16H4z" />
                                  <path d="M8 8h8" />
                                  <path d="M8 12h8" />
                                  <path d="M8 16h5" />
                                </svg>
                                Cover letter
                              </button>
                            )}

                            <button
                              type="button"
                              className={`icon-btn thank${hasThankYouEmail(app) ? ' generated' : ''}`}
                              style={{ flex: '1 1 auto', justifyContent: 'center' }}
                              onClick={() => openThankYou(app)}
                              title={hasThankYouEmail(app) ? 'View saved thank-you email' : 'Generate thank-you email'}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
                                <path d="M3 6l9 7 9-7" />
                              </svg>
                              Thank you email
                            </button>

                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => setDeleteId(deleteId === app.id ? null : app.id)}
                              title="Delete application"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>

                          {deleteId === app.id && (
                            <div className="confirm-bar">
                              <span className="confirm-text">Delete this application?</span>
                              <div className="confirm-actions">
                                <button
                                  className="btn-cancel"
                                  style={{ padding: '5px 12px', fontSize: 12 }}
                                  onClick={() => setDeleteId(null)}
                                >
                                  Cancel
                                </button>
                                <button className="btn-danger" onClick={() => handleDelete(app.id)}>
                                  Yes, delete
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">{editRow ? 'Edit application' : 'Add application'}</div>

            <div className="field">
              <label className="label">Company *</label>
              <input
                className="input"
                placeholder="e.g. Scotiabank"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Role / Job title *</label>
              <input
                className="input"
                placeholder="e.g. Network Tools Specialist"
                value={form.job_title}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Status</label>
              <select
                className="select-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Apply URL</label>
              <input
                className="input"
                placeholder="https://..."
                value={form.apply_url}
                onChange={(e) => setForm((f) => ({ ...f, apply_url: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Notes</label>
              <textarea
                className="textarea-input"
                placeholder="Referral contact, interview date, notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.company.trim() || !form.job_title.trim()}
              >
                {saving ? <><div className="spin" />Saving...</> : editRow ? 'Save changes' : 'Add application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tailorWizard.open && tailorWizard.app && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !tailorWizard.loading && closeTailorWizard()}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-title">
              {tailorWizardTitle(tailorWizard.type)} not generated yet
            </div>

            <div className="wizard-card">
              <div className="wizard-lead">
                {tailorWizard.step === 'needs_jd' ? (
                  <>
                    We don&apos;t have the job description saved for{' '}
                    <span className="wizard-role">{tailorWizard.app.job_title}</span> at{' '}
                    <span className="wizard-company">{tailorWizard.app.company}</span>.
                    Paste the posting below, then generate your {tailorWizardLabel(tailorWizard.type)}.
                  </>
                ) : (
                  <>
                    A {tailorWizardLabel(tailorWizard.type)} has not been generated for{' '}
                    <span className="wizard-role">{tailorWizard.app.job_title}</span> at{' '}
                    <span className="wizard-company">{tailorWizard.app.company}</span> yet.
                    Click below to create one now using your saved profile.
                  </>
                )}
              </div>

              {tailorWizard.step === 'needs_jd' && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Job description</label>
                  <textarea
                    className="textarea-input"
                    style={{ minHeight: 160 }}
                    placeholder="Paste the full job posting here..."
                    value={tailorWizard.jobDescription}
                    onChange={(e) =>
                      setTailorWizard((w) => ({ ...w, jobDescription: e.target.value, error: '' }))
                    }
                  />
                </div>
              )}
            </div>

            {!!tailorWizard.error && <div className="error-note">{tailorWizard.error}</div>}

            {!profile && (
              <div className="ai-note" style={{ marginBottom: 16 }}>
                Complete your <a href="/profile" style={{ color: '#1d4ed8', fontWeight: 700 }}>profile</a> before generating documents.
              </div>
            )}

            <div className="modal-actions" style={{ flexDirection: tailorWizard.step === 'prompt' ? 'column' : undefined, alignItems: 'stretch' }}>
              <button
                type="button"
                className="btn-primary wizard-cta"
                onClick={handleTailorGenerate}
                disabled={tailorWizard.loading || !profile || (tailorWizard.step === 'needs_jd' && !tailorWizard.jobDescription.trim())}
              >
                {tailorWizard.loading ? (
                  <>
                    <div className="spin" />
                    Generating {tailorWizardLabel(tailorWizard.type)}...
                  </>
                ) : (
                  `Generate ${tailorWizardLabel(tailorWizard.type)} now`
                )}
              </button>
              {!tailorWizard.loading && (
                <button type="button" className="btn-cancel" onClick={closeTailorWizard} style={{ marginTop: tailorWizard.step === 'prompt' ? 10 : 0 }}>
                  Cancel
                </button>
              )}
            </div>

            {tailorWizard.step === 'needs_jd' && !tailorWizard.loading && (
              <div className="wizard-secondary">
                Prefer to find the posting first?{' '}
                <a href={searchUrlForApplication(tailorWizard.app)}>Open job search</a>
              </div>
            )}
          </div>
        </div>
      )}

      {docViewer.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeDocViewer()}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-title">{docViewer.title}</div>
            <div className="doc-preview">{docViewer.content}</div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn-cancel" onClick={closeDocViewer}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handleCopyDoc}>
                {docViewer.copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {thankYou.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeThankYou()}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-title">
              Thank-you email{thankYou.app ? ` — ${thankYou.app.job_title} at ${thankYou.app.company}` : ''}
            </div>

            {!thankYou.result && (
              <>
                <div className="ai-note">
                  ✦ This email is auto-generated. Please add a few details about your interview (interviewer's
                  name, topics discussed, anything memorable) so it can be personalized into a highly
                  professional, tailored thank-you note.
                </div>

                <div className="field">
                  <label className="label">Interview details (optional but recommended)</label>
                  <textarea
                    className="textarea-input"
                    style={{ minHeight: 130 }}
                    placeholder="e.g. Interviewed with Sarah (Engineering Manager) on Tuesday. We discussed the team's migration to microservices and my experience leading similar projects..."
                    value={thankYou.details}
                    onChange={(e) => setThankYou((t) => ({ ...t, details: e.target.value }))}
                  />
                </div>

                {!!thankYou.error && <div className="error-note">{thankYou.error}</div>}

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={closeThankYou}>Cancel</button>
                  <button className="btn-primary" onClick={handleGenerateThankYou} disabled={thankYou.loading}>
                    {thankYou.loading ? <><div className="spin" />Generating...</> : 'Generate thank-you email'}
                  </button>
                </div>
              </>
            )}

            {!!thankYou.result && (
              <>
                <div className="field">
                  <label className="label">Subject</label>
                  <input
                    className="input"
                    value={thankYou.result.subject}
                    onChange={(e) =>
                      setThankYou((t) => ({ ...t, result: { ...t.result, subject: e.target.value } }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label">Body</label>
                  <textarea
                    className="textarea-input"
                    style={{ minHeight: 240 }}
                    value={thankYou.result.body}
                    onChange={(e) =>
                      setThankYou((t) => ({ ...t, result: { ...t.result, body: e.target.value } }))
                    }
                  />
                </div>

                <div className="ai-note">
                  Ready to send — copy the email or open it in your mail client, then just add the recipient's
                  address in the "To" field.
                </div>

                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                  <button className="btn-cancel" onClick={() => setThankYou((t) => ({ ...t, result: null }))}>
                    ← Edit details
                  </button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-cancel" onClick={handleCopyThankYou}>
                      {thankYou.copied ? 'Copied!' : 'Copy email'}
                    </button>
                    <a className="btn-primary" href={getThankYouMailto()} style={{ textDecoration: 'none' }}>
                      Compose email
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeModalOpen}
        onClose={closeUpgradeModal}
        onConfirm={startCheckout}
        loading={checkoutLoading}
        error={checkoutError}
      />

      <UpgradeBanner show={!loading && !usage.isPro} onUpgradeClick={openUpgradeModal} />
    </>
  );
} 