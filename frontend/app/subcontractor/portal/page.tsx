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
  Phone,
  Mail,
  LogOut,
  Users,
  Star,
  MessageSquare,
  AlertTriangle,
  UserPlus,
  CreditCard,
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
  type PortalRelationship,
  type PortalInvitation,
} from '@/lib/api/subcontractor';

type TabKey = 'dashboard' | 'offers' | 'assignments' | 'earnings';

const OFFER_STATUS_VARIANT: Record<string, BadgeVariant> = {
  ASSIGNED: 'warning', // offre reçue, en attente de réponse
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  ACCEPTED: 'success',
  DECLINED: 'error',
  CANCELLED: 'error',
  EXPIRED: 'secondary',
};

const ASSIGNMENT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  ASSIGNED: 'warning',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

// Libellés FR par défaut des statuts (fallback si i18n absent).
const OFFER_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'À traiter',
  PENDING: 'En attente',
  IN_PROGRESS: 'Acceptée',
  ACCEPTED: 'Acceptée',
  DECLINED: 'Refusée',
  CANCELLED: 'Refusée',
  EXPIRED: 'Expirée',
};

const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'À accepter',
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

// Plancher de commission plateforme (5 %) — cf. lib COMMISSION_FLOOR_RATE.
const COMMISSION_FLOOR = 5;

