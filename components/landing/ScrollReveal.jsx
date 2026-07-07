'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/** Fade/slide on scroll — content stays visible (no opacity:0) so anchor nav never shows blank sections. */
export default function ScrollReveal({ children, delay = 0, y = 16, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={{ opacity: 1, y: inView ? 0 : y }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
