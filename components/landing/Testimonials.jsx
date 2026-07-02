'use client';

import ScrollReveal from './ScrollReveal';

const TESTIMONIALS = [
  {
    quote:
      'Applymatic has been a game-changer in my job search. The AI-powered resume tailoring helped me land interviews at top tech companies by matching my resume to each job description.',
    name: 'Sara J.',
    role: 'Software Engineer',
    initial: 'S',
  },
  {
    quote:
      'I was skeptical at first, but the results speak for themselves. My interview rate has doubled since I started using Applymatic to tailor my resume to each job posting.',
    name: 'Michael C.',
    role: 'Marketing Specialist',
    initial: 'M',
  },
  {
    quote:
      "The AI's ability to tailor my resume for specific job descriptions is incredible. It highlights my most relevant skills for each application — like having a personal career coach.",
    name: 'Ema E.',
    role: 'Data Analyst',
    initial: 'E',
  },
];

export default function Testimonials() {
  return (
    <section className="lp-testimonials-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">Testimonials</p>
          <h2 className="lp-section-title">Loved by job seekers everywhere</h2>
          <p className="lp-section-sub">
            Professionals use Applymatic to tailor resumes and land their dream jobs.
          </p>
        </ScrollReveal>

        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 0.08}>
              <div className="lp-testimonial-card">
                <p className="lp-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar">{t.initial}</div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
