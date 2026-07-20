'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const settingsCategories = [
  {
    titleKey: 'financialSettings',
    descriptionKey: 'financialSettingsDesc',
    items: [
      {
        href: '/admin/admin/settings/fees',
        labelKey: 'platformFees',
        descriptionKey: 'platformFeesDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/payments',
        labelKey: 'paymentConfig',
        descriptionKey: 'paymentConfigDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/tax',
        labelKey: 'taxRates',
        descriptionKey: 'taxRatesDesc',
        icon: '',
      },
    ],
  },
  {
    titleKey: 'missionReputation',
    descriptionKey: 'missionReputationDesc',
    items: [
      {
        href: '/admin/admin/settings/missions',
        labelKey: 'missionSettings',
        descriptionKey: 'missionSettingsDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/reputation',
        labelKey: 'reputationRules',
        descriptionKey: 'reputationRulesDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/no-show',
        labelKey: 'noShowConfig',
        descriptionKey: 'noShowConfigDesc',
        icon: '',
      },
    ],
  },
  {
    titleKey: 'securityLimits',
    descriptionKey: 'securityLimitsDesc',
    items: [
      {
        href: '/admin/admin/settings/limits',
        labelKey: 'rateLimitsSecurity',
        descriptionKey: 'rateLimitsSecurityDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/content',
        labelKey: 'contentModeration',
        descriptionKey: 'contentModerationDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/compliance',
        labelKey: 'complianceSettings',
        descriptionKey: 'complianceSettingsDesc',
        icon: '',
      },
    ],
  },
  {
    titleKey: 'usersCommunications',
    descriptionKey: 'usersCommunicationsDesc',
    items: [
      {
        href: '/admin/admin/settings/users',
        labelKey: 'userSettings',
        descriptionKey: 'userSettingsDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/notifications',
        labelKey: 'notificationSettings',
        descriptionKey: 'notificationSettingsDesc',
        icon: '',
      },
    ],
  },
  {
    titleKey: 'technicalSettings',
    descriptionKey: 'technicalSettingsDesc',
    items: [
      {
        href: '/admin/admin/settings/integrations',
        labelKey: 'integrations',
        descriptionKey: 'integrationsDesc',
        icon: '',
      },
      {
        href: '/admin/admin/settings/performance',
        labelKey: 'performanceCache',
        descriptionKey: 'performanceCacheDesc',
        icon: '',
      },
    ],
  },
];

export default function SettingsOverviewPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Réglages de la plateforme
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configurer les paramètres globaux de Krafolt.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSettingsOverview', 'configAreas')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">13</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSettingsOverview', 'configurableSettings')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">200+</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSettingsOverview', 'platformStatus')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-success">
            {t('adminSettingsOverview', 'active')}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSettingsOverview', 'configVersion')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">v1.0</p>
        </Card>
      </div>

      {/* Settings Categories */}
      {settingsCategories.map((category) => (
        <div key={category.titleKey}>
          <h2 className="font-display text-lg font-bold text-foreground">
            {t('adminSettingsOverview', category.titleKey)}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {t('adminSettingsOverview', category.descriptionKey)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {category.items.map((item) => (
              <Card
                key={item.href}
                className="group cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => router.push(item.href)}
              >
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('adminSettingsOverview', item.labelKey)}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t('adminSettingsOverview', item.descriptionKey)}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  Configurer{' '}
                  <span className="transition-transform group-hover:translate-x-0.5">›</span>
                </span>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsOverview', 'recentChanges')}</CardTitle>
          <CardDescription>{t('adminSettingsOverview', 'recentChangesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                setting: 'Platform Commission Rate',
                oldValue: '12%',
                newValue: '15%',
                changedBy: 'admin@krafolt.com',
                timestamp: '2 hours ago',
              },
              {
                setting: 'Auto-validation Delay',
                oldValue: '48 hours',
                newValue: '72 hours',
                changedBy: 'admin@krafolt.com',
                timestamp: '1 day ago',
              },
              {
                setting: 'No-Show Minimum Wait',
                oldValue: '15 min',
                newValue: '20 min',
                changedBy: 'admin@krafolt.com',
                timestamp: '2 days ago',
              },
              {
                setting: 'Default VAT Rate',
                oldValue: '19%',
                newValue: '20%',
                changedBy: 'admin@krafolt.com',
                timestamp: '3 days ago',
              },
              {
                setting: 'Rate Limit (API)',
                oldValue: '60 req/min',
                newValue: '100 req/min',
                changedBy: 'admin@krafolt.com',
                timestamp: '1 week ago',
              },
            ].map((change, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-muted/50 p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{change.setting}</p>
                  <p className="mt-0.5 text-sm">
                    <span className="text-destructive">{change.oldValue}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="text-success">{change.newValue}</span>
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{change.changedBy}</p>
                  <p>{change.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
