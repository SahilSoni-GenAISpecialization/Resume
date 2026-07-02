'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from './ScrollReveal';

const ROLES = {
  engineer: {
    label: 'Software Engineer',
    before: [
      'Worked on various software projects using different technologies.',
      'Collaborated with team members on development tasks.',
      'Helped improve application performance.',
    ],
    after: [
      'Architected and deployed 12+ microservices on AWS, reducing API latency by 40% and supporting 2M+ daily active users.',
      'Led a cross-functional team of 6 engineers to deliver a React/TypeScript platform migration 3 weeks ahead of schedule.',
      'Implemented CI/CD pipelines with Docker and GitHub Actions, cutting deployment time from 2 hours to 15 minutes.',
    ],
  },
  marketing: {
    label: 'Marketing Manager',
    before: [
      'Managed marketing campaigns to increase brand awareness.',
      'Worked with the team on social media and content.',
      'Tracked campaign performance and reported results.',
    ],
    after: [
      'Boosted brand awareness by 40% through targeted multi-channel campaigns, resulting in a 25% increase in qualified leads.',
      'Led a 5-person content team to produce SEO-optimized assets that drove 180% organic traffic growth in 6 months.',
      'Managed a $120K quarterly ad budget across Google and LinkedIn, achieving 3.2× ROAS on top-performing campaigns.',
    ],
  },
  sales: {
    label: 'Sales Manager',
    before: [
      'Managed client relationships and met sales targets.',
      'Presented products to potential customers.',
      'Maintained CRM records and followed up on leads.',
    ],
    after: [
      'Exceeded annual quota by 135%, closing $2.4M in new business across 40+ enterprise accounts in the SaaS vertical.',
      'Built and coached a 8-rep inside sales team that improved win rate from 18% to 31% within two quarters.',
      'Designed a consultative sales playbook adopted company-wide, shortening average deal cycle by 22 days.',
    ],
  },
};

export default function BeforeAfter() {
  const [active, setActive] = useState('engineer');
  const role = ROLES[active];

  return (
    <section className="lp-compare-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">Before &amp; after</p>
          <h2 className="lp-section-title">Generic vs. tailored resume</h2>
          <p className="lp-section-sub">
            See the difference between a resume that gets ignored and one that gets interviews.
          </p>
        </ScrollReveal>

        <div className="lp-compare-tabs">
          {Object.entries(ROLES).map(([key, val]) => (
            <button
              key={key}
              type="button"
              className={`lp-compare-tab ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
            >
              {val.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="lp-compare-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lp-compare-panel before">
              <div className="lp-compare-label before">Before — generic</div>
              {role.before.map((line) => (
                <div key={line} className="lp-compare-text">
                  {line}
                </div>
              ))}
            </div>
            <div className="lp-compare-panel after">
              <div className="lp-compare-label after">After — tailored by Applymatic</div>
              {role.after.map((line) => (
                <div key={line} className="lp-compare-text">
                  {line}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="lp-compare-stats">
          {[
            ['3×', 'More interviews'],
            ['30s', 'Results'],
            ['85%+', 'Match score'],
          ].map(([num, label]) => (
            <div key={label} className="lp-compare-stat">
              <div className="lp-compare-stat-num">{num}</div>
              <div className="lp-compare-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
