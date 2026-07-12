'use client';

import { CategoryLabel } from '@/components/shared/CategoryLabel';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { missionsApi } from '@/lib/api/missions';
import { userApi } from '@/lib/api/user';
import { useAuth } from '@/contexts/AuthContext';
import { Mission, MissionStatus } from '@/types/mission';
import { useLanguage } from '@/contexts/LanguageContext';
import { ClipboardList, Hammer, ShoppingCart, LogOut, Wrench, HardHat, Building2, Menu, X } from 'lucide-react';

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  siret?: string;
  vatNumber?: string;
  industry?: string;
}

const STATUS_BADGES: Record<MissionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  NEGOTIATING: 'bg-primary/10 text-primary',
  ACCEPTED: 'bg-green-100 text-green-700',
  PENDING_DEPOSIT: 'bg-amber-100 text-amber-800',
  DEPOSIT_PAID: 'bg-green-100 text-green-700',
  PAID: 'bg-green-100 text-green-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-muted text-foreground',
  AUTO_VALIDATED: 'bg-muted text-foreground',
  CANCELLED: 'bg-red-100 text-red-700',
  CANCELLED_NO_SHOW: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-red-100 text-red-700',
};

export default function ClientDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [missionsData, profileData] = await Promise.all([
        missionsApi.getAll(),
        userApi.getClientProfile().catch(() => null),
      ]);
      setMissions(missionsData);
      setClientProfile(profileData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProfessional = clientProfile?.clientType === 'PROFESSIONAL';

  const getStatusBadge = (status: MissionStatus): string => {
    return STATUS_BADGES[status] || 'bg-muted text-foreground';
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card shadow relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2 min-w-0">
            <div className="flex items-center shrink-0">
              <Link href="/" className="text-2xl font-bold text-primary">
                Krafolt
              </Link>
            </div>
            {/* Nav desktop (>= lg) */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/client/missions">
                <Button variant="ghost" leftIcon={<ClipboardList className="h-4 w-4" />}>{t('missions', 'myMissions')}</Button>
              </Link>
              <Link href="/client/artisans">
                <Button variant="ghost" leftIcon={<Hammer className="h-4 w-4" />}>{t('missions', 'findArtisan')}</Button>
              </Link>
              <Link href="/client/marketplace">
                <Button variant="ghost" leftIcon={<ShoppingCart className="h-4 w-4" />}>{t('marketplace', 'title')}</Button>
              </Link>
              <LanguageSwitcher />
              <Button
                variant="ghost"
                onClick={handleLogout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                {t('common', 'logout')}
              </Button>
            </div>
            {/* Hamburger (< lg) */}
            <div className="flex lg:hidden items-center gap-2 shrink-0">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" aria-label="Menu" onClick={() => setMobileMenuOpen((v) => !v)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {/* Menu mobile déroulant */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 top-16 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 right-0 top-16 z-50 bg-card border-t border-border shadow-lg lg:hidden">
              <div className="flex flex-col p-2">
                <Link href="/client/missions" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start" leftIcon={<ClipboardList className="h-4 w-4" />}>{t('missions', 'myMissions')}</Button>
                </Link>
                <Link href="/client/artisans" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start" leftIcon={<Hammer className="h-4 w-4" />}>{t('missions', 'findArtisan')}</Button>
                </Link>
                <Link href="/client/marketplace" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start" leftIcon={<ShoppingCart className="h-4 w-4" />}>{t('marketplace', 'title')}</Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); handleLogout(); }} leftIcon={<LogOut className="h-4 w-4" />}>
                  {t('common', 'logout')}
                </Button>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-card shadow rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {t('missions', 'welcomeClient')}, {user?.firstName || 'Client'} !
                </h1>
                {isProfessional && (
                  <Badge variant="default" className="bg-primary">
                    <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {t("client", "professional") || "Professionnel"}</span>
                  </Badge>
                )}
              </div>
              {isProfessional && clientProfile?.companyName && (
                <div className="mb-2">
                  <p className="text-lg font-semibold text-primary">
                    {clientProfile.companyName}
                  </p>
                  {clientProfile.industry && (
                    <p className="text-sm text-muted-foreground">{clientProfile.industry}</p>
                  )}
                </div>
              )}
              <p className="text-muted-foreground">{t('missions', 'manageRequests')}</p>
            </div>
            {isProfessional && (
              <Link href="/client/settings">
                <Button variant="outline" size="sm">
                  {t('client', 'companySettings') || 'Paramètres entreprise'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Link
            href="/client/missions/new"
            className="bg-primary text-primary-foreground p-6 rounded-2xl hover:bg-primary/90 transition"
          >
            <Wrench className="h-7 w-7 mb-2" />
            <h3 className="text-xl font-semibold mb-2">{t('clientDashboard', 'newRequest')}</h3>
            <p className="text-primary-foreground/80">{t('clientDashboard', 'newRequestDesc')}</p>
          </Link>

          <Link
            href="/client/artisans"
            className="bg-card border border-border text-foreground p-6 rounded-2xl hover:bg-accent transition"
          >
            <HardHat className="h-7 w-7 mb-2" />
            <h3 className="text-xl font-semibold mb-2">{t('clientDashboard', 'findArtisan')}</h3>
            <p className="text-muted-foreground">{t('clientDashboard', 'findArtisanDesc')}</p>
          </Link>

          <Link
            href="/client/marketplace"
            className="bg-card border border-border text-foreground p-6 rounded-2xl hover:bg-accent transition"
          >
            <ShoppingCart className="h-7 w-7 mb-2" />
            <h3 className="text-xl font-semibold mb-2">{t('marketplace', 'title')}</h3>
            <p className="text-muted-foreground">{t('clientDashboard', 'marketplaceDesc')}</p>
          </Link>
        </div>

        {/* Recent Missions */}
        <div className="bg-card shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('clientDashboard', 'recentMissions')}</h2>

          {missions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('clientDashboard', 'noMissions')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('clientDashboard', 'createFirstRequest')}
              </p>
              <Link href="/client/missions/new">
                <Button>{t('clientDashboard', 'createRequest')}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {missions.slice(0, 5).map((mission) => (
                <Link
                  key={mission.id}
                  href={`/client/missions/${mission.id}`}
                  className="block border border-border rounded-lg p-4 hover:border-primary transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {mission.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {mission.city} • <CategoryLabel value={mission.category} />
                      </p>
                      {mission.artisan && (
                        <p className="text-muted-foreground text-sm">
                          {t('clientDashboard', 'artisanLabel')}: {mission.artisan.firstName} {mission.artisan.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          mission.status
                        )}`}
                      >
                        {t('clientDashboard', `status_${mission.status}`)}
                      </span>
                      {mission.agreedPrice && (
                        <div className="text-lg font-bold text-foreground mt-2">
                          {mission.agreedPrice}€
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
