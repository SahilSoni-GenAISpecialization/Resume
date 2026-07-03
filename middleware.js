import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site-url';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });
  const siteUrl = getSiteUrl(request);

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
  const { pathname } = request.nextUrl;

  // Protect only /app routes
  if (!user && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', siteUrl));
  }

  // Redirect logged-in users away from login
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/app', siteUrl));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};