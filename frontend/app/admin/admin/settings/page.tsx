'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const settingsCategories = [
  {
    title: 'Financial Settings',
    description: 'Configure platform fees, payments, and tax settings',
    items: [
      {
        href: '/admin/settings/fees',
        label: 'Platform Fees',
        description: 'Commission rates, deposit rules, cancellation fees',
        icon: '💰',
      },
      {
        href: '/admin/settings/payments',
        label: 'Payment Configuration',
        description: 'Payment providers, payout rules, escrow settings',
        icon: '💳',
      },
      {
        href: '/admin/settings/tax',
        label: 'VAT/Tax Rates',
        description: 'Tax rates by country, invoicing, tax reporting',
        icon: '🧾',
      },
    ],
  },
  {
    title: 'Mission & Reputation',
    description: 'Configure mission rules and reputation scoring',
    items: [
      {
        href: '/admin/settings/missions',
        label: 'Mission Settings',
        description: 'Mission limits, scheduling, auto-matching',
        icon: '📋',
      },
      {
        href: '/admin/settings/reputation',
        label: 'Reputation Rules',
        description: 'Scoring rules, level thresholds, bonuses/penalties',
        icon: '⭐',
      },
      {
        href: '/admin/settings/no-show',
        label: 'No-Show Configuration',
        description: 'No-show validation, compensation, penalties',
        icon: '🚫',
      },
    ],
  },
  {
    title: 'Security & Limits',
    description: 'Configure rate limits, security, and moderation',
    items: [
      {
        href: '/admin/settings/limits',
        label: 'Rate Limits & Security',
        description: 'API limits, login protection, geo-blocking',
        icon: '🔒',
      },
      {
        href: '/admin/settings/content',
        label: 'Content Moderation',
        description: 'Auto-moderation, profanity filters, spam detection',
        icon: '📝',
      },
      {
        href: '/admin/settings/compliance',
        label: 'Compliance Settings',
        description: 'GDPR, KYC/AML, data retention',
        icon: '📜',
      },
    ],
  },
  {
    title: 'Users & Communications',
    description: 'Configure user settings and notifications',
    items: [
      {
        href: '/admin/settings/users',
        label: 'User Settings',
        description: 'Profile requirements, password rules, 2FA',
        icon: '👤',
      },
      {
        href: '/admin/settings/notifications',
        label: 'Notification Settings',
        description: 'Email, SMS, push notification rules',
        icon: '🔔',
      },
    ],
  },
  {
    title: 'Technical Settings',
    description: 'Configure integrations and performance',
    items: [
      {
        href: '/admin/settings/integrations',
        label: 'Integrations',
        description: 'Third-party services, webhooks, APIs',
        icon: '🔌',
      },
      {
        href: '/admin/settings/performance',
        label: 'Performance & Cache',
        description: 'Caching, optimization, logging',
        icon: '🚀',
      },
    ],
  },
];

export default function SettingsOverviewPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">13</p>
              <p className="text-sm text-gray-500">Configuration Areas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">200+</p>
              <p className="text-sm text-gray-500">Configurable Settings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">Active</p>
              <p className="text-sm text-gray-500">Platform Status</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">v1.0</p>
              <p className="text-sm text-gray-500">Config Version</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Categories */}
      {settingsCategories.map((category) => (
        <div key={category.title}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{category.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{category.description}</p>
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
                    <CardTitle className="text-base">{item.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Configuration Changes</CardTitle>
          <CardDescription>Last 5 settings modifications</CardDescription>
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
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{change.setting}</p>
                  <p className="text-sm text-gray-500">
                    <span className="text-red-500">{change.oldValue}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-500">{change.newValue}</span>
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
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
