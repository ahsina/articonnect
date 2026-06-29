'use client';

import { useState, useEffect } from 'react';
import { adminApi, PaymentSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

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
      setSuccess('Payment settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      setError('Failed to save payment settings');
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

      {/* Payment Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>Enable or disable payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'stripeEnabled' as const, label: 'Stripe', icon: '💳' },
              { key: 'paypalEnabled' as const, label: 'PayPal', icon: '🅿️' },
              { key: 'bankTransferEnabled' as const, label: 'Bank Transfer', icon: '🏦' },
              { key: 'walletEnabled' as const, label: 'Wallet', icon: '👛' },
            ].map((provider) => (
              <div
                key={provider.key}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  settings[provider.key]
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-border bg-background'
                }`}
                onClick={() => updateSetting(provider.key, !settings[provider.key])}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <p className="font-medium">{provider.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {settings[provider.key] ? 'Enabled' : 'Disabled'}
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
          <CardTitle>Payment Limits</CardTitle>
          <CardDescription>Configure minimum and maximum payment amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Minimum Payment (cents)
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
                Maximum Payment (cents)
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
          <CardTitle>Payout Settings</CardTitle>
          <CardDescription>Configure artisan payout rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Payout Delay (days)
              </label>
              <input
                type="number"
                value={settings.payoutDelayDays}
                onChange={(e) => updateSetting('payoutDelayDays', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Days after mission completion</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Auto-Payout Threshold (cents)
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
                Escrow Duration (hours)
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
              <span className="text-sm text-foreground">Enable auto-payouts</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.holdFundsForDisputes}
                onChange={(e) => updateSetting('holdFundsForDisputes', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Hold funds during disputes</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Instant Payout */}
      <Card>
        <CardHeader>
          <CardTitle>Instant Payout</CardTitle>
          <CardDescription>Configure instant payout options for artisans</CardDescription>
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
              <span className="text-sm text-foreground">Enable instant payouts</span>
            </label>
          </div>
          {settings.instantPayoutEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                Instant Payout Fee (%)
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
          <CardTitle>Refund Settings</CardTitle>
          <CardDescription>Configure refund policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Refund Window (days)
              </label>
              <input
                type="number"
                value={settings.refundWindowDays}
                onChange={(e) => updateSetting('refundWindowDays', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Days after payment for refund eligibility
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
                <span className="text-sm text-foreground">Allow partial refunds</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Retry Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Retry Settings</CardTitle>
          <CardDescription>Configure automatic payment retry behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Retry Attempts</label>
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
                Retry Delay (minutes)
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
                <span className="text-sm text-foreground">Notify on failed payments</span>
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
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </div>
  );
}
