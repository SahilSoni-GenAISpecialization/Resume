'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import '@/app/login.css';

const CONTACT_EMAIL = 'info@jauraautomation.com';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  function buildMailtoHref() {
    const finalSubject = subject.trim() || 'Applymatic support request';
    const bodyLines = [
      message.trim() || '(no message provided)',
      '',
      '---',
      `From: ${name.trim() || 'Not provided'}`,
      `Reply-to email: ${email.trim() || 'Not provided'}`,
    ];

    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(
      bodyLines.join('\n')
    )}`;
  }

  function handleSubmit(e) {
    e.preventDefault();
    window.location.href = buildMailtoHref();
    setSent(true);
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
          <Link href="/" className="login-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="login-card-title">Get in touch</h1>
          <p className="login-card-sub">
            Questions, feedback, or an issue with your account? Send us a message and we'll get back to you at{' '}
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

            <button type="submit" className="login-submit">
              Send message
            </button>

            {sent && (
              <div className="login-alert login-alert-success">
                Your email app should have opened with this message ready to send to {CONTACT_EMAIL}. If nothing
                opened, email us directly at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit', fontWeight: 700 }}>
                  {CONTACT_EMAIL}
                </a>
                .
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </main>
  );
}
