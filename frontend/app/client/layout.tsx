'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { userApi } from '@/lib/api/user';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, ClipboardList, Hammer, Heart, Receipt, Scale,
  Bell, Settings, Building2, Menu, X, LogOut, type LucideIcon,
} from 'lucide-react';

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
}

function ClientHeader() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const loadProfile = async () => {
    try {
      const profile = await userApi.getClientProfile();
      setClientProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const isProfessional = clientProfile?.clientType === 'PROFESSIONAL';

  // Don't show header on dashboard page (it has its own)
  if (pathname === '/client/dashboard') {
    return null;
  }

  const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/client/dashboard', label: t('nav', 'dashboard') || 'Tableau de bord', icon: LayoutDashboard },
    { href: '/client/missions', label: t('nav', 'missions') || 'Mes missions', icon: ClipboardList },
    { href: '/client/artisans', label: t('nav', 'artisans') || 'Artisans', icon: Hammer },
    { href: '/client/favorites', label: t('nav', 'favorites') || 'Favoris', icon: Heart },
    { href: '/client/invoices', label: t('nav', 'invoices') || 'Factures', icon: Receipt },
    { href: '/client/disputes', label: t('nav', 'disputes') || 'Litiges', icon: Scale },
  ];

  return (
    <header className="bg-card shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-2 h-16 min-w-0">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/client/dashboard" className="text-2xl font-bold text-primary shrink-0">
              Krafolt
            </Link>
            {isProfessional && clientProfile?.companyName && (
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l min-w-0">
                <Badge variant="outline" className="gap-1 text-primary truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0" /> {clientProfile.companyName}
                </Badge>
              </div>
            )}
          </div>

          {/* Desktop Navigation (lg+) */}
          <nav className="hidden lg:flex items-center gap-1 min-w-0">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? 'default' : 'ghost'}
                    size="sm"
                    leftIcon={<Icon className="h-4 w-4" />}
                  >
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <LanguageSwitcher />
            <Link href="/client/notifications" aria-label="Notifications">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/client/settings" aria-label="Paramètres">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <div className="hidden lg:block text-sm text-muted-foreground">
              {user?.firstName}
            </div>
            {/* Desktop logout (lg+) */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => logout()}
            >
              {t('common', 'logout') || 'Déconnexion'}
            </Button>
            {/* Mobile hamburger (below lg) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Company Badge */}
        {isProfessional && clientProfile?.companyName && (
          <div className="lg:hidden pb-2">
            <Badge variant="outline" className="gap-1 text-primary max-w-full truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0" /> {clientProfile.companyName}
            </Badge>
          </div>
        )}
      </div>

      {/* Mobile menu overlay + drawer (below lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 top-16 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-down panel */}
          <nav className="absolute inset-x-0 top-16 z-50 bg-card border-b shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium min-w-0 ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}

              <div className="my-2 border-t" />

              <div className="flex items-center justify-between gap-2 px-3 py-1">
                <span className="text-sm text-muted-foreground truncate">
                  {user?.firstName}
                </span>
                <LanguageSwitcher />
              </div>

              <Button
                variant="outline"
                className="mt-2 w-full justify-center"
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                {t('common', 'logout') || 'Déconnexion'}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="CLIENT">
      <div className="min-h-screen bg-background">
        <ClientHeader />
        {children}
      </div>
    </ProtectedRoute>
  );
}
