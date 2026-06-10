'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
const [isParsing, setIsParsing] = useState(false);
const [parseStatus, setParseStatus] = useState('');

async function handleResumeUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  setResumeFile(file);
  setParseStatus('Analyzing resume...');
  setIsParsing(true);

  try {
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/parse-resume', {
      method: 'POST',
      body: fd,
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.error || 'Parse failed');

    // Autofill form fields
    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(json.data).filter(([_, v]) => v && v.trim() !== '')
      ),
    }));

    setParseStatus('✓ Resume parsed — fields filled below. Review and save.');
  } catch (err) {
    console.error(err);
    setParseStatus(`Error: ${err.message}`);
  } finally {
    setIsParsing(false);
  }
}
  const audiences = {
    general: {
      label: 'Job Seekers',
      headline: 'Every application, perfectly tailored',
      sub: 'Stop sending the same resume to every job. Applymatic rewrites your resume for each role — matching keywords, optimizing for ATS, and highlighting what matters most to that specific employer.',
      points: ['ATS-optimized for every job posting', 'Keyword-matched to beat applicant filters', 'Cover letter written in your voice', 'Match score so you apply with confidence'],
    },
    tech: {
      label: 'Tech Workers',
      headline: 'Built for devs, PMs, and designers',
      sub: 'Technical roles have specific stacks, methodologies, and buzzwords. Applymatic understands the difference between a React role and a Vue role — and tailors your resume accordingly.',
      points: ['Stack-aware resume tailoring', 'Highlights relevant projects per role', 'Adjusts seniority framing automatically', 'Optimized for FAANG and startup JDs alike'],
    },
    grads: {
      label: 'Recent Grads',
      headline: 'No experience? No problem.',
      sub: 'Entry-level roles are brutally competitive. Applymatic helps you present your coursework, projects, and internships in the strongest possible light — tailored to every job description.',
      points: ['Maximizes coursework and projects', 'Frames internships as real experience', 'Identifies transferable skills automatically', '5 free tailored resumes every month'],
    },
  };

  const steps = [
    { num: '01', icon: '📄', title: 'Upload your resume', sub: 'Drop your existing PDF. We parse it instantly — no manual entry.' },
    { num: '02', icon: '🔍', title: 'Search for jobs', sub: 'Search any title and location. We pull live listings from across the web.' },
    { num: '03', icon: '✦', title: 'Get your tailored resume', sub: 'One click. AI rewrites your resume + cover letter, optimized for that exact job.' },
  ];

  const faqs = [
    { q: 'Is it really free?', a: 'Yes. You get 5 AI-tailored resumes every month at no cost — no credit card required. Each includes a custom cover letter, match score, and PDF download.' },
    { q: 'What does "tailored" actually mean?', a: 'Our AI rewrites your resume to mirror the language, keywords, and priorities of each specific job description. It\'s not a template swap — it\'s a full rewrite optimized for that role\'s ATS system.' },
    { q: 'Will ATS systems accept these resumes?', a: 'Yes. The resumes are generated in clean, ATS-friendly format with relevant keywords pulled directly from the job description. No tables, no columns, no graphics that break parsers.' },
    { q: 'How is this different from ChatGPT?', a: 'Applymatic is purpose-built for job applications. It integrates job search, resume parsing, tailoring, cover letter generation, match scoring, and a dashboard — all in one workflow. ChatGPT requires you to copy-paste and prompt-engineer every step manually.' },
    { q: 'What happens when I hit the free limit?', a: 'You\'ll see a clear message when you\'ve used your 5 free resumes for the month. Pro plan with unlimited access is coming soon.' },
    { q: 'Is my resume data secure?', a: 'Your resume data is stored securely in your personal account. We never share your data with employers or third parties.' },
  ];

  return (
    <>
      <style>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-float { animation: heroFloat 6s ease-in-out infinite; }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .nav-link { color: #8b8b9e; font-size: 14px; cursor: pointer; transition: color 0.2s; text-decoration: none; background: none; border: none; font-family: inherit; }
        .nav-link:hover { color: #f0f0f5; }
        .cta-primary { background: #4f8ef7; color: white; border: none; border-radius: 10px; padding: 13px 28px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .cta-primary:hover { background: #6fa3ff; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(79,142,247,0.4); }
        .cta-ghost { background: transparent; color: #8b8b9e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 13px 28px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .cta-ghost:hover { color: #f0f0f5; border-color: rgba(255,255,255,0.2); }
        .step-card:hover { border-color: rgba(79,142,247,0.3) !important; transform: translateY(-4px); }
        .step-card { transition: all 0.25s; }
        .tab-pill { padding: 8px 18px; border-radius: 99px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; font-family: inherit; }
        .faq-item { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .faq-btn { width: 100%; background: none; border: none; text-align: left; padding: 20px 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-family: inherit; color: #f0f0f5; font-size: 15px; font-weight: 500; }
        .pricing-card { background: #1c1c26; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 36px; flex: 1; transition: all 0.25s; }
        .pricing-card:hover { border-color: rgba(79,142,247,0.25); }
        .pricing-pro { background: linear-gradient(145deg, #0d1a2e, #111118); border-color: rgba(79,142,247,0.35) !important; position: relative; overflow: hidden; }
        .pricing-pro::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #4f8ef7, #a78bfa); }
      `}</style>

      <div style={{ background: '#13131a', minHeight: '100vh', color: '#f0f0f5' }}>

        {/* ── NAVBAR ── */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s', background: scrolled ? 'rgba(19,19,26,0.92)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#4f8ef7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Applymatic</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {[['How it works','how-it-works'],['Features','features'],['Pricing','pricing'],['FAQ','faq']].map(([label, id]) => (
              <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/login" style={{ background: 'transparent', color: '#a0a0b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Sign In
            </a>
            <a href="/login" style={{ background: '#4f8ef7', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Get Started Free
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 40px 80px', position: 'relative', overflow: 'hidden' }}>
          {/* Background glows */}
          <div style={{ position: 'absolute', top: '20%', left: '15%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1100px', width: '100%', display: 'flex', alignItems: 'center', gap: '80px', position: 'relative', zIndex: 1 }}>
            {/* Left */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '99px', padding: '6px 14px', marginBottom: '28px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f8ef7', display: 'inline-block' }} />
                <span style={{ fontSize: '13px', color: '#4f8ef7', fontWeight: 500 }}>5 free resumes every month · No card required</span>
              </div>

              <h1 style={{ fontSize: '58px', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.03em' }}>
                Land interviews<br />
                <span style={{ background: 'linear-gradient(90deg, #4f8ef7 0%, #a78bfa 50%, #34d399 100%)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'gradientMove 4s ease infinite' }}>
                  not rejections
                </span>
              </h1>

              <p style={{ fontSize: '18px', color: '#a0a0b8', lineHeight: 1.7, marginBottom: '36px', maxWidth: '440px' }}>
                Upload your resume. Find a job. Get an AI-tailored resume and cover letter — ATS-optimized, keyword-matched, ready to send in 30 seconds.
              </p>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '40px' }}>
                <a href="/login" className="cta-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Start for free →
                </a>
                <button className="cta-ghost" onClick={() => scrollTo('how-it-works')}>
                  See how it works
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '32px' }}>
                {[['5', 'Free resumes/month'], ['30s', 'To tailor a resume'], ['100%', 'ATS compatible']].map(([num, label]) => (
                  <div key={label}>
                    <p style={{ fontSize: '24px', fontWeight: 800, color: '#f0f0f5', marginBottom: '2px' }}>{num}</p>
                    <p style={{ fontSize: '12px', color: '#6b6b85' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Resume mockup */}
            <div className="hero-float" style={{ width: '380px', flexShrink: 0 }}>
              <div style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ height: '14px', width: '140px', background: 'rgba(255,255,255,0.12)', borderRadius: '4px', marginBottom: '8px' }} />
                    <div style={{ height: '10px', width: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                  </div>
                  <div style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '99px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>92% match</span>
                  </div>
                </div>

                {/* Section */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ height: '9px', width: '80px', background: 'rgba(79,142,247,0.4)', borderRadius: '4px', marginBottom: '10px' }} />
                  {[100, 85, 90].map((w, i) => (
                    <div key={i} style={{ height: '8px', width: `${w}%`, background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '6px' }} />
                  ))}
                </div>

                {/* Skills */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ height: '9px', width: '60px', background: 'rgba(79,142,247,0.4)', borderRadius: '4px', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL', 'Docker'].map(s => (
                      <span key={s} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '99px', padding: '3px 10px', fontSize: '11px', color: '#4f8ef7' }}>{s}</span>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <div style={{ height: '9px', width: '90px', background: 'rgba(79,142,247,0.4)', borderRadius: '4px', marginBottom: '10px' }} />
                  {[95, 80, 88, 75].map((w, i) => (
                    <div key={i} style={{ height: '8px', width: `${w}%`, background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '6px' }} />
                  ))}
                </div>

                {/* AI badge */}
                <div style={{ marginTop: '20px', padding: '10px 14px', background: 'rgba(79,142,247,0.14)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>✦</span>
                  <span style={{ fontSize: '12px', color: '#4f8ef7' }}>AI-tailored for: Senior Frontend Engineer at Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ padding: '100px 40px', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>How it works</p>
              <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>Three steps to your next interview</h2>
              <p style={{ color: '#a0a0b8', fontSize: '16px', maxWidth: '480px', margin: '0 auto' }}>No complicated setup. No prompt engineering. Just results.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {steps.map((step, i) => (
                <div key={i} className="step-card" style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '36px 32px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '13px', fontWeight: 700, color: 'rgba(79,142,247,0.3)', fontVariantNumeric: 'tabular-nums' }}>{step.num}</div>
                  <div style={{ fontSize: '36px', marginBottom: '20px' }}>{step.icon}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{step.title}</h3>
                  <p style={{ color: '#a0a0b8', fontSize: '14px', lineHeight: 1.7 }}>{step.sub}</p>
                  {i < 2 && (
                    <div style={{ position: 'absolute', top: '50%', right: '-16px', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.1)', fontSize: '20px', zIndex: 2 }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES BY AUDIENCE ── */}
        <section id="features" style={{ padding: '100px 40px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>Built for everyone</p>
              <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>Tailored to your situation</h2>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '56px' }}>
              {Object.entries(audiences).map(([key, val]) => (
                <button key={key} className="tab-pill" onClick={() => setActiveTab(key)}
                  style={{ background: activeTab === key ? '#4f8ef7' : 'rgba(255,255,255,0.04)', color: activeTab === key ? 'white' : '#8b8b9e', borderColor: activeTab === key ? 'transparent' : 'rgba(255,255,255,0.11)' }}>
                  {val.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px', lineHeight: 1.2 }}>{audiences[activeTab].headline}</h3>
                <p style={{ color: '#a0a0b8', fontSize: '15px', lineHeight: 1.8, marginBottom: '32px' }}>{audiences[activeTab].sub}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {audiences[activeTab].points.map((point, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '14px', color: '#c8c8d8', lineHeight: 1.6 }}>{point}</span>
                    </div>
                  ))}
                </div>
                <a href="/login" className="cta-primary" style={{ display: 'inline-flex', marginTop: '36px', textDecoration: 'none', alignItems: 'center' }}>
                  Try it free →
                </a>
              </div>

              {/* Right visual */}
              <div style={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>AI Tailoring in progress...</span>
                  <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '99px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>⚡ 28s</span>
                </div>
                {[
                  { label: 'Parsing job description', done: true },
                  { label: 'Extracting keywords', done: true },
                  { label: 'Rewriting summary', done: true },
                  { label: 'Tailoring experience bullets', done: true },
                  { label: 'Writing cover letter', done: false },
                  { label: 'Calculating match score', done: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: item.done ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${item.done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.done ? (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                      )}
                    </div>
                    <span style={{ fontSize: '13px', color: item.done ? '#c8c8d8' : '#4a4a5a' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ padding: '100px 40px', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>Pricing</p>
              <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>Start free. Upgrade when ready.</h2>
              <p style={{ color: '#a0a0b8', fontSize: '16px' }}>No credit card required to get started.</p>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              {/* Free */}
              <div className="pricing-card">
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#a0a0b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Free</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 800 }}>$0</span>
                  <span style={{ color: '#6b6b85', fontSize: '14px' }}>/month</span>
                </div>
                <p style={{ color: '#a0a0b8', fontSize: '13px', marginBottom: '28px' }}>Perfect for getting started</p>
                <a href="/login" style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', marginBottom: '28px', transition: 'all 0.2s' }}>
                  Get started free
                </a>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['5 tailored resumes/month', 'AI cover letter per application', 'Match score + reasons', 'PDF downloads', 'Application dashboard', 'Job search (live listings)'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: '13px', color: '#a0a0b8' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro */}
              <div className="pricing-card pricing-pro">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pro</p>
                  <span style={{ background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.3)', borderRadius: '99px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>Coming soon</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 800 }}>$9.99</span>
                  <span style={{ color: '#6b6b85', fontSize: '14px' }}>/month</span>
                </div>
                <p style={{ color: '#a0a0b8', fontSize: '13px', marginBottom: '28px' }}>For active job seekers</p>
                <button disabled style={{ display: 'block', width: '100%', textAlign: 'center', background: '#4f8ef7', color: 'white', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: 600, cursor: 'not-allowed', opacity: 0.5, marginBottom: '28px', fontFamily: 'inherit' }}>
                  Coming soon
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Unlimited tailored resumes', 'Everything in Free', 'Priority AI processing', 'Resume version history', 'LinkedIn profile optimizer', 'Email support'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: '13px', color: '#a0a0b8' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={{ padding: '100px 40px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>FAQ</p>
              <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em' }}>Common questions</h2>
            </div>

            <div>
              {faqs.map((faq, i) => (
                <div key={i} className="faq-item">
                  <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    <span style={{ color: '#6b6b85', fontSize: '20px', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ paddingBottom: '20px', color: '#a0a0b8', fontSize: '14px', lineHeight: 1.8 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section style={{ padding: '80px 40px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', background: 'linear-gradient(145deg, #0d1a2e, #111118)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '24px', padding: '64px 48px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #4f8ef7, #a78bfa, #34d399)' }} />
            <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>Ready to get more interviews?</h2>
            <p style={{ color: '#a0a0b8', fontSize: '16px', marginBottom: '32px' }}>Join job seekers using Applymatic. Start free — no card required.</p>
            <a href="/login" className="cta-primary" style={{ textDecoration: 'none', display: 'inline-flex', fontSize: '16px', padding: '14px 36px' }}>
              Get started free →
            </a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ padding: '40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#4f8ef7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Applymatic</span>
            </div>
            <p style={{ color: '#6b6b85', fontSize: '13px' }}>© 2026 Applymatic. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Privacy', 'Terms', 'Contact'].map(l => (
                <a key={l} href="#" style={{ color: '#6b6b85', fontSize: '13px', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}