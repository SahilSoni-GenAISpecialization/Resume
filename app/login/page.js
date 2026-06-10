'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && mode === 'login') {
        router.push('/app');
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
      } else {
        router.push('/app');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email to confirm your account.');
      }
    }

    setLoading(false);
  };

  return (
    <>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .login-input:focus {
          border-color: rgba(79,142,247,0.6) !important;
          box-shadow: 0 0 0 3px rgba(79,142,247,0.1) !important;
        }
        .login-btn:hover:not(:disabled) {
          background: #6fa3ff !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(79,142,247,0.35) !important;
        }
        .login-btn { transition: all 0.2s ease !important; }
        .feature-item {
          opacity: 0;
          animation: floatUp 0.5s ease forwards;
        }
        .feature-item:nth-child(1) { animation-delay: 0.1s; }
        .feature-item:nth-child(2) { animation-delay: 0.2s; }
        .feature-item:nth-child(3) { animation-delay: 0.3s; }
        .feature-item:nth-child(4) { animation-delay: 0.4s; }
        .tab-btn:hover { color: var(--text) !important; }
      `}</style>

      <main style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1e 50%, #0d1117 100%)'
        }}>
          <div style={{ position: 'absolute', top: '15%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '5%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '56px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(79,142,247,0.4)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Applymatic</span>
            </div>

            <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Land your next job<br />
              <span style={{ background: 'linear-gradient(90deg, #4f8ef7, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                10× faster
              </span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.7, marginBottom: '48px', maxWidth: '380px' }}>
              Upload your resume once. Applymatic tailors it to every job — ATS-optimized, keyword-matched, ready to send.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: '✦', color: '#4f8ef7', title: '5 free tailored resumes/month', sub: 'No credit card required to get started' },
                { icon: '⚡', color: '#fbbf24', title: 'AI-tailored in under 30 seconds', sub: 'GPT-powered resume + cover letter per job' },
                { icon: '🎯', color: '#34d399', title: 'Match score for every job', sub: 'Know your fit before you apply' },
                { icon: '📋', color: '#a78bfa', title: 'Full application dashboard', sub: "Track every resume you've ever generated" },
              ].map((f, i) => (
                <div key={i} className="feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>{f.title}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '48px', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex' }}>
                {['#4f8ef7','#34d399','#fbbf24','#a78bfa','#f87171'].map((c, i) => (
                  <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: '2px solid var(--bg)', marginLeft: i === 0 ? 0 : '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>
                    {['S','J','M','A','R'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Join job seekers using Applymatic</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Free to start · Upgrade anytime</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: '460px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {mode === 'login' ? 'Sign in to access your dashboard' : 'Start with 5 free resumes per month'}
            </p>
          </div>

          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '28px', gap: '4px' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                className="tab-btn"
                onClick={() => { setMode(m); setError(''); setMessage(''); }}
                style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: mode === m ? 'var(--blue)' : 'transparent', color: mode === m ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="login-input"
                style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
                style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s' }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--red)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--green)', fontSize: '13px' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-btn"
              style={{ width: '100%', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px', fontFamily: 'inherit', letterSpacing: '0.01em' }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Get Started Free →'}
            </button>
          </form>

          {mode === 'signup' && (
            <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', fontSize: '16px' }}>🎁</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>Free plan includes:</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>5 AI-tailored resumes/month · Cover letters · Match scores · Dashboard · PDF downloads</p>
              </div>
            </div>
          )}

          <p style={{ color: 'var(--text-faint)', fontSize: '12px', textAlign: 'center', marginTop: '24px', lineHeight: 1.6 }}>
            By continuing you agree to our Terms of Service.<br />No credit card required.
          </p>
        </div>
      </main>
    </>
  );
}