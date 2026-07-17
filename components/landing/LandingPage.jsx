'use client';

import Navbar from './Navbar';
import Hero from './Hero';
import Marquee from './Marquee';
import TrustBar from './TrustBar';
import HowItWorks from './HowItWorks';
import WhatIsTailoring from './WhatIsTailoring';
import BeforeAfter from './BeforeAfter';
import Templates from './Templates';
import Features from './Features';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import FAQ from './FAQ';
import Footer from './Footer';

export default function LandingPage() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navOffset = window.innerWidth < 1025 ? 72 : 88;
    const top = el.getBoundingClientRect().top + window.scrollY - navOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="landing">
      <Navbar scrollTo={scrollTo} />
      <Hero scrollTo={scrollTo} />
      <Marquee />
      <TrustBar />
      <HowItWorks />
      <WhatIsTailoring />
      <BeforeAfter />
      <Templates />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}
