'use client';

import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { companyApi } from '@/lib/api/company';
import {
  LayoutDashboard, ClipboardList, Wallet, TrendingUp, CalendarDays, CalendarRange,
  Clock, Plane, User, FileText, Award, Star, FileSignature, Store, Building2,
  Users, ClipboardCheck, BarChart3, Settings, CreditCard, LogOut,
  Network, Send, Compass,
  ChevronLeft, ChevronRight, ChevronDown, Menu, X, type LucideIcon,
} from 'lucide-react';

interface NavChild {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavItemLink {
  href: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: number;
}

interface NavItemGroup {
  label: string;
  icon: LucideIcon;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
    { href: '/artisan/dashboard', label: t('navigation', 'dashboard') || 'Dashboard', icon: LayoutDashboard },
    { href: '/artisan/discover', label: t('discover', 'findMissions') !== 'Find Missions' ? t('discover', 'findMissions') : 'Trouver des missions', icon: Compass, highlight: true },
    { href: '/artisan/missions', label: t('navigation', 'missions') || 'Missions', icon: ClipboardList },
    { href: '/artisan/offers', label: t('navigation', 'myOffers') || 'Mes offres', icon: Send },
    { href: '/artisan/earnings', label: t('navigation', 'earnings') || 'Earnings', icon: Wallet },
    { href: '/artisan/analytics', label: t('navigation', 'analytics') || 'Analytics', icon: TrendingUp },
    {
      label: t('navigation', 'availability') || 'Availability',
      icon: CalendarDays,
      children: [
        { href: '/artisan/availability/calendar', label: t('navigation', 'calendar') || 'Calendar', icon: CalendarRange },
        { href: '/artisan/availability/working-hours', label: t('navigation', 'workingHours') || 'Working Hours', icon: Clock },
        { href: '/artisan/availability/time-off', label: t('navigation', 'timeOff') || 'Time Off', icon: Plane },
      ],
    },
    {
      label: t('navigation', 'profile') || 'Profile',
      icon: User,
      children: [
        { href: '/artisan/profile', label: t('navigation', 'myProfile') || 'My Profile', icon: FileText },
        { href: '/artisan/certifications', label: t('navigation', 'certifications') || 'Certifications', icon: Award },
        { href: '/artisan/reviews', label: t('navigation', 'reviews') || 'Reviews', icon: Star },
      ],
    },
    { href: '/artisan/quotations', label: t('navigation', 'quotations') || 'Quotations', icon: FileSignature },
    { href: '/artisan/products', label: t('navigation', 'shop') || 'My Shop', icon: Store },
    ...(hasCompany
      ? [
          {
            label: t('navigation', 'company') || 'Company',
            icon: Building2,
            children: [
              { href: '/artisan/company/dashboard', label: t('navigation', 'companyDashboard') || 'Dashboard', icon: LayoutDashboard },
              { href: '/artisan/company/employees', label: t('navigation', 'employees') || 'Employees', icon: Users },
              { href: '/artisan/company/assignments', label: t('navigation', 'assignments') || 'Assignments', icon: ClipboardCheck },
              { href: '/artisan/company/reports', label: t('navigation', 'reports') || 'Reports', icon: BarChart3 },
              { href: '/artisan/company/settings', label: t('navigation', 'settings') || 'Settings', icon: Settings },
            ],
          } as NavItemGroup,
        ]
      : [
          {
            href: '/artisan/company/create',
            label: t('navigation', 'createCompany') || 'Create Company',
            icon: Building2,
          } as NavItemLink,
        ]),
    { href: '/artisan/subcontractors', label: t('navigation', 'subcontractors') || 'Subcontractors', icon: Network },
    { href: '/subcontractor/portal', label: t('navigation', 'subcontractorPortal') || 'Subcontractor Portal', icon: Network },
    { href: '/artisan/stripe', label: t('navigation', 'payments') || 'Payment Setup', icon: CreditCard },
    { href: '/artisan/settings', label: t('navigation', 'settings') || 'Settings', icon: Settings, highlight: true },
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

  const hasActiveChild = (children: NavChild[]): boolean => children.some((c) => isActive(c.href));

  const navigate = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const linkBase = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium';

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border text-foreground flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0 lg:transition-all ${
          sidebarOpen ? 'lg:w-64' : 'lg:w-16'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <button onClick={() => navigate('/artisan/dashboard')} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">K</span>
              <span className="font-display font-bold">Krafolt Pro</span>
            </button>
          )}
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:inline-flex p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={sidebarOpen ? 'Réduire' : 'Étendre'}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {/* Close drawer (mobile only) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {sidebarOpen && user && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {artisanNavItems.map((item, index) => {
              if (isNavGroup(item)) {
                const isExpanded = expandedGroups.includes(item.label) || hasActiveChild(item.children);
                const GroupIcon = item.icon;
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={`${linkBase} ${
                        hasActiveChild(item.children)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <GroupIcon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </>
                      )}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1 border-l border-border pl-2">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <li key={child.href}>
                              <button
                                onClick={() => navigate(child.href)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isActive(child.href)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                              >
                                <ChildIcon className="h-4 w-4 flex-shrink-0" />
                                <span>{child.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const linkItem = item as NavItemLink;
              const LinkIcon = linkItem.icon;
              return (
                <li key={linkItem.href || index}>
                  <button
                    onClick={() => navigate(linkItem.href)}
                    className={`${linkBase} ${
                      isActive(linkItem.href)
                        ? 'bg-primary text-primary-foreground'
                        : linkItem.highlight
                          ? 'text-foreground hover:bg-accent'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <LinkIcon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="flex-1 text-left">{linkItem.label}</span>}
                    {linkItem.badge !== undefined && linkItem.badge > 0 && sidebarOpen && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
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
        <div className="p-4 border-t border-border">
          {sidebarOpen && (
            <div className="mb-2">
              <LanguageSwitcher />
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`${linkBase} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>{t('common', 'logout') || 'Logout'}</span>}
          </button>
          {sidebarOpen && (
            <div className="mt-2 text-xs text-muted-foreground text-center">Krafolt Artisan v1.0</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger (below lg) */}
        <div className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={() => navigate('/artisan/dashboard')} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">K</span>
            <span className="font-display font-bold">Krafolt Pro</span>
          </button>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
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
