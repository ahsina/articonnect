'use client';

import { useState, useEffect } from 'react';
import { adminApi, IntegrationSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

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
      setSuccess('Integration settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving integration settings:', err);
      setError('Failed to save integration settings');
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
            Dismiss
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
          <CardTitle>Stripe Integration</CardTitle>
          <CardDescription>Configure Stripe payment processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Public Key</label>
            <input
              type="text"
              value={settings.stripePublicKey}
              onChange={(e) => updateSetting('stripePublicKey', e.target.value)}
              placeholder="pk_live_..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your Stripe publishable key (starts with pk_)
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.stripeWebhookEnabled}
              onChange={(e) => updateSetting('stripeWebhookEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm text-foreground">Enable Stripe webhooks</span>
          </label>
        </CardContent>
      </Card>

      {/* Google Maps */}
      <Card>
        <CardHeader>
          <CardTitle>Google Maps Integration</CardTitle>
          <CardDescription>Configure Google Maps for location services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.googleMapsEnabled}
              onChange={(e) => updateSetting('googleMapsEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Google Maps</span>
          </label>
          {settings.googleMapsEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
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
          <CardTitle>Twilio Integration</CardTitle>
          <CardDescription>Configure SMS and voice calling via Twilio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.twilioEnabled}
              onChange={(e) => updateSetting('twilioEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Twilio</span>
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
                <span className="text-sm text-foreground">SMS enabled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.twilioVoiceEnabled}
                  onChange={(e) => updateSetting('twilioVoiceEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">Voice enabled</span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email - SendGrid */}
      <Card>
        <CardHeader>
          <CardTitle>SendGrid Integration</CardTitle>
          <CardDescription>Configure email delivery via SendGrid</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.sendgridEnabled}
              onChange={(e) => updateSetting('sendgridEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable SendGrid</span>
          </label>
        </CardContent>
      </Card>

      {/* Push - Firebase */}
      <Card>
        <CardHeader>
          <CardTitle>Firebase Integration</CardTitle>
          <CardDescription>Configure Firebase for push notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.firebaseEnabled}
              onChange={(e) => updateSetting('firebaseEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Firebase</span>
          </label>
          {settings.firebaseEnabled && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.firebasePushEnabled}
                onChange={(e) => updateSetting('firebasePushEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Enable push notifications</span>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Monitoring - Sentry */}
      <Card>
        <CardHeader>
          <CardTitle>Sentry Integration</CardTitle>
          <CardDescription>Configure error tracking and monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.sentryEnabled}
              onChange={(e) => updateSetting('sentryEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Sentry</span>
          </label>
          {settings.sentryEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Sentry DSN</label>
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
          <CardTitle>Analytics Integration</CardTitle>
          <CardDescription>Configure analytics tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.analyticsEnabled}
              onChange={(e) => updateSetting('analyticsEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Analytics</span>
          </label>
          {settings.analyticsEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Google Analytics ID
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
          <CardTitle>Intercom Integration</CardTitle>
          <CardDescription>Configure customer support chat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.intercomEnabled}
              onChange={(e) => updateSetting('intercomEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Intercom</span>
          </label>
          {settings.intercomEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">App ID</label>
              <input
                type="text"
                value={settings.intercomAppId || ''}
                onChange={(e) => updateSetting('intercomAppId', e.target.value)}
                placeholder="Your Intercom App ID"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slack Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>Configure Slack notifications for alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.slackWebhookEnabled}
              onChange={(e) => updateSetting('slackWebhookEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable Slack Webhooks</span>
          </label>
          {settings.slackWebhookEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Webhook URL</label>
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
                  Alert Channel
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
          <CardTitle>API Webhooks</CardTitle>
          <CardDescription>Configure outgoing webhook settings</CardDescription>
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
              <span className="text-sm font-medium text-foreground">Enable API Webhooks</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.zapierEnabled}
                onChange={(e) => updateSetting('zapierEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Enable Zapier</span>
            </label>
          </div>
          {settings.apiWebhooksEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Retry Attempts
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
                  Timeout (seconds)
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
          {saving ? 'Saving...' : 'Save Integration Settings'}
        </button>
      </div>
    </div>
  );
}
