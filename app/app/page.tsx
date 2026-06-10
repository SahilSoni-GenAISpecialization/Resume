'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const profileSections = {
  personal: [
    { name: 'firstName', label: 'First name', type: 'text', required: true },
    { name: 'lastName', label: 'Last name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'text', required: false },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'text', required: false },
    { name: 'portfolio', label: 'Portfolio / Website', type: 'text', required: false },
  ],
  targeting: [
    { name: 'targetRole', label: 'Target role', type: 'text', required: true },
    { name: 'preferredLocation', label: 'Preferred location', type: 'text', required: false },
    { name: 'summary', label: 'Professional summary', type: 'textarea', required: false },
  ],
  resume: [
    { name: 'experience', label: 'Professional experience', type: 'textarea', required: true },
    { name: 'education', label: 'Education', type: 'textarea', required: true },
    { name: 'certifications', label: 'Certificates / Licenses', type: 'textarea', required: false },
    { name: 'skills', label: 'Skills', type: 'textarea', required: true },
    { name: 'projects', label: 'Projects', type: 'textarea', required: false },
    { name: 'additionalInfo', label: 'Additional information', type: 'textarea', required: false },
  ],
};

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  linkedin: '',
  portfolio: '',
  targetRole: '',
  preferredLocation: '',
  summary: '',
  experience: '',
  education: '',
  certifications: '',
  skills: '',
  projects: '',
  additionalInfo: '',
};

const sampleApplications = [
  { id: 1, company: 'Stripe', title: 'Frontend Engineer', status: 'Tailored', match: 92, updatedAt: '2 hours ago' },
  { id: 2, company: 'Shopify', title: 'Product Engineer', status: 'Draft', match: 84, updatedAt: 'Yesterday' },
  { id: 3, company: 'RBC', title: 'Software Developer', status: 'Applied', match: 88, updatedAt: '3 days ago' },
];

const PARSEABLE_FIELDS = new Set([
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'linkedin',
  'portfolio',
  'targetRole',
  'preferredLocation',
  'summary',
  'experience',
  'education',
  'certifications',
  'skills',
  'projects',
  'additionalInfo',
]);

