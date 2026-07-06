import Link from 'next/link';
import { COMPANY_NAME, CONTACT_EMAIL } from '@/lib/site-config';
import '@/app/legal.css';

export const metadata = {
  title: `Privacy Policy | ${COMPANY_NAME}`,
  description: 'How Applymatic collects, uses, stores, and protects your personal information.',
};

export default function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: July 6, 2026</p>

          <p>
            {COMPANY_NAME} (&quot;Applymatic,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates{' '}
            <a href="https://applymatic.ca">applymatic.ca</a>, an AI-powered platform that helps job seekers
            tailor resumes, cover letters, and application materials. This Privacy Policy explains what
            information we collect, how we use it, and the choices you have.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account information:</strong> email address, authentication identifiers, and profile
              details you provide when you sign up (including via Google or GitHub sign-in).
            </li>
            <li>
              <strong>Resume and career data:</strong> work history, education, skills, certifications,
              uploaded resumes, job descriptions, tailored documents, and application tracking data you
              enter or generate in the product.
            </li>
            <li>
              <strong>Payment information:</strong> billing is processed by Stripe. We receive subscription
              status and customer identifiers from Stripe, not your full card number.
            </li>
            <li>
              <strong>Usage data:</strong> feature usage (such as monthly generation limits), log data, and
              technical information like browser type and IP address for security and reliability.
            </li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>Provide, maintain, and improve Applymatic&apos;s services.</li>
            <li>Generate AI-tailored resumes, cover letters, thank-you emails, and job-match insights.</li>
            <li>Authenticate your account and keep it secure.</li>
            <li>Process subscriptions and manage billing through Stripe.</li>
            <li>Respond to support requests and communicate service updates.</li>
            <li>Comply with legal obligations and prevent abuse or fraud.</li>
          </ul>

          <h2>AI processing</h2>
          <p>
            To generate tailored application materials, we send relevant profile and job-description content
            to third-party AI providers (such as Anthropic). We use this data only to deliver the features
            you request. Do not submit information you are not authorized to share.
          </p>

          <h2>Third-party services</h2>
          <p>We use trusted providers to operate Applymatic, including:</p>
          <ul>
            <li>Supabase — authentication, database, and file storage</li>
            <li>Stripe — payment processing</li>
            <li>Anthropic — AI document generation</li>
            <li>Google and GitHub — optional OAuth sign-in</li>
          </ul>
          <p>
            These providers process data according to their own privacy policies and our agreements with
            them.
          </p>

          <h2>Data retention</h2>
          <p>
            We retain your account and application data while your account is active. You may request
            deletion of your account and associated data by contacting us. We may retain limited records
            where required by law or for legitimate business purposes (such as billing records).
          </p>

          <h2>Your rights and choices</h2>
          <ul>
            <li>Access and update profile information in your Applymatic account.</li>
            <li>Request deletion of your account by emailing us.</li>
            <li>Opt out of non-essential marketing emails (service emails may still be sent).</li>
          </ul>
          <p>
            If you are in Canada or another jurisdiction with privacy rights, you may have additional
            rights to access, correct, or delete personal information. Contact us to exercise those rights.
          </p>

          <h2>Security</h2>
          <p>
            We use industry-standard safeguards including encrypted connections (HTTPS), authenticated
            access controls, and secure cloud infrastructure. No method of transmission or storage is 100%
            secure.
          </p>

          <h2>Children</h2>
          <p>
            Applymatic is not intended for users under 16. We do not knowingly collect personal information
            from children.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised version on this
            page and update the &quot;Last updated&quot; date.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions about this Privacy Policy or your data? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </article>
      </div>
    </main>
  );
}
