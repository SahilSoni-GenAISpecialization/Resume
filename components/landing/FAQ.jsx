'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from './ScrollReveal';

const FAQS = [
  {
    q: 'Is it really free?',
    a: 'Yes. You get 5 AI-tailored resumes every month at no cost — no credit card required. Each includes a custom cover letter, match score, and PDF download.',
  },
  {
    q: 'What does "tailored" actually mean?',
    a: "Our AI rewrites your resume to mirror the language, keywords, and priorities of each specific job description. It's not a template swap — it's a full rewrite optimized for that role's ATS system.",
  },
  {
    q: 'Will ATS systems accept these resumes?',
    a: 'Yes. The resumes are generated in clean, ATS-friendly format with relevant keywords pulled directly from the job description. No tables, no columns, no graphics that break parsers.',
  },
  {
    q: 'How is this different from ChatGPT?',
    a: 'Applymatic is purpose-built for job applications. It integrates job search, resume parsing, tailoring, cover letter generation, match scoring, and a dashboard — all in one workflow. ChatGPT requires you to copy-paste and prompt-engineer every step manually.',
  },
  {
    q: 'What happens when I hit the free limit?',
    a: "You'll see a clear message when you've used your 5 free generations for the month. Upgrade to Pro for CAD $9.99/month to get unlimited resumes, cover letters, and thank-you emails. Cancel anytime.",
  },
  {
    q: 'Is my resume data secure?',
    a: 'Your resume data is stored securely in your personal account. We never share your data with employers or third parties.',
  },
];

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section id="faq" className="lp-faq-section landing-section">
      <ScrollReveal>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p className="lp-section-label">FAQ</p>
          <h2 className="lp-section-title">Frequently asked questions</h2>
        </div>
      </ScrollReveal>

      <div className="lp-faq-list">
        {FAQS.map((faq, i) => (
          <ScrollReveal key={faq.q} delay={i * 0.05}>
            <div className="lp-faq-item">
              <button className="lp-faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <motion.span
                  style={{ color: 'var(--lp-faint)', fontSize: 22, flexShrink: 0 }}
                  animate={{ rotate: openFaq === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    className="lp-faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{ paddingBottom: 24 }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
