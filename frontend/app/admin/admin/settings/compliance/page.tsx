'use client';

import { useState, useEffect } from 'react';
import { adminApi, ComplianceSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const defaultComplianceSettings: ComplianceSettings = {
  gdprEnabled: true,
  gdprDataRetentionDays: 1095,
  gdprRightToErasure: true,
  gdprDataPortability: true,
  gdprConsentRequired: true,
  gdprCookieConsentRequired: true,
  ccpaEnabled: false,
  ccpaDoNotSellEnabled: false,
  ageVerificationRequired: false,
  minimumAge: 18,
  termsVersion: '1.0.0',
  termsLastUpdated: '2024-01-01',
  privacyPolicyVersion: '1.0.0',
  privacyPolicyLastUpdated: '2024-01-01',
  requiredDocuments: ['ID', 'ProofOfAddress'],
  documentExpiryCheckEnabled: true,
  documentExpiryReminderDays: 30,
  amlCheckRequired: false,
  amlCheckProvider: '',
  amlCheckThreshold: 100000,
  pep_screening_enabled: false,
  sanctionsListCheckEnabled: false,
  dataEncryptionAtRest: true,
  dataEncryptionInTransit: true,
  auditLoggingEnabled: true,
  auditLogRetentionDays: 365,
};

export default function ComplianceSettingsPage() {
  const [settings, setSettings] = useState<ComplianceSettings>(defaultComplianceSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getComplianceSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading compliance settings:', err);
      setSettings(defaultComplianceSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateComplianceSettings(settings);
      setSuccess('Compliance settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving compliance settings:', err);
      setError('Failed to save compliance settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ComplianceSettings>(
    key: K,
    value: ComplianceSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addDocument = () => {
    if (!newDocument.trim()) return;
    if (settings.requiredDocuments.includes(newDocument.trim())) return;
    setSettings((prev) => ({
      ...prev,
      requiredDocuments: [...prev.requiredDocuments, newDocument.trim()],
    }));
    setNewDocument('');
  };

  const removeDocument = (doc: string) => {
    setSettings((prev) => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter((d) => d !== doc),
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

      {/* GDPR Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>GDPR Compliance</CardTitle>
          <CardDescription>General Data Protection Regulation settings (EU)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.gdprEnabled}
              onChange={(e) => updateSetting('gdprEnabled', e.target.checked)}
              className="w-5 h-5 text-primary rounded"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Enable GDPR Compliance</span>
              <p className="text-xs text-muted-foreground">Enforce GDPR requirements for EU users</p>
            </div>
          </label>

          {settings.gdprEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Data Retention Period (days)
                  </label>
                  <input
                    type="number"
                    value={settings.gdprDataRetentionDays}
                    onChange={(e) =>
                      updateSetting('gdprDataRetentionDays', parseInt(e.target.value))
                    }
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    ~{Math.round(settings.gdprDataRetentionDays / 365)} years
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprRightToErasure}
                    onChange={(e) => updateSetting('gdprRightToErasure', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Right to erasure</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprDataPortability}
                    onChange={(e) => updateSetting('gdprDataPortability', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Data portability</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprConsentRequired}
                    onChange={(e) => updateSetting('gdprConsentRequired', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Require explicit consent</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprCookieConsentRequired}
                    onChange={(e) => updateSetting('gdprCookieConsentRequired', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">Cookie consent required</span>
                </label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* CCPA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>CCPA Compliance</CardTitle>
          <CardDescription>California Consumer Privacy Act settings (US)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ccpaEnabled}
              onChange={(e) => updateSetting('ccpaEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Enable CCPA Compliance</span>
          </label>

          {settings.ccpaEnabled && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.ccpaDoNotSellEnabled}
                onChange={(e) => updateSetting('ccpaDoNotSellEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">
                Enable &quot;Do Not Sell My Personal Information&quot; option
              </span>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Age Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Age Verification</CardTitle>
          <CardDescription>Configure age verification requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ageVerificationRequired}
              onChange={(e) => updateSetting('ageVerificationRequired', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Require Age Verification</span>
          </label>

          {settings.ageVerificationRequired && (
            <div className="w-32">
              <label className="block text-sm font-medium text-foreground mb-1">Minimum Age</label>
              <input
                type="number"
                value={settings.minimumAge}
                onChange={(e) => updateSetting('minimumAge', parseInt(e.target.value))}
                min="13"
                max="21"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Terms &amp; Privacy Policy</CardTitle>
          <CardDescription>Manage terms of service and privacy policy versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-background rounded-lg">
              <h4 className="font-medium text-foreground mb-3">Terms of Service</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Version</label>
                  <input
                    type="text"
                    value={settings.termsVersion}
                    onChange={(e) => updateSetting('termsVersion', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Last Updated</label>
                  <input
                    type="date"
                    value={settings.termsLastUpdated}
                    onChange={(e) => updateSetting('termsLastUpdated', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <h4 className="font-medium text-foreground mb-3">Privacy Policy</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Version</label>
                  <input
                    type="text"
                    value={settings.privacyPolicyVersion}
                    onChange={(e) => updateSetting('privacyPolicyVersion', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Last Updated</label>
                  <input
                    type="date"
                    value={settings.privacyPolicyLastUpdated}
                    onChange={(e) => updateSetting('privacyPolicyLastUpdated', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Document Requirements</CardTitle>
          <CardDescription>Configure required identity documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Required Documents
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {settings.requiredDocuments.map((doc) => (
                <span
                  key={doc}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {doc}
                  <button
                    onClick={() => removeDocument(doc)}
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
                value={newDocument}
                onChange={(e) => setNewDocument(e.target.value)}
                placeholder="Document type"
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && addDocument()}
              />
              <button
                onClick={addDocument}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.documentExpiryCheckEnabled}
                onChange={(e) => updateSetting('documentExpiryCheckEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Check document expiry</span>
            </label>
            {settings.documentExpiryCheckEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Remind</span>
                <input
                  type="number"
                  value={settings.documentExpiryReminderDays}
                  onChange={(e) =>
                    updateSetting('documentExpiryReminderDays', parseInt(e.target.value))
                  }
                  min="1"
                  className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">days before expiry</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AML/KYC */}
      <Card>
        <CardHeader>
          <CardTitle>AML &amp; KYC</CardTitle>
          <CardDescription>Anti-Money Laundering and Know Your Customer settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.amlCheckRequired}
                onChange={(e) => updateSetting('amlCheckRequired', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">Enable AML Checks</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.pep_screening_enabled}
                onChange={(e) => updateSetting('pep_screening_enabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">PEP Screening</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.sanctionsListCheckEnabled}
                onChange={(e) => updateSetting('sanctionsListCheckEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Sanctions List Check</span>
            </label>
          </div>

          {settings.amlCheckRequired && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  AML Check Provider
                </label>
                <select
                  value={settings.amlCheckProvider || ''}
                  onChange={(e) => updateSetting('amlCheckProvider', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select provider</option>
                  <option value="onfido">Onfido</option>
                  <option value="jumio">Jumio</option>
                  <option value="sumsub">Sumsub</option>
                  <option value="veriff">Veriff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  AML Check Threshold (cents)
                </label>
                <input
                  type="number"
                  value={settings.amlCheckThreshold}
                  onChange={(e) => updateSetting('amlCheckThreshold', parseInt(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {(settings.amlCheckThreshold / 100).toFixed(2)} EUR threshold for AML checks
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Security */}
      <Card>
        <CardHeader>
          <CardTitle>Data Security</CardTitle>
          <CardDescription>Configure data security and audit settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.dataEncryptionAtRest}
                onChange={(e) => updateSetting('dataEncryptionAtRest', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Encryption at rest</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.dataEncryptionInTransit}
                onChange={(e) => updateSetting('dataEncryptionInTransit', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Encryption in transit</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auditLoggingEnabled}
                onChange={(e) => updateSetting('auditLoggingEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">Audit logging</span>
            </label>
          </div>

          {settings.auditLoggingEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                Audit Log Retention (days)
              </label>
              <input
                type="number"
                value={settings.auditLogRetentionDays}
                onChange={(e) => updateSetting('auditLogRetentionDays', parseInt(e.target.value))}
                min="30"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Compliance Settings'}
        </button>
      </div>
    </div>
  );
}
