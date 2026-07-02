'use client';

import ScrollReveal from './ScrollReveal';

const STEPS = [
  {
    num: '1',
    title: 'Import CV',
    sub: 'Upload your existing resume or build your profile manually in our structured editor.',
  },
  {
    num: '2',
    title: 'Add job description',
    sub: 'Search live listings or paste the full job posting you are targeting.',
  },
  {
    num: '3',
    title: 'AI enhancement',
    sub: 'Watch AI tailor your resume and cover letter in seconds — keyword-matched and ATS-optimized.',
  },
  {
    num: '4',
    title: 'Get hired',
    sub: 'Download your tailored application, apply with confidence, and track everything in your dashboard.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="lp-steps-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">How it works</p>
          <h2 className="lp-section-title">Smart resume evolution in four simple steps</h2>
          <p className="lp-section-sub">Transform your resume in minutes, not hours.</p>
        </ScrollReveal>

        <div className="lp-steps-grid-4">
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.08}>
              <div className="lp-step-card-v2">
                <div className="lp-step-num-v2">{step.num}</div>
                <h3 className="lp-step-title-v2">{step.title}</h3>
                <p className="lp-step-sub-v2">{step.sub}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
