'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SupportBackLink({ className = 'login-back' }) {
  const [href, setHref] = useState('/');
  const [label, setLabel] = useState('Back to home');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHref('/dashboard');
        setLabel('Back to dashboard');
      }
    });
  }, []);

  return (
    <Link href={href} className={className}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      {label}
    </Link>
  );
}
