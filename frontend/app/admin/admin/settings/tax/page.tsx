'use client';

import { useState, useEffect } from 'react';
import { adminApi, TaxSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
      setSuccess(t('adminSettingsTax', 'saveSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving tax settings:', err);
      setError(t('adminSettingsTax', 'saveError'));
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
      setError(t('adminSettingsTax', 'countryExists'));
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
        <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsTax', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* VAT Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsTax', 'vatConfigTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsTax', 'vatConfigDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.vatEnabled}
                onChange={(e) => updateSetting('vatEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsTax', 'enableVat')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.reverseChargeEnabled}
                onChange={(e) => updateSetting('reverseChargeEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsTax', 'enableReverseCharge')}</span>
            </label>
          </div>

          <div className="w-48">
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('adminSettingsTax', 'defaultVatRate')}
            </label>
            <input
              type="number"
              value={settings.defaultVatRate}
              onChange={(e) => updateSetting('defaultVatRate', parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.5"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* VAT Rates by Country */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsTax', 'ratesByCountryTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsTax', 'ratesByCountryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('adminSettingsTax', 'country')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('adminSettingsTax', 'standardRatePct')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('adminSettingsTax', 'reducedRatePct')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('adminSettingsTax', 'superReducedPct')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('adminSettingsTax', 'actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
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
                        className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
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
                        className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
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
                        className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => removeVatRate(rate.country)}
                        className="text-red-600 hover:text-red-700"
                      >
                        {t('adminSettingsTax', 'remove')}
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
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsTax', 'countryCode')}</label>
              <input
                type="text"
                value={newCountry.country}
                onChange={(e) =>
                  setNewCountry((prev) => ({ ...prev, country: e.target.value.toUpperCase() }))
                }
                maxLength={2}
                placeholder="XX"
                className="w-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsTax', 'standardRate')}</label>
              <input
                type="number"
                value={newCountry.rate}
                onChange={(e) =>
                  setNewCountry((prev) => ({ ...prev, rate: parseFloat(e.target.value) }))
                }
                min="0"
                max="100"
                className="w-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsTax', 'reducedRate')}</label>
              <input
                type="number"
                value={newCountry.reducedRate}
                onChange={(e) =>
                  setNewCountry((prev) => ({ ...prev, reducedRate: parseFloat(e.target.value) }))
                }
                min="0"
                max="100"
                className="w-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={addVatRate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('adminSettingsTax', 'addCountry')}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsTax', 'invoiceTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsTax', 'invoiceDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoGenerateInvoices}
                onChange={(e) => updateSetting('autoGenerateInvoices', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsTax', 'autoGenerate')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsTax', 'invoicePrefix')}</label>
              <input
                type="text"
                value={settings.invoiceNumberPrefix}
                onChange={(e) => updateSetting('invoiceNumberPrefix', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsTax', 'invoiceNumberFormat')}
              </label>
              <input
                type="text"
                value={settings.invoiceNumberFormat}
                onChange={(e) => updateSetting('invoiceNumberFormat', e.target.value)}
                placeholder="INV-{YEAR}-{NUMBER}"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsTax', 'retentionPeriod')}
              </label>
              <input
                type="number"
                value={settings.invoiceRetentionYears}
                onChange={(e) => updateSetting('invoiceRetentionYears', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Reporting */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsTax', 'reportingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsTax', 'reportingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.taxReportingEnabled}
                onChange={(e) => updateSetting('taxReportingEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsTax', 'enableReporting')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.witholdingTaxEnabled}
                onChange={(e) => updateSetting('witholdingTaxEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsTax', 'enableWithholding')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsTax', 'reportingThreshold')}
              </label>
              <input
                type="number"
                value={settings.taxReportingThreshold}
                onChange={(e) => updateSetting('taxReportingThreshold', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {(settings.taxReportingThreshold / 100).toFixed(2)} EUR
              </p>
            </div>
            {settings.witholdingTaxEnabled && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsTax', 'withholdingRate')}
                </label>
                <input
                  type="number"
                  value={settings.witholdingTaxRate}
                  onChange={(e) => updateSetting('witholdingTaxRate', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
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
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsTax', 'saving') : t('adminSettingsTax', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
