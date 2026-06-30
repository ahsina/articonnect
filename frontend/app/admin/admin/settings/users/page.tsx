'use client';

import { useState, useEffect } from 'react';
import { adminApi, UserProfileSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultUserProfileSettings: UserProfileSettings = {
  requireEmailVerification: true,
  requirePhoneVerification: false,
  allowUsernameChange: true,
  usernameChangeLimit: 2,
  profilePhotoRequired: false,
  profilePhotoModeration: true,
  bioMaxLength: 500,
  displayNameMaxLength: 50,
  allowAnonymousProfiles: false,
  showOnlineStatus: true,
  showLastActive: true,
  allowProfileHiding: false,
  artisanRequirements: {
    businessVerificationRequired: true,
    insuranceRequired: false,
    minCertifications: 0,
    portfolioRequired: true,
    minPortfolioItems: 3,
  },
  clientRequirements: {
    addressRequired: true,
    phoneRequired: true,
    identityVerificationRequired: false,
  },
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: false,
  passwordExpiryDays: 0,
  sessionTimeoutMinutes: 60,
  maxConcurrentSessions: 5,
  twoFactorAuthRequired: false,
  twoFactorAuthMethods: ['authenticator', 'sms'],
  accountDeletionEnabled: true,
  accountDeletionCooldownDays: 14,
};

export default function UserSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<UserProfileSettings>(defaultUserProfileSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUserSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading user settings:', err);
      setSettings(defaultUserProfileSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateUserSettings(settings);
      setSuccess(t('adminSettingsUsers', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving user settings:', err);
      setError(t('adminSettingsUsers', 'saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof UserProfileSettings>(
    key: K,
    value: UserProfileSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateArtisanReq = (
    key: keyof UserProfileSettings['artisanRequirements'],
    value: boolean | number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      artisanRequirements: {
        ...prev.artisanRequirements,
        [key]: value,
      },
    }));
  };

  const updateClientReq = (
    key: keyof UserProfileSettings['clientRequirements'],
    value: boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      clientRequirements: {
        ...prev.clientRequirements,
        [key]: value,
      },
    }));
  };

  const toggle2FAMethod = (method: string) => {
    const methods = settings.twoFactorAuthMethods;
    if (methods.includes(method)) {
      updateSetting(
        'twoFactorAuthMethods',
        methods.filter((m) => m !== method),
      );
    } else {
      updateSetting('twoFactorAuthMethods', [...methods, method]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsUsers', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Account Verification */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'accountVerifyTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'accountVerifyDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => updateSetting('requireEmailVerification', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requireEmailVerification')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requirePhoneVerification}
                onChange={(e) => updateSetting('requirePhoneVerification', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requirePhoneVerification')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'profileSettingsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'profileSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'displayNameMaxLength')}
              </label>
              <input
                type="number"
                value={settings.displayNameMaxLength}
                onChange={(e) => updateSetting('displayNameMaxLength', parseInt(e.target.value))}
                min="10"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsUsers', 'bioMaxLength')}</label>
              <input
                type="number"
                value={settings.bioMaxLength}
                onChange={(e) => updateSetting('bioMaxLength', parseInt(e.target.value))}
                min="50"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'usernameChangesPerYear')}
              </label>
              <input
                type="number"
                value={settings.usernameChangeLimit}
                onChange={(e) => updateSetting('usernameChangeLimit', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowUsernameChange}
                onChange={(e) => updateSetting('allowUsernameChange', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'allowUsernameChanges')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.profilePhotoRequired}
                onChange={(e) => updateSetting('profilePhotoRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requireProfilePhoto')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.profilePhotoModeration}
                onChange={(e) => updateSetting('profilePhotoModeration', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'moderateProfilePhotos')}</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) => updateSetting('showOnlineStatus', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'showOnlineStatus')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showLastActive}
                onChange={(e) => updateSetting('showLastActive', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'showLastActive')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowAnonymousProfiles}
                onChange={(e) => updateSetting('allowAnonymousProfiles', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'allowAnonymousProfiles')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowProfileHiding}
                onChange={(e) => updateSetting('allowProfileHiding', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'allowProfileHiding')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Artisan Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'artisanReqTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'artisanReqDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.artisanRequirements.businessVerificationRequired}
                onChange={(e) => updateArtisanReq('businessVerificationRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'businessVerificationRequired')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.artisanRequirements.insuranceRequired}
                onChange={(e) => updateArtisanReq('insuranceRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'insuranceRequired')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.artisanRequirements.portfolioRequired}
                onChange={(e) => updateArtisanReq('portfolioRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'portfolioRequired')}</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'minimumCertifications')}
              </label>
              <input
                type="number"
                value={settings.artisanRequirements.minCertifications}
                onChange={(e) => updateArtisanReq('minCertifications', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'minimumPortfolioItems')}
              </label>
              <input
                type="number"
                value={settings.artisanRequirements.minPortfolioItems}
                onChange={(e) => updateArtisanReq('minPortfolioItems', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'clientReqTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'clientReqDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.clientRequirements.addressRequired}
                onChange={(e) => updateClientReq('addressRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'addressRequired')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.clientRequirements.phoneRequired}
                onChange={(e) => updateClientReq('phoneRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'phoneRequired')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.clientRequirements.identityVerificationRequired}
                onChange={(e) => updateClientReq('identityVerificationRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'identityVerificationRequired')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'passwordPolicyTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'passwordPolicyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsUsers', 'minimumLength')}</label>
              <input
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
                min="6"
                max="32"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'passwordExpiry')}
              </label>
              <input
                type="number"
                value={settings.passwordExpiryDays}
                onChange={(e) => updateSetting('passwordExpiryDays', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireUppercase}
                onChange={(e) => updateSetting('passwordRequireUppercase', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requireUppercase')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireLowercase}
                onChange={(e) => updateSetting('passwordRequireLowercase', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requireLowercase')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireNumbers}
                onChange={(e) => updateSetting('passwordRequireNumbers', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requireNumbers')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireSymbols}
                onChange={(e) => updateSetting('passwordRequireSymbols', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsUsers', 'requireSymbols')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Session & 2FA */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'sessionTwoFactorTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'sessionTwoFactorDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'sessionTimeout')}
              </label>
              <input
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => updateSetting('sessionTimeoutMinutes', parseInt(e.target.value))}
                min="5"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'maxConcurrentSessions')}
              </label>
              <input
                type="number"
                value={settings.maxConcurrentSessions}
                onChange={(e) => updateSetting('maxConcurrentSessions', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="p-4 bg-background rounded-lg">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={settings.twoFactorAuthRequired}
                onChange={(e) => updateSetting('twoFactorAuthRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">
                {t('adminSettingsUsers', 'requireTwoFactor')}
              </span>
            </label>

            <div className="flex gap-4">
              {['sms', 'authenticator', 'email'].map((method) => (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuthMethods.includes(method)}
                    onChange={() => toggle2FAMethod(method)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground capitalize">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsUsers', 'accountDeletionTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsUsers', 'accountDeletionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.accountDeletionEnabled}
              onChange={(e) => updateSetting('accountDeletionEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsUsers', 'allowAccountDeletion')}</span>
          </label>

          {settings.accountDeletionEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsUsers', 'cooldownPeriod')}
              </label>
              <input
                type="number"
                value={settings.accountDeletionCooldownDays}
                onChange={(e) =>
                  updateSetting('accountDeletionCooldownDays', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsUsers', 'timeBeforePermanent')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsUsers', 'saving') : t('adminSettingsUsers', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
