'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavChild {
  href: string;
  label: string;
  icon: string;
}

interface NavItemLink {
  href: string;
  label: string;
  icon: string;
  highlight?: boolean;
}

interface NavItemGroup {
  label: string;
  icon: string;
  children: NavChild[];
}

type NavItem = NavItemLink | NavItemGroup;

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/missions', label: 'Missions', icon: '📋' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  {
    label: 'Moderation',
    icon: '🛡️',
    children: [
      { href: '/admin/moderation', label: 'Reports', icon: '🔍' },
      { href: '/admin/disputes', label: 'Disputes', icon: '⚠️' },
      { href: '/admin/no-shows', label: 'No-Shows', icon: '🚫' },
    ],
  },
  {
    label: 'Verification',
    icon: '✅',
    children: [
      { href: '/admin/verifications', label: 'KYC/Verification', icon: '🪪' },
      { href: '/admin/certifications', label: 'Certifications', icon: '📜' },
    ],
  },
  {
    label: 'Platform',
    icon: '🔧',
    children: [
      { href: '/admin/specialties', label: 'Specialties', icon: '🛠️' },
      { href: '/admin/reputation', label: 'Reputation', icon: '⭐' },
      { href: '/admin/feature-flags', label: 'Feature Flags', icon: '🏳️' },
    ],
  },
  {
    label: 'System',
    icon: '⚙️',
    children: [
      { href: '/admin/monitoring', label: 'Monitoring', icon: '💻' },
      { href: '/admin/cron', label: 'CRON Jobs', icon: '⏰' },
      { href: '/admin/fraud-settings', label: 'Fraud Settings', icon: '🔒' },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: '📝' },
    ],
  },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️', highlight: true },
];

function isNavGroup(item: NavItem): item is NavItemGroup {
  return 'children' in item;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    if (href === '/admin/settings') {
      return pathname.startsWith('/admin/settings');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveChild = (children: NavChild[]): boolean => {
    return children.some((child) => isActive(child.href));
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex-shrink-0 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {sidebarOpen && <span className="font-bold text-lg">Krafolt</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {adminNavItems.map((item) => {
              if (isNavGroup(item)) {
                const isExpanded =
                  expandedGroups.includes(item.label) || hasActiveChild(item.children);
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        hasActiveChild(item.children)
                          ? 'bg-gray-800 text-white'
                          : 'text-muted-foreground hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                          <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                        </>
                      )}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <ul className="mt-1 ml-6 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <button
                              onClick={() => router.push(child.href)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive(child.href)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-gray-800 hover:text-white'
                              }`}
                            >
                              <span>{child.icon}</span>
                              <span>{child.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              const linkItem = item as NavItemLink;
              return (
                <li key={linkItem.href}>
                  <button
                    onClick={() => router.push(linkItem.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(linkItem.href)
                        ? 'bg-primary text-primary-foreground'
                        : linkItem.highlight
                          ? 'bg-gradient-to-r from-primary to-yellow-600 text-primary-foreground hover:from-primary hover:to-yellow-600'
                          : 'text-muted-foreground hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{linkItem.icon}</span>
                    {sidebarOpen && (
                      <span className="text-sm font-medium">{linkItem.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-muted-foreground">Admin Panel v1.0</div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
