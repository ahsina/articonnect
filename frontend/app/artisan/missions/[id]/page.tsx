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
import { translateMissionStatus, translatePriority, translateQuotationStatus, translateEventType } from '@/lib/utils/enum-translations';

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
  message?: string;
  senderId: string;
  receiverId: string;
  accepted?: boolean;
  rejectedReason?: string;
  expiresAt?: string;
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
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({
    amount: '',
    description: '',
    validDays: '7',
    items: [] as { description: string; quantity: number; unitPrice: number }[],
  });
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
    message: '',
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'startError') || 'Failed to start mission',
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
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'arriveError') || "Impossible de confirmer l'arrivée sur place",
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMission = async () => {
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
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'completeError') || 'Failed to complete mission',
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
      await apiClient.post(`/missions/${missionId}/negotiations`, {
        missionId,
        proposedPrice: parseFloat(negotiationForm.proposedPrice),
        laborCost: negotiationForm.laborCost ? parseFloat(negotiationForm.laborCost) : undefined,
        materialCost: negotiationForm.materialCost ? parseFloat(negotiationForm.materialCost) : undefined,
        travelCost: negotiationForm.travelCost ? parseFloat(negotiationForm.travelCost) : undefined,
        message: negotiationForm.message || undefined,
      });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('negotiations', 'offerSent') || 'Offre envoyée',
        variant: 'success',
      });
      setShowNegotiationForm(false);
      setNegotiationForm({
        proposedPrice: '',
        laborCost: '',
        materialCost: '',
        travelCost: '',
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

  const handleSubmitQuotation = async () => {
    if (!quotationForm.amount || !quotationForm.description) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'fillRequired') || 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(quotationForm.validDays));

      // Une quotation sur une mission = une offre de négociation (proposition de prix)
      await apiClient.post(`/missions/${missionId}/negotiations`, {
        missionId,
        proposedPrice: parseFloat(quotationForm.amount),
        message: quotationForm.description,
      });

      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'quotationSubmitted') || 'Quotation submitted successfully',
        variant: 'success',
      });
      setShowQuotationModal(false);
      setQuotationForm({
        amount: '',
        description: '',
        validDays: '7',
        items: [],
      });
      loadMission();
    } catch (error) {
      console.error('Error submitting quotation:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'quotationError') || 'Failed to submit quotation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

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

      {/* Bandeau de statut « à la Uber » (côté artisan, piloté par l'état) */}
      {(() => {
        const s = mission.status;
        const stepLabels = ['', t('missions', 'aStReceived') || 'Reçue', t('missions', 'aStAccepted') || 'Acceptée', t('missions', 'aStWorking') || 'En cours', t('missions', 'aStDone') || 'Terminée', t('missions', 'aStPaid') || 'Payée'];
        const active =
          ['OPEN', 'PENDING', 'ASSIGNED', 'NEGOTIATING'].includes(s) ? 1 :
          ['ACCEPTED', 'PAID', 'PENDING_DEPOSIT'].includes(s) ? 2 :
          ['IN_PROGRESS', 'IN_TRANSIT', 'ARRIVED'].includes(s) ? 3 :
          ['COMPLETED'].includes(s) ? 4 :
          ['VALIDATED', 'AUTO_VALIDATED'].includes(s) ? 5 : 1;
        const clientName = mission.client?.firstName ? `, ${mission.client.firstName}` : '';
        let headline = '', sub = '';
        if (active === 1) { headline = t('missions', 'aHeadReceived') || 'Décrochez cette mission'; sub = t('missions', 'aSubReceived') || 'Envoyez votre offre — le client compare et choisit.'; }
        else if (active === 2) { headline = t('missions', 'aHeadAccepted') || 'Mission acceptée'; sub = `${t('missions', 'aSubAccepted') || 'Vous pouvez démarrer quand vous êtes prêt'}${clientName}.`; }
        else if (active === 3) { headline = t('missions', 'aHeadWorking') || 'Intervention en cours'; sub = t('missions', 'aSubWorking') || 'Marquez la mission terminée une fois le travail fini.'; }
        else if (active === 4) { headline = t('missions', 'aHeadDone') || 'En attente de validation'; sub = t('missions', 'aSubDone') || 'Le client valide, puis votre paiement est libéré.'; }
        else { headline = t('missions', 'aHeadPaid') || 'Mission payée'; sub = t('missions', 'aSubPaid') || 'Paiement libéré. Bravo !'; }
        return (
          <div className="mb-6 rounded-2xl bg-foreground p-6 text-background">
            <div className="font-display text-[11px] font-bold uppercase tracking-wider text-background/60">{t('missions', 'step') || 'Étape'} {active}/5 · {stepLabels[active]}</div>
            <h1 className="font-display mt-1.5 text-2xl font-extrabold leading-tight">{headline}</h1>
            <p className="mt-1.5 text-sm text-background/70">{sub}</p>
            <div className="mt-4 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`h-1 flex-1 rounded-full ${active >= n ? 'bg-background' : 'bg-background/25'}`} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Action Buttons based on status */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {mission.status === 'OPEN' &&
                (t('artisan', 'openMissionHint') ||
                  'This mission is available. Submit a quotation or accept it.')}
              {mission.status === 'ASSIGNED' &&
                (t('artisan', 'assignedMissionHint') ||
                  'You have been assigned to this mission. Accept or decline.')}
              {mission.status === 'ACCEPTED' &&
                (t('artisan', 'acceptedMissionHint') || 'Mission accepted. Start when ready.')}
              {mission.status === 'IN_TRANSIT' &&
                (t('artisan', 'inTransitMissionHint') ||
                  'En route vers le client. Confirmez votre arrivée sur place pour démarrer le travail.')}
              {mission.status === 'IN_PROGRESS' &&
                (t('artisan', 'inProgressMissionHint') ||
                  'Mission in progress. Complete when finished.')}
              {mission.status === 'COMPLETED' &&
                (t('artisan', 'completedMissionHint') || 'Mission completed successfully!')}
            </div>
            <div className="flex gap-2">
              {mission.status === 'OPEN' && !mission.quotation && (
                <Button onClick={() => setShowQuotationModal(true)}>
                  {t('artisan', 'submitQuotation') || 'Submit Quotation'}
                </Button>
              )}
              {mission.status === 'ASSIGNED' && (
                <>
                  <Button variant="outline" onClick={handleDeclineMission} disabled={actionLoading}>
                    {t('artisan', 'decline') || 'Decline'}
                  </Button>
                  <Button onClick={handleAcceptMission} disabled={actionLoading}>
                    {t('artisan', 'accept') || 'Accept'}
                  </Button>
                </>
              )}
              {mission.status === 'ACCEPTED' && (
                <Button
                  onClick={handleStartMission}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('artisan', 'startMission') || 'Start Mission'}
                </Button>
              )}
              {mission.status === 'IN_TRANSIT' && (
                <Button
                  onClick={handleArriveMission}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('artisan', 'markArrival') || 'Je suis arrivé sur place'}
                </Button>
              )}
              {mission.status === 'IN_PROGRESS' && (
                <Button
                  onClick={handleCompleteMission}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('artisan', 'completeMission') || 'Complete Mission'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t('negotiations', 'priceNegotiation') || 'Négociation du prix'}
                </CardTitle>
                <CardDescription>
                  {t('negotiations', 'artisanNegotiationDesc') || 'Proposez un prix au client pour cette mission'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Negotiations List */}
                {negotiations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">
                      {t('negotiations', 'history') || 'Historique des offres'} ({negotiations.length}/5)
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {negotiations.map((neg, index) => {
                        const isFromMe = neg.senderId === currentUserId;
                        const isExpired = isNegotiationExpired(neg.expiresAt);
                        const isPending = neg.accepted === null || neg.accepted === undefined;
                        const isLastAndPending = index === negotiations.length - 1 && isPending && !isExpired;

                        return (
                          <div
                            key={neg.id}
                            className={`p-3 rounded-lg border ${
                              isFromMe
                                ? 'bg-green-100 border-green-500/30 ml-4'
                                : 'bg-primary/10 border-primary/20 mr-4'
                            } ${neg.accepted === true ? 'ring-2 ring-green-400' : ''} ${
                              neg.accepted === false ? 'opacity-60' : ''
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
                              </div>
                              <div className="text-right">
                                {neg.accepted === true && (
                                  <Badge className="bg-green-100 text-green-700">
                                    {t('negotiations', 'accepted') || 'Acceptée'}
                                  </Badge>
                                )}
                                {neg.accepted === false && (
                                  <Badge className="bg-red-100 text-red-700">
                                    {t('negotiations', 'rejected') || 'Refusée'}
                                  </Badge>
                                )}
                                {isPending && isExpired && (
                                  <Badge className="bg-muted text-foreground">
                                    {t('negotiations', 'expired') || 'Expirée'}
                                  </Badge>
                                )}
                                {isPending && !isExpired && (
                                  <Badge className="bg-amber-100 text-amber-800">
                                    {t('negotiations', 'pending') || 'En attente'}
                                  </Badge>
                                )}
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

                            {neg.expiresAt && isPending && !isExpired && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {t('negotiations', 'expiresAt') || 'Expire le'}{' '}
                                {new Date(neg.expiresAt).toLocaleString('fr-FR')}
                              </p>
                            )}

                            {/* Actions for pending offers from client */}
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
                    onClick={() => setShowNegotiationForm(true)}
                    className="w-full"
                  >
                    {negotiations.length === 0
                      ? t('negotiations', 'makeOffer') || 'Faire une offre'
                      : t('negotiations', 'counterOffer') || 'Faire une contre-offre'}
                  </Button>
                )}

                {/* Negotiation Form */}
                {showNegotiationForm && (
                  <div className="p-4 bg-background rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('negotiations', 'totalPrice') || 'Prix total proposé'} (€) *
                        </label>
                        <Input
                          type="number"
                          value={negotiationForm.proposedPrice}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, proposedPrice: e.target.value })
                          }
                          placeholder={mission.budget?.toString() || '0'}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('negotiations', 'laborCost') || 'Main d\'œuvre'} (€)
                        </label>
                        <Input
                          type="number"
                          value={negotiationForm.laborCost}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, laborCost: e.target.value })
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('negotiations', 'materialCost') || 'Matériel'} (€)
                        </label>
                        <Input
                          type="number"
                          value={negotiationForm.materialCost}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, materialCost: e.target.value })
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {t('negotiations', 'travelCost') || 'Déplacement'} (€)
                        </label>
                        <Input
                          type="number"
                          value={negotiationForm.travelCost}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, travelCost: e.target.value })
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
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
                            t('negotiations', 'artisanMessagePlaceholder') ||
                            'Expliquez le détail de votre offre...'
                          }
                        />
                      </div>
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
            <Card className="md:col-span-2">
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

      {/* Quotation Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {t('artisan', 'submitQuotation') || 'Submit Quotation'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'amount') || 'Amount (EUR)'} *
                </label>
                <Input
                  type="number"
                  value={quotationForm.amount}
                  onChange={(e) => setQuotationForm({ ...quotationForm, amount: e.target.value })}
                  min="0"
                  placeholder={mission.budget.toString()}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('artisan', 'clientBudget') || 'Client budget'}: EUR{' '}
                  {mission.budget != null ? mission.budget.toLocaleString() : "—"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'description') || 'Description'} *
                </label>
                <textarea
                  value={quotationForm.description}
                  onChange={(e) =>
                    setQuotationForm({ ...quotationForm, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={
                    t('artisan', 'quotationDescPlaceholder') ||
                    'Describe what is included in your quotation...'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'validFor') || 'Valid For (days)'}
                </label>
                <select
                  value={quotationForm.validDays}
                  onChange={(e) =>
                    setQuotationForm({ ...quotationForm, validDays: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowQuotationModal(false)}>
                {t('common', 'cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleSubmitQuotation} disabled={actionLoading}>
                {actionLoading
                  ? t('common', 'submitting') || 'Submitting...'
                  : t('artisan', 'submitQuotation') || 'Submit Quotation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
