'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { missionsApi } from '@/lib/api/missions';
import {
  subcontractorApi,
  Subcontractor,
  SubcontractorAssignment,
  SubcontractorOverview,
  SubcontractorType,
  COMMISSION_FLOOR_RATE,
} from '@/lib/api/subcontractor';
import {
  Loader2,
  Plus,
  Star,
  Users,
  Eye,
  MessageSquare,
  Pencil,
  Wallet,
  ClipboardList,
} from 'lucide-react';

interface MissionOption {
  id: string;
  title?: string;
  status?: string;
  city?: string;
  finalPrice?: number | string | null;
  [key: string]: any;
}

/** Net réellement perçu par le sous-traitant = brut − commission (plancher plateforme). */
const netOf = (amount: number, rate: number): number => {
  const r = Math.max(Number.isFinite(rate) ? rate : 0, COMMISSION_FLOOR_RATE);
  return Math.max(0, Math.round((amount - (amount * r) / 100) * 100) / 100);
};

const eur = (n: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n))} €`;

export default function SubcontractorsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [overview, setOverview] = useState<SubcontractorOverview | null>(null);
  const [assignments, setAssignments] = useState<SubcontractorAssignment[]>([]);
  const [missions, setMissions] = useState<MissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteType, setInviteType] = useState<SubcontractorType>('COMPANY');
  const [inviteCommission, setInviteCommission] = useState(String(COMMISSION_FLOOR_RATE));
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  // Assign mission modal.
  const [assignTarget, setAssignTarget] = useState<Subcontractor | null>(null);
  const [assignMissionId, setAssignMissionId] = useState('');
  const [assignAmount, setAssignAmount] = useState('');
  const [assignCommission, setAssignCommission] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Edit commission / type modal.
  const [editTarget, setEditTarget] = useState<Subcontractor | null>(null);
  const [editType, setEditType] = useState<SubcontractorType>('COMPANY');
  const [editCommission, setEditCommission] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Detail modal.
  const [detailTarget, setDetailTarget] = useState<Subcontractor | null>(null);

  // Contact modal.
  const [contactTarget, setContactTarget] = useState<Subcontractor | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, assigns] = await Promise.all([
        subcontractorApi.manage.getOverview().catch(() => null),
        subcontractorApi.manage.listAssignments().catch(() => []),
      ]);
      setOverview(ov);
      setAssignments(Array.isArray(assigns) ? assigns : []);
    } catch (err) {
      console.error('Error loading subcontractors:', err);
      setError(t('subcontractor', 'manageLoadError') || 'Impossible de charger vos sous-traitants');
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    try {
      const data = await missionsApi.getAll();
      setMissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading missions:', err);
      setMissions([]);
    }
  };

  const displayName = (s?: Subcontractor | null): string => {
    if (!s) return '';
    if (s.externalCompany) return s.externalCompany;
    const first = s.firstName || s.subcontractorUser?.firstName || '';
    const last = s.lastName || s.subcontractorUser?.lastName || '';
    const full = `${first} ${last}`.trim();
    return (
      full ||
      s.externalName ||
      s.subcontractorUser?.email ||
      s.externalEmail ||
      t('subcontractor', 'subcontractorFallback') ||
      'Sous-traitant'
    );
  };

  const initials = (s?: Subcontractor | null): string =>
    displayName(s).slice(0, 1).toUpperCase() || '?';

  const contactUserId = (s?: Subcontractor | null): string | undefined =>
    s?.subcontractorUser?.id || s?.subcontractorUserId || undefined;

  const subs = overview?.subcontractors ?? [];
  const activeSubs = subs.filter((s) => s.status === 'ACTIVE' || s.status === 'INACTIVE');
  const pendingSubs = subs.filter((s) => s.status === 'PENDING_INVITATION');

  // ---------------------------------------------------------------- Invite
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('subcontractor', 'emailRequired') || "L'email est requis",
        variant: 'destructive',
      });
      return;
    }
    const commission = Number(inviteCommission);
    setInviting(true);
    try {
      await subcontractorApi.manage.invite({
        externalEmail: inviteEmail.trim(),
        externalName: inviteName.trim() || undefined,
        subcontractorType: inviteType,
        defaultCommissionRate:
          Number.isFinite(commission) && commission >= 0 ? commission : undefined,
        notes: inviteMessage.trim() || undefined,
      });
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'invitationSent') || 'Invitation envoyée',
        variant: 'success',
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteType('COMPANY');
      setInviteCommission(String(COMMISSION_FLOOR_RATE));
      setInviteMessage('');
      loadData();
    } catch (err: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'inviteError') ||
          "Échec de l'envoi de l'invitation",
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  // ------------------------------------------------------------- Edit commission
  const openEdit = (sub: Subcontractor) => {
    setEditTarget(sub);
    setEditType((sub.subcontractorType as SubcontractorType) || 'COMPANY');
    const rate = Number(sub.defaultCommissionRate);
    setEditCommission(Number.isFinite(rate) && rate > 0 ? String(rate) : String(COMMISSION_FLOOR_RATE));
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const commission = Number(editCommission);
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'commissionRange0to100') ||
          'La commission doit être comprise entre 0 et 100 %',
        variant: 'destructive',
      });
      return;
    }
    setSavingEdit(true);
    try {
      await subcontractorApi.manage.updateSubcontractor(editTarget.id, {
        subcontractorType: editType,
        defaultCommissionRate: commission,
      });
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'subUpdated') || 'Sous-traitant mis à jour',
        variant: 'success',
      });
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'updateError') ||
          'Échec de la mise à jour',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // -------------------------------------------------------------- Assign mission
  const openAssign = (sub: Subcontractor) => {
    setAssignTarget(sub);
    setAssignMissionId('');
    setAssignAmount('');
    const subDefault = Number(sub.defaultCommissionRate);
    const seed =
      Number.isFinite(subDefault) && subDefault >= COMMISSION_FLOOR_RATE
        ? subDefault
        : COMMISSION_FLOOR_RATE;
    setAssignCommission(String(seed));
    setAssignNotes('');
    if (missions.length === 0) loadMissions();
  };

  const onSelectMission = (id: string) => {
    setAssignMissionId(id);
    const m = missions.find((x) => x.id === id);
    const price = Number(m?.finalPrice);
    if (Number.isFinite(price) && price > 0) setAssignAmount(String(price));
  };

  const handleCreateAssignment = async () => {
    if (!assignTarget) return;
    if (!assignMissionId) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('subcontractor', 'chooseMission') || 'Choisissez une mission',
        variant: 'destructive',
      });
      return;
    }
    const amount = Number(assignAmount);
    if (!assignAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('subcontractor', 'invalidAmount') || 'Montant invalide',
        variant: 'destructive',
      });
      return;
    }
    const commission = Number(assignCommission);
    if (!Number.isFinite(commission) || commission < COMMISSION_FLOOR_RATE || commission > 100) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description: `${t('subcontractor', 'commissionMustBeBetween') || 'La commission doit être comprise entre'} ${COMMISSION_FLOOR_RATE} ${t('subcontractor', 'and100') || 'et 100 %'}`,
        variant: 'destructive',
      });
      return;
    }
    setAssigning(true);
    try {
      await subcontractorApi.manage.createAssignment({
        subcontractorId: assignTarget.id,
        missionId: assignMissionId,
        agreedAmount: amount,
        commissionRate: commission,
        description: assignNotes.trim() || undefined,
      });
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'missionAssigned') || 'Mission confiée',
        variant: 'success',
      });
      setAssignTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'assignError') ||
          'Échec de la confiance de mission',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  // --------------------------------------------------------------- Terminate
  const handleCancelInvite = async (sub: Subcontractor) => {
    try {
      await subcontractorApi.manage.terminate(sub.id);
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'invitationCancelled') || 'Invitation annulée',
        variant: 'success',
      });
      loadData();
    } catch (err: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'cancelError') ||
          "Échec de l'annulation",
        variant: 'destructive',
      });
    }
  };

  // ---------------------------------------------------------------- Contact
  const handleSendContact = async () => {
    if (!contactTarget) return;
    const userId = contactUserId(contactTarget);
    if (!userId) {
      toast({
        title: t('subcontractor', 'unavailableTitle') || 'Indisponible',
        description:
          t('subcontractor', 'noPlatformAccount') ||
          "Ce sous-traitant n'a pas encore de compte plateforme",
        variant: 'destructive',
      });
      return;
    }
    if (!contactMessage.trim()) return;
    setSendingContact(true);
    try {
      await subcontractorApi.manage.contactSubcontractor({
        userId,
        content: contactMessage.trim(),
      });
      toast({
        title: t('subcontractor', 'sentTitle') || 'Envoyé',
        description: t('subcontractor', 'messageSent') || 'Message envoyé',
        variant: 'success',
      });
      setContactTarget(null);
      setContactMessage('');
    } catch (err: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          err?.response?.data?.message || t('subcontractor', 'sendError') || "Échec de l'envoi",
        variant: 'destructive',
      });
    } finally {
      setSendingContact(false);
    }
  };

  const typeLabel = (type?: SubcontractorType | null): string | null => {
    if (type === 'COMPANY') return t('subcontractor', 'typeCompany') || 'Société';
    if (type === 'INDIVIDUAL') return t('subcontractor', 'typeIndividual') || 'Indépendant';
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common', 'loading') || 'Chargement...'}
        </div>
      </div>
    );
  }

  const kpis = overview?.kpis;

  // Attributions du sous-traitant ouvert dans la modale de détail.
  const detailAssignments = detailTarget
    ? assignments.filter((a) => a.subcontractorId === detailTarget.id)
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t('subcontractor', 'manageTitle') || 'Mes sous-traitants'}
          </h1>
          <p className="text-muted-foreground">
            {t('subcontractor', 'manageSubtitle') ||
              "Confiez des missions, suivez l'avancement, gérez la commission de chacun."}
          </p>
        </div>
        <Button className="w-full sm:w-auto shrink-0" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('subcontractor', 'inviteButton') || 'Inviter un sous-traitant'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <div className="font-display text-2xl font-extrabold">
            {kpis?.activeSubcontractors ?? 0}
          </div>
          <div className="text-xs font-medium opacity-80">
            {t('subcontractor', 'kpiActiveSubs') || 'Sous-traitants actifs'}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display text-2xl font-extrabold text-foreground">
            {kpis?.missionsInProgress ?? 0}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {t('subcontractor', 'kpiMissionsInProgress') || 'Missions confiées en cours'}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display text-2xl font-extrabold text-warning">
            {eur(kpis?.totalOwedNet ?? 0)}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {t('subcontractor', 'kpiToPayNet') || 'À leur payer (net)'}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display text-2xl font-extrabold text-foreground">
            {kpis?.teamAverageRating ? `★ ${kpis.teamAverageRating.toFixed(1)}` : '—'}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {t('subcontractor', 'kpiTeamRating') || 'Note moyenne équipe'}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold text-foreground">
          {t('subcontractor', 'team') || 'Équipe'}
        </h2>
      </div>

      {subs.length === 0 ? (
        <Card className="rounded-2xl border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('subcontractor', 'emptyTeam') ||
              'Aucun sous-traitant pour le moment. Invitez votre premier partenaire.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Active / inactive subcontractors */}
          {activeSubs.map((sub) => {
            const st = sub.stats;
            const rating = st?.averageRating ?? (Number(sub.averageRating) || 0);
            const reviews = st?.reviews ?? 0;
            const available = sub.status === 'ACTIVE';
            const commission = Number(sub.defaultCommissionRate);
            return (
              <Card key={sub.id} className="rounded-2xl border-border">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary font-display text-lg font-extrabold text-primary-foreground shrink-0">
                      {initials(sub)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-extrabold text-foreground">
                          {displayName(sub)}
                        </span>
                        {typeLabel(sub.subcontractorType) && (
                          <Badge
                            className={
                              sub.subcontractorType === 'COMPANY'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {typeLabel(sub.subcontractorType)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-warning" />
                          {rating > 0 ? rating.toFixed(1) : '—'}
                          {reviews > 0 && (
                            <span className="text-xs">
                              · {reviews} {t('subcontractor', 'reviews') || 'avis'}
                            </span>
                          )}
                        </span>
                        {(sub.specialties?.length ?? 0) > 0 && (
                          <span>· {sub.specialties!.join(', ')}</span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            available
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          ● {available
                            ? t('subcontractor', 'available') || 'Disponible'
                            : t('subcontractor', 'paused') || 'En pause'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-display text-lg font-extrabold text-foreground">
                        {Number.isFinite(commission) && commission > 0 ? `${commission} %` : '—'}
                      </div>
                      <button
                        onClick={() => openEdit(sub)}
                        className="text-xs font-medium text-muted-foreground underline hover:text-foreground"
                      >
                        {t('subcontractor', 'commissionEdit') || 'commission · modifier'}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('subcontractor', 'statInProgress') || 'En cours'}
                      <div className="font-display text-base font-extrabold text-foreground">
                        {st?.inProgress ?? 0}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('subcontractor', 'kpiCompleted') || 'Terminées'}
                      <div className="font-display text-base font-extrabold text-foreground">
                        {st?.completed ?? 0}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('subcontractor', 'toPay') || 'À payer'}
                      <div className="font-display text-base font-extrabold text-warning">
                        {eur(st?.owedNet ?? 0)} {t('subcontractor', 'net') || 'net'}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('subcontractor', 'statReliability') || 'Fiabilité'}
                      <div className="font-display text-base font-extrabold text-foreground">
                        {st?.reliability != null ? `${st.reliability} %` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" disabled={!available} onClick={() => openAssign(sub)}>
                      <Plus className="mr-1 h-4 w-4" />
                      {t('subcontractor', 'assignMission') || 'Confier une mission'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDetailTarget(sub)}>
                      <Eye className="mr-1 h-4 w-4" />
                      {t('subcontractor', 'viewDetail') || 'Voir le détail'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!contactUserId(sub)}
                      onClick={() => {
                        setContactTarget(sub);
                        setContactMessage('');
                      }}
                    >
                      <MessageSquare className="mr-1 h-4 w-4" />
                      {t('subcontractor', 'contact') || 'Contacter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pending invitations */}
          {pendingSubs.map((sub) => {
            const commission = Number(sub.defaultCommissionRate);
            return (
              <Card key={sub.id} className="rounded-2xl border-border opacity-90">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted font-display text-lg font-extrabold text-muted-foreground shrink-0">
                      {initials(sub)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-extrabold text-foreground">
                          {displayName(sub)}
                        </span>
                        {typeLabel(sub.subcontractorType) && (
                          <Badge
                            className={
                              sub.subcontractorType === 'COMPANY'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {typeLabel(sub.subcontractorType)}
                          </Badge>
                        )}
                        <Badge className="bg-warning/10 text-warning">
                          {t('subcontractor', 'invitationSentBadge') || 'Invitation envoyée'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {(sub.specialties?.length ?? 0) > 0 && (
                          <span>{sub.specialties!.join(', ')} · </span>
                        )}
                        {t('subcontractor', 'awaitingAcceptance') || "en attente d'acceptation"}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-display text-lg font-extrabold text-foreground">
                        {Number.isFinite(commission) && commission > 0 ? `${commission} %` : '—'}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {t('subcontractor', 'proposedCommissionLabel') || 'commission proposée'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(sub)}>
                      <Pencil className="mr-1 h-4 w-4" />
                      {t('subcontractor', 'editCommission') || 'Modifier la commission'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelInvite(sub)}
                    >
                      {t('common', 'cancel') || 'Annuler'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------------- Invite modal ---------------- */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg rounded-2xl border-border">
            <CardHeader>
              <CardTitle>{t('subcontractor', 'inviteButton') || 'Inviter un sous-traitant'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('subcontractor', 'inviteModalDesc') ||
                  'Il recevra une invitation par email pour rejoindre votre réseau.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'emailLabel') || 'Email'} *
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partenaire@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'nameOrCompany') || 'Nom / raison sociale'}
                </label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t('subcontractor', 'optional') || 'Optionnel'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {t('subcontractor', 'type') || 'Type'}
                  </label>
                  <select
                    value={inviteType}
                    onChange={(e) => setInviteType(e.target.value as SubcontractorType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="COMPANY">{t('subcontractor', 'typeCompany') || 'Société'}</option>
                    <option value="INDIVIDUAL">{t('subcontractor', 'typeIndividual') || 'Indépendant'}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {t('subcontractor', 'defaultCommission') || 'Commission par défaut (%)'}
                  </label>
                  <Input
                    type="number"
                    min={COMMISSION_FLOOR_RATE}
                    max={100}
                    step={0.5}
                    value={inviteCommission}
                    onChange={(e) => setInviteCommission(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'messageLabel') || 'Message'}
                </label>
                <Input
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={t('subcontractor', 'optional') || 'Optionnel'}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
                  {t('common', 'cancel') || 'Annuler'}
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('subcontractor', 'sendInvitation') || "Envoyer l'invitation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- Edit commission modal ---------------- */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle>
                {t('subcontractor', 'edit') || 'Modifier'} {displayName(editTarget)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('subcontractor', 'editModalDesc') ||
                  'Type et commission par défaut appliqués aux prochaines missions.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'type') || 'Type'}
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as SubcontractorType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="COMPANY">{t('subcontractor', 'typeCompany') || 'Société'}</option>
                  <option value="INDIVIDUAL">{t('subcontractor', 'typeIndividual') || 'Indépendant'}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'defaultCommission') || 'Commission par défaut (%)'}
                </label>
                <Input
                  type="number"
                  min={COMMISSION_FLOOR_RATE}
                  max={100}
                  step={0.5}
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('subcontractor', 'minCommissionPrefix') || 'Minimum'} {COMMISSION_FLOOR_RATE}{' '}
                  {t('subcontractor', 'minCommissionSuffix') || "% (plancher plateforme) à l'attribution."}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>
                  {t('common', 'cancel') || 'Annuler'}
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common', 'save') || 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- Assign mission modal ---------------- */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg rounded-2xl border-border">
            <CardHeader>
              <CardTitle>{t('subcontractor', 'assignMission') || 'Confier une mission'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('subcontractor', 'toRecipient') || 'à'} {displayName(assignTarget)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'missionToAssign') || 'Mission à confier'} *
                </label>
                <select
                  value={assignMissionId}
                  onChange={(e) => onSelectMission(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('subcontractor', 'chooseMissionOption') || 'Choisir une mission...'}</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {(m?.title || t('subcontractor', 'untitledMission') || 'Mission') +
                        (m?.city ? ` — ${m.city}` : '') +
                        (m?.status ? ` (${m.status})` : '')}
                    </option>
                  ))}
                </select>
                {missions.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('subcontractor', 'noMissionAvailable') || 'Aucune mission disponible'}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {t('subcontractor', 'agreedAmountGross') || 'Montant convenu (brut)'} *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={assignAmount}
                    onChange={(e) => setAssignAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {t('subcontractor', 'platformCommission') || 'Commission plateforme (%)'} *
                  </label>
                  <Input
                    type="number"
                    min={COMMISSION_FLOOR_RATE}
                    max={100}
                    step={0.5}
                    value={assignCommission}
                    onChange={(e) => setAssignCommission(e.target.value)}
                  />
                </div>
              </div>
              {/* Net preview */}
              {Number(assignAmount) > 0 && (
                <div className="rounded-xl bg-success/10 px-3 py-3 text-sm font-medium text-success">
                  <Wallet className="mr-1 inline h-4 w-4" />
                  {t('subcontractor', 'subWillReceive') || 'Le sous-traitant percevra'}{' '}
                  <b>
                    {eur(netOf(Number(assignAmount), Number(assignCommission)))}{' '}
                    {t('subcontractor', 'net') || 'net'}
                  </b>{' '}
                  ({eur(Number(assignAmount))} − {Number(assignCommission) || COMMISSION_FLOOR_RATE} %).{' '}
                  {t('subcontractor', 'paidAtClosure') || 'Versé à la clôture de la mission.'}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'noteRole') || 'Note (rôle)'}
                </label>
                <Input
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder={t('subcontractor', 'optional') || 'Optionnel'}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assigning}>
                  {t('common', 'cancel') || 'Annuler'}
                </Button>
                <Button onClick={handleCreateAssignment} disabled={assigning}>
                  {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('subcontractor', 'assignMissionCta') || 'Confier la mission'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- Detail modal ---------------- */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl rounded-2xl border-border max-h-[85vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {displayName(detailTarget)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {detailAssignments.length}{' '}
                {t('subcontractor', 'missionsAssignedCount') || 'mission(s) confiée(s)'}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailAssignments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t('subcontractor', 'noMissionsAssigned') || 'Aucune mission confiée pour le moment.'}
                </div>
              ) : (
                detailAssignments.map((a) => {
                  const amount = Number(a.amount) || 0;
                  const rate = Number(a.commissionRate) || 0;
                  const net = netOf(amount, rate);
                  return (
                    <div key={a.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground">
                            {a.mission?.title || t('subcontractor', 'untitledMission') || 'Mission'}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {eur(amount)} {t('subcontractor', 'gross') || 'brut'} ·{' '}
                            {net > 0 ? `${eur(net)} ${t('subcontractor', 'net') || 'net'}` : '—'} ·{' '}
                            {rate || COMMISSION_FLOOR_RATE} %
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-muted text-muted-foreground">{a.status || '—'}</Badge>
                          <Badge
                            className={
                              a.paymentStatus === 'PAID'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }
                          >
                            {a.paymentStatus === 'PAID'
                              ? t('subcontractor', 'paid') || 'Payé'
                              : t('subcontractor', 'toPay') || 'À payer'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setDetailTarget(null)}>
                  {t('common', 'close') || 'Fermer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- Contact modal ---------------- */}
      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle>
                {t('subcontractor', 'contact') || 'Contacter'} {displayName(contactTarget)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('subcontractor', 'contactModalDesc') ||
                  'Message envoyé via la messagerie de la plateforme.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
                placeholder={t('subcontractor', 'yourMessagePlaceholder') || 'Votre message...'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setContactTarget(null)}
                  disabled={sendingContact}
                >
                  {t('common', 'cancel') || 'Annuler'}
                </Button>
                <Button
                  onClick={handleSendContact}
                  disabled={sendingContact || !contactMessage.trim()}
                >
                  {sendingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common', 'send') || 'Envoyer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
