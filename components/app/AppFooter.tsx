import BrandLogo from '@/components/BrandLogo';
import { CAREERS_EMAIL, COMPANY_NAME, CONTACT_EMAIL } from '@/lib/site-config';
import '@/app/app.css';

export default function AppFooter() {
  return (
    <footer className="app-site-footer">
      <div className="app-site-footer-inner">
        <div className="app-site-footer-brand">
          <div className="app-site-footer-logo">
            <BrandLogo variant="footer" showName={false} />
          </div>
          <p className="app-site-footer-tagline">
            AI-powered resumes, cover letters, and job search — built for modern professionals.
          </p>
        </div>

        <div className="app-site-footer-grid">
          <div className="app-site-footer-col">
            <h4>Support</h4>
            <a href="/contact">Contact us</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
          <div className="app-site-footer-col">
            <h4>Company</h4>
            <a href="/careers">Careers</a>
            <a href={`mailto:${CAREERS_EMAIL}`}>{CAREERS_EMAIL}</a>
          </div>
          <div className="app-site-footer-col">
            <h4>Product</h4>
            <a href="/dashboard">Dashboard</a>
            <a href="/search">Job search</a>
            <a href="/profile">Profile</a>
          </div>
          <div className="app-site-footer-col">
            <h4>Legal</h4>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </div>

      <div className="app-site-footer-bottom">
        <p>© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
        <div className="app-site-footer-bottom-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/contact">Contact</a>
          <a href="/careers">Careers</a>
        </div>
      </div>
    </footer>
  );
}
