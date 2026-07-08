'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Wallet,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  subcontractorApi,
  type PortalDashboard,
  type SubcontractorEarnings,
  type SubcontractorOffer,
  type SubcontractorAssignment,
} from '@/lib/api/subcontractor';

type TabKey = 'dashboard' | 'offers' | 'assignments' | 'earnings';

const OFFER_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'error',
  EXPIRED: 'secondary',
};

const ASSIGNMENT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline'
  | 'secondary'
  | 'destructive';

export default function SubcontractorPortalPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [earnings, setEarnings] = useState<SubcontractorEarnings | null>(null);
  const [offers, setOffers] = useState<SubcontractorOffer[]>([]);
  const [assignments, setAssignments] = useState<SubcontractorAssignment[]>([]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, earn, offs, assigns] = await Promise.all([
        subcontractorApi.portal.getDashboard().catch(() => null),
        subcontractorApi.portal.getEarnings().catch(() => null),
        subcontractorApi.portal.getOffers().catch(() => []),
        subcontractorApi.portal.getAssignments().catch(() => []),
      ]);
      setDashboard(dash);
      setEarnings(earn);
      setOffers(Array.isArray(offs) ? offs : []);
      setAssignments(Array.isArray(assigns) ? assigns : []);
    } catch (e) {
      console.error('Error loading subcontractor portal:', e);
      setError(t('subcontractor', 'loadError') || 'Unable to load the portal. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount?: number, currency?: string) => {
    const value = Number(amount) || 0;
    const cur = currency || 'EUR';
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: cur,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${value} ${cur}`;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAccept = async (id: string) => {
    if (!id) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.acceptOffer(id);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('subcontractor', 'offerAccepted') || 'Offer accepted.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error accepting offer:', e);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'offerAcceptError') || 'Could not accept the offer.',
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (id: string) => {
    if (!id) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.declineOffer(id);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('subcontractor', 'offerDeclined') || 'Offer declined.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error declining offer:', e);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'offerDeclineError') || 'Could not decline the offer.',
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleProgress = async (id: string, progress: number) => {
    if (!id) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.updateProgress(id, Math.min(100, Math.max(0, Number(progress) || 0)));
      toast({
        title: t('common', 'success') || 'Success',
        description: t('subcontractor', 'progressUpdated') || 'Progress updated.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error updating progress:', e);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'progressError') || 'Could not update progress.',
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!id) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.completeAssignment(id);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('subcontractor', 'assignmentCompleted') || 'Mission marked as completed.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error completing assignment:', e);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'completeError') || 'Could not complete the mission.',
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // --- Derived KPIs (tolerant, anti-NaN) ---------------------------------
  const pendingOffersCount =
    Number(dashboard?.pendingOffers) ||
    offers.filter((o) => (o?.status || '').toUpperCase() === 'PENDING').length ||
    0;
  const activeCount =
    Number(dashboard?.activeAssignments) ||
    assignments.filter((a) => (a?.status || '').toUpperCase() === 'IN_PROGRESS').length ||
    0;
  const completedCount =
    Number(dashboard?.completedAssignments) ||
    assignments.filter((a) => (a?.status || '').toUpperCase() === 'COMPLETED').length ||
    0;
  const monthEarnings = Number(dashboard?.totalEarnings ?? earnings?.totalEarnings) || 0;
  const earningsCurrency = earnings?.currency || 'EUR';

  const activeAssignments = assignments.filter(
    (a) => (a?.status || '').toUpperCase() !== 'COMPLETED' && (a?.status || '').toUpperCase() !== 'CANCELLED',
  );

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('subcontractor', 'tabDashboard') || 'Tableau de bord', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'offers', label: t('subcontractor', 'tabOffers') || 'Offres reçues', icon: <Inbox className="h-4 w-4" /> },
    { key: 'assignments', label: t('subcontractor', 'tabAssignments') || 'Mes missions', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'earnings', label: t('subcontractor', 'tabEarnings') || 'Gains', icon: <Wallet className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {t('subcontractor', 'portalTitle') || 'Portail sous-traitant'}
        </h1>
        <p className="text-muted-foreground">
          {t('subcontractor', 'portalSubtitle') ||
            'Suivez vos offres, vos missions et vos gains.'}
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <Button size="sm" onClick={loadAll}>
              {t('common', 'retry') || 'Retry'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(item.key)}
            className="gap-2"
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>

      {/* ---------------- Dashboard ---------------- */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label={t('subcontractor', 'kpiPendingOffers') || 'Offres en attente'}
              value={pendingOffersCount}
            />
            <KpiCard
              label={t('subcontractor', 'kpiActive') || 'Missions en cours'}
              value={activeCount}
            />
            <KpiCard
              label={t('subcontractor', 'kpiCompleted') || 'Terminées'}
              value={completedCount}
            />
            <KpiCard
              label={t('subcontractor', 'kpiEarnings') || 'Gains du mois'}
              value={formatMoney(monthEarnings, earningsCurrency)}
            />
          </div>

          {/* Missions en cours */}
          <Card className="rounded-2xl border-[#EDEDED]">
            <CardHeader>
              <CardTitle className="text-lg">
                {t('subcontractor', 'activeMissions') || 'Missions en cours'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAssignments.length === 0 ? (
                <EmptyState
                  text={t('subcontractor', 'noActiveMissions') || 'Aucune mission en cours.'}
                />
              ) : (
                <div className="space-y-3">
                  {activeAssignments.map((a) => (
                    <AssignmentRow
                      key={a?.id}
                      assignment={a}
                      busy={actionId === a?.id}
                      onProgress={handleProgress}
                      onComplete={handleComplete}
                      onFormatDate={formatDate}
                      onFormatMoney={formatMoney}
                      statusVariant={ASSIGNMENT_STATUS_VARIANT}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- Offers ---------------- */}
      {tab === 'offers' && (
        <Card className="rounded-2xl border-[#EDEDED]">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('subcontractor', 'receivedOffers') || 'Offres reçues'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {offers.length === 0 ? (
              <EmptyState text={t('subcontractor', 'noOffers') || 'Aucune offre reçue.'} />
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const status = (offer?.status || 'PENDING').toUpperCase();
                  const isPending = status === 'PENDING';
                  const busy = actionId === offer?.id;
                  const contractorName =
                    offer?.contractor?.companyName ||
                    [offer?.contractor?.firstName, offer?.contractor?.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    offer?.contractor?.email ||
                    (t('subcontractor', 'contractor') || 'Donneur d\'ordre');
                  return (
                    <div
                      key={offer?.id}
                      className="p-4 border border-[#EDEDED] rounded-2xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold text-foreground truncate">
                              {offer?.mission?.title ||
                                (t('subcontractor', 'untitledMission') || 'Mission')}
                            </h4>
                            <Badge variant={OFFER_STATUS_VARIANT[status] || 'secondary'}>
                              {t('subcontractor', `offerStatus_${status}`) || status}
                            </Badge>
                          </div>
                          {offer?.mission?.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {offer.mission.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {contractorName}
                            </span>
                            {offer?.mission?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {offer.mission.city}
                              </span>
                            )}
                            {offer?.mission?.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(offer.mission.scheduledAt)}
                              </span>
                            )}
                          </div>
                          {offer?.message && (
                            <p className="mt-2 text-sm text-muted-foreground italic">
                              &laquo; {offer.message} &raquo;
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-foreground">
                            {formatMoney(offer?.amount, offer?.currency)}
                          </div>
                        </div>
                      </div>
                      {isPending && (
                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => handleDecline(offer?.id)}
                          >
                            {t('subcontractor', 'decline') || 'Refuser'}
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => handleAccept(offer?.id)}
                          >
                            {t('subcontractor', 'accept') || 'Accepter'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------- Assignments ---------------- */}
      {tab === 'assignments' && (
        <Card className="rounded-2xl border-[#EDEDED]">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('subcontractor', 'myMissions') || 'Mes missions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <EmptyState text={t('subcontractor', 'noMissions') || 'Aucune mission.'} />
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <AssignmentRow
                    key={a?.id}
                    assignment={a}
                    busy={actionId === a?.id}
                    onProgress={handleProgress}
                    onComplete={handleComplete}
                    onFormatDate={formatDate}
                    onFormatMoney={formatMoney}
                    statusVariant={ASSIGNMENT_STATUS_VARIANT}
                    t={t}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------- Earnings ---------------- */}
      {tab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label={t('subcontractor', 'totalEarnings') || 'Gains totaux'}
              value={formatMoney(earnings?.totalEarnings, earningsCurrency)}
            />
            <KpiCard
              label={t('subcontractor', 'paidEarnings') || 'Versés'}
              value={formatMoney(earnings?.paidEarnings, earningsCurrency)}
            />
            <KpiCard
              label={t('subcontractor', 'pendingEarnings') || 'En attente'}
              value={formatMoney(earnings?.pendingEarnings, earningsCurrency)}
            />
          </div>

          <Card className="rounded-2xl border-[#EDEDED]">
            <CardHeader>
              <CardTitle className="text-lg">
                {t('subcontractor', 'earningsHistory') || 'Historique des gains'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!earnings?.items || earnings.items.length === 0 ? (
                <EmptyState
                  text={t('subcontractor', 'noEarnings') || 'Aucun gain enregistré.'}
                />
              ) : (
                <div className="space-y-2">
                  {earnings.items.map((item, idx) => {
                    const status = (item?.status || '').toUpperCase();
                    return (
                      <div
                        key={item?.id || idx}
                        className="flex items-center justify-between p-3 border border-[#EDEDED] rounded-2xl"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {formatMoney(item?.amount, earningsCurrency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(item?.createdAt)}
                          </div>
                        </div>
                        {status && (
                          <Badge
                            variant={
                              status === 'PAID' ? 'success' : status === 'PENDING' ? 'warning' : 'secondary'
                            }
                          >
                            {t('subcontractor', `earningStatus_${status}`) || status}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-[#EDEDED]">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground text-sm">{text}</div>
  );
}

function AssignmentRow({
  assignment,
  busy,
  onProgress,
  onComplete,
  onFormatDate,
  onFormatMoney,
  statusVariant,
  t,
}: {
  assignment: SubcontractorAssignment;
  busy: boolean;
  onProgress: (id: string, progress: number) => void;
  onComplete: (id: string) => void;
  onFormatDate: (d?: string) => string;
  onFormatMoney: (a?: number, c?: string) => string;
  statusVariant: Record<string, BadgeVariant>;
  t: (ns: string, key: string) => string;
}) {
  const a = assignment || ({} as SubcontractorAssignment);
  const status = (a?.status || 'PENDING').toUpperCase();
  const progress = Math.min(100, Math.max(0, Number(a?.progress) || 0));
  const isDone = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';

  return (
    <div className="p-4 border border-[#EDEDED] rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-foreground truncate">
              {a?.mission?.title || (t('subcontractor', 'untitledMission') || 'Mission')}
            </h4>
            <Badge variant={statusVariant[status] || 'secondary'}>
              {t('subcontractor', `assignmentStatus_${status}`) || status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {a?.mission?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {a.mission.city}
              </span>
            )}
            {a?.mission?.scheduledAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {onFormatDate(a.mission.scheduledAt)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-foreground">
            {onFormatMoney(a?.amount, a?.currency)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t('subcontractor', 'progress') || 'Avancement'}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!isDone && !isCancelled && (
        <div className="flex flex-wrap justify-end gap-2 mt-4">
          {[25, 50, 75].map((step) => (
            <Button
              key={step}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onProgress(a?.id, step)}
            >
              {step}%
            </Button>
          ))}
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onComplete(a?.id)}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('subcontractor', 'markCompleted') || 'Marquer terminée'}
          </Button>
        </div>
      )}
    </div>
  );
}
