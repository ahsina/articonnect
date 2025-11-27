'use client';

import { useState, useEffect } from 'react';
import { adminApi, RateLimitSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const defaultRateLimitSettings: RateLimitSettings = {
  apiRateLimit: 100,
  apiRateLimitWindow: 1,
  loginAttemptsLimit: 5,
  loginLockoutMinutes: 15,
  passwordResetLimit: 3,
  missionCreationLimit: 10,
  messageLimit: 60,
  reviewLimit: 10,
  reportLimit: 5,
  fileUploadLimit: 20,
  fileUploadMaxSizeMb: 10,
  searchRequestsLimit: 30,
  ipBlocklistEnabled: true,
  geoBlockingEnabled: false,
  blockedCountries: [],
  allowedCountries: [],
  captchaEnabled: true,
  captchaThreshold: 70,
};

export default function RateLimitsPage() {
  const [settings, setSettings] = useState<RateLimitSettings>(defaultRateLimitSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newBlockedCountry, setNewBlockedCountry] = useState('');
  const [newAllowedCountry, setNewAllowedCountry] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRateLimitSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading rate limit settings:', err);
      setSettings(defaultRateLimitSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateRateLimitSettings(settings);
      setSuccess('Rate limit settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving rate limit settings:', err);
      setError('Failed to save rate limit settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof RateLimitSettings>(
    key: K,
    value: RateLimitSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addBlockedCountry = () => {
    if (!newBlockedCountry.trim()) return;
    const code = newBlockedCountry.trim().toUpperCase();
    if (settings.blockedCountries.includes(code)) return;
    setSettings((prev) => ({
      ...prev,
      blockedCountries: [...prev.blockedCountries, code],
    }));
    setNewBlockedCountry('');
  };

  const removeBlockedCountry = (code: string) => {
    setSettings((prev) => ({
      ...prev,
      blockedCountries: prev.blockedCountries.filter((c) => c !== code),
    }));
  };

  const addAllowedCountry = () => {
    if (!newAllowedCountry.trim()) return;
    const code = newAllowedCountry.trim().toUpperCase();
    if (settings.allowedCountries.includes(code)) return;
    setSettings((prev) => ({
      ...prev,
      allowedCountries: [...prev.allowedCountries, code],
    }));
    setNewAllowedCountry('');
  };

  const removeAllowedCountry = (code: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedCountries: prev.allowedCountries.filter((c) => c !== code),
    }));
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

      {/* API Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>API Rate Limits</CardTitle>
          <CardDescription>Configure API request limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requests per Window
              </label>
              <input
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => updateSetting('apiRateLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Window Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.apiRateLimitWindow}
                onChange={(e) => updateSetting('apiRateLimitWindow', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Security</CardTitle>
          <CardDescription>Configure login and password reset limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settings.loginAttemptsLimit}
                onChange={(e) => updateSetting('loginAttemptsLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.loginLockoutMinutes}
                onChange={(e) => updateSetting('loginLockoutMinutes', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password Resets/Day
              </label>
              <input
                type="number"
                value={settings.passwordResetLimit}
                onChange={(e) => updateSetting('passwordResetLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Activity Limits */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Limits</CardTitle>
          <CardDescription>Configure limits for user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Missions/Day/User
              </label>
              <input
                type="number"
                value={settings.missionCreationLimit}
                onChange={(e) => updateSetting('missionCreationLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Messages/Hour</label>
              <input
                type="number"
                value={settings.messageLimit}
                onChange={(e) => updateSetting('messageLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reviews/Day</label>
              <input
                type="number"
                value={settings.reviewLimit}
                onChange={(e) => updateSetting('reviewLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reports/Day</label>
              <input
                type="number"
                value={settings.reportLimit}
                onChange={(e) => updateSetting('reportLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Searches/Minute
              </label>
              <input
                type="number"
                value={settings.searchRequestsLimit}
                onChange={(e) => updateSetting('searchRequestsLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Limits */}
      <Card>
        <CardHeader>
          <CardTitle>File Upload Limits</CardTitle>
          <CardDescription>Configure file upload restrictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uploads/Hour</label>
              <input
                type="number"
                value={settings.fileUploadLimit}
                onChange={(e) => updateSetting('fileUploadLimit', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max File Size (MB)
              </label>
              <input
                type="number"
                value={settings.fileUploadMaxSizeMb}
                onChange={(e) => updateSetting('fileUploadMaxSizeMb', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>Security Features</CardTitle>
          <CardDescription>Enable or disable security mechanisms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.ipBlocklistEnabled}
                onChange={(e) => updateSetting('ipBlocklistEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable IP blocklist</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.geoBlockingEnabled}
                onChange={(e) => updateSetting('geoBlockingEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable geo-blocking</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.captchaEnabled}
                onChange={(e) => updateSetting('captchaEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable CAPTCHA</span>
            </label>
          </div>

          {settings.captchaEnabled && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CAPTCHA Threshold Score
              </label>
              <input
                type="number"
                value={settings.captchaThreshold}
                onChange={(e) => updateSetting('captchaThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Suspicious activity score to trigger CAPTCHA (0-100)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geo-Blocking */}
      {settings.geoBlockingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Geo-Blocking Configuration</CardTitle>
            <CardDescription>Configure country-based access restrictions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Blocked Countries */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blocked Countries
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.blockedCountries.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                  >
                    {code}
                    <button
                      onClick={() => removeBlockedCountry(code)}
                      className="text-red-500 hover:text-red-700"
                    >
                      x
                    </button>
                  </span>
                ))}
                {settings.blockedCountries.length === 0 && (
                  <span className="text-sm text-gray-500">No blocked countries</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlockedCountry}
                  onChange={(e) => setNewBlockedCountry(e.target.value)}
                  placeholder="Country code (e.g., CN)"
                  maxLength={2}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addBlockedCountry}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Block
                </button>
              </div>
            </div>

            {/* Allowed Countries */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Countries (whitelist mode)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.allowedCountries.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {code}
                    <button
                      onClick={() => removeAllowedCountry(code)}
                      className="text-green-500 hover:text-green-700"
                    >
                      x
                    </button>
                  </span>
                ))}
                {settings.allowedCountries.length === 0 && (
                  <span className="text-sm text-gray-500">
                    All countries allowed (no whitelist)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAllowedCountry}
                  onChange={(e) => setNewAllowedCountry(e.target.value)}
                  placeholder="Country code (e.g., FR)"
                  maxLength={2}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addAllowedCountry}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Allow
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                If whitelist is empty, all non-blocked countries are allowed
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Rate Limit Settings'}
        </button>
      </div>
    </div>
  );
}
