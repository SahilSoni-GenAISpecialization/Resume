'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import SupportBackLink from '@/components/SupportBackLink';
import { CONTACT_EMAIL } from '@/lib/site-config';
import '@/app/login.css';

const TallyEmbed = dynamic(() => import('@/components/TallyEmbed'), { ssr: false });

export default function ContactPage() {
  return (
    <main className="login-page" style={{ justifyContent: 'center' }}>
      <AnimatedBackground />

      <div className="login-panel" style={{ margin: '0 auto', width: 'min(720px, 100%)' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 28 }}
        >
          <SupportBackLink />
        </motion.div>

        <motion.div
          className="login-card tally-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="login-card-title">Get in touch</h1>
          <p className="login-card-sub">
            We read every message and typically reply within one business day. You can also reach us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--lp-blue)' }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <TallyEmbed variant="standard" title="Get in touch" />
        </motion.div>
      </div>
    </main>
  );
}
