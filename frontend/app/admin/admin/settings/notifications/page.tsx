'use client';

import { useState, useEffect } from 'react';
import { adminApi, NotificationSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultNotificationSettings: NotificationSettings = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  missionCreatedNotify: true,
  missionAcceptedNotify: true,
  missionCompletedNotify: true,
  missionCancelledNotify: true,
  paymentReceivedNotify: true,
  paymentFailedNotify: true,
  payoutProcessedNotify: true,
  newMessageNotify: true,
  newReviewNotify: true,
  disputeOpenedNotify: true,
  disputeResolvedNotify: true,
  verificationStatusNotify: true,
  promotionalEmailsEnabled: false,
  weeklyDigestEnabled: true,
  marketingOptInDefault: false,
  reminderBeforeMissionHours: 24,
  followUpAfterMissionHours: 48,
  inactivityReminderDays: 14,
  maxEmailsPerDay: 20,
  maxSmsPerDay: 5,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  respectQuietHours: true,
};

export default function NotificationSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings);
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
      const data = await adminApi.getNotificationSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading notification settings:', err);
      setSettings(defaultNotificationSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateNotificationSettings(settings);
      setSuccess(t('adminSettingsNotifications', 'saveSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError(t('adminSettingsNotifications', 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
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
        <div className="p-4 bg-red-100 border rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsNotifications', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'channelsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'channelsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'emailEnabled' as const, label: t('adminSettingsNotifications', 'channelEmail'), icon: '' },
              { key: 'smsEnabled' as const, label: 'SMS', icon: '' },
              { key: 'pushEnabled' as const, label: t('adminSettingsNotifications', 'channelPush'), icon: '' },
              { key: 'inAppEnabled' as const, label: t('adminSettingsNotifications', 'channelInApp'), icon: '' },
            ].map((channel) => (
              <div
                key={channel.key}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  settings[channel.key]
                    ? 'border-green-500 bg-green-100'
                    : 'border-border bg-background'
                }`}
                onClick={() => updateSetting(channel.key, !settings[channel.key])}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{channel.icon}</span>
                  <div>
                    <p className="font-medium">{channel.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {settings[channel.key] ? t('adminSettingsNotifications', 'enabled') : t('adminSettingsNotifications', 'disabled')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mission Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'missionTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'missionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'missionCreatedNotify' as const, label: t('adminSettingsNotifications', 'missionCreated') },
              { key: 'missionAcceptedNotify' as const, label: t('adminSettingsNotifications', 'missionAccepted') },
              { key: 'missionCompletedNotify' as const, label: t('adminSettingsNotifications', 'missionCompleted') },
              { key: 'missionCancelledNotify' as const, label: t('adminSettingsNotifications', 'missionCancelled') },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => updateSetting(item.key, e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{item.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'paymentTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'paymentDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'paymentReceivedNotify' as const, label: t('adminSettingsNotifications', 'paymentReceived') },
              { key: 'paymentFailedNotify' as const, label: t('adminSettingsNotifications', 'paymentFailed') },
              { key: 'payoutProcessedNotify' as const, label: t('adminSettingsNotifications', 'payoutProcessed') },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => updateSetting(item.key, e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{item.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Other Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'otherTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'otherDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'newMessageNotify' as const, label: t('adminSettingsNotifications', 'newMessage') },
              { key: 'newReviewNotify' as const, label: t('adminSettingsNotifications', 'newReview') },
              { key: 'disputeOpenedNotify' as const, label: t('adminSettingsNotifications', 'disputeOpened') },
              { key: 'disputeResolvedNotify' as const, label: t('adminSettingsNotifications', 'disputeResolved') },
              { key: 'verificationStatusNotify' as const, label: t('adminSettingsNotifications', 'verificationStatus') },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => updateSetting(item.key, e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{item.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Marketing & Digest */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'marketingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'marketingDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.promotionalEmailsEnabled}
                  onChange={(e) => updateSetting('promotionalEmailsEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsNotifications', 'enablePromo')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.weeklyDigestEnabled}
                  onChange={(e) => updateSetting('weeklyDigestEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsNotifications', 'enableDigest')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.marketingOptInDefault}
                  onChange={(e) => updateSetting('marketingOptInDefault', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsNotifications', 'marketingOptIn')}</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'timingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'timingDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsNotifications', 'missionReminder')}
              </label>
              <input
                type="number"
                value={settings.reminderBeforeMissionHours}
                onChange={(e) =>
                  updateSetting('reminderBeforeMissionHours', parseInt(e.target.value))
                }
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsNotifications', 'followUp')}
              </label>
              <input
                type="number"
                value={settings.followUpAfterMissionHours}
                onChange={(e) =>
                  updateSetting('followUpAfterMissionHours', parseInt(e.target.value))
                }
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsNotifications', 'inactivityReminder')}
              </label>
              <input
                type="number"
                value={settings.inactivityReminderDays}
                onChange={(e) => updateSetting('inactivityReminderDays', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits & Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNotifications', 'rateLimitsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNotifications', 'rateLimitsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsNotifications', 'maxEmailsPerDay')}
              </label>
              <input
                type="number"
                value={settings.maxEmailsPerDay}
                onChange={(e) => updateSetting('maxEmailsPerDay', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsNotifications', 'maxSmsPerDay')}
              </label>
              <input
                type="number"
                value={settings.maxSmsPerDay}
                onChange={(e) => updateSetting('maxSmsPerDay', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="p-4 bg-background rounded-lg">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={settings.respectQuietHours}
                onChange={(e) => updateSetting('respectQuietHours', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsNotifications', 'respectQuietHours')}</span>
            </label>

            {settings.respectQuietHours && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('adminSettingsNotifications', 'quietHoursStart')}</label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('adminSettingsNotifications', 'quietHoursEnd')}</label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
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
          {saving ? t('adminSettingsNotifications', 'saving') : t('adminSettingsNotifications', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
