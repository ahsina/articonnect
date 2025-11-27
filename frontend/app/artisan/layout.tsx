'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { companyApi } from '@/lib/api/company';

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
  badge?: number;
}

interface NavItemGroup {
  label: string;
  icon: string;
  children: NavChild[];
}

type NavItem = NavItemLink | NavItemGroup;

function isNavGroup(item: NavItem): item is NavItemGroup {
  return 'children' in item;
}

function ArtisanLayoutContent({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);

  useEffect(() => {
    checkCompanyStatus();
  }, []);

  const checkCompanyStatus = async () => {
    try {
      await companyApi.getMyCompany();
      setHasCompany(true);
    } catch {
      setHasCompany(false);
    }
  };

  const artisanNavItems: NavItem[] = [
    { href: '/artisan/dashboard', label: t('navigation', 'dashboard') || 'Dashboard', icon: '📊' },
    { href: '/artisan/missions', label: t('navigation', 'missions') || 'Missions', icon: '📋' },
    { href: '/artisan/earnings', label: t('navigation', 'earnings') || 'Earnings', icon: '💰' },
    {
      label: t('navigation', 'availability') || 'Availability',
      icon: '📅',
      children: [
        {
          href: '/artisan/availability/calendar',
          label: t('navigation', 'calendar') || 'Calendar',
          icon: '📆',
        },
        {
          href: '/artisan/availability/working-hours',
          label: t('navigation', 'workingHours') || 'Working Hours',
          icon: '⏰',
        },
        {
          href: '/artisan/availability/time-off',
          label: t('navigation', 'timeOff') || 'Time Off',
          icon: '🏖️',
        },
      ],
    },
    {
      label: t('navigation', 'profile') || 'Profile',
      icon: '👤',
      children: [
        {
          href: '/artisan/profile',
          label: t('navigation', 'myProfile') || 'My Profile',
          icon: '📝',
        },
        {
          href: '/artisan/certifications',
          label: t('navigation', 'certifications') || 'Certifications',
          icon: '📜',
        },
        { href: '/artisan/reviews', label: t('navigation', 'reviews') || 'Reviews', icon: '⭐' },
      ],
    },
    {
      href: '/artisan/quotations',
      label: t('navigation', 'quotations') || 'Quotations',
      icon: '📄',
    },
    { href: '/artisan/products', label: t('navigation', 'shop') || 'My Shop', icon: '🛒' },
    ...(hasCompany
      ? [
          {
            label: t('navigation', 'company') || 'Company',
            icon: '🏢',
            children: [
              {
                href: '/artisan/company/dashboard',
                label: t('navigation', 'companyDashboard') || 'Dashboard',
                icon: '📊',
              },
              {
                href: '/artisan/company/employees',
                label: t('navigation', 'employees') || 'Employees',
                icon: '👥',
              },
              {
                href: '/artisan/company/assignments',
                label: t('navigation', 'assignments') || 'Assignments',
                icon: '📋',
              },
              {
                href: '/artisan/company/reports',
                label: t('navigation', 'reports') || 'Reports',
                icon: '📈',
              },
              {
                href: '/artisan/company/settings',
                label: t('navigation', 'settings') || 'Settings',
                icon: '⚙️',
              },
            ],
          } as NavItemGroup,
        ]
      : [
          {
            href: '/artisan/company/create',
            label: t('navigation', 'createCompany') || 'Create Company',
            icon: '🏢',
          } as NavItemLink,
        ]),
    { href: '/artisan/stripe', label: t('navigation', 'payments') || 'Payment Setup', icon: '💳' },
    {
      href: '/artisan/settings',
      label: t('navigation', 'settings') || 'Settings',
      icon: '⚙️',
      highlight: true,
    },
  ];

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  const isActive = (href: string) => {
    if (href === '/artisan/dashboard') {
      return pathname === '/artisan/dashboard' || pathname === '/artisan';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveChild = (children: NavChild[]): boolean => {
    return children.some((child) => isActive(child.href));
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gradient-to-b from-blue-900 to-blue-800 text-white flex-shrink-0 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-700">
          {sidebarOpen && (
            <button onClick={() => router.push('/artisan/dashboard')} className="font-bold text-lg">
              ArtiConnect Pro
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* User Info */}
        {sidebarOpen && user && (
          <div className="px-4 py-3 border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-blue-300 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {artisanNavItems.map((item, index) => {
              if (isNavGroup(item)) {
                const isExpanded =
                  expandedGroups.includes(item.label) || hasActiveChild(item.children);
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        hasActiveChild(item.children)
                          ? 'bg-blue-700 text-white'
                          : 'text-blue-200 hover:bg-blue-700 hover:text-white'
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
                                  ? 'bg-blue-600 text-white'
                                  : 'text-blue-200 hover:bg-blue-700 hover:text-white'
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
                <li key={linkItem.href || index}>
                  <button
                    onClick={() => router.push(linkItem.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(linkItem.href)
                        ? 'bg-blue-600 text-white'
                        : linkItem.highlight
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
                          : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{linkItem.icon}</span>
                    {sidebarOpen && <span className="text-sm font-medium">{linkItem.label}</span>}
                    {linkItem.badge !== undefined && linkItem.badge > 0 && sidebarOpen && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {linkItem.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-blue-200 hover:bg-blue-700 hover:text-white rounded-lg transition-colors"
          >
            <span className="text-lg">🚪</span>
            {sidebarOpen && (
              <span className="text-sm font-medium">{t('common', 'logout') || 'Logout'}</span>
            )}
          </button>
          {sidebarOpen && (
            <div className="mt-2 text-xs text-blue-400 text-center">ArtiConnect Artisan v1.0</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export default function ArtisanLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="ARTISAN">
      <ArtisanLayoutContent>{children}</ArtisanLayoutContent>
    </ProtectedRoute>
  );
}
