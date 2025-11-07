'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { userApi } from '@/lib/api/user';
import { specialtyApi, Specialty } from '@/lib/api/specialty';
import { toast } from '@/lib/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';

export default function BecomeArtisanPage() {
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
        title: 'Déjà artisan',
        description: 'Vous avez déjà un profil artisan',
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
        title: 'Erreur',
        description: 'Impossible de charger les spécialités',
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
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins une spécialité',
        variant: 'destructive',
      });
      return;
    }

    if (formData.siret.length !== 14) {
      toast({
        title: 'Erreur',
        description: 'Le numéro SIRET doit contenir 14 chiffres',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.hourlyRate || formData.hourlyRate <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez indiquer votre tarif horaire',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await userApi.createArtisanProfile(formData);

      toast({
        title: 'Succès',
        description: 'Votre profil artisan a été créé avec succès !',
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
        title: 'Erreur',
        description: 'Erreur lors de la création du profil artisan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          ← Retour
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔨</span>
              </div>
              <div>
                <CardTitle className="text-2xl">Devenir Artisan</CardTitle>
                <CardDescription>
                  Créez votre profil professionnel et commencez à recevoir des demandes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Informations de l'entreprise
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nom de l'entreprise *
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Numéro SIRET * (14 chiffres)
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
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Description de vos services
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="Décrivez vos services, votre expérience, vos certifications..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Specialties */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Spécialités * (Sélectionnez au moins une)
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {specialties.map((specialty) => (
                    <button
                      key={specialty.id}
                      type="button"
                      onClick={() => handleSpecialtyToggle(specialty.id)}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.specialtyIds.includes(specialty.id)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      {specialty.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Zone d'intervention
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Adresse de base *
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
                  <p className="text-xs text-gray-500">
                    Cette adresse sera utilisée comme point de départ pour calculer la distance
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Rayon d'intervention (km)
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
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Tarif horaire (€) *
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
              <div className="pt-4 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Information</strong>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Une fois votre profil créé, vous pourrez recevoir des demandes de missions et
                    gérer vos interventions depuis votre tableau de bord artisan.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? 'Création en cours...' : 'Créer mon profil artisan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
