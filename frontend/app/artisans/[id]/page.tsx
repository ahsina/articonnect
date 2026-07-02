'use client';

import { TradeIcon } from '@/components/shared/TradeIcon';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import apiClient from '@/lib/api/client';

interface PublicArtisanProfile {
  id: string;
  companyName: string;
  description?: string;
  specialties: {
    id: string;
    name: string;
    icon?: string;
    category: string;
  }[];
  serviceRadius: number;
  city?: string;
  rating: number;
  reviewCount: number;
  missionCount: number;
  available: boolean;
  hourlyRate?: number;
  emergencyRate?: number;
  businessVerified: boolean;
  certifications: {
    id: string;
    name: string;
    issuer: string;
    verified: boolean;
  }[];
  portfolio?: {
    id: string;
    imageUrl: string;
    title?: string;
    description?: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment?: string;
    reviewer: {
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  }[];
}

export default function ArtisanPublicProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const artisanId = params.id as string;

  const [profile, setProfile] = useState<PublicArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'portfolio'>('about');

  useEffect(() => {
    if (artisanId) {
      loadProfile();
    }
  }, [artisanId]);

  const loadProfile = async () => {
    try {
      const response = await apiClient.get(`/users/artisans/${artisanId}`);
      // Normalisation : l'API imbrique sous artisanProfile/receivedReviews ; la page lit à plat.
      const data = response.data || {};
      const ap = data.artisanProfile || {};
      setProfile({
        ...data,
        ...ap,
        id: data.id, // conserver l'id utilisateur (messagerie), pas celui du profil
        rating: Number(ap.rating ?? 0),
        reviewCount: ap.reviewCount ?? 0,
        verified: ap.businessVerified ?? false,
        portfolio: ap.portfolio ?? [],
        specialties: ap.specialties ?? [], // objets {id,name,icon,category} — la page rend .name/.icon
        certifications: ap.certifications ?? [],
        companyName: ap.companyName || `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'Artisan',
        reviews: (data.receivedReviews ?? []).map((r: any) => ({
          ...r,
          rating: r.overallRating ?? 0,
          comment: r.comment ?? '',
        })),
      } as any);
    } catch (error) {
      console.error('Error loading artisan profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <span key={i} className="text-amber-800">
            
          </span>,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <span key={i} className="text-amber-800">
            
          </span>,
        );
      } else {
        stars.push(
          <span key={i} className="text-gray-300">
            
          </span>,
        );
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {t('artisan', 'profileNotFound') || 'Artisan profile not found'}
          </p>
          <Button onClick={() => router.push('/')}>
            {t('common', 'backToHome') || 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10 mb-4"
          >
            {t('common', 'back') || 'Back'}
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
              {profile.companyName.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{profile.companyName}</h1>
                {profile.businessVerified && (
                  <Badge className="bg-green-500 text-white">
                    {t('artisan', 'verified') || 'Verified'}
                  </Badge>
                )}
                {profile.available ? (
                  <Badge className="bg-green-400 text-white">
                    {t('artisan', 'available') || 'Available'}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-400 text-white">
                    {t('artisan', 'unavailable') || 'Unavailable'}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <div className="flex items-center gap-1">
                  <span className="text-lg">{renderStars(profile.rating)}</span>
                  <span className="ml-1">{profile.rating.toFixed(1)}</span>
                  <span className="text-white/70">({profile.reviewCount} reviews)</span>
                </div>
                <span>•</span>
                <span>
                  {profile.missionCount} {t('artisan', 'missionsCompleted') || 'missions completed'}
                </span>
                {profile.city && (
                  <>
                    <span>•</span>
                    <span>{profile.city}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {profile.specialties.slice(0, 5).map((specialty) => (
                  <Badge key={specialty.id} className="bg-white/20 text-white border-white/30">
                    <TradeIcon name={specialty.name} className="mr-1 inline h-3.5 w-3.5" />
                    {specialty.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Contact Button */}
            <div className="w-full md:w-auto">
              <Button
                size="lg"
                className="w-full md:w-auto bg-card text-primary hover:bg-primary/10"
                onClick={() => router.push(`/client/missions/new?artisanId=${artisanId}`)}
              >
                {t('artisan', 'requestQuote') || 'Request a Quote'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-4 -mt-12 mb-8">
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.hourlyRate ? `EUR ${profile.hourlyRate}` : 'N/A'}
              </div>
              <div className="text-muted-foreground">{t('artisan', 'perHour') || 'per hour'}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {profile.emergencyRate ? `EUR ${profile.emergencyRate}` : 'N/A'}
              </div>
              <div className="text-muted-foreground">
                {t('artisan', 'emergencyRate') || 'emergency rate'}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600">{profile.serviceRadius} km</div>
              <div className="text-muted-foreground">{t('artisan', 'serviceArea') || 'service area'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 font-medium ${activeTab === 'about' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
          >
            {t('artisan', 'about') || 'About'}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 font-medium ${activeTab === 'reviews' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
          >
            {t('artisan', 'reviews') || 'Reviews'} ({profile.reviewCount})
          </button>
          {profile.portfolio && profile.portfolio.length > 0 && (
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 font-medium ${activeTab === 'portfolio' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
            >
              {t('artisan', 'portfolio') || 'Portfolio'}
            </button>
          )}
        </div>

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('artisan', 'aboutBusiness') || 'About the Business'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.description ? (
                    <p className="text-foreground whitespace-pre-wrap">{profile.description}</p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {t('artisan', 'noDescription') || 'No description provided'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('artisan', 'specialties') || 'Specialties'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.specialties.map((specialty) => (
                      <div
                        key={specialty.id}
                        className="flex items-center gap-2 p-3 bg-background rounded-lg"
                      >
                        <TradeIcon name={specialty.name} className="h-6 w-6" />
                        <div>
                          <div className="font-medium">{specialty.name}</div>
                          <div className="text-xs text-muted-foreground">{specialty.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Certifications */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('artisan', 'certifications') || 'Certifications'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.certifications.length > 0 ? (
                    <div className="space-y-3">
                      {profile.certifications.map((cert) => (
                        <div key={cert.id} className="flex items-start gap-2">
                          <span className={cert.verified ? 'text-green-600' : 'text-muted-foreground'}>
                            {cert.verified ? '' : '○'}
                          </span>
                          <div>
                            <div className="font-medium">{cert.name}</div>
                            <div className="text-sm text-muted-foreground">{cert.issuer}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      {t('artisan', 'noCertifications') || 'No certifications listed'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('artisan', 'getInTouch') || 'Get in Touch'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/client/missions/new?artisanId=${artisanId}`)}
                  >
                    {t('artisan', 'requestQuote') || 'Request a Quote'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t('artisan', 'freeQuote') || 'Get a free quote with no obligation'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Rating Summary */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-foreground">
                      {profile.rating.toFixed(1)}
                    </div>
                    <div className="text-2xl">{renderStars(profile.rating)}</div>
                    <div className="text-muted-foreground">
                      {profile.reviewCount} {t('artisan', 'reviews') || 'reviews'}
                    </div>
                  </div>
                  <div className="flex-1">
                    {/* Rating distribution would go here */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="w-8 text-sm text-muted-foreground">{star} </span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full"
                              style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : 10}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Reviews */}
            {profile.reviews.length > 0 ? (
              <div className="space-y-4">
                {profile.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                          {review.reviewer.firstName[0]}
                          {review.reviewer.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium">
                              {review.reviewer.firstName} {review.reviewer.lastName[0]}.
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-amber-800 mb-2">{renderStars(review.rating)}</div>
                          {review.comment && <p className="text-foreground">{review.comment}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">{t('artisan', 'noReviews') || 'No reviews yet'}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && profile.portfolio && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {profile.portfolio.map((item) => (
              <div key={item.id} className="relative group cursor-pointer">
                <img
                  src={item.imageUrl}
                  alt={item.title || 'Portfolio item'}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-end">
                  <div className="p-4 text-white opacity-0 group-hover:opacity-100 transition-all">
                    {item.title && <div className="font-medium">{item.title}</div>}
                    {item.description && (
                      <div className="text-sm text-white/80">{item.description}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="bg-muted py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('artisan', 'readyToStart') || 'Ready to start your project?'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('artisan', 'contactArtisan') ||
              'Contact this artisan to discuss your needs and get a personalized quote.'}
          </p>
          <Button size="lg" onClick={() => router.push(`/client/missions/new?artisanId=${artisanId}`)}>
            {t('artisan', 'requestQuote') || 'Request a Quote'}
          </Button>
        </div>
      </div>
    </div>
  );
}
