'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import { CAREERS_EMAIL } from '@/lib/site-config';
import { buildMailtoHref } from '@/lib/mailto';
import '@/app/login.css';

const OPEN_ROLES = [
  {
    title: 'Senior Full-Stack Engineer',
    team: 'Engineering',
    location: 'Remote · Canada',
    type: 'Full-time',
    summary: 'Build and scale our Next.js platform, AI pipelines, and Supabase-backed product experience.',
  },
  {
    title: 'AI / ML Engineer',
    team: 'Engineering',
    location: 'Remote · North America',
    type: 'Full-time',
    summary: 'Improve resume tailoring, job matching, and document generation with production-grade LLM workflows.',
  },
  {
    title: 'Customer Success Lead',
    team: 'Operations',
    location: 'Remote',
    type: 'Full-time',
    summary: 'Help users get value from Applymatic, shape onboarding, and turn feedback into product improvements.',
  },
];

const PERKS = [
  { icon: '🌍', title: 'Remote-first', text: 'Work from anywhere in Canada with flexible hours.' },
  { icon: '🚀', title: 'Early-stage impact', text: 'Ship features that reach real job seekers every week.' },
  { icon: '🤖', title: 'AI-native product', text: 'Build with modern LLM tooling on a live production stack.' },
  { icon: '📈', title: 'Room to grow', text: 'Small team today — leadership opportunities as we scale.' },
];

export default function CareersPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(OPEN_ROLES[0].title);
  const [linkedin, setLinkedin] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    window.location.href = buildMailtoHref({
      to: CAREERS_EMAIL,
      subject: `Careers application — ${role}`,
      message,
      name,
      email,
      extraLines: [`Role: ${role}`, `LinkedIn / portfolio: ${linkedin.trim() || 'Not provided'}`],
    });
    setSent(true);
  }

  return (
    <main className="login-page careers-page">
      <AnimatedBackground />

      <div className="careers-shell">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link href="/" className="login-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        <motion.section
          className="careers-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="careers-eyebrow">Careers at Applymatic</p>
          <h1>Help people land the jobs they deserve</h1>
          <p>
            We&apos;re building AI tools that turn generic applications into tailored, interview-winning materials.
            Join a remote team obsessed with product quality and user outcomes.
          </p>
          <a href={`mailto:${CAREERS_EMAIL}`} className="careers-email-pill">
            {CAREERS_EMAIL}
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

        <section className="careers-roles">
          <div className="careers-section-head">
            <h2>Open roles</h2>
            <p>Don&apos;t see a perfect fit? Send a general application — we&apos;re always meeting strong builders.</p>
          </div>

          <div className="careers-role-list">
            {OPEN_ROLES.map((job) => (
              <article key={job.title} className="careers-role-card">
                <div className="careers-role-top">
                  <div>
                    <h3>{job.title}</h3>
                    <p className="careers-role-team">{job.team}</p>
                  </div>
                  <div className="careers-role-meta">
                    <span>{job.location}</span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <p className="careers-role-summary">{job.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <motion.section
          className="login-card careers-form-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="login-card-title">Apply now</h2>
          <p className="login-card-sub">
            Submit your details and we&apos;ll review your application at{' '}
            <a href={`mailto:${CAREERS_EMAIL}`} style={{ color: 'var(--lp-blue)' }}>
              {CAREERS_EMAIL}
            </a>
            .
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
              <label htmlFor="role">Role you&apos;re applying for</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="login-input"
              >
                {OPEN_ROLES.map((job) => (
                  <option key={job.title} value={job.title}>
                    {job.title}
                  </option>
                ))}
                <option value="General application">General application</option>
              </select>
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
              <label htmlFor="message">Why Applymatic?</label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your experience and what you'd bring to the team..."
                className="login-input"
                rows={6}
                style={{ resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            <button type="submit" className="login-submit">
              Submit application
            </button>

            {sent && (
              <div className="login-alert login-alert-success">
                Your email app should have opened with this application ready to send to {CAREERS_EMAIL}. If
                nothing opened, email us directly at{' '}
                <a href={`mailto:${CAREERS_EMAIL}`} style={{ color: 'inherit', fontWeight: 700 }}>
                  {CAREERS_EMAIL}
                </a>
                .
              </div>
            )}
          </form>
        </motion.section>
      </div>
    </main>
  );
}
