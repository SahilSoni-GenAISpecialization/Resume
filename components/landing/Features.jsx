'use client';

import ScrollReveal from './ScrollReveal';

const METRICS = [
  {
    stat: '95% ATS pass rate',
    time: '30 seconds',
    title: 'Optimize your CV from top to bottom',
    desc: 'Applymatic does not just add keywords — it restructures and refines every section to create a compelling narrative that passes through ATS systems and resonates with hiring managers.',
  },
  {
    stat: '85% match score',
    time: 'Real-time',
    title: 'Match your resume to the job description',
    desc: 'Our AI analyzes job descriptions and adjusts your resume to make you the ideal candidate, accounting for industry trends and role-specific requirements.',
  },
  {
    stat: '3× response rate',
    time: '60 seconds',
    title: 'Generate a personalized cover letter',
    desc: 'Never write a cover letter from scratch again. Applymatic generates a custom cover letter aligned with your tailored resume and the specific role.',
  },
  {
    stat: 'Unlimited with Pro',
    time: '5 free/month',
    title: 'Thank-you emails & application tracking',
    desc: 'Generate personalized post-interview thank-you emails and track every application in your dashboard — from tailored to applied to offer.',
  },
];

export default function Features() {
  return (
    <section id="features" className="lp-features-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">Powerful capabilities</p>
          <h2 className="lp-section-title">Features that go beyond keyword optimization</h2>
          <p className="lp-section-sub">
            Discover how our AI-powered platform transforms your job search experience.
          </p>
        </ScrollReveal>

        <div className="lp-features-metrics">
          {METRICS.map((m, i) => (
            <ScrollReveal key={m.title} delay={i * 0.06}>
              <div className="lp-metric-card">
                <div className="lp-metric-top">
                  <span className="lp-metric-stat">{m.stat}</span>
                  <span className="lp-metric-time">{m.time}</span>
                </div>
                <h3 className="lp-metric-title">{m.title}</h3>
                <p className="lp-metric-desc">{m.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
