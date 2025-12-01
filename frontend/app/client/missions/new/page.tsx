'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { missionsApi } from '@/lib/api/missions';
import { userApi } from '@/lib/api/user';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  siret?: string;
  vatNumber?: string;
}

export default function NewMissionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [useDifferentBilling, setUseDifferentBilling] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
    // B2B fields
    purchaseOrderNumber: '',
    internalReference: '',
    billingCompanyName: '',
    billingAddress: '',
    billingVatNumber: '',
  });

  useEffect(() => {
    loadClientProfile();
  }, []);

  const loadClientProfile = async () => {
    try {
      const profile = await userApi.getClientProfile();
      setClientProfile(profile);
      // Pre-fill billing info from profile
      if (profile.clientType === 'PROFESSIONAL') {
        setFormData((prev) => ({
          ...prev,
          billingCompanyName: profile.companyName || '',
          billingVatNumber: profile.vatNumber || '',
        }));
      }
    } catch (error) {
      console.error('Error loading client profile:', error);
    }
  };

  const isProfessional = clientProfile?.clientType === 'PROFESSIONAL';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await missionsApi.uploadPhoto(file);
        return result.url;
      });
      const urls = await Promise.all(uploadPromises);
      setBeforePhotos((prev) => [...prev, ...urls]);
      toast({
        title: t('common', 'success'),
        description: t('missions', 'photosUploaded') || 'Photos téléchargées',
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: t('common', 'error'),
        description: t('missions', 'photoUploadError') || 'Erreur lors du téléchargement',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
  };

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

      const missionData: Record<string, unknown> = {
        type: formData.type,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        latitude: coords.lat,
        longitude: coords.lng,
        clientBudget: formData.clientBudget ? parseFloat(formData.clientBudget) : undefined,
        scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor) : undefined,
        beforePhotos: beforePhotos.length > 0 ? beforePhotos : undefined,
      };

      // Add B2B fields only for professional clients
      if (isProfessional) {
        if (formData.purchaseOrderNumber) {
          missionData.purchaseOrderNumber = formData.purchaseOrderNumber;
        }
        if (formData.internalReference) {
          missionData.internalReference = formData.internalReference;
        }
        if (useDifferentBilling) {
          if (formData.billingCompanyName) {
            missionData.billingCompanyName = formData.billingCompanyName;
          }
          if (formData.billingAddress) {
            missionData.billingAddress = formData.billingAddress;
          }
          if (formData.billingVatNumber) {
            missionData.billingVatNumber = formData.billingVatNumber;
          }
        }
      }

      const mission = await missionsApi.create(missionData);
      router.push(`/client/missions/${mission.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('common', 'error'),
        description: err.response?.data?.message || t('missions', 'creationError'),
        variant: 'destructive',
      });
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
          <h1 className="text-3xl font-bold text-gray-900">{t('missions', 'newRequest')}</h1>
          <p className="text-gray-600 mt-2">
            {t('missions', 'createRequestSteps')}
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
              {t('missions', 'categoryStep')}
            </span>
            <span className={step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
              {t('missions', 'detailsStep')}
            </span>
            <span className={step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
              {t('missions', 'confirmationStep')}
            </span>
          </div>
        </div>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('missions', 'requestNature')}</CardTitle>
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
                <CardTitle>{t('missions', 'requestDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('missions', 'requestType')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'EMERGENCY' })}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.type === 'EMERGENCY'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <span className="text-2xl">🚨</span>
                      <p className={`font-medium ${formData.type === 'EMERGENCY' ? 'text-red-700' : 'text-gray-900'}`}>
                        {t('missions', 'emergency') || 'Urgence'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('emergency', 'immediate') || 'Intervention immédiate'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'SCHEDULED' })}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.type === 'SCHEDULED'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-2xl">📅</span>
                      <p className={`font-medium ${formData.type === 'SCHEDULED' ? 'text-blue-700' : 'text-gray-900'}`}>
                        {t('missions', 'scheduled') || 'Planifiée'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('emergency', 'chooseDate') || 'Choisir une date'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'QUOTE' })}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.type === 'QUOTE'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <span className="text-2xl">📝</span>
                      <p className={`font-medium ${formData.type === 'QUOTE' ? 'text-green-700' : 'text-gray-900'}`}>
                        {t('missions', 'quote') || 'Devis'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('emergency', 'getQuote') || 'Demander un devis'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Emergency Alert */}
                {formData.type === 'EMERGENCY' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-red-500 text-xl">⚡</span>
                      <div>
                        <h4 className="font-semibold text-red-800">
                          {t('emergency', 'urgentRequest') || 'Demande Urgente'}
                        </h4>
                        <p className="text-sm text-red-700 mt-1">
                          {t('emergency', 'urgentDesc') ||
                            'Votre demande sera envoyée immédiatement aux artisans disponibles à proximité. Des frais supplémentaires peuvent s\'appliquer pour les interventions en urgence.'}
                        </p>
                        <ul className="text-sm text-red-600 mt-2 space-y-1">
                          <li>• {t('emergency', 'notifyNearby') || 'Notification aux artisans proches'}</li>
                          <li>• {t('emergency', 'fasterResponse') || 'Réponse prioritaire'}</li>
                          <li>• {t('emergency', 'extraFees') || 'Tarif urgence applicable'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('missions', 'requestTitle')} *
                  </label>
                  <Input
                    required
                    placeholder={t('missions', 'titlePlaceholder')}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('missions', 'detailedDescription')} *
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder={t('missions', 'descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('common', 'address')} *
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
                      {t('common', 'city')} *
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
                      {t('common', 'postalCode')} *
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
                      {t('common', 'country')} *
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
                      {t('missions', 'desiredDate')}
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
                    {t('missions', 'indicativeBudget')}
                  </label>
                  <Input
                    type="number"
                    placeholder="150"
                    value={formData.clientBudget}
                    onChange={(e) => setFormData({ ...formData, clientBudget: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('missions', 'budgetHelper')}
                  </p>
                </div>

                {/* Photos Avant - Before Photos */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📷</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('missions', 'beforePhotos') || 'Photos avant travaux'}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('missions', 'beforePhotosHelper') || 'Ajoutez des photos pour montrer l\'état actuel du problème'}
                  </p>

                  {/* Photo Grid */}
                  {beforePhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {beforePhotos.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        {uploadingPhoto ? (
                          <span className="text-gray-500">
                            {t('common', 'uploading') || 'Téléchargement...'}
                          </span>
                        ) : (
                          <>
                            <span>📤</span>
                            <span className="text-gray-700">
                              {t('missions', 'addPhotos') || 'Ajouter des photos'}
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                    <span className="text-sm text-gray-500">
                      {beforePhotos.length}/5 photos
                    </span>
                  </div>
                </div>

                {/* B2B Section - Only for professional clients */}
                {isProfessional && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">🏢</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t('missions', 'professionalInfo') || 'Informations professionnelles'}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Purchase Order Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('missions', 'purchaseOrderNumber') || 'N° Bon de commande'}
                        </label>
                        <Input
                          placeholder="BC-2024-001"
                          value={formData.purchaseOrderNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, purchaseOrderNumber: e.target.value })
                          }
                        />
                      </div>

                      {/* Internal Reference */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('missions', 'internalReference') || 'Référence interne'}
                        </label>
                        <Input
                          placeholder="REF-MAINT-2024"
                          value={formData.internalReference}
                          onChange={(e) =>
                            setFormData({ ...formData, internalReference: e.target.value })
                          }
                        />
                      </div>

                      {/* Different Billing Address Toggle */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="differentBilling"
                          checked={useDifferentBilling}
                          onChange={(e) => setUseDifferentBilling(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="differentBilling" className="text-sm text-gray-700">
                          {t('missions', 'differentBillingAddress') ||
                            'Utiliser une adresse de facturation différente'}
                        </label>
                      </div>

                      {/* Billing Info (conditional) */}
                      {useDifferentBilling && (
                        <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('missions', 'billingCompanyName') || 'Raison sociale facturation'}
                            </label>
                            <Input
                              placeholder={clientProfile?.companyName || 'Nom de la société'}
                              value={formData.billingCompanyName}
                              onChange={(e) =>
                                setFormData({ ...formData, billingCompanyName: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('missions', 'billingAddress') || 'Adresse de facturation'}
                            </label>
                            <Input
                              placeholder="123 Rue du Commerce, 1234 Luxembourg"
                              value={formData.billingAddress}
                              onChange={(e) =>
                                setFormData({ ...formData, billingAddress: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('missions', 'billingVatNumber') || 'N° TVA facturation'}
                            </label>
                            <Input
                              placeholder={clientProfile?.vatNumber || 'LU12345678'}
                              value={formData.billingVatNumber}
                              onChange={(e) =>
                                setFormData({ ...formData, billingVatNumber: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    {t('common', 'back')}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {t('common', 'continue')}
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
              <CardTitle>{t('missions', 'confirmRequest')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-sm text-gray-600">{t('common', 'category')}:</span>
                  <p className="font-semibold">{formData.category}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t('missions', 'title')}:</span>
                  <p className="font-semibold">{formData.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t('common', 'description')}:</span>
                  <p className="text-gray-900">{formData.description}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t('common', 'address')}:</span>
                  <p className="text-gray-900">
                    {formData.address}, {formData.postalCode} {formData.city}
                  </p>
                </div>
                {formData.clientBudget && (
                  <div>
                    <span className="text-sm text-gray-600">{t('missions', 'indicativeBudget')}:</span>
                    <p className="font-semibold">{formData.clientBudget}€</p>
                  </div>
                )}

                {/* B2B Info Summary */}
                {isProfessional && (formData.purchaseOrderNumber || formData.internalReference) && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium text-blue-600 mb-2">
                      🏢 {t('missions', 'professionalInfo') || 'Informations professionnelles'}
                    </p>
                    {formData.purchaseOrderNumber && (
                      <div>
                        <span className="text-sm text-gray-600">
                          {t('missions', 'purchaseOrderNumber') || 'N° Bon de commande'}:
                        </span>
                        <p className="font-semibold">{formData.purchaseOrderNumber}</p>
                      </div>
                    )}
                    {formData.internalReference && (
                      <div>
                        <span className="text-sm text-gray-600">
                          {t('missions', 'internalReference') || 'Référence interne'}:
                        </span>
                        <p className="font-semibold">{formData.internalReference}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Billing Info Summary */}
                {useDifferentBilling && formData.billingCompanyName && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      📄 {t('missions', 'billingInfo') || 'Informations de facturation'}
                    </p>
                    <p className="font-semibold">{formData.billingCompanyName}</p>
                    {formData.billingAddress && (
                      <p className="text-gray-600 text-sm">{formData.billingAddress}</p>
                    )}
                    {formData.billingVatNumber && (
                      <p className="text-gray-600 text-sm">TVA: {formData.billingVatNumber}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">{t('missions', 'nextSteps')}:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ {t('missions', 'step1')}</li>
                  <li>✓ {t('missions', 'step2')}</li>
                  <li>✓ {t('missions', 'step3')}</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  {t('common', 'back')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? t('missions', 'creating') : t('missions', 'createRequest')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
