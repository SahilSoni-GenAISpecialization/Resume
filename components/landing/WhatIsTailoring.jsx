'use client';

import ScrollReveal from './ScrollReveal';

export default function WhatIsTailoring() {
  return (
    <section className="lp-edu-section landing-section">
      <div className="lp-container">
        <div className="lp-edu-grid">
          <ScrollReveal>
            <div>
              <p className="lp-section-label">Resume tailoring</p>
              <h2 className="lp-section-title" style={{ textAlign: 'left' }}>
                What is resume tailoring?
              </h2>
              <p style={{ color: 'var(--lp-muted)', fontSize: 16, lineHeight: 1.75, marginTop: 16 }}>
                Tailoring your resume means tweaking it so it fits the job you are applying for. You are
                still describing the same experience — but putting more focus on the parts that matter for
                that specific role.
              </p>
              <p style={{ color: 'var(--lp-muted)', fontSize: 16, lineHeight: 1.75, marginTop: 14 }}>
                One role might care more about teamwork and delivery; another might care more about speed,
                organization, or technical depth. Applymatic does this for you by analyzing your resume and
                the job description, then rewriting your CV so it lines up with what the employer is
                actually looking for.
              </p>
              <a href="/login" className="lp-btn-primary" style={{ marginTop: 28, textDecoration: 'none' }}>
                Try it free →
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="lp-edu-card">
              <p>
                <strong style={{ color: 'var(--lp-text)' }}>Without tailoring:</strong> a generic resume
                gets filtered out by ATS systems that scan for role-specific keywords.
              </p>
              <p>
                <strong style={{ color: 'var(--lp-text)' }}>With Applymatic:</strong> every application
                gets a custom rewrite that mirrors the job description language while keeping your real
                experience authentic.
              </p>
              <p>
                <strong style={{ color: 'var(--lp-text)' }}>The result:</strong> higher match scores, more
                interview callbacks, and less time spent copy-pasting into ChatGPT.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
