const TRUSTED_HOSTS = new Set(
  [
    'applymatic.ca',
    'www.applymatic.ca',
    'resume-eta-bay.vercel.app',
    'localhost',
    '127.0.0.1',
  ].map((h) => h.toLowerCase())
);

function isTrustedHost(host) {
  if (!host) return false;
  const hostname = String(host).split(':')[0].trim().toLowerCase();
  if (TRUSTED_HOSTS.has(hostname)) return true;
  // Allow Vercel preview deployments for this project.
  if (hostname.endsWith('.vercel.app')) return true;
  return false;
}

/**
 * Public site origin for redirects (OAuth, Stripe, middleware).
 * Prefer NEXT_PUBLIC_SITE_URL in production so nginx/PM2 internal URLs are never used.
 */
export function getSiteUrl(request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      const host = forwardedHost.split(',')[0].trim();
      if (isTrustedHost(host)) {
        const proto = forwardedProto === 'http' ? 'http' : 'https';
        return `${proto}://${host}`;
      }
    }

    try {
      const origin = new URL(request.url).origin;
      const { hostname } = new URL(origin);
      // Never redirect users to loopback / bind-all addresses behind a reverse proxy.
      if (!isInternalOrigin(origin) && isTrustedHost(hostname)) return origin;
    } catch {
      /* fall through */
    }
  }

  return 'http://localhost:3000';
}

/** Client-side OAuth redirect base (uses env baked in at build time). */
export function getClientSiteUrl() {
  if (typeof window === 'undefined') return '';
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return window.location.origin;
}

function isInternalOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}
