'use client';

import ScrollReveal from './ScrollReveal';

const FREE_FEATURES = [
  '5 AI generations/month (resume, cover letter, or thank-you email)',
  'AI cover letter per application',
  'Match score + improvement tips',
  'PDF downloads',
  'Application dashboard',
  'Live job search',
];

const PRO_FEATURES = [
  'Unlimited tailored resumes',
  'Unlimited cover letters',
  'Unlimited thank-you emails',
  'Everything in Free',
  'Priority AI processing',
  'Cancel anytime — no contracts',
];

function CheckIcon({ color = '#059669' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="lp-pricing-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">Pricing</p>
          <h2 className="lp-section-title">Simple, transparent pricing</h2>
          <p className="lp-section-sub">No hidden fees. No contracts. Cancel anytime.</p>
        </ScrollReveal>

        <div className="lp-pricing-grid">
          <ScrollReveal delay={0.1}>
            <div className="lp-pricing-card">
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--lp-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Free
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 42, fontWeight: 800 }}>$0</span>
                <span style={{ color: 'var(--lp-faint)', fontSize: 14 }}>/month</span>
              </div>
              <p style={{ color: 'var(--lp-muted)', fontSize: 13, marginBottom: 28 }}>Perfect for getting started</p>
              <a
                href="/login"
                className="lp-btn-ghost"
                style={{ display: 'block', textAlign: 'center', marginBottom: 28, textDecoration: 'none' }}
              >
                Get started free
              </a>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FREE_FEATURES.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <CheckIcon />
                    <span style={{ fontSize: 13, color: 'var(--lp-muted)', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="lp-pricing-card lp-pricing-pro">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--lp-blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Pro
                </p>
                <span
                  style={{
                    background: 'var(--lp-blue-soft)',
                    color: 'var(--lp-blue)',
                    border: '1px solid rgba(37,99,235,0.15)',
                    borderRadius: 99,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Most popular
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 42, fontWeight: 800 }}>CAD $9.99</span>
                <span style={{ color: 'var(--lp-faint)', fontSize: 14 }}>/month</span>
              </div>
              <p style={{ color: 'var(--lp-muted)', fontSize: 13, marginBottom: 8 }}>
                Cancel anytime. No refunds — use through the month you paid for.
              </p>
              <p style={{ color: 'var(--lp-faint)', fontSize: 12, marginBottom: 28 }}>
                Less than $0.35/day for unlimited AI tailoring.
              </p>
              <a href="/login" className="lp-btn-primary" style={{ display: 'block', textAlign: 'center', marginBottom: 28, textDecoration: 'none' }}>
                Upgrade to Pro →
              </a>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PRO_FEATURES.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <CheckIcon color="#2563eb" />
                    <span style={{ fontSize: 13, color: 'var(--lp-muted)', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
