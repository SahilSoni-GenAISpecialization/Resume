'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState(null);
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

  const [downloadMenu, setDownloadMenu] = useState({ open: false, type: null });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
    setTailorError('');
    setTailorResult(null);
    setIsTailoring(true);
    setTailorAction(mode);
    setCopied(false);
    closeDownloadMenu();

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

      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobDescription: jd,
          jobTitle: title,
          company: comp,
          applyUrl: finalApplyUrl,
          mode,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Tailoring failed');

      if (mode === 'resume') {
        setTailorResult({
          ...json,
          resume: json.resume || '',
          coverLetter: '',
          applyUrl: json.applyUrl || finalApplyUrl || '',
        });
        setActiveResultTab('resume');
      } else {
        setTailorResult({
          ...json,
          resume: '',
          coverLetter: json.coverLetter || '',
          applyUrl: json.applyUrl || finalApplyUrl || '',
        });
        setActiveResultTab('cover');
      }
    } catch (err) {
      setTailorError(err.message || 'Something went wrong');
    } finally {
      setIsTailoring(false);
      setTailorAction(null);
    }
  }

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openDownloadMenu(type) {
    setDownloadMenu({ open: true, type });
  }

  function closeDownloadMenu() {
    setDownloadMenu({ open: false, type: null });
  }

  async function handleExport(format) {
    try {
      const type = downloadMenu.type;
      const content = type === 'resume' ? tailorResult?.resume : tailorResult?.coverLetter;
      if (!content) return;

      const baseName =
        type === 'resume'
          ? `resume-${(tailorResult?.jobTitle || jobTitle || jobDetails?.title || selectedJob?.title || 'tailored')
              .toLowerCase()
              .replace(/\s+/g, '-')}`
          : `cover-letter-${(tailorResult?.company || company || jobDetails?.company || selectedJob?.company || 'tailored')
              .toLowerCase()
              .replace(/\s+/g, '-')}`;

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

  const currentResultText =
    activeResultTab === 'resume'
      ? tailorResult?.resume
      : activeResultTab === 'cover'
      ? tailorResult?.coverLetter
      : tailorResult?.matchReasons;

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
        body { background: #13131a; color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(105,162,255,0.07), transparent 30%),
            radial-gradient(circle at bottom right, rgba(139,92,246,0.05), transparent 25%),
            #13131a;
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(19,19,26,0.92);
          backdrop-filter: blur(20px);
        }
        .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: linear-gradient(135deg, #4f8ef7, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-name { font-size: 17px; font-weight: 700; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
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
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #a0a0b8;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); color: #f0f0f5; }
        .btn-primary {
          background: #4f8ef7;
          border: none;
          color: white;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
        }
        .btn-primary:hover:not(:disabled) {
          background: #6fa3ff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(79,142,247,0.3);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: #f0f0f5;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
        }
        .btn-primary:disabled, .btn-secondary:disabled, .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
        }
        .page-heading { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
        .page-subheading { color: #a0a0b8; font-size: 14px; line-height: 1.7; margin-bottom: 22px; }
        .card-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
        .card-sub { color: #a0a0b8; font-size: 14px; line-height: 1.6; margin-bottom: 18px; }
        .tab-row {
          display: inline-flex;
          gap: 6px;
          padding: 5px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
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
          color: #6b6b85;
        }
        .tab-btn.active {
          background: rgba(79,142,247,0.15);
          color: #f0f0f5;
          border: 1px solid rgba(79,142,247,0.22);
        }
        .field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
        .label {
          font-size: 12px;
          font-weight: 600;
          color: #c8c8d8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .input, .textarea, .select {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0f5;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          transition: all 0.2s;
        }
        .input::placeholder, .textarea::placeholder { color: #4a4a60; }
        .input:focus, .textarea:focus, .select:focus {
          border-color: rgba(79,142,247,0.5);
          box-shadow: 0 0 0 3px rgba(79,142,247,0.1);
        }
        .textarea { resize: vertical; line-height: 1.7; min-height: 220px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .top-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .more-filters {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.08);
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
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          color: #f87171;
          font-size: 13px;
          font-weight: 500;
        }
        .info-box {
          margin-top: 14px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(251,191,36,0.08);
          border: 1px solid rgba(251,191,36,0.2);
          color: #fbbf24;
          font-size: 13px;
          font-weight: 500;
        }
        .job-results-shell {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 18px;
          min-height: 620px;
        }
        .results-list {
          border-right: 1px solid rgba(255,255,255,0.07);
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
          color: #7d7d96;
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
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          transition: all 0.18s;
        }
        .job-item:hover {
          border-color: rgba(79,142,247,0.25);
          background: rgba(79,142,247,0.05);
        }
        .job-item.selected {
          border-color: rgba(79,142,247,0.42);
          background: rgba(79,142,247,0.09);
          box-shadow: 0 0 0 1px rgba(79,142,247,0.15) inset;
        }
        .job-item-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .job-item-company { font-size: 13px; color: #d4d4e4; margin-bottom: 6px; }
        .job-item-meta {
          font-size: 12px;
          color: #7d7d96;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .job-item-badge {
          background: rgba(79,142,247,0.1);
          color: #4f8ef7;
          border: 1px solid rgba(79,142,247,0.2);
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
          color: #9a9ab1;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .job-description {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 18px;
          font-size: 14px;
          color: #d7d7e6;
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
          background: rgba(52,211,153,0.12);
          border: 1px solid rgba(52,211,153,0.25);
          color: #34d399;
          font-size: 13px;
          font-weight: 700;
        }
        .result-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
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
          color: #6b6b85;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.18s;
        }
        .result-tab.active { color: #4f8ef7; border-bottom-color: #4f8ef7; }
        .result-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
        .action-btn {
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          border: none;
        }
        .action-copy {
          background: rgba(79,142,247,0.12);
          color: #4f8ef7;
          border: 1px solid rgba(79,142,247,0.2);
        }
        .action-download {
          background: rgba(52,211,153,0.1);
          color: #34d399;
          border: 1px solid rgba(52,211,153,0.2);
        }
        .action-apply {
          background: rgba(251,191,36,0.12);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.24);
          text-decoration: none;
        }
        .action-new {
          background: rgba(255,255,255,0.05);
          color: #a0a0b8;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .result-text {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 20px;
          font-size: 13px;
          color: #c8c8d8;
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
          color: #4a4a60;
          min-height: 420px;
        }
        .empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.5; }
        .empty-title { font-size: 16px; font-weight: 600; color: #6b6b85; margin-bottom: 8px; }
        .empty-sub { font-size: 13px; color: #4a4a60; line-height: 1.7; max-width: 360px; }
        .loading-steps { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
        .loading-step { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #a0a0b8; }
        .loading-step.active { color: #f0f0f5; }
        .spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(79,142,247,0.2);
          border-top-color: #4f8ef7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .profile-warn {
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(251,191,36,0.07);
          border: 1px solid rgba(251,191,36,0.18);
          color: #fbbf24;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .download-menu {
          position: absolute;
          right: 0;
          top: 42px;
          min-width: 170px;
          background: #1d1d27;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.35);
          z-index: 20;
        }
        .download-menu button {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: #f0f0f5;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
        }
        .download-menu button:hover {
          background: rgba(255,255,255,0.06);
        }
        .download-wrap { position: relative; }
        @media (max-width: 1200px) {
          .layout { grid-template-columns: 1fr; }
          .job-results-shell { grid-template-columns: 1fr; }
          .results-list {
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.07);
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
          .search-actions, .action-row, .result-actions { flex-direction: column; }
          .search-actions > *, .action-row > *, .result-actions > * { width: 100%; }
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
          <a href="/app" className="brand">
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
              <div style={{ color: '#6b6b85', fontSize: '12px', marginTop: 1 }}>Job Search</div>
            </div>
          </a>

          <div className="topbar-right">
            <a href="/app" className="btn-ghost">← Back to profile</a>
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
                Your saved profile is missing. Go back to /app, fill in the basics, and save it first.
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
                    disabled={isTailoring || !jobDescription.trim()}
                  >
                    {isTailoring && tailorAction === 'resume' ? 'Working...' : 'Tailor resume'}
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => handleTailor('paste', 'cover_letter')}
                    disabled={isTailoring || !jobDescription.trim()}
                  >
                    {isTailoring && tailorAction === 'cover_letter' ? 'Working...' : 'Generate cover letter'}
                  </button>

                  {applyUrl.trim() && (
                    <a
                      href={applyUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                    >
                      Apply now
                    </a>
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
                          disabled={isTailoring || isLoadingJob || !activeFullJD.trim()}
                        >
                          {isTailoring && tailorAction === 'resume' ? 'Working...' : 'Tailor resume'}
                        </button>

                        <button
                          className="btn-secondary"
                          onClick={() => handleTailor('selected', 'cover_letter')}
                          disabled={isTailoring || isLoadingJob || !activeFullJD.trim()}
                        >
                          {isTailoring && tailorAction === 'cover_letter' ? 'Working...' : 'Generate cover letter'}
                        </button>

                        {currentApplyUrl && (
                          <a
                            href={currentApplyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost"
                          >
                            Apply now
                          </a>
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

            {isTailoring && (
              <div style={{ padding: '20px 0' }}>
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
                          borderTopColor: '#4f8ef7',
                          borderColor: i <= loadingStepIndex ? 'rgba(79,142,247,0.28)' : 'rgba(79,142,247,0.12)',
                        }}
                      />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tailorResult && !isTailoring && (
              <>
                <div className="result-header">
                  <div className="result-title">
                    {tailorResult.jobTitle || jobTitle || jobDetails?.title || selectedJob?.title || 'Tailored Application'}
                    {' '}
                    {(tailorResult.company || company || jobDetails?.company || selectedJob?.company) && (
                      <span style={{ color: '#6b6b85', fontWeight: 400, fontSize: 16 }}>
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
                          background: '#34d399',
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
                </div>

                <div className="result-text">{currentResultText || 'No output generated.'}</div>

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
                    <a
                      href={resultApplyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn action-apply"
                    >
                      Apply now
                    </a>
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
                    Clear result
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}