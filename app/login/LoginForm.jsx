'use client';

import { useState } from 'react';
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

export default function LoginForm() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  function goToDashboardAfterAuth() {
    // Full document navigation — never use Next.js client router here (Hostinger CDN RSC bug).
    const target = `${window.location.origin}/dashboard`;
    window.location.replace(target);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        goToDashboardAfterAuth();
      }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${getClientSiteUrl()}/api/auth/callback` },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
      } else {
        setMessage('Check your email to confirm your account.');
        setLoading(false);
      }
    }
  };

  return (
    <main className="login-page">
      <div className="login-shell">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <a href="/" className="login-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
          <a href="/" className="login-brandmark">
            <div className="login-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className="login-logo-text">Applymatic</span>
          </a>
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
            By continuing you agree to our{' '}
            <a href="/terms" style={{ color: 'var(--lp-blue)', fontWeight: 600 }}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" style={{ color: 'var(--lp-blue)', fontWeight: 600 }}>
              Privacy Policy
            </a>
            .
            <br />
            No credit card required.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
