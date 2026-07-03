import { redirect } from 'next/navigation';

/** Legacy route — Hostinger CDN mishandles `/app`; use `/profile` instead. */
export default function LegacyAppRedirect() {
  redirect('/profile');
}
