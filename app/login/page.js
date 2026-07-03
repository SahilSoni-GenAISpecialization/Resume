'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getClientSiteUrl } from '@/lib/site-url';
import '@/app/login.css';

const TRUST = [
  { c: '#2563eb', i: 'S' },
  { c: '#059669', i: 'J' },
  { c: '#7c3aed', i: 'M' },
  { c: '#e8a33d', i: 'A' },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0f172a">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && mode === 'login') {
        router.push('/profile');
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, mode]);

  const handleOAuth = async (provider) => {
    setError('');
    setMessage('');
    setOauthLoading(provider);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${getClientSiteUrl()}/api/auth/callback` },
    });

    if (oauthError) {
      const msg = oauthError.message || '';
      if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) {
        setError(
          `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not enabled yet. Enable it in your Supabase project under Authentication → Providers, then add the OAuth client ID and secret.`
        );
      } else {
        setError(msg);
      }
      setOauthLoading('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.push('/profile');
        router.refresh();
      }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${getClientSiteUrl()}/api/auth/callback` },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage('Check your email to confirm your account.');
      }
    }

    setLoading(false);
  };

  return (
    <main className="login-page">
      <div className="login-shell">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/" className="login-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
          <Link href="/" className="login-brandmark">
            <div className="login-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className="login-logo-text">Applymatic</span>
          </Link>
        </motion.div>

        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="login-card-title">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="login-card-sub">
                {mode === 'login'
                  ? 'Sign in to tailor your next resume'
                  : 'Start free — 5 AI-tailored resumes every month'}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="login-tabs">
            <motion.div
              className="login-tab-indicator"
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                left: mode === 'login' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                className={`login-tab ${mode === m ? 'active' : ''}`}
                onClick={() => {
                  setMode(m);
                  setError('');
                  setMessage('');
                }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="login-social-group">
            <button
              type="button"
              className="login-social-btn"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
            >
              {oauthLoading === 'google' ? <span className="login-spinner" style={{ borderTopColor: '#2563eb', borderColor: 'rgba(37,99,235,0.25)' }} /> : <GoogleIcon />}
              Continue with Google
            </button>
            <button
              type="button"
              className="login-social-btn"
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading}
            >
              {oauthLoading === 'github' ? <span className="login-spinner" style={{ borderTopColor: '#0f172a', borderColor: 'rgba(15,23,42,0.25)' }} /> : <GithubIcon />}
              Continue with GitHub
            </button>
          </div>

          <div className="login-divider">or continue with email</div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="login-input"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="login-alert login-alert-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {message && (
                <motion.div
                  className="login-alert login-alert-success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Please wait...
                </>
              ) : mode === 'login' ? (
                'Sign In →'
              ) : (
                'Get Started Free →'
              )}
            </button>
          </form>

          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                className="login-perk"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="login-perk-icon">🎁</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Free plan includes:</p>
                  <p style={{ fontSize: 12, color: 'var(--lp-muted)', lineHeight: 1.6 }}>
                    5 AI-tailored resumes/month · Cover letters · Match scores · Dashboard · PDF downloads
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="login-trust">
            <div className="login-trust-avatars">
              {TRUST.map((t, i) => (
                <div key={i} className="login-trust-avatar" style={{ background: t.c }}>
                  {t.i}
                </div>
              ))}
            </div>
            Join job seekers landing interviews faster
          </div>

          <p className="login-legal">
            By continuing you agree to our Terms of Service.
            <br />
            No credit card required.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
