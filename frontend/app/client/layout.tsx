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
  Bell, Settings, Building2, type LucideIcon,
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

  useEffect(() => {
    loadProfile();
  }, []);

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
        <div className="flex justify-between items-center h-16">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-4">
            <Link href="/client/dashboard" className="text-2xl font-bold text-primary">
              Krafolt
            </Link>
            {isProfessional && clientProfile?.companyName && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l">
                <Badge variant="outline" className="gap-1 text-primary">
                  <Building2 className="h-3.5 w-3.5" /> {clientProfile.companyName}
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
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
          <div className="flex items-center gap-3">
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
            <div className="hidden md:block text-sm text-muted-foreground">
              {user?.firstName}
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              {t('common', 'logout') || 'Déconnexion'}
            </Button>
          </div>
        </div>

        {/* Mobile Company Badge */}
        {isProfessional && clientProfile?.companyName && (
          <div className="md:hidden pb-2">
            <Badge variant="outline" className="gap-1 text-primary">
              <Building2 className="h-3.5 w-3.5" /> {clientProfile.companyName}
            </Badge>
          </div>
        )}
      </div>
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
