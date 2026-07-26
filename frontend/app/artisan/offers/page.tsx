'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryLabel } from '@/components/shared/CategoryLabel';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { missionsApi } from '@/lib/api/missions';
import { translateOfferStatus } from '@/lib/utils/enum-translations';
import type { Offer, OfferStatus, MyOffersResponse } from '@/types/mission';
import { Send, Eye, CheckCircle2, TrendingUp, ArrowRight } from 'lucide-react';

// Couleurs de statut d'offre — cohérentes avec la maquette "artisan-offers-v2".
// envoyée = bleu clair · vue = bleu · acceptée = vert · refusée = rouge · expirée = gris.
const STATUS_COLORS: Record<OfferStatus, string> = {
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

const formatCurrency = (v: unknown): string => `${num(v).toLocaleString('fr-FR')} €`;

export default function ArtisanOffersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<MyOffersResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | OfferStatus>('all');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data: MyOffersResponse = await missionsApi.getMyOffers();
      setOffers(Array.isArray(data?.offers) ? data.offers : []);
      setStats(data?.stats ?? null);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('offers', 'loadError') || 'Impossible de charger vos offres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Date relative concise ("il y a 3 h", "il y a 2 j").
  const relativeDate = (iso?: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return t('offers', 'justNow') || "À l'instant";
    if (mins < 60) return `${t('offers', 'ago') || 'il y a'} ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${t('offers', 'ago') || 'il y a'} ${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${t('offers', 'ago') || 'il y a'} ${days} j`;
    return d.toLocaleDateString('fr-FR');
  };

  const counts = stats?.counts ?? {};
  const filtered = useMemo(
    () => (filter === 'all' ? offers : offers.filter((o) => o.status === filter)),
    [offers, filter],
  );

  const FILTERS: ('all' | OfferStatus)[] = ['all', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
  const filterLabel = (f: 'all' | OfferStatus): string =>
    f === 'all' ? t('offers', 'filterAll') || 'Toutes' : translateOfferStatus(f, t);

  const statCards = [
    { label: t('offers', 'statSent') || 'Offres envoyées', value: stats?.total ?? 0, icon: Send, accent: 'text-foreground' },
    { label: t('offers', 'statViewed') || 'Vues', value: counts.VIEWED ?? 0, icon: Eye, accent: 'text-foreground' },
    { label: t('offers', 'statAccepted') || 'Acceptées', value: counts.ACCEPTED ?? 0, icon: CheckCircle2, accent: 'text-success' },
    { label: t('offers', 'statConversion') || 'Taux de conversion', value: `${stats?.conversionRate ?? 0}%`, icon: TrendingUp, accent: 'text-foreground' },
  ];

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t('offers', 'title') || 'Mes offres'}
        </h1>
        <p className="text-muted-foreground">
          {t('offers', 'subtitle') || 'Suivez chaque offre envoyée : vue, acceptée ou refusée — au même endroit.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className={`mt-1 text-2xl font-bold ${s.accent}`}>{loading ? '—' : s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const n = f === 'all' ? offers.length : (counts[f] ?? 0);
          return (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {filterLabel(f)}
              <span className={`ml-1.5 ${filter === f ? 'opacity-80' : 'text-muted-foreground'}`}>{n}</span>
            </Button>
          );
        })}
      </div>

      {/* Liste / tableau des offres */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('common', 'loading') || 'Chargement…'}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('offers', 'empty') || 'Aucune offre pour ce filtre.'}</p>
              <p className="text-sm mt-2">
                {t('offers', 'emptyHint') || 'Parcourez les missions ouvertes et envoyez votre première offre.'}
              </p>
              <Link href="/artisan/missions">
                <Button variant="outline" size="sm" className="mt-4">
                  {t('offers', 'browseMissions') || 'Voir les missions'}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Vue tableau (desktop) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t('offers', 'colMission') || 'Mission'}</th>
                      <th className="px-4 py-3 font-medium">{t('offers', 'colClient') || 'Client'}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('offers', 'colAmount') || 'Montant'}</th>
                      <th className="px-4 py-3 font-medium">{t('offers', 'colSent') || 'Envoyée'}</th>
                      <th className="px-4 py-3 font-medium">{t('offers', 'colStatus') || 'Statut'}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('offers', 'colAction') || 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr key={o.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{o.mission?.title || t('offers', 'missionRemoved') || 'Mission'}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.mission?.category && <CategoryLabel value={o.mission.category} />}
                            {o.mission?.category && o.mission?.city ? ' · ' : ''}
                            {o.mission?.city}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{o.clientName || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(o.proposedPrice)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{relativeDate(o.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[o.status]}>{translateOfferStatus(o.status, t)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/artisan/missions/${o.missionId}`}>
                            {o.status === 'ACCEPTED' && !['COMPLETED', 'AUTO_VALIDATED', 'CANCELLED', 'CANCELLED_NO_SHOW', 'DISPUTED'].includes((o.mission as { status?: string } | undefined)?.status ?? '') ? (
                              <Button size="sm">
                                {t('offers', 'actionRealise') || 'Réaliser'} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm">{t('offers', 'actionView') || 'Voir'}</Button>
                            )}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vue cartes (mobile) */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((o) => (
                  <div key={o.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{o.mission?.title || t('offers', 'missionRemoved') || 'Mission'}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.mission?.category && <CategoryLabel value={o.mission.category} />}
                          {o.mission?.category && o.mission?.city ? ' · ' : ''}
                          {o.mission?.city}
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[o.status]}>{translateOfferStatus(o.status, t)}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{o.clientName || '—'} · {relativeDate(o.createdAt)}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(o.proposedPrice)}</span>
                    </div>
                    <Link href={`/artisan/missions/${o.missionId}`} className="block mt-3">
                      {o.status === 'ACCEPTED' && !['COMPLETED', 'AUTO_VALIDATED', 'CANCELLED', 'CANCELLED_NO_SHOW', 'DISPUTED'].includes((o.mission as { status?: string } | undefined)?.status ?? '') ? (
                        <Button size="sm" className="w-full">
                          {t('offers', 'actionRealise') || 'Réaliser'} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full">{t('offers', 'actionView') || 'Voir'}</Button>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Note discrète : le devis formel PDF reste séparé */}
      <p className="mt-4 text-xs text-muted-foreground">
        {t('offers', 'quoteNote') ||
          'Une offre est une proposition rapide de prix. Pour les gros chantiers, le devis formel PDF reste disponible dans l’onglet Devis.'}
      </p>
    </div>
  );
}
