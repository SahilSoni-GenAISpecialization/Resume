'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';

const NAV_ITEMS = [
  ['How it works', 'how-it-works'],
  ['Templates', 'templates'],
  ['Features', 'features'],
  ['Pricing', 'pricing'],
  ['FAQ', 'faq'],
];

export default function Navbar({ scrollTo }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setMenuOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleNavClick(id) {
    setMenuOpen(false);
    scrollTo(id);
  }

  return (
    <>
      <motion.nav
        className={`lp-nav ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <a href="/" className="lp-logo">
          <BrandLogo variant="nav" showName={false} />
        </a>

        <div className="lp-nav-links">
          {NAV_ITEMS.map(([label, id]) => (
            <button key={id} type="button" className="lp-nav-link" onClick={() => scrollTo(id)}>
              {label}
            </button>
          ))}
          <a href="/contact" className="lp-nav-link" style={{ textDecoration: 'none' }}>
            Contact
          </a>
          <a href="/careers" className="lp-nav-link" style={{ textDecoration: 'none' }}>
            Careers
          </a>
        </div>

        <div className="lp-nav-actions">
          <div className="lp-nav-actions-desktop">
            <a href="/login" className="lp-btn-ghost lp-btn-sm" style={{ textDecoration: 'none' }}>
              Sign In
            </a>
            <a href="/login" className="lp-btn-primary lp-btn-sm" style={{ textDecoration: 'none' }}>
              Get Started Free
            </a>
          </div>

          <button
            type="button"
            className={`lp-nav-toggle${menuOpen ? ' open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              className="lp-mobile-backdrop"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="lp-mobile-menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="lp-mobile-menu-links">
                {NAV_ITEMS.map(([label, id]) => (
                  <button
                    key={id}
                    type="button"
                    className="lp-mobile-menu-link"
                    onClick={() => handleNavClick(id)}
                  >
                    {label}
                  </button>
                ))}
                <a
                  href="/contact"
                  className="lp-mobile-menu-link"
                  style={{ textDecoration: 'none' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Contact
                </a>
                <a
                  href="/careers"
                  className="lp-mobile-menu-link"
                  style={{ textDecoration: 'none' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Careers
                </a>
              </div>

              <div className="lp-mobile-menu-cta">
                <a
                  href="/login"
                  className="lp-btn-ghost"
                  style={{ textDecoration: 'none' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </a>
                <a
                  href="/login"
                  className="lp-btn-primary"
                  style={{ textDecoration: 'none' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started Free
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
