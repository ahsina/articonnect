'use client';

import { CategoryLabel } from '@/components/shared/CategoryLabel';
import { MapPin, Star, ShieldCheck, Clock, Phone, Truck, Check, MessageSquare, Lock } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { missionsApi } from '@/lib/api/missions';
import apiClient from '@/lib/api/client';
import { userApi } from '@/lib/api/user';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateMissionStatus, translateOfferStatus } from '@/lib/utils/enum-translations';

// Mini-carte de localisation, chargée côté client uniquement (Leaflet ne supporte pas le SSR).
const MissionMap = dynamic(() => import('@/components/shared/MissionMap').then((m) => m.MissionMap), { ssr: false });

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  status: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  clientBudget?: number;
  agreedPrice?: number;
  depositAmount?: number;
  totalAmount?: number;
  scheduledFor?: string;
  createdAt: string;
  acceptedAt?: string;
  depositPaidAt?: string;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  validatedAt?: string;
  autoValidatedAt?: string;
  cancelledAt?: string;
  retractionExpiresAt?: string;
  // Photos
  beforePhotos?: string[];
  afterPhotos?: string[];
  // B2B fields
  purchaseOrderNumber?: string;
  internalReference?: string;
  billingCompanyName?: string;
  billingAddress?: string;
  billingVatNumber?: string;
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    artisanProfile?: {
      companyName: string;
      rating?: number | string;
      reviewCount?: number;
    };
  };
  review?: {
    id: string;
    rating: number;
    comment: string;
  };
}

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
}

type OfferStatus = 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// Événement de suivi renvoyé par GET /missions/:id/tracking (historique horodaté).
interface TrackingEvent {
  id: string;
  status: string;
  changedByRole?: string;
  note?: string | null;
  createdAt: string;
}
interface TrackingData {
  currentStatus?: string;
  timeline?: TrackingEvent[];
  milestones?: Record<string, string | null>;
}

interface Negotiation {
  id: string;
  status?: OfferStatus;
  proposedPrice: number | string;
  laborCost?: number | string | null;
  materialCost?: number | string | null;
  travelCost?: number | string | null;
  availability?: string | null;
  estimatedDuration?: string | null;
  message?: string | null;
  senderId: string;
  receiverId: string;
  accepted?: boolean | null;
  rejectedReason?: string | null;
  expiresAt?: string | null;
  viewedAt?: string | null;
  createdAt: string;
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    reputationScore?: number;
    artisanProfile?: {
      companyName?: string;
      rating?: number | string;
      reviewCount?: number;
      businessVerified?: boolean;
    } | null;
  };
}

