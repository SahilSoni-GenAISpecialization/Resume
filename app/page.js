import '@/app/landing.css';
import LandingPage from '@/components/landing/LandingPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Server-rendered shell — avoids Hostinger CDN caching a static RSC/flight payload for `/`. */
export default function HomePage() {
  return <LandingPage />;
}
