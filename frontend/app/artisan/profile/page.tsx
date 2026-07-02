'use client';

import { TradeIcon } from '@/components/shared/TradeIcon';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { artisanApi, ArtisanProfile, UpdateArtisanProfileDto, Specialty } from '@/lib/api/artisan';
import { userApi } from '@/lib/api/user';
import { useToast } from '@/hooks/use-toast';
import { translateBadgeType } from '@/lib/utils/enum-translations';

function ArtisanProfileContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  const { toast } = useToast();

  const [profile, setProfile] = useState<ArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'business' | 'badges'>('overview');
  const [badges, setBadges] = useState<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
    type: string;
  }>>([]);

  const [editForm, setEditForm] = useState<UpdateArtisanProfileDto>({});
  const [setupForm, setSetupForm] = useState({
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
    { id: 'plomberie', name: t('artisan', 'plumbing') || 'Plumbing', icon: '🔧' },
    { id: 'electricite', name: t('artisan', 'electricity') || 'Electrical', icon: '⚡' },
    { id: 'peinture', name: t('artisan', 'painting') || 'Painting', icon: '🎨' },
    { id: 'menuiserie', name: t('artisan', 'carpentry') || 'Carpentry', icon: '🪚' },
    { id: 'maconnerie', name: t('artisan', 'masonry') || 'Masonry', icon: '🧱' },
    { id: 'jardinage', name: t('artisan', 'gardening') || 'Gardening', icon: '🌿' },
    { id: 'climatisation', name: t('artisan', 'airConditioning') || 'HVAC', icon: '❄️' },
    { id: 'serrurerie', name: t('artisan', 'locksmith') || 'Locksmith', icon: '🔐' },
  ];

  useEffect(() => {
    if (!isSetup) {
      loadProfile();
      loadBadges();
    } else {
      setLoading(false);
    }
  }, [isSetup]);

  const loadBadges = async () => {
    try {
      // Try to load badges from API
      const response = await fetch('/api/badges/my-badges');
      if (response.ok) {
        const data = await response.json();
        setBadges(data);
      } else {
        // Use demo badges if API not available
        setBadges([
          { id: '1', name: 'First Mission', description: 'Completed your first mission', icon: '🎯', earnedAt: '2024-01-15', type: 'MILESTONE' },
          { id: '2', name: 'Top Rated', description: 'Maintained 4.5+ rating', icon: '⭐', earnedAt: '2024-02-20', type: 'ACHIEVEMENT' },
          { id: '3', name: '10 Missions', description: 'Completed 10 missions', icon: '🏆', earnedAt: '2024-03-10', type: 'MILESTONE' },
          { id: '4', name: 'Quick Responder', description: 'Average response time under 2 hours', icon: '⚡', earnedAt: '2024-04-05', type: 'ACHIEVEMENT' },
        ]);
      }
    } catch (error) {
      console.log('Using demo badges');
      setBadges([
        { id: '1', name: 'First Mission', description: 'Completed your first mission', icon: '🎯', earnedAt: '2024-01-15', type: 'MILESTONE' },
        { id: '2', name: 'Top Rated', description: 'Maintained 4.5+ rating', icon: '⭐', earnedAt: '2024-02-20', type: 'ACHIEVEMENT' },
        { id: '3', name: '10 Missions', description: 'Completed 10 missions', icon: '🏆', earnedAt: '2024-03-10', type: 'MILESTONE' },
        { id: '4', name: 'Quick Responder', description: 'Average response time under 2 hours', icon: '⚡', earnedAt: '2024-04-05', type: 'ACHIEVEMENT' },
      ]);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await artisanApi.getMyProfile();
      setProfile(data);
      setEditForm({
        companyName: data.companyName,
        description: data.description || '',
        website: data.website || '',
        serviceRadius: data.serviceRadius,
        baseAddress: data.baseAddress,
        hourlyRate: data.hourlyRate,
        emergencyRate: data.emergencyRate,
        available: data.available,
        specialtyIds: data.specialties?.map((s) => s.id) || [],
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      // If no profile exists, show setup mode
      setActiveTab('edit');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await artisanApi.updateProfile(editForm);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'profileUpdated') || 'Profile updated successfully',
        variant: 'success',
      });
      loadProfile();
      setActiveTab('overview');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'profileSaveError') || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      await artisanApi.toggleAvailability(!profile.available);
      toast({
        title: t('common', 'success') || 'Success',
        description: profile.available
          ? t('artisan', 'markedUnavailable') || 'Marked as unavailable'
          : t('artisan', 'markedAvailable') || 'Marked as available',
        variant: 'success',
      });
      loadProfile();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleSpecialtyToggle = (specialtyId: string) => {
    setSetupForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialtyId)
        ? prev.specialties.filter((s) => s !== specialtyId)
        : [...prev.specialties, specialtyId],
    }));
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!setupForm.companyName || !setupForm.siret) {
      setError(t('artisan', 'companyRequired') || 'Company name and SIRET are required');
      return;
    }

    if (setupForm.specialties.length === 0) {
      setError(t('artisan', 'selectSpecialty') || 'Please select at least one specialty');
      return;
    }

    setSaving(true);
    try {
      const addressParts = [
        setupForm.address,
        setupForm.city,
        setupForm.postalCode,
        setupForm.country,
      ].filter(Boolean);

      const baseAddress =
        addressParts.length > 0 ? addressParts.join(', ') : setupForm.country || 'Luxembourg';

      const defaultCoords = {
        Luxembourg: { lat: 49.6116, lng: 6.1319 },
        France: { lat: 48.8566, lng: 2.3522 },
        Belgium: { lat: 50.8503, lng: 4.3517 },
      };

      const coords =
        defaultCoords[setupForm.country as keyof typeof defaultCoords] || defaultCoords.Luxembourg;

      await userApi.createArtisanProfile({
        companyName: setupForm.companyName,
        siret: setupForm.siret,
        description: setupForm.description || undefined,
        baseAddress,
        latitude: coords.lat,
        longitude: coords.lng,
        serviceRadius: setupForm.serviceRadius ? parseInt(setupForm.serviceRadius) : undefined,
        hourlyRate: setupForm.hourlyRate ? parseFloat(setupForm.hourlyRate) : undefined,
        specialtyIds: setupForm.specialties.length > 0 ? setupForm.specialties : undefined,
      });

      toast({
        title: t('artisan', 'profileSaved') || 'Profile Saved',
        description:
          t('artisan', 'profileSavedDescription') || 'Your artisan profile has been created',
        variant: 'success',
      });

      router.push('/artisan/dashboard');
    } catch (err: any) {
      console.error('Profile creation error:', err);
      const errorMessage =
        err.response?.data?.message || t('common', 'error') || 'An error occurred';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  // Setup mode for new artisans
  if (isSetup || !profile) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            {isSetup && (
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                {t('artisan', 'initialSetup') || 'Initial Setup'}
              </Badge>
            )}
            <h1 className="text-3xl font-bold text-foreground">
              {isSetup
                ? t('artisan', 'completeProfile') || 'Complete Your Profile'
                : t('artisan', 'myProfile') || 'My Profile'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isSetup
                ? t('artisan', 'setupDescription') ||
                  'Set up your artisan profile to start receiving missions'
                : t('artisan', 'manageInfo') || 'Manage your profile information'}
            </p>
          </div>

          <form onSubmit={handleSetupSubmit}>
            {/* Company Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('artisan', 'companyInfo') || 'Company Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('artisan', 'companyName') || 'Company Name'} *
                  </label>
                  <Input
                    value={setupForm.companyName}
                    onChange={(e) => setSetupForm({ ...setupForm, companyName: e.target.value })}
                    placeholder={t('artisanProfile', 'companyNamePlaceholder')}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('artisan', 'siret') || 'SIRET / Business ID'} *
                    </label>
                    <Input
                      value={setupForm.siret}
                      onChange={(e) => setSetupForm({ ...setupForm, siret: e.target.value })}
                      placeholder="123 456 789 00012"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('auth', 'phone') || 'Phone'}
                    </label>
                    <Input
                      value={setupForm.phone}
                      onChange={(e) => setSetupForm({ ...setupForm, phone: e.target.value })}
                      placeholder="+352 123 456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('artisan', 'businessDescription') || 'Business Description'}
                  </label>
                  <textarea
                    value={setupForm.description}
                    onChange={(e) => setSetupForm({ ...setupForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t('artisanProfile', 'descriptionPlaceholder')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Specialties */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('artisan', 'specialties') || 'Specialties'} *</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SPECIALTIES.map((specialty) => (
                    <button
                      key={specialty.id}
                      type="button"
                      onClick={() => handleSpecialtyToggle(specialty.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        setupForm.specialties.includes(specialty.id)
                          ? 'border-blue-600 bg-primary/10'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <TradeIcon name={specialty.name} className="mb-2 h-7 w-7" />
                      <div className="text-sm font-medium text-foreground">{specialty.name}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Area */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('artisan', 'serviceArea') || 'Service Area'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('artisan', 'city') || 'City'}
                    </label>
                    <Input
                      value={setupForm.city}
                      onChange={(e) => setSetupForm({ ...setupForm, city: e.target.value })}
                      placeholder="Luxembourg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('artisan', 'postalCode') || 'Postal Code'}
                    </label>
                    <Input
                      value={setupForm.postalCode}
                      onChange={(e) => setSetupForm({ ...setupForm, postalCode: e.target.value })}
                      placeholder="L-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('artisan', 'country') || 'Country'}
                    </label>
                    <select
                      value={setupForm.country}
                      onChange={(e) => setSetupForm({ ...setupForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="France">France</option>
                      <option value="Belgium">Belgium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('artisan', 'serviceRadius') || 'Service Radius (km)'}
                  </label>
                  <Input
                    type="number"
                    value={setupForm.serviceRadius}
                    onChange={(e) => setSetupForm({ ...setupForm, serviceRadius: e.target.value })}
                    min="1"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('artisan', 'maxDistance') || 'Maximum distance'}: {setupForm.serviceRadius}{' '}
                    km
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('artisan', 'pricing') || 'Pricing'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('artisan', 'hourlyRate') || 'Hourly Rate (EUR)'}
                  </label>
                  <Input
                    type="number"
                    value={setupForm.hourlyRate}
                    onChange={(e) => setSetupForm({ ...setupForm, hourlyRate: e.target.value })}
                    placeholder="50"
                    min="0"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('artisan', 'rateNegotiable') ||
                      'This rate is indicative and can be adjusted per mission'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-4 justify-end">
              {!isSetup && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/artisan/dashboard')}
                >
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving
                  ? t('artisan', 'saving') || 'Saving...'
                  : isSetup
                    ? t('artisan', 'finishSetup') || 'Complete Setup'
                    : t('artisan', 'saveChanges') || 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Existing profile view
  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('artisan', 'myProfile') || 'My Profile'}
          </h1>
          <p className="text-muted-foreground">
            {t('artisan', 'manageProfile') || 'Manage your artisan profile and settings'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={profile.available ? 'default' : 'outline'}
            onClick={handleToggleAvailability}
            className={profile.available ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {profile.available ? `✓ ${t('artisanProfile', 'available')}` : t('artisanProfile', 'unavailable')}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{profile.rating.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">{t('artisan', 'rating') || 'Rating'}</div>
              <div className="text-xs text-muted-foreground">{profile.reviewCount} {t('artisanProfile', 'reviews')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{profile.missionCount}</div>
              <div className="text-sm text-muted-foreground">{t('artisan', 'missions') || 'Missions'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{profile.serviceRadius}km</div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'serviceRadius') || 'Service Area'}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {profile.certifications?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'certifications') || 'Certifications'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
        >
          {t('artisan', 'overview') || 'Overview'}
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 font-medium ${activeTab === 'badges' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
        >
          {t('artisan', 'badges') || 'Badges'} ({badges.length})
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 font-medium ${activeTab === 'edit' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
        >
          {t('artisan', 'editProfile') || 'Edit Profile'}
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2 font-medium ${activeTab === 'business' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
        >
          {t('artisan', 'businessInfo') || 'Business Info'}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'profileInfo') || 'Profile Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  {t('artisan', 'businessName') || 'Business Name'}
                </span>
                <span className="font-medium">{profile.companyName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  {t('artisan', 'baseAddress') || 'Base Address'}
                </span>
                <span className="font-medium">{profile.baseAddress || t('artisanProfile', 'notSet')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">{t('artisan', 'hourlyRate') || 'Hourly Rate'}</span>
                <span className="font-medium">EUR {profile.hourlyRate || 0}/hr</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  {t('artisan', 'emergencyRate') || 'Emergency Rate'}
                </span>
                <span className="font-medium">EUR {profile.emergencyRate || 0}/hr</span>
              </div>
              {profile.website && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">{t('artisan', 'website') || 'Website'}</span>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'specialties') || 'Specialties'}</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.specialties && profile.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <Badge key={specialty.id} variant="secondary" className="px-3 py-1">
                      <TradeIcon name={specialty.name} className="mr-1 inline h-3.5 w-3.5" />
                      {specialty.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {t('artisan', 'noSpecialties') || 'No specialties added yet'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('artisan', 'description') || 'Description'}</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.description ? (
                <p className="text-foreground whitespace-pre-wrap">{profile.description}</p>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {t('artisan', 'noDescription') || 'No description added yet'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('artisan', 'verificationStatus') || 'Verification Status'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-lg border ${profile.businessVerified ? 'bg-green-100 border-green-500/30' : 'bg-amber-100 border-amber-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{profile.businessVerified ? '✓' : '⏳'}</span>
                    <div>
                      <div className="font-medium">
                        {t('artisan', 'businessVerification') || 'Business Verification'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.businessVerified
                          ? t('artisan', 'verified') || 'Verified'
                          : profile.businessVerificationStatus || 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg border ${profile.stripeOnboarded ? 'bg-green-100 border-green-500/30' : 'bg-amber-100 border-amber-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{profile.stripeOnboarded ? '✓' : '⏳'}</span>
                    <div>
                      <div className="font-medium">
                        {t('artisan', 'paymentSetup') || 'Payment Setup'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.stripeOnboarded
                          ? t('artisan', 'configured') || 'Configured'
                          : t('artisan', 'pendingSetup') || 'Pending Setup'}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg border ${profile.certifications && profile.certifications.length > 0 ? 'bg-green-100 border-green-500/30' : 'bg-background border-border'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {profile.certifications && profile.certifications.length > 0 ? '✓' : '📜'}
                    </span>
                    <div>
                      <div className="font-medium">
                        {t('artisan', 'certifications') || 'Certifications'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.certifications?.length || 0}{' '}
                        {t('artisan', 'uploaded') || 'uploaded'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'yourBadges') || 'Your Badges'}</CardTitle>
              <CardDescription>
                {t('artisan', 'badgesDesc') || 'Badges you have earned for your achievements'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-4">🏅</div>
                  <p>{t('artisan', 'noBadges') || 'No badges earned yet'}</p>
                  <p className="text-sm mt-2">
                    {t('artisan', 'completeMissions') || 'Complete missions and maintain high ratings to earn badges'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="p-4 bg-muted border border-amber-200 rounded-lg text-center hover:shadow-md transition-shadow"
                    >
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <div className="font-semibold text-foreground">{badge.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{badge.description}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(badge.earnedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </div>
                      <Badge className="mt-2 text-xs" variant="secondary">
                        {translateBadgeType(badge.type, t)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badge Progress */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'upcomingBadges') || 'Upcoming Badges'}</CardTitle>
              <CardDescription>
                {t('artisan', 'upcomingBadgesDesc') || 'Badges you can earn next'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-background rounded-lg">
                  <div className="text-3xl opacity-50">🌟</div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t('artisanProfile', 'badge50Missions')}</div>
                    <div className="text-sm text-muted-foreground">{t('artisanProfile', 'badge50MissionsDesc')}</div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((profile?.missionCount || 0) / 50 * 100, 100)}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{profile?.missionCount || 0} / 50</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-background rounded-lg">
                  <div className="text-3xl opacity-50">💎</div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t('artisanProfile', 'badgePerfectRating')}</div>
                    <div className="text-sm text-muted-foreground">{t('artisanProfile', 'badgePerfectRatingDesc')}</div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: profile?.rating === 5 ? '100%' : '0%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-background rounded-lg">
                  <div className="text-3xl opacity-50">🔥</div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t('artisanProfile', 'badgeVerifiedExpert')}</div>
                    <div className="text-sm text-muted-foreground">{t('artisanProfile', 'badgeVerifiedExpertDesc')}</div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-600 rounded-full" style={{ width: `${Math.min((profile?.certifications?.length || 0) / 5 * 100, 100)}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{profile?.certifications?.length || 0} / 5</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'editProfile') || 'Edit Profile'}</CardTitle>
            <CardDescription>
              {t('artisan', 'editProfileDesc') || 'Update your public profile information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'businessName') || 'Business Name'}
                </label>
                <Input
                  value={editForm.companyName || ''}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'website') || 'Website'}
                </label>
                <Input
                  type="url"
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="https://"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('artisan', 'description') || 'Description'}
              </label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={
                  t('artisan', 'descriptionPlaceholder') ||
                  'Tell clients about your experience and services...'
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('artisan', 'baseAddress') || 'Base Address'}
              </label>
              <Input
                value={editForm.baseAddress || ''}
                onChange={(e) => setEditForm({ ...editForm, baseAddress: e.target.value })}
                placeholder={t('artisan', 'addressPlaceholder') || 'Your work base location'}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'serviceRadius') || 'Service Radius (km)'}
                </label>
                <Input
                  type="number"
                  value={editForm.serviceRadius || 20}
                  onChange={(e) =>
                    setEditForm({ ...editForm, serviceRadius: parseInt(e.target.value) })
                  }
                  min="1"
                  max="200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'hourlyRate') || 'Hourly Rate (EUR)'}
                </label>
                <Input
                  type="number"
                  value={editForm.hourlyRate || 0}
                  onChange={(e) =>
                    setEditForm({ ...editForm, hourlyRate: parseInt(e.target.value) })
                  }
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'emergencyRate') || 'Emergency Rate (EUR)'}
                </label>
                <Input
                  type="number"
                  value={editForm.emergencyRate || 0}
                  onChange={(e) =>
                    setEditForm({ ...editForm, emergencyRate: parseInt(e.target.value) })
                  }
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? t('common', 'saving') || 'Saving...'
                  : t('common', 'saveChanges') || 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Info Tab */}
      {activeTab === 'business' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'businessInfo') || 'Business Information'}</CardTitle>
            <CardDescription>
              {t('artisan', 'businessInfoDesc') || 'Your registered business details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    {t('artisan', 'siret') || 'SIRET Number'}
                  </div>
                  <div className="font-mono font-medium">{profile.siret}</div>
                </div>
                {profile.vatNumber && (
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      {t('artisan', 'vatNumber') || 'VAT Number'}
                    </div>
                    <div className="font-mono font-medium">{profile.vatNumber}</div>
                  </div>
                )}
                {profile.businessCountry && (
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      {t('artisan', 'country') || 'Country'}
                    </div>
                    <div className="font-medium">{profile.businessCountry}</div>
                  </div>
                )}
                {profile.insurance && (
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      {t('artisan', 'insurance') || 'Insurance'}
                    </div>
                    <div className="font-medium">{profile.insurance}</div>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <div className="font-medium text-primary">
                      {t('artisan', 'updateBusinessInfo') || 'Need to update business information?'}
                    </div>
                    <p className="text-sm text-primary mt-1">
                      {t('artisan', 'contactSupport') ||
                        'Contact our support team to make changes to your registered business details, SIRET, or VAT number.'}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      {t('common', 'contactSupport') || 'Contact Support'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ArtisanProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ArtisanProfileContent />
    </Suspense>
  );
}