// Parse une valeur Decimal (string) ou numérique en nombre, avec fallback.
const toNum = (v: unknown, fallback = 0): number => {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

// Formatte un prix en euros (entier si rond, sinon 2 décimales), séparateurs FR.
const fmtEur = (v: unknown): string => {
  const n = toNum(v);
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
};

export default function MissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationForm, setNegotiationForm] = useState({
    proposedPrice: '',
    message: '',
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationFees, setCancellationFees] = useState<{
    canCancel: boolean;
    fee: number;
    feePercentage: number;
    reason: string;
    totalRefund?: number;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  // Tri des offres côté client + modales d'acceptation/refus (remplacent confirm/prompt natifs).
  const [offerSort, setOfferSort] = useState<'best' | 'priceAsc' | 'ratingDesc' | 'durationAsc'>('best');
  const [offerToAccept, setOfferToAccept] = useState<Negotiation | null>(null);
  const [offerToReject, setOfferToReject] = useState<Negotiation | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (missionId) {
      loadData();
    }
  }, [missionId]);

  const loadData = async () => {
    try {
      const [missionData, profileData, negotiationsData, userData, trackingData] = await Promise.all([
        missionsApi.getById(missionId),
        userApi.getClientProfile().catch(() => null),
        missionsApi.getNegotiations(missionId).catch(() => []),
        userApi.getProfile().catch(() => null),
        // Historique horodaté (facultatif) : enrichit la timeline si présent, sinon on dérive du statut.
        apiClient.get(`/missions/${missionId}/tracking`).then((r) => r.data).catch(() => null),
      ]);
      setMission(missionData);
      setTracking(trackingData);
      setClientProfile(profileData);
      setNegotiations(negotiationsData || []);
      if (userData?.id) {
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProfessional = clientProfile?.clientType === 'PROFESSIONAL';
  const hasB2BInfo =
    mission?.purchaseOrderNumber ||
    mission?.internalReference ||
    mission?.billingCompanyName;

  const handleShowCancelModal = async () => {
    try {
      // Récupère le barème backend ({cancellationFee, feeRate, basePrice, refundable}) et le mappe
      // vers la forme attendue par le modal ({fee, feePercentage, totalRefund}).
      const raw: any = await missionsApi.getCancellationFees(missionId).catch(() => ({}));
      const fees = {
        canCancel: raw.canCancel ?? true,
        fee: raw.cancellationFee ?? raw.fee ?? 0,
        feePercentage: raw.feeRate != null ? Math.round(raw.feeRate * 100) : (raw.feePercentage ?? 0),
        reason: raw.reason ?? getCancellationFeeReason(),
        totalRefund: raw.refundable ?? raw.totalRefund,
      };
      setCancellationFees(fees);
      setShowCancelModal(true);
    } catch (error) {
      console.error('Error getting cancellation fees:', error);
      setCancellationFees({
        canCancel: true,
        fee: 0,
        feePercentage: 0,
        reason: getCancellationFeeReason(),
      });
      setShowCancelModal(true);
    }
  };

  const getCancellationFeeReason = () => {
    if (!mission) return '';
    switch (mission.status) {
      case 'PENDING':
        return t('cancellation', 'freeCancelPending') || 'Annulation gratuite - Mission non encore acceptée';
      case 'NEGOTIATING':
        return t('cancellation', 'freeCancelNegotiating') || 'Annulation gratuite - Négociation en cours';
      case 'ACCEPTED':
        return t('cancellation', 'feeAccepted') || 'Frais de 10% - Artisan déjà assigné';
      case 'IN_PROGRESS':
        return t('cancellation', 'feeInProgress') || 'Frais de 50% - Travaux commencés';
      case 'PENDING_DEPOSIT':
        return t('cancellation', 'feeDeposit') || 'Frais de 10% - Acompte versé';
      case 'IN_TRANSIT':
        return t('cancellation', 'feeTransit') || 'Frais de 25% - Artisan en déplacement';
      default:
        return '';
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await missionsApi.cancel(missionId, cancelReason);
      toast({
        title: t('common', 'success'),
        description: t('missions', 'missionCancelled') || 'Mission annulée',
      });
      setShowCancelModal(false);
      setCancelReason('');
      loadData();
    } catch (error) {
      console.error('Error cancelling mission:', error);
      toast({
        title: t('common', 'error'),
        description: t('missions', 'cancelError') || 'Erreur lors de l\'annulation',
        variant: 'destructive',
      });
    }
  };

  const handleValidate = async () => {
    if (!confirm(t('validation', 'confirmValidate') || 'Confirmer que le travail est satisfaisant ?')) {
      return;
    }

    try {
      await missionsApi.validate(missionId);
      toast({
        title: t('common', 'success'),
        description: t('validation', 'workValidated') || 'Travail validé avec succès',
      });
      loadData();
      setShowReviewForm(true);
    } catch (error) {
      console.error('Error validating mission:', error);
      toast({
        title: t('common', 'error'),
        description: t('validation', 'validateError') || 'Erreur lors de la validation',
        variant: 'destructive',
      });
    }
  };

  const handleDispute = async () => {
    const reason = prompt(t('validation', 'disputeReason') || 'Décrivez le problème:');
    if (!reason) return;

    try {
      await missionsApi.dispute(missionId, reason);
      toast({
        title: t('common', 'success'),
        description: t('validation', 'disputeCreated') || 'Réclamation enregistrée',
      });
      loadData();
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast({
        title: t('common', 'error'),
        description: t('validation', 'disputeError') || 'Erreur',
        variant: 'destructive',
      });
    }
  };

  const needsValidation = mission &&
    mission.status === 'COMPLETED' &&
    !mission.validatedAt &&
    !mission.autoValidatedAt;

  const handleSubmitNegotiation = async () => {
    if (!negotiationForm.proposedPrice) {
      toast({
        title: t('common', 'error'),
        description: t('negotiations', 'enterPrice') || 'Veuillez entrer un prix',
        variant: 'destructive',
      });
      return;
    }

    setNegotiationLoading(true);
    try {
      await missionsApi.createNegotiation(missionId, {
        missionId,
        proposedPrice: parseFloat(negotiationForm.proposedPrice),
        message: negotiationForm.message || undefined,
      });
      toast({
        title: t('common', 'success'),
        description: t('negotiations', 'offerSent') || 'Offre envoyée',
      });
      setShowNegotiationForm(false);
      setNegotiationForm({ proposedPrice: '', message: '' });
      loadData();
    } catch (error) {
      console.error('Error creating negotiation:', error);
      toast({
        title: t('common', 'error'),
        description: t('negotiations', 'sendError') || 'Erreur lors de l\'envoi',
        variant: 'destructive',
      });
    } finally {
      setNegotiationLoading(false);
    }
  };

  // Confirme l'acceptation depuis la modale de récapitulatif, puis route vers le paiement séquestre.
  const handleConfirmAccept = async () => {
    if (!offerToAccept) return;
    setNegotiationLoading(true);
    try {
      await missionsApi.acceptNegotiation(offerToAccept.id, true);
      toast({
        title: t('common', 'success'),
        description: t('negotiations', 'offerAccepted') || 'Offre acceptée',
      });
      setOfferToAccept(null);
      // On enchaîne directement sur le paiement sécurisé (« Accepter et payer »).
      router.push(`/client/payment/${missionId}`);
    } catch (error) {
      console.error('Error accepting negotiation:', error);
      toast({
        title: t('common', 'error'),
        description: t('negotiations', 'acceptError') || 'Erreur',
        variant: 'destructive',
      });
      setNegotiationLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!offerToReject) return;
    setNegotiationLoading(true);
    try {
      await missionsApi.acceptNegotiation(offerToReject.id, false, rejectReason || undefined);
      toast({
        title: t('common', 'success'),
        description: t('negotiations', 'offerRejected') || 'Offre refusée',
      });
      setOfferToReject(null);
      setRejectReason('');
      loadData();
    } catch (error) {
      console.error('Error rejecting negotiation:', error);
      toast({
        title: t('common', 'error'),
        description: t('negotiations', 'rejectError') || 'Erreur',
        variant: 'destructive',
      });
    } finally {
      setNegotiationLoading(false);
    }
  };

  const isNegotiationExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  const getLastNegotiation = () => {
    if (negotiations.length === 0) return null;
    return negotiations[negotiations.length - 1];
  };

  const canNegotiate = mission &&
    (mission.status === 'PENDING' || mission.status === 'NEGOTIATING') &&
    negotiations.length < 5;

  // Une offre est « actionnable » (acceptable/refusable) si elle vient d'un artisan et n'est ni
  // acceptée/refusée ni expirée. On s'appuie sur le status dérivé par le backend.
  const isActionable = (neg: Negotiation) => {
    if (neg.senderId === currentUserId) return false;
    const st = neg.status;
    if (st) return st === 'SENT' || st === 'VIEWED';
    // Fallback si le status n'est pas renvoyé : en attente et non expirée.
    return (neg.accepted === null || neg.accepted === undefined) && !isNegotiationExpired(neg.expiresAt || undefined);
  };

  // Note de l'artisan (string Decimal possible) pour tri/heuristique ; neutre si absente.
  const ratingOf = (neg: Negotiation) => toNum(neg.sender?.artisanProfile?.rating, 0);
  // Extrait un nombre de jours/heures d'une chaîne libre (« 2 jours », « 48h ») pour trier le délai.
  const durationScore = (neg: Negotiation) => {
    const s = `${neg.estimatedDuration || ''} ${neg.availability || ''}`.toLowerCase();
    const m = s.match(/(\d+([.,]\d+)?)/);
    if (!m) return Number.POSITIVE_INFINITY;
    let n = parseFloat(m[1].replace(',', '.'));
    if (/semaine|week/.test(s)) n *= 7;
    if (/mois|month/.test(s)) n *= 30;
    return n;
  };

  const myOffers = negotiations.filter((n) => n.senderId === currentUserId);
  const artisanOffers = negotiations.filter((n) => n.senderId !== currentUserId);

  // Meilleur rapport prix/note : plus le ratio est bas (prix bas, note haute), mieux c'est.
  // Calculé sur les seules offres actionnables pour ne mettre en avant qu'une offre choisissable.
  const actionableOffers = artisanOffers.filter(isActionable);
  const bestOfferId = (() => {
    if (actionableOffers.length < 2) return null;
    let best: Negotiation | null = null;
    let bestRatio = Number.POSITIVE_INFINITY;
    for (const o of actionableOffers) {
      const ratio = toNum(o.proposedPrice) / Math.max(ratingOf(o), 0.5);
      if (ratio < bestRatio) { bestRatio = ratio; best = o; }
    }
    return best?.id ?? null;
  })();

  const sortedArtisanOffers = [...artisanOffers].sort((a, b) => {
    // Les offres actionnables passent toujours avant celles clôturées/expirées.
    const aAct = isActionable(a) ? 0 : 1;
    const bAct = isActionable(b) ? 0 : 1;
    if (aAct !== bAct) return aAct - bAct;
    switch (offerSort) {
      case 'priceAsc':
        return toNum(a.proposedPrice) - toNum(b.proposedPrice);
      case 'ratingDesc':
        return ratingOf(b) - ratingOf(a);
      case 'durationAsc':
        return durationScore(a) - durationScore(b);
      case 'best':
      default: {
        const ra = toNum(a.proposedPrice) / Math.max(ratingOf(a), 0.5);
        const rb = toNum(b.proposedPrice) / Math.max(ratingOf(b), 0.5);
        return ra - rb;
      }
    }
  });

  // Bouton « Payer » sur le détail : dès qu'un prix est convenu et que la mission n'est pas encore
  // payée / clôturée. C'est la rupture corrigée (le bouton manquait sur le détail).
  const canPay = !!(mission && mission.agreedPrice &&
    ['ACCEPTED', 'PENDING_DEPOSIT', 'NEGOTIATING'].includes(mission.status));

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      NEGOTIATING: 'bg-secondary text-foreground',
      ACCEPTED: 'bg-green-100 text-green-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-primary text-primary-foreground',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={colors[status] || 'bg-muted text-foreground'}>
        {translateMissionStatus(status, t)}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Date courte (jj mois · hh:mm) pour l'horodatage des étapes de suivi.
  const formatShort = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUIVI D'INTERVENTION — dérivation des étapes depuis le statut (13 valeurs) + les
  // timestamps réels de la mission + les événements horodatés de /missions/:id/tracking.
  // ─────────────────────────────────────────────────────────────────────────────
  const trackingEvents = tracking?.timeline ?? [];
  // Timestamp d'un événement du fil de suivi (par statut, optionnellement par rôle acteur).
  const eventTime = (status: string, role?: string): string | undefined =>
    trackingEvents.find((e) => e.status === status && (!role || e.changedByRole === role))?.createdAt;

  const artisanOffersCount = negotiations.filter((n) => n.senderId !== currentUserId).length;
  const firstOfferTime = (() => {
    const times = negotiations
      .filter((n) => n.senderId !== currentUserId)
      .map((n) => n.createdAt)
      .filter(Boolean)
      .sort();
    return times[0];
  })();

  const st = mission?.status ?? '';
  const isCancelled = st === 'CANCELLED' || st === 'CANCELLED_NO_SHOW';
  const isValidated = !!(mission?.validatedAt || mission?.autoValidatedAt);
  const isInTransit = st === 'IN_TRANSIT';
  // Séquestre : payé et pas encore libéré (versé à l'artisan seulement à la validation).
  const isPaidEscrow = ['DEPOSIT_PAID', 'PAID', 'IN_TRANSIT', 'IN_PROGRESS', 'COMPLETED', 'AUTO_VALIDATED', 'DISPUTED'].includes(st);
  const escrowReleased = isValidated;
  const escrowAmount = toNum(mission?.depositAmount ?? mission?.totalAmount ?? mission?.agreedPrice);

  // Décompte d'auto-validation (7 j après la fin des travaux) — réutilise la logique needsValidation.
  const autoValidateDeadline = mission?.completedAt
    ? new Date(new Date(mission.completedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const daysLeftToValidate = autoValidateDeadline
    ? Math.max(0, Math.ceil((autoValidateDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  // Index de l'étape « en cours » (0-based sur les 9 étapes ci-dessous), dérivé du statut.
  const currentStepIndex = (() => {
    switch (st) {
      case 'PENDING':
      case 'NEGOTIATING': return 1;
      case 'ACCEPTED':
      case 'PENDING_DEPOSIT': return 3;
      case 'DEPOSIT_PAID':
      case 'PAID':
      case 'IN_TRANSIT': return 4;
      case 'IN_PROGRESS': return 6;
      case 'COMPLETED': return isValidated ? 8 : 7;
      case 'AUTO_VALIDATED': return 8;
      case 'DISPUTED': return 7;
      default: return 0;
    }
  })();

  // 9 étapes de la timeline verticale, chacune avec son horodatage réel quand il existe.
  const trackingSteps: { label: string; time?: string | null; state: 'done' | 'current' | 'upcoming' }[] =
    mission ? [
      { label: t('tracking', 'stepPublished') || 'Publiée', time: mission.createdAt },
      { label: `${t('tracking', 'stepOffers') || 'Offres reçues'}${artisanOffersCount ? ` (${artisanOffersCount})` : ''}`, time: firstOfferTime },
      { label: t('tracking', 'stepChosen') || 'Artisan choisi', time: mission.acceptedAt || eventTime('ACCEPTED') },
      { label: t('tracking', 'stepPaid') || 'Paiement sécurisé (séquestre)', time: mission.depositPaidAt || eventTime('PAID') || eventTime('DEPOSIT_PAID') },
      { label: t('tracking', 'stepTransit') || 'En route', time: eventTime('IN_TRANSIT') },
      { label: t('tracking', 'stepArrived') || 'Arrivé sur place', time: mission.arrivedAt || eventTime('IN_PROGRESS', 'ARTISAN') },
      { label: t('tracking', 'stepWorking') || 'Intervention en cours', time: mission.startedAt || eventTime('IN_PROGRESS') },
      { label: t('tracking', 'stepCompleted') || 'Terminé — à valider', time: mission.completedAt || eventTime('COMPLETED', 'ARTISAN') },
      { label: t('tracking', 'stepValidated') || 'Validé', time: mission.validatedAt || mission.autoValidatedAt || eventTime('COMPLETED', 'CLIENT') },
    ].map((s, i) => ({
      ...s,
      state: i < currentStepIndex ? 'done' : i === currentStepIndex ? (isValidated ? 'done' : 'current') : 'upcoming',
    })) : [];

  // Nom d'affichage de l'artisan (société sinon prénom/nom) pour le hero « en direct ».
  const artisanDisplayName = mission?.artisan
    ? (mission.artisan.artisanProfile?.companyName ||
       `${mission.artisan.firstName ?? ''} ${mission.artisan.lastName ?? ''}`.trim())
    : '';
  const artisanRating = mission?.artisan?.artisanProfile?.rating != null
    ? toNum(mission.artisan.artisanProfile.rating) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{t('missions', 'notFound') || 'Mission non trouvée'}</div>
      </div>
    );
  }

  if (showReviewForm && mission.artisan) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-3xl mx-auto px-4">
          <ReviewForm
            missionId={missionId}
            artisanName={`${mission.artisan.firstName} ${mission.artisan.lastName}`}
            onSuccess={() => {
              setShowReviewForm(false);
              router.push('/client/dashboard');
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            {t('common', 'back')}
          </Button>
          <p className="mt-1 text-sm text-muted-foreground">
            {mission.title} · Réf {mission.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* HERO « EN DIRECT » — l'artisan est en route vers votre adresse (statut IN_TRANSIT).
            Honnête : pas d'ETA inventé ni de position GPS (le backend n'en fournit pas). */}
        {isInTransit && mission.artisan && (
          <div className="mb-6 overflow-hidden rounded-2xl bg-foreground text-background">
            <div className="flex items-center gap-2 bg-background/10 px-6 py-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
              </span>
              <span className="font-display text-[11px] font-bold uppercase tracking-wider text-background/80">
                {t('tracking', 'liveNow') || 'En direct'}
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-background/15 text-xl font-extrabold">
                  {(artisanDisplayName || 'A').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight">
                    <Truck className="h-5 w-5 flex-shrink-0" strokeWidth={2.2} />
                    <span className="truncate">{artisanDisplayName || (t('missions', 'yourArtisan') || 'Votre artisan')}</span>
                  </div>
                  {artisanRating != null && artisanRating > 0 && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-background/70">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {artisanRating.toFixed(1)}
                      {mission.artisan.artisanProfile?.reviewCount ? ` (${mission.artisan.artisanProfile.reviewCount})` : ''}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 font-display text-xl font-extrabold">
                {t('tracking', 'onTheWayTitle') || 'En route vers votre adresse'}
              </p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-background/70">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {mission.address}, {mission.postalCode} {mission.city}
              </p>
              {mission.scheduledFor && (
                <p className="mt-1 text-sm text-background/70">
                  {t('tracking', 'scheduledFor') || 'Créneau prévu'} : {formatDate(mission.scheduledFor)}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1 bg-background text-foreground hover:bg-background/90"
                  onClick={() => router.push(`/client/messages?userId=${mission.artisan?.id}`)}
                >
                  <MessageSquare className="mr-1.5 h-4 w-4" /> {t('common', 'contact') || 'Contacter'}
                </Button>
                {mission.artisan.phone && (
                  <Button
                    variant="outline"
                    className="flex-1 border-background/30 bg-transparent text-background hover:bg-background/10"
                    onClick={() => window.open(`tel:${mission.artisan?.phone}`)}
                  >
                    <Phone className="mr-1.5 h-4 w-4" /> {t('tracking', 'call') || 'Appeler'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bandeau de statut « à la Uber » (un seul statut, piloté par l'état) */}
        {!isInTransit && (() => {
          const s = mission.status;
          const offers = negotiations.length;
          const artisanName = mission.artisan?.firstName || t('missions', 'yourArtisan') || 'Votre artisan';
          const active =
            ['PENDING', 'NEGOTIATING'].includes(s) ? (offers > 0 ? 2 : 1) :
            ['PENDING_DEPOSIT'].includes(s) ? 3 :
            ['ACCEPTED', 'PAID', 'IN_PROGRESS', 'IN_TRANSIT', 'ARRIVED'].includes(s) ? 4 :
            ['COMPLETED', 'AUTO_VALIDATED', 'VALIDATED'].includes(s) ? 5 :
            s === 'CANCELLED' ? 0 : 1;
          const stepLabels = ['', 'Recherche', 'Offres', 'Paiement', 'Réalisation', 'Validation'];
          let headline = '', sub = '';
          if (s === 'CANCELLED') { headline = t('missions', 'stCancelled') || 'Demande annulée'; sub = t('missions', 'stCancelledSub') || 'Cette demande a été annulée.'; }
          else if (['PENDING', 'NEGOTIATING'].includes(s) && offers === 0) { headline = t('missions', 'stSearching') || 'Recherche d’artisans…'; sub = t('missions', 'stSearchingSub') || 'Votre demande est diffusée aux artisans vérifiés à proximité.'; }
          else if (['PENDING', 'NEGOTIATING'].includes(s)) { headline = `${offers} ${offers > 1 ? (t('missions', 'stOffersPlural') || 'artisans ont répondu') : (t('missions', 'stOffersOne') || 'artisan a répondu')}`; sub = t('missions', 'stOffersSub') || 'Comparez et choisissez — vous ne payez qu’après.'; }
          else if (s === 'PENDING_DEPOSIT') { headline = t('missions', 'stPay') || 'Sécurisez le paiement'; sub = t('missions', 'stPaySub') || 'Votre argent reste sous séquestre jusqu’à la validation des travaux.'; }
          else if (['ACCEPTED', 'PAID'].includes(s)) { headline = `${artisanName} ${t('missions', 'stConfirmed') || 'est confirmé'}`; sub = t('missions', 'stConfirmedSub') || 'Votre artisan va intervenir. Paiement sécurisé sous séquestre.'; }
          else if (['IN_PROGRESS', 'IN_TRANSIT', 'ARRIVED'].includes(s)) { headline = `${artisanName} ${t('missions', 'stInProgress') || 'intervient'}`; sub = t('missions', 'stInProgressSub') || 'Intervention en cours à votre adresse.'; }
          else { headline = t('missions', 'stCompleted') || 'Travaux terminés'; sub = t('missions', 'stCompletedSub') || 'Validez pour libérer le paiement et laisser un avis.'; }
          return (
            <div className="mb-6 rounded-2xl bg-foreground p-6 text-background">
              {active > 0 && <div className="font-display text-[11px] font-bold uppercase tracking-wider text-background/60">{t('missions', 'step') || 'Étape'} {active}/5 · {stepLabels[active]}</div>}
              <h1 className="font-display mt-1.5 text-2xl font-extrabold leading-tight">{headline}</h1>
              <p className="mt-1.5 text-sm text-background/70">{sub}</p>
              {active > 0 && (
                <div className="mt-4 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-1 flex-1 rounded-full ${active >= n ? 'bg-background' : 'bg-background/25'}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Mini-carte de localisation (façon Uber) */}
        {(mission as any).latitude != null && (mission as any).longitude != null && (
          <div className="mb-6">
            <MissionMap lat={(mission as any).latitude} lng={(mission as any).longitude} />
            <p className="mt-2 flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" /> {mission.address}, {mission.postalCode} {mission.city}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* ÉTAT « TERMINÉ — À VALIDER » : la validation prend le dessus (action prioritaire). */}
            {needsValidation && (
              <Card className="border-2 border-foreground overflow-hidden">
                <div className="bg-foreground px-6 py-4 text-background">
                  <div className="font-display text-[11px] font-bold uppercase tracking-wider text-background/60">
                    {t('tracking', 'actionNeeded') || 'Action requise'}
                  </div>
                  <h2 className="font-display mt-1 text-xl font-extrabold">
                    {t('tracking', 'completedTitle') || 'Travaux terminés — à valider'}
                  </h2>
                  <p className="mt-1 text-sm text-background/70">
                    {t('tracking', 'completedSub') || 'Vérifiez le résultat, puis validez pour libérer le paiement à l’artisan.'}
                  </p>
                </div>
                <CardContent className="space-y-4 p-6">
                  {/* Aperçu photos après-travaux */}
                  {mission.afterPhotos && mission.afterPhotos.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">
                        {t('missions', 'afterPhotos') || 'Photos après travaux'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {mission.afterPhotos.slice(0, 3).map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Après ${index + 1}`}
                            className="h-24 w-full cursor-pointer rounded-lg border border-border object-cover transition-opacity hover:opacity-90"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Décompte d'auto-validation (7 j) */}
                  <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      {daysLeftToValidate != null
                        ? (t('tracking', 'autoValidateIn') || 'Sans action de votre part, le travail sera validé automatiquement dans')
                          + ` ${daysLeftToValidate} ` + (daysLeftToValidate > 1 ? (t('tracking', 'days') || 'jours') : (t('tracking', 'day') || 'jour')) + '.'
                        : (t('validation', 'autoValidateWarning') || 'Si vous ne validez pas dans les 7 jours, la mission sera automatiquement validée.')}
                    </span>
                  </div>

                  {/* Réassurance séquestre */}
                  <div className="flex items-start gap-2 rounded-xl bg-green-100/60 p-3 text-sm text-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700" strokeWidth={2} />
                    <span>
                      {t('tracking', 'validateReassurance') ||
                        'Votre paiement reste sous séquestre : il n’est versé qu’une fois que vous validez, et vous êtes remboursé en cas de litige.'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handleValidate} className="flex-1">
                      <Check className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
                      {escrowAmount > 0
                        ? (t('tracking', 'validateAndRelease') || 'Valider le travail') + ` (${t('tracking', 'releases') || 'libère'} ${fmtEur(escrowAmount)})`
                        : (t('validation', 'validateWork') || 'Valider le travail')}
                    </Button>
                    <Button
                      onClick={handleDispute}
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-600 hover:bg-red-100"
                    >
                      {t('validation', 'reportProblem') || 'Signaler un problème'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Détails de la demande — repliés par défaut (façon Uber : le statut prime) */}
            <details className="group rounded-2xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-display text-sm font-bold">
                {t('missions', 'viewRequestDetails') || 'Voir les détails de ma demande'}
                <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="space-y-4 p-4 pt-0">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{t('common', 'description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{mission.description}</p>
              </CardContent>
            </Card>

            {/* Photos Avant/Après - Before/After Photos */}
            {((mission.beforePhotos && mission.beforePhotos.length > 0) ||
              (mission.afterPhotos && mission.afterPhotos.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {t('missions', 'photos') || 'Photos'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Before Photos */}
                  {mission.beforePhotos && mission.beforePhotos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                        {t('missions', 'beforePhotos') || 'Avant travaux'}
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {mission.beforePhotos.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Avant ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* After Photos */}
                  {mission.afterPhotos && mission.afterPhotos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        {t('missions', 'afterPhotos') || 'Après travaux'}
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {mission.afterPhotos.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Après ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparison hint */}
                  {mission.beforePhotos && mission.beforePhotos.length > 0 &&
                    mission.afterPhotos && mission.afterPhotos.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center italic">
                      {t('missions', 'comparePhotosHint') || 'Cliquez sur une photo pour l\'agrandir'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* B2B Info Card - Only shown if B2B data exists */}
            {hasB2BInfo && (
              <Card className="border-primary/20 bg-primary/10/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    {t('missions', 'professionalInfo') || 'Informations professionnelles'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mission.purchaseOrderNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('missions', 'purchaseOrderNumber') || 'N° Bon de commande'}
                      </span>
                      <span className="font-semibold text-primary">
                        {mission.purchaseOrderNumber}
                      </span>
                    </div>
                  )}
                  {mission.internalReference && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('missions', 'internalReference') || 'Référence interne'}
                      </span>
                      <span className="font-semibold text-primary">
                        {mission.internalReference}
                      </span>
                    </div>
                  )}
                  {mission.billingCompanyName && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm text-muted-foreground mb-1">
                        {t('missions', 'billingInfo') || 'Facturation'}
                      </p>
                      <p className="font-semibold">{mission.billingCompanyName}</p>
                      {mission.billingAddress && (
                        <p className="text-sm text-muted-foreground">{mission.billingAddress}</p>
                      )}
                      {mission.billingVatNumber && (
                        <p className="text-sm text-muted-foreground">TVA: {mission.billingVatNumber}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('missions', 'details') || 'Détails de la mission'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('common', 'category')}
                    </p>
                    <p className="text-foreground"><CategoryLabel value={mission.category} /></p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('common', 'type')}</p>
                    <p className="text-foreground">
                      {mission.type === 'EMERGENCY'
                        ? t('missions', 'emergency') || 'Urgence'
                        : t('missions', 'scheduled') || 'Programmée'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('missions', 'clientBudget') || 'Budget client'}
                    </p>
                    <p className="text-foreground font-semibold">
                      {mission.clientBudget ? `${mission.clientBudget}€` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('missions', 'agreedPrice') || 'Prix final'}
                    </p>
                    <p className="text-foreground font-semibold">
                      {mission.agreedPrice ? `${mission.agreedPrice}€` : '-'}
                    </p>
                  </div>
                </div>

                {mission.scheduledFor && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('missions', 'scheduledDate') || 'Date programmée'}
                    </p>
                    <p className="text-foreground">{formatDate(mission.scheduledFor)}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t('common', 'address')}
                  </p>
                  <p className="text-foreground">
                    {mission.address}
                    <br />
                    {mission.postalCode} {mission.city}
                    <br />
                    {mission.country}
                  </p>
                </div>
              </CardContent>
            </Card>
              </div>
            </details>

            {/* Artisan Info */}
            {mission.artisan && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('missions', 'assignedArtisan') || 'Artisan assigné'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
                      {mission.artisan.firstName[0]}
                      {mission.artisan.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">
                        {mission.artisan.firstName} {mission.artisan.lastName}
                      </h3>
                      <p className="text-muted-foreground">{mission.artisan.email}</p>
                      {mission.artisan.artisanProfile && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {mission.artisan.artisanProfile.companyName}
                        </p>
                      )}
                    </div>
                    <Button onClick={() => router.push(`/client/messages?userId=${mission.artisan?.id}`)}>
                      {t('common', 'contact') || 'Contacter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Negotiation Section */}
            {(mission.status === 'PENDING' || mission.status === 'NEGOTIATING' || negotiations.length > 0) && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {t('negotiations', 'priceNegotiation') || 'Négociation du prix'}
                  </CardTitle>
                  <CardDescription>
                    {t('negotiations', 'negotiationDesc') || 'Échangez avec l\'artisan pour convenir d\'un prix'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Budget */}
                  <div className="p-3 bg-background rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {t('missions', 'yourBudget') || 'Votre budget'}
                      </span>
                      <span className="font-semibold text-lg">
                        {mission.clientBudget ? `${mission.clientBudget}€` : '-'}
                      </span>
                    </div>
                    {mission.agreedPrice && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground font-medium">
                          {t('negotiations', 'agreedPrice') || 'Prix convenu'}
                        </span>
                        <span className="font-bold text-lg text-green-600">
                          {mission.agreedPrice}€
                        </span>
                      </div>
                    )}
                  </div>

                  {/* État rassurant : en attente d'offres (crédibilité de l'offre) */}
                  {negotiations.length === 0 && (mission.status === 'PENDING' || mission.status === 'NEGOTIATING') && (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
                      <div className="text-3xl"></div>
                      <p className="mt-2 font-display font-bold text-foreground">
                        {t('negotiations', 'waitingTitle') || 'Votre demande est diffusée aux artisans vérifiés à proximité'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('negotiations', 'waitingDesc') || 'Première réponse en ~15 min en moyenne. Vous serez notifié à chaque offre reçue — vous pourrez alors comparer et choisir.'}
                      </p>
                      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="text-green-600">●</span> Artisans vérifiés</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><span className="text-green-600">●</span> Paiement sécurisé</span>
                      </div>
                    </div>
                  )}

                  {/* Comparaison des offres d'artisans (le client compare et choisit) */}
                  {artisanOffers.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          {artisanOffers.length} {artisanOffers.length > 1
                            ? (t('offers', 'offersToCompare') || 'offres à comparer')
                            : (t('offers', 'offerReceived') || 'offre reçue')}
                        </h4>
                        {/* Tri client-side */}
                        <div className="flex flex-wrap gap-1">
                          {([
                            ['best', t('offers', 'sortBest') || 'Meilleur rapport'],
                            ['priceAsc', t('offers', 'sortPrice') || 'Prix ↑'],
                            ['ratingDesc', t('offers', 'sortRating') || 'Note ↓'],
                            ['durationAsc', t('offers', 'sortDuration') || 'Délai'],
                          ] as const).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setOfferSort(key)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                offerSort === key
                                  ? 'bg-foreground text-background'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {sortedArtisanOffers.map((neg) => {
                          const profile = neg.sender?.artisanProfile;
                          const artisanName = profile?.companyName ||
                            `${neg.sender?.firstName ?? ''} ${neg.sender?.lastName ?? ''}`.trim() ||
                            (t('negotiations', 'artisanOffer') || "Offre de l'artisan");
                          const initial = (profile?.companyName || neg.sender?.firstName || 'A').charAt(0).toUpperCase();
                          const rating = profile?.rating != null ? toNum(profile.rating) : null;
                          const actionable = isActionable(neg);
                          const isBest = neg.id === bestOfferId;
                          const hasBreakdown = neg.laborCost != null || neg.materialCost != null || neg.travelCost != null;
                          const statusLabel = neg.status ? translateOfferStatus(neg.status, t) : null;
                          const statusClass =
                            neg.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                            neg.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            neg.status === 'EXPIRED' ? 'bg-muted text-muted-foreground' :
                            neg.status === 'SENT' ? 'bg-amber-100 text-amber-800' :
                            'bg-secondary text-foreground';

                          return (
                            <div
                              key={neg.id}
                              className={`relative rounded-2xl border bg-card p-4 transition-shadow ${
                                isBest ? 'border-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]' : 'border-border'
                              } ${neg.status === 'ACCEPTED' ? 'ring-2 ring-green-500' : ''} ${
                                neg.status === 'REJECTED' || neg.status === 'EXPIRED' ? 'opacity-60' : ''
                              }`}
                            >
                              {isBest && (
                                <span className="absolute -top-2.5 left-4 rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-bold text-background">
                                  ★ {t('offers', 'bestValue') || 'Meilleur rapport'}
                                </span>
                              )}

                              <div className="flex items-start justify-between gap-3">
                                {/* Artisan */}
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-base font-extrabold text-primary-foreground">
                                    {initial}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 font-display text-sm font-bold leading-tight">
                                      <span className="truncate">{artisanName}</span>
                                      {profile?.businessVerified && (
                                        <span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                          <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                                          {t('offers', 'verified') || 'Vérifié'}
                                        </span>
                                      )}
                                    </div>
                                    {rating != null && rating > 0 && (
                                      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        {rating.toFixed(1)}
                                        {profile?.reviewCount ? ` (${profile.reviewCount} ${t('offers', 'reviews') || 'avis'})` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Statut de l'offre */}
                                {statusLabel && (
                                  <Badge className={`flex-shrink-0 ${statusClass}`}>{statusLabel}</Badge>
                                )}
                              </div>

                              {/* Prix total + ventilation */}
                              <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                  <div className="font-display text-2xl font-extrabold leading-none text-foreground">
                                    {fmtEur(neg.proposedPrice)}
                                  </div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('offers', 'totalPrice') || 'Prix total'}
                                  </div>
                                </div>
                                {/* Disponibilité / délai en pastille */}
                                {(neg.availability || neg.estimatedDuration) && (
                                  <div className="flex flex-col items-end gap-1">
                                    {neg.availability && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-bold text-foreground">
                                        <Clock className="h-3 w-3" /> {neg.availability}
                                      </span>
                                    )}
                                    {neg.estimatedDuration && (
                                      <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                        {t('offers', 'duration') || 'Durée'} : {neg.estimatedDuration}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {hasBreakdown && (
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-3 py-2 text-xs">
                                  {neg.laborCost != null && (
                                    <span className="text-muted-foreground">
                                      {t('offers', 'labor') || "Main d'œuvre"} <span className="font-bold text-foreground">{fmtEur(neg.laborCost)}</span>
                                    </span>
                                  )}
                                  {neg.materialCost != null && (
                                    <span className="text-muted-foreground">
                                      {t('offers', 'material') || 'Matériel'} <span className="font-bold text-foreground">{fmtEur(neg.materialCost)}</span>
                                    </span>
                                  )}
                                  {neg.travelCost != null && (
                                    <span className="text-muted-foreground">
                                      {t('offers', 'travel') || 'Déplacement'} <span className="font-bold text-foreground">{fmtEur(neg.travelCost)}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {neg.message && (
                                <p className="mt-3 text-sm italic text-muted-foreground">« {neg.message} »</p>
                              )}

                              {neg.rejectedReason && (
                                <p className="mt-2 text-sm text-red-600">
                                  {t('negotiations', 'reason') || 'Raison'}: {neg.rejectedReason}
                                </p>
                              )}

                              {neg.status === 'SENT' || neg.status === 'VIEWED' ? (
                                neg.expiresAt && (
                                  <p className="mt-2 text-[11px] text-muted-foreground">
                                    {t('negotiations', 'expiresAt') || 'Expire le'}{' '}
                                    {new Date(neg.expiresAt).toLocaleString('fr-FR')}
                                  </p>
                                )
                              ) : null}

                              {/* Actions */}
                              {actionable && (
                                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                                  <Button
                                    size="sm"
                                    onClick={() => setOfferToAccept(neg)}
                                    disabled={negotiationLoading}
                                    className="flex-1"
                                  >
                                    {t('offers', 'chooseAndPay') || 'Choisir cet artisan'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setRejectReason(''); setOfferToReject(neg); }}
                                    disabled={negotiationLoading}
                                  >
                                    {t('negotiations', 'reject') || 'Refuser'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Rappel des contre-propositions envoyées par le client */}
                  {myOffers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {t('offers', 'yourCounterOffers') || 'Vos contre-propositions'}
                      </h4>
                      {myOffers.map((neg) => (
                        <div key={neg.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                          <span className="text-sm font-bold text-foreground">{fmtEur(neg.proposedPrice)}</span>
                          {neg.message && <span className="mx-2 flex-1 truncate text-xs italic text-muted-foreground">« {neg.message} »</span>}
                          <span className="text-[11px] text-muted-foreground">{new Date(neg.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Counter-offer Form */}
                  {canNegotiate && !showNegotiationForm && (
                    <Button
                      onClick={() => setShowNegotiationForm(true)}
                      variant="outline"
                      className="w-full"
                    >
                      {negotiations.length === 0
                        ? t('negotiations', 'makeOffer') || 'Faire une offre'
                        : t('negotiations', 'counterOffer') || 'Faire une contre-offre'}
                    </Button>
                  )}

                  {showNegotiationForm && (
                    <div className="p-4 bg-background rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('negotiations', 'yourPrice') || 'Votre prix proposé'} (€) *
                        </label>
                        <Input
                          type="number"
                          value={negotiationForm.proposedPrice}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, proposedPrice: e.target.value })
                          }
                          placeholder={mission.clientBudget?.toString() || '0'}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('negotiations', 'message') || 'Message (optionnel)'}
                        </label>
                        <textarea
                          value={negotiationForm.message}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, message: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={2}
                          placeholder={
                            t('negotiations', 'messagePlaceholder') ||
                            'Expliquez votre proposition...'
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSubmitNegotiation}
                          disabled={negotiationLoading}
                          className="flex-1"
                        >
                          {negotiationLoading
                            ? t('common', 'loading') || 'Chargement...'
                            : t('negotiations', 'sendOffer') || 'Envoyer l\'offre'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowNegotiationForm(false)}
                          disabled={negotiationLoading}
                        >
                          {t('common', 'cancel') || 'Annuler'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {negotiations.length >= 5 && (
                    <p className="text-sm text-yellow-600 text-center">
                      {t('negotiations', 'limitReached') ||
                        'Limite de 5 négociations atteinte. Veuillez accepter une offre ou créer une nouvelle mission.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Carte SÉQUESTRE — l'argent est bloqué jusqu'à la validation (rassurance façon Uber). */}
            {isPaidEscrow && escrowAmount > 0 && (
              <Card className={escrowReleased ? 'border-green-200 bg-green-100/40' : 'border-border bg-muted/40'}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {escrowReleased
                      ? <ShieldCheck className="h-4 w-4 flex-shrink-0 text-green-700" strokeWidth={2.2} />
                      : <Lock className="h-4 w-4 flex-shrink-0 text-foreground" strokeWidth={2.2} />}
                    <span className="font-display text-sm font-bold text-foreground">
                      {escrowReleased
                        ? (t('tracking', 'escrowReleasedTitle') || 'Paiement libéré')
                        : (t('tracking', 'escrowHeldTitle') || 'Sous séquestre')}
                    </span>
                  </div>
                  <div className="mt-1 font-display text-2xl font-extrabold text-foreground">{fmtEur(escrowAmount)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {escrowReleased
                      ? (t('tracking', 'escrowReleasedDesc') || 'Versé à l’artisan après votre validation.')
                      : (t('tracking', 'escrowHeldDesc') || 'Versés à l’artisan après validation, remboursables en cas de litige.')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('common', 'actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Paiement séquestre — apparaît dès qu'un prix est convenu (rupture corrigée). */}
                {canPay && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/client/payment/${missionId}`)}
                    >
                      {t('offers', 'payAmount') || 'Payer'} {fmtEur(mission.agreedPrice)}
                    </Button>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                      {t('offers', 'escrowShort') || 'Sous séquestre — versé à l’artisan après validation.'}
                    </p>
                  </>
                )}
                {mission.status === 'PENDING' && (
                  <>
                    <Button className="w-full" variant="outline">
                      {t('common', 'edit') || 'Modifier'}
                    </Button>
                    <Button className="w-full" variant="destructive" onClick={handleShowCancelModal}>
                      {t('missions', 'cancelMission') || 'Annuler la mission'}
                    </Button>
                  </>
                )}

                {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
                  <>
                    {/* La complétion est déclenchée par l'ARTISAN (route ARTISAN-only). Le client
                        validera ensuite le travail via la carte de validation. */}
                    <p className="text-sm text-muted-foreground">
                      {t('missions', 'awaitingArtisanCompletion') ||
                        'En attente de la finalisation par l\'artisan. Vous pourrez valider le travail une fois terminé.'}
                    </p>
                    <Button className="w-full" variant="destructive" onClick={handleShowCancelModal}>
                      {t('missions', 'cancelMission') || 'Annuler la mission'}
                    </Button>
                  </>
                )}

                {mission.status === 'COMPLETED' && mission.validatedAt && !mission.review && (
                  <Button className="w-full" onClick={() => setShowReviewForm(true)}>
                    {t('reviews', 'leaveReview') || 'Laisser un avis'}
                  </Button>
                )}

                {mission.status === 'COMPLETED' && mission.validatedAt && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push('/client/invoices')}
                  >
                    {t('invoices', 'viewInvoice') || 'Voir la facture'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* SUIVI D'INTERVENTION — timeline verticale complète (remplace l'« Historique » à 3 jalons). */}
            <Card>
              <CardHeader>
                <CardTitle>{t('tracking', 'title') || 'Suivi de l’intervention'}</CardTitle>
              </CardHeader>
              <CardContent>
                {isCancelled ? (
                  // Parcours interrompu : on montre la publication puis l'annulation, sans étapes futures.
                  <ol className="space-y-0">
                    <li className="relative flex gap-3 pb-5">
                      <span className="absolute left-[11px] top-6 h-full w-0.5 bg-border" />
                      <span className="z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-display text-sm font-bold text-foreground">{t('tracking', 'stepPublished') || 'Publiée'}</p>
                        <p className="text-xs text-muted-foreground">{formatShort(mission.createdAt)}</p>
                      </div>
                    </li>
                    <li className="relative flex gap-3">
                      <span className="z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">✕</span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-display text-sm font-bold text-red-600">{translateMissionStatus(st, t)}</p>
                        {formatShort(mission.cancelledAt) && (
                          <p className="text-xs text-muted-foreground">{formatShort(mission.cancelledAt)}</p>
                        )}
                      </div>
                    </li>
                  </ol>
                ) : (
                  <ol className="space-y-0">
                    {trackingSteps.map((step, i) => {
                      const isLast = i === trackingSteps.length - 1;
                      const done = step.state === 'done';
                      const current = step.state === 'current';
                      return (
                        <li key={i} className={`relative flex gap-3 ${isLast ? '' : 'pb-5'}`}>
                          {/* Connecteur vertical vers l'étape suivante */}
                          {!isLast && (
                            <span className={`absolute left-[11px] top-6 h-full w-0.5 ${done ? 'bg-foreground' : 'bg-border'}`} />
                          )}
                          {/* Pastille d'état */}
                          <span
                            className={`z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                              done
                                ? 'border-foreground bg-foreground text-background'
                                : current
                                  ? 'border-foreground bg-background text-foreground'
                                  : 'border-border bg-background text-transparent'
                            }`}
                          >
                            {done ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : current ? (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-60" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-foreground" />
                              </span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-border" />
                            )}
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className={`font-display text-sm leading-tight ${current ? 'font-extrabold text-foreground' : done ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                              {step.label}
                              {current && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                                  {t('tracking', 'inProgressBadge') || 'En cours'}
                                </span>
                              )}
                            </p>
                            {step.time && (done || current) && (
                              <p className="text-xs text-muted-foreground">{formatShort(step.time)}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                {t('cancellation', 'cancelMission') || 'Annuler la mission'}
              </CardTitle>
              <CardDescription>
                {t('cancellation', 'cancelWarning') ||
                  'Cette action est irréversible. Veuillez lire les conditions ci-dessous.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fee Information */}
              <div
                className={`p-4 rounded-lg ${
                  (cancellationFees?.fee || 0) > 0
                    ? 'bg-amber-100 border'
                    : 'bg-green-100 border'
                }`}
              >
                <p className="font-medium text-foreground mb-2">
                  {t('cancellation', 'fees') || 'Frais d\'annulation'}
                </p>
                <p
                  className={`text-lg font-bold ${
                    (cancellationFees?.fee || 0) > 0 ? 'text-amber-800' : 'text-green-700'
                  }`}
                >
                  {(cancellationFees?.fee || 0) > 0
                    ? `${cancellationFees?.fee}€ (${cancellationFees?.feePercentage}%)`
                    : t('cancellation', 'noFees') || 'Gratuit'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {cancellationFees?.reason || getCancellationFeeReason()}
                </p>
              </div>

              {/* Fee Details by Status */}
              <div className="text-sm text-muted-foreground bg-background p-3 rounded-lg">
                <p className="font-medium mb-2">
                  {t('cancellation', 'feeSchedule') || 'Barème des frais:'}
                </p>
                <ul className="space-y-1">
                  <li>• {t('cancellation', 'pendingFee') || 'En attente: Gratuit'}</li>
                  <li>• {t('cancellation', 'acceptedFee') || 'Acceptée: 10%'}</li>
                  <li>• {t('cancellation', 'transitFee') || 'Artisan en route: 25%'}</li>
                  <li>• {t('cancellation', 'inProgressFee') || 'En cours: 50%'}</li>
                </ul>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('cancellation', 'reason') || 'Raison de l\'annulation (optionnel)'}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={2}
                  placeholder={
                    t('cancellation', 'reasonPlaceholder') ||
                    'Indiquez la raison de votre annulation...'
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  className="flex-1"
                >
                  {t('common', 'back') || 'Retour'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmCancel}
                  className="flex-1"
                  disabled={cancellationFees?.canCancel === false}
                >
                  {(cancellationFees?.fee || 0) > 0
                    ? `${t('cancellation', 'confirmWithFees') || 'Annuler'} (${cancellationFees?.fee}€)`
                    : t('cancellation', 'confirmFree') || 'Confirmer l\'annulation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modale de récapitulatif d'acceptation d'offre (« Accepter et payer ») */}
      {offerToAccept && (() => {
        const neg = offerToAccept;
        const profile = neg.sender?.artisanProfile;
        const artisanName = profile?.companyName ||
          `${neg.sender?.firstName ?? ''} ${neg.sender?.lastName ?? ''}`.trim() ||
          (t('negotiations', 'artisanOffer') || "l'artisan");
        const hasBreakdown = neg.laborCost != null || neg.materialCost != null || neg.travelCost != null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
              <CardHeader>
                <CardTitle className="font-display">
                  {t('offers', 'confirmChoiceTitle') || 'Confirmer votre choix'}
                </CardTitle>
                <CardDescription>
                  {t('offers', 'confirmChoiceDesc') || 'Vérifiez le récapitulatif avant de sécuriser le paiement.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('offers', 'chosenArtisan') || 'Artisan choisi'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-display font-bold">
                    {artisanName}
                    {profile?.businessVerified && (
                      <ShieldCheck className="h-4 w-4 text-green-600" strokeWidth={2.5} />
                    )}
                  </div>
                  {profile?.rating != null && toNum(profile.rating) > 0 && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {toNum(profile.rating).toFixed(1)}
                      {profile?.reviewCount ? ` (${profile.reviewCount})` : ''}
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-muted p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">{t('offers', 'totalPrice') || 'Prix total'}</span>
                    <span className="font-display text-2xl font-extrabold">{fmtEur(neg.proposedPrice)}</span>
                  </div>
                  {hasBreakdown && (
                    <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                      {neg.laborCost != null && (
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('offers', 'labor') || "Main d'œuvre"}</span><span className="font-semibold">{fmtEur(neg.laborCost)}</span></div>
                      )}
                      {neg.materialCost != null && (
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('offers', 'material') || 'Matériel'}</span><span className="font-semibold">{fmtEur(neg.materialCost)}</span></div>
                      )}
                      {neg.travelCost != null && (
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('offers', 'travel') || 'Déplacement'}</span><span className="font-semibold">{fmtEur(neg.travelCost)}</span></div>
                      )}
                    </div>
                  )}
                  {(neg.availability || neg.estimatedDuration) && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {[neg.availability, neg.estimatedDuration].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                {/* Réassurance séquestre */}
                <div className="flex items-start gap-2 rounded-xl bg-green-100/60 p-3 text-sm text-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700" strokeWidth={2} />
                  <span>
                    {t('offers', 'escrowReassurance') ||
                      'Votre paiement est versé sous séquestre : l’artisan n’est réglé qu’après validation des travaux, et vous êtes remboursé en cas de litige.'}
                  </span>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setOfferToAccept(null)}
                    disabled={negotiationLoading}
                    className="flex-1"
                  >
                    {t('common', 'back') || 'Retour'}
                  </Button>
                  <Button
                    onClick={handleConfirmAccept}
                    disabled={negotiationLoading}
                    className="flex-1"
                  >
                    {negotiationLoading
                      ? (t('common', 'loading') || 'Chargement...')
                      : (t('offers', 'acceptAndPay') || 'Accepter et payer')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Modale de refus d'offre (remplace le prompt natif) */}
      {offerToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="font-display">
                {t('offers', 'rejectTitle') || 'Refuser cette offre'}
              </CardTitle>
              <CardDescription>
                {t('offers', 'rejectDesc') || 'Vous pouvez indiquer une raison (facultatif). Les autres offres restent disponibles.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder={t('negotiations', 'rejectReason') || 'Raison du refus (optionnel)'}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setOfferToReject(null); setRejectReason(''); }}
                  disabled={negotiationLoading}
                  className="flex-1"
                >
                  {t('common', 'back') || 'Retour'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmReject}
                  disabled={negotiationLoading}
                  className="flex-1"
                >
                  {t('negotiations', 'reject') || 'Refuser'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
