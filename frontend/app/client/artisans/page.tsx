'use client';

import { TradeIcon } from '@/components/shared/TradeIcon';
import { Hammer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { userApi } from '@/lib/api/user';
import { useLanguage } from '@/contexts/LanguageContext';

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

type ArtisanSortOption = 'rating' | 'distance' | 'price';

// Dégradés de couverture des cartes (rotation par index) — purement décoratif.
const COVER_GRADIENTS = [
  'from-neutral-900 to-neutral-700',
  'from-emerald-700 to-emerald-900',
  'from-neutral-700 to-neutral-500',
  'from-amber-700 to-amber-500',
  'from-indigo-900 to-blue-600',
  'from-rose-900 to-pink-700',
];

const SPECIALTIES = [
  { id: 'all', name: 'Tous', icon: '' },
  { id: 'plomberie', name: 'Plomberie', icon: '' },
  { id: 'electricite', name: 'Électricité', icon: '' },
  { id: 'peinture', name: 'Peinture', icon: '' },
  { id: 'menuiserie', name: 'Menuiserie', icon: '' },
  { id: 'maconnerie', name: 'Maçonnerie', icon: '' },
  { id: 'jardinage', name: 'Jardinage', icon: '' },
  { id: 'climatisation', name: 'Climatisation', icon: '' },
  { id: 'serrurerie', name: 'Serrurerie', icon: '' },
];

export default function ArtisansListPage() {
  const { t } = useLanguage();
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
      const artisansData: Artisan[] = (Array.isArray(data) ? data : []).map((artisan: any): any => ({
        id: artisan.id,
        firstName: artisan.firstName || '',
        lastName: artisan.lastName || '',
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
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            {t('artisans', 'findArtisan')}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {t('artisans', 'directorySubtitle') || 'Parcourez les professionnels vérifiés près de chez vous et invitez-les sur votre projet.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-border bg-muted px-3.5 h-12">
            <svg className="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input
              placeholder={t('artisans', 'searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ArtisanSortOption)}
            className="h-12 rounded-xl border border-border bg-muted px-3.5 text-sm font-medium text-foreground outline-none focus:border-foreground"
          >
            <option value="rating">{t('artisans', 'topRated')}</option>
            <option value="distance">{t('artisans', 'closest')}</option>
            <option value="price">{t('artisans', 'cheapest')}</option>
          </select>
        </div>

        {/* Specialty Filters */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {SPECIALTIES.map((specialty) => (
            <button
              key={specialty.id}
              onClick={() => setSelectedSpecialty(specialty.id)}
              className={`flex items-center gap-2 rounded-full border px-4 h-9 whitespace-nowrap text-sm font-semibold transition-colors ${
                selectedSpecialty === specialty.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {specialty.id !== 'all' && <TradeIcon name={specialty.name} className="h-4 w-4" />}
              <span>{specialty.name}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          <b className="text-foreground">{filteredArtisans.length}</b>{' '}
          {filteredArtisans.length > 1 ? t('common', 'artisan') + 's' : t('common', 'artisan')}{' '}
          {filteredArtisans.length > 1 ? t('artisans', 'availablePlural') : t('artisans', 'available')}
        </div>

        {/* Artisans Grid */}
        {filteredArtisans.length === 0 ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('artisans', 'noArtisansFound')}</p>
              <Button onClick={() => { setSearchQuery(''); setSelectedSpecialty('all'); }}>
                {t('artisans', 'resetFilters')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArtisans.map((artisan, index) => (
              <article
                key={artisan.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Cover */}
                <div className={`h-24 bg-gradient-to-br ${COVER_GRADIENTS[index % COVER_GRADIENTS.length]}`} />

                <div className="flex flex-1 flex-col px-5 pb-5">
                  {/* Avatar */}
                  <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-card bg-muted font-display text-xl font-extrabold text-foreground shadow-md">
                    {artisan.firstName?.[0]}
                    {artisan.lastName?.[0]}
                  </div>

                  {/* Name + company */}
                  <h3 className="mt-3 flex items-center gap-1.5 font-display text-[17px] font-extrabold text-foreground">
                    {artisan.artisanProfile.companyName}
                    {artisan.artisanProfile.verified && (
                      <svg className="h-[17px] w-[17px] text-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 2 3.1-.3 1 3 2.5 1.9-1.3 2.8.6 3.1-3 1-1.6 2.7-3-.9-3 .9L6.6 18l-3-1 .6-3.1L2.9 11 5.4 9.1 6.4 6l3.1.3z" /><path d="M9 12l2 2 4-4" /></svg>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {artisan.firstName} {artisan.lastName}
                  </p>

                  {/* Rating */}
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating rating={artisan.artisanProfile.rating} readonly size="sm" />
                    <span className="text-sm text-muted-foreground">
                      ({artisan.artisanProfile.reviewCount} {t('artisans', 'reviews')})
                    </span>
                  </div>

                  {/* Specialties */}
                  <div className="my-3 flex flex-wrap gap-1.5">
                    {artisan.artisanProfile.specialties.slice(0, 3).map((specialty) => {
                      const spec = SPECIALTIES.find((s) => s.id === specialty);
                      return (
                        <span
                          key={specialty}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"
                        >
                          <TradeIcon name={spec?.name || specialty} className="h-3 w-3" /> {spec?.name || specialty}
                        </span>
                      );
                    })}
                    {artisan.artisanProfile.specialties.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                        +{artisan.artisanProfile.specialties.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /></svg>
                      {artisan.artisanProfile.city}, {artisan.artisanProfile.country}
                      {artisan.distance ? <span className="text-foreground">· {artisan.distance} km</span> : null}
                    </span>
                    {artisan.artisanProfile.hourlyRate && (
                      <span>{t('artisans', 'fromPrice') || 'dès'} {artisan.artisanProfile.hourlyRate} €/h</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/client/artisans/${artisan.id}`)}
                    >
                      {t('artisans', 'viewProfile')}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleContactArtisan(artisan.id)}
                    >
                      <Hammer className="mr-1.5 h-4 w-4" />
                      Faire appel à cet artisan
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
