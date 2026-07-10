'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Settings, Percent, CreditCard, Receipt, ClipboardList, Star, Ban, Gauge, Bell,
  FileText, Users, Plug, ScrollText, Rocket, ArrowLeft, type LucideIcon,
} from 'lucide-react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const settingsNavItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/admin/admin/settings', label: t('adminSettingsNav', 'overview') || 'Overview', icon: Settings },
    { href: '/admin/admin/settings/fees', label: t('adminSettingsNav', 'platformFees') || 'Platform Fees', icon: Percent },
    { href: '/admin/admin/settings/payments', label: t('adminSettingsNav', 'payments') || 'Payments', icon: CreditCard },
    { href: '/admin/admin/settings/tax', label: t('adminSettingsNav', 'taxRates') || 'VAT/Tax Rates', icon: Receipt },
    { href: '/admin/admin/settings/missions', label: t('adminSettingsNav', 'missions') || 'Missions', icon: ClipboardList },
    { href: '/admin/admin/settings/reputation', label: t('adminSettingsNav', 'reputationRules') || 'Reputation Rules', icon: Star },
    { href: '/admin/admin/settings/no-show', label: t('adminSettingsNav', 'noShowConfig') || 'No-Show Config', icon: Ban },
    { href: '/admin/admin/settings/limits', label: t('adminSettingsNav', 'rateLimits') || 'Rate Limits', icon: Gauge },
    { href: '/admin/admin/settings/notifications', label: t('adminSettingsNav', 'notifications') || 'Notifications', icon: Bell },
    { href: '/admin/admin/settings/content', label: t('adminSettingsNav', 'contentModeration') || 'Content Moderation', icon: FileText },
    { href: '/admin/admin/settings/users', label: t('adminSettingsNav', 'userSettings') || 'User Settings', icon: Users },
    { href: '/admin/admin/settings/integrations', label: t('adminSettingsNav', 'integrations') || 'Integrations', icon: Plug },
    { href: '/admin/admin/settings/compliance', label: t('adminSettingsNav', 'compliance') || 'Compliance', icon: ScrollText },
    { href: '/admin/admin/settings/performance', label: t('adminSettingsNav', 'performance') || 'Performance', icon: Rocket },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t('adminSettingsNav', 'backToDashboard') || 'Back to Dashboard'}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('adminSettingsNav', 'platformSettings') || 'Platform Settings'}</h1>
              <p className="text-sm text-muted-foreground">{t('adminSettingsNav', 'subtitle') || 'Configure platform-wide settings and rules'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-card rounded-xl border border-border overflow-hidden p-2">
              <ul className="space-y-1">
                {settingsNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => router.push(item.href)}
                        className={`w-full px-3 py-2.5 text-left flex items-center gap-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
