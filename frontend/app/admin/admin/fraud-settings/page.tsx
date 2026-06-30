'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, FraudProtectionConfig } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
    icon: '👥',
    color: 'blue',
    thresholdKey: 'multiAccountRiskThreshold',
    thresholdLabelKey: 'riskThreshold',
  },
  {
    key: 'reviewFraudDetectionEnabled',
    toggleKey: 'review-fraud',
    titleKey: 'reviewFraudTitle',
    descriptionKey: 'reviewFraudDesc',
    icon: '⭐',
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
    icon: '💳',
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
    icon: '📊',
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
    icon: '↩️',
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
    icon: '🔐',
    color: 'indigo',
    autoActionKey: 'sessionAutoLogoutEnabled',
    autoActionLabelKey: 'sessionAutoLogout',
  },
  {
    key: 'kycEnabled',
    toggleKey: 'kyc',
    titleKey: 'kycTitle',
    descriptionKey: 'kycDesc',
    icon: '🪪',
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
    icon: '🤖',
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
    icon: '🏢',
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

  const getColorClasses = (color: string, enabled: boolean) => {
    if (!enabled) return 'bg-muted border-border';

    const colors: Record<string, string> = {
      blue: 'bg-primary/10 border-primary/20',
      yellow: 'bg-yellow-500/10 border-yellow-500/20',
      green: 'bg-green-500/10 border-green-500/30',
      purple: 'bg-purple-500/10 border-purple-500/20',
      red: 'bg-red-500/10 border-red-500/20',
      indigo: 'bg-primary/10 border-primary/20',
      teal: 'bg-teal-500/10 border-teal-500/20',
      orange: 'bg-yellow-500/10 border-yellow-500/20',
      gray: 'bg-background border-border',
    };

    return colors[color] || colors.blue;
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
        <div className="text-red-600">{error || t('adminFraudSettings', 'loadSettingsFailed')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              ← {t('adminFraudSettings', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminFraudSettings', 'pageTitle')}</h1>
              <p className="text-muted-foreground mt-2">
                {t('adminFraudSettings', 'pageSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminFraudSettings', 'featuresEnabled')}</p>
                  <p className="text-3xl font-bold text-green-600">
                    {fraudFeatures.filter((f) => config[f.key] as boolean).length}
                  </p>
                </div>
                <span className="text-4xl">🛡️</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminFraudSettings', 'featuresDisabled')}</p>
                  <p className="text-3xl font-bold text-muted-foreground">
                    {fraudFeatures.filter((f) => !(config[f.key] as boolean)).length}
                  </p>
                </div>
                <span className="text-4xl">⏸️</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminFraudSettings', 'lastUpdated')}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(config.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="text-4xl">🕐</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {fraudFeatures.map((feature) => {
            const isEnabled = config[feature.key] as boolean;
            const isSaving = saving === feature.key;

            return (
              <Card
                key={feature.key}
                className={`transition-all duration-200 border-2 ${getColorClasses(feature.color, isEnabled)}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{feature.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{t('adminFraudSettings', feature.titleKey)}</CardTitle>
                        <CardDescription className="mt-1">{t('adminFraudSettings', feature.descriptionKey)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && (
                        <span className="text-sm text-muted-foreground animate-pulse">{t('adminFraudSettings', 'saving')}</span>
                      )}
                      <Switch
                        checked={isEnabled}
                        onChange={() => handleToggle(feature, !isEnabled)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </CardHeader>

                {isEnabled && (feature.thresholdKey || feature.autoActionKey) && (
                  <CardContent>
                    <div className="space-y-4 pt-2 border-t border-border">
                      {feature.thresholdKey && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {t('adminFraudSettings', feature.thresholdLabelKey!)}
                          </label>
                          <Input
                            type="number"
                            value={config[feature.thresholdKey] as number}
                            onChange={(e) =>
                              handleThresholdChange(feature.thresholdKey!, e.target.value)
                            }
                            disabled={saving === feature.thresholdKey}
                            className="w-full max-w-xs"
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Alert Configuration */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              {t('adminFraudSettings', 'alertNotifications')}
            </CardTitle>
            <CardDescription>
              {t('adminFraudSettings', 'alertNotificationsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="max-w-md"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
