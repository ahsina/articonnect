'use client';

import { useState, useEffect } from 'react';
import { adminApi, ContentModerationSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
      setSuccess(t('adminSettingsContent', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving content moderation settings:', err);
      setError(t('adminSettingsContent', 'saveError'));
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
        <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsContent', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Auto-Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsContent', 'autoModerationTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'autoModerationDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoModerationEnabled}
              onChange={(e) => updateSetting('autoModerationEnabled', e.target.checked)}
              className="w-5 h-5 text-primary rounded"
            />
            <div>
              <span className="text-sm font-medium text-foreground">{t('adminSettingsContent', 'enableAutoModeration')}</span>
              <p className="text-xs text-muted-foreground">
                {t('adminSettingsContent', 'enableAutoModerationHint')}
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Profanity Filter */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsContent', 'profanityFilterTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'profanityFilterDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.profanityFilterEnabled}
              onChange={(e) => updateSetting('profanityFilterEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsContent', 'enableProfanityFilter')}</span>
          </label>

          {settings.profanityFilterEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsContent', 'filterStrength')}
                </label>
                <select
                  value={settings.profanityFilterStrength}
                  onChange={(e) =>
                    updateSetting(
                      'profanityFilterStrength',
                      e.target.value as 'LOW' | 'MEDIUM' | 'HIGH',
                    )
                  }
                  className="w-48 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="LOW">{t('adminSettingsContent', 'strengthLow')}</option>
                  <option value="MEDIUM">{t('adminSettingsContent', 'strengthMedium')}</option>
                  <option value="HIGH">{t('adminSettingsContent', 'strengthHigh')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('adminSettingsContent', 'customBannedWords')}
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
                    <span className="text-sm text-muted-foreground">{t('adminSettingsContent', 'noBannedWords')}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    placeholder={t('adminSettingsContent', 'addBannedWordPlaceholder')}
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && addBannedWord()}
                  />
                  <button
                    onClick={addBannedWord}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {t('adminSettingsContent', 'add')}
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
          <CardTitle>{t('adminSettingsContent', 'spamDetectionTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'spamDetectionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.spamDetectionEnabled}
                onChange={(e) => updateSetting('spamDetectionEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsContent', 'enableSpamDetection')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.duplicateContentCheck}
                onChange={(e) => updateSetting('duplicateContentCheck', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsContent', 'checkDuplicate')}</span>
            </label>
          </div>

          {settings.spamDetectionEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'spamScoreThreshold')}
              </label>
              <input
                type="number"
                value={settings.spamScoreThreshold}
                onChange={(e) => updateSetting('spamScoreThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminSettingsContent', 'spamThresholdHintBefore')} {settings.spamScoreThreshold} {t('adminSettingsContent', 'spamThresholdHintAfter')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsContent', 'imageModerationTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'imageModerationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.imagesModerationEnabled}
              onChange={(e) => updateSetting('imagesModerationEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsContent', 'enableImageModeration')}</span>
          </label>

          {settings.imagesModerationEnabled && (
            <div className="w-64">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsContent', 'provider')}</label>
              <select
                value={settings.imagesModerationProvider}
                onChange={(e) => updateSetting('imagesModerationProvider', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
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
          <CardTitle>{t('adminSettingsContent', 'linkFilterTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'linkFilterDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.linkFilterEnabled}
                onChange={(e) => updateSetting('linkFilterEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsContent', 'enableLinkFilter')}</span>
            </label>
            {settings.linkFilterEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('adminSettingsContent', 'maxLinksPerMessage')}</span>
                <input
                  type="number"
                  value={settings.maxLinksPerMessage}
                  onChange={(e) => updateSetting('maxLinksPerMessage', parseInt(e.target.value))}
                  min="0"
                  className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {settings.linkFilterEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('adminSettingsContent', 'allowedDomains')}
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
                  <span className="text-sm text-muted-foreground">{t('adminSettingsContent', 'allDomainsAllowed')}</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAllowedDomain}
                  onChange={(e) => setNewAllowedDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => e.key === 'Enter' && addAllowedDomain()}
                />
                <button
                  onClick={addAllowedDomain}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('adminSettingsContent', 'add')}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Length Limits */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsContent', 'contentLengthTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'contentLengthDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'minReviewLength')}
              </label>
              <input
                type="number"
                value={settings.minReviewLength}
                onChange={(e) => updateSetting('minReviewLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'maxReviewLength')}
              </label>
              <input
                type="number"
                value={settings.maxReviewLength}
                onChange={(e) => updateSetting('maxReviewLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'minDescription')}
              </label>
              <input
                type="number"
                value={settings.minDescriptionLength}
                onChange={(e) => updateSetting('minDescriptionLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'maxDescription')}
              </label>
              <input
                type="number"
                value={settings.maxDescriptionLength}
                onChange={(e) => updateSetting('maxDescriptionLength', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review & Approval */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsContent', 'reviewApprovalTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsContent', 'reviewApprovalDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireReviewForPublish}
                onChange={(e) => updateSetting('requireReviewForPublish', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsContent', 'requireManualReview')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoApproveVerifiedUsers}
                onChange={(e) => updateSetting('autoApproveVerifiedUsers', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsContent', 'autoApproveVerified')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'flagsToTriggerReview')}
              </label>
              <input
                type="number"
                value={settings.flagThresholdForReview}
                onChange={(e) => updateSetting('flagThresholdForReview', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'flagsToAutoHide')}
              </label>
              <input
                type="number"
                value={settings.autoHideAfterFlags}
                onChange={(e) => updateSetting('autoHideAfterFlags', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsContent', 'appealWindow')}
              </label>
              <input
                type="number"
                value={settings.appealWindowDays}
                onChange={(e) => updateSetting('appealWindowDays', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
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
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsContent', 'saving') : t('adminSettingsContent', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
