'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { missionsApi } from '@/lib/api/missions';
import { userApi } from '@/lib/api/user';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateMissionStatus } from '@/lib/utils/enum-translations';

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
  scheduledFor?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  validatedAt?: string;
  autoValidatedAt?: string;
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
    artisanProfile?: {
      companyName: string;
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

export default function MissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
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

  useEffect(() => {
    if (missionId) {
      loadData();
    }
  }, [missionId]);

  const loadData = async () => {
    try {
      const [missionData, profileData, negotiationsData, userData] = await Promise.all([
        missionsApi.getById(missionId),
        userApi.getClientProfile().catch(() => null),
        missionsApi.getNegotiations(missionId).catch(() => []),
        userApi.getProfile().catch(() => null),
      ]);
      setMission(missionData);
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
      // Get cancellation fees first
      const fees = await missionsApi.getCancellationFees(missionId).catch(() => ({
        canCancel: true,
        fee: 0,
        feePercentage: 0,
        reason: getCancellationFeeReason(),
      }));
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

  const handleAcceptNegotiation = async (negotiationId: string) => {
    if (!confirm(t('negotiations', 'confirmAccept') || 'Accepter cette offre ?')) {
      return;
    }

    setNegotiationLoading(true);
    try {
      await missionsApi.acceptNegotiation(negotiationId, true);
      toast({
        title: t('common', 'success'),
        description: t('negotiations', 'offerAccepted') || 'Offre acceptée',
      });
      loadData();
    } catch (error) {
      console.error('Error accepting negotiation:', error);
      toast({
        title: t('common', 'error'),
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
      await missionsApi.acceptNegotiation(negotiationId, false, reason || undefined);
      toast({
        title: t('common', 'success'),
        description: t('negotiations', 'offerRejected') || 'Offre refusée',
      });
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
            ← {t('common', 'back')}
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{mission.title}</h1>
                {isProfessional && (
                  <Badge variant="outline" className="text-primary border-blue-300">
                    🏢 Pro
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Réf: {mission.id.slice(0, 8).toUpperCase()}</p>
            </div>
            {getStatusBadge(mission.status)}
          </div>
        </div>

        {/* Timeline de statut (parcours mission) */}
        {(() => {
          const steps = ['Publié', 'Offres', 'Paiement', 'Réalisation', 'Validation'];
          const s = mission.status;
          const active =
            ['PENDING', 'NEGOTIATING'].includes(s) ? 2 :
            ['PENDING_DEPOSIT'].includes(s) ? 3 :
            ['ACCEPTED', 'PAID', 'IN_PROGRESS', 'IN_TRANSIT', 'ARRIVED'].includes(s) ? 4 :
            ['COMPLETED', 'AUTO_VALIDATED', 'VALIDATED'].includes(s) ? 5 : 2;
          return (
            <div className="mb-8 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center">
                {steps.map((label, i) => {
                  const n = i + 1;
                  const done = active > n;
                  const now = active === n;
                  return (
                    <div key={label} className="relative flex flex-1 flex-col items-center">
                      {i < steps.length - 1 && (
                        <div className={`absolute left-1/2 top-[13px] h-0.5 w-full ${active > n ? 'bg-primary' : 'bg-border'}`} />
                      )}
                      <div className={`font-display relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${done ? 'bg-primary text-primary-foreground' : now ? 'bg-primary text-primary-foreground ring-4 ring-muted' : 'bg-muted text-muted-foreground'}`}>
                        {done ? '✓' : n}
                      </div>
                      <div className={`font-display mt-2 text-[11px] font-bold ${active >= n ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                    📷 {t('missions', 'photos') || 'Photos'}
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
                    🏢 {t('missions', 'professionalInfo') || 'Informations professionnelles'}
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
                    <p className="text-foreground">{mission.category}</p>
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
                    💰 {t('negotiations', 'priceNegotiation') || 'Négociation du prix'}
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
                        <span className="text-sm text-green-600 font-medium">
                          {t('negotiations', 'agreedPrice') || 'Prix convenu'}
                        </span>
                        <span className="font-bold text-lg text-green-600">
                          {mission.agreedPrice}€
                        </span>
                      </div>
                    )}
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
                              className={`p-3 rounded-xl border ${
                                isFromMe
                                  ? 'bg-muted border-border ml-4'
                                  : 'bg-card border-border mr-4'
                              } ${neg.accepted === true ? 'ring-2 ring-green-500' : ''} ${
                                neg.accepted === false ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs text-muted-foreground">
                                    {isFromMe
                                      ? t('negotiations', 'yourOffer') || 'Votre offre'
                                      : t('negotiations', 'artisanOffer') || "Offre de l'artisan"}
                                  </span>
                                  <div className="font-bold text-lg">{neg.proposedPrice}€</div>
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
                                    <Badge className="bg-muted text-muted-foreground">
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

                              {/* Actions for pending offers from artisan */}
                              {isLastAndPending && !isFromMe && (
                                <div className="flex gap-2 mt-3 pt-3 border-t">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcceptNegotiation(neg.id)}
                                    disabled={negotiationLoading}
                                    className="flex-1"
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
            {/* Validation Section - shown when mission is completed but not validated */}
            {needsValidation && (
              <Card className="border-green-200 bg-green-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    ✅ {t('validation', 'workCompleted') || 'Travail terminé'}
                  </CardTitle>
                  <CardDescription>
                    {t('validation', 'validateDesc') || 'L\'artisan a terminé le travail. Vérifiez et validez.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* After Photos Preview */}
                  {mission.afterPhotos && mission.afterPhotos.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        {t('missions', 'afterPhotos') || 'Photos après travaux'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {mission.afterPhotos.slice(0, 3).map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`After ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border cursor-pointer"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-amber-100 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                      {t('validation', 'autoValidateWarning') ||
                        'Si vous ne validez pas dans les 7 jours, la mission sera automatiquement validée.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleValidate}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {t('validation', 'validateWork') || 'Valider le travail'}
                    </Button>
                    <Button
                      onClick={handleDispute}
                      variant="outline"
                      className="flex-1 text-red-600 border-red-500/30 hover:bg-red-100"
                    >
                      {t('validation', 'reportProblem') || 'Signaler un problème'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('common', 'actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>{t('missions', 'history') || 'Historique'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {t('missions', 'created') || 'Mission créée'}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatDate(mission.createdAt)}</p>
                    </div>
                  </div>

                  {mission.acceptedAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {t('missions', 'accepted') || 'Mission acceptée'}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(mission.acceptedAt)}</p>
                      </div>
                    </div>
                  )}

                  {mission.completedAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {t('missions', 'completed') || 'Mission terminée'}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(mission.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                ⚠️ {t('cancellation', 'cancelMission') || 'Annuler la mission'}
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
                    ? 'bg-amber-100 border border-amber-200'
                    : 'bg-green-100 border border-green-200'
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
    </div>
  );
}
