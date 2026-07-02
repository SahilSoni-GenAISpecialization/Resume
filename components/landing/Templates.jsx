'use client';

import ScrollReveal from './ScrollReveal';

const TEMPLATES = [
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most Popular',
    desc: 'A clean, balanced design suitable for most industries and career levels.',
    style: { bg: '#ffffff', text: '#0f172a', sub: '#64748b', accent: '#2563eb', line: '#e2e8f0' },
    header: 'plain',
  },
  {
    id: 'executive',
    name: 'Executive',
    badge: 'High Impact',
    desc: 'Elegant and sophisticated — perfect for senior roles and leadership positions.',
    style: { bg: '#0f172a', text: '#f8fafc', sub: '#94a3b8', accent: '#e8c547', line: '#334155' },
    header: 'bar',
  },
  {
    id: 'modern',
    name: 'Modern',
    badge: null,
    desc: 'Contemporary layout with bold typography and a fresh, tech-forward feel.',
    style: { bg: '#ffffff', text: '#0f172a', sub: '#64748b', accent: '#2563eb', line: '#dbeafe' },
    header: 'bar',
  },
  {
    id: 'technical',
    name: 'Technical',
    badge: null,
    desc: 'Skills-forward format optimized for engineering and IT roles.',
    style: { bg: '#ffffff', text: '#0f172a', sub: '#64748b', accent: '#059669', line: '#dcfce7' },
    header: 'plain',
  },
  {
    id: 'creative',
    name: 'Creative',
    badge: null,
    desc: 'Distinctive design for design, marketing, and creative professionals.',
    style: { bg: '#ffffff', text: '#0f172a', sub: '#64748b', accent: '#7c3aed', line: '#ede9fe' },
    header: 'bar',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    badge: 'Classic',
    desc: 'Classic layout that prioritizes readability and clear information hierarchy.',
    style: { bg: '#ffffff', text: '#0f172a', sub: '#94a3b8', accent: '#0f172a', line: '#e2e8f0' },
    header: 'plain',
  },
];

const SKILLS = ['React', 'TypeScript', 'AWS', 'Node.js', 'Docker'];

function TemplateMock({ style: s, header }) {
  const sectionTitle = (label) => (
    <div
      style={{
        fontSize: 7,
        fontWeight: 800,
        letterSpacing: '0.08em',
        color: s.accent,
        textTransform: 'uppercase',
        margin: '9px 0 4px',
        borderBottom: `1px solid ${s.line}`,
        paddingBottom: 3,
      }}
    >
      {label}
    </div>
  );

  const bullet = (text) => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 2.5 }}>
      <span style={{ color: s.accent, fontSize: 7, lineHeight: '10px' }}>▪</span>
      <span style={{ fontSize: 7, lineHeight: '10px', color: s.sub }}>{text}</span>
    </div>
  );

  return (
    <div className="lp-template-mock" style={{ background: s.bg, color: s.text }}>
      {/* Header */}
      {header === 'bar' ? (
        <div
          style={{
            background: s.accent,
            margin: '-16px -16px 10px',
            padding: '10px 14px',
            borderRadius: '6px 6px 0 0',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Jordan Lee
          </div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
            Senior Software Engineer
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em' }}>Jordan Lee</div>
          <div style={{ fontSize: 7.5, color: s.accent, fontWeight: 700, marginTop: 1 }}>
            Senior Software Engineer
          </div>
          <div style={{ fontSize: 6.5, color: s.sub, marginTop: 2 }}>
            jordan.lee@email.com · Toronto, ON · linkedin.com/in/jordanlee
          </div>
        </div>
      )}

      {sectionTitle('Experience')}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 7.5, fontWeight: 700 }}>Senior Engineer, Stripe</span>
        <span style={{ fontSize: 6.5, color: s.sub }}>2022–Now</span>
      </div>
      {bullet('Cut API latency 40% across 12 microservices')}
      {bullet('Scaled platform to 2M+ daily active users')}

      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0 2px' }}>
        <span style={{ fontSize: 7.5, fontWeight: 700 }}>Engineer, Shopify</span>
        <span style={{ fontSize: 6.5, color: s.sub }}>2019–2022</span>
      </div>
      {bullet('Built a React design system used by 60+ devs')}

      {sectionTitle('Skills')}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {SKILLS.map((skill) => (
          <span
            key={skill}
            style={{
              fontSize: 6.5,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 99,
              background: header === 'bar' && s.bg === '#0f172a' ? 'rgba(232,197,71,0.15)' : `${s.accent}15`,
              color: s.accent,
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {sectionTitle('Education')}
      <div style={{ fontSize: 7, color: s.sub, lineHeight: '10px' }}>
        B.S. Computer Science — University of Toronto
      </div>
    </div>
  );
}

export default function Templates() {
  return (
    <section id="templates" className="lp-templates-section landing-section">
      <div className="lp-container">
        <ScrollReveal className="lp-section-header">
          <p className="lp-section-label">Templates</p>
          <h2 className="lp-section-title">Modern templates for modern careers</h2>
          <p className="lp-section-sub">
            Choose from ATS-optimized templates designed to be read easily by both humans and machines.
          </p>
        </ScrollReveal>

        <div className="lp-templates-grid">
          {TEMPLATES.map((t, i) => (
            <ScrollReveal key={t.id} delay={i * 0.06}>
              <div className="lp-template-card">
                <div className={`lp-template-preview ${t.id}`}>
                  {t.badge && <span className="lp-template-badge">{t.badge}</span>}
                  <TemplateMock style={t.style} header={t.header} />
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
          ))}
        </div>
      </div>
    </section>
  );
}
