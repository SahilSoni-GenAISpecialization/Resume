'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import SupportBackLink from '@/components/SupportBackLink';
import { CAREERS_EMAIL } from '@/lib/site-config';
import '@/app/login.css';

const TallyEmbed = dynamic(() => import('@/components/TallyEmbed'), { ssr: false });

const PERKS = [
  { icon: '🌍', title: 'Remote-first', text: 'Work from anywhere in Canada with flexible hours.' },
  { icon: '🚀', title: 'Early-stage impact', text: 'Ship features that reach real job seekers every week.' },
  { icon: '🤖', title: 'AI-native product', text: 'Build with modern LLM tooling on a live production stack.' },
  { icon: '📈', title: 'Room to grow', text: 'Small team today — leadership opportunities as we scale.' },
];

export default function CareersPage() {
  return (
    <main className="login-page careers-page">
      <AnimatedBackground />

      <div className="careers-shell">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SupportBackLink />
        </motion.div>

        <motion.section
          className="careers-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="careers-eyebrow">Careers at Applymatic</p>
          <h1>We&apos;re always hiring and expanding</h1>
          <p>
            We&apos;re building AI tools that help people land the jobs they deserve. Send us your resume and a short
            note about what you&apos;d bring to the team — we&apos;ll be back once you&apos;re shortlisted.
          </p>
          <a href={`mailto:${CAREERS_EMAIL}`} className="careers-email-pill">
            {CAREERS_EMAIL}
          </a>
        </motion.section>

        <section className="careers-perks">
          {PERKS.map((perk) => (
            <div key={perk.title} className="careers-perk-card">
              <div className="careers-perk-icon">{perk.icon}</div>
              <h3>{perk.title}</h3>
              <p>{perk.text}</p>
            </div>
          ))}
        </section>

        <motion.section
          className="login-card careers-form-card tally-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="login-card-title">Send your resume</h2>
          <p className="login-card-sub">
            Share your details below and we&apos;ll review your application. We&apos;ll reach out when you&apos;re
            shortlisted.
          </p>

          <TallyEmbed variant="standard" title="Careers at Applymatic" />
        </motion.section>
      </div>
    </main>
  );
}
