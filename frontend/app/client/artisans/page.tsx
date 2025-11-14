'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';

interface Artisan {
  id: string;
  firstName: string;
  lastName: string;
  artisanProfile: {
    companyName: string;
    description: string;
    specialties: string[];
    city: string;
    country: string;
    hourlyRate?: number;
    rating: number;
    reviewCount: number;
    verified: boolean;
  };
  distance?: number;
}

const SPECIALTIES = [
  { id: 'all', name: 'Tous', icon: '🔍' },
  { id: 'plomberie', name: 'Plomberie', icon: '🔧' },
  { id: 'electricite', name: 'Électricité', icon: '⚡' },
  { id: 'peinture', name: 'Peinture', icon: '🎨' },
  { id: 'menuiserie', name: 'Menuiserie', icon: '🪚' },
  { id: 'maconnerie', name: 'Maçonnerie', icon: '🧱' },
  { id: 'jardinage', name: 'Jardinage', icon: '🌿' },
  { id: 'climatisation', name: 'Climatisation', icon: '❄️' },
  { id: 'serrurerie', name: 'Serrurerie', icon: '🔐' },
];

export default function ArtisansListPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [filteredArtisans, setFilteredArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'price'>('rating');

  useEffect(() => {
    loadArtisans();
  }, []);

  useEffect(() => {
    filterAndSortArtisans();
  }, [artisans, selectedSpecialty, searchQuery, sortBy]);

  const loadArtisans = async () => {
    try {
      // Load artisans from API
      const data = await userApi.getArtisans();

      // Transform API data to match Artisan interface
      const artisansData: Artisan[] = data.map((artisan: any) => ({
        id: artisan.id,
        firstName: artisan.firstName,
        lastName: artisan.lastName,
        artisanProfile: artisan.artisanProfile ? {
          companyName: artisan.artisanProfile.companyName || 'N/A',
          description: artisan.artisanProfile.description || '',
          specialties: artisan.artisanProfile.specialties?.map((s: any) => s.name) || [],
          city: artisan.artisanProfile.baseAddress?.split(',')[0] || 'Luxembourg',
          country: 'Luxembourg',
          hourlyRate: Number(artisan.artisanProfile.hourlyRate) || 50,
          rating: Number(artisan.artisanProfile.rating) || 0,
          reviewCount: artisan.artisanProfile.reviewCount || 0,
          verified: artisan.artisanProfile.stripeOnboarded || false,
        } : null,
        distance: 0, // Will be calculated if geolocation is enabled
      })).filter((a: Artisan) => a.artisanProfile !== null);

      setArtisans(artisansData);
    } catch (error) {
      console.error('Error loading artisans:', error);
      // Show empty state instead of mock data on error
      setArtisans([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortArtisans = () => {
    let filtered = [...artisans];

    // Filter by specialty
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter((artisan) =>
        artisan.artisanProfile.specialties.includes(selectedSpecialty)
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (artisan) =>
          artisan.firstName.toLowerCase().includes(query) ||
          artisan.lastName.toLowerCase().includes(query) ||
          artisan.artisanProfile.companyName.toLowerCase().includes(query) ||
          artisan.artisanProfile.city.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.artisanProfile.rating - a.artisanProfile.rating;
      } else if (sortBy === 'distance') {
        return (a.distance || 0) - (b.distance || 0);
      } else if (sortBy === 'price') {
        return (a.artisanProfile.hourlyRate || 0) - (b.artisanProfile.hourlyRate || 0);
      }
      return 0;
    });

    setFilteredArtisans(filtered);
  };

  const handleContactArtisan = (artisanId: string) => {
    router.push(`/client/missions/new?artisanId=${artisanId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trouver un artisan</h1>
          <p className="text-gray-600 mt-2">
            {filteredArtisans.length} artisan{filteredArtisans.length > 1 ? 's' : ''} disponible
            {filteredArtisans.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom, entreprise, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rating">Mieux notés</option>
              <option value="distance">Plus proches</option>
              <option value="price">Moins chers</option>
            </select>
          </div>

          {/* Specialty Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SPECIALTIES.map((specialty) => (
              <button
                key={specialty.id}
                onClick={() => setSelectedSpecialty(specialty.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedSpecialty === specialty.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{specialty.icon}</span>
                <span className="text-sm font-medium">{specialty.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Artisans Grid */}
        {filteredArtisans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">Aucun artisan trouvé</p>
              <Button onClick={() => { setSearchQuery(''); setSelectedSpecialty('all'); }}>
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtisans.map((artisan) => (
              <Card key={artisan.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-semibold">
                        {artisan.firstName[0]}
                        {artisan.lastName[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {artisan.artisanProfile.companyName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {artisan.firstName} {artisan.lastName}
                        </p>
                      </div>
                    </div>
                    {artisan.artisanProfile.verified && (
                      <Badge variant="success" className="text-xs">
                        ✓ Vérifié
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <StarRating
                      rating={artisan.artisanProfile.rating}
                      readonly
                      size="sm"
                    />
                    <span className="text-sm text-gray-600">
                      ({artisan.artisanProfile.reviewCount} avis)
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {artisan.artisanProfile.description}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {artisan.artisanProfile.specialties.slice(0, 3).map((specialty) => {
                      const spec = SPECIALTIES.find((s) => s.id === specialty);
                      return (
                        <Badge key={specialty} variant="default" className="text-xs">
                          {spec?.icon} {spec?.name}
                        </Badge>
                      );
                    })}
                    {artisan.artisanProfile.specialties.length > 3 && (
                      <Badge variant="default" className="text-xs">
                        +{artisan.artisanProfile.specialties.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>📍</span>
                      <span>
                        {artisan.artisanProfile.city}, {artisan.artisanProfile.country}
                      </span>
                      {artisan.distance && (
                        <span className="text-blue-600">({artisan.distance} km)</span>
                      )}
                    </div>
                    {artisan.artisanProfile.hourlyRate && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>💰</span>
                        <span>~{artisan.artisanProfile.hourlyRate}€/h</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleContactArtisan(artisan.id)}
                    >
                      Contacter
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/artisans/${artisan.id}`)}
                    >
                      Voir profil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
