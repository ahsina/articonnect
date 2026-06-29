'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Settings, Percent, CreditCard, Receipt, ClipboardList, Star, Ban, Gauge, Bell,
  FileText, Users, Plug, ScrollText, Rocket, ArrowLeft, type LucideIcon,
} from 'lucide-react';

const settingsNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin/settings', label: 'Overview', icon: Settings },
  { href: '/admin/settings/fees', label: 'Platform Fees', icon: Percent },
  { href: '/admin/settings/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/settings/tax', label: 'VAT/Tax Rates', icon: Receipt },
  { href: '/admin/settings/missions', label: 'Missions', icon: ClipboardList },
  { href: '/admin/settings/reputation', label: 'Reputation Rules', icon: Star },
  { href: '/admin/settings/no-show', label: 'No-Show Config', icon: Ban },
  { href: '/admin/settings/limits', label: 'Rate Limits', icon: Gauge },
  { href: '/admin/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings/content', label: 'Content Moderation', icon: FileText },
  { href: '/admin/settings/users', label: 'User Settings', icon: Users },
  { href: '/admin/settings/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/settings/compliance', label: 'Compliance', icon: ScrollText },
  { href: '/admin/settings/performance', label: 'Performance', icon: Rocket },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
              <p className="text-sm text-muted-foreground">Configure platform-wide settings and rules</p>
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
