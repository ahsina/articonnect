'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { userApi } from '@/lib/api/user';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const navLinks = [
    { href: '/client/dashboard', label: t('nav', 'dashboard') || 'Tableau de bord' },
    { href: '/client/missions', label: t('nav', 'missions') || 'Mes missions' },
    { href: '/client/artisans', label: t('nav', 'artisans') || 'Artisans' },
    { href: '/client/favorites', label: t('nav', 'favorites') || 'Favoris' },
    { href: '/client/invoices', label: t('nav', 'invoices') || 'Factures' },
    { href: '/client/disputes', label: t('nav', 'disputes') || 'Litiges' },
  ];

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-4">
            <Link href="/client/dashboard" className="text-2xl font-bold text-blue-600">
              ArtiConnect
            </Link>
            {isProfessional && clientProfile?.companyName && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l">
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  🏢 {clientProfile.companyName}
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={pathname === link.href ? 'default' : 'ghost'}
                  size="sm"
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            <Link href="/client/notifications">
              <Button variant="ghost" size="sm">
                🔔
              </Button>
            </Link>
            <Link href="/client/settings">
              <Button variant="ghost" size="sm">
                ⚙️
              </Button>
            </Link>
            <div className="hidden md:block text-sm text-gray-600">
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
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              🏢 {clientProfile.companyName}
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
      <div className="min-h-screen bg-gray-50">
        <ClientHeader />
        {children}
      </div>
    </ProtectedRoute>
  );
}
