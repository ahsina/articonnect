'use client';

import { useState, useEffect } from 'react';
import { adminApi, UserProfileSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

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
      setSuccess('User settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving user settings:', err);
      setError('Failed to save user settings');
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Account Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Account Verification</CardTitle>
          <CardDescription>Configure verification requirements for accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => updateSetting('requireEmailVerification', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require email verification</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requirePhoneVerification}
                onChange={(e) => updateSetting('requirePhoneVerification', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require phone verification</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Configure user profile options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name Max Length
              </label>
              <input
                type="number"
                value={settings.displayNameMaxLength}
                onChange={(e) => updateSetting('displayNameMaxLength', parseInt(e.target.value))}
                min="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio Max Length</label>
              <input
                type="number"
                value={settings.bioMaxLength}
                onChange={(e) => updateSetting('bioMaxLength', parseInt(e.target.value))}
                min="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username Changes/Year
              </label>
              <input
                type="number"
                value={settings.usernameChangeLimit}
                onChange={(e) => updateSetting('usernameChangeLimit', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowUsernameChange}
                onChange={(e) => updateSetting('allowUsernameChange', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Allow username changes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.profilePhotoRequired}
                onChange={(e) => updateSetting('profilePhotoRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require profile photo</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.profilePhotoModeration}
                onChange={(e) => updateSetting('profilePhotoModeration', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Moderate profile photos</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) => updateSetting('showOnlineStatus', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Show online status</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showLastActive}
                onChange={(e) => updateSetting('showLastActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Show last active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowAnonymousProfiles}
                onChange={(e) => updateSetting('allowAnonymousProfiles', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Allow anonymous profiles</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowProfileHiding}
                onChange={(e) => updateSetting('allowProfileHiding', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Allow profile hiding</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Artisan Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Artisan Requirements</CardTitle>
          <CardDescription>Configure requirements for artisan profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.artisanRequirements.businessVerificationRequired}
                onChange={(e) => updateArtisanReq('businessVerificationRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Business verification required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.artisanRequirements.insuranceRequired}
                onChange={(e) => updateArtisanReq('insuranceRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Insurance required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.artisanRequirements.portfolioRequired}
                onChange={(e) => updateArtisanReq('portfolioRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Portfolio required</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Certifications
              </label>
              <input
                type="number"
                value={settings.artisanRequirements.minCertifications}
                onChange={(e) => updateArtisanReq('minCertifications', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Portfolio Items
              </label>
              <input
                type="number"
                value={settings.artisanRequirements.minPortfolioItems}
                onChange={(e) => updateArtisanReq('minPortfolioItems', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Client Requirements</CardTitle>
          <CardDescription>Configure requirements for client profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.clientRequirements.addressRequired}
                onChange={(e) => updateClientReq('addressRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Address required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.clientRequirements.phoneRequired}
                onChange={(e) => updateClientReq('phoneRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Phone required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.clientRequirements.identityVerificationRequired}
                onChange={(e) => updateClientReq('identityVerificationRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Identity verification required</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
          <CardDescription>Configure password requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Length</label>
              <input
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
                min="6"
                max="32"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password Expiry (days, 0 = never)
              </label>
              <input
                type="number"
                value={settings.passwordExpiryDays}
                onChange={(e) => updateSetting('passwordExpiryDays', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireUppercase}
                onChange={(e) => updateSetting('passwordRequireUppercase', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require uppercase</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireLowercase}
                onChange={(e) => updateSetting('passwordRequireLowercase', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require lowercase</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireNumbers}
                onChange={(e) => updateSetting('passwordRequireNumbers', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require numbers</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordRequireSymbols}
                onChange={(e) => updateSetting('passwordRequireSymbols', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require symbols</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Session & 2FA */}
      <Card>
        <CardHeader>
          <CardTitle>Session &amp; Two-Factor Authentication</CardTitle>
          <CardDescription>Configure session and 2FA settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => updateSetting('sessionTimeoutMinutes', parseInt(e.target.value))}
                min="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Concurrent Sessions
              </label>
              <input
                type="number"
                value={settings.maxConcurrentSessions}
                onChange={(e) => updateSetting('maxConcurrentSessions', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={settings.twoFactorAuthRequired}
                onChange={(e) => updateSetting('twoFactorAuthRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Require Two-Factor Authentication
              </span>
            </label>

            <div className="flex gap-4">
              {['sms', 'authenticator', 'email'].map((method) => (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuthMethods.includes(method)}
                    onChange={() => toggle2FAMethod(method)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 capitalize">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card>
        <CardHeader>
          <CardTitle>Account Deletion</CardTitle>
          <CardDescription>Configure account deletion options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.accountDeletionEnabled}
              onChange={(e) => updateSetting('accountDeletionEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Allow account deletion</span>
          </label>

          {settings.accountDeletionEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooldown Period (days)
              </label>
              <input
                type="number"
                value={settings.accountDeletionCooldownDays}
                onChange={(e) =>
                  updateSetting('accountDeletionCooldownDays', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Time before deletion is permanent</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save User Settings'}
        </button>
      </div>
    </div>
  );
}
