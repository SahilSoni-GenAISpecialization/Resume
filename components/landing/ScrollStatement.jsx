'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function ScrollStatement() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], [0.75, 1.12, 1.12, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.2, 1, 1, 0.2]);

  return (
    <section className="lp-statement landing-section" ref={ref}>
      <motion.p className="lp-statement-text" style={{ scale, opacity }}>
        Your resume,{' '}
        <span className="lp-gradient-text">re-engineered</span>
        <br />
        for every role
      </motion.p>
    </section>
  );
}
