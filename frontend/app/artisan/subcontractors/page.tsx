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
      setError('Impossible de charger vos sous-traitants');
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
    return full || s.externalName || s.subcontractorUser?.email || s.externalEmail || 'Sous-traitant';
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
      toast({ title: 'Erreur', description: "L'email est requis", variant: 'destructive' });
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
      toast({ title: 'Succès', description: 'Invitation envoyée', variant: 'success' });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteType('COMPANY');
      setInviteCommission(String(COMMISSION_FLOOR_RATE));
      setInviteMessage('');
      loadData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.response?.data?.message || "Échec de l'envoi de l'invitation",
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
        title: 'Erreur',
        description: 'La commission doit être comprise entre 0 et 100 %',
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
      toast({ title: 'Succès', description: 'Sous-traitant mis à jour', variant: 'success' });
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.response?.data?.message || 'Échec de la mise à jour',
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
      toast({ title: 'Erreur', description: 'Choisissez une mission', variant: 'destructive' });
      return;
    }
    const amount = Number(assignAmount);
    if (!assignAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }
    const commission = Number(assignCommission);
    if (!Number.isFinite(commission) || commission < COMMISSION_FLOOR_RATE || commission > 100) {
      toast({
        title: 'Erreur',
        description: `La commission doit être comprise entre ${COMMISSION_FLOOR_RATE} et 100 %`,
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
      toast({ title: 'Succès', description: 'Mission confiée', variant: 'success' });
      setAssignTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.response?.data?.message || 'Échec de la confiance de mission',
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
      toast({ title: 'Succès', description: 'Invitation annulée', variant: 'success' });
      loadData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.response?.data?.message || "Échec de l'annulation",
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
        title: 'Indisponible',
        description: "Ce sous-traitant n'a pas encore de compte plateforme",
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
      toast({ title: 'Envoyé', description: 'Message envoyé', variant: 'success' });
      setContactTarget(null);
      setContactMessage('');
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.response?.data?.message || "Échec de l'envoi",
        variant: 'destructive',
      });
    } finally {
      setSendingContact(false);
    }
  };

  const typeLabel = (type?: SubcontractorType | null): string | null => {
    if (type === 'COMPANY') return 'Société';
    if (type === 'INDIVIDUAL') return 'Indépendant';
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
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
            Mes sous-traitants
          </h1>
          <p className="text-muted-foreground">
            Confiez des missions, suivez l'avancement, gérez la commission de chacun.
          </p>
        </div>
        <Button className="w-full sm:w-auto shrink-0" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Inviter un sous-traitant
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
          <div className="text-xs font-medium opacity-80">Sous-traitants actifs</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display text-2xl font-extrabold text-foreground">
            {kpis?.missionsInProgress ?? 0}
          </div>
          <div className="text-xs font-medium text-muted-foreground">Missions confiées en cours</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display text-2xl font-extrabold text-warning">
            {eur(kpis?.totalOwedNet ?? 0)}
          </div>
          <div className="text-xs font-medium text-muted-foreground">À leur payer (net)</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display text-2xl font-extrabold text-foreground">
            {kpis?.teamAverageRating ? `★ ${kpis.teamAverageRating.toFixed(1)}` : '—'}
          </div>
          <div className="text-xs font-medium text-muted-foreground">Note moyenne équipe</div>
        </div>
      </div>

      {/* Team */}
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold text-foreground">Équipe</h2>
      </div>

      {subs.length === 0 ? (
        <Card className="rounded-2xl border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun sous-traitant pour le moment. Invitez votre premier partenaire.
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
                          {reviews > 0 && <span className="text-xs">· {reviews} avis</span>}
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
                          ● {available ? 'Disponible' : 'En pause'}
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
                        commission · modifier
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      En cours
                      <div className="font-display text-base font-extrabold text-foreground">
                        {st?.inProgress ?? 0}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Terminées
                      <div className="font-display text-base font-extrabold text-foreground">
                        {st?.completed ?? 0}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      À payer
                      <div className="font-display text-base font-extrabold text-warning">
                        {eur(st?.owedNet ?? 0)} net
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Fiabilité
                      <div className="font-display text-base font-extrabold text-foreground">
                        {st?.reliability != null ? `${st.reliability} %` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" disabled={!available} onClick={() => openAssign(sub)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Confier une mission
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDetailTarget(sub)}>
                      <Eye className="mr-1 h-4 w-4" />
                      Voir le détail
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
                      Contacter
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
                        <Badge className="bg-warning/10 text-warning">Invitation envoyée</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {(sub.specialties?.length ?? 0) > 0 && (
                          <span>{sub.specialties!.join(', ')} · </span>
                        )}
                        en attente d'acceptation
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-display text-lg font-extrabold text-foreground">
                        {Number.isFinite(commission) && commission > 0 ? `${commission} %` : '—'}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        commission proposée
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(sub)}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Modifier la commission
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelInvite(sub)}
                    >
                      Annuler
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
              <CardTitle>Inviter un sous-traitant</CardTitle>
              <p className="text-sm text-muted-foreground">
                Il recevra une invitation par email pour rejoindre votre réseau.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email *</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partenaire@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Nom / raison sociale
                </label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Type</label>
                  <select
                    value={inviteType}
                    onChange={(e) => setInviteType(e.target.value as SubcontractorType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="COMPANY">Société</option>
                    <option value="INDIVIDUAL">Indépendant</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Commission par défaut (%)
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
                <label className="mb-1 block text-sm font-medium text-foreground">Message</label>
                <Input
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
                  Annuler
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer l'invitation
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
              <CardTitle>Modifier {displayName(editTarget)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Type et commission par défaut appliqués aux prochaines missions.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as SubcontractorType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="COMPANY">Société</option>
                  <option value="INDIVIDUAL">Indépendant</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Commission par défaut (%)
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
                  Minimum {COMMISSION_FLOOR_RATE} % (plancher plateforme) à l'attribution.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>
                  Annuler
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
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
              <CardTitle>Confier une mission</CardTitle>
              <p className="text-sm text-muted-foreground">à {displayName(assignTarget)}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Mission à confier *
                </label>
                <select
                  value={assignMissionId}
                  onChange={(e) => onSelectMission(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choisir une mission...</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {(m?.title || 'Mission') +
                        (m?.city ? ` — ${m.city}` : '') +
                        (m?.status ? ` (${m.status})` : '')}
                    </option>
                  ))}
                </select>
                {missions.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Aucune mission disponible</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Montant convenu (brut) *
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
                    Commission plateforme (%) *
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
                  Le sous-traitant percevra{' '}
                  <b>{eur(netOf(Number(assignAmount), Number(assignCommission)))} net</b> (
                  {eur(Number(assignAmount))} − {Number(assignCommission) || COMMISSION_FLOOR_RATE} %).
                  Versé à la clôture de la mission.
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Note (rôle)</label>
                <Input
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assigning}>
                  Annuler
                </Button>
                <Button onClick={handleCreateAssignment} disabled={assigning}>
                  {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confier la mission
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
                {detailAssignments.length} mission(s) confiée(s)
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailAssignments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune mission confiée pour le moment.
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
                            {a.mission?.title || 'Mission'}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {eur(amount)} brut · {net > 0 ? `${eur(net)} net` : '—'} · {rate || COMMISSION_FLOOR_RATE} %
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
                            {a.paymentStatus === 'PAID' ? 'Payé' : 'À payer'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setDetailTarget(null)}>
                  Fermer
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
              <CardTitle>Contacter {displayName(contactTarget)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Message envoyé via la messagerie de la plateforme.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
                placeholder="Votre message..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setContactTarget(null)}
                  disabled={sendingContact}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSendContact}
                  disabled={sendingContact || !contactMessage.trim()}
                >
                  {sendingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
