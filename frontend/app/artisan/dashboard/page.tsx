'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryLabel } from '@/components/shared/CategoryLabel';
import { missionsApi } from '@/lib/api/missions';
import { artisanApi, EarningsSummary } from '@/lib/api/artisan';
import { translateOfferStatus } from '@/lib/utils/enum-translations';
import type { Offer, OfferStatus, MyOffersResponse } from '@/types/mission';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Wallet, Clock, Star, TrendingUp, Wrench, Hammer, Eye, Compass,
  ArrowRight, Calendar, User, CreditCard, FileText, Sparkles,
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  status: string;
  city?: string;
  category?: string;
  clientBudget?: number | string | null;
  agreedPrice?: number | string | null;
  type?: string;
  client?: { firstName?: string; lastName?: string };
  scheduledFor?: string | null;
  createdAt: string;
}

// Statuts d'une mission déjà attribuée à l'artisan = revenu à venir, travail à faire.
const TO_REALIZE_STATUSES = ['ACCEPTED', 'PAID', 'DEPOSIT_PAID', 'IN_TRANSIT'];
const TO_FINISH_STATUSES = ['IN_PROGRESS'];

// Couleurs de statut d'offre — cohérentes avec la page "Mes offres" (artisan-offers-v2).
const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  SENT: 'bg-blue-50 text-blue-600 border border-blue-200',
  VIEWED: 'bg-blue-100 text-blue-700 border border-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 border border-green-300',
  REJECTED: 'bg-red-100 text-red-700 border border-red-200',
  EXPIRED: 'bg-muted text-muted-foreground border border-border',
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ArtisanDashboard() {
  const { t } = useLanguage();

  // i18n : t() « humanise » la clé quand elle est absente. On détecte ce cas pour retomber sur le
  // FR fourni. (Copie du helper `td` de la page Découvrir, namespace « dashboardArtisan ».)
  const humanizeKey = (s: string): string =>
    s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  const td = (key: string, fr: string): string => {
    const v = t('dashboardArtisan', key);
    return v === humanizeKey(key) ? fr : v;
  };

  const [missions, setMissions] = useState<Mission[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersStats, setOffersStats] = useState<MyOffersResponse['stats'] | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [nearbyNewCount, setNearbyNewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Missions attribuées (endpoint déjà limité à l'artisan côté backend).
      const data = await missionsApi.getAll();
      setMissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement missions:', err);
    }

    // Gains (séquestre + ce mois-ci).
    try {
      setEarnings(await artisanApi.getEarningsSummary());
    } catch (err) {
      console.error('Erreur chargement gains:', err);
    }

    // Offres + taux de conversion.
    try {
      const data: MyOffersResponse = await missionsApi.getMyOffers();
      setOffers(Array.isArray(data?.offers) ? data.offers : []);
      setOffersStats(data?.stats ?? null);
    } catch (err) {
      console.error('Erreur chargement offres:', err);
    }

    // Note moyenne + nombre d'avis (profil artisan).
    try {
      const profile = await artisanApi.getMyProfile();
      setRating(profile?.rating != null ? Number(profile.rating) : null);
      setReviewCount(profile?.reviewCount != null ? Number(profile.reviewCount) : null);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    }

    // Missions ouvertes à proximité, sans offre de ma part (découverte).
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const nearby = await missionsApi.getNearby(
              position.coords.latitude,
              position.coords.longitude,
              20,
            );
            const open = Array.isArray(nearby)
              ? nearby.filter((m: any) => !m.myOffer).length
              : 0;
            setNearbyNewCount(open);
          } catch (err) {
            console.error('Erreur chargement missions à proximité:', err);
            setNearbyNewCount(null);
          }
        },
        () => setNearbyNewCount(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    }

    setLoading(false);
  };

  // ---- Formatteurs ----
  const fmtEur = (v: unknown): string =>
    `${num(v).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
  const relativeDate = (iso?: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return td('justNow', "à l'instant");
    if (mins < 60) return td('minAgo', 'il y a {n} min').replace('{n}', String(mins));
    const h = Math.round(mins / 60);
    if (h < 24) return td('hoursAgo', 'il y a {n} h').replace('{n}', String(h));
    const days = Math.round(h / 24);
    if (days < 30) return td('daysAgo', 'il y a {n} j').replace('{n}', String(days));
    return d.toLocaleDateString('fr-FR');
  };

  // ---- Dérivés ----
  const toRealize = missions.filter((m) => TO_REALIZE_STATUSES.includes(m.status));
  const toFinish = missions.filter((m) => TO_FINISH_STATUSES.includes(m.status));
  const toRealizeRevenue = toRealize.reduce(
    (sum, m) => sum + num(m.agreedPrice ?? m.clientBudget),
    0,
  );
  const viewedOffersCount = offersStats?.counts?.VIEWED ?? offers.filter((o) => o.status === 'VIEWED').length;
  const conversionRate = offersStats?.conversionRate;

  const recentOffers = [...offers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // File d'actions, triée par priorité de revenu (le plus rentable en 1er).
  type Action = {
    key: string;
    count: number;
    icon: typeof Wrench;
    title: string;
    desc: string;
    cta: string;
    href: string;
    accent: string; // classe de la pastille d'icône
  };
  const actions: Action[] = [];
  if (toRealize.length > 0) {
    actions.push({
      key: 'realize',
      count: toRealize.length,
      icon: Wrench,
      title: td('actionRealizeTitle', '{n} mission(s) à réaliser').replace('{n}', String(toRealize.length)),
      desc:
        toRealizeRevenue > 0
          ? td('actionRealizeDesc', '{amount} à encaisser une fois le travail validé.').replace(
              '{amount}',
              fmtEur(toRealizeRevenue),
            )
          : td('actionRealizeDescNoAmount', 'Chantiers acceptés en attente de réalisation.'),
      cta: td('actionOpen', 'Ouvrir'),
      href: toRealize.length === 1 ? `/artisan/missions/${toRealize[0].id}` : '/artisan/missions',
      accent: 'bg-primary/10 text-primary',
    });
  }
  if (toFinish.length > 0) {
    actions.push({
      key: 'finish',
      count: toFinish.length,
      icon: Hammer,
      title: td('actionFinishTitle', '{n} mission(s) à terminer').replace('{n}', String(toFinish.length)),
      desc: td('actionFinishDesc', 'Ajoutez les photos « après » et clôturez pour être payé.'),
      cta: td('actionFinish', 'Finaliser'),
      href: toFinish.length === 1 ? `/artisan/missions/${toFinish[0].id}` : '/artisan/missions',
      accent: 'bg-purple-100 text-purple-700',
    });
  }
  if (viewedOffersCount > 0) {
    actions.push({
      key: 'offers',
      count: viewedOffersCount,
      icon: Eye,
      title: td('actionOffersTitle', '{n} offre(s) vue(s), sans réponse').replace('{n}', String(viewedOffersCount)),
      desc: td('actionOffersDesc', 'Le client a vu votre prix. Relancez ou ajustez pour décrocher.'),
      cta: td('actionMyOffers', 'Mes offres'),
      href: '/artisan/offers',
      accent: 'bg-blue-100 text-blue-700',
    });
  }
  if (nearbyNewCount && nearbyNewCount > 0) {
    actions.push({
      key: 'discover',
      count: nearbyNewCount,
      icon: Compass,
      title: td('actionDiscoverTitle', '{n} nouvelle(s) mission(s) près de vous').replace('{n}', String(nearbyNewCount)),
      desc: td('actionDiscoverDesc', 'Des chantiers ouverts attendent une offre. Répondez vite.'),
      cta: td('actionDiscover', 'Découvrir'),
      href: '/artisan/discover',
      accent: 'bg-amber-100 text-amber-700',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Chargement…'}</div>
      </div>
    );
  }

  const thisMonth = num(earnings?.thisMonthEarnings);
  const lastMonth = num(earnings?.lastMonthEarnings);
  const monthDelta =
    earnings && lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {td('title', 'Tableau de bord')}
        </h1>
        <p className="text-muted-foreground">
          {td('subtitle', 'Vos gains et ce qu’il y a à faire maintenant.')}
        </p>
      </div>

      {/* Bandeau KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Carte sombre : gains ce mois-ci (métrique héros) */}
        <Card className="bg-foreground text-background border-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-background/70">{td('kpiThisMonth', 'Gains ce mois-ci')}</span>
              <Wallet className="h-4 w-4 text-background/70" />
            </div>
            <div className="mt-1 text-2xl font-bold">{earnings ? fmtEur(thisMonth) : '—'}</div>
            {monthDelta !== null && (
              <div className="mt-0.5 text-xs text-background/70">
                {monthDelta >= 0
                  ? td('kpiVsLastMonthUp', '+{n} % vs mois dernier').replace('{n}', String(monthDelta))
                  : td('kpiVsLastMonthDown', '{n} % vs mois dernier').replace('{n}', String(monthDelta))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* À percevoir (séquestre / en attente de validation) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{td('kpiPending', 'À percevoir')}</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {earnings ? fmtEur(earnings.pendingEarnings) : '—'}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {td('kpiPendingHint', 'en attente de validation')}
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{td('kpiRating', 'Note')}</span>
              <Star className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-foreground">
              {rating != null ? (
                <>
                  <Star className="h-5 w-5 fill-foreground text-foreground" />
                  {rating.toFixed(2)}
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {reviewCount != null
                ? td('kpiReviews', '{n} avis').replace('{n}', String(reviewCount))
                : td('kpiNoReviews', 'aucun avis')}
            </div>
          </CardContent>
        </Card>

        {/* Taux de conversion */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{td('kpiConversion', 'Taux de conversion')}</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {conversionRate != null ? `${conversionRate}%` : '—'}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {td('kpiConversionHint', 'offres acceptées')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File : Vos prochaines actions */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {td('actionsTitle', 'Vos prochaines actions')}
          </h2>
        </div>

        {actions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground">
                {td('emptyActionsTitle', "Rien d'urgent")}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {td('emptyActionsHint', 'Aucune mission en cours. Trouvez de nouvelles missions près de vous.')}
              </p>
              <Link href="/artisan/discover" className="mt-4 inline-block">
                <Button leftIcon={<Compass className="h-4 w-4" />}>
                  {td('emptyActionsCta', 'Trouver des missions')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <Card key={a.key} className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${a.accent}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{a.title}</h3>
                      <p className="truncate text-sm text-muted-foreground">{a.desc}</p>
                    </div>
                    <Link href={a.href} className="flex-shrink-0">
                      <Button size="sm">
                        {a.cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Vos offres récentes */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {td('recentOffersTitle', 'Vos offres récentes')}
          </h2>
          <Link href="/artisan/offers">
            <Button variant="ghost" size="sm">
              {td('viewAll', 'Tout voir')}
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {recentOffers.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <p>{td('noOffers', 'Aucune offre envoyée pour le moment.')}</p>
                <Link href="/artisan/discover">
                  <Button variant="outline" size="sm" className="mt-4">
                    {td('browseMissions', 'Parcourir les missions')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentOffers.map((o) => (
                  <Link
                    key={o.id}
                    href={`/artisan/missions/${o.missionId}`}
                    className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">
                        {o.mission?.title || td('missionRemoved', 'Mission')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.mission?.category && <CategoryLabel value={o.mission.category} />}
                        {o.mission?.category && o.mission?.city ? ' · ' : ''}
                        {o.mission?.city}
                        {' · '}
                        {relativeDate(o.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="font-semibold text-foreground">{fmtEur(o.proposedPrice)}</span>
                      <Badge className={OFFER_STATUS_COLORS[o.status]}>
                        {translateOfferStatus(o.status, t)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raccourcis */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          {td('quickActions', 'Raccourcis')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/artisan/discover">
            <Button variant="outline" leftIcon={<Compass className="h-4 w-4" />}>
              {td('shortcutDiscover', 'Trouver des missions')}
            </Button>
          </Link>
          <Link href="/artisan/availability/calendar">
            <Button variant="outline" leftIcon={<Calendar className="h-4 w-4" />}>
              {td('shortcutAvailability', 'Gérer mes disponibilités')}
            </Button>
          </Link>
          <Link href="/artisan/earnings">
            <Button variant="outline" leftIcon={<Wallet className="h-4 w-4" />}>
              {td('shortcutEarnings', 'Mes gains')}
            </Button>
          </Link>
          <Link href="/artisan/profile">
            <Button variant="outline" leftIcon={<User className="h-4 w-4" />}>
              {td('shortcutProfile', 'Mon profil')}
            </Button>
          </Link>
          <Link href="/artisan/stripe">
            <Button variant="outline" leftIcon={<CreditCard className="h-4 w-4" />}>
              {td('shortcutPayments', 'Paiements')}
            </Button>
          </Link>
          <Link href="/artisan/quotations">
            <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
              {td('shortcutQuotations', 'Mes devis')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
