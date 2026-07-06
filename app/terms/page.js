import Link from 'next/link';
import { COMPANY_NAME, CONTACT_EMAIL } from '@/lib/site-config';
import '@/app/legal.css';

export const metadata = {
  title: `Terms of Service | ${COMPANY_NAME}`,
  description: 'Terms and conditions for using Applymatic.',
};

export default function TermsPage() {
  return (
    <main className="login-page legal-page">
      <div className="legal-shell">
        <Link href="/" className="login-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to home
        </Link>

        <article className="login-card legal-card">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: July 6, 2026</p>

          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of {COMPANY_NAME} at{' '}
            <a href="https://applymatic.ca">applymatic.ca</a>. By creating an account or using the service,
            you agree to these Terms.
          </p>

          <h2>Service description</h2>
          <p>
            Applymatic provides AI-assisted tools to tailor resumes, cover letters, thank-you emails, and
            related job-search features. Outputs are generated automatically and should be reviewed by you
            before submission to employers.
          </p>

          <h2>Accounts</h2>
          <ul>
            <li>You must provide accurate account information and keep your credentials secure.</li>
            <li>You are responsible for activity under your account.</li>
            <li>You must be at least 16 years old to use the service.</li>
          </ul>

          <h2>Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use Applymatic for unlawful, fraudulent, or harmful purposes.</li>
            <li>Upload content you do not have the right to use.</li>
            <li>Attempt to reverse engineer, scrape, or disrupt the platform.</li>
            <li>Misrepresent AI-generated content as guaranteed to produce employment outcomes.</li>
          </ul>

          <h2>Subscriptions and billing</h2>
          <p>
            Paid plans are billed through Stripe. Fees, renewal terms, and cancellation rules are shown at
            checkout. Free-tier limits may change with notice. Refunds are handled according to applicable
            law and our support policy.
          </p>

          <h2>AI-generated content</h2>
          <p>
            Applymatic uses artificial intelligence. Generated content may contain errors or omissions. You
            are solely responsible for reviewing, editing, and submitting materials to employers. We do not
            guarantee interviews, offers, or hiring outcomes.
          </p>

          <h2>Intellectual property</h2>
          <p>
            Applymatic owns the platform, branding, and software. You retain ownership of content you upload.
            You grant us a limited license to process your content solely to provide the service.
          </p>

          <h2>Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind, to the fullest extent
            permitted by law.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Applymatic is not liable for indirect, incidental, or
            consequential damages arising from your use of the service.
          </p>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these Terms. You may stop using the service at
            any time.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these Terms. Continued use after changes are posted constitutes acceptance of the
            updated Terms.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these Terms? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <p style={{ marginTop: 24 }}>
            See also our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </article>
      </div>
    </main>
  );
}