/** Détail commission d'une offre/mission : convenu, commission, net estimé. */
function commissionBreakdown(amount?: number, rate?: number) {
  const gross = Number(amount) || 0;
  const effectiveRate = Math.max(Number(rate) || 0, COMMISSION_FLOOR);
  const commission = Math.round(gross * effectiveRate) / 100;
  const net = Math.max(0, gross - commission);
  return { gross, effectiveRate, commission, net };
}

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
  const [relationships, setRelationships] = useState<PortalRelationship[]>([]);
  const [invitations, setInvitations] = useState<PortalInvitation[]>([]);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [onboardingBusy, setOnboardingBusy] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, earn, offs, assigns, rels, invs] = await Promise.all([
        subcontractorApi.portal.getDashboard().catch(() => null),
        subcontractorApi.portal.getEarnings().catch(() => null),
        subcontractorApi.portal.getOffers().catch(() => []),
        subcontractorApi.portal.getAssignments().catch(() => []),
        subcontractorApi.portal.listRelationships().catch(() => []),
        subcontractorApi.portal.getInvitations().catch(() => []),
      ]);
      setDashboard(dash);
      setEarnings(earn);
      setOffers(Array.isArray(offs) ? offs : []);
      setAssignments(Array.isArray(assigns) ? assigns : []);
      setRelationships(Array.isArray(rels) ? rels : []);
      setInvitations(Array.isArray(invs) ? invs : []);
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
    // Le back exige un motif de refus ; on le demande (annulable).
    const reason = typeof window !== 'undefined'
      ? window.prompt(
          t('subcontractor', 'declineReasonPrompt') || 'Motif du refus (optionnel) :',
          '',
        )
      : '';
    if (reason === null) return; // annulé
    setActionId(id);
    try {
      await subcontractorApi.portal.declineOffer(id, reason || undefined);
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

  // Noter le donneur d'ordre (notation réciproque) sur une mission terminée.
  const handleRateContractor = async (
    id: string,
    contractorRating: number,
    contractorFeedback?: string,
  ) => {
    if (!id || !contractorRating) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.rateContractor(id, { contractorRating, contractorFeedback });
      toast({
        title: t('common', 'success') || 'Succès',
        description:
          t('subcontractor', 'contractorRated') || "Merci, votre évaluation a été enregistrée.",
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error rating contractor:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'contractorRateError') || "Impossible d'enregistrer votre évaluation.",
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // Ouvrir un recours / signaler un problème (impayé, désaccord) -> ticket support.
  const handleReportIssue = async (a?: SubcontractorAssignment) => {
    if (!a?.id) return;
    const description =
      typeof window !== 'undefined'
        ? window.prompt(
            t('subcontractor', 'reportIssuePrompt') ||
              'Décrivez le problème (impayé, désaccord, litige) :',
            '',
          )
        : '';
    if (description === null) return; // annulé
    if (!description.trim()) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'reportIssueEmpty') || 'Merci de décrire le problème rencontré.',
        variant: 'destructive',
      });
      return;
    }
    setActionId(a.id);
    try {
      const ticket = await subcontractorApi.portal.reportIssue({
        assignmentId: a.id,
        description: description.trim(),
        category: 'DISPUTE',
        missionId: a?.mission?.id || a?.missionId,
      });
      toast({
        title: t('common', 'success') || 'Succès',
        description:
          (t('subcontractor', 'reportIssueSent') || 'Votre recours a été transmis au support.') +
          (ticket?.ticketNumber ? ` (${ticket.ticketNumber})` : ''),
        variant: 'success',
      });
    } catch (e) {
      console.error('Error reporting issue:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'reportIssueError') || "Impossible d'envoyer votre recours.",
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // Contacter le donneur d'ordre in-app (chat existant).
  const handleContactContractor = async (a?: SubcontractorAssignment) => {
    const contractorUserId = a?.contractor?.id;
    if (!a?.id) return;
    if (!contractorUserId) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'contactUnavailable') ||
          "Coordonnées du donneur d'ordre indisponibles pour la messagerie.",
        variant: 'destructive',
      });
      return;
    }
    const content =
      typeof window !== 'undefined'
        ? window.prompt(
            t('subcontractor', 'contactPrompt') || "Votre message au donneur d'ordre :",
            '',
          )
        : '';
    if (content === null) return; // annulé
    if (!content.trim()) return;
    setActionId(a.id);
    try {
      await subcontractorApi.portal.contactContractor({
        contractorUserId,
        content: content.trim(),
        missionId: a?.mission?.id || a?.missionId,
      });
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'messageSent') || 'Message envoyé.',
        variant: 'success',
      });
    } catch (e) {
      console.error('Error contacting contractor:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('subcontractor', 'messageError') || "Impossible d'envoyer le message.",
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // Lancer l'onboarding Stripe Connect (versements). Réutilise l'endpoint artisan existant via
  // subcontractorApi.portal.startStripeOnboarding, puis redirige vers l'URL d'onboarding réelle.
  const handleStartOnboarding = async () => {
    if (onboardingBusy) return;
    setOnboardingBusy(true);
    try {
      const { url } = await subcontractorApi.portal.startStripeOnboarding();
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
        return; // redirection en cours
      }
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'onboardingError') ||
          "Impossible de démarrer la configuration des versements.",
        variant: 'destructive',
      });
    } catch (e) {
      console.error('Error starting Stripe onboarding:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'onboardingError') ||
          "Impossible de démarrer la configuration des versements.",
        variant: 'destructive',
      });
    } finally {
      setOnboardingBusy(false);
    }
  };

  // Basculer sa disponibilité globale (Disponible <-> En pause). Reflète l'état
  // courant renvoyé par le dashboard (available) et recharge après écriture.
  const handleToggleAvailability = async () => {
    if (!dashboard?.isSubcontractor || availabilityBusy) return;
    const next = !(dashboard.available ?? true);
    setAvailabilityBusy(true);
    try {
      await subcontractorApi.portal.setAvailability({ active: next });
      toast({
        title: t('common', 'success') || 'Succès',
        description: next
          ? t('subcontractor', 'nowAvailable') || 'Vous êtes de nouveau disponible.'
          : t('subcontractor', 'nowPaused') || 'Vous êtes en pause : plus de nouvelles offres.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error setting availability:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('subcontractor', 'availabilityError') || 'Impossible de changer votre disponibilité.',
        variant: 'destructive',
      });
    } finally {
      setAvailabilityBusy(false);
    }
  };

  // Quitter définitivement une relation (donneur d'ordre).
  const handleLeaveRelationship = async (subcontractorId?: string, label?: string) => {
    if (!subcontractorId) return;
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        (t('subcontractor', 'leaveConfirm') ||
          'Quitter définitivement cette relation ? Vous ne recevrez plus d\'offres de') +
          ` ${label || 'ce donneur d\'ordre'}.`,
      );
    if (!confirmed) return;
    setActionId(subcontractorId);
    try {
      await subcontractorApi.portal.leaveRelationship({ subcontractorId });
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'relationshipLeft') || 'Vous avez quitté cette relation.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error leaving relationship:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description: t('subcontractor', 'leaveError') || 'Impossible de quitter cette relation.',
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // Accepter une invitation de sous-traitance en attente (in-app, par id).
  const handleAcceptInvitation = async (id?: string) => {
    if (!id) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.acceptInvitation(id);
      toast({
        title: t('common', 'success') || 'Succès',
        description:
          t('subcontractor', 'invitationAccepted') ||
          'Invitation acceptée. Vous êtes désormais partenaire.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error accepting invitation:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'invitationAcceptError') ||
          "Impossible d'accepter cette invitation.",
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // Refuser une invitation de sous-traitance en attente (in-app, par id).
  const handleDeclineInvitation = async (id?: string, label?: string) => {
    if (!id) return;
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        (t('subcontractor', 'invitationDeclineConfirm') ||
          "Refuser l'invitation de") + ` ${label || "ce donneur d'ordre"} ?`,
      );
    if (!confirmed) return;
    setActionId(id);
    try {
      await subcontractorApi.portal.declineInvitation(id);
      toast({
        title: t('common', 'success') || 'Succès',
        description: t('subcontractor', 'invitationDeclined') || 'Invitation refusée.',
        variant: 'success',
      });
      await loadAll();
    } catch (e) {
      console.error('Error declining invitation:', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('subcontractor', 'invitationDeclineError') ||
          "Impossible de refuser cette invitation.",
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  // --- Derived KPIs (tolerant, anti-NaN) ---------------------------------
  // Une offre "à traiter" a le statut back ASSIGNED (ou PENDING en repli).
  const isActionableOffer = (s?: string) => {
    const st = (s || '').toUpperCase();
    return st === 'ASSIGNED' || st === 'PENDING';
  };
  const pendingOffersCount =
    Number(dashboard?.pendingOffers) ||
    offers.filter((o) => isActionableOffer(o?.status)).length ||
    0;
  const activeCount =
    Number(dashboard?.activeAssignments) ||
    assignments.filter((a) => (a?.status || '').toUpperCase() === 'IN_PROGRESS').length ||
    0;
  const completedCount =
    Number(dashboard?.completedAssignments) ||
    assignments.filter((a) => (a?.status || '').toUpperCase() === 'COMPLETED').length ||
    0;
  const earningsCurrency = earnings?.currency || 'EUR';

  // "Missions en cours" du tableau de bord = uniquement IN_PROGRESS
  // (les offres ASSIGNED ne sont pas encore acceptées). On privilégie la liste
  // issue de getAssignments : elle porte le donneur d'ordre + coordonnées
  // (subcontractor.artisan), contrairement à dashboard.currentAssignments.
  const inProgressAssignments = assignments.filter(
    (a) => (a?.status || '').toUpperCase() === 'IN_PROGRESS',
  );
  const activeAssignments =
    inProgressAssignments.length > 0
      ? inProgressAssignments
      : dashboard?.currentAssignments || [];

  const available = dashboard?.available ?? true;

  // Onboarding versements requis : sous-traitant connu du back mais compte Stripe Connect non
  // finalisé (ses gains restent alors en attente de versement). Pilote la bannière CTA.
  const needsOnboarding =
    !!dashboard?.isSubcontractor && dashboard?.stripeOnboarded === false;
  // Gains NET versés (réellement perçus) : on privilégie le net renvoyé par le back, repli sur le brut.
  const netMonthEarnings =
    Number(
      dashboard?.totalNet ??
        dashboard?.totalEarnings ??
        earnings?.paidNet ??
        earnings?.paidEarnings,
    ) || 0;

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t('subcontractor', 'portalTitle') || 'Portail sous-traitant'}
          </h1>
          <p className="text-muted-foreground">
            {t('subcontractor', 'portalSubtitle') ||
              'Suivez vos offres, vos missions et vos gains.'}
          </p>
        </div>

        {/* Toggle disponibilité (Disponible / En pause) */}
        {dashboard?.isSubcontractor && (
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={availabilityBusy}
            aria-pressed={available}
            title={
              available
                ? t('subcontractor', 'availableHint') || 'Cliquez pour vous mettre en pause'
                : t('subcontractor', 'pausedHint') || 'Cliquez pour redevenir disponible'
            }
            className="inline-flex items-center gap-3 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-muted/50 disabled:opacity-60"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                available ? 'bg-green-500' : 'bg-muted-foreground/50'
              }`}
            />
            <span className="text-foreground">
              {available
                ? t('subcontractor', 'available') || 'Disponible'
                : t('subcontractor', 'paused') || 'En pause'}
            </span>
            {/* Piste de bascule visuelle */}
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                available ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  available ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        )}
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

      {/* Bannière onboarding versements (Stripe Connect) — visible tant que le compte n'est pas
          finalisé. Sans elle, les gains du sous-traitant restent bloqués en attente de versement. */}
      {needsOnboarding && (
        <Card className="mb-6 rounded-2xl border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 p-2 text-amber-700">
                <CreditCard className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-foreground">
                  {t('subcontractor', 'onboardingTitle') || 'Configurez vos versements'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('subcontractor', 'onboardingDesc') ||
                    'Pour recevoir vos gains, finalisez la configuration de votre compte de versement. Vos gains sont conservés en attente tant que ce n’est pas fait.'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleStartOnboarding}
              disabled={onboardingBusy}
              className="gap-2 shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              {onboardingBusy
                ? t('common', 'loading') || 'Chargement…'
                : dashboard?.hasStripeAccount
                  ? t('subcontractor', 'onboardingResume') || 'Finaliser mes versements'
                  : t('subcontractor', 'onboardingCta') || 'Configurer mes versements'}
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
          {/* Invitations en attente (visibilité in-app) — n'apparaît que s'il y en a. */}
          {invitations.length > 0 && (
            <Card className="rounded-2xl border-[#EDEDED]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  {t('subcontractor', 'pendingInvitations') || 'Invitations en attente'}
                  <Badge variant="warning">{invitations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((inv) => {
                    const name =
                      inv?.artisanCompany ||
                      inv?.artisanName ||
                      (t('subcontractor', 'contractor') || "Donneur d'ordre");
                    const busy = actionId === inv?.id;
                    return (
                      <div
                        key={inv?.id}
                        className="flex flex-col gap-3 p-4 border border-[#EDEDED] rounded-2xl sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground truncate">
                              {name}
                            </span>
                            {inv?.matchedBy === 'email' && (
                              <Badge variant="outline" className="gap-1">
                                <Mail className="h-3 w-3" />
                                {t('subcontractor', 'invitedByEmail') || 'Par email'}
                              </Badge>
                            )}
                          </div>
                          {inv?.artisanCompany && inv?.artisanName && (
                            <div className="text-sm text-muted-foreground truncate">
                              {inv.artisanName}
                            </div>
                          )}
                          {typeof inv?.defaultCommissionRate === 'number' &&
                            inv.defaultCommissionRate > 0 && (
                              <div className="mt-1 text-sm text-muted-foreground">
                                {t('subcontractor', 'proposedCommission') ||
                                  'Commission proposée'}
                                {` : ${inv.defaultCommissionRate}%`}
                              </div>
                            )}
                          {Array.isArray(inv?.specialties) && inv.specialties.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {inv.specialties.map((s) => (
                                <Badge key={s} variant="outline">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {inv?.notes && (
                            <p className="mt-2 text-sm text-muted-foreground italic">
                              &laquo; {inv.notes} &raquo;
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => handleDeclineInvitation(inv?.id, name)}
                          >
                            {t('subcontractor', 'decline') || 'Refuser'}
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => handleAcceptInvitation(inv?.id)}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {t('subcontractor', 'accept') || 'Accepter'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
              label={t('subcontractor', 'kpiEarnings') || 'Gains nets versés'}
              value={formatMoney(netMonthEarnings, earningsCurrency)}
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
                      onRateContractor={handleRateContractor}
                      onReport={handleReportIssue}
                      onContact={handleContactContractor}
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

          {/* Mes donneurs d'ordre */}
          <Card className="rounded-2xl border-[#EDEDED]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('subcontractor', 'myContractors') || "Mes donneurs d'ordre"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <EmptyState
                  text={
                    t('subcontractor', 'noContractors') ||
                    "Vous n'avez pas encore de donneur d'ordre."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {relationships.map((r) => {
                    const isActive = (r?.status || '').toUpperCase() === 'ACTIVE';
                    const name =
                      r?.artisanCompany ||
                      r?.artisanName ||
                      (t('subcontractor', 'contractor') || "Donneur d'ordre");
                    return (
                      <div
                        key={r?.id}
                        className="flex items-center justify-between gap-3 p-4 border border-[#EDEDED] rounded-2xl"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground truncate">
                              {name}
                            </span>
                            <Badge variant={isActive ? 'success' : 'secondary'}>
                              {isActive
                                ? t('subcontractor', 'relationActive') || 'Disponible'
                                : t('subcontractor', 'relationPaused') || 'En pause'}
                            </Badge>
                          </div>
                          {r?.artisanCompany && r?.artisanName && (
                            <div className="text-sm text-muted-foreground truncate">
                              {r.artisanName}
                            </div>
                          )}
                          {Array.isArray(r?.specialties) && r.specialties.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.specialties.map((s) => (
                                <Badge key={s} variant="outline">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionId === r?.id}
                          onClick={() => handleLeaveRelationship(r?.id, name)}
                          className="gap-2 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-[#EDEDED]"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('subcontractor', 'leaveRelationship') || 'Quitter la relation'}
                        </Button>
                      </div>
                    );
                  })}
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
                  const status = (offer?.status || 'ASSIGNED').toUpperCase();
                  // ASSIGNED = offre reçue à traiter (le back n'utilise pas PENDING).
                  const isActionable = status === 'ASSIGNED' || status === 'PENDING';
                  const busy = actionId === offer?.id;
                  const contractorName =
                    offer?.contractor?.companyName ||
                    [offer?.contractor?.firstName, offer?.contractor?.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    offer?.contractor?.email ||
                    (t('subcontractor', 'contractor') || 'Donneur d\'ordre');
                  const breakdown = commissionBreakdown(offer?.amount, offer?.commissionRate);
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
                              {t('subcontractor', `offerStatus_${status}`) ||
                                OFFER_STATUS_LABEL[status] ||
                                status}
                            </Badge>
                            {offer?.role && (
                              <Badge variant="outline">{offer.role}</Badge>
                            )}
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
                          <div className="text-xs text-muted-foreground">
                            {t('subcontractor', 'agreedAmount') || 'Montant convenu'}
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {formatMoney(offer?.amount, offer?.currency)}
                          </div>
                        </div>
                      </div>

                      {/* Détail commission plateforme + net estimé */}
                      <CommissionInfo
                        breakdown={breakdown}
                        currency={offer?.currency}
                        onFormatMoney={formatMoney}
                        t={t}
                      />

                      {isActionable && (
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
                    onRateContractor={handleRateContractor}
                    onReport={handleReportIssue}
                    onContact={handleContactContractor}
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
              label={t('subcontractor', 'totalNetEarnings') || 'Gains nets totaux'}
              value={formatMoney(
                earnings?.netEarnings ?? earnings?.totalEarnings,
                earningsCurrency,
              )}
            />
            <KpiCard
              label={t('subcontractor', 'paidNetEarnings') || 'Nets versés'}
              value={formatMoney(
                earnings?.paidNet ?? earnings?.paidEarnings,
                earningsCurrency,
              )}
            />
            <KpiCard
              label={t('subcontractor', 'pendingNetEarnings') || 'Nets en attente'}
              value={formatMoney(
                earnings?.pendingNet ?? earnings?.pendingEarnings,
                earningsCurrency,
              )}
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
                          {item?.missionTitle && (
                            <div className="text-sm font-medium text-foreground truncate">
                              {item.missionTitle}
                            </div>
                          )}
                          {/* NET perçu en principal ; montant convenu (brut) en secondaire. */}
                          <div className="text-sm font-semibold text-foreground">
                            {formatMoney(item?.netAmount ?? item?.amount, earningsCurrency)}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              {t('subcontractor', 'net') || 'net'}
                            </span>
                          </div>
                          {item?.netAmount != null &&
                            item?.amount != null &&
                            item.netAmount !== item.amount && (
                              <div className="text-xs text-muted-foreground">
                                {t('subcontractor', 'agreedAmount') || 'Montant convenu'}
                                {` : ${formatMoney(item.amount, earningsCurrency)}`}
                              </div>
                            )}
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

/**
 * Bloc « donneur d'ordre » d'une mission confiée : nom + liens de contact
 * (tel:/mailto:) pour se coordonner directement. Les coordonnées sont fournies
 * par le back (subcontractor.artisan) APRÈS attribution.
 */
function ContractorContact({
  contractor,
  t,
}: {
  contractor?: SubcontractorAssignment['contractor'];
  t: (ns: string, key: string) => string;
}) {
  const c = contractor;
  const name =
    c?.companyName ||
    [c?.firstName, c?.lastName].filter(Boolean).join(' ') ||
    '';
  if (!name && !c?.phone && !c?.email) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-muted/50 border border-[#EDEDED] p-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" />
        {t('subcontractor', 'contractor') || "Donneur d'ordre"} :
        <span className="font-medium text-foreground">
          {name || (t('subcontractor', 'contractor') || "Donneur d'ordre")}
        </span>
      </span>
      {c?.phone && (
        <a
          href={`tel:${c.phone}`}
          className="flex items-center gap-1.5 font-medium text-foreground hover:underline"
        >
          <Phone className="h-3.5 w-3.5" />
          {c.phone}
        </a>
      )}
      {c?.email && (
        <a
          href={`mailto:${c.email}`}
          className="flex items-center gap-1.5 font-medium text-foreground hover:underline"
        >
          <Mail className="h-3.5 w-3.5" />
          {c.email}
        </a>
      )}
    </div>
  );
}

/**
 * Détail de la commission plateforme pour une offre / mission :
 * montant convenu, taux appliqué (plancher 5 %), et net estimé pour le sous-traitant.
 */
function CommissionInfo({
  breakdown,
  currency,
  onFormatMoney,
  t,
}: {
  breakdown: { gross: number; effectiveRate: number; commission: number; net: number };
  currency?: string;
  onFormatMoney: (a?: number, c?: string) => string;
  t: (ns: string, key: string) => string;
}) {
  if (!breakdown || breakdown.gross <= 0) return null;
  return (
    <div className="mt-3 rounded-xl bg-muted/50 border border-[#EDEDED] p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          {t('subcontractor', 'commission') || 'Commission plateforme'}
          {` (${breakdown.effectiveRate}%)`}
        </span>
        <span className="font-medium text-foreground">
          − {onFormatMoney(breakdown.commission, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-muted-foreground">
          {t('subcontractor', 'netEstimated') || 'Net estimé'}
        </span>
        <span className="font-semibold text-foreground">
          {onFormatMoney(breakdown.net, currency)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('subcontractor', 'commissionFloorNote') ||
          'Commission plateforme minimale de 5 %.'}
      </p>
    </div>
  );
}

function AssignmentRow({
  assignment,
  busy,
  onProgress,
  onComplete,
  onRateContractor,
  onReport,
  onContact,
  onFormatDate,
  onFormatMoney,
  statusVariant,
  t,
}: {
  assignment: SubcontractorAssignment;
  busy: boolean;
  onProgress: (id: string, progress: number) => void;
  onComplete: (id: string) => void;
  onRateContractor?: (id: string, rating: number, feedback?: string) => void;
  onReport?: (a: SubcontractorAssignment) => void;
  onContact?: (a: SubcontractorAssignment) => void;
  onFormatDate: (d?: string) => string;
  onFormatMoney: (a?: number, c?: string) => string;
  statusVariant: Record<string, BadgeVariant>;
  t: (ns: string, key: string) => string;
}) {
  const a = assignment || ({} as SubcontractorAssignment);
  const status = (a?.status || 'ASSIGNED').toUpperCase();
  const progress = Math.min(100, Math.max(0, Number(a?.progress) || 0));
  const isDone = status === 'COMPLETED';
  const canWork = status === 'IN_PROGRESS'; // seul l'état IN_PROGRESS accepte progress/complete
  const breakdown = commissionBreakdown(a?.amount, a?.commissionRate);

  return (
    <div className="p-4 border border-[#EDEDED] rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-foreground truncate">
              {a?.mission?.title || (t('subcontractor', 'untitledMission') || 'Mission')}
            </h4>
            <Badge variant={statusVariant[status] || 'secondary'}>
              {t('subcontractor', `assignmentStatus_${status}`) ||
                ASSIGNMENT_STATUS_LABEL[status] ||
                status}
            </Badge>
            {a?.role && <Badge variant="outline">{a.role}</Badge>}
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
          <div className="text-xs text-muted-foreground">
            {t('subcontractor', 'agreedAmount') || 'Montant convenu'}
          </div>
          <div className="text-base font-bold text-foreground">
            {onFormatMoney(a?.amount, a?.currency)}
          </div>
        </div>
      </div>

      {/* Donneur d'ordre + coordonnées (pour se coordonner) */}
      <ContractorContact contractor={a?.contractor} t={t} />

      {/* Détail commission plateforme + net estimé */}
      <CommissionInfo
        breakdown={breakdown}
        currency={a?.currency}
        onFormatMoney={onFormatMoney}
        t={t}
      />

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

      {/* Notation réciproque du donneur d'ordre (missions terminées uniquement) */}
      {isDone && onRateContractor && (
        <ContractorRatingBlock
          assignment={a}
          busy={busy}
          onRateContractor={onRateContractor}
          t={t}
        />
      )}

      {/* Actions transverses : contacter le donneur d'ordre + recours */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {onContact && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onContact(a)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {t('subcontractor', 'contactContractor') || "Contacter le donneur d'ordre"}
          </Button>
        )}
        {onReport && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onReport(a)}
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-[#EDEDED]"
          >
            <AlertTriangle className="h-4 w-4" />
            {t('subcontractor', 'reportIssue') || 'Signaler un problème / recours'}
          </Button>
        )}

        {canWork && (
          <div className="flex flex-wrap justify-end gap-2 ml-auto">
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
    </div>
  );
}

/**
 * Notation RÉCIPROQUE : le sous-traitant évalue le donneur d'ordre (fiabilité, paiement à temps)
 * sur une mission TERMINÉE. Si déjà noté (a.contractorRating), affichage en lecture seule ; sinon
 * sélecteur d'étoiles interactif + commentaire optionnel + envoi. Écrit via POST rate-contractor.
 */
function ContractorRatingBlock({
  assignment,
  busy,
  onRateContractor,
  t,
}: {
  assignment: SubcontractorAssignment;
  busy: boolean;
  onRateContractor: (id: string, rating: number, feedback?: string) => void;
  t: (ns: string, key: string) => string;
}) {
  const a = assignment;
  const existing = Number(a?.contractorRating) || 0;
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);
  const [feedback, setFeedback] = useState('');
  const alreadyRated = existing >= 1;
  const shown = alreadyRated ? existing : hover || selected;

  return (
    <div className="mt-3 rounded-xl bg-muted/50 border border-[#EDEDED] p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
        <Star className="h-4 w-4" />
        {alreadyRated
          ? t('subcontractor', 'contractorRatingGiven') || "Votre évaluation du donneur d'ordre"
          : t('subcontractor', 'rateContractor') || "Noter le donneur d'ordre"}
      </div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={alreadyRated || busy}
            aria-label={`${n}/5`}
            aria-checked={shown === n}
            role="radio"
            onMouseEnter={() => !alreadyRated && setHover(n)}
            onMouseLeave={() => !alreadyRated && setHover(0)}
            onClick={() => !alreadyRated && setSelected(n)}
            className={`p-0.5 transition ${alreadyRated ? 'cursor-default' : 'cursor-pointer'} disabled:opacity-100`}
          >
            <Star
              className={`h-6 w-6 ${
                n <= shown ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
      </div>

      {alreadyRated ? (
        a?.contractorFeedback ? (
          <p className="mt-2 text-sm text-muted-foreground italic">
            &laquo; {a.contractorFeedback} &raquo;
          </p>
        ) : null
      ) : (
        <>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={
              t('subcontractor', 'contractorFeedbackPlaceholder') ||
              'Commentaire (optionnel) : ponctualité, paiement, communication…'
            }
            className="mt-2 w-full rounded-xl border border-[#EDEDED] bg-white p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              disabled={busy || selected < 1}
              onClick={() => onRateContractor(a?.id, selected, feedback.trim() || undefined)}
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              {t('subcontractor', 'submitRating') || "Envoyer l'évaluation"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
