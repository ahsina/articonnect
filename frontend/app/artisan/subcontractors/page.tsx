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
  COMMISSION_FLOOR_RATE,
} from '@/lib/api/subcontractor';
import { Loader2, Plus, Star, Users, ClipboardList } from 'lucide-react';

interface MissionOption {
  id: string;
  title?: string;
  status?: string;
  city?: string;
  [key: string]: any;
}

const SUB_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_INVITATION: 'bg-amber-100 text-amber-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
};

const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export default function SubcontractorsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assignments, setAssignments] = useState<SubcontractorAssignment[]>([]);
  const [missions, setMissions] = useState<MissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompany, setInviteCompany] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  // Assign mission modal state.
  const [assignTarget, setAssignTarget] = useState<Subcontractor | null>(null);
  const [assignMissionId, setAssignMissionId] = useState('');
  const [assignAmount, setAssignAmount] = useState('');
  const [assignCommission, setAssignCommission] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, assigns] = await Promise.all([
        subcontractorApi.manage.listSubcontractors().catch(() => []),
        subcontractorApi.manage.listAssignments().catch(() => []),
      ]);
      setSubcontractors(Array.isArray(subs) ? subs : []);
      setAssignments(Array.isArray(assigns) ? assigns : []);
    } catch (err) {
      console.error('Error loading subcontractors:', err);
      setError(t('subcontractor', 'loadError') || 'Failed to load subcontractors');
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
    if (s.companyName) return s.companyName;
    const first = s.firstName || s.user?.firstName || '';
    const last = s.lastName || s.user?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || s.email || s.user?.email || (t('subcontractor', 'unnamed') || 'Subcontractor');
  };

  const subById = (id?: string): Subcontractor | undefined =>
    subcontractors.find((s) => s.id === id);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'emailRequired') || 'Email is required',
        variant: 'destructive',
      });
      return;
    }
    setInviting(true);
    try {
      // Noms de champs alignés sur le DTO backend réel (externalEmail / externalCompany / notes).
      await subcontractorApi.manage.invite({
        externalEmail: inviteEmail.trim(),
        externalCompany: inviteCompany.trim() || undefined,
        notes: inviteMessage.trim() || undefined,
      });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('subcontractor', 'inviteSent') || 'Invitation sent',
        variant: 'success',
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteCompany('');
      setInviteMessage('');
      loadData();
    } catch (err: any) {
      console.error('Error inviting subcontractor:', err);
      toast({
        title: t('common', 'error') || 'Error',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'inviteError') ||
          'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const openAssign = (sub: Subcontractor) => {
    setAssignTarget(sub);
    setAssignMissionId('');
    setAssignAmount('');
    // Taux de commission par défaut : celui négocié avec ce sous-traitant s'il est
    // défini, sinon le plancher plateforme. Jamais sous le plancher (le back rejette < 5 %).
    const subDefault = Number((sub as any)?.defaultCommissionRate);
    const seed = Number.isFinite(subDefault) && subDefault >= COMMISSION_FLOOR_RATE
      ? subDefault
      : COMMISSION_FLOOR_RATE;
    setAssignCommission(String(seed));
    setAssignNotes('');
    if (missions.length === 0) loadMissions();
  };

  const handleCreateAssignment = async () => {
    if (!assignTarget) return;
    if (!assignMissionId) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'missionRequired') || 'Please select a mission',
        variant: 'destructive',
      });
      return;
    }
    // Le back exige `agreedAmount` (>= 0) : le montant est obligatoire.
    const amount = Number(assignAmount);
    if (!assignAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('subcontractor', 'amountRequired') || 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }
    // Le back exige `commissionRate` (0-100, plancher plateforme 5 %).
    const commission = Number(assignCommission);
    if (!Number.isFinite(commission) || commission < COMMISSION_FLOOR_RATE || commission > 100) {
      toast({
        title: t('common', 'error') || 'Error',
        description:
          (t('subcontractor', 'commissionInvalid') ||
            'Commission rate must be between {min} and 100%').replace(
            '{min}',
            String(COMMISSION_FLOOR_RATE),
          ),
        variant: 'destructive',
      });
      return;
    }
    setAssigning(true);
    try {
      // Champs alignés sur le DTO backend : agreedAmount + commissionRate (requis),
      // description (note libre). PAS amount / notes (→ 400 forbidNonWhitelisted).
      await subcontractorApi.manage.createAssignment({
        subcontractorId: assignTarget.id,
        missionId: assignMissionId,
        agreedAmount: amount,
        commissionRate: commission,
        description: assignNotes.trim() || undefined,
      });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('subcontractor', 'assignmentCreated') || 'Mission assigned',
        variant: 'success',
      });
      setAssignTarget(null);
      loadData();
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      toast({
        title: t('common', 'error') || 'Error',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'assignmentError') ||
          'Failed to assign mission',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleTrack = async (assignment: SubcontractorAssignment) => {
    // Suivi léger : incrémente l'avancement de 25% (borné à 100).
    const current = Number(assignment?.progress) || 0;
    const next = Math.min(100, current + 25);
    try {
      await subcontractorApi.manage.updateAssignment(assignment.id, { progress: next });
      toast({
        title: t('common', 'success') || 'Success',
        description:
          (t('subcontractor', 'progressUpdated') || 'Progress updated to') + ` ${next}%`,
        variant: 'success',
      });
      loadData();
    } catch (err: any) {
      console.error('Error updating assignment:', err);
      toast({
        title: t('common', 'error') || 'Error',
        description:
          err?.response?.data?.message ||
          t('subcontractor', 'progressError') ||
          'Failed to update progress',
        variant: 'destructive',
      });
    }
  };

  const subStatusLabel = (status?: string): string => {
    if (status === 'ACTIVE') return t('subcontractor', 'statusActive') || 'Active';
    if (status === 'PENDING_INVITATION' || status === 'PENDING')
      return t('subcontractor', 'statusPending') || 'Pending';
    if (status === 'INACTIVE') return t('subcontractor', 'statusInactive') || 'Inactive';
    return status || (t('subcontractor', 'statusPending') || 'Pending');
  };

  const assignmentStatusLabel = (status?: string): string => {
    switch (status) {
      case 'PENDING':
        return t('subcontractor', 'assignPending') || 'Pending';
      case 'IN_PROGRESS':
        return t('subcontractor', 'assignInProgress') || 'In progress';
      case 'COMPLETED':
        return t('subcontractor', 'assignCompleted') || 'Completed';
      case 'CANCELLED':
        return t('subcontractor', 'assignCancelled') || 'Cancelled';
      default:
        return status || (t('subcontractor', 'assignPending') || 'Pending');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common', 'loading') || 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('subcontractor', 'title') || 'My subcontractors'}
          </h1>
          <p className="text-muted-foreground">
            {t('subcontractor', 'subtitle') ||
              'Invite trusted partners and delegate missions'}
          </p>
        </div>
        <Button className="w-full sm:w-auto shrink-0" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('subcontractor', 'invite') || 'Invite a subcontractor'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-[#EDEDED] bg-white p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Subcontractors grid */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">
            {t('subcontractor', 'listTitle') || 'Subcontractors'}
          </h2>
        </div>

        {subcontractors.length === 0 ? (
          <Card className="rounded-2xl border-[#EDEDED]">
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('subcontractor', 'emptyList') ||
                'No subcontractors yet. Invite your first partner.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subcontractors.map((sub) => {
              const rating = Number(sub?.averageRating) || 0;
              const reviews = Number(sub?.totalReviews) || 0;
              const jobs = Number(sub?.totalAssignments) || 0;
              const isActive = sub?.status === 'ACTIVE';
              return (
                <Card key={sub.id} className="rounded-2xl border-[#EDEDED]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-foreground">
                          {displayName(sub).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground leading-tight">
                            {displayName(sub)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sub?.email || sub?.user?.email || ''}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={SUB_STATUS_COLORS[sub?.status || ''] || 'bg-gray-100 text-gray-600'}
                      >
                        {subStatusLabel(sub?.status)}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        {rating > 0 ? rating.toFixed(1) : '—'}
                        {reviews > 0 && <span className="text-xs">({reviews})</span>}
                      </span>
                      <span>
                        {jobs} {t('subcontractor', 'jobs') || 'missions'}
                      </span>
                    </div>

                    <Button
                      className="mt-4 w-full"
                      disabled={!isActive}
                      onClick={() => openAssign(sub)}
                    >
                      {t('subcontractor', 'assignMission') || 'Assign a mission'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignments section */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">
            {t('subcontractor', 'assignmentsTitle') || 'Delegated missions'}
          </h2>
        </div>

        <Card className="rounded-2xl border-[#EDEDED]">
          <CardContent className="p-5">
            {assignments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t('subcontractor', 'emptyAssignments') || 'No delegated missions yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const sub = a?.subcontractor || subById(a?.subcontractorId);
                  const progress = Math.min(100, Math.max(0, Number(a?.progress) || 0));
                  const amount = Number(a?.amount) || 0;
                  const done = a?.status === 'COMPLETED' || a?.status === 'CANCELLED';
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[#EDEDED] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate font-semibold text-foreground">
                              {a?.mission?.title ||
                                t('subcontractor', 'untitledMission') ||
                                'Mission'}
                            </h4>
                            <Badge
                              className={
                                ASSIGNMENT_STATUS_COLORS[a?.status || ''] ||
                                'bg-gray-100 text-gray-600'
                              }
                            >
                              {assignmentStatusLabel(a?.status)}
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {t('subcontractor', 'delegatedTo') || 'Delegated to'}:{' '}
                            {displayName(sub) || '—'}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                            {a?.mission?.city && <span>{a.mission.city}</span>}
                            {amount > 0 && (
                              <span className="font-medium text-green-600">{amount}€</span>
                            )}
                            <span>{progress}%</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-foreground transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={done}
                          onClick={() => handleTrack(a)}
                        >
                          {t('subcontractor', 'track') || 'Track'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-lg rounded-2xl border-[#EDEDED]">
            <CardHeader>
              <CardTitle>
                {t('subcontractor', 'inviteTitle') || 'Invite a subcontractor'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('subcontractor', 'inviteDesc') ||
                  'They will receive an email invitation to join.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'email') || 'Email'} *
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'companyName') || 'Company name'}
                </label>
                <Input
                  value={inviteCompany}
                  onChange={(e) => setInviteCompany(e.target.value)}
                  placeholder={t('subcontractor', 'optional') || 'Optional'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'message') || 'Message'}
                </label>
                <Input
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={t('subcontractor', 'optional') || 'Optional'}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviting}
                >
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('subcontractor', 'sendInvite') || 'Send invitation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign mission modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-lg rounded-2xl border-[#EDEDED]">
            <CardHeader>
              <CardTitle>
                {t('subcontractor', 'assignMission') || 'Assign a mission'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{displayName(assignTarget)}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'selectMission') || 'Mission'} *
                </label>
                <select
                  value={assignMissionId}
                  onChange={(e) => setAssignMissionId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">
                    {t('subcontractor', 'chooseMission') || 'Choose a mission...'}
                  </option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {(m?.title || t('subcontractor', 'untitledMission') || 'Mission') +
                        (m?.city ? ` — ${m.city}` : '')}
                    </option>
                  ))}
                </select>
                {missions.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('subcontractor', 'noMissionsAvailable') || 'No missions available'}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'amount') || 'Amount (€)'} *
                </label>
                <Input
                  type="number"
                  min={0}
                  value={assignAmount}
                  onChange={(e) => setAssignAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'commissionRate') || 'Platform commission (%)'} *
                </label>
                <Input
                  type="number"
                  min={COMMISSION_FLOOR_RATE}
                  max={100}
                  step={0.5}
                  value={assignCommission}
                  onChange={(e) => setAssignCommission(e.target.value)}
                  placeholder={String(COMMISSION_FLOOR_RATE)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {(t('subcontractor', 'commissionHint') ||
                    'Minimum {min}% (platform floor).').replace(
                    '{min}',
                    String(COMMISSION_FLOOR_RATE),
                  )}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('subcontractor', 'notes') || 'Notes'}
                </label>
                <Input
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder={t('subcontractor', 'optional') || 'Optional'}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAssignTarget(null)}
                  disabled={assigning}
                >
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleCreateAssignment} disabled={assigning}>
                  {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('subcontractor', 'confirmAssign') || 'Assign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
