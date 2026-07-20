'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Star, MapPin, CheckCircle2 } from 'lucide-react';
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
    const rounded = Math.round(Number(rating) || 0);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rounded ? 'fill-warning text-warning' : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 -ml-3">
          {t('common', 'back')}
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {t('favorites', 'title')}
            </h1>
            <p className="text-muted-foreground mt-1.5">
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Heart className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('favorites', 'noFavorites')}
              </h3>
              <p className="text-muted-foreground mb-4">{t('favorites', 'noFavoritesDesc')}</p>
              <Link href="/client/artisans">
                <Button>{t('favorites', 'browseArtisans')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map((artisan) => (
              <Link key={artisan.id} href={`/client/artisans/${artisan.id}`}>
                <Card className="relative h-full p-5 flex flex-col hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
                  <button
                    onClick={(e) => handleRemoveFavorite(artisan.id, e)}
                    className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-destructive hover:bg-muted transition-colors"
                    title={t('favorites', 'remove')}
                    aria-label={t('favorites', 'remove')}
                  >
                    <Heart className="h-[18px] w-[18px] fill-destructive" />
                  </button>

                  <div className="flex items-center gap-3 pr-10">
                    <img
                      src={
                        artisan.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${artisan.id}`
                      }
                      alt={artisan.firstName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-foreground truncate">
                        {artisan.artisanProfile?.companyName || `${artisan.firstName} ${artisan.lastName}`}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {artisan.firstName} {artisan.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {renderStars(artisan.artisanProfile?.rating || 0)}
                    <span className="text-sm text-muted-foreground">
                      {(Number(artisan.artisanProfile?.rating) || 0).toFixed(1)} ·{' '}
                      {artisan.artisanProfile?.reviewCount || 0} {t('common', 'reviews')}
                    </span>
                  </div>

                  {artisan.artisanProfile?.verified && (
                    <Badge variant="success" className="mt-2.5 w-fit gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('artisan', 'verified')}
                    </Badge>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(artisan.artisanProfile?.specialties || []).slice(0, 3).map((spec) => (
                      <Badge key={spec.id} variant="outline">
                        {spec.name}
                      </Badge>
                    ))}
                    {(artisan.artisanProfile?.specialties?.length || 0) > 3 && (
                      <Badge variant="outline">
                        +{(artisan.artisanProfile?.specialties?.length || 0) - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {artisan.artisanProfile?.city || ""}
                    </span>
                    <span className="font-display font-bold text-foreground">
                      {artisan.artisanProfile?.hourlyRate || "—"}€/h
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
