'use client';

import { motion } from 'framer-motion';

const SKILLS = ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'CI/CD'];

export default function Hero({ scrollTo }) {
  return (
    <section className="lp-hero landing-section">
      <div className="lp-hero-inner">
        <div>
          <motion.div
            className="lp-hero-badge"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            ⭐ The #1 AI Resume Tailoring Platform
          </motion.div>

          <motion.h1
            className="lp-hero-title"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            Tailor your resume to
            <br />
            <span className="lp-gradient-text">every job description</span>
          </motion.h1>

          <motion.p
            className="lp-hero-sub"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            Our AI customizes your resume to perfectly match each job posting — creating ATS-friendly
            applications that highlight your most relevant skills and experience in under 30 seconds.
          </motion.p>

          <motion.div
            className="lp-hero-cta"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <a href="/login" className="lp-btn-primary">
              Start tailoring your resume →
            </a>
            <button type="button" className="lp-btn-ghost" onClick={() => scrollTo('how-it-works')}>
              See how it works
            </button>
          </motion.div>

          <motion.div
            className="lp-hero-stats"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {[
              ['3×', 'More interviews'],
              ['30s', 'Per tailored resume'],
              ['95%', 'ATS pass rate'],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="lp-stat-num">{num}</div>
                <div className="lp-stat-label">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="lp-hero-preview"
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <motion.div
            className="lp-hero-preview-card"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="lp-preview-toolbar">
              <span className="lp-preview-dot red" />
              <span className="lp-preview-dot yellow" />
              <span className="lp-preview-dot green" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--lp-text)' }}>
                  Jordan Lee
                </div>
                <div style={{ fontSize: 12, color: 'var(--lp-blue-dark)', fontWeight: 600, marginTop: 2 }}>
                  Senior Software Engineer
                </div>
                <div style={{ fontSize: 11, color: 'var(--lp-faint)', marginTop: 2 }}>
                  jordan.lee@email.com · Toronto, ON
                </div>
              </div>
              <span className="lp-match-pill">● 92% match</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--lp-blue)',
                  borderBottom: '1px solid var(--lp-border)',
                  paddingBottom: 5,
                  marginBottom: 8,
                }}
              >
                Experience
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lp-text)' }}>Senior Engineer, Stripe</span>
                <span style={{ fontSize: 11, color: 'var(--lp-faint)' }}>2022–Now</span>
              </div>
              {[
                'Cut API latency 40% across 12 microservices',
                'Scaled the payments platform to 2M+ daily users',
              ].map((line) => (
                <div key={line} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: 'var(--lp-blue)', fontSize: 11 }}>▪</span>
                  <span style={{ fontSize: 11.5, color: 'var(--lp-muted)', lineHeight: 1.4 }}>{line}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--lp-blue)',
                  borderBottom: '1px solid var(--lp-border)',
                  paddingBottom: 5,
                  marginBottom: 8,
                }}
              >
                Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SKILLS.map((s, i) => (
                  <motion.span
                    key={s}
                    className="lp-skill-pill"
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.06 }}
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                background: 'var(--lp-blue-soft)',
                border: '1px solid rgba(37,99,235,0.12)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--lp-blue-dark)',
                fontWeight: 600,
              }}
            >
              ✦ AI-tailored for: Senior Software Engineer at Stripe
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
