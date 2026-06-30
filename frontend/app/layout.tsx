import './globals.css';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Providers } from './providers';
import CookieConsent from '@/components/shared/CookieConsent';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Krafolt - Trouvez des artisans locaux',
  description: 'Plateforme de mise en relation entre clients et artisans',
  manifest: '/manifest.json',
  themeColor: '#0E0F12',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Krafolt',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://krafolt.com',
    title: 'Krafolt - Trouvez des artisans locaux',
    description: 'Plateforme de mise en relation entre clients et artisans',
    siteName: 'Krafolt',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Krafolt Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Krafolt - Trouvez des artisans locaux',
    description: 'Plateforme de mise en relation entre clients et artisans',
    images: ['/icon-512x512.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
