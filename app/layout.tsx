import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-landing',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Applymatic — AI Job Applications',
  description: 'Upload your resume, find jobs, get AI-tailored resumes and cover letters instantly.',
  icons: {
    icon: '/applymatic-logo.png',
    apple: '/applymatic-logo.png',
  },
};

/** Required so phones/tablets use device width (otherwise ~980px desktop layout is used). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}