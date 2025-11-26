'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { artisanApi } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  newMissionAlerts: boolean;
  missionUpdates: boolean;
  paymentNotifications: boolean;
  reviewNotifications: boolean;
  marketingEmails: boolean;
}

export default function ArtisanSettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newMissionAlerts: true,
    missionUpdates: true,
    paymentNotifications: true,
    reviewNotifications: true,
    marketingEmails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await artisanApi.getNotificationPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await artisanApi.updateNotificationPreferences(preferences);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'preferencesSaved') || 'Preferences saved successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'preferencesError') || 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('artisan', 'settings') || 'Settings'}
        </h1>
        <p className="text-gray-600">
          {t('artisan', 'settingsDesc') || 'Manage your notification and account preferences'}
        </p>
      </div>

      {/* Notification Channels */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('artisan', 'notificationChannels') || 'Notification Channels'}</CardTitle>
          <CardDescription>
            {t('artisan', 'notificationChannelsDesc') ||
              'Choose how you want to receive notifications'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'emailNotifications') || 'Email Notifications'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'emailNotificationsDesc') || 'Receive notifications via email'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'pushNotifications') || 'Push Notifications'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'pushNotificationsDesc') ||
                  'Receive push notifications on your device'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('pushNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.pushNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.pushNotifications ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'smsNotifications') || 'SMS Notifications'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'smsNotificationsDesc') || 'Receive important alerts via SMS'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('smsNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.smsNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.smsNotifications ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('artisan', 'notificationTypes') || 'Notification Types'}</CardTitle>
          <CardDescription>
            {t('artisan', 'notificationTypesDesc') ||
              'Choose what types of notifications you want to receive'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'newMissionAlerts') || 'New Mission Alerts'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'newMissionAlertsDesc') ||
                  'Get notified when new missions are available nearby'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('newMissionAlerts')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.newMissionAlerts ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.newMissionAlerts ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'missionUpdates') || 'Mission Updates'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'missionUpdatesDesc') || 'Updates about your active missions'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('missionUpdates')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.missionUpdates ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.missionUpdates ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'paymentNotifications') || 'Payment Notifications'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'paymentNotificationsDesc') ||
                  'Notifications about payments and earnings'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('paymentNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.paymentNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.paymentNotifications ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'reviewNotifications') || 'Review Notifications'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'reviewNotificationsDesc') ||
                  'Get notified when clients leave reviews'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('reviewNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.reviewNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.reviewNotifications ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-gray-900">
                {t('artisan', 'marketingEmails') || 'Marketing Emails'}
              </div>
              <div className="text-sm text-gray-500">
                {t('artisan', 'marketingEmailsDesc') || 'News, tips, and promotional content'}
              </div>
            </div>
            <button
              onClick={() => handleToggle('marketingEmails')}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.marketingEmails ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${preferences.marketingEmails ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? t('common', 'saving') || 'Saving...'
            : t('common', 'saveChanges') || 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
