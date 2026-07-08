'use client';

import { useState, useEffect } from 'react';
import { adminApi, FeeSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultFeeSettings: FeeSettings = {
  platformCommissionRate: 15,
  minCommissionAmount: 100,
  maxCommissionAmount: 50000,
  depositPercentage: 30,
  depositMinimum: 500,
  depositMaximum: 100000,
  urgentMissionMultiplier: 1.5,
  weekendMultiplier: 1.2,
  holidayMultiplier: 1.5,
  cancellationFeePercentage: 10,
  lateCancellationHours: 24,
  lateCancellationFeePercentage: 25,
  artisanPayoutPercentage: 85,
  referralBonusAmount: 1000,
  firstMissionDiscount: 10,
};

export default function FeesSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<FeeSettings>(defaultFeeSettings);
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
      const data = await adminApi.getFeeSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading fee settings:', err);
      // Use default settings if API fails
      setSettings(defaultFeeSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateFeeSettings(settings);
      setSuccess(t('adminSettingsFees', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving fee settings:', err);
      setError(t('adminSettingsFees', 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof FeeSettings>(key: K, value: FeeSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (cents: number) => {
    return `${(Number(cents / 100) || 0).toFixed(2)} EUR`;
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
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-100 border rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsFees', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsFees', 'commissionTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsFees', 'commissionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'platformCommissionLabel')}
              </label>
              <input
                type="number"
                value={settings.platformCommissionRate}
                onChange={(e) =>
                  updateSetting('platformCommissionRate', parseFloat(e.target.value))
                }
                min="0"
                max="50"
                step="0.5"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminSettingsFees', 'artisanReceives')}: {100 - settings.platformCommissionRate}%
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'minCommissionLabel')}
              </label>
              <input
                type="number"
                value={settings.minCommissionAmount}
                onChange={(e) => updateSetting('minCommissionAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.minCommissionAmount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'maxCommissionLabel')}
              </label>
              <input
                type="number"
                value={settings.maxCommissionAmount}
                onChange={(e) => updateSetting('maxCommissionAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.maxCommissionAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsFees', 'depositTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsFees', 'depositDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'depositPercentageLabel')}
              </label>
              <input
                type="number"
                value={settings.depositPercentage}
                onChange={(e) => updateSetting('depositPercentage', parseFloat(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'minDepositLabel')}
              </label>
              <input
                type="number"
                value={settings.depositMinimum}
                onChange={(e) => updateSetting('depositMinimum', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.depositMinimum)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'maxDepositLabel')}
              </label>
              <input
                type="number"
                value={settings.depositMaximum}
                onChange={(e) => updateSetting('depositMaximum', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.depositMaximum)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsFees', 'multipliersTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsFees', 'multipliersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'urgentMultiplierLabel')}
              </label>
              <input
                type="number"
                value={settings.urgentMissionMultiplier}
                onChange={(e) =>
                  updateSetting('urgentMissionMultiplier', parseFloat(e.target.value))
                }
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminSettingsFees', 'urgentMultiplierHint')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'weekendMultiplierLabel')}
              </label>
              <input
                type="number"
                value={settings.weekendMultiplier}
                onChange={(e) => updateSetting('weekendMultiplier', parseFloat(e.target.value))}
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'holidayMultiplierLabel')}
              </label>
              <input
                type="number"
                value={settings.holidayMultiplier}
                onChange={(e) => updateSetting('holidayMultiplier', parseFloat(e.target.value))}
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Fees */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsFees', 'cancellationTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsFees', 'cancellationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'standardCancellationLabel')}
              </label>
              <input
                type="number"
                value={settings.cancellationFeePercentage}
                onChange={(e) =>
                  updateSetting('cancellationFeePercentage', parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'lateCancellationThresholdLabel')}
              </label>
              <input
                type="number"
                value={settings.lateCancellationHours}
                onChange={(e) => updateSetting('lateCancellationHours', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminSettingsFees', 'lateCancellationThresholdHint')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'lateCancellationFeeLabel')}
              </label>
              <input
                type="number"
                value={settings.lateCancellationFeePercentage}
                onChange={(e) =>
                  updateSetting('lateCancellationFeePercentage', parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonuses & Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsFees', 'bonusesTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsFees', 'bonusesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'artisanPayoutLabel')}
              </label>
              <input
                type="number"
                value={settings.artisanPayoutPercentage}
                onChange={(e) =>
                  updateSetting('artisanPayoutPercentage', parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsFees', 'artisanPayoutHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'referralBonusLabel')}
              </label>
              <input
                type="number"
                value={settings.referralBonusAmount}
                onChange={(e) => updateSetting('referralBonusAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.referralBonusAmount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsFees', 'firstMissionDiscountLabel')}
              </label>
              <input
                type="number"
                value={settings.firstMissionDiscount}
                onChange={(e) => updateSetting('firstMissionDiscount', parseFloat(e.target.value))}
                min="0"
                max="100"
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
          {saving ? t('adminSettingsFees', 'saving') : t('adminSettingsFees', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
