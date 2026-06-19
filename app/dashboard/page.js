'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [profileData, setProfileData] = useState({
    full_name: '', email: '', phone: '', location: '', linkedin: '', website: '',
    summary: '', skills: '', experience: '', education: '', certifications: '',
  });
  const [isSaving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [jobQuery, setJobQuery] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobs, setJobs] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState(null);
  const [tailorError, setTailorError] = useState('');
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      loadProfile(user.id);
      loadApplications(user.id);
    });
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfileData(prev => ({ ...prev, ...data }));
  }

  async function loadApplications(userId) {
    const { data } = await supabase.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setApplications(data);
  }

  async function saveProfile() {
    setSaving(true); setSaveMsg('');
    const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profileData, updated_at: new Date().toISOString() });
    setSaveMsg(error ? `Error: ${error.message}` : '✓ Profile saved successfully');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFile(file);
    setParseStatus('Analyzing resume...');
    setIsParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-resume', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Parse failed');
      setProfileData(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(json.data).filter(([_, v]) => v && String(v).trim() !== ''))
      }));
      setParseStatus('✓ Resume parsed — fields filled below. Review and save.');
    } catch (err) {
      setParseStatus(`Error: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  }

  async function searchJobs() {
    if (!jobQuery.trim()) return;
    setIsSearching(true); setSearchError(''); setJobs([]); setSelectedJob(null); setTailorResult(null);
    try {
      const res = await fetch(`/api/search-jobs?query=${encodeURIComponent(jobQuery)}&location=${encodeURIComponent(jobLocation)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setJobs(json.jobs || []);
      if ((json.jobs || []).length === 0) setSearchError('No jobs found. Try different keywords.');
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  }

  async function tailorResume(job) {
    setSelectedJob(job); setIsTailoring(true); setTailorResult(null); setTailorError('');
    setActiveSection('tailor');
    try {
      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: `${job.title} at ${job.company}\n\n${job.description}`, profileData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Tailoring failed');
      setTailorResult(json);
      if (user) {
        await supabase.from('applications').insert({
          user_id: user.id, job_title: job.title, company: job.company,
          job_url: job.url, match_score: json.matchScore, status: 'tailored',
          tailored_resume: json.resume, cover_letter: json.coverLetter,
          created_at: new Date().toISOString(),
        });
        loadApplications(user.id);
      }
    } catch (err) {
      setTailorError(err.message);
    } finally {
      setIsTailoring(false);
    }
  }

  function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'profile', label: 'My Profile', icon: '◎' },
    { id: 'search', label: 'Job Search', icon: '⊕' },
    { id: 'tailor', label: 'Tailor Resume', icon: '✦' },
    { id: 'applications', label: 'Applications', icon: '≡' },
  ];

  const s = {
    page: { display: 'flex', minHeight: '100vh', background: '#13131a', color: '#f0f0f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    sidebar: { width: '240px', flexShrink: 0, background: '#18181f', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '24px 0' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px' },
    logoIcon: { width: '32px', height: '32px', borderRadius: '8px', background: '#4f8ef7', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', margin: '2px 8px', borderRadius: '8px', border: 'none', background: active ? 'rgba(79,142,247,0.12)' : 'transparent', color: active ? '#4f8ef7' : '#8b8b9e', fontSize: '14px', fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', width: 'calc(100% - 16px)', textAlign: 'left' }),
    main: { flex: 1, overflow: 'auto', padding: '32px 40px' },
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.02em' },
    subtitle: { fontSize: '14px', color: '#6b6b85' },
    card: { background: '#1c1c26', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '20px' },
    label: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b6b85', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' },
    input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#f0f0f5', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#f0f0f5', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 },
    btnPrimary: { background: '#4f8ef7', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' },
    btnGhost: { background: 'rgba(255,255,255,0.06)', color: '#c8c8d8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    statCard: { background: '#1c1c26', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' },
  };

  return (
    <div style={s.page}>
      <style>{`
        input:focus, textarea:focus { border-color: rgba(79,142,247,0.5) !important; }
        button:hover { opacity: 0.88; }
        .job-card:hover { border-color: rgba(79,142,247,0.3) !important; background: rgba(79,142,247,0.04) !important; }
        .job-card { transition: all 0.2s; cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Applymatic</span>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} style={s.navBtn(activeSection === item.id)} onClick={() => setActiveSection(item.id)}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '0 8px', marginTop: 'auto' }}>
          <div style={{ padding: '12px', margin: '0 0 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '11px', color: '#6b6b85', marginBottom: '2px' }}>Signed in as</p>
            <p style={{ fontSize: '12px', color: '#a0a0b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
          <button style={{ ...s.btnGhost, width: '100%', fontSize: '13px', padding: '8px' }}
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={s.main}>
        {activeSection === 'dashboard' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>Welcome back{profileData.full_name ? `, ${profileData.full_name.split(' ')[0]}` : ''} 👋</h1>
              <p style={s.subtitle}>Here's a summary of your job search activity.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Applications', value: applications.length, color: '#4f8ef7' },
                { label: 'Avg Match Score', value: applications.length ? Math.round(applications.reduce((a, b) => a + (b.match_score || 0), 0) / applications.length) + '%' : '—', color: '#34d399' },
                { label: 'This Month', value: applications.filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 86400000)).length, color: '#a78bfa' },
                { label: 'Free Resumes Left', value: Math.max(0, 5 - applications.filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 86400000)).length), color: '#fbbf24' },
              ].map((stat, i) => (
                <div key={i} style={s.statCard}>
                  <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color, marginBottom: '4px' }}>{stat.value}</p>
                  <p style={{ fontSize: '12px', color: '#6b6b85' }}>{stat.label}</p>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button style={s.btnPrimary} onClick={() => setActiveSection('search')}>⊕ Search Jobs</button>
                <button style={s.btnGhost} onClick={() => setActiveSection('profile')}>◎ Update Profile</button>
                <button style={s.btnGhost} onClick={() => setActiveSection('applications')}>≡ View Applications</button>
              </div>
            </div>
            {applications.length > 0 ? (
              <div style={s.card}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Recent Applications</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {applications.slice(0, 5).map((app, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{app.job_title}</p>
                        <p style={{ fontSize: '12px', color: '#6b6b85' }}>{app.company}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {app.match_score && <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '99px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>{app.match_score}% match</span>}
                        <span style={{ fontSize: '11px', color: '#6b6b85' }}>{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...s.card, textAlign: 'center', padding: '48px' }}>
                <p style={{ fontSize: '36px', marginBottom: '12px' }}>🚀</p>
                <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No applications yet</p>
                <p style={{ fontSize: '14px', color: '#6b6b85', marginBottom: '20px' }}>Search for jobs and tailor your resume to get started.</p>
                <button style={s.btnPrimary} onClick={() => setActiveSection('search')}>Search Jobs →</button>
              </div>
            )}
          </div>
        )}

        {activeSection === 'profile' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>My Profile</h1>
              <p style={s.subtitle}>Your info is used to tailor every resume and cover letter.</p>
            </div>
            <div style={s.card}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Upload your existing resume</h2>
              <p style={{ fontSize: '13px', color: '#6b6b85', marginBottom: '16px' }}>Upload a PDF or DOCX to auto-fill your profile fields below.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ ...s.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  {isParsing ? 'Parsing...' : 'Choose file'}
                  <input type="file" accept=".pdf,.docx,.doc" style={{ display: 'none' }} onChange={handleResumeUpload} disabled={isParsing} />
                </label>
                {resumeFile && <span style={{ fontSize: '13px', color: '#a0a0b8' }}>Selected: {resumeFile.name}</span>}
              </div>
              {parseStatus && (
                <p style={{ marginTop: '12px', fontSize: '13px', color: parseStatus.startsWith('✓') ? '#34d399' : parseStatus.startsWith('Error') ? '#f87171' : '#fbbf24', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>{parseStatus}</p>
              )}
            </div>
            <div style={s.card}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Personal Information</h2>
              <div style={{ ...s.grid2, marginBottom: '16px' }}>
                {[['full_name','Full Name'],['email','Email'],['phone','Phone'],['location','Location'],['linkedin','LinkedIn URL'],['website','Website / Portfolio']].map(([key, label]) => (
                  <div key={key}>
                    <label style={s.label}>{label}</label>
                    <input style={s.input} value={profileData[key] || ''} onChange={e => setProfileData(p => ({ ...p, [key]: e.target.value }))} placeholder={label} />
                  </div>
                ))}
              </div>
              {[
                ['summary', 'Professional Summary', 100, 'Brief professional summary...'],
                ['skills', 'Skills (comma-separated)', 80, 'React, Node.js, TypeScript, AWS...'],
                ['experience', 'Work Experience', 160, 'List your work experience...'],
                ['education', 'Education', 100, 'Degrees, institutions, graduation years...'],
                ['certifications', 'Certifications', 80, 'Certifications, licenses, courses...'],
              ].map(([key, label, height, placeholder]) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <label style={s.label}>{label}</label>
                  <textarea style={{ ...s.textarea, minHeight: `${height}px` }} value={profileData[key] || ''} onChange={e => setProfileData(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <button style={s.btnPrimary} onClick={saveProfile} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Profile'}</button>
                {saveMsg && <p style={{ fontSize: '13px', color: saveMsg.startsWith('✓') ? '#34d399' : '#f87171' }}>{saveMsg}</p>}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'search' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>Job Search</h1>
              <p style={s.subtitle}>Search live job listings and tailor your resume in one click.</p>
            </div>
            <div style={s.card}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={s.label}>Job Title / Keywords</label>
                  <input style={s.input} value={jobQuery} onChange={e => setJobQuery(e.target.value)} placeholder="e.g. Frontend Developer" onKeyDown={e => e.key === 'Enter' && searchJobs()} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={s.label}>Location</label>
                  <input style={s.input} value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="e.g. Toronto, ON" onKeyDown={e => e.key === 'Enter' && searchJobs()} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button style={s.btnPrimary} onClick={searchJobs} disabled={isSearching}>{isSearching ? 'Searching...' : '⊕ Search'}</button>
                </div>
              </div>
            </div>
            {searchError && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px', padding: '12px 16px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{searchError}</p>}
            {isSearching && (
              <div style={{ textAlign: 'center', padding: '48px', color: '#6b6b85' }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>⊕</p>
                <p>Searching live listings...</p>
              </div>
            )}
            {!isSearching && jobs.length === 0 && !searchError && (
              <div style={{ textAlign: 'center', padding: '64px', color: '#6b6b85' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#a0a0b8', marginBottom: '6px' }}>Search for your next opportunity</p>
                <p style={{ fontSize: '13px' }}>Enter a job title and location above to find live listings.</p>
              </div>
            )}
            {jobs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: '#6b6b85', marginBottom: '4px' }}>{jobs.length} jobs found</p>
                {jobs.map((job, i) => (
                  <div key={i} className="job-card" style={{ ...s.card, marginBottom: 0, border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{job.title}</h3>
                        <p style={{ fontSize: '14px', color: '#a0a0b8', marginBottom: '8px' }}>{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                        {job.description && <p style={{ fontSize: '13px', color: '#6b6b85', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{job.description}</p>}
                      </div>
                      <button style={{ ...s.btnPrimary, flexShrink: 0, fontSize: '13px', padding: '8px 16px' }} onClick={() => tailorResume(job)}>✦ Tailor Resume</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'tailor' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>Tailor Resume</h1>
              <p style={s.subtitle}>{selectedJob ? `Tailoring for: ${selectedJob.title} at ${selectedJob.company}` : 'Select a job from Job Search to tailor your resume.'}</p>
            </div>
            {isTailoring && (
              <div style={{ ...s.card, textAlign: 'center', padding: '64px' }}>
                <p style={{ fontSize: '32px', marginBottom: '16px' }}>✦</p>
                <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>AI is tailoring your resume...</p>
                <p style={{ fontSize: '13px', color: '#6b6b85' }}>Matching keywords, rewriting bullets, crafting cover letter</p>
              </div>
            )}
            {tailorError && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px', padding: '12px 16px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{tailorError}</p>}
            {tailorResult && !isTailoring && (
              <div>
                <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#6b6b85', marginBottom: '4px' }}>Match Score</p>
                    <p style={{ fontSize: '36px', fontWeight: 800, color: '#34d399' }}>{tailorResult.matchScore}%</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button style={s.btnPrimary} onClick={() => downloadText(tailorResult.resume, `resume-${selectedJob?.company || 'tailored'}.txt`)}>↓ Download Resume</button>
                    {tailorResult.coverLetter && <button style={s.btnGhost} onClick={() => downloadText(tailorResult.coverLetter, `cover-letter-${selectedJob?.company || 'tailored'}.txt`)}>↓ Cover Letter</button>}
                  </div>
                </div>
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Tailored Resume</h2>
                    <button style={{ ...s.btnGhost, fontSize: '12px', padding: '6px 12px' }} onClick={() => downloadText(tailorResult.resume, `resume-${selectedJob?.company || 'tailored'}.txt`)}>↓ Download</button>
                  </div>
                  <pre style={{ fontSize: '13px', color: '#c8c8d8', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '400px', overflow: 'auto' }}>{tailorResult.resume}</pre>
                </div>
                {tailorResult.coverLetter && (
                  <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Cover Letter</h2>
                      <button style={{ ...s.btnGhost, fontSize: '12px', padding: '6px 12px' }} onClick={() => downloadText(tailorResult.coverLetter, `cover-letter-${selectedJob?.company || 'tailored'}.txt`)}>↓ Download</button>
                    </div>
                    <pre style={{ fontSize: '13px', color: '#c8c8d8', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '400px', overflow: 'auto' }}>{tailorResult.coverLetter}</pre>
                  </div>
                )}
              </div>
            )}
            {!selectedJob && !isTailoring && !tailorResult && (
              <div style={{ textAlign: 'center', padding: '64px', color: '#6b6b85' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>✦</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#a0a0b8', marginBottom: '6px' }}>No job selected</p>
                <p style={{ fontSize: '13px', marginBottom: '20px' }}>Go to Job Search, find a role, and click "Tailor Resume".</p>
                <button style={s.btnPrimary} onClick={() => setActiveSection('search')}>Go to Job Search →</button>
              </div>
            )}
          </div>
        )}

        {activeSection === 'applications' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>Applications</h1>
              <p style={s.subtitle}>All your tailored resumes and applications in one place.</p>
            </div>
            {applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px', color: '#6b6b85' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#a0a0b8', marginBottom: '6px' }}>No applications yet</p>
                <p style={{ fontSize: '13px', marginBottom: '20px' }}>Tailor your resume for a job to see it here.</p>
                <button style={s.btnPrimary} onClick={() => setActiveSection('search')}>Search Jobs →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {applications.map((app, i) => (
                  <div key={i} style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{app.job_title}</h3>
                        <p style={{ fontSize: '14px', color: '#a0a0b8', marginBottom: '6px' }}>{app.company}</p>
                        <p style={{ fontSize: '12px', color: '#6b6b85' }}>{new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {app.match_score && <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '99px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>{app.match_score}% match</span>}
                        {app.tailored_resume && <button style={{ ...s.btnGhost, fontSize: '12px', padding: '6px 12px' }} onClick={() => downloadText(app.tailored_resume, `resume-${app.company}.txt`)}>↓ Resume</button>}
                        {app.cover_letter && <button style={{ ...s.btnGhost, fontSize: '12px', padding: '6px 12px' }} onClick={() => downloadText(app.cover_letter, `cover-letter-${app.company}.txt`)}>↓ Cover Letter</button>}
                        {app.job_url && <a href={app.job_url} target="_blank" rel="noopener noreferrer" style={{ ...s.btnPrimary, fontSize: '12px', padding: '6px 12px', textDecoration: 'none', display: 'inline-flex' }}>View Job ↗</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}