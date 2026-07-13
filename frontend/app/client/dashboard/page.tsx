'use client';

import { CategoryLabel } from '@/components/shared/CategoryLabel';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { missionsApi } from '@/lib/api/missions';
import { userApi } from '@/lib/api/user';
import { useAuth } from '@/contexts/AuthContext';
import { Mission, MissionStatus } from '@/types/mission';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateMissionStatus } from '@/lib/utils/enum-translations';
import {
  ClipboardList, Hammer, ShoppingCart, LogOut, Wrench, HardHat, Building2, Menu, X,
  CreditCard, CheckCircle2, Truck, GitCompare, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  siret?: string;
  vatNumber?: string;
  industry?: string;
}

// GET /missions renvoie plus de champs que le type Mission de base : on enrichit localement
// avec ce dont la file d'actions a besoin (dates de paiement / validation).
interface DashMission extends Mission {
  depositPaidAt?: string | null;
  completedAt?: string | null;
  validatedAt?: string | null;
  autoValidatedAt?: string | null;
  scheduledFor?: string | null;
  clientBudget?: number | null;
}

// Une carte de la file « À traiter maintenant ».
interface ActionItem {
  id: string;          // clé unique (missionId + type)
  icon: LucideIcon;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  urgent: boolean;     // action « argent »/urgente → mise en avant (bordure noire)
  priority: number;    // ordre de tri (plus petit = plus haut)
  dueBadge?: string;   // badge « J-x » (auto-validation)
}

