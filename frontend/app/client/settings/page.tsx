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
  'Immobilier',
  'Restauration',
  'Commerce',
  'Services',
  'Industrie',
  'Construction',
  'Santé',
  'Education',
  'Transport',
  'Autre',
];

export default function ClientSettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          ← {t('common', 'back')}
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-6">{t('settings', 'title')}</h1>

        <div className="space-y-6">
          {/* Account Type Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings', 'accountType')}</CardTitle>
              <CardDescription>
                {t('settings', 'accountTypeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setClientProfile({ ...clientProfile, clientType: 'INDIVIDUAL' })}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    clientProfile.clientType === 'INDIVIDUAL'
                      ? 'border-blue-600 bg-primary/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="text-2xl mb-2">👤</div>
                  <div className="font-semibold">{t('settings', 'individual')}</div>
                  <div className="text-sm text-muted-foreground">{t('settings', 'individualDescription')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setClientProfile({ ...clientProfile, clientType: 'PROFESSIONAL' })}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    clientProfile.clientType === 'PROFESSIONAL'
                      ? 'border-blue-600 bg-primary/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="text-2xl mb-2">🏢</div>
                  <div className="font-semibold">{t('settings', 'professional')}</div>
                  <div className="text-sm text-muted-foreground">{t('settings', 'professionalDescription')}</div>
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
                        placeholder="Société ABC"
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
                          <option key={ind} value={ind}>
                            {ind}
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
          <Card>
            <CardHeader>
              <CardTitle>{t('settings', 'notifications')}</CardTitle>
              <CardDescription>{t('settings', 'notificationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">{t('settings', 'emailNotifications')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'emailNotificationsDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailNotifications: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">{t('settings', 'pushNotifications')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'pushNotificationsDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.pushNotifications}
                    onChange={(e) =>
                      setNotifications({ ...notifications, pushNotifications: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">{t('settings', 'smsNotifications')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'smsNotificationsDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.smsNotifications}
                    onChange={(e) =>
                      setNotifications({ ...notifications, smsNotifications: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">{t('settings', 'missionUpdates')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'missionUpdatesDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.missionUpdates}
                    onChange={(e) =>
                      setNotifications({ ...notifications, missionUpdates: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">{t('settings', 'marketplaceAlerts')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'marketplaceAlertsDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.marketplaceAlerts}
                    onChange={(e) =>
                      setNotifications({ ...notifications, marketplaceAlerts: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{t('settings', 'promotions')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'promotionsDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.promotions}
                    onChange={(e) =>
                      setNotifications({ ...notifications, promotions: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNotificationsSave} disabled={saving}>
                  {saving ? t('common', 'saving') : t('common', 'save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings', 'security')}</CardTitle>
              <CardDescription>{t('settings', 'securityDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/client/settings/2fa">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <div>
                    <div className="font-medium">{t('settings', 'twoFactorAuth')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'twoFactorAuthDesc')}</div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </div>
              </Link>

              <Link href="/client/profile">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <div>
                    <div className="font-medium">{t('settings', 'changePassword')}</div>
                    <div className="text-sm text-muted-foreground">{t('settings', 'changePasswordDesc')}</div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Language Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings', 'language')}</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full md:w-64 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                defaultValue="fr"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
