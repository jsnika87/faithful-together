import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import PwaRegister from './pwa-register';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Faithful Together',
  description: 'A private family journey of faith, health, and steady discipline.',
  applicationName: 'Faithful Together',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Faithful Together' },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'Faithful Together',
    description: 'Faith. Health. Steady discipline. One family journey.',
    type: 'website',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Faithful Together family journey' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Faithful Together',
    description: 'Faith. Health. Steady discipline. One family journey.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
