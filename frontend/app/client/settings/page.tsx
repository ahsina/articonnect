'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { userApi } from '@/lib/api/user';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  siret?: string;
  vatNumber?: string;
  industry?: string;
  deferredPaymentEnabled?: boolean;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  missionUpdates: boolean;
  marketplaceAlerts: boolean;
  promotions: boolean;
}

const INDUSTRIES = [
  { value: 'Immobilier', key: 'industryRealEstate' },
  { value: 'Restauration', key: 'industryRestaurant' },
  { value: 'Commerce', key: 'industryCommerce' },
  { value: 'Services', key: 'industryServices' },
  { value: 'Industrie', key: 'industryIndustry' },
  { value: 'Construction', key: 'industryConstruction' },
  { value: 'Santé', key: 'industryHealth' },
  { value: 'Education', key: 'industryEducation' },
  { value: 'Transport', key: 'industryTransport' },
  { value: 'Autre', key: 'industryOther' },
];

export default function ClientSettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const handleExportData = async () => {
    try {
      const data = await userApi.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krafolt-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t('common', 'success'), description: t('privacy', 'exportDone') || 'Export téléchargé.' });
    } catch {
      toast({ title: t('common', 'error'), description: t('privacy', 'exportError') || 'Échec de l\'export.', variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t('privacy', 'deleteConfirm') || 'Supprimer définitivement votre compte ? Cette action déclenche l\'effacement de vos données (hors obligations légales de conservation).')) return;
    try {
      await userApi.requestAccountDeletion();
      toast({ title: t('common', 'success'), description: t('privacy', 'deleteRequested') || 'Demande enregistrée. Vous allez être déconnecté.' });
      setTimeout(() => logout(), 1500);
    } catch {
      toast({ title: t('common', 'error'), description: t('common', 'error'), variant: 'destructive' });
    }
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientProfile, setClientProfile] = useState<ClientProfile>({
    clientType: 'INDIVIDUAL',
    companyName: '',
    siret: '',
    vatNumber: '',
    industry: '',
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    missionUpdates: true,
    marketplaceAlerts: true,
    promotions: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await userApi.getProfile();
      if (profile.clientProfile) {
        setClientProfile({
          clientType: profile.clientProfile.clientType || 'INDIVIDUAL',
          companyName: profile.clientProfile.companyName || '',
          siret: profile.clientProfile.siret || '',
          vatNumber: profile.clientProfile.vatNumber || '',
          industry: profile.clientProfile.industry || '',
        });
      }
      // Load notification preferences from API if available
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await userApi.updateClientProfile(clientProfile);
      toast({
        title: t('common', 'success'),
        description: t('settings', 'profileUpdated'),
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setSaving(true);
    try {
      await userApi.updateNotificationPreferences(notifications);
      toast({
        title: t('common', 'success'),
        description: t('settings', 'preferencesUpdated'),
      });
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {t('common', 'back')}
        </button>

        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground mb-1.5">
          {t('settings', 'title')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('settings', 'pageSubtitle') || 'Gérez votre profil, votre sécurité, vos notifications et vos données personnelles.'}
        </p>

        <div className="space-y-5">
          {/* Account Type Card */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">{t('settings', 'accountType')}</CardTitle>
              <CardDescription>
                {t('settings', 'accountTypeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setClientProfile({ ...clientProfile, clientType: 'INDIVIDUAL' })}
                  className={`p-4 border-[1.5px] rounded-2xl text-left transition-colors ${
                    clientProfile.clientType === 'INDIVIDUAL'
                      ? 'border-foreground bg-muted'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="font-display font-bold">{t('settings', 'individual')}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{t('settings', 'individualDescription')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setClientProfile({ ...clientProfile, clientType: 'PROFESSIONAL' })}
                  className={`p-4 border-[1.5px] rounded-2xl text-left transition-colors ${
                    clientProfile.clientType === 'PROFESSIONAL'
                      ? 'border-foreground bg-muted'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="font-display font-bold">{t('settings', 'professional')}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{t('settings', 'professionalDescription')}</div>
                </button>
              </div>

              {clientProfile.clientType === 'PROFESSIONAL' && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-foreground">{t('settings', 'companyInfo')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('settings', 'companyName')} *
                      </label>
                      <Input
                        type="text"
                        value={clientProfile.companyName}
                        onChange={(e) =>
                          setClientProfile({ ...clientProfile, companyName: e.target.value })
                        }
                        placeholder={t('clientSettings', 'companyNamePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('settings', 'siret')} *
                      </label>
                      <Input
                        type="text"
                        value={clientProfile.siret}
                        onChange={(e) =>
                          setClientProfile({
                            ...clientProfile,
                            siret: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        placeholder="12345678901234"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('settings', 'vatNumber')}
                      </label>
                      <Input
                        type="text"
                        value={clientProfile.vatNumber}
                        onChange={(e) =>
                          setClientProfile({ ...clientProfile, vatNumber: e.target.value })
                        }
                        placeholder="LU12345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('settings', 'industry')}
                      </label>
                      <select
                        value={clientProfile.industry}
                        onChange={(e) =>
                          setClientProfile({ ...clientProfile, industry: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">{t('common', 'select')}</option>
                        {INDUSTRIES.map((ind) => (
                          <option key={ind.value} value={ind.value}>
                            {t('clientSettings', ind.key)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleProfileSave} disabled={saving}>
                  {saving ? t('common', 'saving') : t('common', 'save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">{t('settings', 'notifications')}</CardTitle>
              <CardDescription>{t('settings', 'notificationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-border">
                {([
                  ['emailNotifications', 'emailNotifications', 'emailNotificationsDesc'],
                  ['pushNotifications', 'pushNotifications', 'pushNotificationsDesc'],
                  ['smsNotifications', 'smsNotifications', 'smsNotificationsDesc'],
                  ['missionUpdates', 'missionUpdates', 'missionUpdatesDesc'],
                  ['marketplaceAlerts', 'marketplaceAlerts', 'marketplaceAlertsDesc'],
                  ['promotions', 'promotions', 'promotionsDesc'],
                ] as const).map(([key, titleKey, descKey]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-4 py-4 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{t('settings', titleKey)}</div>
                      <div className="text-sm text-muted-foreground">{t('settings', descKey)}</div>
                    </div>
                    <div className="relative shrink-0">
                      <input
                        type="checkbox"
                        checked={notifications[key]}
                        onChange={(e) =>
                          setNotifications({ ...notifications, [key]: e.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-foreground" />
                      <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNotificationsSave} disabled={saving}>
                  {saving ? t('common', 'saving') : t('common', 'save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">{t('settings', 'security')}</CardTitle>
              <CardDescription>{t('settings', 'securityDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/client/settings/2fa" className="block">
                <div className="flex items-center gap-4 p-4 border border-border rounded-2xl hover:bg-muted cursor-pointer transition-colors">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{t('settings', 'twoFactorAuth')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'twoFactorAuthDesc')}</div>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </div>
              </Link>

              <Link href="/client/profile" className="block">
                <div className="flex items-center gap-4 p-4 border border-border rounded-2xl hover:bg-muted cursor-pointer transition-colors">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3" /></svg>
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{t('settings', 'changePassword')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'changePasswordDesc')}</div>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </div>
              </Link>

              <Link href="/client/settings/devices" className="block">
                <div className="flex items-center gap-4 p-4 border border-border rounded-2xl hover:bg-muted cursor-pointer transition-colors">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></svg>
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{t('settings', 'connectedDevices') || 'Appareils connectés'}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('settings', 'connectedDevicesDesc') || 'Gérez et déconnectez les sessions actives.'}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Language Card */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">{t('settings', 'language')}</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full md:w-72 h-11 px-3.5 border border-border rounded-xl bg-card text-foreground focus:outline-none focus:border-foreground"
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="nl">Nederlands</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
              </select>
            </CardContent>
          </Card>

          {/* Confidentialité / RGPD */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">{t('settings', 'privacyTitle')}</CardTitle>
              <CardDescription>
                {t('privacy', 'sectionDesc') || 'Vous restez maître de vos données personnelles.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-foreground">
                    {t('privacy', 'exportButton') || 'Exporter mes données'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('privacy', 'exportDesc') || 'Téléchargez une copie de toutes vos données personnelles.'}
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  {t('privacy', 'exportButton') || 'Exporter mes données'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                <div>
                  <div className="font-semibold text-foreground">
                    {t('privacy', 'deleteButton') || 'Supprimer mon compte'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('privacy', 'deleteDesc') || 'Demandez la suppression de votre compte et l\'effacement de vos données (hors pièces à conservation légale).'}
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  {t('privacy', 'deleteButton') || 'Supprimer mon compte'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
