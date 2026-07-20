'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, FraudProtectionConfig } from '@/lib/api/admin';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface FraudFeature {
  key: keyof FraudProtectionConfig;
  toggleKey: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  thresholdKey?: keyof FraudProtectionConfig;
  thresholdLabelKey?: string;
  autoActionKey?: keyof FraudProtectionConfig;
  autoActionLabelKey?: string;
}

const fraudFeatures: FraudFeature[] = [
  {
    key: 'multiAccountDetectionEnabled',
    toggleKey: 'multi-account',
    titleKey: 'multiAccountTitle',
    descriptionKey: 'multiAccountDesc',
    icon: '',
    color: 'blue',
    thresholdKey: 'multiAccountRiskThreshold',
    thresholdLabelKey: 'riskThreshold',
  },
  {
    key: 'reviewFraudDetectionEnabled',
    toggleKey: 'review-fraud',
    titleKey: 'reviewFraudTitle',
    descriptionKey: 'reviewFraudDesc',
    icon: '',
    color: 'yellow',
    thresholdKey: 'reviewFraudScoreThreshold',
    thresholdLabelKey: 'fraudScoreThreshold',
    autoActionKey: 'reviewAutoHideEnabled',
    autoActionLabelKey: 'reviewAutoHide',
  },
  {
    key: 'payoutFraudScreeningEnabled',
    toggleKey: 'payout-fraud',
    titleKey: 'payoutFraudTitle',
    descriptionKey: 'payoutFraudDesc',
    icon: '',
    color: 'green',
    thresholdKey: 'payoutRiskThreshold',
    thresholdLabelKey: 'riskThreshold',
    autoActionKey: 'payoutAutoHoldEnabled',
    autoActionLabelKey: 'payoutAutoHold',
  },
  {
    key: 'priceAnomalyDetectionEnabled',
    toggleKey: 'price-anomaly',
    titleKey: 'priceAnomalyTitle',
    descriptionKey: 'priceAnomalyDesc',
    icon: '',
    color: 'purple',
    thresholdKey: 'priceDeviationThreshold',
    thresholdLabelKey: 'deviationThreshold',
    autoActionKey: 'priceAutoFlagEnabled',
    autoActionLabelKey: 'priceAutoFlag',
  },
  {
    key: 'refundAbuseDetectionEnabled',
    toggleKey: 'refund-abuse',
    titleKey: 'refundAbuseTitle',
    descriptionKey: 'refundAbuseDesc',
    icon: '',
    color: 'red',
    thresholdKey: 'refundAbuseScoreThreshold',
    thresholdLabelKey: 'abuseScoreThreshold',
    autoActionKey: 'refundAutoRejectEnabled',
    autoActionLabelKey: 'refundAutoReject',
  },
  {
    key: 'sessionAnomalyDetectionEnabled',
    toggleKey: 'session-anomaly',
    titleKey: 'sessionAnomalyTitle',
    descriptionKey: 'sessionAnomalyDesc',
    icon: '',
    color: 'indigo',
    autoActionKey: 'sessionAutoLogoutEnabled',
    autoActionLabelKey: 'sessionAutoLogout',
  },
  {
    key: 'kycEnabled',
    toggleKey: 'kyc',
    titleKey: 'kycTitle',
    descriptionKey: 'kycDesc',
    icon: '',
    color: 'teal',
    thresholdKey: 'kycSingleTransactionThreshold',
    thresholdLabelKey: 'singleTransactionLimit',
    autoActionKey: 'kycAutoBlockEnabled',
    autoActionLabelKey: 'kycAutoBlock',
  },
  {
    key: 'botDetectionEnabled',
    toggleKey: 'bot-detection',
    titleKey: 'botTitle',
    descriptionKey: 'botDesc',
    icon: '',
    color: 'orange',
    thresholdKey: 'botScoreThreshold',
    thresholdLabelKey: 'botScoreThreshold',
    autoActionKey: 'botCaptchaEnabled',
    autoActionLabelKey: 'botCaptcha',
  },
  {
    key: 'businessVerificationRequired',
    toggleKey: 'business-verification',
    titleKey: 'businessVerificationTitle',
    descriptionKey: 'businessVerificationDesc',
    icon: '',
    color: 'gray',
    autoActionKey: 'businessVerificationAutoReject',
    autoActionLabelKey: 'businessVerificationAutoReject',
  },
];

