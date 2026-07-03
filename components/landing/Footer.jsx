'use client';

import ScrollReveal from './ScrollReveal';
import { CONTACT_EMAIL } from '@/lib/site-config';

export default function Footer() {
  return (
    <>
      <section className="lp-cta-section landing-section">
        <ScrollReveal>
          <div className="lp-cta-card">
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Ready to boost your career?
            </h2>
          <p style={{ fontSize: 16, marginBottom: 32 }}>
            Join professionals using Applymatic to tailor resumes and land their dream jobs.
          </p>
          <a href="/login" className="lp-btn-primary" style={{ fontSize: 16, padding: '15px 36px', textDecoration: 'none' }}>
            Start tailoring for free →
          </a>
          </div>
        </ScrollReveal>
      </section>

      <footer className="lp-footer landing-section">
        <div className="lp-footer-inner">
          <div className="lp-logo">
            <div className="lp-logo-icon" style={{ width: 30, height: 30, borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Applymatic</span>
          </div>
          <p style={{ color: 'var(--lp-faint)', fontSize: 13 }}>© 2026 Applymatic. All rights reserved.</p>
          <div className="lp-footer-links">
            <a href="/contact">Contact</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </div>
      </footer>
    </>
  );
}
