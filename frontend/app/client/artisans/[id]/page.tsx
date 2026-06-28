'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map } from '@/components/map/Map';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { userApi } from '@/lib/api/user';
import { artisanApi } from '@/lib/api/artisan';

interface ArtisanProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  artisanProfile: {
    companyName: string;
    siret: string;
    description: string;
    specialties: string[];
    address: string;
    city: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
    serviceRadius: number;
    hourlyRate: number;
    rating: number;
    reviewCount: number;
    completedMissions: number;
    responseTime: string;
    verified: boolean;
    portfolio: string[];
  };
  reviews: Review[];
  availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  client: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  mission?: {
    title: string;
    category: string;
  };
}

const SPECIALTY_ICONS: Record<string, string> = {
  plomberie: '🔧',
  electricite: '⚡',
  peinture: '🎨',
  menuiserie: '🪚',
  maconnerie: '🧱',
  jardinage: '🌿',
  climatisation: '❄️',
  serrurerie: '🔐',
};

export default function ArtisanDetailsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const artisanId = params.id as string;

  const getDayName = (day: string) => {
    const dayMap: Record<string, string> = {
      monday: t('artisans', 'monday'),
      tuesday: t('artisans', 'tuesday'),
      wednesday: t('artisans', 'wednesday'),
      thursday: t('artisans', 'thursday'),
      friday: t('artisans', 'friday'),
      saturday: t('artisans', 'saturday'),
      sunday: t('artisans', 'sunday'),
    };
    return dayMap[day] || day;
  };

  const { toast } = useToast();
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    loadArtisan();
    checkFavoriteStatus();
  }, [artisanId]);

  const checkFavoriteStatus = async () => {
    try {
      const result = await artisanApi.checkFavorite(artisanId);
      setIsFavorite(result.isFavorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await artisanApi.removeFavorite(artisanId);
        setIsFavorite(false);
        toast({
          title: t('common', 'success'),
          description: t('favorites', 'removed'),
        });
      } else {
        await artisanApi.addFavorite(artisanId);
        setIsFavorite(true);
        toast({
          title: t('common', 'success'),
          description: t('favorites', 'added'),
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const loadArtisan = async () => {
    try {
      // Fetch artisan data from API
      const data = await userApi.getArtisanById(artisanId);
      setArtisan(data);
    } catch (error: any) {
      console.error('Error loading artisan:', error);
      // If artisan not found or error, user will see "Artisan not found" message
      // because artisan state remains null
    } finally {
      setLoading(false);
    }
  };

  const handleContactArtisan = () => {
    router.push(`/client/missions/new?artisanId=${artisanId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('artisans', 'artisanNotFound')}</p>
          <Button onClick={() => router.push('/client/artisans')}>
            {t('artisans', 'backToList')}
          </Button>
        </div>
      </div>
    );
  }

  const { artisanProfile } = artisan;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            ← {t('common', 'back')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <img
                    src={artisan.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                    alt={artisan.firstName}
                    className="w-24 h-24 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h1 className="text-3xl font-bold text-foreground">
                          {artisanProfile.companyName}
                        </h1>
                        <p className="text-muted-foreground">
                          {artisan.firstName} {artisan.lastName}
                        </p>
                      </div>
                      {artisanProfile.verified && (
                        <Badge variant="default" className="bg-primary">
                          ✓ {t('artisans', 'verified')}
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-yellow-500">
                          ★ {artisanProfile.rating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({artisanProfile.reviewCount} {t('artisans', 'reviews')})
                        </span>
                      </div>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {artisanProfile.completedMissions} {t('artisans', 'completedMissions')}
                      </span>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {artisanProfile.specialties.map((specialty) => (
                        <Badge key={specialty} variant="info">
                          <span className="mr-1">{SPECIALTY_ICONS[specialty]}</span>
                          {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                        </Badge>
                      ))}
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('artisans', 'hourlyRate')}:</span>
                        <span className="font-semibold ml-2">{artisanProfile.hourlyRate}€/h</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('artisans', 'responseTime')}:</span>
                        <span className="font-semibold ml-2">{artisanProfile.responseTime}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common', 'serviceRadius')}:</span>
                        <span className="font-semibold ml-2">{artisanProfile.serviceRadius} km</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SIRET:</span>
                        <span className="font-semibold ml-2">{artisanProfile.siret}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{t('artisans', 'about')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed whitespace-pre-line">
                  {artisanProfile.description}
                </p>
              </CardContent>
            </Card>

            {/* Portfolio */}
            {artisanProfile.portfolio.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('artisans', 'portfolio')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {artisanProfile.portfolio.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${t('artisans', 'project')} ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedImage(image)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace', 'clientReviews')} ({artisan.reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {artisan.reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                      <div className="flex items-start gap-4">
                        <img
                          src={review.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={review.client.firstName}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">
                                {review.client.firstName} {review.client.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span className="text-yellow-500 font-semibold">
                                {'★'.repeat(review.rating)}
                                {'☆'.repeat(5 - review.rating)}
                              </span>
                            </div>
                          </div>
                          {review.mission && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {t('artisans', 'mission')}: {review.mission.title}
                            </p>
                          )}
                          <p className="text-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardContent className="p-6">
                <Button className="w-full mb-4" size="lg" onClick={handleContactArtisan}>
                  {t('artisans', 'createMission')}
                </Button>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button variant="outline">
                    💬 {t('artisans', 'sendMessage')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleToggleFavorite}
                    disabled={favoriteLoading}
                    className={isFavorite ? 'text-red-500 border-red-500 hover:bg-red-500/10' : ''}
                  >
                    {favoriteLoading ? '...' : isFavorite ? '❤️' : '🤍'} {t('favorites', isFavorite ? 'saved' : 'save')}
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>📍</span>
                    <span>
                      {artisanProfile.address}, {artisanProfile.postalCode} {artisanProfile.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>📞</span>
                    <span>{artisan.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>✉️</span>
                    <span>{artisan.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('artisans', 'availabilities')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(artisan.availability).map(([day, available]) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className={available ? 'text-foreground' : 'text-muted-foreground'}>
                        {getDayName(day)}
                      </span>
                      <span className={available ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                        {available ? `✓ ${t('artisans', 'availableDay')}` : t('artisans', 'closed')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Area Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('artisans', 'serviceZone')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Map
                  center={{
                    lat: artisanProfile.latitude,
                    lng: artisanProfile.longitude,
                  }}
                  zoom={11}
                  markers={[
                    {
                      id: artisan.id,
                      position: {
                        lat: artisanProfile.latitude,
                        lng: artisanProfile.longitude,
                      },
                      title: artisanProfile.companyName,
                    },
                  ]}
                  className="h-64"
                />
                <p className="text-sm text-muted-foreground mt-3">
                  {t('artisans', 'radiusAround')} {artisanProfile.serviceRadius} km {t('artisans', 'aroundCity')} {artisanProfile.city}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Portfolio"
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
