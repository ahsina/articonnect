'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { missionsApi } from '@/lib/api/missions';
import { useLanguage } from '@/contexts/LanguageContext';
import { categoryLabel } from '@/components/shared/CategoryLabel';
// CSS-only import (aucun JS window) — sûr en SSR. Le JS Leaflet est importé dynamiquement plus bas.
import 'leaflet/dist/leaflet.css';
import {
  Compass, MapPin, AlertTriangle, CalendarClock, FileText, Wrench, Euro,
  Users, Send, Eye, CheckCircle2, SlidersHorizontal, List, Map as MapIcon,
  LocateFixed, Navigation, RefreshCw,
} from 'lucide-react';

// Contrat backend enrichi (en cours de déploiement en parallèle) : offersCount / myOffer /
// distanceKm peuvent être absents → fallback propre (on masque ou on calcule côté client).
interface DiscoverMission {
  id: string;
  title: string;
  description?: string;
  status: string; // PENDING | NEGOTIATING
  type?: string; // EMERGENCY | SCHEDULED | QUOTE
  category: string;
  city?: string;
  clientBudget?: number | string | null;
  scheduledFor?: string | null;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  // Enrichissements (facultatifs)
  offersCount?: number;
  distanceKm?: number;
  myOffer?: { id: string; proposedPrice: number; status: string } | null;
}

type RadiusOption = 5 | 10 | 20 | 50;
type BudgetFilter = 'all' | '100' | '300' | '800';
type TypeFilter = 'all' | 'EMERGENCY' | 'SCHEDULED' | 'QUOTE';
type SortKey = 'distance' | 'recent' | 'budget';

const DEFAULT_CENTER = { lat: 49.6116, lng: 6.1319 }; // Luxembourg-Ville

