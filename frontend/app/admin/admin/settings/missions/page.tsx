'use client';

import { useState, useEffect } from 'react';
import { adminApi, MissionSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultMissionSettings: MissionSettings = {
  minMissionValue: 1000,
  maxMissionValue: 5000000,
  maxActiveMissionsPerClient: 10,
  maxActiveMissionsPerArtisan: 20,
  autoMatchingEnabled: true,
  autoMatchingRadius: 50,
  autoMatchingMaxCandidates: 10,
  quotationValidityDays: 7,
  quotationMaxRevisions: 3,
  negotiationEnabled: true,
  maxNegotiationRounds: 5,
  negotiationTimeoutHours: 48,
  depositRequired: true,
  depositRefundableUntilHours: 48,
  autoValidationEnabled: true,
  autoValidationDelayHours: 72,
  clientValidationWindowHours: 48,
  allowRescheduling: true,
  maxReschedulesPerMission: 2,
  reschedulingDeadlineHours: 24,
  cancellationPolicy: 'MODERATE',
  categories: [
    'Plumbing',
    'Electrical',
    'Painting',
    'Carpentry',
    'Cleaning',
    'Moving',
    'Gardening',
  ],
  urgencyLevels: [
    { name: 'Normal', multiplier: 1, maxResponseHours: 72 },
    { name: 'Urgent', multiplier: 1.5, maxResponseHours: 24 },
    { name: 'Emergency', multiplier: 2, maxResponseHours: 4 },
  ],
  workingHoursStart: '08:00',
  workingHoursEnd: '20:00',
  weekendMissionsAllowed: true,
  holidayMissionsAllowed: false,
};

export default function MissionSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<MissionSettings>(defaultMissionSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getMissionSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading mission settings:', err);
      setSettings(defaultMissionSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateMissionSettings(settings);
      setSuccess(t('adminSettingsMissions', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving mission settings:', err);
      setError(t('adminSettingsMissions', 'saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof MissionSettings>(key: K, value: MissionSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (settings.categories.includes(newCategory.trim())) {
      setError(t('adminSettingsMissions', 'categoryExists'));
      return;
    }
    setSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory.trim()],
    }));
    setNewCategory('');
  };

  const removeCategory = (category: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== category),
    }));
  };

  const updateUrgencyLevel = (
    index: number,
    field: keyof MissionSettings['urgencyLevels'][0],
    value: string | number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      urgencyLevels: prev.urgencyLevels.map((level, i) =>
        i === index ? { ...level, [field]: value } : level,
      ),
    }));
  };

  const formatCurrency = (cents: number) => `${(Number(cents / 100) || 0).toFixed(2)} EUR`;

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
            {t('adminSettingsMissions', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Mission Limits */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'missionLimitsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'missionLimitsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'minMissionValue')}
              </label>
              <input
                type="number"
                value={settings.minMissionValue}
                onChange={(e) => updateSetting('minMissionValue', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.minMissionValue)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'maxMissionValue')}
              </label>
              <input
                type="number"
                value={settings.maxMissionValue}
                onChange={(e) => updateSetting('maxMissionValue', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(settings.maxMissionValue)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'maxActivePerClient')}
              </label>
              <input
                type="number"
                value={settings.maxActiveMissionsPerClient}
                onChange={(e) =>
                  updateSetting('maxActiveMissionsPerClient', parseInt(e.target.value))
                }
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'maxActivePerArtisan')}
              </label>
              <input
                type="number"
                value={settings.maxActiveMissionsPerArtisan}
                onChange={(e) =>
                  updateSetting('maxActiveMissionsPerArtisan', parseInt(e.target.value))
                }
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Matching */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'autoMatchingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'autoMatchingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoMatchingEnabled}
              onChange={(e) => updateSetting('autoMatchingEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsMissions', 'enableAutoMatching')}</span>
          </label>

          {settings.autoMatchingEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsMissions', 'searchRadius')}
                </label>
                <input
                  type="number"
                  value={settings.autoMatchingRadius}
                  onChange={(e) => updateSetting('autoMatchingRadius', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsMissions', 'maxCandidates')}
                </label>
                <input
                  type="number"
                  value={settings.autoMatchingMaxCandidates}
                  onChange={(e) =>
                    updateSetting('autoMatchingMaxCandidates', parseInt(e.target.value))
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotation & Negotiation */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'quotationNegotiationTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'quotationNegotiationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'quotationValidity')}
              </label>
              <input
                type="number"
                value={settings.quotationValidityDays}
                onChange={(e) => updateSetting('quotationValidityDays', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsMissions', 'maxRevisions')}</label>
              <input
                type="number"
                value={settings.quotationMaxRevisions}
                onChange={(e) => updateSetting('quotationMaxRevisions', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'negotiationTimeout')}
              </label>
              <input
                type="number"
                value={settings.negotiationTimeoutHours}
                onChange={(e) => updateSetting('negotiationTimeoutHours', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.negotiationEnabled}
                onChange={(e) => updateSetting('negotiationEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsMissions', 'enableNegotiation')}</span>
            </label>
            {settings.negotiationEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('adminSettingsMissions', 'maxRounds')}</span>
                <input
                  type="number"
                  value={settings.maxNegotiationRounds}
                  onChange={(e) => updateSetting('maxNegotiationRounds', parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'validationTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'validationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoValidationEnabled}
                onChange={(e) => updateSetting('autoValidationEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsMissions', 'enableAutoValidation')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.depositRequired}
                onChange={(e) => updateSetting('depositRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsMissions', 'requireDeposit')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'autoValidationDelay')}
              </label>
              <input
                type="number"
                value={settings.autoValidationDelayHours}
                onChange={(e) =>
                  updateSetting('autoValidationDelayHours', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'clientValidationWindow')}
              </label>
              <input
                type="number"
                value={settings.clientValidationWindowHours}
                onChange={(e) =>
                  updateSetting('clientValidationWindowHours', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'depositRefundableUntil')}
              </label>
              <input
                type="number"
                value={settings.depositRefundableUntilHours}
                onChange={(e) =>
                  updateSetting('depositRefundableUntilHours', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rescheduling & Cancellation */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'reschedulingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'reschedulingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowRescheduling}
                onChange={(e) => updateSetting('allowRescheduling', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">{t('adminSettingsMissions', 'allowRescheduling')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'maxReschedulesPerMission')}
              </label>
              <input
                type="number"
                value={settings.maxReschedulesPerMission}
                onChange={(e) =>
                  updateSetting('maxReschedulesPerMission', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'reschedulingDeadline')}
              </label>
              <input
                type="number"
                value={settings.reschedulingDeadlineHours}
                onChange={(e) =>
                  updateSetting('reschedulingDeadlineHours', parseInt(e.target.value))
                }
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsMissions', 'cancellationPolicy')}
              </label>
              <select
                value={settings.cancellationPolicy}
                onChange={(e) =>
                  updateSetting(
                    'cancellationPolicy',
                    e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT',
                  )
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="FLEXIBLE">{t('adminSettingsMissions', 'policyFlexible')}</option>
                <option value="MODERATE">{t('adminSettingsMissions', 'policyModerate')}</option>
                <option value="STRICT">{t('adminSettingsMissions', 'policyStrict')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'workingHoursTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'workingHoursDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsMissions', 'startTime')}</label>
              <input
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => updateSetting('workingHoursStart', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsMissions', 'endTime')}</label>
              <input
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) => updateSetting('workingHoursEnd', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.weekendMissionsAllowed}
                onChange={(e) => updateSetting('weekendMissionsAllowed', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsMissions', 'allowWeekendMissions')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.holidayMissionsAllowed}
                onChange={(e) => updateSetting('holidayMissionsAllowed', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsMissions', 'allowHolidayMissions')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'categoriesTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'categoriesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {settings.categories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {category}
                <button
                  onClick={() => removeCategory(category)}
                  className="text-primary hover:text-primary"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t('adminSettingsMissions', 'newCategoryPlaceholder')}
              className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('adminSettingsMissions', 'add')}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Urgency Levels */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsMissions', 'urgencyLevelsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsMissions', 'urgencyLevelsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settings.urgencyLevels.map((level, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-background rounded-lg">
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => updateUrgencyLevel(index, 'name', e.target.value)}
                  placeholder={t('adminSettingsMissions', 'levelNamePlaceholder')}
                  className="w-32 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
                <div>
                  <label className="block text-xs text-muted-foreground">{t('adminSettingsMissions', 'multiplier')}</label>
                  <input
                    type="number"
                    value={level.multiplier}
                    onChange={(e) =>
                      updateUrgencyLevel(index, 'multiplier', parseFloat(e.target.value))
                    }
                    min="1"
                    step="0.1"
                    className="w-24 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">{t('adminSettingsMissions', 'maxResponse')}</label>
                  <input
                    type="number"
                    value={level.maxResponseHours}
                    onChange={(e) =>
                      updateUrgencyLevel(index, 'maxResponseHours', parseInt(e.target.value))
                    }
                    min="1"
                    className="w-24 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            ))}
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
          {saving ? t('adminSettingsMissions', 'saving') : t('adminSettingsMissions', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
