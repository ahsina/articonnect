'use client';

import { useState, useEffect } from 'react';
import { adminApi, PaymentSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultPaymentSettings: PaymentSettings = {
  stripeEnabled: true,
  paypalEnabled: false,
  bankTransferEnabled: true,
  walletEnabled: true,
  minPaymentAmount: 500,
  maxPaymentAmount: 1000000,
  payoutDelayDays: 7,
  autoPayoutEnabled: true,
  autoPayoutThreshold: 5000,
  refundWindowDays: 14,
  partialRefundEnabled: true,
  instantPayoutEnabled: false,
  instantPayoutFeePercentage: 1.5,
  holdFundsForDisputes: true,
  escrowDurationHours: 72,
  paymentRetryAttempts: 3,
  paymentRetryDelayMinutes: 60,
  failedPaymentNotification: true,
};

export default function PaymentSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<PaymentSettings>(defaultPaymentSettings);
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
      const data = await adminApi.getPaymentSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading payment settings:', err);
      setSettings(defaultPaymentSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updatePaymentSettings(settings);
      setSuccess(t('adminSettingsPayments', 'saveSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      setError(t('adminSettingsPayments', 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (cents: number) => `${(cents / 100).toFixed(2)} EUR`;

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
            {t('adminSettingsPayments', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Payment Providers */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPayments', 'providersTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPayments', 'providersDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'stripeEnabled' as const, label: 'Stripe', icon: '' },
              { key: 'paypalEnabled' as const, label: 'PayPal', icon: '🅿' },
              { key: 'bankTransferEnabled' as const, label: t('adminSettingsPayments', 'bankTransfer'), icon: '' },
              { key: 'walletEnabled' as const, label: t('adminSettingsPayments', 'wallet'), icon: '' },
            ].map((provider) => (
              <div
                key={provider.key}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  settings[provider.key]
                    ? 'border-green-500 bg-green-100'
                    : 'border-border bg-background'
                }`}
                onClick={() => updateSetting(provider.key, !settings[provider.key])}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <p className="font-medium">{provider.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {settings[provider.key] ? t('adminSettingsPayments', 'enabled') : t('adminSettingsPayments', 'disabled')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Limits */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPayments', 'limitsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPayments', 'limitsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'minPayment')}
              </label>
              <input
                type="number"
                value={settings.minPaymentAmount}
                onChange={(e) => updateSetting('minPaymentAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.minPaymentAmount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'maxPayment')}
              </label>
              <input
                type="number"
                value={settings.maxPaymentAmount}
                onChange={(e) => updateSetting('maxPaymentAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.maxPaymentAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPayments', 'payoutTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPayments', 'payoutDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'payoutDelay')}
              </label>
              <input
                type="number"
                value={settings.payoutDelayDays}
                onChange={(e) => updateSetting('payoutDelayDays', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsPayments', 'daysAfterCompletion')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'autoPayoutThreshold')}
              </label>
              <input
                type="number"
                value={settings.autoPayoutThreshold}
                onChange={(e) => updateSetting('autoPayoutThreshold', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.autoPayoutThreshold)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'escrowDuration')}
              </label>
              <input
                type="number"
                value={settings.escrowDurationHours}
                onChange={(e) => updateSetting('escrowDurationHours', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoPayoutEnabled}
                onChange={(e) => updateSetting('autoPayoutEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPayments', 'enableAutoPayouts')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.holdFundsForDisputes}
                onChange={(e) => updateSetting('holdFundsForDisputes', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPayments', 'holdFunds')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Instant Payout */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPayments', 'instantPayoutTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPayments', 'instantPayoutDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.instantPayoutEnabled}
                onChange={(e) => updateSetting('instantPayoutEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPayments', 'enableInstantPayouts')}</span>
            </label>
          </div>
          {settings.instantPayoutEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'instantPayoutFee')}
              </label>
              <input
                type="number"
                value={settings.instantPayoutFeePercentage}
                onChange={(e) =>
                  updateSetting('instantPayoutFeePercentage', parseFloat(e.target.value))
                }
                min="0"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPayments', 'refundTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPayments', 'refundDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'refundWindow')}
              </label>
              <input
                type="number"
                value={settings.refundWindowDays}
                onChange={(e) => updateSetting('refundWindowDays', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminSettingsPayments', 'refundEligibility')}
              </p>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.partialRefundEnabled}
                  onChange={(e) => updateSetting('partialRefundEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsPayments', 'allowPartialRefunds')}</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Retry Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPayments', 'retryTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPayments', 'retryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsPayments', 'retryAttempts')}</label>
              <input
                type="number"
                value={settings.paymentRetryAttempts}
                onChange={(e) => updateSetting('paymentRetryAttempts', parseInt(e.target.value))}
                min="0"
                max="10"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPayments', 'retryDelay')}
              </label>
              <input
                type="number"
                value={settings.paymentRetryDelayMinutes}
                onChange={(e) =>
                  updateSetting('paymentRetryDelayMinutes', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.failedPaymentNotification}
                  onChange={(e) => updateSetting('failedPaymentNotification', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm text-foreground">{t('adminSettingsPayments', 'notifyFailed')}</span>
              </label>
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
          {saving ? t('adminSettingsPayments', 'saving') : t('adminSettingsPayments', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
