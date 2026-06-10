import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Applymatic — AI Job Applications',
  description: 'Upload your resume, find jobs, get AI-tailored resumes and cover letters instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}