'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { artisanApi } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface FavoriteArtisan {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  artisanProfile: {
    companyName: string;
    description?: string;
    rating: number;
    reviewCount: number;
    hourlyRate: number;
    specialties: Array<{ id: string; name: string }>;
    city?: string;
    verified: boolean;
  };
}

export default function ClientFavoritesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteArtisan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await artisanApi.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (artisanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await artisanApi.removeFavorite(artisanId);
      setFavorites(favorites.filter((f) => f.id !== artisanId));
      toast({
        title: t('common', 'success'),
        description: t('favorites', 'removed'),
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          ← {t('common', 'back')}
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('favorites', 'title')}</h1>
            <p className="text-gray-600 mt-1">
              {favorites.length} {t('favorites', 'savedArtisans')}
            </p>
          </div>
          <Link href="/client/artisans">
            <Button variant="outline">{t('favorites', 'findMore')}</Button>
          </Link>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">❤️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('favorites', 'noFavorites')}
              </h3>
              <p className="text-gray-600 mb-4">{t('favorites', 'noFavoritesDesc')}</p>
              <Link href="/client/artisans">
                <Button>{t('favorites', 'browseArtisans')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((artisan) => (
              <Link key={artisan.id} href={`/client/artisans/${artisan.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            artisan.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${artisan.id}`
                          }
                          alt={artisan.firstName}
                          className="w-14 h-14 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {artisan.firstName} {artisan.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {artisan.artisanProfile.companyName}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleRemoveFavorite(artisan.id, e)}
                        className="text-red-500 hover:text-red-600 text-xl"
                        title={t('favorites', 'remove')}
                      >
                        ❤️
                      </button>
                    </div>

                    <div className="mb-3">
                      {renderStars(artisan.artisanProfile.rating)}
                      <span className="text-sm text-gray-500 ml-2">
                        {artisan.artisanProfile.reviewCount} {t('common', 'reviews')}
                      </span>
                    </div>

                    {artisan.artisanProfile.verified && (
                      <Badge className="bg-green-100 text-green-800 mb-3">
                        ✓ {t('artisan', 'verified')}
                      </Badge>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {artisan.artisanProfile.specialties.slice(0, 3).map((spec) => (
                        <Badge key={spec.id} variant="outline">
                          {spec.name}
                        </Badge>
                      ))}
                      {artisan.artisanProfile.specialties.length > 3 && (
                        <Badge variant="outline">
                          +{artisan.artisanProfile.specialties.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm text-gray-600">
                        {artisan.artisanProfile.city}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {artisan.artisanProfile.hourlyRate}€/h
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
