'use client';

import ScrollReveal from './ScrollReveal';

const TEMPLATES = [
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most Popular',
    layout: 'professional',
    desc: 'Balanced single-column layout trusted by recruiters in finance, consulting, and operations.',
  },
  {
    id: 'executive',
    name: 'Executive',
    badge: 'Leadership',
    layout: 'executive',
    desc: 'Sidebar profile with impact-focused summary — built for directors, VPs, and C-suite roles.',
  },
  {
    id: 'modern',
    name: 'Modern',
    badge: null,
    layout: 'modern',
    desc: 'Two-column structure with bold headline hierarchy for product, tech, and startup roles.',
  },
  {
    id: 'technical',
    name: 'Technical',
    badge: 'Engineering',
    layout: 'technical',
    desc: 'Skills-first grid with compact project bullets — optimized for software and IT positions.',
  },
  {
    id: 'creative',
    name: 'Creative',
    badge: null,
    layout: 'creative',
    desc: 'Portfolio-style accent layout for design, marketing, and media professionals.',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    badge: 'ATS Safe',
    layout: 'minimal',
    desc: 'Ultra-clean typography with maximum whitespace — passes parsers without distraction.',
  },
];

function ProfessionalMock() {
  return (
    <div className="lp-mock lp-mock-professional">
      <div className="lp-mock-head lp-mock-head-center">
        <div className="lp-mock-name">Sarah Chen</div>
        <div className="lp-mock-title">Senior Business Analyst</div>
        <div className="lp-mock-contact">sarah.chen@email.com · Toronto, ON · (416) 555-0192</div>
        <div className="lp-mock-rule" />
      </div>
      <div className="lp-mock-section">
        <div className="lp-mock-label">Professional Summary</div>
        <div className="lp-mock-text">
          Data-driven analyst with 8+ years translating complex requirements into measurable business outcomes.
        </div>
      </div>
      <div className="lp-mock-section">
        <div className="lp-mock-label">Experience</div>
        <div className="lp-mock-row">
          <strong>Business Analyst, RBC</strong>
          <span>2021–Present</span>
        </div>
        <div className="lp-mock-bullet">Led cross-functional rollout saving $1.2M in annual operating costs</div>
        <div className="lp-mock-row">
          <strong>Analyst, Deloitte</strong>
          <span>2017–2021</span>
        </div>
        <div className="lp-mock-bullet">Delivered 14 client engagements across banking and insurance verticals</div>
      </div>
    </div>
  );
}

function ExecutiveMock() {
  return (
    <div className="lp-mock lp-mock-executive">
      <div className="lp-mock-exec-sidebar">
        <div className="lp-mock-name">Michael Torres</div>
        <div className="lp-mock-title">VP, Operations</div>
        <div className="lp-mock-sidebar-block">
          <div className="lp-mock-label">Contact</div>
          <div className="lp-mock-text-sm">m.torres@email.com</div>
          <div className="lp-mock-text-sm">Vancouver, BC</div>
        </div>
        <div className="lp-mock-sidebar-block">
          <div className="lp-mock-label">Core Strengths</div>
          <div className="lp-mock-tag-stack">
            <span>P&L Ownership</span>
            <span>Scale-ups</span>
            <span>M&A</span>
          </div>
        </div>
      </div>
      <div className="lp-mock-exec-main">
        <div className="lp-mock-label">Executive Summary</div>
        <div className="lp-mock-text">Operations leader who scaled teams from 40 to 220 while improving margin 18%.</div>
        <div className="lp-mock-label">Leadership Experience</div>
        <div className="lp-mock-row dark">
          <strong>VP Operations, Hootsuite</strong>
          <span>2019–Now</span>
        </div>
        <div className="lp-mock-bullet dark">Built global fulfillment model across 3 regions</div>
        <div className="lp-mock-row dark">
          <strong>Director, Amazon</strong>
          <span>2014–2019</span>
        </div>
      </div>
    </div>
  );
}

function ModernMock() {
  return (
    <div className="lp-mock lp-mock-modern">
      <div className="lp-mock-modern-header">
        <div>
          <div className="lp-mock-name lg">Jordan Lee</div>
          <div className="lp-mock-title accent">Product Manager</div>
        </div>
        <div className="lp-mock-modern-links">linkedin.com/in/jlee · jlee@email.com</div>
      </div>
      <div className="lp-mock-modern-grid">
        <div>
          <div className="lp-mock-label bar">Experience</div>
          <div className="lp-mock-row">
            <strong>PM, Wealthsimple</strong>
            <span>2022–Now</span>
          </div>
          <div className="lp-mock-bullet">Shipped onboarding flow lifting activation 23%</div>
          <div className="lp-mock-row">
            <strong>APM, Shopify</strong>
            <span>2020–2022</span>
          </div>
          <div className="lp-mock-bullet">Owned merchant analytics roadmap for 500K sellers</div>
        </div>
        <div className="lp-mock-modern-aside">
          <div className="lp-mock-label bar">Skills</div>
          <div className="lp-mock-skill-list">
            <span>Roadmapping</span>
            <span>SQL</span>
            <span>A/B Testing</span>
            <span>Figma</span>
          </div>
          <div className="lp-mock-label bar">Education</div>
          <div className="lp-mock-text-sm">MBA, Rotman · B.Com, UBC</div>
        </div>
      </div>
    </div>
  );
}

