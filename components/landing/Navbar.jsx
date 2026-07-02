'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Navbar({ scrollTo }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`lp-nav ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <a href="/" className="lp-logo">
        <div className="lp-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <span className="lp-logo-text">Applymatic</span>
      </a>

      <div className="lp-nav-links">
        {[
          ['How it works', 'how-it-works'],
          ['Templates', 'templates'],
          ['Features', 'features'],
          ['Pricing', 'pricing'],
          ['FAQ', 'faq'],
        ].map(([label, id]) => (
          <button key={id} type="button" className="lp-nav-link" onClick={() => scrollTo(id)}>
            {label}
          </button>
        ))}
        <a href="/contact" className="lp-nav-link" style={{ textDecoration: 'none' }}>
          Contact
        </a>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <a href="/login" className="lp-btn-ghost lp-btn-sm" style={{ textDecoration: 'none' }}>
          Sign In
        </a>
        <a href="/login" className="lp-btn-primary lp-btn-sm" style={{ textDecoration: 'none' }}>
          Get Started Free
        </a>
      </div>
    </motion.nav>
  );
}
