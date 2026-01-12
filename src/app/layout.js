import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Analytics from '@/components/Analytics';
import { Providers } from '@/components/Providers';
import './styles/main.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Daniel Hipskind | Software Engineer',
  description:
    'Software Engineer Portfolio - React, Next.js, Full Stack Development. View my projects, skills, and experience.',
  openGraph: {
    title: 'Daniel Hipskind | Software Engineer',
    description:
      'Software Engineer Portfolio - React, Next.js, Full Stack Development. View my projects, skills, and experience.',
    url: 'https://danielhipskind.com',
    siteName: 'Daniel Hipskind',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daniel Hipskind | Software Engineer',
    description:
      'Software Engineer Portfolio - React, Next.js, Full Stack Development.',
    creator: '@danielhipskind_',
  },
  icons: {
    icon: '/assets/images/DanielPortfolio.jpeg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <Providers>
          {/* Analytics Opt-in Banner */}
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>

          {/* Global Navigation */}
          <Navbar />

          {children}

          {/* Global Footer */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
