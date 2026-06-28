'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white">
      {/* Hero Section */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Krafolt</h1>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">{t('nav.login')}</Button>
            </Link>
            <Link href="/register">
              <Button>{t('nav.register')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            {t('home.heroTitle')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            {t('home.heroSubtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register?role=client">
              <Button size="lg">{t('home.findArtisan')}</Button>
            </Link>
            <Link href="/register?role=artisan">
              <Button size="lg" variant="outline">
                {t('home.iAmArtisan')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-semibold mb-2">{t('home.geolocation')}</h3>
            <p className="text-muted-foreground">
              {t('home.geolocationDesc')}
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">{t('home.negotiation')}</h3>
            <p className="text-muted-foreground">
              {t('home.negotiationDesc')}
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2">{t('home.verifiedReviews')}</h3>
            <p className="text-muted-foreground">
              {t('home.verifiedReviewsDesc')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
