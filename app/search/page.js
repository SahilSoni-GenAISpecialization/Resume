'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('search');

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
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

    try {
      const res = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, location: searchLocation }),
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

  async function handleTailor(source = 'selected') {
    const jd =
      source === 'paste'
        ? jobDescription
        : jobDetails?.description || selectedJob?.descriptionPreview || '';

    const title = source === 'paste' ? jobTitle : jobDetails?.title || selectedJob?.title || '';
    const comp = source === 'paste' ? company : jobDetails?.company || selectedJob?.company || '';

    if (!jd?.trim() || jd.trim().length < 120) {
      setTailorError('Please use a full job description before tailoring.');
      return;
    }

    if (!profile || (!profile.experience && !profile.skills && !profile.education)) {
      setTailorError('Please fill and save your profile first before tailoring.');
      return;
    }

    setIsTailoring(true);
    setTailorError('');
    setTailorResult(null);

    try {
      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobDescription: jd,
          jobTitle: title,
          company: comp,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Tailoring failed');

      setTailorResult(json);
      setActiveResultTab('resume');
    } catch (err) {
      setTailorError(err.message || 'Could not tailor resume.');
    } finally {
      setIsTailoring(false);
    }
  }

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(text, filename) {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeFullJD =
    activeTab === 'paste'
      ? jobDescription
      : jobDetails?.description || selectedJob?.descriptionPreview || '';

  const showMatchScore = !!tailorResult?.matchScore && tailorResult.matchScore >= 65;

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

        .btn-ghost {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #a0a0b8;
          border-radius: 9px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }

        .btn-ghost:hover { background: rgba(255,255,255,0.09); color: #f0f0f5; }

        .btn-primary {
          background: #4f8ef7;
          border: none;
          color: white;
          border-radius: 9px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
        }

        .btn-primary:hover:not(:disabled) {
          background: #6fa3ff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(79,142,247,0.3);
        }

        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: #f0f0f5;
          border-radius: 9px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
        }

        .layout {
          max-width: 1360px;
          margin: 0 auto;
          padding: 32px 28px;
          display: grid;
          grid-template-columns: 460px 1fr;
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

        .input, .textarea {
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
        .input:focus, .textarea:focus {
          border-color: rgba(79,142,247,0.5);
          box-shadow: 0 0 0 3px rgba(79,142,247,0.1);
        }

        .textarea { resize: vertical; line-height: 1.7; min-height: 220px; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .search-row { display: flex; gap: 10px; align-items: flex-end; }
        .search-row .field { flex: 1; margin-bottom: 0; }
        .search-row .btn-primary { height: 44px; flex-shrink: 0; padding: 0 18px; }

        .job-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
          max-height: 70vh;
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
          gap: 10px;
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

        .success-box {
          margin-top: 14px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.2);
          color: #34d399;
          font-size: 13px;
          font-weight: 500;
        }

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

        .job-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
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
          min-height: 320px;
          max-height: 58vh;
          overflow-y: auto;
        }

        .result-card { display: flex; flex-direction: column; gap: 0; }
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
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s;
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
        }

        .empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.5; }
        .empty-title { font-size: 16px; font-weight: 600; color: #6b6b85; margin-bottom: 8px; }
        .empty-sub { font-size: 13px; color: #4a4a60; line-height: 1.7; max-width: 320px; }

        .loading-steps { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
        .loading-step { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #a0a0b8; }

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

        @media (max-width: 1100px) {
          .layout { grid-template-columns: 1fr; }
          .job-list { max-height: 420px; }
        }

        @media (max-width: 600px) {
          .layout { padding: 16px; }
          .topbar { padding: 14px 16px; }
          .two-col { grid-template-columns: 1fr; }
          .search-row { flex-direction: column; align-items: stretch; }
          .search-row .btn-primary { width: 100%; }
          .job-actions { flex-direction: column; }
          .job-actions > * { width: 100%; }
        }
      `}</style>

      <div className="shell">
        <nav className="topbar">
          <a href="/app" className="brand">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="14" y2="17"/>
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
                onClick={() => setActiveTab('search')}
              >
                Search jobs
              </button>
              <button
                className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
                onClick={() => setActiveTab('paste')}
              >
                Paste job description
              </button>
            </div>

            {activeTab === 'search' && (
              <>
                <div className="search-row">
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
                  <button
                    className="btn-primary"
                    onClick={handleSearchJobs}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? <><div className="spin" />Searching</> : 'Search'}
                  </button>
                </div>

                {searchError && <div className="error-box">{searchError}</div>}

                {!isSearching && !searchError && searchResults.length > 0 && (
                  <>
                    <div style={{ marginTop: 18, fontSize: 12, color: '#7d7d96', fontWeight: 600 }}>
                      {searchResults.length} jobs found
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
                  </>
                )}

                {isSearching && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#6b6b85', fontSize: '14px' }}>
                    <div className="spin" style={{ margin: '0 auto 12px' }} />
                    Searching live job listings...
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
                  <div className="info-box">No jobs found for that search.</div>
                )}
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
                  <label className="label">Full job description *</label>
                  <textarea
                    className="textarea"
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                <div className="job-actions">
                  <button
                    className="btn-primary"
                    onClick={() => handleTailor('paste')}
                    disabled={isTailoring || !activeFullJD.trim()}
                  >
                    {isTailoring ? <><div className="spin" />Tailoring...</> : 'Tailor resume'}
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => handleTailor('paste')}
                    disabled={isTailoring || !activeFullJD.trim()}
                  >
                    Generate cover letter
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="card result-card">
            {activeTab === 'search' && !selectedJob && !isSearching && (
              <div className="empty-state">
                <div className="empty-icon">✦</div>
                <div className="empty-title">Select a job to review it</div>
                <div className="empty-sub">
                  Open a listing to read the full description before tailoring your resume or applying.
                </div>
              </div>
            )}

            {activeTab === 'search' && selectedJob && (
              <>
                <div className="job-panel-title">
                  {jobDetails?.title || selectedJob.title || 'Job details'}
                </div>

                <div className="job-panel-meta">
                  <span>{jobDetails?.company || selectedJob.company || 'Unknown company'}</span>
                  {(jobDetails?.location || selectedJob.location) && (
                    <span>📍 {jobDetails?.location || selectedJob.location}</span>
                  )}
                  {(jobDetails?.type || selectedJob.type) && (
                    <span>{jobDetails?.type || selectedJob.type}</span>
                  )}
                </div>

                <div className="job-actions">
                  <button
                    className="btn-primary"
                    onClick={() => handleTailor('selected')}
                    disabled={isTailoring || isLoadingJob || !activeFullJD.trim()}
                  >
                    {isTailoring ? <><div className="spin" />Tailoring...</> : 'Tailor resume'}
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => handleTailor('selected')}
                    disabled={isTailoring || isLoadingJob || !activeFullJD.trim()}
                  >
                    Generate cover letter
                  </button>

                  {!!(jobDetails?.applyUrl || selectedJob.applyUrl) && (
                    <a
                      className="btn-secondary"
                      href={jobDetails?.applyUrl || selectedJob.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
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
                <div className="card-title" style={{ marginBottom: '6px' }}>Generating tailored application...</div>
                <div className="card-sub" style={{ marginBottom: '28px' }}>
                  This usually takes 15–30 seconds.
                </div>

                <div className="loading-steps">
                  {[
                    'Parsing job description',
                    'Extracting keywords',
                    'Rewriting summary',
                    'Tailoring experience',
                    'Writing cover letter'
                  ].map((step, i) => (
                    <div className="loading-step" key={i}>
                      <div className="spin" style={{ borderTopColor: '#4f8ef7', borderColor: 'rgba(79,142,247,0.15)' }} />
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
                    {(tailorResult.company || company || jobDetails?.company || selectedJob?.company) && (
                      <span style={{ color: '#6b6b85', fontWeight: 400, fontSize: '16px' }}>
                        {' '}· {tailorResult.company || company || jobDetails?.company || selectedJob?.company}
                      </span>
                    )}
                  </div>

                  {showMatchScore && (
                    <div className="match-badge">
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: '#34d399',
                          display: 'inline-block',
                        }}
                      />
                      {tailorResult.matchScore}% match
                    </div>
                  )}
                </div>

                {!showMatchScore && !!tailorResult.matchScore && (
                  <div className="info-box">
                    Match score hidden because it is low-confidence and not useful for decision-making yet.
                  </div>
                )}

                <div className="result-tabs">
                  <button
                    className={`result-tab ${activeResultTab === 'resume' ? 'active' : ''}`}
                    onClick={() => setActiveResultTab('resume')}
                  >
                    Resume
                  </button>
                  {!!tailorResult.coverLetter && (
                    <button
                      className={`result-tab ${activeResultTab === 'cover' ? 'active' : ''}`}
                      onClick={() => setActiveResultTab('cover')}
                    >
                      Cover Letter
                    </button>
                  )}
                  {!!tailorResult.matchReasons && showMatchScore && (
                    <button
                      className={`result-tab ${activeResultTab === 'match' ? 'active' : ''}`}
                      onClick={() => setActiveResultTab('match')}
                    >
                      Match Analysis
                    </button>
                  )}
                </div>

                {activeResultTab === 'resume' && <div className="result-text">{tailorResult.resume}</div>}
                {activeResultTab === 'cover' && <div className="result-text">{tailorResult.coverLetter}</div>}
                {activeResultTab === 'match' && <div className="result-text">{tailorResult.matchReasons}</div>}

                <div className="result-actions">
                  <button
                    className="action-btn action-copy"
                    onClick={() =>
                      handleCopy(
                        activeResultTab === 'resume'
                          ? tailorResult.resume
                          : activeResultTab === 'cover'
                          ? tailorResult.coverLetter
                          : tailorResult.matchReasons
                      )
                    }
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>

                  <button
                    className="action-btn action-download"
                    onClick={() =>
                      handleDownload(
                        tailorResult.resume,
                        `resume-${(tailorResult.jobTitle || jobTitle || 'tailored')
                          .toLowerCase()
                          .replace(/\s+/g, '-')}.txt`
                      )
                    }
                  >
                    Download resume
                  </button>

                  {!!tailorResult.coverLetter && (
                    <button
                      className="action-btn action-download"
                      onClick={() =>
                        handleDownload(
                          tailorResult.coverLetter,
                          `cover-letter-${(tailorResult.company || company || 'tailored')
                            .toLowerCase()
                            .replace(/\s+/g, '-')}.txt`
                        )
                      }
                    >
                      Download cover letter
                    </button>
                  )}

                  <button
                    className="action-btn action-new"
                    onClick={() => {
                      setTailorResult(null);
                      setTailorError('');
                      setActiveResultTab('resume');
                    }}
                  >
                    Clear result
                  </button>
                </div>
              </>
            )}

            {activeTab === 'paste' && !!tailorError && <div className="error-box">{tailorError}</div>}
          </section>
        </main>
      </div>
    </>
  );
}