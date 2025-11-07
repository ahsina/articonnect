'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map } from '@/components/map/Map';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';

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

const DAYS_FR: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

export default function ArtisanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const artisanId = params.id as string;

  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadArtisan();
  }, [artisanId]);

  const loadArtisan = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await userApi.getArtisanById(artisanId);

      // Mock data
      const mockArtisan: ArtisanProfile = {
        id: artisanId,
        firstName: 'Marc',
        lastName: 'Plombier',
        email: 'marc.plombier@example.com',
        phone: '+352 621 123 456',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marc',
        createdAt: '2023-06-15T10:00:00Z',
        artisanProfile: {
          companyName: 'Plomberie Marc Pro',
          siret: '12345678900015',
          description:
            'Artisan plombier avec plus de 15 ans d\'expérience. Spécialisé dans la rénovation de salles de bain, l\'installation de systèmes de chauffage et le dépannage d\'urgence. Interventions rapides et travail soigné garanti. Certifié RGE pour les installations écologiques.',
          specialties: ['plomberie', 'climatisation'],
          address: '12 Rue des Artisans',
          city: 'Luxembourg',
          postalCode: '1234',
          country: 'LU',
          latitude: 49.6116,
          longitude: 6.1319,
          serviceRadius: 25,
          hourlyRate: 65,
          rating: 4.8,
          reviewCount: 47,
          completedMissions: 156,
          responseTime: '< 2h',
          verified: true,
          portfolio: [
            'https://via.placeholder.com/600x400?text=Projet+1',
            'https://via.placeholder.com/600x400?text=Projet+2',
            'https://via.placeholder.com/600x400?text=Projet+3',
            'https://via.placeholder.com/600x400?text=Projet+4',
          ],
        },
        reviews: [
          {
            id: '1',
            rating: 5,
            comment:
              'Excellent travail ! Marc est très professionnel et a résolu mon problème de fuite rapidement. Je recommande vivement.',
            createdAt: '2024-01-15T14:30:00Z',
            client: {
              firstName: 'Sophie',
              lastName: 'Martin',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
            },
            mission: {
              title: 'Réparation fuite salle de bain',
              category: 'plomberie',
            },
          },
          {
            id: '2',
            rating: 5,
            comment:
              'Installation de ma nouvelle chaudière parfaite. Très bon conseil et travail impeccable.',
            createdAt: '2024-01-10T10:00:00Z',
            client: {
              firstName: 'Jean',
              lastName: 'Dupont',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean',
            },
            mission: {
              title: 'Installation chaudière',
              category: 'plomberie',
            },
          },
          {
            id: '3',
            rating: 4,
            comment:
              'Bon travail, juste un léger retard sur le planning initial mais le résultat est là.',
            createdAt: '2024-01-05T16:45:00Z',
            client: {
              firstName: 'Marie',
              lastName: 'Dubois',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marie',
            },
            mission: {
              title: 'Rénovation salle de bain',
              category: 'plomberie',
            },
          },
        ],
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
      };

      setArtisan(mockArtisan);
    } catch (error) {
      console.error('Error loading artisan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactArtisan = () => {
    router.push(`/client/missions/create?artisanId=${artisanId}`);
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    try {
      // TODO: API call to submit review
      console.log('Submit review:', { rating, comment });
      setShowReviewForm(false);
      loadArtisan(); // Reload to get new review
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Artisan introuvable</p>
          <Button onClick={() => router.push('/client/artisans')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    );
  }

  const { artisanProfile } = artisan;
  const availableDays = Object.entries(artisan.availability)
    .filter(([_, available]) => available)
    .map(([day]) => DAYS_FR[day]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Retour
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
                        <h1 className="text-3xl font-bold text-gray-900">
                          {artisanProfile.companyName}
                        </h1>
                        <p className="text-gray-600">
                          {artisan.firstName} {artisan.lastName}
                        </p>
                      </div>
                      {artisanProfile.verified && (
                        <Badge variant="default" className="bg-blue-600">
                          ✓ Vérifié
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-yellow-500">
                          ★ {artisanProfile.rating.toFixed(1)}
                        </span>
                        <span className="text-gray-600 ml-2">
                          ({artisanProfile.reviewCount} avis)
                        </span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">
                        {artisanProfile.completedMissions} missions réalisées
                      </span>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {artisanProfile.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          <span className="mr-1">{SPECIALTY_ICONS[specialty]}</span>
                          {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                        </Badge>
                      ))}
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Tarif horaire:</span>
                        <span className="font-semibold ml-2">{artisanProfile.hourlyRate}€/h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Temps de réponse:</span>
                        <span className="font-semibold ml-2">{artisanProfile.responseTime}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Rayon:</span>
                        <span className="font-semibold ml-2">{artisanProfile.serviceRadius} km</span>
                      </div>
                      <div>
                        <span className="text-gray-600">SIRET:</span>
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
                <CardTitle>À propos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {artisanProfile.description}
                </p>
              </CardContent>
            </Card>

            {/* Portfolio */}
            {artisanProfile.portfolio.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {artisanProfile.portfolio.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Projet ${index + 1}`}
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
                <div className="flex items-center justify-between">
                  <CardTitle>Avis clients ({artisan.reviews.length})</CardTitle>
                  <Button onClick={() => setShowReviewForm(!showReviewForm)} size="sm">
                    {showReviewForm ? 'Annuler' : 'Laisser un avis'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showReviewForm && (
                  <div className="mb-6 pb-6 border-b">
                    <ReviewForm onSubmit={handleReviewSubmit} />
                  </div>
                )}

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
                              <p className="text-sm text-gray-500">
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
                            <p className="text-sm text-gray-600 mb-2">
                              Mission: {review.mission.title}
                            </p>
                          )}
                          <p className="text-gray-700">{review.comment}</p>
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
                  Créer une mission
                </Button>
                <Button variant="outline" className="w-full mb-4">
                  💬 Envoyer un message
                </Button>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📍</span>
                    <span>
                      {artisanProfile.address}, {artisanProfile.postalCode} {artisanProfile.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📞</span>
                    <span>{artisan.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>✉️</span>
                    <span>{artisan.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Disponibilités</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(artisan.availability).map(([day, available]) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className={available ? 'text-gray-900' : 'text-gray-400'}>
                        {DAYS_FR[day]}
                      </span>
                      <span className={available ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                        {available ? '✓ Disponible' : 'Fermé'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Area Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zone d'intervention</CardTitle>
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
                <p className="text-sm text-gray-600 mt-3">
                  Rayon de {artisanProfile.serviceRadius} km autour de {artisanProfile.city}
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
