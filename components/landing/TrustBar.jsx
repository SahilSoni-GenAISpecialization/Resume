'use client';

import ScrollReveal from './ScrollReveal';

const COMPANIES = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Stripe', 'Shopify', 'Deloitte', 'Accenture'];

export default function TrustBar() {
  return (
    <section className="lp-trust landing-section">
      <ScrollReveal>
        <div className="lp-trust-inner">
          <p className="lp-trust-label">Trusted by candidates at</p>
          <div className="lp-trust-logos">
            {COMPANIES.map((name) => (
              <span key={name} className="lp-trust-logo">
                {name}
              </span>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
