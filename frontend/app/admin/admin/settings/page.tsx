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
        href: '/admin/settings/fees',
        labelKey: 'platformFees',
        descriptionKey: 'platformFeesDesc',
        icon: '💰',
      },
      {
        href: '/admin/settings/payments',
        labelKey: 'paymentConfig',
        descriptionKey: 'paymentConfigDesc',
        icon: '💳',
      },
      {
        href: '/admin/settings/tax',
        labelKey: 'taxRates',
        descriptionKey: 'taxRatesDesc',
        icon: '🧾',
      },
    ],
  },
  {
    titleKey: 'missionReputation',
    descriptionKey: 'missionReputationDesc',
    items: [
      {
        href: '/admin/settings/missions',
        labelKey: 'missionSettings',
        descriptionKey: 'missionSettingsDesc',
        icon: '📋',
      },
      {
        href: '/admin/settings/reputation',
        labelKey: 'reputationRules',
        descriptionKey: 'reputationRulesDesc',
        icon: '⭐',
      },
      {
        href: '/admin/settings/no-show',
        labelKey: 'noShowConfig',
        descriptionKey: 'noShowConfigDesc',
        icon: '🚫',
      },
    ],
  },
  {
    titleKey: 'securityLimits',
    descriptionKey: 'securityLimitsDesc',
    items: [
      {
        href: '/admin/settings/limits',
        labelKey: 'rateLimitsSecurity',
        descriptionKey: 'rateLimitsSecurityDesc',
        icon: '🔒',
      },
      {
        href: '/admin/settings/content',
        labelKey: 'contentModeration',
        descriptionKey: 'contentModerationDesc',
        icon: '📝',
      },
      {
        href: '/admin/settings/compliance',
        labelKey: 'complianceSettings',
        descriptionKey: 'complianceSettingsDesc',
        icon: '📜',
      },
    ],
  },
  {
    titleKey: 'usersCommunications',
    descriptionKey: 'usersCommunicationsDesc',
    items: [
      {
        href: '/admin/settings/users',
        labelKey: 'userSettings',
        descriptionKey: 'userSettingsDesc',
        icon: '👤',
      },
      {
        href: '/admin/settings/notifications',
        labelKey: 'notificationSettings',
        descriptionKey: 'notificationSettingsDesc',
        icon: '🔔',
      },
    ],
  },
  {
    titleKey: 'technicalSettings',
    descriptionKey: 'technicalSettingsDesc',
    items: [
      {
        href: '/admin/settings/integrations',
        labelKey: 'integrations',
        descriptionKey: 'integrationsDesc',
        icon: '🔌',
      },
      {
        href: '/admin/settings/performance',
        labelKey: 'performanceCache',
        descriptionKey: 'performanceCacheDesc',
        icon: '🚀',
      },
    ],
  },
];

export default function SettingsOverviewPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">13</p>
              <p className="text-sm text-muted-foreground">{t('adminSettingsOverview', 'configAreas')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">200+</p>
              <p className="text-sm text-muted-foreground">{t('adminSettingsOverview', 'configurableSettings')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{t('adminSettingsOverview', 'active')}</p>
              <p className="text-sm text-muted-foreground">{t('adminSettingsOverview', 'platformStatus')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">v1.0</p>
              <p className="text-sm text-muted-foreground">{t('adminSettingsOverview', 'configVersion')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Categories */}
      {settingsCategories.map((category) => (
        <div key={category.titleKey}>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t('adminSettingsOverview', category.titleKey)}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('adminSettingsOverview', category.descriptionKey)}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {category.items.map((item) => (
              <Card
                key={item.href}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(item.href)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <CardTitle className="text-base">{t('adminSettingsOverview', item.labelKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t('adminSettingsOverview', item.descriptionKey)}</CardDescription>
                </CardContent>
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
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{change.setting}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-red-500">{change.oldValue}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-500">{change.newValue}</span>
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
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
