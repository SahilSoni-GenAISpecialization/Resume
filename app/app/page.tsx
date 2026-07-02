'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  initialStructuredProfile,
  isProfileComplete,
  parsedResumeToStructured,
  profileCompletionPercent,
  profileRowToStructured,
  structuredToDbPayload,
  type StructuredProfile,
} from '@/lib/profile-data';
import {
  CertificationFields,
  EducationFields,
  ExperienceFields,
  LicenseFields,
  PersonalFields,
  ProjectFields,
  SkillsFields,
} from '@/components/app/ProfileFields';
import { RevealSection } from '@/components/app/profile-ui';
import UsageNavPill, { useResumeUsage } from '@/components/app/UsageNavPill';
import { UpgradeBanner, UpgradeModal, useUpgradeFlow } from '@/components/app/Upgrade';
import '@/app/app.css';

type ViewMode = 'setup' | 'search';

export default function AppDashboardPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StructuredProfile>(initialStructuredProfile());
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [activeMode, setActiveMode] = useState<'manual' | 'upload'>('manual');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const { usage, refresh: refreshUsage, markPro } = useResumeUsage(supabase, user?.id);
  const {
    modalOpen: upgradeModalOpen,
    openModal: openUpgradeModal,
    closeModal: closeUpgradeModal,
    startCheckout,
    checkoutLoading,
    checkoutError,
    verifyBanner,
    dismissVerifyBanner,
  } = useUpgradeFlow(supabase, user?.id, { refresh: refreshUsage, markPro });

  const [dreamRole, setDreamRole] = useState('');
  const [dreamCompany, setDreamCompany] = useState('');

  const completion = useMemo(() => profileCompletionPercent(profile), [profile]);

  useEffect(() => {
    async function loadUser() {
      setIsLoadingProfile(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        window.location.href = '/login';
        return;
      }

      setUser(authUser);

      const { data: row, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profileError && row) {
        const structured = profileRowToStructured(row, authUser.email || '');
        setProfile(structured);
        if (isProfileComplete(structured)) {
          setViewMode('search');
        }
      } else {
        setProfile(initialStructuredProfile(authUser.email || ''));
      }

      setIsLoadingProfile(false);
    }

    loadUser();
  }, [supabase]);

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setParseStatus('');
    setIsParsing(true);
    setActiveMode('upload');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/parse-resume', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Parse failed');

      const structured = parsedResumeToStructured(json.data || {}, user?.email || profile.personal.email);
      setProfile(structured);
      setParseStatus('Resume parsed successfully. Review each section below, then save your profile.');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Could not parse resume.';
      setParseStatus(`Error: ${message}`);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) throw new Error('You must be logged in.');

      let resumeFilePath: string | null = null;

      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop() ?? 'pdf';
        const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${authUser.id}/${fileName}`;

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

      const payload = structuredToDbPayload(profile, authUser.id);
      if (resumeFilePath) {
        (payload as Record<string, unknown>).resume_file_path = resumeFilePath;
      }

      const { error: upsertError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (upsertError) throw upsertError;

      setSaveMessage('Profile saved successfully.');
      setViewMode('search');
      refreshUsage();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Something went wrong while saving.';
      setSaveMessage(`Error: ${message}`);
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
    setProfile(initialStructuredProfile(user?.email || ''));
    setResumeFile(null);
    setParseStatus('');
    setSaveMessage('');
  }

  function handleStartSearch() {
    const params = new URLSearchParams();
    if (dreamRole.trim()) params.set('q', dreamRole.trim());
    if (dreamCompany.trim()) params.set('company', dreamCompany.trim());
    const query = params.toString();
    router.push(query ? `/search?${query}` : '/search');
  }

  const initials = `${profile.personal.firstName.charAt(0) || ''}${profile.personal.lastName.charAt(0) || ''}`.toUpperCase() || '?';

  return (
    <div className="app-shell">
      <nav className="app-topbar">
        <div className="app-brand">
          <div className="app-brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div className="app-brand-name">Applymatic</div>
            <div className="app-brand-sub">{viewMode === 'search' ? 'Ready to search' : 'Profile setup'}</div>
          </div>
        </div>

        <div className="app-topbar-right">
          <AnimatePresence>
            {viewMode === 'search' && (
              <motion.div
                className="app-profile-chip"
                initial={{ opacity: 0, y: -12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              >
                <span className="app-profile-avatar">{initials}</span>
                <span>
                  {profile.personal.firstName} {profile.personal.lastName}
                </span>
                <span style={{ color: 'var(--app-green)', fontSize: 11 }}>✓ Saved</span>
              </motion.div>
            )}
          </AnimatePresence>

          <UsageNavPill supabase={supabase} userId={user?.id} limitHitClassName="limit-hit" />

          {!usage.isPro && (
            <button type="button" className="upgrade-pill-btn" onClick={openUpgradeModal}>
              ✨ Upgrade to Pro
            </button>
          )}

          {viewMode === 'search' && (
            <button type="button" className="app-btn app-btn-ghost" onClick={() => setViewMode('setup')}>
              Edit profile
            </button>
          )}

          <a href="/dashboard" className="app-btn app-btn-ghost">
            Dashboard
          </a>
          <button type="button" className="app-btn app-btn-ghost" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {viewMode === 'setup' ? (
          <motion.main
            key="setup"
            className="app-main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="app-card">
              <div className="app-eyebrow">Complete your profile</div>
              <h1 className="app-title">Build your master resume profile</h1>
              <p className="app-subtitle">
                Upload a resume to auto-fill structured fields, or enter details manually. This becomes the base for every tailored application.
              </p>

              <div className="app-progress">
                <div className="app-progress-top">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Profile completion: {completion.done}/{completion.total}
                    </div>
                    <div style={{ color: 'var(--app-muted)', fontSize: 13, marginTop: 4 }}>
                      Fill personal info, experience, education, and at least one skill.
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{completion.percent}%</div>
                </div>
                <div className="app-progress-bar">
                  <div className="app-progress-fill" style={{ width: `${completion.percent}%` }} />
                </div>
              </div>

              <div className="app-mode-toggle">
                <motion.div
                  className="app-mode-indicator"
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    left: activeMode === 'manual' ? 5 : 'calc(50% + 2px)',
                    width: 'calc(50% - 7px)',
                  }}
                />
                <button
                  type="button"
                  className={`app-mode-btn ${activeMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setActiveMode('manual')}
                >
                  Fill manually
                </button>
                <button
                  type="button"
                  className={`app-mode-btn ${activeMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveMode('upload')}
                >
                  Upload resume
                </button>
              </div>

              {activeMode === 'upload' && (
                <RevealSection className="app-upload-box">
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Upload your existing resume</div>
                  <p style={{ color: 'var(--app-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                    PDF or DOCX — we parse experience, education, certifications, licenses, skills, and projects into editable fields.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <label className="app-btn app-btn-primary" htmlFor="resumeUpload" style={{ cursor: 'pointer' }}>
                      Choose file
                    </label>
                    <input
                      id="resumeUpload"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleResumeUpload}
                      style={{ display: 'none' }}
                    />
                    <span style={{ color: 'var(--app-muted)', fontSize: 13 }}>
                      {resumeFile ? resumeFile.name : 'No file selected'}
                    </span>
                  </div>
                  {isParsing && <div className="app-status app-status-info">Analyzing your resume with AI...</div>}
                  {parseStatus && !isParsing && (
                    <div className={`app-status ${parseStatus.startsWith('Error') ? 'app-status-error' : 'app-status-success'}`}>
                      {parseStatus}
                    </div>
                  )}
                </RevealSection>
              )}

              <form onSubmit={handleSaveProfile}>
                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Personal details</h2>
                      <p className="app-section-desc">Contact information for your resume header.</p>
                    </div>
                  </div>
                  <PersonalFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Professional experience</h2>
                      <p className="app-section-desc">Add each role with company, title, and dates.</p>
                    </div>
                  </div>
                  <ExperienceFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Education</h2>
                      <p className="app-section-desc">Degrees, programs, and institutions.</p>
                    </div>
                  </div>
                  <EducationFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Certifications</h2>
                      <p className="app-section-desc">Professional credentials and certificates.</p>
                    </div>
                  </div>
                  <CertificationFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Licenses</h2>
                      <p className="app-section-desc">Professional licenses and registrations.</p>
                    </div>
                  </div>
                  <LicenseFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Skills</h2>
                      <p className="app-section-desc">Type a skill and click Add — hover to remove.</p>
                    </div>
                  </div>
                  <SkillsFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-section-head">
                    <div>
                      <h2 className="app-section-title">Projects</h2>
                      <p className="app-section-desc">Personal or professional projects worth highlighting.</p>
                    </div>
                  </div>
                  <ProjectFields profile={profile} onChange={setProfile} disabled={isLoadingProfile} />
                </RevealSection>

                <RevealSection className="app-section">
                  <div className="app-field app-field-full">
                    <label>Additional information</label>
                    <textarea
                      className="app-textarea"
                      value={profile.additionalInfo}
                      onChange={(e) => setProfile({ ...profile, additionalInfo: e.target.value })}
                      placeholder="Languages, volunteer work, awards..."
                      disabled={isLoadingProfile}
                    />
                  </div>
                </RevealSection>

                {saveMessage && (
                  <div className={`app-status ${saveMessage.startsWith('Error') ? 'app-status-error' : 'app-status-success'}`}>
                    {saveMessage}
                  </div>
                )}

                <div className="app-form-actions">
                  <button type="button" className="app-btn app-btn-ghost" onClick={handleResetForm} disabled={isSaving || isParsing}>
                    Reset form
                  </button>
                  <button type="submit" className="app-btn app-btn-primary" disabled={isSaving || isParsing || isLoadingProfile}>
                    {isSaving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>
              </form>
            </div>
          </motion.main>
        ) : (
          <motion.div
            key="search"
            className="app-search-stage"
            initial={{ opacity: 0, x: 120, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="app-search-hero">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <div className="app-eyebrow" style={{ marginBottom: 20 }}>
                  Your profile is ready
                </div>
                <h2 className="app-search-hero-title">
                  Which dream job are you looking for today?
                </h2>
                <p className="app-search-hero-sub">
                  Tell us the role and company you have in mind — we&apos;ll take you straight to job search with your filters pre-filled.
                </p>
              </motion.div>

              <motion.div
                className="app-search-fields"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div>
                  <label htmlFor="dreamRole">Target role</label>
                  <input
                    id="dreamRole"
                    className="app-input"
                    value={dreamRole}
                    onChange={(e) => setDreamRole(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartSearch()}
                  />
                </div>
                <div>
                  <label htmlFor="dreamCompany">Target company</label>
                  <input
                    id="dreamCompany"
                    className="app-input"
                    value={dreamCompany}
                    onChange={(e) => setDreamCompany(e.target.value)}
                    placeholder="e.g. Stripe, Google, or leave blank"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartSearch()}
                  />
                </div>
              </motion.div>

              <motion.button
                type="button"
                className="app-btn app-btn-primary app-search-submit"
                onClick={handleStartSearch}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.45 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start new search →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {verifyBanner === 'success' && (
        <div className="app-status app-status-success" style={{ position: 'fixed', top: 90, right: 24, zIndex: 190, maxWidth: 360 }}>
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
        <div className="app-status app-status-error" style={{ position: 'fixed', top: 90, right: 24, zIndex: 190, maxWidth: 360 }}>
          We couldn't confirm your payment automatically. Contact info@jauraautomation.com if you were charged.
          <button
            type="button"
            onClick={dismissVerifyBanner}
            style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
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
    </div>
  );
}
