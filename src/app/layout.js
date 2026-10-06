import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { Providers } from "@/components/Providers";
import "./styles/main.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Daniel Hipskind is a software engineer and founder of Greigh Studios LLC. Full-stack developer working in React, Next.js, Node.js, and Flutter — creator of Sensecast, a weather app for iOS and Android.";

export const metadata = {
  title: "Daniel Hipskind | Software Engineer & Founder of Greigh Studios",
  description: DESCRIPTION,
  applicationName: "Daniel Hipskind Portfolio",
  authors: [{ name: "Daniel Hipskind", url: "https://danielhipskind.com" }],
  creator: "Daniel Hipskind",
  publisher: "Greigh Studios LLC",
  keywords: [
    "Daniel Hipskind",
    "Greigh",
    "Greigh Studios",
    "software engineer",
    "full-stack developer",
    "React",
    "Next.js",
    "Flutter",
    "Sensecast",
    "portfolio",
  ],
  openGraph: {
    title: "Daniel Hipskind | Software Engineer & Founder of Greigh Studios",
    description: DESCRIPTION,
    url: "https://danielhipskind.com",
    siteName: "Daniel Hipskind",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Daniel Hipskind — Software Engineer, Founder of Greigh Studios LLC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daniel Hipskind | Software Engineer & Founder of Greigh Studios",
    description: DESCRIPTION,
    images: ["/assets/images/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/images/216.png", sizes: "216x216", type: "image/png" },
    ],
    apple: "/assets/images/512.png",
  },
  manifest: "/assets/manifest.json",
  verification: {
    google: "IR7KiemqEjVXXfQkZcL8aVXVNrxjMtpAU88D_P33Qjk",
  },
  metadataBase: new URL("https://danielhipskind.com"),
  alternates: {
    canonical: "https://danielhipskind.com/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token":"201fc8a690104fd298a4e92d4de0cf0a"}'
            strategy="afterInteractive"
          />

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
