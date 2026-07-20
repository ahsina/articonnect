'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hammer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { userApi } from '@/lib/api/user';
import { specialtyApi, Specialty } from '@/lib/api/specialty';
import { toast } from '@/lib/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BecomeArtisanPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [formData, setFormData] = useState({
    companyName: '',
    siret: '',
    description: '',
    baseAddress: '',
    latitude: 49.6116,  // Luxembourg default
    longitude: 6.1319,
    serviceRadius: 20,
    hourlyRate: 0,
    specialtyIds: [] as string[],
  });

  useEffect(() => {
    // Check if user is already an artisan
    if (user?.role === 'ARTISAN') {
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
      router.push('/artisan/dashboard');
      return;
    }

    loadSpecialties();
  }, [user, router]);

  const loadSpecialties = async () => {
    try {
      const data = await specialtyApi.getAll();
      setSpecialties(data);
    } catch (error) {
      console.error('Error loading specialties:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    }
  };

  const handleSpecialtyToggle = (specialtyId: string) => {
    setFormData((prev) => ({
      ...prev,
      specialtyIds: prev.specialtyIds.includes(specialtyId)
        ? prev.specialtyIds.filter((id) => id !== specialtyId)
        : [...prev.specialtyIds, specialtyId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.specialtyIds.length === 0) {
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
      return;
    }

    if (formData.siret.length !== 14) {
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
      return;
    }

    if (!formData.hourlyRate || formData.hourlyRate <= 0) {
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await userApi.createArtisanProfile(formData);

      toast({
        title: t('common', 'success'),
        description: t('common', 'success'),
        variant: 'success',
      });

      // Refresh user to update role
      await refreshUser();

      // Redirect to artisan dashboard
      setTimeout(() => {
        router.push('/artisan/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error creating artisan profile:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-3">
          {t('common', 'back')}
        </Button>

        <Card>
          {/* Hero header */}
          <div className="flex items-center gap-4 border-b border-border p-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Hammer className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                {t('common', 'becomeArtisan')}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t('common', 'becomeArtisanDescription')}
              </p>
            </div>
          </div>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('common', 'companyInfo')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      {t('artisan', 'companyName')} *
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: Plomberie Dupont"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({ ...formData, companyName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      {t('artisan', 'siret')} *
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={14}
                      placeholder="12345678901234"
                      value={formData.siret}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          siret: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">14 chiffres</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    {t('common', 'description')}
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Specialties */}
              <div className="space-y-4">
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('artisan', 'specialties')} *
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {specialties.map((specialty) => {
                    const active = formData.specialtyIds.includes(specialty.id);
                    return (
                      <button
                        key={specialty.id}
                        type="button"
                        onClick={() => handleSpecialtyToggle(specialty.id)}
                        className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${
                          active
                            ? 'border-foreground bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:border-foreground'
                        }`}
                      >
                        {specialty.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('common', 'interventionZone')}
                </h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    {t('common', 'baseAddress')} *
                  </label>
                  <Input
                    type="text"
                    placeholder="10 Rue de la Gare, Luxembourg"
                    value={formData.baseAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, baseAddress: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      {t('artisan', 'serviceRadius')}
                    </label>
                    <Input
                      type="number"
                      min="5"
                      max="100"
                      value={formData.serviceRadius}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serviceRadius: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">5 – 100 km</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      {t('artisan', 'hourlyRate')} *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.5"
                      placeholder="Ex: 45"
                      value={formData.hourlyRate || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hourlyRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates (hidden but set to Luxembourg default) */}
              <input type="hidden" value={formData.latitude} />
              <input type="hidden" value={formData.longitude} />

              {/* Submit */}
              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? t('common', 'creating') : t('common', 'createArtisanProfile')}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  En continuant, vous acceptez les CGU professionnelles de Krafolt. Votre SIRET sera vérifié avant activation.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
