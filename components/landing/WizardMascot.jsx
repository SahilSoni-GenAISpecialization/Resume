'use client';

import { motion } from 'framer-motion';

export default function WizardMascot({ step = 0 }) {
  const positions = ['16.5%', '50%', '83.5%'];

  return (
    <motion.div
      className="lp-wizard-container"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, pointerEvents: 'none', zIndex: 10 }}
    >
      <motion.div
        style={{ position: 'absolute', top: 0, x: '-50%' }}
        animate={{ left: positions[step] }}
        transition={{ type: 'spring', stiffness: 60, damping: 14 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.svg
            width="72"
            height="88"
            viewBox="0 0 72 88"
            fill="none"
            animate={{ rotate: step === 2 ? [0, 5, -5, 0] : 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Staff glow */}
            <motion.circle
              cx="58"
              cy="28"
              r="8"
              fill="url(#staffGlow)"
              animate={{ opacity: [0.6, 1, 0.6], r: [7, 9, 7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <defs>
              <radialGradient id="staffGlow">
                <stop offset="0%" stopColor="#5b9aff" />
                <stop offset="100%" stopColor="#5b9aff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="robeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a3a6e" />
                <stop offset="100%" stopColor="#1a2244" />
              </linearGradient>
              <linearGradient id="hatGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5b9aff" />
                <stop offset="100%" stopColor="#b4a0ff" />
              </linearGradient>
            </defs>

            {/* Staff */}
            <line x1="58" y1="28" x2="58" y2="72" stroke="#8b7355" strokeWidth="3" strokeLinecap="round" />
            <circle cx="58" cy="24" r="5" fill="#5b9aff" />

            {/* Robe body */}
            <path d="M28 52 Q36 44 44 52 L48 80 Q36 86 24 80 Z" fill="url(#robeGrad)" />
            <path d="M24 80 Q36 86 48 80" stroke="rgba(91,154,255,0.3)" strokeWidth="1" fill="none" />

            {/* Head */}
            <circle cx="36" cy="38" r="14" fill="#f0d5b8" />
            <circle cx="32" cy="36" r="2" fill="#2a2a3a" />
            <circle cx="40" cy="36" r="2" fill="#2a2a3a" />
            <path d="M32 42 Q36 45 40 42" stroke="#c4956a" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* Beard */}
            <path d="M28 44 Q36 58 44 44" fill="#b0b0c0" opacity="0.7" />

            {/* Hat */}
            <path d="M20 32 L36 8 L52 32 Z" fill="url(#hatGrad)" />
            <ellipse cx="36" cy="32" rx="18" ry="4" fill="url(#hatGrad)" />

            {/* Stars on hat */}
            <motion.text
              x="34"
              y="22"
              fontSize="8"
              fill="#e8c547"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✦
            </motion.text>

            {/* Walking legs */}
            <motion.g
              animate={{ rotate: [8, -8, 8] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ originX: '36px', originY: '72px' }}
            >
              <line x1="32" y1="72" x2="30" y2="84" stroke="#1a2244" strokeWidth="4" strokeLinecap="round" />
            </motion.g>
            <motion.g
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ originX: '40px', originY: '72px' }}
            >
              <line x1="40" y1="72" x2="42" y2="84" stroke="#1a2244" strokeWidth="4" strokeLinecap="round" />
            </motion.g>

            {/* Sparkle trail */}
            <motion.circle
              cx="12"
              cy="50"
              r="2"
              fill="#5b9aff"
              animate={{ opacity: [0, 1, 0], x: [0, -8, -16] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.circle
              cx="16"
              cy="58"
              r="1.5"
              fill="#b4a0ff"
              animate={{ opacity: [0, 1, 0], x: [0, -6, -12] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </motion.svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
