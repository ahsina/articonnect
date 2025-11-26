'use client';

import { useState, useEffect } from 'react';
import { adminApi, ContentModerationSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const defaultContentModerationSettings: ContentModerationSettings = {
  autoModerationEnabled: true,
  profanityFilterEnabled: true,
  profanityFilterStrength: 'MEDIUM',
  customBannedWords: [],
  spamDetectionEnabled: true,
  spamScoreThreshold: 70,
  imagesModerationEnabled: true,
  imagesModerationProvider: 'aws-rekognition',
  linkFilterEnabled: true,
  allowedDomains: [],
  maxLinksPerMessage: 3,
  duplicateContentCheck: true,
  minReviewLength: 10,
  maxReviewLength: 2000,
  minDescriptionLength: 20,
  maxDescriptionLength: 5000,
  requireReviewForPublish: false,
  autoApproveVerifiedUsers: true,
  flagThresholdForReview: 3,
  autoHideAfterFlags: 5,
  appealWindowDays: 7,
};

export default function ContentModerationPage() {
  const [settings, setSettings] = useState<ContentModerationSettings>(
    defaultContentModerationSettings,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [newAllowedDomain, setNewAllowedDomain] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getContentModerationSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading content moderation settings:', err);
      setSettings(defaultContentModerationSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateContentModerationSettings(settings);
      setSuccess('Content moderation settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving content moderation settings:', err);
      setError('Failed to save content moderation settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ContentModerationSettings>(
    key: K,
    value: ContentModerationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addBannedWord = () => {
    if (!newBannedWord.trim()) return;
    if (settings.customBannedWords.includes(newBannedWord.trim().toLowerCase())) return;
    setSettings((prev) => ({
      ...prev,
      customBannedWords: [...prev.customBannedWords, newBannedWord.trim().toLowerCase()],
    }));
    setNewBannedWord('');
  };

  const removeBannedWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      customBannedWords: prev.customBannedWords.filter((w) => w !== word),
    }));
  };

  const addAllowedDomain = () => {
    if (!newAllowedDomain.trim()) return;
    if (settings.allowedDomains.includes(newAllowedDomain.trim().toLowerCase())) return;
    setSettings((prev) => ({
      ...prev,
      allowedDomains: [...prev.allowedDomains, newAllowedDomain.trim().toLowerCase()],
    }));
    setNewAllowedDomain('');
  };

  const removeAllowedDomain = (domain: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter((d) => d !== domain),
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

      {/* Auto-Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Moderation</CardTitle>
          <CardDescription>Configure automatic content moderation</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoModerationEnabled}
              onChange={(e) => updateSetting('autoModerationEnabled', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Enable Auto-Moderation</span>
              <p className="text-xs text-gray-500">
                Automatically scan and moderate user-generated content
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Profanity Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Profanity Filter</CardTitle>
          <CardDescription>Configure profanity detection and filtering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.profanityFilterEnabled}
              onChange={(e) => updateSetting('profanityFilterEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable Profanity Filter</span>
          </label>

          {settings.profanityFilterEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Strength
                </label>
                <select
                  value={settings.profanityFilterStrength}
                  onChange={(e) =>
                    updateSetting(
                      'profanityFilterStrength',
                      e.target.value as 'LOW' | 'MEDIUM' | 'HIGH',
                    )
                  }
                  className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low - Only severe profanity</option>
                  <option value="MEDIUM">Medium - Common profanity</option>
                  <option value="HIGH">High - All offensive words</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Banned Words
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {settings.customBannedWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                    >
                      {word}
                      <button
                        onClick={() => removeBannedWord(word)}
                        className="text-red-500 hover:text-red-700"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  {settings.customBannedWords.length === 0 && (
                    <span className="text-sm text-gray-500">No custom banned words</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    placeholder="Add banned word"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && addBannedWord()}
                  />
                  <button
                    onClick={addBannedWord}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Spam Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Spam Detection</CardTitle>
          <CardDescription>Configure spam detection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.spamDetectionEnabled}
                onChange={(e) => updateSetting('spamDetectionEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enable Spam Detection</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.duplicateContentCheck}
                onChange={(e) => updateSetting('duplicateContentCheck', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Check for duplicate content</span>
            </label>
          </div>

          {settings.spamDetectionEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spam Score Threshold
              </label>
              <input
                type="number"
                value={settings.spamScoreThreshold}
                onChange={(e) => updateSetting('spamScoreThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Content with score &gt;= {settings.spamScoreThreshold} flagged as spam
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>Image Moderation</CardTitle>
          <CardDescription>Configure image content moderation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.imagesModerationEnabled}
              onChange={(e) => updateSetting('imagesModerationEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable Image Moderation</span>
          </label>

          {settings.imagesModerationEnabled && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={settings.imagesModerationProvider}
                onChange={(e) => updateSetting('imagesModerationProvider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="aws-rekognition">AWS Rekognition</option>
                <option value="google-vision">Google Cloud Vision</option>
                <option value="azure-content-moderator">Azure Content Moderator</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Link Filter</CardTitle>
          <CardDescription>Configure link filtering in content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.linkFilterEnabled}
                onChange={(e) => updateSetting('linkFilterEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enable Link Filter</span>
            </label>
            {settings.linkFilterEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Max links per message:</span>
                <input
                  type="number"
                  value={settings.maxLinksPerMessage}
                  onChange={(e) => updateSetting('maxLinksPerMessage', parseInt(e.target.value))}
                  min="0"
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {settings.linkFilterEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Domains (whitelist)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.allowedDomains.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {domain}
                    <button
                      onClick={() => removeAllowedDomain(domain)}
                      className="text-green-500 hover:text-green-700"
                    >
                      x
                    </button>
                  </span>
                ))}
                {settings.allowedDomains.length === 0 && (
                  <span className="text-sm text-gray-500">All domains allowed</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAllowedDomain}
                  onChange={(e) => setNewAllowedDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && addAllowedDomain()}
                />
                <button
                  onClick={addAllowedDomain}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Length Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Content Length Limits</CardTitle>
          <CardDescription>Configure minimum and maximum content lengths</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Review Length
              </label>
              <input
                type="number"
                value={settings.minReviewLength}
                onChange={(e) => updateSetting('minReviewLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Review Length
              </label>
              <input
                type="number"
                value={settings.maxReviewLength}
                onChange={(e) => updateSetting('maxReviewLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Description
              </label>
              <input
                type="number"
                value={settings.minDescriptionLength}
                onChange={(e) => updateSetting('minDescriptionLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Description
              </label>
              <input
                type="number"
                value={settings.maxDescriptionLength}
                onChange={(e) => updateSetting('maxDescriptionLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review & Approval */}
      <Card>
        <CardHeader>
          <CardTitle>Review &amp; Approval</CardTitle>
          <CardDescription>Configure content review and approval settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireReviewForPublish}
                onChange={(e) => updateSetting('requireReviewForPublish', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Require manual review for publishing</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoApproveVerifiedUsers}
                onChange={(e) => updateSetting('autoApproveVerifiedUsers', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Auto-approve verified users</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flags to Trigger Review
              </label>
              <input
                type="number"
                value={settings.flagThresholdForReview}
                onChange={(e) => updateSetting('flagThresholdForReview', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flags to Auto-Hide
              </label>
              <input
                type="number"
                value={settings.autoHideAfterFlags}
                onChange={(e) => updateSetting('autoHideAfterFlags', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appeal Window (days)
              </label>
              <input
                type="number"
                value={settings.appealWindowDays}
                onChange={(e) => updateSetting('appealWindowDays', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Content Moderation Settings'}
        </button>
      </div>
    </div>
  );
}