export default function FraudSettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [config, setConfig] = useState<FraudProtectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminApi.getFraudSettings();
      setConfig(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading fraud settings:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminFraudSettings', 'loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (feature: FraudFeature, enabled: boolean) => {
    if (!config) return;

    setSaving(feature.key);
    try {
      const updated = await adminApi.updateFraudSettings({
        [feature.key]: enabled,
      });
      setConfig(updated);
      setError(null);
    } catch (err) {
      console.error('Error toggling feature:', err);
      setError(`${t('adminFraudSettings', 'toggleFailed')} ${t('adminFraudSettings', feature.titleKey)}`);
    } finally {
      setSaving(null);
    }
  };

  const handleThresholdChange = async (
    key: keyof FraudProtectionConfig,
    value: number | string,
  ) => {
    if (!config) return;

    setSaving(key);
    try {
      const updated = await adminApi.updateFraudSettings({
        [key]: typeof value === 'string' ? parseFloat(value) : value,
      });
      setConfig(updated);
      setError(null);
    } catch (err) {
      console.error('Error updating threshold:', err);
      setError(t('adminFraudSettings', 'updateThresholdFailed'));
    } finally {
      setSaving(null);
    }
  };

  const handleAutoActionToggle = async (key: keyof FraudProtectionConfig, enabled: boolean) => {
    if (!config) return;

    setSaving(key);
    try {
      const updated = await adminApi.updateFraudSettings({
        [key]: enabled,
      });
      setConfig(updated);
      setError(null);
    } catch (err) {
      console.error('Error toggling auto action:', err);
      setError(t('adminFraudSettings', 'toggleAutoActionFailed'));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">{error || t('adminFraudSettings', 'loadSettingsFailed')}</div>
      </div>
    );
  }

  const enabledCount = fraudFeatures.filter((f) => config[f.key] as boolean).length;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t('adminFraudSettings', 'back')}
            </button>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                {t('adminFraudSettings', 'pageTitle')}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('adminFraudSettings', 'pageSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-border bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminFraudSettings', 'featuresEnabled')}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-success">{enabledCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminFraudSettings', 'featuresDisabled')}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-muted-foreground">
              {fraudFeatures.length - enabledCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminFraudSettings', 'lastUpdated')}
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-foreground">
              {new Date(config.updatedAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {fraudFeatures.map((feature) => {
            const isEnabled = config[feature.key] as boolean;
            const isSaving = saving === feature.key;

            return (
              <div
                key={feature.key}
                className="flex flex-col rounded-2xl border border-border bg-card"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-semibold text-foreground">
                        {t('adminFraudSettings', feature.titleKey)}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isEnabled
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isEnabled
                          ? t('adminFraudSettings', 'featuresEnabled')
                          : t('adminFraudSettings', 'featuresDisabled')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('adminFraudSettings', feature.descriptionKey)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isSaving && (
                      <span className="animate-pulse text-xs text-muted-foreground">
                        {t('adminFraudSettings', 'saving')}
                      </span>
                    )}
                    <Switch
                      checked={isEnabled}
                      onChange={() => handleToggle(feature, !isEnabled)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Card body */}
                {isEnabled && (feature.thresholdKey || feature.autoActionKey) && (
                  <div className="space-y-4 p-5">
                    {feature.thresholdKey && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          {t('adminFraudSettings', feature.thresholdLabelKey!)}
                        </label>
                        <Input
                          type="number"
                          value={config[feature.thresholdKey] as number}
                          onChange={(e) =>
                            handleThresholdChange(feature.thresholdKey!, e.target.value)
                          }
                          disabled={saving === feature.thresholdKey}
                          className="h-10 w-full max-w-xs rounded-xl border-border bg-card focus:border-foreground"
                        />
                      </div>
                    )}

                    {feature.autoActionKey && (
                      <Switch
                        label={t('adminFraudSettings', feature.autoActionLabelKey!)}
                        checked={config[feature.autoActionKey] as boolean}
                        onChange={() =>
                          handleAutoActionToggle(
                            feature.autoActionKey!,
                            !(config[feature.autoActionKey!] as boolean),
                          )
                        }
                        disabled={saving === feature.autoActionKey}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Alert Configuration */}
        <div className="mt-8 rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-semibold text-foreground">
              {t('adminFraudSettings', 'alertNotifications')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('adminFraudSettings', 'alertNotificationsDesc')}
            </p>
          </div>
          <div className="space-y-4 p-5">
            <Switch
              label={t('adminFraudSettings', 'enableAlertEmails')}
              description={t('adminFraudSettings', 'enableAlertEmailsDesc')}
              checked={config.fraudAlertEmailEnabled}
              onChange={() =>
                handleAutoActionToggle('fraudAlertEmailEnabled', !config.fraudAlertEmailEnabled)
              }
              disabled={saving === 'fraudAlertEmailEnabled'}
            />

            {config.fraudAlertEmailEnabled && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('adminFraudSettings', 'alertEmailAddress')}
                </label>
                <Input
                  type="email"
                  value={config.fraudAlertEmail}
                  onChange={(e) =>
                    adminApi
                      .updateFraudSettings({ fraudAlertEmail: e.target.value })
                      .then(setConfig)
                  }
                  placeholder="security@yourcompany.com"
                  className="h-10 max-w-md rounded-xl border-border bg-card focus:border-foreground"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
