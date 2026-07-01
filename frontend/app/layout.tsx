import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CivicLens AI — AI-Powered Hyperlocal Problem Solver',
  description: 'Report, track, and resolve community issues with CivicLens AI-powered civic platform. Bridge between citizens and government.',
  keywords: 'civic issues, pothole, garbage, community, AI, government, report',
  authors: [{ name: 'CivicLens AI' }],
  openGraph: {
    title: 'CivicLens AI',
    description: 'AI-powered civic issue reporting platform',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0f1e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-[#0a0f1e] text-[#f0f4ff]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
