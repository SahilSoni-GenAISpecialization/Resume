'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import SupportBackLink from '@/components/SupportBackLink';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { postJsonApi } from '@/lib/api-response';
import '@/app/login.css';

const PERKS = [
  { icon: '🌍', title: 'Remote-first', text: 'Work from anywhere in Canada with flexible hours.' },
  { icon: '🚀', title: 'Early-stage impact', text: 'Ship features that reach real job seekers every week.' },
  { icon: '🤖', title: 'AI-native product', text: 'Build with modern LLM tooling on a live production stack.' },
  { icon: '📈', title: 'Room to grow', text: 'Small team today — leadership opportunities as we scale.' },
];

export default function CareersPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
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
      await postJsonApi('/api/send-careers', { name, email, linkedin, message });
      setSent(true);
      setName('');
      setEmail('');
      setLinkedin('');
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Could not send your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page careers-page">
      <AnimatedBackground />

      <div className="careers-shell">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SupportBackLink />
        </motion.div>

        <motion.section
          className="careers-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="careers-eyebrow">Careers at Applymatic</p>
          <h1>We&apos;re always hiring and expanding</h1>
          <p>
            We&apos;re building AI tools that help people land the jobs they deserve. Send us your resume and a short
            note about what you&apos;d bring to the team — we&apos;ll be in touch once you&apos;re shortlisted.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="careers-email-pill">
            {CONTACT_EMAIL}
          </a>
        </motion.section>

        <section className="careers-perks">
          {PERKS.map((perk) => (
            <div key={perk.title} className="careers-perk-card">
              <div className="careers-perk-icon">{perk.icon}</div>
              <h3>{perk.title}</h3>
              <p>{perk.text}</p>
            </div>
          ))}
        </section>

        <motion.section
          className="login-card careers-form-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="login-card-title">Send your resume</h2>
          <p className="login-card-sub">
            Share your details below and we&apos;ll review your application. We&apos;ll reach out when you&apos;re
            shortlisted.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="login-input"
              />
            </div>

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
              />
            </div>

            <div className="login-field">
              <label htmlFor="linkedin">LinkedIn or portfolio (optional)</label>
              <input
                id="linkedin"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/you"
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label htmlFor="message">Tell us about yourself</label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your experience, what you'd like to work on, and why Applymatic..."
                className="login-input"
                rows={6}
                style={{ resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            {error && <div className="login-alert login-alert-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Sending...' : 'Submit application'}
            </button>

            {sent && (
              <div className="login-alert login-alert-success">
                Application sent — we&apos;ll be in touch once you&apos;re shortlisted.
              </div>
            )}
          </form>
        </motion.section>
      </div>
    </main>
  );
}