// Distance à vol d'oiseau (Haversine) — utilisée si le backend ne fournit pas distanceKm.
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function ArtisanDiscoverPage() {
  const { t } = useLanguage();

  // Texte : privilégie le namespace i18n « discover » s'il existe un jour, sinon FR direct.
  // (t() « humanise » la clé quand elle est absente ; on détecte ce cas pour retomber sur le FR.)
  const humanizeKey = (s: string): string =>
    s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  const td = (key: string, fr: string): string => {
    const v = t('discover', key);
    return v === humanizeKey(key) ? fr : v;
  };

  const [missions, setMissions] = useState<DiscoverMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  // Filtres / tri
  const [radius, setRadius] = useState<RadiusOption>(20);
  const [category, setCategory] = useState<string | 'all'>('all');
  const [budget, setBudget] = useState<BudgetFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<SortKey>('distance');
  const [view, setView] = useState<'list' | 'map'>('list');

  // Charge les missions ouvertes autour de la position (ou du centre par défaut).
  const load = async (pos: { lat: number; lng: number } | null, r: RadiusOption) => {
    setLoading(true);
    setError(null);
    const center = pos ?? DEFAULT_CENTER;
    try {
      const data = await missionsApi.getNearby(center.lat, center.lng, r);
      setMissions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur chargement missions à proximité:', e);
      setError(td('loadError', 'Impossible de charger les missions. Réessayez.'));
      setMissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Géoloc au montage : si refusée/indispo → on charge quand même (centre par défaut) et on masque la distance.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserPos(pos);
          load(pos, radius);
        },
        () => {
          setGeoDenied(true);
          load(null, radius);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    } else {
      setGeoDenied(true);
      load(null, radius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changement de rayon → on rappelle getNearby.
  const changeRadius = (r: RadiusOption) => {
    setRadius(r);
    load(userPos, r);
  };

  // Distance effective (backend si présent, sinon calcul client si géoloc dispo, sinon undefined).
  const distanceOf = (m: DiscoverMission): number | undefined => {
    if (typeof m.distanceKm === 'number') return m.distanceKm;
    if (userPos && m.latitude != null && m.longitude != null) {
      return haversineKm(userPos, { lat: m.latitude, lng: m.longitude });
    }
    return undefined;
  };

  const budgetOf = (m: DiscoverMission): number | undefined => {
    const b = m.clientBudget;
    if (b == null || b === '') return undefined;
    const n = Number(b);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // Chips catégorie : dérivées des catégories réelles renvoyées, dédupliquées par libellé affiché.
  const categoryChips = useMemo(() => {
    const byLabel = new Map<string, string>(); // label affiché -> 1re valeur brute rencontrée
    for (const m of missions) {
      const label = categoryLabel(m.category, t) || m.category;
      if (label && !byLabel.has(label)) byLabel.set(label, m.category);
    }
    return Array.from(byLabel.keys()).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [missions, t]);

  const filtered = useMemo(() => {
    let list = missions.filter((m) => {
      if (category !== 'all' && (categoryLabel(m.category, t) || m.category) !== category) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (budget !== 'all') {
        const b = budgetOf(m);
        if (b === undefined || b < Number(budget)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'budget') {
        return (budgetOf(b) ?? -1) - (budgetOf(a) ?? -1);
      }
      // distance : les plus proches d'abord ; sans distance → en fin.
      const da = distanceOf(a);
      const db = distanceOf(b);
      if (da === undefined && db === undefined) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (da === undefined) return 1;
      if (db === undefined) return -1;
      return da - db;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions, category, typeFilter, budget, sort, userPos, t]);

  // ---- Formatteurs d'affichage ----
  const fmtDistance = (km: number): string => {
    const v = km < 10 ? km.toFixed(1).replace('.', ',') : String(Math.round(km));
    return `${v} km`;
  };
  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.max(0, Math.round(diff / 60000));
    if (min < 1) return td('justNow', "à l'instant");
    if (min < 60) return td('minAgo', 'il y a {n} min').replace('{n}', String(min));
    const h = Math.round(min / 60);
    if (h < 24) return td('hoursAgo', 'il y a {n} h').replace('{n}', String(h));
    const d = Math.round(h / 24);
    return td('daysAgo', 'il y a {n} j').replace('{n}', String(d));
  };
  const fmtDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtBudget = (n: number): string =>
    `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;

  const typeMeta = (type?: string): { label: string; cls: string; icon: typeof AlertTriangle } | null => {
    if (type === 'EMERGENCY')
      return { label: td('typeEmergency', 'Urgent'), cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle };
    if (type === 'SCHEDULED')
      return { label: td('typeScheduled', 'Planifié'), cls: 'bg-primary/10 text-primary border-primary/20', icon: CalendarClock };
    if (type === 'QUOTE')
      return { label: td('typeQuote', 'Devis'), cls: 'bg-primary/10 text-primary border-primary/20', icon: FileText };
    return null;
  };

  const radiusOptions: RadiusOption[] = [5, 10, 20, 50];
  const budgetOptions: { key: BudgetFilter; label: string }[] = [
    { key: 'all', label: td('budgetAll', 'Tous budgets') },
    { key: '100', label: '> 100 €' },
    { key: '300', label: '> 300 €' },
    { key: '800', label: '> 800 €' },
  ];
  const typeOptions: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: td('typeAll', 'Tous types') },
    { key: 'EMERGENCY', label: td('typeEmergency', 'Urgent') },
    { key: 'SCHEDULED', label: td('typeScheduled', 'Planifié') },
    { key: 'QUOTE', label: td('typeQuote', 'Devis') },
  ];
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'distance', label: td('sortDistance', 'Plus proches') },
    { key: 'recent', label: td('sortRecent', 'Plus récentes') },
    { key: 'budget', label: td('sortBudget', 'Budget') },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            {td('title', 'Trouver des missions')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {td('subtitle', 'Missions ouvertes près de vous. Répondez vite pour décrocher le chantier.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bascule Liste / Carte */}
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={view === 'list'}
            >
              <List className="h-4 w-4" /> {td('viewList', 'Liste')}
            </button>
            <button
              onClick={() => setView('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === 'map' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={view === 'map'}
            >
              <MapIcon className="h-4 w-4" /> {td('viewMap', 'Carte')}
            </button>
          </div>
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => load(userPos, radius)}>
            {td('refresh', 'Actualiser')}
          </Button>
        </div>
      </div>

      {/* Statut géoloc + rayon */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {geoDenied ? (
            <>
              <Navigation className="h-4 w-4" />
              {td('geoOff', 'Position indisponible — missions récentes affichées, distances masquées.')}
            </>
          ) : userPos ? (
            <>
              <LocateFixed className="h-4 w-4 text-success" />
              {td('geoOn', 'Position détectée — missions triées par proximité.')}
            </>
          ) : (
            <>
              <LocateFixed className="h-4 w-4" />
              {td('geoLoading', 'Localisation…')}
            </>
          )}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{td('radius', 'Rayon')} :</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {radiusOptions.map((r) => (
              <button
                key={r}
                onClick={() => changeRadius(r)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  radius === r ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-5">
        <CardContent className="p-4 space-y-3">
          {/* Catégories */}
          <div className="flex items-start gap-2">
            <SlidersHorizontal className="h-4 w-4 mt-1.5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  category === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {td('catAll', 'Toutes catégories')}
              </button>
              {categoryChips.map((label) => (
                <button
                  key={label}
                  onClick={() => setCategory(label)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    category === label
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget / Type / Tri */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{td('budget', 'Budget')}</span>
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                {budgetOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setBudget(o.key)}
                    className={`px-2.5 py-1.5 text-sm transition-colors ${
                      budget === o.key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{td('type', 'Type')}</span>
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                {typeOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setTypeFilter(o.key)}
                    className={`px-2.5 py-1.5 text-sm transition-colors ${
                      typeFilter === o.key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{td('sort', 'Trier')}</span>
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                {sortOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setSort(o.key)}
                    className={`px-2.5 py-1.5 text-sm transition-colors ${
                      sort === o.key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compteur résultats */}
      {!loading && !error && (
        <div className="mb-3 text-sm text-muted-foreground">
          {filtered.length > 0
            ? td('resultsCount', '{n} mission(s) ouverte(s)').replace('{n}', String(filtered.length))
            : ''}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">{t('common', 'loading') || 'Chargement…'}</div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => load(userPos, radius)} leftIcon={<RefreshCw className="h-4 w-4" />}>
              {td('retry', 'Réessayer')}
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Compass className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-foreground mb-1">{td('emptyTitle', 'Aucune mission pour ces critères')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {td('emptyHint', 'Élargissez le rayon ou retirez des filtres pour voir plus de chantiers.')}
            </p>
            <div className="flex items-center justify-center gap-2">
              {radius < 50 && (
                <Button variant="outline" onClick={() => changeRadius(50)}>
                  {td('widenRadius', 'Élargir à 50 km')}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setCategory('all');
                  setBudget('all');
                  setTypeFilter('all');
                }}
              >
                {td('clearFilters', 'Réinitialiser les filtres')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : view === 'map' ? (
        <DiscoverMap
          missions={filtered}
          userPos={userPos}
          labels={{
            noGeo: td('mapNoPoints', 'Aucune coordonnée à afficher.'),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((m) => {
            const dist = distanceOf(m);
            const b = budgetOf(m);
            const tm = typeMeta(m.type);
            const catText = categoryLabel(m.category, t) || m.category;
            const hasOffersCount = typeof m.offersCount === 'number';
            return (
              <Card key={m.id} className="flex flex-col hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex flex-col gap-3 flex-1">
                  {/* Ligne titre + type */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Wrench className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground leading-tight truncate">{m.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <MapPin className="inline h-3.5 w-3.5 -mt-0.5" /> {m.city || '—'}
                          {dist !== undefined && <> • {fmtDistance(dist)}</>}
                          {' • '}
                          {timeAgo(m.createdAt)}
                        </p>
                      </div>
                    </div>
                    {tm && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tm.cls}`}>
                        <tm.icon className="h-3 w-3" /> {tm.label}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {m.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                  )}

                  {/* Faits clés */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      {b !== undefined ? (
                        <><span className="font-semibold">{fmtBudget(b)}</span></>
                      ) : (
                        <span className="text-muted-foreground">{td('budgetTbd', 'Budget à discuter')}</span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Wrench className="h-4 w-4" /> {catText}
                    </span>
                    {m.scheduledFor && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" /> {fmtDate(m.scheduledFor)}
                      </span>
                    )}
                  </div>

                  {/* Signal de concurrence (si offersCount fourni) */}
                  {hasOffersCount && (
                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        (m.offersCount as number) > 0 ? 'text-warning' : 'text-success'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {(m.offersCount as number) > 0
                        ? td('competitorsN', '{n} artisan(s) ont déjà répondu').replace('{n}', String(m.offersCount))
                        : td('beFirst', 'Soyez le 1er à répondre')}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-auto pt-1">
                    {m.myOffer ? (
                      <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success self-start">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {td('alreadyOffered', 'Vous avez déjà offert ({n} €)').replace(
                            '{n}',
                            String(m.myOffer.proposedPrice),
                          )}
                        </div>
                        <Link href={`/artisan/missions/${m.id}`} className="w-full">
                          <Button variant="outline" className="w-full" leftIcon={<Eye className="h-4 w-4" />}>
                            {td('viewMyOffer', 'Voir mon offre')}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Link href={`/artisan/missions/${m.id}`} className="flex-1">
                          <Button className="w-full" leftIcon={<Send className="h-4 w-4" />}>
                            {td('makeOffer', 'Faire une offre')}
                          </Button>
                        </Link>
                        <Link href={`/artisan/missions/${m.id}`}>
                          <Button variant="outline" leftIcon={<Eye className="h-4 w-4" />}>
                            {td('view', 'Voir')}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carte multi-marqueurs (Leaflet en impératif, importé côté client uniquement pour
// éviter le SSR — Leaflet touche `window`). Réutilise le style clair CartoDB du projet.
// ---------------------------------------------------------------------------
function DiscoverMap({
  missions,
  userPos,
  labels,
}: {
  missions: DiscoverMission[];
  userPos: { lat: number; lng: number } | null;
  labels: { noGeo: string };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const points = useMemo(
    () => missions.filter((m) => m.latitude != null && m.longitude != null),
    [missions],
  );

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      if (!containerRef.current || points.length === 0) return;
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: false });
      mapRef.current = map;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

      const missionIcon = L.divIcon({
        className: '',
        html:
          '<div style="width:18px;height:18px;background:#0F0F0F;border:2px solid #fff;border-radius:999px 999px 999px 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });

      const latlngs: [number, number][] = [];
      for (const m of points) {
        const marker = L.marker([m.latitude as number, m.longitude as number], { icon: missionIcon }).addTo(map);
        const price = m.clientBudget != null && m.clientBudget !== '' ? ` — ${Number(m.clientBudget)} €` : '';
        marker.bindPopup(
          `<a href="/artisan/missions/${m.id}" style="font-weight:600;color:#0F0F0F;text-decoration:none">${(m.title || '').replace(/</g, '&lt;')}</a><br/><span style="color:#666;font-size:12px">${(m.city || '')}${price}</span>`,
        );
        latlngs.push([m.latitude as number, m.longitude as number]);
      }

      if (userPos) {
        const meIcon = L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;background:#2563eb;border:3px solid #fff;border-radius:999px;box-shadow:0 0 0 2px rgba(37,99,235,.35)"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userPos.lat, userPos.lng], { icon: meIcon }).addTo(map);
        latlngs.push([userPos.lat, userPos.lng]);
      }

      if (latlngs.length === 1) {
        map.setView(latlngs[0], 13);
      } else if (latlngs.length > 1) {
        map.fitBounds(latlngs, { padding: [40, 40] });
      }

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [points, userPos]);

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">{labels.noGeo}</CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[60vh] w-full overflow-hidden rounded-2xl border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
