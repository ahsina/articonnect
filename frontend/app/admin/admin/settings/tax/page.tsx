'use client';

import { useState, useEffect } from 'react';
import { adminApi, TaxSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const defaultTaxSettings: TaxSettings = {
  vatEnabled: true,
  defaultVatRate: 20,
  vatRates: [
    { country: 'FR', rate: 20, reducedRate: 10, superReducedRate: 5.5 },
    { country: 'DE', rate: 19, reducedRate: 7 },
    { country: 'ES', rate: 21, reducedRate: 10, superReducedRate: 4 },
    { country: 'IT', rate: 22, reducedRate: 10, superReducedRate: 4 },
    { country: 'BE', rate: 21, reducedRate: 12, superReducedRate: 6 },
  ],
  vatExemptCategories: [],
  reverseChargeEnabled: true,
  invoiceNumberPrefix: 'INV',
  invoiceNumberFormat: 'INV-{YEAR}-{NUMBER}',
  autoGenerateInvoices: true,
  invoiceRetentionYears: 10,
  taxReportingEnabled: true,
  taxReportingThreshold: 100000,
  witholdingTaxEnabled: false,
  witholdingTaxRate: 0,
};

export default function TaxSettingsPage() {
  const [settings, setSettings] = useState<TaxSettings>(defaultTaxSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCountry, setNewCountry] = useState({ country: '', rate: 20, reducedRate: 0 });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getTaxSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading tax settings:', err);
      setSettings(defaultTaxSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateTaxSettings(settings);
      setSuccess('Tax settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving tax settings:', err);
      setError('Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof TaxSettings>(key: K, value: TaxSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addVatRate = () => {
    if (!newCountry.country) return;
    const exists = settings.vatRates.some((r) => r.country === newCountry.country);
    if (exists) {
      setError('Country already exists');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      vatRates: [
        ...prev.vatRates,
        {
          country: newCountry.country,
          rate: newCountry.rate,
          reducedRate: newCountry.reducedRate || undefined,
        },
      ],
    }));
    setNewCountry({ country: '', rate: 20, reducedRate: 0 });
  };

  const removeVatRate = (country: string) => {
    setSettings((prev) => ({
      ...prev,
      vatRates: prev.vatRates.filter((r) => r.country !== country),
    }));
  };

  const updateVatRate = (
    country: string,
    field: 'rate' | 'reducedRate' | 'superReducedRate',
    value: number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      vatRates: prev.vatRates.map((r) => (r.country === country ? { ...r, [field]: value } : r)),
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

      {/* VAT Settings */}
      <Card>
        <CardHeader>
          <CardTitle>VAT Configuration</CardTitle>
          <CardDescription>Configure Value Added Tax settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.vatEnabled}
                onChange={(e) => updateSetting('vatEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enable VAT</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.reverseChargeEnabled}
                onChange={(e) => updateSetting('reverseChargeEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable reverse charge (B2B)</span>
            </label>
          </div>

          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default VAT Rate (%)
            </label>
            <input
              type="number"
              value={settings.defaultVatRate}
              onChange={(e) => updateSetting('defaultVatRate', parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* VAT Rates by Country */}
      <Card>
        <CardHeader>
          <CardTitle>VAT Rates by Country</CardTitle>
          <CardDescription>Configure country-specific VAT rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Country
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Standard Rate (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reduced Rate (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Super Reduced (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.vatRates.map((rate) => (
                  <tr key={rate.country}>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{rate.country}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={rate.rate}
                        onChange={(e) =>
                          updateVatRate(rate.country, 'rate', parseFloat(e.target.value))
                        }
                        min="0"
                        max="100"
                        step="0.5"
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={rate.reducedRate || 0}
                        onChange={(e) =>
                          updateVatRate(rate.country, 'reducedRate', parseFloat(e.target.value))
                        }
                        min="0"
                        max="100"
                        step="0.5"
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={rate.superReducedRate || 0}
                        onChange={(e) =>
                          updateVatRate(
                            rate.country,
                            'superReducedRate',
                            parseFloat(e.target.value),
                          )
                        }
                        min="0"
                        max="100"
                        step="0.5"
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => removeVatRate(rate.country)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Country */}
          <div className="mt-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
              <input
                type="text"
                value={newCountry.country}
                onChange={(e) =>
                  setNewCountry((prev) => ({ ...prev, country: e.target.value.toUpperCase() }))
                }
                maxLength={2}
                placeholder="XX"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard Rate</label>
              <input
                type="number"
                value={newCountry.rate}
                onChange={(e) =>
                  setNewCountry((prev) => ({ ...prev, rate: parseFloat(e.target.value) }))
                }
                min="0"
                max="100"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reduced Rate</label>
              <input
                type="number"
                value={newCountry.reducedRate}
                onChange={(e) =>
                  setNewCountry((prev) => ({ ...prev, reducedRate: parseFloat(e.target.value) }))
                }
                min="0"
                max="100"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={addVatRate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Country
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Settings</CardTitle>
          <CardDescription>Configure invoice generation and format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoGenerateInvoices}
                onChange={(e) => updateSetting('autoGenerateInvoices', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Auto-generate invoices</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoiceNumberPrefix}
                onChange={(e) => updateSetting('invoiceNumberPrefix', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number Format
              </label>
              <input
                type="text"
                value={settings.invoiceNumberFormat}
                onChange={(e) => updateSetting('invoiceNumberFormat', e.target.value)}
                placeholder="INV-{YEAR}-{NUMBER}"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retention Period (years)
              </label>
              <input
                type="number"
                value={settings.invoiceRetentionYears}
                onChange={(e) => updateSetting('invoiceRetentionYears', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Reporting */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Reporting</CardTitle>
          <CardDescription>Configure tax reporting thresholds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.taxReportingEnabled}
                onChange={(e) => updateSetting('taxReportingEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable tax reporting</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.witholdingTaxEnabled}
                onChange={(e) => updateSetting('witholdingTaxEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable withholding tax</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reporting Threshold (cents)
              </label>
              <input
                type="number"
                value={settings.taxReportingThreshold}
                onChange={(e) => updateSetting('taxReportingThreshold', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {(settings.taxReportingThreshold / 100).toFixed(2)} EUR
              </p>
            </div>
            {settings.witholdingTaxEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Withholding Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={settings.witholdingTaxRate}
                  onChange={(e) => updateSetting('witholdingTaxRate', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Tax Settings'}
        </button>
      </div>
    </div>
  );
}
