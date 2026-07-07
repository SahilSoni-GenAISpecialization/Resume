'use client';

import ScrollReveal from './ScrollReveal';
import BrandLogo from '@/components/BrandLogo';
import { CAREERS_EMAIL, CONTACT_EMAIL } from '@/lib/site-config';

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
          <div className="lp-footer-brand-block">
            <div className="lp-logo">
              <BrandLogo variant="footer" showName={false} />
            </div>
            <p style={{ color: 'var(--lp-faint)', fontSize: 13, marginTop: 10, maxWidth: 280, lineHeight: 1.6 }}>
              AI-powered resumes and job applications for professionals who want to stand out.
            </p>
          </div>

          <div className="lp-footer-columns">
            <div className="lp-footer-col">
              <h4>Support</h4>
              <a href="/contact">Contact us</a>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
            <div className="lp-footer-col">
              <h4>Company</h4>
              <a href="/careers">Careers</a>
              <a href={`mailto:${CAREERS_EMAIL}`}>{CAREERS_EMAIL}</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <p style={{ color: 'var(--lp-faint)', fontSize: 13 }}>© 2026 Applymatic. All rights reserved.</p>
            <div className="lp-footer-legal-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
