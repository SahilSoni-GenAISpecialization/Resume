'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import UsageNavPill, { useResumeUsage } from '@/components/app/UsageNavPill';
import { UpgradeBanner, UpgradeModal, useUpgradeFlow } from '@/components/app/Upgrade';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { getApiErrorMessage, readApiJson } from '@/lib/api-response';
import { flattenProfileForAi } from '@/lib/profile-data';

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const FREE_LIMIT = 5;

  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const { usage, refresh: refreshUsage, bump: bumpUsage, markPro } = useResumeUsage(supabase, userId);
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
  const [activeTab, setActiveTab] = useState('search');
  const [tailorAction, setTailorAction] = useState(null);

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [datePosted, setDatePosted] = useState('');
  const [jobType, setJobType] = useState('');
  const [remoteType, setRemoteType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState('');

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState(null);
  const [tailorError, setTailorError] = useState('');
  const [activeResultTab, setActiveResultTab] = useState('resume');
  const [copied, setCopied] = useState(false);
  const [tailorSource, setTailorSource] = useState('selected');
  const [resultKey, setResultKey] = useState('');

  const [downloadMenu, setDownloadMenu] = useState({ open: false, type: null });
  const [isExporting, setIsExporting] = useState(false);

  const hasReachedFreeLimit = !usage.isPro && usage.used >= FREE_LIMIT;

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('role') || '';
    const companyParam = searchParams.get('company') || '';

    if (q) {
      setSearchQuery(q);
      setJobTitle(q);
    }
    if (companyParam) {
      setSearchCompany(companyParam);
      setCompany(companyParam);
      setShowMoreFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/';
        return;
      }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      setUserId(user.id);
      setProfile(p || null);
    }

    load();
  }, [supabase]);

  useEffect(() => {
    if (!isTailoring) {
      setLoadingStepIndex(0);
      return;
    }

    const stepsCount = tailorAction === 'cover_letter' ? 5 : 4;
    setLoadingStepIndex(0);

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev >= stepsCount - 1) return prev;
        return prev + 1;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isTailoring, tailorAction]);

  function closeDownloadMenu() {
    setDownloadMenu({ open: false, type: null });
  }

  function openDownloadMenu(type) {
    setDownloadMenu({ open: true, type });
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getResolvedTitle() {
    return (
      tailorResult?.jobTitle ||
      jobTitle ||
      jobDetails?.title ||
      selectedJob?.title ||
      'Unknown'
    );
  }

  function getResolvedCompany() {
    return (
      tailorResult?.company ||
      company ||
      jobDetails?.company ||
      selectedJob?.company ||
      'Unknown'
    );
  }

  function getResolvedApplyUrl() {
    return (
      tailorResult?.applyUrl ||
      applyUrl.trim() ||
      jobDetails?.applyUrl ||
      jobDetails?.job_apply_link ||
      jobDetails?.jobUrl ||
      jobDetails?.url ||
      selectedJob?.applyUrl ||
      selectedJob?.job_apply_link ||
      selectedJob?.jobUrl ||
      selectedJob?.url ||
      ''
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  async function upsertApplication({
    status = 'Draft',
    company: companyName,
    jobTitle: resolvedTitle,
    applyUrl: resolvedApplyUrl,
    markApplied = false,
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const safeCompany = companyName || 'Unknown';
    const safeTitle = resolvedTitle || 'Unknown';

    const { data: existingRows, error: existingError } = await supabase
      .from('applications')
      .select('id,status')
      .eq('user_id', user.id)
      .eq('company', safeCompany)
      .eq('job_title', safeTitle)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) {
      console.error('applications select failed:', existingError);
    }

    const existing = existingRows?.[0];

    if (existing) {
      const payload = {
        status,
        apply_url: resolvedApplyUrl || null,
      };

      if (markApplied) {
        payload.applied_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', existing.id);

      if (updateError) {
        console.error('applications update failed:', updateError);
      }

      return existing.id;
    }

    const insertPayload = {
      user_id: user.id,
      company: safeCompany,
      job_title: safeTitle,
      status,
      apply_url: resolvedApplyUrl || null,
      created_at: new Date().toISOString(),
    };

    if (markApplied) {
      insertPayload.applied_at = new Date().toISOString();
    }

    const { data: inserted, error: insertError } = await supabase
      .from('applications')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('applications insert failed:', insertError);
      return null;
    }

    return inserted?.id || null;
  }

  async function handleSearchJobs() {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSelectedJob(null);
    setJobDetails(null);
    setJobDetailsError('');
    setTailorResult(null);
    setTailorError('');
    closeDownloadMenu();

    try {
      const res = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: searchLocation,
          company: searchCompany,
          datePosted,
          jobType,
          remoteType,
          experienceLevel,
          sortBy,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');

      setSearchResults(json.jobs || []);
    } catch (err) {
      setSearchError(err.message || 'Could not search jobs.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelectJob(job) {
    setSelectedJob(job);
    setJobDetails(null);
    setJobDetailsError('');
    setTailorResult(null);
    setTailorError('');
    setActiveResultTab('resume');
    closeDownloadMenu();

    if (!job?.jobId) {
      setJobDetails(job);
      return;
    }

    setIsLoadingJob(true);

    try {
      const res = await fetch(`/api/job-details?job_id=${encodeURIComponent(job.jobId)}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to fetch full job details');
      setJobDetails(json.job || null);
    } catch (err) {
      setJobDetailsError(err.message || 'Could not load full job description.');
      setJobDetails(job);
    } finally {
      setIsLoadingJob(false);
    }
  }

  async function handleTailor(source = 'selected', mode = 'resume') {
    if (hasReachedFreeLimit) {
      setTailorError(
        'You have used all 5 free resume/cover letter generations this month. Upgrade to Pro for CAD $9.99/month to continue.'
      );
      return;
    }

    setTailorError('');
    setIsTailoring(true);
    setTailorAction(mode);
    setTailorSource(source);
    setCopied(false);
    closeDownloadMenu();
    bumpUsage();

    try {
      let jd = '';
      let title = '';
      let comp = '';
      let finalApplyUrl = '';

      if (source === 'selected') {
        if (!selectedJob) throw new Error('Please select a job first.');

        jd =
          jobDetails?.description ||
          selectedJob?.description ||
          selectedJob?.descriptionPreview ||
          '';

        title = jobDetails?.title || selectedJob?.title || '';
        comp = jobDetails?.company || selectedJob?.company || '';
        finalApplyUrl =
          jobDetails?.applyUrl ||
          jobDetails?.job_apply_link ||
          jobDetails?.jobUrl ||
          jobDetails?.url ||
          selectedJob?.applyUrl ||
          selectedJob?.job_apply_link ||
          selectedJob?.jobUrl ||
          selectedJob?.url ||
          '';
      } else {
        jd = jobDescription.trim();
        title = jobTitle.trim();
        comp = company.trim();
        finalApplyUrl = applyUrl.trim();
      }

      if (!jd.trim()) {
        throw new Error('Job description is required.');
      }

      const newResultKey = `${title}||${comp}||${jd.slice(0, 120)}`;
      const isSameContext = newResultKey === resultKey;
      setResultKey(newResultKey);

      if (!isSameContext) {
        setTailorResult(null);
      }

      if (!profile) {
        throw new Error('Your saved profile is missing. Complete your profile on the Profile page first.');
      }

      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: flattenProfileForAi(profile),
          jobDescription: jd,
          jobTitle: title,
          company: comp,
          applyUrl: finalApplyUrl,
          mode,
        }),
      });

      const { json, text } = await readApiJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(res, json, text));
      }

      const resolvedApplyUrl = json.applyUrl || finalApplyUrl || '';

      setTailorResult((prev) => {
        const base = isSameContext ? prev || {} : {};

        if (mode === 'resume') {
          return {
            ...base,
            ...json,
            resume: json.resume || '',
            coverLetter: base.coverLetter || '',
            matchScore: json.matchScore ?? base.matchScore ?? null,
            matchReasons: json.matchReasons || base.matchReasons || '',
            matchImprovementTips: json.matchImprovementTips || base.matchImprovementTips || '',
            applyUrl: resolvedApplyUrl || base.applyUrl || '',
            jobTitle: json.jobTitle || base.jobTitle || title,
            company: json.company || base.company || comp,
          };
        }

        return {
          ...base,
          ...json,
          resume: base.resume || '',
          coverLetter: json.coverLetter || '',
          matchScore: base.matchScore ?? null,
          matchReasons: base.matchReasons || '',
          matchImprovementTips: base.matchImprovementTips || '',
          applyUrl: resolvedApplyUrl || base.applyUrl || '',
          jobTitle: json.jobTitle || base.jobTitle || title,
          company: json.company || base.company || comp,
        };
      });

      setActiveResultTab(mode === 'resume' ? 'resume' : 'cover');

      await upsertApplication({
        status: 'Ready',
        company: comp || 'Unknown',
        jobTitle: title || 'Unknown',
        applyUrl: resolvedApplyUrl,
        markApplied: false,
      });
    } catch (err) {
      setTailorError(err.message || 'Something went wrong');
    } finally {
      setIsTailoring(false);
      setTailorAction(null);
      refreshUsage();
    }
  }

  async function handleApplyNow(url) {
    if (!url) return;

    try {
      await upsertApplication({
        status: 'Applied',
        company: getResolvedCompany(),
        jobTitle: getResolvedTitle(),
        applyUrl: url,
        markApplied: true,
      });

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Apply tracking failed:', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport(format) {
    try {
      const type = downloadMenu.type;
      const content = type === 'resume' ? tailorResult?.resume : tailorResult?.coverLetter;
      if (!content) return;

      const firstName = (
        profile?.first_name ||
        profile?.full_name?.split(' ')?.[0] ||
        'candidate'
      )
        .toLowerCase()
        .replace(/\s+/g, '-');

      const companySlug = slugify(
        tailorResult?.company ||
          company ||
          jobDetails?.company ||
          selectedJob?.company ||
          'company'
      );

      const baseName =
        type === 'resume'
          ? `${firstName}_${companySlug}_resume`
          : `${firstName}_${companySlug}_coverletter`;

      setIsExporting(true);

      const res = await fetch('/api/export-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          format,
          fileName: baseName,
          documentType: type,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.${format === 'docx' ? 'docx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      closeDownloadMenu();
    } catch (err) {
      setTailorError(err.message || 'Could not export document.');
    } finally {
      setIsExporting(false);
    }
  }

  const activeFullJD =
    activeTab === 'paste'
      ? jobDescription
      : jobDetails?.description ||
        selectedJob?.description ||
        selectedJob?.descriptionPreview ||
        '';

  const currentApplyUrl =
    activeTab === 'paste'
      ? applyUrl.trim()
      : jobDetails?.applyUrl ||
        jobDetails?.job_apply_link ||
        jobDetails?.jobUrl ||
        jobDetails?.url ||
        selectedJob?.applyUrl ||
        selectedJob?.job_apply_link ||
        selectedJob?.jobUrl ||
        selectedJob?.url ||
        '';

  const resultApplyUrl = tailorResult?.applyUrl || currentApplyUrl || '';
  const showMatchScore =
    tailorResult?.matchScore !== undefined && tailorResult?.matchScore !== null;

  const matchReasonsList = (tailorResult?.matchReasons || '')
    .split('\n')
    .map((line) => line.replace(/^[-•\d.]+\s*/, '').trim())
    .filter(Boolean);

  const matchTipsList = (tailorResult?.matchImprovementTips || '')
    .split('\n')
    .map((line) => line.replace(/^[-•\d.]+\s*/, '').trim())
    .filter(Boolean);

  const currentResultText =
    activeResultTab === 'resume'
      ? tailorResult?.resume
      : activeResultTab === 'cover'
      ? tailorResult?.coverLetter
      : [
          matchReasonsList.length ? `WHY THIS SCORE:\n${matchReasonsList.map((l) => `- ${l}`).join('\n')}` : '',
          matchTipsList.length
            ? `HOW TO REACH 85%+ MATCH:\n${matchTipsList.map((l) => `- ${l}`).join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n');

  const loadingSteps =
    tailorAction === 'cover_letter'
      ? [
          'Parsing job description',
          'Extracting keywords',
          'Aligning your experience',
          'Writing cover letter',
          'Final polishing',
        ]
      : [
          'Parsing job description',
          'Extracting keywords',
          'Rewriting summary',
          'Tailoring experience',
        ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,0.07), transparent 30%),
            radial-gradient(circle at bottom right, rgba(124,58,237,0.05), transparent 25%),
            #f8fafc;
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          border-bottom: 1px solid rgba(15,23,42,0.07);
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px);
        }
        .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-name { font-size: 17px; font-weight: 700; }
        .topbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .btn-ghost, .btn-primary, .btn-secondary, .action-btn {
          border-radius: 9px;
          font-family: inherit;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          cursor: pointer;
        }
        .btn-ghost {
          background: rgba(15,23,42,0.05);
          border: 1px solid rgba(15,23,42,0.1);
          color: #475569;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-ghost:hover { background: rgba(15,23,42,0.09); color: #0f172a; }
        .btn-primary {
          background: #2563eb;
          border: none;
          color: white;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(37,99,235,0.3);
        }
        .btn-secondary {
          background: rgba(15,23,42,0.05);
          border: 1px solid rgba(15,23,42,0.12);
          color: #0f172a;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(15,23,42,0.08);
          border-color: rgba(15,23,42,0.18);
        }
        .btn-primary:disabled, .btn-secondary:disabled, .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .usage-badge {
          display: inline-flex;
          align-items: center;
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.12);
          background: rgba(15,23,42,0.04);
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }
        .usage-badge.limit-hit {
          color: #dc2626;
          border-color: rgba(220,38,38, 0.35);
          background: rgba(220,38,38, 0.1);
        }
        .layout {
          max-width: 1440px;
          margin: 0 auto;
          padding: 32px 28px;
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 24px;
        }
        .card {
          background: rgba(15,23,42,0.025);
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 20px;
          padding: 24px;
        }
        .page-heading { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
        .page-subheading { color: #475569; font-size: 14px; line-height: 1.7; margin-bottom: 22px; }
        .card-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
        .card-sub { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 18px; }
        .tab-row {
          display: inline-flex;
          gap: 6px;
          padding: 5px;
          border-radius: 12px;
          background: rgba(15,23,42,0.04);
          border: 1px solid rgba(15,23,42,0.07);
          margin-bottom: 20px;
        }
        .tab-btn {
          padding: 9px 16px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-family: inherit;
          transition: all 0.18s;
          background: transparent;
          color: #64748b;
        }
        .tab-btn.active {
          background: rgba(37,99,235,0.15);
          color: #0f172a;
          border: 1px solid rgba(37,99,235,0.22);
        }
        .field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
        .label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .input, .textarea, .select {
          width: 100%;
          background: rgba(15,23,42,0.05);
          border: 1px solid rgba(15,23,42,0.1);
          color: #0f172a;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          transition: all 0.2s;
        }
        .input::placeholder, .textarea::placeholder { color: #94a3b8; }
        .input:focus, .textarea:focus, .select:focus {
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .textarea { resize: vertical; line-height: 1.7; min-height: 220px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .top-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .more-filters {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(15,23,42,0.08);
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .search-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .search-actions.compact-top { margin-top: 14px; }
        .action-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
          margin-bottom: 4px;
        }
        .error-box {
          margin-top: 14px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(220,38,38,0.08);
          border: 1px solid rgba(220,38,38,0.2);
          color: #dc2626;
          font-size: 13px;
          font-weight: 500;
        }
        .info-box {
          margin-top: 14px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(217,119,6,0.08);
          border: 1px solid rgba(217,119,6,0.2);
          color: #d97706;
          font-size: 13px;
          font-weight: 500;
        }
        .limit-box {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(220,38,38,0.08);
          border: 1px solid rgba(220,38,38,0.22);
          color: #dc2626;
          font-size: 13px;
          line-height: 1.6;
        }
        .job-results-shell {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 18px;
          min-height: 620px;
        }
        .results-list {
          border-right: 1px solid rgba(15,23,42,0.07);
          padding-right: 16px;
          min-height: 100%;
        }
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .results-count {
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .job-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 72vh;
          overflow-y: auto;
          padding-right: 4px;
        }
        .job-item {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,0.07);
          background: rgba(15,23,42,0.03);
          cursor: pointer;
          transition: all 0.18s;
        }
        .job-item:hover {
          border-color: rgba(37,99,235,0.25);
          background: rgba(37,99,235,0.05);
        }
        .job-item.selected {
          border-color: rgba(37,99,235,0.42);
          background: rgba(37,99,235,0.09);
          box-shadow: 0 0 0 1px rgba(37,99,235,0.15) inset;
        }
        .job-item-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .job-item-company { font-size: 13px; color: #334155; margin-bottom: 6px; }
        .job-item-meta {
          font-size: 12px;
          color: #64748b;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .job-item-badge {
          background: rgba(37,99,235,0.1);
          color: #2563eb;
          border: 1px solid rgba(37,99,235,0.2);
          border-radius: 99px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
        }
        .detail-pane { min-width: 0; }
        .job-panel-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
        }
        .job-panel-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .job-description {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 14px;
          padding: 18px;
          font-size: 14px;
          color: #334155;
          line-height: 1.8;
          white-space: pre-wrap;
          min-height: 360px;
          max-height: 62vh;
          overflow-y: auto;
        }
        .result-card { display: flex; flex-direction: column; gap: 0; position: relative; }
        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .result-title { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }
        .match-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          background: rgba(5,150,105,0.12);
          border: 1px solid rgba(5,150,105,0.25);
          color: #059669;
          font-size: 13px;
          font-weight: 700;
        }
        .result-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid rgba(15,23,42,0.07);
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .result-tab {
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: none;
          font-family: inherit;
          color: #64748b;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.18s;
        }
        .result-tab.active { color: #2563eb; border-bottom-color: #2563eb; }
        .result-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
        .action-btn {
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          border: none;
        }
        .action-copy {
          background: rgba(37,99,235,0.12);
          color: #2563eb;
          border: 1px solid rgba(37,99,235,0.2);
        }
        .action-download {
          background: rgba(5,150,105,0.1);
          color: #059669;
          border: 1px solid rgba(5,150,105,0.2);
        }
        .action-apply {
          background: rgba(217,119,6,0.12);
          color: #d97706;
          border: 1px solid rgba(217,119,6,0.24);
          text-decoration: none;
        }
        .action-new {
          background: rgba(15,23,42,0.05);
          color: #475569;
          border: 1px solid rgba(15,23,42,0.1);
        }
        .result-text {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 14px;
          padding: 20px;
          font-size: 13px;
          color: #334155;
          line-height: 1.8;
          white-space: pre-wrap;
          max-height: 480px;
          overflow-y: auto;
          font-family: 'Courier New', monospace;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 72px 32px;
          color: #94a3b8;
          min-height: 420px;
        }
        .empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.5; }
        .empty-title { font-size: 16px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
        .empty-sub { font-size: 13px; color: #94a3b8; line-height: 1.7; max-width: 360px; }
        .loading-steps { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
        .loading-step { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #475569; }
        .loading-step.active { color: #0f172a; }
        .spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(37,99,235,0.2);
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .profile-warn {
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(217,119,6,0.07);
          border: 1px solid rgba(217,119,6,0.18);
          color: #d97706;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .download-menu {
          position: absolute;
          right: 0;
          top: 42px;
          min-width: 170px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.1);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 18px 40px rgba(15,23,42,0.35);
          z-index: 20;
        }
        .download-menu button {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: #0f172a;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
        }
        .download-menu button:hover {
          background: rgba(15,23,42,0.06);
        }
        .download-wrap { position: relative; }
        .match-analysis { display: flex; flex-direction: column; gap: 16px; }
        .match-score-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          border-radius: 14px;
          background: rgba(37,99,235,0.06);
          border: 1px solid rgba(37,99,235,0.18);
        }
        .match-score-value {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #2563eb;
          flex-shrink: 0;
        }
        .match-score-label { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .match-score-hint { font-size: 12.5px; color: #64748b; }
        .match-section {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 14px;
          padding: 18px 20px;
        }
        .match-section-title {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 14px;
        }
        .match-section-tips {
          background: rgba(5,150,105,0.06);
          border-color: rgba(5,150,105,0.2);
        }
        .match-section-tips .match-section-title { color: #059669; }
        .match-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .match-list li {
          font-size: 13.5px;
          color: #334155;
          line-height: 1.6;
          padding-left: 22px;
          position: relative;
        }
        .match-list li::before {
          content: '•';
          position: absolute;
          left: 4px;
          color: #64748b;
        }
        .match-section-tips .match-list li::before {
          content: '✓';
          color: #059669;
          font-size: 11px;
          top: 2px;
        }
        .result-tab-add {
          padding: 8px 14px;
          margin: 6px 0 6px auto;
          border-radius: 8px;
          border: 1px dashed rgba(37,99,235,0.35);
          background: rgba(37,99,235,0.06);
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .result-tab-add:hover:not(:disabled) { background: rgba(37,99,235,0.12); }
        .result-tab-add:disabled { opacity: 0.5; cursor: not-allowed; }
        .tailor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(6px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .tailor-modal {
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.1);
          border-radius: 20px;
          padding: 36px 40px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 30px 80px rgba(15,23,42,0.55);
        }
        .tailor-modal-spinner { margin: 0 auto 20px; }
        .tailor-modal .card-title, .tailor-modal .card-sub { text-align: center; }
        .tailor-modal .loading-steps { text-align: left; }
        @media (max-width: 1200px) {
          .layout { grid-template-columns: 1fr; }
          .job-results-shell { grid-template-columns: 1fr; }
          .results-list {
            border-right: none;
            border-bottom: 1px solid rgba(15,23,42,0.07);
            padding-right: 0;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .job-list { max-height: 360px; }
        }
        @media (max-width: 700px) {
          .layout { padding: 16px; }
          .topbar { padding: 14px 16px; }
          .two-col, .top-search-grid, .filter-grid { grid-template-columns: 1fr; }
          .search-actions, .action-row, .result-actions, .topbar-right { flex-direction: column; }
          .search-actions > *, .action-row > *, .result-actions > *, .topbar-right > * { width: 100%; }
          .download-menu {
            left: 0;
            right: auto;
            width: 100%;
            top: calc(100% + 8px);
          }
        }
      `}</style>

      <div className="shell">
        <nav className="topbar">
          <a href="/" className="brand">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <div className="brand-name">Applymatic</div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: 1 }}>Job Search</div>
            </div>
          </a>

          <div className="topbar-right">
            <UsageNavPill
              supabase={supabase}
              userId={userId}
              className="usage-badge"
              limitHitClassName="limit-hit"
            />
            {!usage.isPro && (
              <button type="button" className="upgrade-pill-btn" onClick={openUpgradeModal}>
                ✨ Upgrade to Pro
              </button>
            )}
            <a href="/dashboard" className="btn-ghost">Dashboard</a>
  <button type="button" className="btn-ghost" onClick={handleLogout}>
    Logout
  </button>
</div>
        </nav>

        <main className="layout">
          <section className="card">
            <div className="page-heading">Find your next job</div>
            <div className="page-subheading">
              Review the full job description first, then tailor your resume, generate a cover letter, or apply directly.
            </div>

            {!profile && (
              <div className="profile-warn">
                Your saved profile is missing. Go back to the landing page, log in, and complete your profile first.
              </div>
            )}

            {verifyBanner === 'success' && (
              <div className="limit-box" style={{ background: 'rgba(5,150,105,0.08)', borderColor: 'rgba(5,150,105,0.25)', color: '#059669' }}>
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
              <div className="limit-box">
                We couldn&apos;t confirm your payment automatically. If you were charged, please contact{' '}
                {CONTACT_EMAIL}.
                <button
                  type="button"
                  onClick={dismissVerifyBanner}
                  style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            )}

            {hasReachedFreeLimit && (
              <div className="limit-box">
                You have used all 5 free resume generations. Upgrade to Pro for CAD $9.99/month to continue with unlimited resume tailoring and full features.
              </div>
            )}

            <div className="tab-row">
              <button
                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('search');
                  setTailorError('');
                  closeDownloadMenu();
                }}
              >
                Search jobs
              </button>

              <button
                className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('paste');
                  setTailorError('');
                  closeDownloadMenu();
                }}
              >
                Paste job description
              </button>
            </div>

            {activeTab === 'search' && (
              <>
                <div className="top-search-grid">
                  <div className="field">
                    <label className="label">Job title / keywords</label>
                    <input
                      className="input"
                      placeholder="e.g. Network Engineer"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Location</label>
                    <input
                      className="input"
                      placeholder="e.g. Toronto"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                    />
                  </div>
                </div>

                <div className="search-actions compact-top">
                  <button className="btn-ghost" onClick={() => setShowMoreFilters((v) => !v)}>
                    {showMoreFilters ? 'Hide more filters' : 'Show more filters'}
                  </button>
                </div>

                {showMoreFilters && (
                  <div className="more-filters">
                    <div className="filter-grid">
                      <div className="field">
                        <label className="label">Company</label>
                        <input
                          className="input"
                          placeholder="e.g. Google"
                          value={searchCompany}
                          onChange={(e) => setSearchCompany(e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label className="label">Date posted</label>
                        <select className="select" value={datePosted} onChange={(e) => setDatePosted(e.target.value)}>
                          <option value="">Any time</option>
                          <option value="today">Today</option>
                          <option value="3days">Last 3 days</option>
                          <option value="week">Last week</option>
                          <option value="month">Last month</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">Job type</label>
                        <select className="select" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                          <option value="">Any</option>
                          <option value="full_time">Full-time</option>
                          <option value="part_time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                          <option value="temporary">Temporary</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">Workplace type</label>
                        <select className="select" value={remoteType} onChange={(e) => setRemoteType(e.target.value)}>
                          <option value="">Any</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="onsite">On-site</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">Experience level</label>
                        <select className="select" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                          <option value="">Any</option>
                          <option value="entry">Entry</option>
                          <option value="associate">Associate</option>
                          <option value="mid">Mid</option>
                          <option value="senior">Senior</option>
                          <option value="director">Director</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">Sort by</label>
                        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                          <option value="relevance">Relevance</option>
                          <option value="newest">Newest</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="search-actions">
                  <button
                    className="btn-primary"
                    onClick={handleSearchJobs}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? <><div className="spin" />Searching</> : 'Search jobs'}
                  </button>
                </div>

                {searchError && <div className="error-box">{searchError}</div>}
              </>
            )}

            {activeTab === 'paste' && (
              <>
                <div className="two-col">
                  <div className="field">
                    <label className="label">Job title</label>
                    <input
                      className="input"
                      placeholder="e.g. Frontend Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Company</label>
                    <input
                      className="input"
                      placeholder="e.g. Stripe"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Apply URL</label>
                  <input
                    className="input"
                    placeholder="https://company.com/jobs/..."
                    value={applyUrl}
                    onChange={(e) => setApplyUrl(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Full job description *</label>
                  <textarea
                    className="textarea"
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                <div className="action-row">
                  <button
                    className="btn-primary"
                    onClick={() => handleTailor('paste', 'resume')}
                    disabled={isTailoring || !jobDescription.trim() || hasReachedFreeLimit}
                  >
                    {hasReachedFreeLimit
                      ? 'Upgrade to continue'
                      : isTailoring && tailorAction === 'resume'
                      ? 'Working...'
                      : 'Tailor resume'}
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => handleTailor('paste', 'cover_letter')}
                    disabled={isTailoring || !jobDescription.trim() || hasReachedFreeLimit}
                  >
                    {hasReachedFreeLimit
                      ? 'Upgrade to continue'
                      : isTailoring && tailorAction === 'cover_letter'
                      ? 'Working...'
                      : 'Generate cover letter'}
                  </button>

                  {applyUrl.trim() && (
                    <button
                      className="btn-ghost"
                      onClick={() => handleApplyNow(applyUrl.trim())}
                    >
                      Apply now
                    </button>
                  )}
                </div>

                {!!tailorError && <div className="error-box">{tailorError}</div>}
              </>
            )}
          </section>

          <section className="card result-card">
            {activeTab === 'search' && !isSearching && !searchError && searchResults.length === 0 && !selectedJob && !tailorResult && (
              <div className="empty-state">
                <div className="empty-icon">✦</div>
                <div className="empty-title">Search jobs and review them here</div>
                <div className="empty-sub">
                  Your job results will appear on the right. Click any listing to load the full description and details.
                </div>
              </div>
            )}

            {activeTab === 'search' && isSearching && (
              <div className="empty-state">
                <div className="spin" style={{ width: 22, height: 22, marginBottom: 16 }} />
                <div className="empty-title">Searching live job listings...</div>
                <div className="empty-sub">
                  Pulling results and preparing the detail panel.
                </div>
              </div>
            )}

            {activeTab === 'search' && searchResults.length > 0 && !tailorResult && (
              <div className="job-results-shell">
                <div className="results-list">
                  <div className="results-header">
                    <div>
                      <div className="card-title" style={{ marginBottom: 2 }}>Search results</div>
                      <div className="results-count">{searchResults.length} jobs found</div>
                    </div>
                  </div>

                  <div className="job-list">
                    {searchResults.map((job, i) => (
                      <div
                        key={job.jobId || `${job.title}-${job.company}-${i}`}
                        className={`job-item ${selectedJob?.jobId === job.jobId ? 'selected' : ''}`}
                        onClick={() => handleSelectJob(job)}
                      >
                        <div className="job-item-title">{job.title}</div>
                        <div className="job-item-company">{job.company || 'Unknown company'}</div>
                        <div className="job-item-meta">
                          {job.location && <span>📍 {job.location}</span>}
                          {job.type && <span className="job-item-badge">{job.type}</span>}
                          {job.source && <span>{job.source}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-pane">
                  {!selectedJob && (
                    <div className="empty-state" style={{ minHeight: 540 }}>
                      <div className="empty-icon">✦</div>
                      <div className="empty-title">Select a job to review it</div>
                      <div className="empty-sub">
                        Once selected, the full job description and actions will appear here.
                      </div>
                    </div>
                  )}

                  {!!selectedJob && (
                    <>
                      <div className="job-panel-title">{jobDetails?.title || selectedJob.title || 'Job details'}</div>

                      <div className="job-panel-meta">
                        <span>{jobDetails?.company || selectedJob.company || 'Unknown company'}</span>
                        {(jobDetails?.location || selectedJob.location) && (
                          <span>{jobDetails?.location || selectedJob.location}</span>
                        )}
                        {(jobDetails?.type || selectedJob.type) && (
                          <span>{jobDetails?.type || selectedJob.type}</span>
                        )}
                        {(jobDetails?.source || selectedJob.source) && (
                          <span>{jobDetails?.source || selectedJob.source}</span>
                        )}
                      </div>

                      <div className="action-row">
                        <button
                          className="btn-primary"
                          onClick={() => handleTailor('selected', 'resume')}
                          disabled={isTailoring || isLoadingJob || !activeFullJD.trim() || hasReachedFreeLimit}
                        >
                          {hasReachedFreeLimit
                            ? 'Upgrade to continue'
                            : isTailoring && tailorAction === 'resume'
                            ? 'Working...'
                            : 'Tailor resume'}
                        </button>

                        <button
                          className="btn-secondary"
                          onClick={() => handleTailor('selected', 'cover_letter')}
                          disabled={isTailoring || isLoadingJob || !activeFullJD.trim() || hasReachedFreeLimit}
                        >
                          {hasReachedFreeLimit
                            ? 'Upgrade to continue'
                            : isTailoring && tailorAction === 'cover_letter'
                            ? 'Working...'
                            : 'Generate cover letter'}
                        </button>

                        {currentApplyUrl && (
                          <button
                            className="btn-ghost"
                            onClick={() => handleApplyNow(currentApplyUrl)}
                          >
                            Apply now
                          </button>
                        )}
                      </div>

                      {jobDetailsError && <div className="info-box">{jobDetailsError}</div>}

                      {isLoadingJob ? (
                        <div style={{ padding: '40px 0' }}>
                          <div className="loading-step">
                            <div className="spin" />
                            <span>Loading full job description...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="job-description">
                          {activeFullJD || 'Full job description is not available for this listing.'}
                        </div>
                      )}

                      {!!tailorError && <div className="error-box">{tailorError}</div>}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'paste' && !tailorResult && !isTailoring && (
              <div className="empty-state">
                <div className="empty-icon">✦</div>
                <div className="empty-title">Paste a full job description</div>
                <div className="empty-sub">
                  Once you add the full posting, tailored resume output will appear here.
                </div>
              </div>
            )}

            {tailorResult && !isTailoring && (
              <>
                <div className="result-header">
                  <div className="result-title">
                    {tailorResult.jobTitle || jobTitle || jobDetails?.title || selectedJob?.title || 'Tailored Application'}{' '}
                    {(tailorResult.company || company || jobDetails?.company || selectedJob?.company) && (
                      <span style={{ color: '#64748b', fontWeight: 400, fontSize: 16 }}>
                        · {tailorResult.company || company || jobDetails?.company || selectedJob?.company}
                      </span>
                    )}
                  </div>

                  {showMatchScore && (
                    <div className="match-badge">
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#059669',
                          display: 'inline-block',
                        }}
                      />
                      {tailorResult.matchScore}% match
                    </div>
                  )}
                </div>

                <div className="result-tabs">
                  {!!tailorResult.resume && (
                    <button
                      className={`result-tab ${activeResultTab === 'resume' ? 'active' : ''}`}
                      onClick={() => setActiveResultTab('resume')}
                    >
                      Resume
                    </button>
                  )}

                  {!!tailorResult.coverLetter && (
                    <button
                      className={`result-tab ${activeResultTab === 'cover' ? 'active' : ''}`}
                      onClick={() => setActiveResultTab('cover')}
                    >
                      Cover Letter
                    </button>
                  )}

                  {!!tailorResult.matchReasons && (
                    <button
                      className={`result-tab ${activeResultTab === 'match' ? 'active' : ''}`}
                      onClick={() => setActiveResultTab('match')}
                    >
                      Match Analysis
                    </button>
                  )}

                  {!!tailorResult.resume && !tailorResult.coverLetter && (
                    <button
                      type="button"
                      className="result-tab-add"
                      onClick={() => handleTailor(tailorSource, 'cover_letter')}
                      disabled={isTailoring || hasReachedFreeLimit}
                    >
                      + Tailor cover letter
                    </button>
                  )}

                  {!!tailorResult.coverLetter && !tailorResult.resume && (
                    <button
                      type="button"
                      className="result-tab-add"
                      onClick={() => handleTailor(tailorSource, 'resume')}
                      disabled={isTailoring || hasReachedFreeLimit}
                    >
                      + Tailor resume
                    </button>
                  )}
                </div>

                {activeResultTab === 'match' ? (
                  <div className="match-analysis">
                    {showMatchScore && (
                      <div className="match-score-banner">
                        <div className="match-score-value">{tailorResult.matchScore}%</div>
                        <div className="match-score-copy">
                          <div className="match-score-label">Current match score</div>
                          <div className="match-score-hint">
                            {tailorResult.matchScore >= 85
                              ? "You're in great shape for this role."
                              : 'Aim for 85%+ by acting on the tips below.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {matchReasonsList.length > 0 && (
                      <div className="match-section">
                        <div className="match-section-title">Why this score</div>
                        <ul className="match-list">
                          {matchReasonsList.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {matchTipsList.length > 0 && (
                      <div className="match-section match-section-tips">
                        <div className="match-section-title">🚀 How to reach 85%+ match</div>
                        <ul className="match-list">
                          {matchTipsList.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!matchReasonsList.length && !matchTipsList.length && (
                      <div className="result-text">No match analysis available.</div>
                    )}
                  </div>
                ) : (
                  <div className="result-text">{currentResultText || 'No output generated.'}</div>
                )}

                <div className="result-actions">
                  <button
                    className="action-btn action-copy"
                    onClick={() => handleCopy(currentResultText || '')}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>

                  {!!tailorResult.resume && (
                    <div className="download-wrap">
                      <button
                        className="action-btn action-download"
                        onClick={() => openDownloadMenu('resume')}
                        disabled={isExporting}
                      >
                        {isExporting && downloadMenu.type === 'resume'
                          ? 'Exporting...'
                          : 'Download resume'}
                      </button>

                      {downloadMenu.open && downloadMenu.type === 'resume' && (
                        <div className="download-menu">
                          <button onClick={() => handleExport('pdf')}>Download as PDF</button>
                          <button onClick={() => handleExport('docx')}>Download as DOCX</button>
                          <button onClick={closeDownloadMenu}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )}

                  {!!tailorResult.coverLetter && (
                    <div className="download-wrap">
                      <button
                        className="action-btn action-download"
                        onClick={() => openDownloadMenu('cover')}
                        disabled={isExporting}
                      >
                        {isExporting && downloadMenu.type === 'cover'
                          ? 'Exporting...'
                          : 'Download cover letter'}
                      </button>

                      {downloadMenu.open && downloadMenu.type === 'cover' && (
                        <div className="download-menu">
                          <button onClick={() => handleExport('pdf')}>Download as PDF</button>
                          <button onClick={() => handleExport('docx')}>Download as DOCX</button>
                          <button onClick={closeDownloadMenu}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )}

                  {resultApplyUrl && (
                    <button
                      className="action-btn action-apply"
                      onClick={() => handleApplyNow(resultApplyUrl)}
                    >
                      Apply now
                    </button>
                  )}

                  <button
                    className="action-btn action-new"
                    onClick={() => {
                      setTailorResult(null);
                      setTailorError('');
                      setActiveResultTab('resume');
                      closeDownloadMenu();
                    }}
                  >
                    {selectedJob ? '← Back to job listings' : 'Clear result'}
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {isTailoring && (
        <div className="tailor-overlay">
          <div className="tailor-modal">
            <div className="spin tailor-modal-spinner" style={{ width: 28, height: 28, borderTopColor: '#2563eb' }} />
            <div className="card-title" style={{ marginBottom: 6 }}>
              Generating tailored application...
            </div>
            <div className="card-sub" style={{ marginBottom: 28 }}>
              This usually takes 15–30 seconds.
            </div>

            <div className="loading-steps">
              {loadingSteps.map((step, i) => (
                <div
                  className={`loading-step ${i <= loadingStepIndex ? 'active' : ''}`}
                  key={i}
                >
                  <div
                    className="spin"
                    style={{
                      borderTopColor: '#2563eb',
                      borderColor: i <= loadingStepIndex ? 'rgba(37,99,235,0.28)' : 'rgba(37,99,235,0.12)',
                    }}
                  />
                  <span>{step}</span>
                </div>
              ))}
            </div>
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

      <UpgradeBanner show={!usage.isPro} onUpgradeClick={openUpgradeModal} />
    </>
  );
}