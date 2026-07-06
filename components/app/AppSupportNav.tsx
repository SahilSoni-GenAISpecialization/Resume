import { CONTACT_EMAIL } from '@/lib/site-config';
import '@/app/app.css';

type Props = {
  variant?: 'app' | 'shell';
  showEmail?: boolean;
};

export default function AppSupportNav({ variant = 'app', showEmail = false }: Props) {
  const linkClass = variant === 'app' ? 'app-btn app-btn-ghost' : 'btn-ghost';
  const emailClass = variant === 'app' ? 'app-nav-contact-email' : 'nav-contact-email';

  return (
    <>
      {showEmail && (
        <a href={`mailto:${CONTACT_EMAIL}`} className={emailClass} title="Email Applymatic support">
          {CONTACT_EMAIL}
        </a>
      )}
      <a href="/contact" className={linkClass}>
        Contact
      </a>
      <a href="/careers" className={linkClass}>
        Careers
      </a>
    </>
  );
}
