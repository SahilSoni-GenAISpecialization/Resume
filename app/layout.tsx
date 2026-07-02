import type { Metadata } from 'next';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}