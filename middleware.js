import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site-url';

const PRIVATE_PREFIXES = ['/profile', '/dashboard', '/search'];

const NO_CACHE_EXACT = new Set([
  '/',
  '/login',
  '/contact',
  '/careers',
  '/privacy',
  '/terms',
  '/dashboard',
  '/search',
  '/profile',
]);

function applyNoCacheHeaders(response) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Surrogate-Control', 'no-store');
  response.headers.set(
    'Vary',
    'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Accept'
  );
  response.headers.set('X-Accel-Expires', '0');
}

function pathNeedsNoCache(pathname) {
  if (NO_CACHE_EXACT.has(pathname)) return true;
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });
  const siteUrl = getSiteUrl(request);
  const { pathname } = request.nextUrl;

  // Hostinger CDN can serve broken RSC payloads for `/app` — always use `/profile`.
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/app(?=\/|$)/, '/profile') || '/profile';
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!user && isPrivate) {
    const redirect = NextResponse.redirect(new URL('/login', siteUrl));
    applyNoCacheHeaders(redirect);
    return redirect;
  }

  if (user && pathname === '/login') {
    const redirect = NextResponse.redirect(new URL('/dashboard', siteUrl));
    applyNoCacheHeaders(redirect);
    return redirect;
  }

  if (pathNeedsNoCache(pathname)) {
    applyNoCacheHeaders(supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
