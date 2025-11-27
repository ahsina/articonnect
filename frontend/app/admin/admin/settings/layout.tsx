'use client';

import { usePathname, useRouter } from 'next/navigation';

const settingsNavItems = [
  { href: '/admin/settings', label: 'Overview', icon: '⚙️' },
  { href: '/admin/settings/fees', label: 'Platform Fees', icon: '💰' },
  { href: '/admin/settings/payments', label: 'Payments', icon: '💳' },
  { href: '/admin/settings/tax', label: 'VAT/Tax Rates', icon: '🧾' },
  { href: '/admin/settings/missions', label: 'Missions', icon: '📋' },
  { href: '/admin/settings/reputation', label: 'Reputation Rules', icon: '⭐' },
  { href: '/admin/settings/no-show', label: 'No-Show Config', icon: '🚫' },
  { href: '/admin/settings/limits', label: 'Rate Limits', icon: '🔒' },
  { href: '/admin/settings/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/admin/settings/content', label: 'Content Moderation', icon: '📝' },
  { href: '/admin/settings/users', label: 'User Settings', icon: '👤' },
  { href: '/admin/settings/integrations', label: 'Integrations', icon: '🔌' },
  { href: '/admin/settings/compliance', label: 'Compliance', icon: '📜' },
  { href: '/admin/settings/performance', label: 'Performance', icon: '🚀' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
                <p className="text-sm text-gray-500">Configure platform-wide settings and rules</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {settingsNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => router.push(item.href)}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
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
