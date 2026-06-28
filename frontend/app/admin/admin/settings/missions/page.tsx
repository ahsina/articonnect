'use client';

import { useState, useEffect } from 'react';
import { adminApi, MissionSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

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
      setSuccess('Mission settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving mission settings:', err);
      setError('Failed to save mission settings');
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
      setError('Category already exists');
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

      {/* Mission Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Limits</CardTitle>
          <CardDescription>Configure mission value and quantity limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Min Mission Value (cents)
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
                Max Mission Value (cents)
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
                Max Active Per Client
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
                Max Active Per Artisan
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
          <CardTitle>Auto-Matching</CardTitle>
          <CardDescription>Configure automatic artisan matching</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoMatchingEnabled}
              onChange={(e) => updateSetting('autoMatchingEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable auto-matching</span>
          </label>

          {settings.autoMatchingEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Search Radius (km)
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
                  Max Candidates
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
          <CardTitle>Quotation &amp; Negotiation</CardTitle>
          <CardDescription>Configure quotation and negotiation rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Quotation Validity (days)
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
              <label className="block text-sm font-medium text-foreground mb-1">Max Revisions</label>
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
                Negotiation Timeout (hours)
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
              <span className="text-sm text-foreground">Enable negotiation</span>
            </label>
            {settings.negotiationEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Max rounds:</span>
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
          <CardTitle>Validation Settings</CardTitle>
          <CardDescription>Configure mission completion validation</CardDescription>
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
              <span className="text-sm font-medium text-foreground">Enable auto-validation</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.depositRequired}
                onChange={(e) => updateSetting('depositRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Require deposit</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Auto-validation Delay (hours)
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
                Client Validation Window (hours)
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
                Deposit Refundable Until (hours)
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
          <CardTitle>Rescheduling &amp; Cancellation</CardTitle>
          <CardDescription>Configure rescheduling and cancellation policies</CardDescription>
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
              <span className="text-sm font-medium text-foreground">Allow rescheduling</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Max Reschedules Per Mission
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
                Rescheduling Deadline (hours)
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
                Cancellation Policy
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
                <option value="FLEXIBLE">Flexible</option>
                <option value="MODERATE">Moderate</option>
                <option value="STRICT">Strict</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>Configure allowed mission scheduling times</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
              <input
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => updateSetting('workingHoursStart', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
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
              <span className="text-sm text-foreground">Allow weekend missions</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.holidayMissionsAllowed}
                onChange={(e) => updateSetting('holidayMissionsAllowed', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Allow holiday missions</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Categories</CardTitle>
          <CardDescription>Manage available mission categories</CardDescription>
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
              placeholder="New category name"
              className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Urgency Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Urgency Levels</CardTitle>
          <CardDescription>Configure urgency levels and their multipliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settings.urgencyLevels.map((level, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-background rounded-lg">
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => updateUrgencyLevel(index, 'name', e.target.value)}
                  placeholder="Level name"
                  className="w-32 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
                <div>
                  <label className="block text-xs text-muted-foreground">Multiplier</label>
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
                  <label className="block text-xs text-muted-foreground">Max Response (hours)</label>
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
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Mission Settings'}
        </button>
      </div>
    </div>
  );
}
