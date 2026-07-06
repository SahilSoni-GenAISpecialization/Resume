'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import SupportBackLink from '@/components/SupportBackLink';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { postJsonApi } from '@/lib/api-response';
import '@/app/login.css';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSent(false);

    try {
      await postJsonApi('/api/send-contact', { name, email, subject, message });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Could not send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" style={{ justifyContent: 'center' }}>
      <AnimatedBackground />

      <div className="login-panel" style={{ margin: '0 auto', width: 'min(560px, 100%)' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 28 }}
        >
          <SupportBackLink />
        </motion.div>

        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="login-card-title">Get in touch</h1>
          <p className="login-card-sub">
            Questions, feedback, or an issue with your account? Send us a message and we&apos;ll get back to you at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--lp-blue)' }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label htmlFor="email">Your email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label htmlFor="subject">Subject</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Billing question, bug report, feature idea..."
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's going on..."
                className="login-input"
                rows={6}
                style={{ resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            {error && <div className="login-alert login-alert-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send message'}
            </button>

            {sent && (
              <div className="login-alert login-alert-success">
                Message received — we&apos;ll be in touch soon.
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </main>
  );
}
