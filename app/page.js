import '@/app/landing.css';
import LandingPage from '@/components/landing/LandingPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Minimal landing styles inlined so the homepage stays readable if chunk CSS 404s
 * (Hostinger CDN). Includes mobile-first hamburger nav so phones never render
 * the full desktop link row.
 */
const CRITICAL_LANDING_CSS = `
.landing{background:#f8fafc;color:#0f172a;min-height:100vh;overflow-x:hidden}
.landing .lp-nav,.landing .lp-hero-badge,.landing .lp-hero-title,.landing .lp-hero-sub,
.landing .lp-hero-cta,.landing .lp-hero-stats,.landing .lp-hero-preview,.landing .lp-skill-pill{
  opacity:1!important;transform:none!important
}
.landing .lp-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:72px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.92)}
.landing .lp-nav-links,.landing .lp-nav-actions-desktop{display:none!important}
.landing .lp-nav-toggle{display:flex!important;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;border:1px solid rgba(15,23,42,.12);border-radius:10px;background:#fff;cursor:pointer}
.landing .lp-nav-toggle span{display:block;width:18px;height:2px;background:#0f172a;border-radius:2px}
.landing .lp-hero{padding:104px 16px 56px}
.landing .lp-hero-cta{display:flex;flex-direction:column;gap:10px}
.landing .lp-hero-cta a,.landing .lp-hero-cta button{width:100%;text-align:center}
.landing .lp-hero-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (min-width:1025px){
  .landing .lp-nav{display:grid;grid-template-columns:auto 1fr auto;height:88px;padding:0 40px}
  .landing .lp-nav-links{display:flex!important;align-items:center;justify-content:center;gap:22px}
  .landing .lp-nav-actions-desktop{display:flex!important;gap:10px}
  .landing .lp-nav-toggle{display:none!important}
  .landing .lp-hero-cta{flex-direction:row}
  .landing .lp-hero-cta a,.landing .lp-hero-cta button{width:auto}
  .landing .lp-hero-stats{display:flex;gap:32px}
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
