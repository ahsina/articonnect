'use client';

import { useState, useEffect } from 'react';
import { adminApi, ComplianceSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
      setSuccess(t('adminSettingsCompliance', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving compliance settings:', err);
      setError(t('adminSettingsCompliance', 'saveFailed'));
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
        <div className="p-4 bg-red-100 border rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsCompliance', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* GDPR Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsCompliance', 'gdprTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'gdprDesc')}</CardDescription>
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
              <span className="text-sm font-medium text-foreground">{t('adminSettingsCompliance', 'enableGdpr')}</span>
              <p className="text-xs text-muted-foreground">{t('adminSettingsCompliance', 'enableGdprDesc')}</p>
            </div>
          </label>

          {settings.gdprEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('adminSettingsCompliance', 'dataRetentionPeriod')}
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
                    ~{Math.round(settings.gdprDataRetentionDays / 365)} {t('adminSettingsCompliance', 'years')}
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
                  <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'rightToErasure')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprDataPortability}
                    onChange={(e) => updateSetting('gdprDataPortability', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'dataPortability')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprConsentRequired}
                    onChange={(e) => updateSetting('gdprConsentRequired', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'requireConsent')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.gdprCookieConsentRequired}
                    onChange={(e) => updateSetting('gdprCookieConsentRequired', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'cookieConsent')}</span>
                </label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* CCPA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsCompliance', 'ccpaTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'ccpaDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ccpaEnabled}
              onChange={(e) => updateSetting('ccpaEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsCompliance', 'enableCcpa')}</span>
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
                {t('adminSettingsCompliance', 'doNotSell')}
              </span>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Age Verification */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsCompliance', 'ageVerifyTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'ageVerifyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ageVerificationRequired}
              onChange={(e) => updateSetting('ageVerificationRequired', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsCompliance', 'requireAgeVerify')}</span>
          </label>

          {settings.ageVerificationRequired && (
            <div className="w-32">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsCompliance', 'minimumAge')}</label>
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
          <CardTitle>{t('adminSettingsCompliance', 'termsPrivacyTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'termsPrivacyDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-background rounded-lg">
              <h4 className="font-medium text-foreground mb-3">{t('adminSettingsCompliance', 'termsOfService')}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('adminSettingsCompliance', 'version')}</label>
                  <input
                    type="text"
                    value={settings.termsVersion}
                    onChange={(e) => updateSetting('termsVersion', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('adminSettingsCompliance', 'lastUpdated')}</label>
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
              <h4 className="font-medium text-foreground mb-3">{t('adminSettingsCompliance', 'privacyPolicy')}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('adminSettingsCompliance', 'version')}</label>
                  <input
                    type="text"
                    value={settings.privacyPolicyVersion}
                    onChange={(e) => updateSetting('privacyPolicyVersion', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('adminSettingsCompliance', 'lastUpdated')}</label>
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
          <CardTitle>{t('adminSettingsCompliance', 'docReqTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'docReqDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('adminSettingsCompliance', 'requiredDocuments')}
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
                placeholder={t('adminSettingsCompliance', 'documentTypePlaceholder')}
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && addDocument()}
              />
              <button
                onClick={addDocument}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                {t('adminSettingsCompliance', 'add')}
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
              <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'checkDocExpiry')}</span>
            </label>
            {settings.documentExpiryCheckEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('adminSettingsCompliance', 'remind')}</span>
                <input
                  type="number"
                  value={settings.documentExpiryReminderDays}
                  onChange={(e) =>
                    updateSetting('documentExpiryReminderDays', parseInt(e.target.value))
                  }
                  min="1"
                  className="w-20 px-2 py-1 border border-border rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">{t('adminSettingsCompliance', 'daysBeforeExpiry')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AML/KYC */}
      <Card>
        <CardHeader>
          <CardTitle>AML &amp; KYC</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'amlKycDesc')}</CardDescription>
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
              <span className="text-sm font-medium text-foreground">{t('adminSettingsCompliance', 'enableAmlChecks')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.pep_screening_enabled}
                onChange={(e) => updateSetting('pep_screening_enabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'pepScreening')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.sanctionsListCheckEnabled}
                onChange={(e) => updateSetting('sanctionsListCheckEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'sanctionsListCheck')}</span>
            </label>
          </div>

          {settings.amlCheckRequired && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsCompliance', 'amlCheckProvider')}
                </label>
                <select
                  value={settings.amlCheckProvider || ''}
                  onChange={(e) => updateSetting('amlCheckProvider', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('adminSettingsCompliance', 'selectProvider')}</option>
                  <option value="onfido">Onfido</option>
                  <option value="jumio">Jumio</option>
                  <option value="sumsub">Sumsub</option>
                  <option value="veriff">Veriff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsCompliance', 'amlCheckThreshold')}
                </label>
                <input
                  type="number"
                  value={settings.amlCheckThreshold}
                  onChange={(e) => updateSetting('amlCheckThreshold', parseInt(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {(Number(settings.amlCheckThreshold / 100) || 0).toFixed(2)} {t('adminSettingsCompliance', 'eurThresholdForAml')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsCompliance', 'dataSecurityTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsCompliance', 'dataSecurityDesc')}</CardDescription>
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
              <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'encryptionAtRest')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.dataEncryptionInTransit}
                onChange={(e) => updateSetting('dataEncryptionInTransit', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'encryptionInTransit')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auditLoggingEnabled}
                onChange={(e) => updateSetting('auditLoggingEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsCompliance', 'auditLogging')}</span>
            </label>
          </div>

          {settings.auditLoggingEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsCompliance', 'auditLogRetention')}
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
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsCompliance', 'saving') : t('adminSettingsCompliance', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
