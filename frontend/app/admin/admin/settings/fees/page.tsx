'use client';

import { useState, useEffect } from 'react';
import { adminApi, FeeSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

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
      setSuccess('Fee settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving fee settings:', err);
      setError('Failed to save fee settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof FeeSettings>(key: K, value: FeeSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} EUR`;
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

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Rates</CardTitle>
          <CardDescription>Configure platform commission on transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform Commission Rate (%)
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Artisan receives: {100 - settings.platformCommissionRate}%
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Commission (cents)
              </label>
              <input
                type="number"
                value={settings.minCommissionAmount}
                onChange={(e) => updateSetting('minCommissionAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(settings.minCommissionAmount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Commission (cents)
              </label>
              <input
                type="number"
                value={settings.maxCommissionAmount}
                onChange={(e) => updateSetting('maxCommissionAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(settings.maxCommissionAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit Rules</CardTitle>
          <CardDescription>Configure deposit requirements for missions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deposit Percentage (%)
              </label>
              <input
                type="number"
                value={settings.depositPercentage}
                onChange={(e) => updateSetting('depositPercentage', parseFloat(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Deposit (cents)
              </label>
              <input
                type="number"
                value={settings.depositMinimum}
                onChange={(e) => updateSetting('depositMinimum', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(settings.depositMinimum)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Deposit (cents)
              </label>
              <input
                type="number"
                value={settings.depositMaximum}
                onChange={(e) => updateSetting('depositMaximum', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(settings.depositMaximum)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Price Multipliers</CardTitle>
          <CardDescription>Configure pricing adjustments for special circumstances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgent Mission Multiplier
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                e.g., 1.5 = 50% price increase for urgent
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weekend Multiplier
              </label>
              <input
                type="number"
                value={settings.weekendMultiplier}
                onChange={(e) => updateSetting('weekendMultiplier', parseFloat(e.target.value))}
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Holiday Multiplier
              </label>
              <input
                type="number"
                value={settings.holidayMultiplier}
                onChange={(e) => updateSetting('holidayMultiplier', parseFloat(e.target.value))}
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Fees</CardTitle>
          <CardDescription>Configure fees for mission cancellations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard Cancellation Fee (%)
              </label>
              <input
                type="number"
                value={settings.cancellationFeePercentage}
                onChange={(e) =>
                  updateSetting('cancellationFeePercentage', parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Late Cancellation Threshold (hours)
              </label>
              <input
                type="number"
                value={settings.lateCancellationHours}
                onChange={(e) => updateSetting('lateCancellationHours', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cancellations within this time apply late fee
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Late Cancellation Fee (%)
              </label>
              <input
                type="number"
                value={settings.lateCancellationFeePercentage}
                onChange={(e) =>
                  updateSetting('lateCancellationFeePercentage', parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonuses & Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Bonuses &amp; Discounts</CardTitle>
          <CardDescription>Configure promotional incentives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Artisan Payout Percentage (%)
              </label>
              <input
                type="number"
                value={settings.artisanPayoutPercentage}
                onChange={(e) =>
                  updateSetting('artisanPayoutPercentage', parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Should equal 100 - commission rate</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Bonus (cents)
              </label>
              <input
                type="number"
                value={settings.referralBonusAmount}
                onChange={(e) => updateSetting('referralBonusAmount', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(settings.referralBonusAmount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Mission Discount (%)
              </label>
              <input
                type="number"
                value={settings.firstMissionDiscount}
                onChange={(e) => updateSetting('firstMissionDiscount', parseFloat(e.target.value))}
                min="0"
                max="100"
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
          {saving ? 'Saving...' : 'Save Fee Settings'}
        </button>
      </div>
    </div>
  );
}
