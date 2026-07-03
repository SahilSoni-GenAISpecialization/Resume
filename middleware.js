import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site-url';

const PRIVATE_PREFIXES = ['/profile', '/dashboard', '/search'];

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
    return NextResponse.redirect(new URL('/login', siteUrl));
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/profile', siteUrl));
  }

  if (isPrivate) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
