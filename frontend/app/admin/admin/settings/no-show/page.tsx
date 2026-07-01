'use client';

import { useState, useEffect } from 'react';
import { adminApi, NoShowConfig } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultNoShowConfig: NoShowConfig = {
  enabled: true,
  minimumWaitTimeMinutes: 15,
  gpsVerificationRequired: true,
  gpsRadiusMeters: 100,
  photoEvidenceRequired: false,
  minContactAttempts: 2,
  compensationPercentage: 50,
  compensationMinimum: 1500,
  compensationMaximum: 10000,
  clientPenaltyPercentage: 25,
  autoValidationEnabled: false,
  autoValidationRequirements: {
    minWaitTime: 20,
    gpsVerified: true,
    minContactAttempts: 3,
  },
  disputeWindowHours: 24,
  repeatOffenderThreshold: 3,
  repeatOffenderPenaltyMultiplier: 1.5,
};

export default function NoShowConfigPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<NoShowConfig>(defaultNoShowConfig);
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
      const data = await adminApi.getNoShowConfig();
      setSettings(data);
    } catch (err) {
      console.error('Error loading no-show config:', err);
      setSettings(defaultNoShowConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateNoShowConfig(settings);
      setSuccess(t('adminSettingsNoShow', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving no-show config:', err);
      setError(t('adminSettingsNoShow', 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NoShowConfig>(key: K, value: NoShowConfig[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateAutoValidationReq = (
    key: keyof NoShowConfig['autoValidationRequirements'],
    value: number | boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      autoValidationRequirements: {
        ...prev.autoValidationRequirements,
        [key]: value,
      },
    }));
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
        <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsNoShow', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsNoShow', 'systemTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsNoShow', 'systemDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSetting('enabled', e.target.checked)}
              className="w-5 h-5 text-primary rounded"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                {t('adminSettingsNoShow', 'enableLabel')}
              </span>
              <p className="text-xs text-muted-foreground">
                {t('adminSettingsNoShow', 'enableHint')}
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {settings.enabled && (
        <>
          {/* Reporting Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettingsNoShow', 'reportingTitle')}</CardTitle>
              <CardDescription>
                {t('adminSettingsNoShow', 'reportingDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'minWaitTimeLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.minimumWaitTimeMinutes}
                    onChange={(e) =>
                      updateSetting('minimumWaitTimeMinutes', parseInt(e.target.value))
                    }
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('adminSettingsNoShow', 'minWaitTimeHint')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'gpsRadiusLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.gpsRadiusMeters}
                    onChange={(e) => updateSetting('gpsRadiusMeters', parseInt(e.target.value))}
                    min="10"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('adminSettingsNoShow', 'gpsRadiusHint')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'minContactAttemptsLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.minContactAttempts}
                    onChange={(e) => updateSetting('minContactAttempts', parseInt(e.target.value))}
                    min="0"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('adminSettingsNoShow', 'minContactAttemptsHint')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gpsVerificationRequired}
                    onChange={(e) => updateSetting('gpsVerificationRequired', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">{t('adminSettingsNoShow', 'requireGps')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.photoEvidenceRequired}
                    onChange={(e) => updateSetting('photoEvidenceRequired', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">{t('adminSettingsNoShow', 'requirePhoto')}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Compensation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettingsNoShow', 'compensationTitle')}</CardTitle>
              <CardDescription>
                {t('adminSettingsNoShow', 'compensationDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'compensationPctLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.compensationPercentage}
                    onChange={(e) =>
                      updateSetting('compensationPercentage', parseFloat(e.target.value))
                    }
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'minimumCents')}
                  </label>
                  <input
                    type="number"
                    value={settings.compensationMinimum}
                    onChange={(e) => updateSetting('compensationMinimum', parseInt(e.target.value))}
                    min="0"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(settings.compensationMinimum)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'maximumCents')}
                  </label>
                  <input
                    type="number"
                    value={settings.compensationMaximum}
                    onChange={(e) => updateSetting('compensationMaximum', parseInt(e.target.value))}
                    min="0"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(settings.compensationMaximum)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'clientPenaltyLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.clientPenaltyPercentage}
                    onChange={(e) =>
                      updateSetting('clientPenaltyPercentage', parseFloat(e.target.value))
                    }
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('adminSettingsNoShow', 'clientPenaltyHint')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Validation */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettingsNoShow', 'autoValidationTitle')}</CardTitle>
              <CardDescription>
                {t('adminSettingsNoShow', 'autoValidationDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoValidationEnabled}
                  onChange={(e) => updateSetting('autoValidationEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm font-medium text-foreground">{t('adminSettingsNoShow', 'enableAutoValidation')}</span>
              </label>

              {settings.autoValidationEnabled && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-4">
                    {t('adminSettingsNoShow', 'autoValidationReqs')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-foreground mb-1">
                        {t('adminSettingsNoShow', 'minWaitTimeShort')}
                      </label>
                      <input
                        type="number"
                        value={settings.autoValidationRequirements.minWaitTime}
                        onChange={(e) =>
                          updateAutoValidationReq('minWaitTime', parseInt(e.target.value))
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-foreground mb-1">
                        {t('adminSettingsNoShow', 'minContactAttemptsLabel')}
                      </label>
                      <input
                        type="number"
                        value={settings.autoValidationRequirements.minContactAttempts}
                        onChange={(e) =>
                          updateAutoValidationReq('minContactAttempts', parseInt(e.target.value))
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.autoValidationRequirements.gpsVerified}
                          onChange={(e) => updateAutoValidationReq('gpsVerified', e.target.checked)}
                          className="w-4 h-4 text-primary rounded"
                        />
                        <span className="text-sm text-foreground">{t('adminSettingsNoShow', 'gpsMustBeVerified')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dispute & Repeat Offenders */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettingsNoShow', 'disputeTitle')}</CardTitle>
              <CardDescription>
                {t('adminSettingsNoShow', 'disputeDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'disputeWindowLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.disputeWindowHours}
                    onChange={(e) => updateSetting('disputeWindowHours', parseInt(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsNoShow', 'disputeWindowHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'repeatThresholdLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.repeatOffenderThreshold}
                    onChange={(e) =>
                      updateSetting('repeatOffenderThreshold', parseInt(e.target.value))
                    }
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsNoShow', 'repeatThresholdHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsNoShow', 'repeatMultiplierLabel')}
                  </label>
                  <input
                    type="number"
                    value={settings.repeatOffenderPenaltyMultiplier}
                    onChange={(e) =>
                      updateSetting('repeatOffenderPenaltyMultiplier', parseFloat(e.target.value))
                    }
                    min="1"
                    step="0.1"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('adminSettingsNoShow', 'repeatMultiplierHint')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsNoShow', 'saving') : t('adminSettingsNoShow', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
