'use client';

import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div className="lp-grid-bg" />

      <motion.div
        className="lp-orb"
        style={{ width: 600, height: 600, top: '-10%', left: '-5%', background: 'rgba(91, 154, 255, 0.07)' }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="lp-orb"
        style={{ width: 500, height: 500, bottom: '10%', right: '-5%', background: 'rgba(180, 160, 255, 0.06)' }}
        animate={{ x: [0, -30, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="lp-orb"
        style={{ width: 400, height: 400, top: '45%', left: '40%', background: 'rgba(61, 214, 140, 0.04)' }}
        animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
