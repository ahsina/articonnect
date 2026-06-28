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
  title: string;
  description: string;
  icon: string;
  color: string;
  thresholdKey?: keyof FraudProtectionConfig;
  thresholdLabel?: string;
  autoActionKey?: keyof FraudProtectionConfig;
  autoActionLabel?: string;
}

const fraudFeatures: FraudFeature[] = [
  {
    key: 'multiAccountDetectionEnabled',
    toggleKey: 'multi-account',
    title: 'Multi-Account Detection',
    description: 'Detect users creating multiple accounts with same device, IP, or payment info',
    icon: '👥',
    color: 'blue',
    thresholdKey: 'multiAccountRiskThreshold',
    thresholdLabel: 'Risk Threshold (0-100)',
  },
  {
    key: 'reviewFraudDetectionEnabled',
    toggleKey: 'review-fraud',
    title: 'Review Fraud Detection',
    description: 'Identify fake or manipulated reviews using sentiment and pattern analysis',
    icon: '⭐',
    color: 'yellow',
    thresholdKey: 'reviewFraudScoreThreshold',
    thresholdLabel: 'Fraud Score Threshold (0-100)',
    autoActionKey: 'reviewAutoHideEnabled',
    autoActionLabel: 'Auto-hide suspicious reviews',
  },
  {
    key: 'payoutFraudScreeningEnabled',
    toggleKey: 'payout-fraud',
    title: 'Payout Fraud Screening',
    description: 'Screen payouts for suspicious patterns before processing',
    icon: '💳',
    color: 'green',
    thresholdKey: 'payoutRiskThreshold',
    thresholdLabel: 'Risk Threshold (0-100)',
    autoActionKey: 'payoutAutoHoldEnabled',
    autoActionLabel: 'Auto-hold suspicious payouts',
  },
  {
    key: 'priceAnomalyDetectionEnabled',
    toggleKey: 'price-anomaly',
    title: 'Price Anomaly Detection',
    description: 'Flag missions with unusual pricing compared to market rates',
    icon: '📊',
    color: 'purple',
    thresholdKey: 'priceDeviationThreshold',
    thresholdLabel: 'Deviation Threshold (%)',
    autoActionKey: 'priceAutoFlagEnabled',
    autoActionLabel: 'Auto-flag anomalous prices',
  },
  {
    key: 'refundAbuseDetectionEnabled',
    toggleKey: 'refund-abuse',
    title: 'Refund Abuse Detection',
    description: 'Detect users exploiting refund policies',
    icon: '↩️',
    color: 'red',
    thresholdKey: 'refundAbuseScoreThreshold',
    thresholdLabel: 'Abuse Score Threshold (0-100)',
    autoActionKey: 'refundAutoRejectEnabled',
    autoActionLabel: 'Auto-reject abusive refunds',
  },
  {
    key: 'sessionAnomalyDetectionEnabled',
    toggleKey: 'session-anomaly',
    title: 'Session Anomaly Detection',
    description: 'Detect unusual session behavior like impossible travel or device changes',
    icon: '🔐',
    color: 'indigo',
    autoActionKey: 'sessionAutoLogoutEnabled',
    autoActionLabel: 'Auto-logout suspicious sessions',
  },
  {
    key: 'kycEnabled',
    toggleKey: 'kyc',
    title: 'KYC/AML Verification',
    description: 'Require identity verification for high-value transactions',
    icon: '🪪',
    color: 'teal',
    thresholdKey: 'kycSingleTransactionThreshold',
    thresholdLabel: 'Single Transaction Limit (€)',
    autoActionKey: 'kycAutoBlockEnabled',
    autoActionLabel: 'Auto-block non-verified high-value',
  },
  {
    key: 'botDetectionEnabled',
    toggleKey: 'bot-detection',
    title: 'Bot Detection',
    description: 'Identify and block automated bot activity',
    icon: '🤖',
    color: 'orange',
    thresholdKey: 'botScoreThreshold',
    thresholdLabel: 'Bot Score Threshold (0-100)',
    autoActionKey: 'botCaptchaEnabled',
    autoActionLabel: 'Show CAPTCHA for suspicious activity',
  },
  {
    key: 'businessVerificationRequired',
    toggleKey: 'business-verification',
    title: 'Business Verification',
    description: 'Require business verification for artisan accounts',
    icon: '🏢',
    color: 'gray',
    autoActionKey: 'businessVerificationAutoReject',
    autoActionLabel: 'Auto-reject unverified businesses',
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
        setError('Failed to load fraud settings');
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
      setError(`Failed to toggle ${feature.title}`);
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
      setError('Failed to update threshold');
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
      setError('Failed to toggle auto action');
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
        <div className="text-red-600">{error || 'Failed to load settings'}</div>
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
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Fraud Protection Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure fraud detection features to protect the platform
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
                  <p className="text-sm text-muted-foreground">Features Enabled</p>
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
                  <p className="text-sm text-muted-foreground">Features Disabled</p>
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
                  <p className="text-sm text-muted-foreground">Last Updated</p>
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
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription className="mt-1">{feature.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && (
                        <span className="text-sm text-muted-foreground animate-pulse">Saving...</span>
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
                            {feature.thresholdLabel}
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
                          label={feature.autoActionLabel}
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
              Fraud Alert Notifications
            </CardTitle>
            <CardDescription>
              Configure email notifications for fraud detection alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Switch
                label="Enable fraud alert emails"
                description="Receive email notifications when fraud is detected"
                checked={config.fraudAlertEmailEnabled}
                onChange={() =>
                  handleAutoActionToggle('fraudAlertEmailEnabled', !config.fraudAlertEmailEnabled)
                }
                disabled={saving === 'fraudAlertEmailEnabled'}
              />

              {config.fraudAlertEmailEnabled && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Alert Email Address
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