function TechnicalMock() {
  return (
    <div className="lp-mock lp-mock-technical">
      <div className="lp-mock-tech-header">
        <div className="lp-mock-name mono">Alex Kim</div>
        <div className="lp-mock-title mono">Staff Software Engineer</div>
      </div>
      <div className="lp-mock-label tech">Technical Skills</div>
      <div className="lp-mock-tech-grid">
        {['Python', 'Go', 'K8s', 'PostgreSQL', 'AWS', 'Terraform'].map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="lp-mock-label tech">Experience</div>
      <div className="lp-mock-tech-entry">
        <div className="lp-mock-row">
          <strong>Staff Engineer · Stripe</strong>
          <span className="mono">2021–Now</span>
        </div>
        <div className="lp-mock-code-line">→ Reduced p99 latency 40% on payments API</div>
        <div className="lp-mock-code-line">→ Led migration to event-driven architecture</div>
      </div>
      <div className="lp-mock-tech-entry">
        <div className="lp-mock-row">
          <strong>Senior Engineer · Google</strong>
          <span className="mono">2018–2021</span>
        </div>
        <div className="lp-mock-code-line">→ Built internal CI pipeline used by 200+ teams</div>
      </div>
    </div>
  );
}

function CreativeMock() {
  return (
    <div className="lp-mock lp-mock-creative">
      <div className="lp-mock-creative-accent" />
      <div className="lp-mock-creative-body">
        <div className="lp-mock-name creative">Emma Walsh</div>
        <div className="lp-mock-title creative">Brand & Visual Designer</div>
        <div className="lp-mock-creative-meta">Portfolio:emmawalsh.design · Toronto</div>
        <div className="lp-mock-label creative">Selected Work</div>
        <div className="lp-mock-creative-projects">
          <div className="lp-mock-project-card">
            <div className="lp-mock-project-fill" />
            <div>
              <strong>National rebrand</strong>
              <div className="lp-mock-text-sm">Identity system · 12 markets</div>
            </div>
          </div>
          <div className="lp-mock-project-card">
            <div className="lp-mock-project-fill alt" />
            <div>
              <strong>Product launch campaign</strong>
              <div className="lp-mock-text-sm">Digital + OOH · 2.4M reach</div>
            </div>
          </div>
        </div>
        <div className="lp-mock-label creative">Tools</div>
        <div className="lp-mock-creative-tools">Figma · After Effects · Illustrator · Webflow</div>
      </div>
    </div>
  );
}

function MinimalMock() {
  return (
    <div className="lp-mock lp-mock-minimal">
      <div className="lp-mock-minimal-name">David Park</div>
      <div className="lp-mock-minimal-line">Project Manager — david@email.com — Calgary, AB</div>
      <div className="lp-mock-minimal-section">
        <span className="lp-mock-minimal-label">Experience</span>
        <div className="lp-mock-minimal-entry">
          <span>Senior PM, Suncor Energy</span>
          <span>2020–Present</span>
        </div>
        <div className="lp-mock-minimal-dash">Managed $48M capital program on time and under budget</div>
        <div className="lp-mock-minimal-entry">
          <span>PM, PCL Construction</span>
          <span>2016–2020</span>
        </div>
      </div>
      <div className="lp-mock-minimal-section">
        <span className="lp-mock-minimal-label">Education</span>
        <div className="lp-mock-minimal-dash">PMP · B.Sc. Civil Engineering, University of Alberta</div>
      </div>
      <div className="lp-mock-minimal-section">
        <span className="lp-mock-minimal-label">Skills</span>
        <div className="lp-mock-minimal-dash">Primavera P6, stakeholder management, risk registers, MS Project</div>
      </div>
    </div>
  );
}

const MOCK_BY_LAYOUT = {
  professional: ProfessionalMock,
  executive: ExecutiveMock,
  modern: ModernMock,
  technical: TechnicalMock,
  creative: CreativeMock,
  minimal: MinimalMock,
};

export default function Templates() {
  return (
    <section id="templates" className="lp-templates-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">Templates</p>
          <h2 className="lp-section-title">Professional layouts recruiters recognize</h2>
          <p className="lp-section-sub">
            Six distinct, ATS-friendly structures — each tailored to a different career stage and industry,
            not just a color swap.
          </p>
        </ScrollReveal>

        <div className="lp-templates-grid">
          {TEMPLATES.map((t, i) => {
            const Mock = MOCK_BY_LAYOUT[t.layout];
            return (
              <ScrollReveal key={t.id} delay={i * 0.06}>
                <div className="lp-template-card">
                  <div className={`lp-template-preview ${t.id}`}>
                    {t.badge && <span className="lp-template-badge">{t.badge}</span>}
                    <Mock />
                  </div>
                  <div className="lp-template-body">
                    <div className="lp-template-name">{t.name}</div>
                    <p className="lp-template-desc">{t.desc}</p>
                    <a href="/login" className="lp-template-btn">
                      Use this template
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
