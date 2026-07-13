'use client';

import { CategoryLabel } from '@/components/shared/CategoryLabel';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Mini-carte de localisation, chargée côté client uniquement (Leaflet ne supporte pas le SSR).
const MissionMap = dynamic(() => import('@/components/shared/MissionMap').then((m) => m.MissionMap), { ssr: false });
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api/client';
import { translateMissionStatus, translatePriority, translateQuotationStatus, translateEventType, translateOfferStatus } from '@/lib/utils/enum-translations';
import type { OfferStatus } from '@/types/mission';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  budget: number;
  estimatedDuration: number;
  scheduledDate?: string;
  scheduledTime?: string;
  address: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  distance?: number;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };
  artisan?: {
    id: string;
    companyName: string;
    rating: number;
  };
  quotation?: {
    id: string;
    amount: number;
    status: string;
    validUntil: string;
  };
  images?: string[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  notes?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  // Lifecycle timestamps (miroir de suivi) + montants — présents sur GET /missions/:id
  acceptedAt?: string | null;
  depositPaidAt?: string | null;
  arrivedAt?: string | null;
  validatedAt?: string | null;
  autoValidatedAt?: string | null;
  retractionExpiresAt?: string | null;
  agreedPrice?: string | number | null;
  finalPrice?: string | number | null;
  totalAmount?: string | number | null;
  depositPercentage?: number | null;
  vatRate?: string | number | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface Negotiation {
  id: string;
  proposedPrice: number;
  laborCost?: number;
  materialCost?: number;
  travelCost?: number;
  availability?: string | null;
  estimatedDuration?: string | null;
  message?: string;
  senderId: string;
  receiverId: string;
  accepted?: boolean;
  rejectedReason?: string;
  status?: OfferStatus;
  expiresAt?: string;
  viewedAt?: string | null;
  createdAt: string;
}

export default function MissionDetailPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'quotation'>('details');
  const [completionNotes, setCompletionNotes] = useState('');
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationForm, setNegotiationForm] = useState({
    proposedPrice: '',
    laborCost: '',
    materialCost: '',
    travelCost: '',
    availability: '',
    availabilityCustom: '',
    estimatedDuration: '',
    message: '',
  });
  // Offre tout juste envoyée : sert à afficher l'écran de confirmation (statut + expiration réels).
  const [sentOffer, setSentOffer] = useState<Negotiation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  // Somme de la ventilation (main d'œuvre + matériel + déplacement), calculée en direct.
  const ventilationTotal =
    (parseFloat(negotiationForm.laborCost) || 0) +
    (parseFloat(negotiationForm.materialCost) || 0) +
    (parseFloat(negotiationForm.travelCost) || 0);
  // Valeur "availability" envoyée : soit l'option choisie, soit la date personnalisée.
  const resolvedAvailability =
    negotiationForm.availability === '__custom__'
      ? negotiationForm.availabilityCustom
      : negotiationForm.availability;

  useEffect(() => {
    if (missionId) {
      loadMission();
    }
  }, [missionId]);

  const loadMission = async () => {
    try {
      const [missionResponse, timelineResponse, negotiationsResponse, userResponse] = await Promise.all([
        apiClient.get(`/missions/${missionId}`),
        apiClient.get(`/missions/${missionId}/tracking`).catch(() => ({ data: [] })),
        apiClient.get(`/missions/${missionId}/negotiations`).catch(() => ({ data: [] })),
        apiClient.get('/users/profile').catch(() => ({ data: null })),
      ]);
      setMission(missionResponse.data);
      setTimeline(Array.isArray(timelineResponse.data) ? timelineResponse.data : []);
      setNegotiations(Array.isArray(negotiationsResponse.data) ? negotiationsResponse.data : []);
      if (userResponse.data?.id) {
        setCurrentUserId(userResponse.data.id);
        const u = userResponse.data;
        setCurrentUserName(
          u.artisanProfile?.companyName ||
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          '',
        );
      }
    } catch (error) {
      console.error('Error loading mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'missionLoadError') || 'Failed to load mission details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMission = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/accept`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionAccepted') || 'Mission accepted successfully',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error accepting mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'acceptError') || 'Failed to accept mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineMission = async () => {
    if (
      !confirm(t('artisan', 'confirmDecline') || 'Are you sure you want to decline this mission?')
    )
      return;
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/decline`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionDeclined') || 'Mission declined',
        variant: 'success',
      });
      router.push('/artisan/missions');
    } catch (error) {
      console.error('Error declining mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'declineError') || 'Failed to decline mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMission = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/start-travel`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionStarted') || 'Mission started',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error starting mission:', error);
      const backendMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: t('common', 'error') || 'Error',
        description: backendMsg || t('artisan', 'startError') || 'Failed to start mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArriveMission = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/arrive`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionArrived') || 'Arrivée sur place confirmée — le client est notifié',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error marking arrival:', error);
      const backendMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: t('common', 'error') || 'Error',
        description: backendMsg || t('artisan', 'arriveError') || "Impossible de confirmer l'arrivée sur place",
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMission = async () => {
    // Photos après travaux obligatoires : preuve du travail fini (protège l'artisan en cas de litige).
    const hasExistingPhotos = !!(mission?.afterPhotos && mission.afterPhotos.length > 0);
    if (afterPhotos.length === 0 && !hasExistingPhotos) {
      toast({
        title: t('common', 'error') || 'Error',
        description:
          t('tracking', 'photosRequired') ||
          'Ajoutez au moins une photo « après travaux » avant de terminer — elle protège votre paiement.',
        variant: 'destructive',
      });
      setActiveTab('details');
      setTimeout(() => document.getElementById('finalisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return;
    }
    setActionLoading(true);
    try {
      // First upload after photos if any
      if (afterPhotos.length > 0) {
        await apiClient.post(`/missions/${missionId}/photos`, { afterPhotos });
      }
      await apiClient.post(`/missions/${missionId}/complete`, { notes: completionNotes });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionCompleted') || 'Mission marked as completed',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error completing mission:', error);
      const backendMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: t('common', 'error') || 'Error',
        description: backendMsg || t('artisan', 'completeError') || 'Failed to complete mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAfterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('fileType', 'mission-photo');
        const response = await apiClient.post('/upload/file', fd);
        return response.data.url;
      });
      const urls = await Promise.all(uploadPromises);
      setAfterPhotos((prev) => [...prev, ...urls]);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('missions', 'photosUploaded') || 'Photos uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('missions', 'photoUploadError') || 'Error uploading photos',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Negotiation Handlers
  const handleSubmitNegotiation = async () => {
    if (!negotiationForm.proposedPrice) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('negotiations', 'enterPrice') || 'Veuillez entrer un prix',
        variant: 'destructive',
      });
      return;
    }

    setNegotiationLoading(true);
    try {
      const response = await apiClient.post(`/missions/${missionId}/negotiations`, {
        missionId,
        proposedPrice: parseFloat(negotiationForm.proposedPrice),
        laborCost: negotiationForm.laborCost ? parseFloat(negotiationForm.laborCost) : undefined,
        materialCost: negotiationForm.materialCost ? parseFloat(negotiationForm.materialCost) : undefined,
        travelCost: negotiationForm.travelCost ? parseFloat(negotiationForm.travelCost) : undefined,
        availability: resolvedAvailability || undefined,
        estimatedDuration: negotiationForm.estimatedDuration || undefined,
        message: negotiationForm.message || undefined,
      });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('negotiations', 'offerSent') || 'Offre envoyée',
        variant: 'success',
      });
      setShowNegotiationForm(false);
      // Confirmation claire : on garde une trace de l'offre envoyée (statut + expiresAt réels).
      setSentOffer(response.data ?? null);
      setNegotiationForm({
        proposedPrice: '',
        laborCost: '',
        materialCost: '',
        travelCost: '',
        availability: '',
        availabilityCustom: '',
        estimatedDuration: '',
        message: '',
      });
      loadMission();
    } catch (error) {
      console.error('Error creating negotiation:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('negotiations', 'sendError') || 'Erreur lors de l\'envoi',
        variant: 'destructive',
      });
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleAcceptNegotiation = async (negotiationId: string) => {
    if (!confirm(t('negotiations', 'confirmAccept') || 'Accepter cette offre ?')) {
      return;
    }

    setNegotiationLoading(true);
    try {
      await apiClient.put(`/missions/negotiations/${negotiationId}/accept`, { accepted: true });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('negotiations', 'offerAccepted') || 'Offre acceptée',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error accepting negotiation:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('negotiations', 'acceptError') || 'Erreur',
        variant: 'destructive',
      });
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleRejectNegotiation = async (negotiationId: string) => {
    const reason = prompt(t('negotiations', 'rejectReason') || 'Raison du refus (optionnel):');

    setNegotiationLoading(true);
    try {
      await apiClient.put(`/missions/negotiations/${negotiationId}/accept`, {
        accepted: false,
        rejectedReason: reason || undefined,
      });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('negotiations', 'offerRejected') || 'Offre refusée',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error rejecting negotiation:', error);
      toast({
        title: t('common', 'error') || 'Error',
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

  const canNegotiate = mission &&
    (mission.status === 'OPEN' || mission.status === 'ASSIGNED' || mission.status === 'PENDING') &&
    negotiations.length < 5;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      OPEN: 'bg-primary/10 text-primary',
      ASSIGNED: 'bg-purple-100 text-purple-700',
      ACCEPTED: 'bg-primary/15 text-primary',
      IN_PROGRESS: 'bg-amber-100 text-amber-800',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
      DISPUTED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-muted text-foreground';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-muted text-foreground',
      NORMAL: 'bg-primary/10 text-primary',
      HIGH: 'bg-amber-100 text-amber-800',
      URGENT: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('artisan', 'missionNotFound') || 'Mission not found'}</p>
          <Button onClick={() => router.push('/artisan/missions')} className="mt-4">
            {t('common', 'back') || 'Back to Missions'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header minimal */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push('/artisan/missions')}>
          {t('common', 'back') || 'Back'}
        </Button>
        <p className="text-sm text-muted-foreground">
          {mission.title} · <CategoryLabel value={mission.category} />
        </p>
      </div>

      {/* ============================================================================
          COCKPIT « prochaine action » + timeline miroir + net à percevoir.
          Une seule action claire pilotée par mission.status, réutilise les handlers
          existants (accept/decline/start-travel/arrive/complete + upload photos).
          ============================================================================ */}
      {(() => {
        const s = mission.status;
        // Rang de progression (permet de dériver l'état de chaque étape du miroir).
        const rank: Record<string, number> = {
          OPEN: 0, PENDING: 0, NEGOTIATING: 0, ASSIGNED: 0,
          ACCEPTED: 1, PENDING_DEPOSIT: 1,
          PAID: 2, DEPOSIT_PAID: 2,
          IN_TRANSIT: 3,
          ARRIVED: 4, IN_PROGRESS: 4,
          COMPLETED: 5,
          VALIDATED: 6, AUTO_VALIDATED: 6,
        };
        const cur = rank[s] ?? 0;
        const isCancelled = s === 'CANCELLED' || s === 'CANCELLED_NO_SHOW';
        const isDisputed = s === 'DISPUTED';
        const isActiveJob = cur >= 1 && !isCancelled; // relation de travail engagée
        const clientFirst = mission.client?.firstName || '';
        const fmt = (d?: string | null) =>
          d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

        // ---- Net à percevoir (commission plateforme = 10 %, aligné sur le payout live) ----
        const PLATFORM_FEE_RATE = 0.1;
        const grossRaw = mission.agreedPrice ?? mission.finalPrice ?? null;
        const gross = grossRaw != null ? Number(grossRaw) : null;
        const grossValid = gross != null && !Number.isNaN(gross) && gross > 0;
        const netEstimate = grossValid ? Math.round(gross! * (1 - PLATFORM_FEE_RATE) * 100) / 100 : null;

        // ---- Étapes du miroir de suivi (dérivées des timestamps réels) ----
        const steps = [
          { key: 'accepted', label: t('tracking', 'stAccepted') || 'Offre acceptée', at: mission.acceptedAt, threshold: 1 },
          { key: 'paid', label: t('tracking', 'stPaid') || 'Paiement sécurisé', at: mission.depositPaidAt, threshold: 2 },
          { key: 'transit', label: t('tracking', 'stTransit') || 'En route', at: null as string | null | undefined, threshold: 3 },
          { key: 'arrived', label: t('tracking', 'stArrived') || 'Arrivé sur place', at: mission.arrivedAt, threshold: 4 },
          { key: 'progress', label: t('tracking', 'stProgress') || 'Intervention en cours', at: mission.startedAt, threshold: 4 },
          { key: 'done', label: t('tracking', 'stDone') || 'Terminée + photos', at: mission.completedAt, threshold: 5 },
        ];
        const doneCount = steps.filter((st) => cur >= st.threshold).length;
        const frontier = Math.max(0, doneCount - 1); // dernière étape franchie = « vous êtes ici »

        // ---- Carte « prochaine action » : contenu piloté par le statut ----
        type Primary = { label: string; onClick: () => void; disabled?: boolean } | null;
        let title = '';
        let subtitle = '';
        let primary: Primary = null;
        let secondary: Primary = null;
        let waiting = false; // état d'attente (pas de bouton principal)

        const goCompletion = () => {
          setActiveTab('details');
          setTimeout(() => document.getElementById('finalisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        };
        const goOffer = () => {
          setActiveTab('details');
          setTimeout(() => document.getElementById('offre-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        };

        if (s === 'OPEN' || s === 'PENDING' || s === 'NEGOTIATING') {
          title = t('tracking', 'prospectTitle') || 'Décrochez cette mission';
          subtitle = t('tracking', 'prospectSub') || 'Envoyez votre offre — le client compare les offres reçues et choisit.';
          primary = { label: t('tracking', 'btnOffer') || 'Faire une offre', onClick: goOffer };
        } else if (s === 'ASSIGNED') {
          title = t('tracking', 'assignedTitle') || 'Mission proposée';
          subtitle = t('tracking', 'assignedSub') || 'Acceptez pour démarrer, ou déclinez si vous n’êtes pas disponible.';
          primary = { label: t('tracking', 'btnAccept') || 'Accepter la mission', onClick: handleAcceptMission, disabled: actionLoading };
          secondary = { label: t('tracking', 'btnDecline') || 'Décliner', onClick: handleDeclineMission, disabled: actionLoading };
        } else if (s === 'PENDING_DEPOSIT') {
          title = t('tracking', 'awaitPayTitle') || 'En attente du paiement du client';
          subtitle = t('tracking', 'awaitPaySub') || 'Le client doit sécuriser le paiement sur Krafolt avant que vous puissiez vous mettre en route.';
          waiting = true;
        } else if (s === 'ACCEPTED' || s === 'PAID' || s === 'DEPOSIT_PAID') {
          title = t('tracking', 'startTitle') || 'Prêt à intervenir';
          subtitle = clientFirst
            ? `${t('tracking', 'startSubName') || 'Mettez-vous en route vers'} ${clientFirst}. ${t('tracking', 'startSubTail') || 'Le client est prévenu en temps réel.'}`
            : (t('tracking', 'startSub') || 'Mettez-vous en route — le client est prévenu en temps réel.');
          primary = { label: t('tracking', 'btnStart') || 'Démarrer le trajet', onClick: handleStartMission, disabled: actionLoading };
        } else if (s === 'IN_TRANSIT') {
          title = t('tracking', 'transitTitle') || 'En route vers le client';
          subtitle = t('tracking', 'transitSub') || 'Confirmez votre arrivée sur place pour démarrer l’intervention.';
          primary = { label: t('tracking', 'btnArrive') || 'Je suis arrivé sur place', onClick: handleArriveMission, disabled: actionLoading };
        } else if (s === 'IN_PROGRESS' || s === 'ARRIVED') {
          title = t('tracking', 'completeTitle') || 'Intervention en cours';
          subtitle = t('tracking', 'completeSub') || 'Une fois le travail fini : ajoutez les photos « après » (obligatoires) et terminez.';
          primary = { label: t('tracking', 'btnComplete') || 'Terminer l’intervention', onClick: goCompletion };
        } else if (s === 'COMPLETED') {
          title = t('tracking', 'completedTitle') || 'En attente de validation du client';
          const auto = fmt(mission.retractionExpiresAt);
          subtitle = auto
            ? `${t('tracking', 'completedSubAuto') || 'Sans action de sa part, la mission se valide automatiquement le'} ${auto}${t('tracking', 'completedSubTail') || ' — votre paiement est alors libéré.'}`
            : (t('tracking', 'completedSub') || 'Le client valide le travail, puis votre paiement est libéré. Validation automatique sous 48h.');
          waiting = true;
        } else if (s === 'VALIDATED' || s === 'AUTO_VALIDATED') {
          title = t('tracking', 'validatedTitle') || 'Mission validée — paiement libéré';
          subtitle = t('tracking', 'validatedSub') || 'Bravo ! Le montant net vous est versé selon votre calendrier de virements.';
          waiting = true;
        } else if (isDisputed) {
          title = t('tracking', 'disputedTitle') || 'Litige en cours';
          subtitle = t('tracking', 'disputedSub') || 'Notre équipe examine la situation. Répondez aux demandes depuis la messagerie Krafolt.';
          waiting = true;
        } else if (isCancelled) {
          title = t('tracking', 'cancelledTitle') || 'Mission annulée';
          subtitle = t('tracking', 'cancelledSub') || 'Cette mission n’est plus active.';
          waiting = true;
        }

        // Boutons secondaires « utilitaires » (contact + itinéraire) une fois le contact révélé.
        const canContact = isActiveJob && !!mission.client?.phone;
        const canRoute = mission.latitude != null && mission.longitude != null;

        return (
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {/* Colonne principale : action + timeline */}
            <div className="space-y-4 lg:col-span-2">
              {/* Carte PROCHAINE ACTION (proéminente, bloc sombre) */}
              <div className="rounded-2xl bg-foreground p-6 text-background">
                <div className="font-display text-[11px] font-bold uppercase tracking-wider text-background/60">
                  {waiting
                    ? (t('tracking', 'statusLabel') || 'Suivi')
                    : (t('tracking', 'nextAction') || 'Votre prochaine action')}
                  {isActiveJob && !isCancelled && !isDisputed && (
                    <> {' · '}{t('tracking', 'stepShort') || 'Étape'} {Math.min(doneCount || 1, 5)}/5</>
                  )}
                </div>
                <h1 className="font-display mt-1.5 text-2xl font-extrabold leading-tight">{title}</h1>
                <p className="mt-1.5 text-sm text-background/70">{subtitle}</p>

                {(primary || secondary || canContact || canRoute) && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {primary && (
                      <Button
                        onClick={primary.onClick}
                        disabled={primary.disabled}
                        className="bg-background text-foreground hover:bg-background/90"
                      >
                        {actionLoading && primary.disabled
                          ? (t('common', 'loading') || 'Chargement...')
                          : primary.label}
                      </Button>
                    )}
                    {secondary && (
                      <Button
                        variant="outline"
                        onClick={secondary.onClick}
                        disabled={secondary.disabled}
                        className="border-background/30 bg-transparent text-background hover:bg-background/10"
                      >
                        {secondary.label}
                      </Button>
                    )}
                    {canContact && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`tel:${mission.client.phone}`)}
                        className="border-background/30 bg-transparent text-background hover:bg-background/10"
                      >
                        {t('tracking', 'btnContact') || 'Contacter le client'}
                      </Button>
                    )}
                    {canRoute && isActiveJob && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://maps.google.com/?q=${mission.latitude},${mission.longitude}`, '_blank')}
                        className="border-background/30 bg-transparent text-background hover:bg-background/10"
                      >
                        {t('tracking', 'btnRoute') || 'Itinéraire'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* TIMELINE MIROIR — déroulé réel de la mission */}
              {isActiveJob && (
                <Card>
                  <CardContent className="py-5">
                    <div className="mb-4 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('tracking', 'timelineTitle') || 'Déroulé de la mission'}
                    </div>
                    <ol className="space-y-0">
                      {steps.map((st, i) => {
                        const done = cur >= st.threshold;
                        const isHere = i === frontier;
                        const last = i === steps.length - 1;
                        return (
                          <li key={st.key} className="relative flex gap-3 pb-5 last:pb-0">
                            {/* Ligne verticale de liaison */}
                            {!last && (
                              <span
                                className={`absolute left-[7px] top-4 h-full w-0.5 ${cur > st.threshold ? 'bg-foreground' : 'bg-border'}`}
                              />
                            )}
                            {/* Puce */}
                            <span
                              className={`relative z-10 mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                                done
                                  ? 'border-foreground bg-foreground'
                                  : 'border-border bg-background'
                              } ${isHere ? 'ring-4 ring-foreground/10' : ''}`}
                            >
                              {done && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm ${isHere ? 'font-bold text-foreground' : done ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                {st.label}
                                {isHere && !last && (
                                  <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                                    {t('tracking', 'youAreHere') || 'En cours'}
                                  </span>
                                )}
                              </div>
                              {fmt(st.at) && (
                                <div className="text-xs text-muted-foreground">{fmt(st.at)}</div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Colonne latérale : net à percevoir + rappel Krafolt */}
            <aside className="space-y-4">
              {isActiveJob && (
                <Card className="bg-card">
                  <CardContent className="py-5">
                    <div className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('tracking', 'netTitle') || 'Net à percevoir'}
                    </div>
                    {grossValid ? (
                      <>
                        <div className="mt-2 text-3xl font-extrabold text-foreground">
                          {netEstimate!.toLocaleString('fr-FR')}€
                          <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">
                            {t('tracking', 'estimateTag') || '· estimation'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('tracking', 'netFormula') || 'Prix convenu'} {gross!.toLocaleString('fr-FR')}€ −{' '}
                          {t('tracking', 'netCommission') || 'commission plateforme 10%'}
                        </p>
                        <p className="mt-2 text-xs font-medium text-foreground">
                          {t('tracking', 'netVersed') || 'Versé à la validation du client.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mt-2 text-2xl font-extrabold text-foreground">
                          {t('tracking', 'netUnknown') || 'Défini à l’acceptation'}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('tracking', 'netUnknownSub') || 'Le montant net (prix convenu − commission plateforme) s’affichera dès votre offre acceptée.'}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Rappel discret anti-désintermédiation */}
              {isActiveJob && (
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="text-xs font-semibold text-foreground">
                    {t('tracking', 'protectTitle') || 'Vous êtes couvert sur Krafolt'}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('tracking', 'protectBody') ||
                      'Gardez échanges et paiement sur Krafolt : paiement sécurisé, garantie et litiges pris en charge. Régler en direct annule votre protection.'}
                  </p>
                </div>
              )}
            </aside>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
        >
          {t('artisan', 'details') || 'Details'}
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 font-medium ${activeTab === 'timeline' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
        >
          {t('artisan', 'timeline') || 'Timeline'}
        </button>
        {mission.quotation && (
          <button
            onClick={() => setActiveTab('quotation')}
            className={`px-4 py-2 font-medium ${activeTab === 'quotation' ? 'border-b-2 border-blue-600 text-primary' : 'text-muted-foreground'}`}
          >
            {t('artisan', 'quotation') || 'Quotation'}
          </button>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mission Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'missionInfo') || 'Mission Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {t('artisan', 'description') || 'Description'}
                </div>
                <p className="text-foreground whitespace-pre-wrap">{mission.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t('artisan', 'budget') || 'Budget'}</div>
                  <div className="font-semibold text-lg">{mission.budget != null ? `EUR ${mission.budget.toLocaleString()}` : "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('artisan', 'duration') || 'Est. Duration'}
                  </div>
                  <div className="font-semibold">{mission.estimatedDuration != null ? `${mission.estimatedDuration} ${t('artisan', 'hours') || 'hours'}` : "—"}</div>
                </div>
              </div>
              {mission.scheduledDate && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('artisan', 'scheduledDate') || 'Scheduled Date'}
                  </div>
                  <div className="font-medium">
                    {new Date(mission.scheduledDate).toLocaleDateString()}
                    {mission.scheduledTime && ` at ${mission.scheduledTime}`}
                  </div>
                </div>
              )}
              {mission.notes && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('artisan', 'notes') || 'Additional Notes'}
                  </div>
                  <p className="text-foreground">{mission.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'location') || 'Location'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('artisan', 'address') || 'Address'}
                  </div>
                  <div className="font-medium">{mission.address}</div>
                  <div className="text-muted-foreground">
                    {mission.postalCode} {mission.city}
                  </div>
                </div>
                {mission.latitude != null && mission.longitude != null && (
                  <MissionMap lat={mission.latitude} lng={mission.longitude} className="h-44 w-full overflow-hidden rounded-2xl border border-border" />
                )}
                {mission.distance && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <span className="text-2xl"></span>
                    <div>
                      <div className="font-medium text-primary">
                        {mission.distance != null ? mission.distance.toFixed(1) : "—"} km away
                      </div>
                      <div className="text-sm text-primary">
                        {t('artisan', 'fromYourLocation') || 'from your location'}
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.open(
                      `https://maps.google.com/?q=${mission.latitude},${mission.longitude}`,
                      '_blank',
                    );
                  }}
                >
                  {t('artisan', 'openInMaps') || 'Open in Maps'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'clientInfo') || 'Client Information'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                  {mission.client.firstName[0]}
                  {mission.client.lastName[0]}
                </div>
                <div>
                  <div className="font-medium">
                    {mission.client.firstName} {mission.client.lastName}
                  </div>
                  {mission.client.email && (
                    <div className="text-sm text-muted-foreground">{mission.client.email}</div>
                  )}
                </div>
              </div>
              {mission.status !== 'OPEN' && mission.client.phone && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`tel:${mission.client.phone}`)}
                  >
                    {t('artisan', 'callClient') || 'Call Client'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Negotiation Section */}
          {(mission.status === 'OPEN' || mission.status === 'ASSIGNED' || mission.status === 'PENDING' || negotiations.length > 0) && (
            <Card id="offre-section" className="md:col-span-2 scroll-mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t('offers', 'makeOfferTitle') || 'Faire une offre'}
                </CardTitle>
                <CardDescription>
                  {t('offers', 'makeOfferDesc') || 'Le client compare les offres reçues (prix, dispo, durée) et choisit. Une seule offre — claire et convaincante.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Confirmation après envoi : statut + expiration réels */}
                {sentOffer && (
                  <div className="rounded-xl border border-green-300 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">✓</span>
                      <div className="flex-1">
                        <p className="font-semibold text-green-800">
                          {t('offers', 'confirmSent') || 'Offre envoyée — le client a été notifié.'}
                        </p>
                        <p className="mt-1 text-sm text-green-700">
                          {t('offers', 'confirmNotified') || "Vous serez alerté dès qu'il l'aura vue ou acceptée."}
                          {sentOffer.status && (
                            <> {' · '}{translateOfferStatus(sentOffer.status, t)}</>
                          )}
                        </p>
                        {sentOffer.expiresAt && (
                          <p className="mt-1 text-xs text-green-700">
                            {t('offers', 'confirmExpires') || 'Expire le'}{' '}
                            {new Date(sentOffer.expiresAt).toLocaleString('fr-FR')}{' '}
                            {t('offers', 'confirmWithin24h') || '(sous 24h)'}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => setSentOffer(null)}
                          className="mt-2 text-xs font-medium text-green-800 underline"
                        >
                          {t('common', 'ok') || 'OK'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client Budget */}
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {t('missions', 'clientBudget') || 'Budget client'}
                    </span>
                    <span className="font-semibold text-lg">
                      {mission.budget ? `${mission.budget}€` : '-'}
                    </span>
                  </div>
                </div>

                {/* Negotiations List — mes offres sur cette mission (statut réel) */}
                {negotiations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">
                      {t('offers', 'myOffersOnMission') || 'Vos offres'} ({negotiations.length}/5)
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {negotiations.map((neg, index) => {
                        const isFromMe = neg.senderId ? neg.senderId === currentUserId : true;
                        const isExpired = isNegotiationExpired(neg.expiresAt);
                        const isPending = neg.accepted === null || neg.accepted === undefined;
                        const isLastAndPending = index === negotiations.length - 1 && isPending && !isExpired;

                        // Statut d'offre : on privilégie le champ `status` de l'API, sinon on le dérive.
                        const derivedStatus: OfferStatus =
                          (neg.status as OfferStatus) ||
                          (neg.accepted === true
                            ? 'ACCEPTED'
                            : neg.accepted === false
                              ? 'REJECTED'
                              : isExpired
                                ? 'EXPIRED'
                                : neg.viewedAt
                                  ? 'VIEWED'
                                  : 'SENT');
                        const statusColors: Record<OfferStatus, string> = {
                          SENT: 'bg-blue-50 text-blue-600',
                          VIEWED: 'bg-blue-100 text-blue-700',
                          ACCEPTED: 'bg-green-100 text-green-700',
                          REJECTED: 'bg-red-100 text-red-700',
                          EXPIRED: 'bg-muted text-muted-foreground',
                        };

                        return (
                          <div
                            key={neg.id}
                            className={`p-3 rounded-lg border ${
                              isFromMe
                                ? 'bg-green-100 border-green-500/30 ml-4'
                                : 'bg-primary/10 border-primary/20 mr-4'
                            } ${derivedStatus === 'ACCEPTED' ? 'ring-2 ring-green-400' : ''} ${
                              derivedStatus === 'REJECTED' || derivedStatus === 'EXPIRED' ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs text-muted-foreground">
                                  {isFromMe
                                    ? t('negotiations', 'yourOffer') || 'Votre offre'
                                    : t('negotiations', 'clientOffer') || 'Offre du client'}
                                </span>
                                <div className="font-bold text-lg">{neg.proposedPrice}€</div>
                                {/* Cost breakdown */}
                                {(neg.laborCost || neg.materialCost || neg.travelCost) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {neg.laborCost && <span>Main d'œuvre: {neg.laborCost}€</span>}
                                    {neg.materialCost && <span className="ml-2">Matériel: {neg.materialCost}€</span>}
                                    {neg.travelCost && <span className="ml-2">Déplacement: {neg.travelCost}€</span>}
                                  </div>
                                )}
                                {/* Dispo + durée */}
                                {(neg.availability || neg.estimatedDuration) && (
                                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                                    {neg.availability && (
                                      <span>{t('offers', 'availabilityShort') || 'Dispo'} : {neg.availability}</span>
                                    )}
                                    {neg.estimatedDuration && (
                                      <span>{t('offers', 'durationShort') || 'Durée'} : {neg.estimatedDuration}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge className={statusColors[derivedStatus]}>
                                  {translateOfferStatus(derivedStatus, t)}
                                </Badge>
                              </div>
                            </div>

                            {neg.message && (
                              <p className="text-sm text-muted-foreground mt-2 italic">"{neg.message}"</p>
                            )}

                            {neg.rejectedReason && (
                              <p className="text-sm text-red-600 mt-2">
                                {t('negotiations', 'reason') || 'Raison'}: {neg.rejectedReason}
                              </p>
                            )}

                            {neg.viewedAt && derivedStatus === 'VIEWED' && (
                              <p className="text-xs text-blue-600 mt-2">
                                {t('offers', 'viewedAt') || 'Vue par le client le'}{' '}
                                {new Date(neg.viewedAt).toLocaleString('fr-FR')}
                              </p>
                            )}

                            {neg.expiresAt && isPending && !isExpired && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {t('negotiations', 'expiresAt') || 'Expire le'}{' '}
                                {new Date(neg.expiresAt).toLocaleString('fr-FR')}
                              </p>
                            )}

                            {/* Actions pour une contre-offre en attente venant du client */}
                            {isLastAndPending && !isFromMe && (
                              <div className="flex gap-2 mt-3 pt-3 border-t">
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptNegotiation(neg.id)}
                                  disabled={negotiationLoading}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  {t('negotiations', 'accept') || 'Accepter'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectNegotiation(neg.id)}
                                  disabled={negotiationLoading}
                                  className="flex-1"
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

                {/* Make Offer Button */}
                {canNegotiate && !showNegotiationForm && (
                  <Button
                    onClick={() => { setSentOffer(null); setShowNegotiationForm(true); }}
                    className="w-full"
                  >
                    {negotiations.length === 0
                      ? t('offers', 'makeOfferTitle') || 'Faire une offre'
                      : t('negotiations', 'counterOffer') || 'Faire une contre-offre'}
                  </Button>
                )}

                {/* Formulaire d'offre unifié */}
                {showNegotiationForm && (
                  <div className="p-4 bg-background rounded-lg space-y-4">
                    {/* Ventilation */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('offers', 'breakdown') || 'Ventilation (optionnelle)'}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            {t('negotiations', 'laborCost') || 'Main d\'œuvre'} (€)
                          </label>
                          <Input
                            type="number"
                            value={negotiationForm.laborCost}
                            onChange={(e) => setNegotiationForm({ ...negotiationForm, laborCost: e.target.value })}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            {t('negotiations', 'materialCost') || 'Matériel'} (€)
                          </label>
                          <Input
                            type="number"
                            value={negotiationForm.materialCost}
                            onChange={(e) => setNegotiationForm({ ...negotiationForm, materialCost: e.target.value })}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            {t('negotiations', 'travelCost') || 'Déplacement'} (€)
                          </label>
                          <Input
                            type="number"
                            value={negotiationForm.travelCost}
                            onChange={(e) => setNegotiationForm({ ...negotiationForm, travelCost: e.target.value })}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      {/* Total ventilation en direct */}
                      {ventilationTotal > 0 && (
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                          <span className="text-sm text-muted-foreground">
                            {t('offers', 'breakdownTotal') || 'Total ventilation'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{ventilationTotal.toLocaleString('fr-FR')}€</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNegotiationForm({ ...negotiationForm, proposedPrice: String(ventilationTotal) })}
                            >
                              {t('offers', 'useAsTotal') || 'Utiliser comme prix total'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prix total proposé */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('negotiations', 'totalPrice') || 'Prix total proposé'} (€) *
                      </label>
                      <Input
                        type="number"
                        value={negotiationForm.proposedPrice}
                        onChange={(e) => setNegotiationForm({ ...negotiationForm, proposedPrice: e.target.value })}
                        placeholder={mission.budget?.toString() || '0'}
                        min="1"
                        step="0.01"
                      />
                    </div>

                    {/* Disponibilité + Durée estimée */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('offers', 'availability') || 'Disponibilité'}
                        </label>
                        <select
                          value={negotiationForm.availability}
                          onChange={(e) => setNegotiationForm({ ...negotiationForm, availability: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">{t('offers', 'availabilityChoose') || 'Choisir…'}</option>
                          <option value="Dès demain matin">{t('offers', 'availTomorrow') || 'Dès demain matin'}</option>
                          <option value="Sous 48h">{t('offers', 'avail48h') || 'Sous 48h'}</option>
                          <option value="Cette semaine">{t('offers', 'availThisWeek') || 'Cette semaine'}</option>
                          <option value="À convenir">{t('offers', 'availToAgree') || 'À convenir'}</option>
                          <option value="__custom__">{t('offers', 'availCustom') || 'Date précise…'}</option>
                        </select>
                        {negotiationForm.availability === '__custom__' && (
                          <Input
                            type="date"
                            className="mt-2"
                            value={negotiationForm.availabilityCustom}
                            onChange={(e) => setNegotiationForm({ ...negotiationForm, availabilityCustom: e.target.value })}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('offers', 'estimatedDuration') || 'Durée estimée'}
                        </label>
                        <Input
                          type="text"
                          list="offer-duration-suggestions"
                          value={negotiationForm.estimatedDuration}
                          onChange={(e) => setNegotiationForm({ ...negotiationForm, estimatedDuration: e.target.value })}
                          placeholder={t('offers', 'durationPlaceholder') || '~1h'}
                        />
                        <datalist id="offer-duration-suggestions">
                          <option value="~1h" />
                          <option value="~2h" />
                          <option value="~1/2 journée" />
                          <option value="~1 journée" />
                          <option value="2 jours" />
                        </datalist>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t('negotiations', 'message') || 'Message (optionnel)'}
                      </label>
                      <textarea
                        value={negotiationForm.message}
                        onChange={(e) => setNegotiationForm({ ...negotiationForm, message: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={2}
                        placeholder={
                          t('negotiations', 'artisanMessagePlaceholder') ||
                          'Expliquez le détail de votre offre...'
                        }
                      />
                    </div>

                    {/* Aperçu — ce que voit le client */}
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('offers', 'clientPreview') || 'Aperçu — ce que voit le client'}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {(currentUserName || 'K').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {currentUserName || (t('offers', 'yourCompany') || 'Votre entreprise')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('offers', 'newOfferBadge') || 'Nouvelle offre'}
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-lg font-bold text-foreground">
                            {(parseFloat(negotiationForm.proposedPrice) || ventilationTotal || 0).toLocaleString('fr-FR')}€
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {resolvedAvailability && (
                          <span>{t('offers', 'availabilityShort') || 'Dispo'} : {resolvedAvailability}</span>
                        )}
                        {negotiationForm.estimatedDuration && (
                          <span>{t('offers', 'durationShort') || 'Durée'} : {negotiationForm.estimatedDuration}</span>
                        )}
                      </div>
                      {negotiationForm.message && (
                        <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                          "{negotiationForm.message}"
                        </p>
                      )}
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
                  <p className="text-sm text-foreground text-center">
                    {t('negotiations', 'limitReached') ||
                      'Limite de 5 négociations atteinte.'}
                  </p>
                )}

                {/* Note : le devis formel PDF reste séparé */}
                <p className="text-xs text-muted-foreground">
                  {t('offers', 'quoteSeparateNote') ||
                    'Besoin d’un devis formel (PDF signable) pour un gros chantier ? Rendez-vous dans l’onglet Devis.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Before Photos (from client) */}
          {mission.beforePhotos && mission.beforePhotos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  {t('missions', 'beforePhotos') || 'Photos avant travaux'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {mission.beforePhotos.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Avant ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(image, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* After Photos (uploaded by artisan) */}
          {(mission.afterPhotos && mission.afterPhotos.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  {t('missions', 'afterPhotos') || 'Photos après travaux'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {mission.afterPhotos.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Après ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(image, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legacy Mission Images */}
          {mission.images && mission.images.length > 0 && !mission.beforePhotos?.length && (
            <Card>
              <CardHeader>
                <CardTitle>{t('artisan', 'photos') || 'Photos'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {mission.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Mission photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(image, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Section (for IN_PROGRESS status) */}
          {mission.status === 'IN_PROGRESS' && (
            <Card id="finalisation" className="md:col-span-2 scroll-mt-6">
              <CardHeader>
                <CardTitle>{t('artisan', 'completeWork') || 'Finaliser la mission'}</CardTitle>
                <CardDescription>
                  {t('artisan', 'completeWorkDesc') ||
                    'Ajoutez des photos après travaux et des notes avant de terminer la mission'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* After Photos Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    {t('missions', 'afterPhotos') || 'Photos après travaux'}
                  </label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('artisan', 'afterPhotosHelper') || 'Ajoutez des photos montrant le travail terminé'}
                  </p>

                  {/* Photo Upload Input */}
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAfterPhotoUpload}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 border rounded-lg hover:bg-green-100 transition-colors">
                        {uploadingPhoto ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            {t('common', 'uploading') || 'Téléchargement...'}
                          </>
                        ) : (
                          <>
                            <span></span>
                            {t('missions', 'addPhotos') || 'Ajouter des photos'}
                          </>
                        )}
                      </div>
                    </label>
                    {afterPhotos.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {afterPhotos.length} photo{afterPhotos.length > 1 ? 's' : ''} sélectionnée{afterPhotos.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Photo Previews */}
                  {afterPhotos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
                      {afterPhotos.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`After photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2"
                          />
                          <button
                            type="button"
                            onClick={() => removeAfterPhoto(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completion Notes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('artisan', 'completionNotes') || 'Notes de complétion'}
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={
                      t('artisan', 'completionNotesPlaceholder') ||
                      'Décrivez le travail effectué, les problèmes rencontrés, etc.'
                    }
                  />
                </div>

                {/* Completion Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleCompleteMission}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading
                      ? t('common', 'loading') || 'Chargement...'
                      : t('artisan', 'completeMission') || 'Terminer la mission'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'missionTimeline') || 'Mission Timeline'}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
            const timelineEvents = Array.isArray(timeline) ? timeline : [];
            return timelineEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('artisan', 'noTimeline') || 'No timeline events yet'}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                <div className="space-y-6">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="relative pl-10">
                      <div className="absolute left-2 w-4 h-4 rounded-full bg-primary border-2 border-white" />
                      <div className="bg-background p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{translateEventType(event.type, t)}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{event.description}</p>
                        {event.user && (
                          <p className="text-sm text-muted-foreground mt-1">
                            by {event.user.firstName} {event.user.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Quotation Tab */}
      {activeTab === 'quotation' && mission.quotation && (
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'quotationDetails') || 'Quotation Details'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-muted-foreground">{t('artisan', 'amount') || 'Amount'}</span>
                <span className="text-2xl font-bold text-foreground">
                  EUR {(Number(mission.quotation.amount) || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-muted-foreground">{t('artisan', 'status') || 'Status'}</span>
                <Badge
                  className={
                    mission.quotation.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-700'
                      : mission.quotation.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : mission.quotation.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-muted text-foreground'
                  }
                >
                  {translateQuotationStatus(mission.quotation.status, t)}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">{t('artisan', 'validUntil') || 'Valid Until'}</span>
                <span>{new Date(mission.quotation.validUntil).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
