'use client';

import { useState, useEffect } from 'react';
import { adminApi, IntegrationSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultIntegrationSettings: IntegrationSettings = {
  stripePublicKey: '',
  stripeWebhookEnabled: true,
  googleMapsEnabled: true,
  googleMapsApiKey: '',
  twilioEnabled: false,
  twilioSmsEnabled: false,
  twilioVoiceEnabled: false,
  sendgridEnabled: true,
  firebaseEnabled: true,
  firebasePushEnabled: true,
  sentryEnabled: true,
  sentryDsn: '',
  analyticsEnabled: true,
  googleAnalyticsId: '',
  intercomEnabled: false,
  intercomAppId: '',
  slackWebhookEnabled: false,
  slackWebhookUrl: '',
  slackAlertChannel: '#alerts',
  zapierEnabled: false,
  apiWebhooksEnabled: true,
  webhookRetryAttempts: 3,
  webhookTimeoutSeconds: 30,
};

export default function IntegrationSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<IntegrationSettings>(defaultIntegrationSettings);
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
      const data = await adminApi.getIntegrationSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading integration settings:', err);
      setSettings(defaultIntegrationSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateIntegrationSettings(settings);
      setSuccess(t('adminSettingsIntegrations', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving integration settings:', err);
      setError(t('adminSettingsIntegrations', 'saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof IntegrationSettings>(
    key: K,
    value: IntegrationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
            {t('adminSettingsIntegrations', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Payment Integration - Stripe */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'stripeTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'stripeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsIntegrations', 'publicKey')}</label>
            <input
              type="text"
              value={settings.stripePublicKey}
              onChange={(e) => updateSetting('stripePublicKey', e.target.value)}
              placeholder="pk_live_..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('adminSettingsIntegrations', 'stripePublishableHint')}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.stripeWebhookEnabled}
              onChange={(e) => updateSetting('stripeWebhookEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm text-foreground">{t('adminSettingsIntegrations', 'enableStripeWebhooks')}</span>
          </label>
        </CardContent>
      </Card>

      {/* Google Maps */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'googleMapsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'googleMapsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.googleMapsEnabled}
              onChange={(e) => updateSetting('googleMapsEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableGoogleMaps')}</span>
          </label>
          {settings.googleMapsEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsIntegrations', 'apiKey')}</label>
              <input
                type="text"
                value={settings.googleMapsApiKey}
                onChange={(e) => updateSetting('googleMapsApiKey', e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communications - Twilio */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'twilioTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'twilioDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.twilioEnabled}
              onChange={(e) => updateSetting('twilioEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableTwilio')}</span>
          </label>
          {settings.twilioEnabled && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.twilioSmsEnabled}
                  onChange={(e) => updateSetting('twilioSmsEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsIntegrations', 'smsEnabled')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.twilioVoiceEnabled}
                  onChange={(e) => updateSetting('twilioVoiceEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsIntegrations', 'voiceEnabled')}</span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email - SendGrid */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'sendgridTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'sendgridDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.sendgridEnabled}
              onChange={(e) => updateSetting('sendgridEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableSendgrid')}</span>
          </label>
        </CardContent>
      </Card>

      {/* Push - Firebase */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'firebaseTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'firebaseDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.firebaseEnabled}
              onChange={(e) => updateSetting('firebaseEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableFirebase')}</span>
          </label>
          {settings.firebaseEnabled && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.firebasePushEnabled}
                onChange={(e) => updateSetting('firebasePushEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsIntegrations', 'enablePushNotifications')}</span>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Monitoring - Sentry */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'sentryTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'sentryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.sentryEnabled}
              onChange={(e) => updateSetting('sentryEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableSentry')}</span>
          </label>
          {settings.sentryEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsIntegrations', 'sentryDsn')}</label>
              <input
                type="text"
                value={settings.sentryDsn || ''}
                onChange={(e) => updateSetting('sentryDsn', e.target.value)}
                placeholder="https://...@sentry.io/..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'analyticsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'analyticsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.analyticsEnabled}
              onChange={(e) => updateSetting('analyticsEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableAnalytics')}</span>
          </label>
          {settings.analyticsEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsIntegrations', 'googleAnalyticsId')}
              </label>
              <input
                type="text"
                value={settings.googleAnalyticsId || ''}
                onChange={(e) => updateSetting('googleAnalyticsId', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support - Intercom */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'intercomTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'intercomDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.intercomEnabled}
              onChange={(e) => updateSetting('intercomEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableIntercom')}</span>
          </label>
          {settings.intercomEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsIntegrations', 'appId')}</label>
              <input
                type="text"
                value={settings.intercomAppId || ''}
                onChange={(e) => updateSetting('intercomAppId', e.target.value)}
                placeholder={t('adminSettingsIntegrations', 'intercomAppIdPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slack Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'slackTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'slackDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.slackWebhookEnabled}
              onChange={(e) => updateSetting('slackWebhookEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableSlackWebhooks')}</span>
          </label>
          {settings.slackWebhookEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsIntegrations', 'webhookUrl')}</label>
                <input
                  type="text"
                  value={settings.slackWebhookUrl || ''}
                  onChange={(e) => updateSetting('slackWebhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsIntegrations', 'alertChannel')}
                </label>
                <input
                  type="text"
                  value={settings.slackAlertChannel || ''}
                  onChange={(e) => updateSetting('slackAlertChannel', e.target.value)}
                  placeholder="#alerts"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsIntegrations', 'apiWebhooksTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsIntegrations', 'apiWebhooksDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.apiWebhooksEnabled}
                onChange={(e) => updateSetting('apiWebhooksEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsIntegrations', 'enableApiWebhooks')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.zapierEnabled}
                onChange={(e) => updateSetting('zapierEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsIntegrations', 'enableZapier')}</span>
            </label>
          </div>
          {settings.apiWebhooksEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsIntegrations', 'retryAttempts')}
                </label>
                <input
                  type="number"
                  value={settings.webhookRetryAttempts}
                  onChange={(e) => updateSetting('webhookRetryAttempts', parseInt(e.target.value))}
                  min="0"
                  max="10"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsIntegrations', 'timeoutSeconds')}
                </label>
                <input
                  type="number"
                  value={settings.webhookTimeoutSeconds}
                  onChange={(e) => updateSetting('webhookTimeoutSeconds', parseInt(e.target.value))}
                  min="5"
                  max="300"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
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
          {saving ? t('adminSettingsIntegrations', 'saving') : t('adminSettingsIntegrations', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
