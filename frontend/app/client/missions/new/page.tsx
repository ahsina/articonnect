'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { missionsApi } from '@/lib/api/missions';

const CATEGORIES = [
  { id: 'plomberie', name: 'Plomberie', icon: '🔧' },
  { id: 'electricite', name: 'Électricité', icon: '⚡' },
  { id: 'menuiserie', name: 'Menuiserie', icon: '🪚' },
  { id: 'peinture', name: 'Peinture', icon: '🎨' },
  { id: 'serrurerie', name: 'Serrurerie', icon: '🔐' },
  { id: 'climatisation', name: 'Climatisation', icon: '❄️' },
  { id: 'chauffage', name: 'Chauffage', icon: '🔥' },
  { id: 'autre', name: 'Autre', icon: '🛠️' },
];

export default function NewMissionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'SCHEDULED',
    category: '',
    title: '',
    description: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'LU',
    latitude: 0,
    longitude: 0,
    scheduledFor: '',
    clientBudget: '',
  });

  const handleCategorySelect = (category: string) => {
    setFormData({ ...formData, category });
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Geocode address (simplified - in production use Google Maps Geocoding API)
      const coords = await geocodeAddress(
        `${formData.address}, ${formData.city}, ${formData.postalCode}`,
      );

      const missionData = {
        ...formData,
        latitude: coords.lat,
        longitude: coords.lng,
        clientBudget: formData.clientBudget ? parseFloat(formData.clientBudget) : undefined,
        scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor) : undefined,
      };

      const mission = await missionsApi.create(missionData);
      router.push(`/client/missions/${mission.id}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la création');
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string) => {
    // Use OpenStreetMap Nominatim API for geocoding
    // Free and suitable for Luxembourg addresses
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=lu,fr,be&limit=1`,
        {
          headers: {
            'User-Agent': 'ArtiConnect/1.0', // Required by Nominatim usage policy
          },
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }

      // Fallback to Luxembourg center if geocoding fails
      console.warn('Geocoding failed for address:', address);
      return {
        lat: 49.6116, // Luxembourg City center
        lng: 6.1319,
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      // Fallback to Luxembourg center on error
      return {
        lat: 49.6116,
        lng: 6.1319,
      };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nouvelle Demande</h1>
          <p className="text-gray-600 mt-2">
            Créez votre demande d'intervention en quelques étapes
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-1 w-24 mx-2 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
              Catégorie
            </span>
            <span className={step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
              Détails
            </span>
            <span className={step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
              Confirmation
            </span>
          </div>
        </div>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Quelle est la nature de votre demande ?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.name)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                  >
                    <div className="text-4xl mb-2">{cat.icon}</div>
                    <div className="font-semibold text-gray-900">{cat.name}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
            <Card>
              <CardHeader>
                <CardTitle>Détails de votre demande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de demande
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="EMERGENCY">Urgence (intervention immédiate)</option>
                    <option value="SCHEDULED">Planifiée</option>
                    <option value="QUOTE">Demande de devis</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre de la demande *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Fuite d'eau sous l'évier"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description détaillée *
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Décrivez votre problème en détail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse *
                  </label>
                  <Input
                    required
                    placeholder="15 Rue de la Gare"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ville *
                    </label>
                    <Input
                      required
                      placeholder="Luxembourg"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code Postal *
                    </label>
                    <Input
                      required
                      placeholder="1234"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pays *
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 h-10"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    >
                      <option value="LU">Luxembourg</option>
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                    </select>
                  </div>
                </div>

                {/* Scheduled Date */}
                {formData.type === 'SCHEDULED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date souhaitée
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduledFor}
                      onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                    />
                  </div>
                )}

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget indicatif (€)
                  </label>
                  <Input
                    type="number"
                    placeholder="150"
                    value={formData.clientBudget}
                    onChange={(e) => setFormData({ ...formData, clientBudget: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optionnel - Aide les artisans à vous faire une proposition adaptée
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Retour
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continuer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirmer votre demande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Catégorie:</span>
                  <p className="font-semibold">{formData.category}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Titre:</span>
                  <p className="font-semibold">{formData.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Description:</span>
                  <p className="text-gray-900">{formData.description}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Adresse:</span>
                  <p className="text-gray-900">
                    {formData.address}, {formData.postalCode} {formData.city}
                  </p>
                </div>
                {formData.clientBudget && (
                  <div>
                    <span className="text-sm text-gray-600">Budget indicatif:</span>
                    <p className="font-semibold">{formData.clientBudget}€</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Prochaines étapes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Votre demande sera envoyée aux artisans proches</li>
                  <li>✓ Vous recevrez des propositions rapidement</li>
                  <li>✓ Vous pourrez négocier et choisir le meilleur artisan</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Création en cours...' : 'Créer la demande'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
