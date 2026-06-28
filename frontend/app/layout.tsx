import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Krafolt - Trouvez des artisans locaux',
  description: 'Plateforme de mise en relation entre clients et artisans',
  manifest: '/manifest.json',
  themeColor: '#2563EB',
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
    url: 'https://articonnect.app',
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
    <html lang="fr">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