const MAX_ACTIONS = 6;

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
  const [missions, setMissions] = useState<DashMission[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Nombre d'offres reçues (d'artisans) par mission ouverte — chargé après coup, non bloquant.
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});

  // i18n : t() « humanise » la clé quand elle est absente ; on détecte ce cas pour retomber sur le
  // FR fourni. Tous les nouveaux textes passent par td() → le FR s'affiche tant que les clés du
  // namespace « dashboardClient » ne sont pas ajoutées.
  const humanizeKey = (s: string): string =>
    s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  const td = (key: string, fr: string): string => {
    const v = t('dashboardClient', key);
    return !v || v === humanizeKey(key) ? fr : v;
  };

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
      loadOfferCounts(missionsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // GET /missions ne renvoie pas le nombre d'offres : on le récupère via getNegotiations pour les
  // missions ouvertes (PENDING/NEGOTIATING) et on ne compte que les offres reçues d'artisans
  // (senderId !== moi). Même approche que la page liste des missions. Non bloquant.
  const loadOfferCounts = async (data: DashMission[]) => {
    const open = data.filter((m) => m.status === 'PENDING' || m.status === 'NEGOTIATING');
    if (open.length === 0) return;
    try {
      const me = await userApi.getProfile().catch(() => null);
      const myId: string | undefined = me?.id;
      const entries = await Promise.all(
        open.map(async (m) => {
          try {
            const negs = await missionsApi.getNegotiations(m.id);
            const list: Array<{ senderId?: string }> = Array.isArray(negs) ? negs : [];
            const received = myId ? list.filter((n) => n.senderId !== myId).length : list.length;
            return [m.id, received] as const;
          } catch {
            return [m.id, 0] as const;
          }
        })
      );
      setOfferCounts(Object.fromEntries(entries));
    } catch (error) {
      console.error('Error loading offer counts:', error);
    }
  };

  // File d'actions « À traiter maintenant » dérivée des missions + du nombre d'offres reçues.
  const actions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    for (const m of missions) {
      // Un paiement à sécuriser (argent) : offre acceptée, prix convenu, acompte pas encore payé.
      if (
        (m.status === 'ACCEPTED' || m.status === 'PENDING_DEPOSIT') &&
        m.agreedPrice &&
        !m.depositPaidAt
      ) {
        items.push({
          id: `${m.id}-pay`,
          icon: CreditCard,
          title: td('actionPayTitle', 'Un paiement à sécuriser'),
          subtitle: `${m.title} · ${m.agreedPrice}€`,
          cta: td('actionPayCta', 'Payer'),
          href: `/client/payment/${m.id}`,
          urgent: true,
          priority: 1,
        });
        continue;
      }
      // Un travail à valider (argent bloqué) : mission terminée, ni validée ni auto-validée.
      if (m.status === 'COMPLETED' && !m.validatedAt && !m.autoValidatedAt) {
        let dueBadge: string | undefined;
        if (m.completedAt) {
          const deadline = new Date(new Date(m.completedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
          const days = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          dueBadge = `J-${days}`;
        }
        items.push({
          id: `${m.id}-validate`,
          icon: CheckCircle2,
          title: td('actionValidateTitle', 'Un travail à valider'),
          subtitle: m.title,
          cta: td('actionValidateCta', 'Valider'),
          href: `/client/missions/${m.id}`,
          urgent: true,
          priority: 2,
          dueBadge,
        });
        continue;
      }
      // N offres à comparer : mission ouverte ayant reçu des offres d'artisans.
      if ((m.status === 'PENDING' || m.status === 'NEGOTIATING') && (offerCounts[m.id] || 0) > 0) {
        const n = offerCounts[m.id];
        items.push({
          id: `${m.id}-offers`,
          icon: GitCompare,
          title:
            n > 1
              ? `${n} ${td('actionOffersTitle', 'offres à comparer')}`
              : `${n} ${td('actionOfferTitle', 'offre à comparer')}`,
          subtitle: m.title,
          cta: td('actionOffersCta', 'Comparer'),
          href: `/client/missions/${m.id}`,
          urgent: false,
          priority: 3,
        });
        continue;
      }
      // Intervention en cours : artisan en route ou sur place.
      if (m.status === 'IN_TRANSIT' || m.status === 'IN_PROGRESS') {
        items.push({
          id: `${m.id}-track`,
          icon: Truck,
          title: td('actionTrackTitle', 'Intervention en cours'),
          subtitle: `${m.title} · ${translateMissionStatus(m.status, t)}`,
          cta: td('actionTrackCta', 'Suivre'),
          href: `/client/missions/${m.id}`,
          urgent: false,
          priority: 4,
        });
        continue;
      }
    }
    return items.sort((a, b) => a.priority - b.priority);
  }, [missions, offerCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleActions = actions.slice(0, MAX_ACTIONS);
  const overflowCount = actions.length - visibleActions.length;

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

        {/* À traiter maintenant — file d'actions prioritaires */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-bold text-foreground">
              {td('toHandleNow', 'À traiter maintenant')}
            </h2>
            {actions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {actions.length} {actions.length > 1 ? td('actionsPlural', 'actions') : td('actionSingular', 'action')}
              </span>
            )}
          </div>

          {actions.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{td('allCaughtUp', 'Tout est à jour')}</p>
                <p className="text-sm text-muted-foreground">
                  {td('allCaughtUpDesc', 'Aucune action requise pour le moment.')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleActions.map((action) => {
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    className={`bg-card rounded-2xl p-4 flex items-center gap-4 transition ${
                      action.urgent
                        ? 'border-2 border-foreground'
                        : 'border border-border hover:border-primary'
                    }`}
                  >
                    <div
                      className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${
                        action.urgent ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{action.title}</h3>
                        {action.dueBadge && (
                          <Badge className="bg-amber-100 text-amber-800">{action.dueBadge}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{action.subtitle}</p>
                    </div>
                    <Link href={action.href} className="shrink-0">
                      <Button
                        size="sm"
                        variant={action.urgent ? 'default' : 'outline'}
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        {action.cta}
                      </Button>
                    </Link>
                  </div>
                );
              })}

              {overflowCount > 0 && (
                <Link
                  href="/client/missions"
                  className="block text-center text-sm font-medium text-primary hover:underline py-2"
                >
                  + {overflowCount} {td('moreActions', 'autres à traiter')} →
                </Link>
              )}
            </div>
          )}
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
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {(mission.status === 'PENDING' || mission.status === 'NEGOTIATING') &&
                          (offerCounts[mission.id] || 0) > 0 && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-foreground text-background">
                              {offerCounts[mission.id]}{' '}
                              {offerCounts[mission.id] > 1
                                ? td('offersToCompareShort', 'offres')
                                : td('offerToCompareShort', 'offre')}
                            </span>
                          )}
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                            mission.status
                          )}`}
                        >
                          {translateMissionStatus(mission.status, t)}
                        </span>
                      </div>
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
