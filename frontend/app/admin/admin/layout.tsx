'use client';

import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Users, ClipboardList, TrendingUp, ShieldCheck, Eye, AlertTriangle,
  Ban, BadgeCheck, FileCheck, Award, Wrench, Tags, Star, Flag, Server, Activity,
  Timer, ShieldAlert, ScrollText, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Menu, X,
  type LucideIcon,
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
}

interface NavItemGroup {
  label: string;
  icon: LucideIcon;
  children: NavChild[];
}

type NavItem = NavItemLink | NavItemGroup;

const adminNavItems: NavItem[] = [
  { href: '/admin/admin/dashboard', label: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/admin/users', label: 'users', icon: Users },
  { href: '/admin/admin/missions', label: 'missions', icon: ClipboardList },
  { href: '/admin/admin/analytics', label: 'analytics', icon: TrendingUp },
  {
    label: 'moderation',
    icon: ShieldCheck,
    children: [
      { href: '/admin/admin/moderation', label: 'reports', icon: Eye },
      { href: '/admin/admin/disputes', label: 'disputes', icon: AlertTriangle },
      { href: '/admin/admin/no-shows', label: 'noShows', icon: Ban },
    ],
  },
  {
    label: 'verification',
    icon: BadgeCheck,
    children: [
      { href: '/admin/admin/verifications', label: 'kycVerification', icon: FileCheck },
      { href: '/admin/admin/certifications', label: 'certifications', icon: Award },
    ],
  },
  {
    label: 'platform',
    icon: Wrench,
    children: [
      { href: '/admin/admin/specialties', label: 'specialties', icon: Tags },
      { href: '/admin/admin/reputation', label: 'reputation', icon: Star },
      { href: '/admin/admin/feature-flags', label: 'featureFlags', icon: Flag },
    ],
  },
  {
    label: 'system',
    icon: Server,
    children: [
      { href: '/admin/admin/monitoring', label: 'monitoring', icon: Activity },
      { href: '/admin/admin/cron', label: 'cronJobs', icon: Timer },
      { href: '/admin/admin/fraud-settings', label: 'fraudSettings', icon: ShieldAlert },
      { href: '/admin/admin/audit-logs', label: 'auditLogs', icon: ScrollText },
    ],
  },
  { href: '/admin/admin/settings', label: 'settings', icon: Settings, highlight: true },
];

function isNavGroup(item: NavItem): item is NavItemGroup {
  return 'children' in item;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  // Desktop collapse toggle (chevron). Default expanded on desktop.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Mobile off-canvas drawer. Default closed on mobile.
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  // Navigate and close the mobile drawer.
  const navigate = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/admin/admin/dashboard') {
      return pathname === '/admin/admin/dashboard' || pathname === '/admin/admin';
    }
    if (href === '/admin/admin/settings') {
      return pathname.startsWith('/admin/admin/settings');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveChild = (children: NavChild[]): boolean => children.some((c) => isActive(c.href));

  const linkBase = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium';

  // Labels/expanded content: always visible in the mobile drawer (w-64),
  // hidden only on desktop when the sidebar is collapsed.
  const collapsedHide = sidebarOpen ? '' : 'lg:hidden';

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobile top bar with hamburger (hidden on desktop) */}
      <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={t('adminLayout', 'expand')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">K</span>
          <span className="font-display font-bold">Krafolt</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t('adminLayout', 'adminTag')}</span>
        </span>
      </div>

      {/* Overlay (mobile only, when drawer open) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 ${sidebarOpen ? 'lg:w-64' : 'lg:w-16'} bg-card border-r border-border text-foreground flex-shrink-0 transition-transform lg:transition-all duration-300 flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <span className={`flex items-center gap-2 ${collapsedHide}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">K</span>
            <span className="font-display font-bold">Krafolt</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t('adminLayout', 'adminTag')}</span>
          </span>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={sidebarOpen ? t('adminLayout', 'collapse') : t('adminLayout', 'expand')}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={t('adminLayout', 'collapse')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {adminNavItems.map((item) => {
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
                      <span className={`flex flex-1 items-center gap-3 ${collapsedHide}`}>
                        <span className="flex-1 text-left">{t('adminNav', item.label)}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      </span>
                    </button>
                    {isExpanded && (
                      <ul className={`mt-1 ml-4 space-y-1 border-l border-border pl-2 ${collapsedHide}`}>
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
                                <span>{t('adminNav', child.label)}</span>
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
                <li key={linkItem.href}>
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
                    <span className={`flex-1 text-left ${collapsedHide}`}>{t('adminNav', linkItem.label)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-border space-y-2 ${collapsedHide}`}>
          <LanguageSwitcher />
          <div className="text-xs text-muted-foreground">{t('adminLayout', 'adminPanel')} v1.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-auto overflow-y-auto">{children}</main>
    </div>
  );
}
