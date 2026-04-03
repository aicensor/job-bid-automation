import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tailor Resume Generator',
  description: 'Auto-generate tailored resumes to rank top 10 in ATS scoring systems',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
