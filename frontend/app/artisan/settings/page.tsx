'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { artisanApi } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
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

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadPreferences();
    if (user) {
      setPhoneNumber(user.phone || '');
      setPhoneVerified(user.phoneVerified || false);
    }
  }, [user]);

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

  const handleSendVerificationCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('settings', 'invalidPhone') || 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    setSendingCode(true);
    try {
      await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      setShowVerificationInput(true);
      toast({
        title: t('settings', 'codeSent') || 'Code Sent',
        description: t('settings', 'codeSentDesc') || 'Verification code sent to your phone',
      });
    } catch (error) {
      console.error('Error sending code:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('settings', 'sendCodeError') || 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('settings', 'invalidCode') || 'Please enter a valid code',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch('/api/auth/phone/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: verificationCode }),
      });

      if (response.ok) {
        setPhoneVerified(true);
        setShowVerificationInput(false);
        setVerificationCode('');
        toast({
          title: t('settings', 'phoneVerified') || 'Phone Verified',
          description: t('settings', 'phoneVerifiedDesc') || 'Your phone number has been verified',
          variant: 'success',
        });
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('settings', 'verifyCodeError') || 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
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
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const Toggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-[46px] h-[26px] rounded-full transition-colors flex-shrink-0 ${active ? 'bg-primary' : 'bg-muted-foreground/25'}`}
    >
      <span
        className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${active ? 'left-[23px]' : 'left-[3px]'}`}
      />
    </button>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">
          {t('artisan', 'settings') || 'Settings'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('artisan', 'settingsDesc') || 'Manage your notification and account preferences'}
        </p>
      </div>

      {/* Notification Channels */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display">{t('artisan', 'notificationChannels') || 'Notification Channels'}</CardTitle>
          <CardDescription>
            {t('artisan', 'notificationChannelsDesc') ||
              'Choose how you want to receive notifications'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'emailNotifications') || 'Email Notifications'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'emailNotificationsDesc') || 'Receive notifications via email'}
              </div>
            </div>
            <Toggle active={preferences.emailNotifications} onClick={() => handleToggle('emailNotifications')} />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'pushNotifications') || 'Push Notifications'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'pushNotificationsDesc') ||
                  'Receive push notifications on your device'}
              </div>
            </div>
            <Toggle active={preferences.pushNotifications} onClick={() => handleToggle('pushNotifications')} />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'smsNotifications') || 'SMS Notifications'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'smsNotificationsDesc') || 'Receive important alerts via SMS'}
              </div>
            </div>
            <Toggle active={preferences.smsNotifications} onClick={() => handleToggle('smsNotifications')} />
          </div>
        </CardContent>
      </Card>

      {/* Phone Verification */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            {t('settings', 'phoneVerification') || 'Phone Verification'}
            {phoneVerified && (
              <Badge className="bg-success/10 text-success">
                {t('settings', 'verified') || 'Verified'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t('settings', 'phoneVerificationDesc') ||
              'Verify your phone number to receive SMS notifications and improve account security'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Input
                type="tel"
                placeholder="+352 123 456 789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={phoneVerified}
                className="flex-1 min-w-[180px]"
              />
              {!phoneVerified && (
                <Button
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode || !phoneNumber}
                  variant={showVerificationInput ? 'outline' : 'default'}
                >
                  {sendingCode
                    ? t('settings', 'sending') || 'Sending...'
                    : showVerificationInput
                    ? t('settings', 'resendCode') || 'Resend Code'
                    : t('settings', 'sendCode') || 'Send Code'}
                </Button>
              )}
            </div>

            {showVerificationInput && !phoneVerified && (
              <div className="flex gap-3 flex-wrap">
                <Input
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="flex-1 min-w-[180px]"
                />
                <Button onClick={handleVerifyCode} disabled={verifying || verificationCode.length < 6}>
                  {verifying ? t('settings', 'verifying') || 'Verifying...' : t('settings', 'verify') || 'Verify'}
                </Button>
              </div>
            )}

            {phoneVerified && (
              <div className="p-3 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2.5">
                <svg className="h-4 w-4 text-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-success text-sm">
                  {t('settings', 'phoneVerifiedMessage') || 'Your phone number is verified'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display">{t('artisan', 'notificationTypes') || 'Notification Types'}</CardTitle>
          <CardDescription>
            {t('artisan', 'notificationTypesDesc') ||
              'Choose what types of notifications you want to receive'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'newMissionAlerts') || 'New Mission Alerts'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'newMissionAlertsDesc') ||
                  'Get notified when new missions are available nearby'}
              </div>
            </div>
            <Toggle active={preferences.newMissionAlerts} onClick={() => handleToggle('newMissionAlerts')} />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'missionUpdates') || 'Mission Updates'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'missionUpdatesDesc') || 'Updates about your active missions'}
              </div>
            </div>
            <Toggle active={preferences.missionUpdates} onClick={() => handleToggle('missionUpdates')} />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'paymentNotifications') || 'Payment Notifications'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'paymentNotificationsDesc') ||
                  'Notifications about payments and earnings'}
              </div>
            </div>
            <Toggle active={preferences.paymentNotifications} onClick={() => handleToggle('paymentNotifications')} />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'reviewNotifications') || 'Review Notifications'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'reviewNotificationsDesc') ||
                  'Get notified when clients leave reviews'}
              </div>
            </div>
            <Toggle active={preferences.reviewNotifications} onClick={() => handleToggle('reviewNotifications')} />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <div className="font-medium text-foreground">
                {t('artisan', 'marketingEmails') || 'Marketing Emails'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'marketingEmailsDesc') || 'News, tips, and promotional content'}
              </div>
            </div>
            <Toggle active={preferences.marketingEmails} onClick={() => handleToggle('marketingEmails')} />
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