export default function AppDashboardPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState(null);
  const [activeMode, setActiveMode] = useState('manual');
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [applications] = useState(sampleApplications);
  const [usage] = useState({ used: 2, limit: 5 });

  useEffect(() => {
    async function loadUser() {
      setIsLoadingProfile(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = '/login';
        return;
      }

      setUser(user);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileError && profile) {
        setFormData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          linkedin: profile.linkedin || '',
          portfolio: profile.portfolio || '',
          targetRole: profile.target_role || '',
          preferredLocation: profile.preferred_location || '',
          summary: profile.summary || '',
          experience: profile.experience || '',
          education: profile.education || '',
          certifications: profile.certifications || '',
          skills: profile.skills || '',
          projects: profile.projects || '',
          additionalInfo: profile.additional_info || '',
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          email: user.email || '',
        }));
      }

      setIsLoadingProfile(false);
    }

    loadUser();
  }, [supabase]);

  const completedRequired = useMemo(() => {
    const requiredFields = Object.values(profileSections)
      .flat()
      .filter((field) => field.required)
      .map((field) => field.name);

    const completed = requiredFields.filter((field) => formData[field]?.trim()).length;

    return {
      completed,
      total: requiredFields.length,
      percent: Math.round((completed / requiredFields.length) * 100),
    };
  }, [formData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setParseStatus('');
    setIsParsing(true);
    setActiveMode('upload');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Parse failed');
      }

      const parsed = json.data || {};
      const safeEntries = Object.entries(parsed).filter(([key, value]) => {
        return PARSEABLE_FIELDS.has(key) && typeof value === 'string' && value.trim() !== '';
      });

      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(safeEntries),
      }));

      setParseStatus('Resume parsed successfully. Review the fields below, then save your profile.');
    } catch (err) {
      console.error(err);
      setParseStatus(`Error: ${err.message || 'Could not parse resume.'}`);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in.');
      }

      let resumeFilePath = null;

      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, resumeFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: resumeFile.type,
          });

        if (uploadError) throw uploadError;
        resumeFilePath = filePath;
      }

      const profilePayload = {
        id: user.id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        linkedin: formData.linkedin.trim(),
        portfolio: formData.portfolio.trim(),
        target_role: formData.targetRole.trim(),
        preferred_location: formData.preferredLocation.trim(),
        summary: formData.summary.trim(),
        experience: formData.experience.trim(),
        education: formData.education.trim(),
        certifications: formData.certifications.trim(),
        skills: formData.skills.trim(),
        projects: formData.projects.trim(),
        additional_info: formData.additionalInfo.trim(),
        updated_at: new Date().toISOString(),
      };

      if (resumeFilePath) {
        profilePayload.resume_file_path = resumeFilePath;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      alert('Profile saved successfully.');
      setParseStatus((prev) =>
        prev && !prev.startsWith('Error') ? 'Profile saved successfully.' : prev
      );
    } catch (error) {
      console.error(error);
      alert(error.message || 'Something went wrong while saving.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error(error);
      alert('Could not log out.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleResetForm() {
    setFormData({
      ...initialForm,
      email: user?.email || '',
    });
    setResumeFile(null);
    setParseStatus('');
  }

  return (
    <>
      <style>{`
        :root {
          --bg: #15161d;
          --surface: #1c1e27;
          --surface-2: #232633;
          --surface-3: #2a2e3d;
          --border: rgba(255, 255, 255, 0.10);
          --border-strong: rgba(255, 255, 255, 0.16);
          --text: #f4f7fb;
          --muted: #a9b1c7;
          --faint: #75809b;
          --primary: #69a2ff;
          --primary-strong: #4c8eff;
          --success: #34d399;
          --warning: #fbbf24;
          --shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
        }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--text);
          font-family: Arial, sans-serif;
        }

        button, input, textarea { font-family: inherit; }

        .app-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(105, 162, 255, 0.10), transparent 28%),
            radial-gradient(circle at top right, rgba(52, 211, 153, 0.06), transparent 22%),
            var(--bg);
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          border-bottom: 1px solid var(--border);
          background: rgba(21, 22, 29, 0.86);
          backdrop-filter: blur(18px);
        }

        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary), #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(76, 142, 255, 0.28);
        }

        .brand-name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .usage-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(105, 162, 255, 0.10);
          border: 1px solid rgba(105, 162, 255, 0.18);
          color: #dbe8ff;
          font-size: 13px;
          font-weight: 600;
        }

        .topbar-btn, .primary-btn, .secondary-btn {
          border: none;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .topbar-btn {
          padding: 11px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
        }

        .topbar-btn:hover, .secondary-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: var(--border-strong);
        }

        .layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 28px;
        }

        .card {
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
          border: 1px solid var(--border);
          border-radius: 22px;
          box-shadow: var(--shadow);
        }

        .main-card { padding: 28px; }
        .side-stack { display: flex; flex-direction: column; gap: 24px; }

        .page-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(105, 162, 255, 0.10);
          border: 1px solid rgba(105, 162, 255, 0.16);
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .page-title {
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
        }

        .page-subtitle {
          color: var(--muted);
          font-size: 15px;
          line-height: 1.7;
          max-width: 760px;
          margin: 0 0 24px;
        }

        .progress-wrap {
          margin-bottom: 28px;
          padding: 18px;
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
        }

        .progress-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .progress-label { font-size: 14px; font-weight: 600; }
        .progress-copy { color: var(--muted); font-size: 13px; }

        .progress-bar {
          width: 100%;
          height: 10px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--primary), #8b5cf6);
        }

        .mode-toggle {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          margin-bottom: 24px;
        }

        .mode-btn {
          padding: 10px 16px;
          border-radius: 10px;
          color: var(--muted);
          background: transparent;
          font-size: 14px;
          font-weight: 600;
        }

        .mode-btn.active {
          background: rgba(105, 162, 255, 0.14);
          color: var(--text);
          border: 1px solid rgba(105, 162, 255, 0.22);
        }

        .upload-box {
          padding: 22px;
          border: 1px dashed rgba(105, 162, 255, 0.35);
          background: rgba(105, 162, 255, 0.06);
          border-radius: 18px;
          margin-bottom: 24px;
        }

        .upload-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .upload-copy {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .file-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .file-name {
          color: #dce6fb;
          font-size: 13px;
        }

        .upload-input { display: none; }

        .status-box {
          width: 100%;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-box.success {
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.2);
          color: #86efac;
        }

        .status-box.error {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          color: #f87171;
        }

        .status-box.info {
          background: rgba(96,165,250,0.08);
          border: 1px solid rgba(96,165,250,0.2);
          color: #93c5fd;
        }

        .primary-btn {
          background: var(--primary-strong);
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 12px 30px rgba(76, 142, 255, 0.24);
        }

        .primary-btn:hover {
          transform: translateY(-1px);
          background: #6ea5ff;
        }

        .secondary-btn {
          background: rgba(255,255,255,0.05);
          color: var(--text);
          border: 1px solid var(--border);
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .section-block { margin-bottom: 28px; }
        .section-heading {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 14px;
          letter-spacing: -0.02em;
        }

        .section-caption {
          color: var(--faint);
          font-size: 13px;
          margin-bottom: 18px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .field-full { grid-column: 1 / -1; }
        .field { display: flex; flex-direction: column; gap: 8px; }

        .label {
          font-size: 13px;
          color: #d6def0;
          font-weight: 600;
        }

        .input, .textarea {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          border-radius: 14px;
          padding: 14px 14px;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
        }

        .input::placeholder, .textarea::placeholder { color: var(--faint); }

        .input:focus, .textarea:focus {
          border-color: rgba(105, 162, 255, 0.6);
          box-shadow: 0 0 0 4px rgba(105, 162, 255, 0.12);
        }

        .textarea {
          min-height: 120px;
          resize: vertical;
          line-height: 1.6;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        .side-card { padding: 24px; }
        .side-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }

        .side-copy {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
          margin: 0 0 18px;
        }

        .search-cta {
          padding: 18px;
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(105, 162, 255, 0.18), rgba(139, 92, 246, 0.10)),
            rgba(255,255,255,0.03);
          border: 1px solid rgba(105, 162, 255, 0.20);
        }

        .search-cta-title {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .search-cta-copy {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .app-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 16px;
        }

        .app-item {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
        }

        .app-item-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .app-role {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 4px;
        }

        .app-company {
          color: var(--muted);
          font-size: 13px;
        }

        .status-pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          background: rgba(52, 211, 153, 0.12);
          color: #b8f3d8;
          border: 1px solid rgba(52, 211, 153, 0.20);
          white-space: nowrap;
        }

        .app-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--faint);
          font-size: 13px;
        }

        .match-score {
          color: #dce8ff;
          font-weight: 700;
        }

        .empty-box {
          padding: 20px;
          border-radius: 18px;
          background: rgba(255,255,255,0.03);
          border: 1px dashed var(--border);
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
        }

        @media (max-width: 1120px) {
          .layout { grid-template-columns: 1fr; }
        }

        @media (max-width: 720px) {
          .topbar {
            padding: 16px;
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .topbar-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .layout { padding: 16px; }
          .main-card, .side-card { padding: 20px; }
          .page-title { font-size: 28px; }
          .field-grid { grid-template-columns: 1fr; }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }
        }
      `}</style>

      <div className="app-shell">
        <nav className="topbar">
          <div className="brand">
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
              <div style={{ color: 'var(--faint)', fontSize: '13px', marginTop: 2 }}>Dashboard</div>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="usage-pill">
              <span>Usage</span>
              <span>{usage.used}/{usage.limit} free resumes used</span>
            </div>

            <button className="topbar-btn" onClick={() => (window.location.href = '/')}>
              View landing page
            </button>

            <button className="topbar-btn" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </nav>

        <main className="layout">
          <section className="card main-card">
            <div className="page-eyebrow">Complete your profile</div>
            <h1 className="page-title">Upload your resume or fill in the details below</h1>
            <p className="page-subtitle">
              Start with one master profile. Later, each tailored resume can pull from this base and rewrite it for a specific job description.
            </p>

            <div className="progress-wrap">
              <div className="progress-top">
                <div>
                  <div className="progress-label">
                    Profile completion: {completedRequired.completed}/{completedRequired.total} required fields
                  </div>
                  <div className="progress-copy">
                    Finish the basics first. Missing core fields will hurt resume quality later.
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '18px' }}>{completedRequired.percent}%</div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completedRequired.percent}%` }} />
              </div>
            </div>

            <div className="mode-toggle">
              <button
                className={`mode-btn ${activeMode === 'manual' ? 'active' : ''}`}
                onClick={() => setActiveMode('manual')}
              >
                Fill manually
              </button>
              <button
                className={`mode-btn ${activeMode === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveMode('upload')}
              >
                Upload resume
              </button>
            </div>

            {activeMode === 'upload' && (
              <div className="upload-box">
                <div className="upload-title">Upload your existing resume</div>
                <div className="upload-copy">
                  Upload a PDF or DOCX resume to auto-fill your profile, then review the results before saving.
                </div>

                <div className="file-row">
                  <label className="primary-btn" htmlFor="resumeUpload">
                    Choose file
                  </label>

                  <input
                    id="resumeUpload"
                    className="upload-input"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                  />

                  <div className="file-name">
                    {resumeFile ? `Selected: ${resumeFile.name}` : 'No file selected yet'}
                  </div>

                  {isParsing && (
                    <div className="status-box info">
                      Analyzing your resume with AI...
                    </div>
                  )}

                  {!!parseStatus && !isParsing && (
                    <div className={`status-box ${parseStatus.startsWith('Error') ? 'error' : 'success'}`}>
                      {parseStatus}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="section-block">
                <h2 className="section-heading">Personal details</h2>
                <div className="section-caption">
                  Use clean contact details. This becomes the base for every resume version.
                </div>

                <div className="field-grid">
                  {profileSections.personal.map((field) => (
                    <div
                      key={field.name}
                      className={`field ${['address', 'linkedin', 'portfolio'].includes(field.name) ? 'field-full' : ''}`}
                    >
                      <label className="label" htmlFor={field.name}>
                        {field.label} {field.required ? '*' : ''}
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={formData[field.name]}
                        onChange={handleChange}
                        className="input"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        disabled={isLoadingProfile}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-block">
                <h2 className="section-heading">Targeting</h2>
                <div className="section-caption">
                  Add the type of role you want so tailoring has direction from day one.
                </div>

                <div className="field-grid">
                  {profileSections.targeting.map((field) => (
                    <div
                      key={field.name}
                      className={`field ${field.type === 'textarea' ? 'field-full' : ''}`}
                    >
                      <label className="label" htmlFor={field.name}>
                        {field.label} {field.required ? '*' : ''}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.name}
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className="textarea"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          disabled={isLoadingProfile}
                        />
                      ) : (
                        <input
                          id={field.name}
                          name={field.name}
                          type={field.type}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className="input"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          disabled={isLoadingProfile}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-block">
                <h2 className="section-heading">Resume content</h2>
                <div className="section-caption">
                  Keep it plain and structured. ATS-friendly resumes rely on simple sections like experience, education, certifications, and skills.
                </div>

                <div className="field-grid">
                  {profileSections.resume.map((field) => (
                    <div key={field.name} className="field field-full">
                      <label className="label" htmlFor={field.name}>
                        {field.label} {field.required ? '*' : ''}
                      </label>
                      <textarea
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        className="textarea"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        disabled={isLoadingProfile}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleResetForm}
                  disabled={isSaving || isParsing}
                >
                  Reset form
                </button>
                <button type="submit" className="primary-btn" disabled={isSaving || isParsing || isLoadingProfile}>
                  {isSaving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>

          <aside className="side-stack">
            <section className="card side-card">
              <h2 className="side-title">Start a new search</h2>
              <p className="side-copy">
                Main action goes here. User should not hunt for it.
              </p>

              <div className="search-cta">
                <div className="search-cta-title">Search jobs and create a tailored resume</div>
                <div className="search-cta-copy">
                  Use your saved profile, pick a job, then generate a job-specific resume and cover letter.
                </div>
                <button
                  className="primary-btn"
                  onClick={() => (window.location.href = '/search')}
                >
                  Start new search
                </button>
              </div>
            </section>

            <section className="card side-card">
              <h2 className="side-title">Saved tailored resumes</h2>
              <p className="side-copy">
                This should show every tailored version and application status in one place.
              </p>

              {applications.length === 0 ? (
                <div className="empty-box">
                  No tailored resumes yet. Save your profile, then start a new search to generate the first one.
                </div>
              ) : (
                <div className="app-list">
                  {applications.map((item) => (
                    <div className="app-item" key={item.id}>
                      <div className="app-item-top">
                        <div>
                          <p className="app-role">{item.title}</p>
                          <div className="app-company">{item.company}</div>
                        </div>
                        <div className="status-pill">{item.status}</div>
                      </div>

                      <div className="app-meta">
                        <span className="match-score">{item.match}% match</span>
                        <span>Updated {item.updatedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </main>
      </div>
    </>
  );
}