import '@/app/landing.css';
import LandingPage from '@/components/landing/LandingPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Minimal landing styles inlined so the homepage stays readable if chunk CSS 404s. */
const CRITICAL_LANDING_CSS = `
.landing{background:#f8fafc;color:#0f172a;min-height:100vh;overflow-x:hidden}
.landing .lp-nav,.landing .lp-hero-badge,.landing .lp-hero-title,.landing .lp-hero-sub,
.landing .lp-hero-cta,.landing .lp-hero-stats,.landing .lp-hero-preview,.landing .lp-skill-pill{
  opacity:1!important;transform:none!important
}
`;

/** Server-rendered shell — avoids Hostinger CDN caching a static RSC/flight payload for `/`. */
export default function HomePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_LANDING_CSS }} />
      <LandingPage />
    </>
  );
}
