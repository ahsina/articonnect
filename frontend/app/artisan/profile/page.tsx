'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ArtisanProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    siret: '',
    description: '',
    specialties: [] as string[],
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Luxembourg',
    serviceRadius: '20',
    hourlyRate: '',
  });

  const SPECIALTIES = [
    { id: 'plomberie', name: t('artisan', 'plumbing'), icon: '🔧' },
    { id: 'electricite', name: t('artisan', 'electricity'), icon: '⚡' },
    { id: 'peinture', name: t('artisan', 'painting'), icon: '🎨' },
    { id: 'menuiserie', name: t('artisan', 'carpentry'), icon: '🪚' },
    { id: 'maconnerie', name: t('artisan', 'masonry'), icon: '🧱' },
    { id: 'jardinage', name: t('artisan', 'gardening'), icon: '🌿' },
    { id: 'climatisation', name: t('artisan', 'airConditioning'), icon: '❄️' },
    { id: 'serrurerie', name: t('artisan', 'locksmith'), icon: '🔐' },
  ];

  const handleSpecialtyToggle = (specialtyId: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialtyId)
        ? prev.specialties.filter((s) => s !== specialtyId)
        : [...prev.specialties, specialtyId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.companyName || !formData.siret) {
      setError(t('artisan', 'companyRequired'));
      return;
    }

    if (formData.specialties.length === 0) {
      setError(t('artisan', 'selectSpecialty'));
      return;
    }

    setLoading(true);
    try {
      // TODO: API call to create/update artisan profile
      // await userApi.createArtisanProfile(formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push('/artisan/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('common', 'error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          {isSetup && (
            <Badge variant="info" className="mb-4">
              {t('artisan', 'initialSetup')}
            </Badge>
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            {isSetup ? t('artisan', 'completeProfile') : t('artisan', 'myProfile')}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSetup
              ? t('artisan', 'setupDescription')
              : t('artisan', 'manageInfo')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Company Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('artisan', 'companyInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('artisan', 'companyName')} *
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="Ex: Plomberie Martin"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('artisan', 'siret')} *
                  </label>
                  <Input
                    value={formData.siret}
                    onChange={(e) =>
                      setFormData({ ...formData, siret: e.target.value })
                    }
                    placeholder="123 456 789 00012"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth', 'phone')}
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+352 123 456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('artisan', 'businessDescription')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez votre activité, votre expérience..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('artisan', 'specialties')} *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SPECIALTIES.map((specialty) => (
                  <button
                    key={specialty.id}
                    type="button"
                    onClick={() => handleSpecialtyToggle(specialty.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.specialties.includes(specialty.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{specialty.icon}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {specialty.name}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Service Area */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('artisan', 'serviceArea')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('artisan', 'city')}
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Luxembourg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('artisan', 'postalCode')}
                  </label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="L-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('artisan', 'country')}
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="France">France</option>
                    <option value="Belgium">Belgique</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('artisan', 'serviceRadius')}
                </label>
                <Input
                  type="number"
                  value={formData.serviceRadius}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceRadius: e.target.value })
                  }
                  min="1"
                  max="100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('artisan', 'maxDistance')} : {formData.serviceRadius} km
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('artisan', 'pricing')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('artisan', 'hourlyRate')}
                </label>
                <Input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourlyRate: e.target.value })
                  }
                  placeholder="50"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('artisan', 'rateNegotiable')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            {!isSetup && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/artisan/dashboard')}
              >
                {t('common', 'cancel')}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading
                ? t('artisan', 'saving')
                : isSetup
                ? t('artisan', 'finishSetup')
                : t('artisan', 'saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
