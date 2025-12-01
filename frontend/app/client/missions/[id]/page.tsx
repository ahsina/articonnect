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

  const handleCancel = async () => {
    if (!confirm(t('missions', 'confirmCancel') || 'Voulez-vous vraiment annuler cette mission ?')) {
      return;
    }

    try {
      await missionsApi.cancel(missionId);
      toast({
        title: t('common', 'success'),
        description: t('missions', 'missionCancelled') || 'Mission annulée',
      });
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

  const handleComplete = async () => {
    if (!confirm(t('missions', 'confirmComplete') || 'Confirmer que la mission est terminée ?')) {
      return;
    }

    try {
      await missionsApi.complete(missionId);
      toast({
        title: t('common', 'success'),
        description: t('missions', 'missionCompleted') || 'Mission terminée',
      });
      loadData();
      setShowReviewForm(true);
    } catch (error) {
      console.error('Error completing mission:', error);
      toast({
        title: t('common', 'error'),
        description: t('missions', 'completeError') || 'Erreur',
        variant: 'destructive',
      });
    }
  };

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
      PENDING: 'bg-yellow-100 text-yellow-800',
      NEGOTIATING: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
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
        <div className="text-gray-500">{t('common', 'loading')}</div>
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
      <div className="min-h-screen bg-gray-50 py-8">
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            ← {t('common', 'back')}
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{mission.title}</h1>
                {isProfessional && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    🏢 Pro
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">Réf: {mission.id.slice(0, 8).toUpperCase()}</p>
            </div>
            {getStatusBadge(mission.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{t('common', 'description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{mission.description}</p>
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-400"></span>
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
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
                    <p className="text-sm text-gray-500 text-center italic">
                      {t('missions', 'comparePhotosHint') || 'Cliquez sur une photo pour l\'agrandir'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* B2B Info Card - Only shown if B2B data exists */}
            {hasB2BInfo && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    🏢 {t('missions', 'professionalInfo') || 'Informations professionnelles'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mission.purchaseOrderNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t('missions', 'purchaseOrderNumber') || 'N° Bon de commande'}
                      </span>
                      <span className="font-semibold text-blue-900">
                        {mission.purchaseOrderNumber}
                      </span>
                    </div>
                  )}
                  {mission.internalReference && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t('missions', 'internalReference') || 'Référence interne'}
                      </span>
                      <span className="font-semibold text-blue-900">
                        {mission.internalReference}
                      </span>
                    </div>
                  )}
                  {mission.billingCompanyName && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm text-gray-600 mb-1">
                        {t('missions', 'billingInfo') || 'Facturation'}
                      </p>
                      <p className="font-semibold">{mission.billingCompanyName}</p>
                      {mission.billingAddress && (
                        <p className="text-sm text-gray-600">{mission.billingAddress}</p>
                      )}
                      {mission.billingVatNumber && (
                        <p className="text-sm text-gray-600">TVA: {mission.billingVatNumber}</p>
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
                    <p className="text-sm font-medium text-gray-500">
                      {t('common', 'category')}
                    </p>
                    <p className="text-gray-900">{mission.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('common', 'type')}</p>
                    <p className="text-gray-900">
                      {mission.type === 'EMERGENCY'
                        ? t('missions', 'emergency') || 'Urgence'
                        : t('missions', 'scheduled') || 'Programmée'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('missions', 'clientBudget') || 'Budget client'}
                    </p>
                    <p className="text-gray-900 font-semibold">
                      {mission.clientBudget ? `${mission.clientBudget}€` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('missions', 'agreedPrice') || 'Prix final'}
                    </p>
                    <p className="text-gray-900 font-semibold">
                      {mission.agreedPrice ? `${mission.agreedPrice}€` : '-'}
                    </p>
                  </div>
                </div>

                {mission.scheduledFor && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {t('missions', 'scheduledDate') || 'Date programmée'}
                    </p>
                    <p className="text-gray-900">{formatDate(mission.scheduledFor)}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    {t('common', 'address')}
                  </p>
                  <p className="text-gray-900">
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
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-semibold">
                      {mission.artisan.firstName[0]}
                      {mission.artisan.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {mission.artisan.firstName} {mission.artisan.lastName}
                      </h3>
                      <p className="text-gray-600">{mission.artisan.email}</p>
                      {mission.artisan.artisanProfile && (
                        <p className="text-sm text-gray-500 mt-1">
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
              <Card className="border-orange-200">
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
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
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
                      <h4 className="text-sm font-medium text-gray-700">
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
                                  ? 'bg-blue-50 border-blue-200 ml-4'
                                  : 'bg-orange-50 border-orange-200 mr-4'
                              } ${neg.accepted === true ? 'ring-2 ring-green-400' : ''} ${
                                neg.accepted === false ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs text-gray-500">
                                    {isFromMe
                                      ? t('negotiations', 'yourOffer') || 'Votre offre'
                                      : t('negotiations', 'artisanOffer') || "Offre de l'artisan"}
                                  </span>
                                  <div className="font-bold text-lg">{neg.proposedPrice}€</div>
                                </div>
                                <div className="text-right">
                                  {neg.accepted === true && (
                                    <Badge className="bg-green-100 text-green-800">
                                      {t('negotiations', 'accepted') || 'Acceptée'}
                                    </Badge>
                                  )}
                                  {neg.accepted === false && (
                                    <Badge className="bg-red-100 text-red-800">
                                      {t('negotiations', 'rejected') || 'Refusée'}
                                    </Badge>
                                  )}
                                  {isPending && isExpired && (
                                    <Badge className="bg-gray-100 text-gray-800">
                                      {t('negotiations', 'expired') || 'Expirée'}
                                    </Badge>
                                  )}
                                  {isPending && !isExpired && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      {t('negotiations', 'pending') || 'En attente'}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {neg.message && (
                                <p className="text-sm text-gray-600 mt-2 italic">"{neg.message}"</p>
                              )}

                              {neg.rejectedReason && (
                                <p className="text-sm text-red-600 mt-2">
                                  {t('negotiations', 'reason') || 'Raison'}: {neg.rejectedReason}
                                </p>
                              )}

                              {neg.expiresAt && isPending && !isExpired && (
                                <p className="text-xs text-gray-400 mt-2">
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
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('negotiations', 'message') || 'Message (optionnel)'}
                        </label>
                        <textarea
                          value={negotiationForm.message}
                          onChange={(e) =>
                            setNegotiationForm({ ...negotiationForm, message: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <p className="text-sm text-orange-600 text-center">
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
                    <Button className="w-full" variant="destructive" onClick={handleCancel}>
                      {t('missions', 'cancelMission') || 'Annuler la mission'}
                    </Button>
                  </>
                )}

                {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
                  <>
                    <Button className="w-full" onClick={handleComplete}>
                      {t('missions', 'markCompleted') || 'Marquer comme terminée'}
                    </Button>
                    <Button className="w-full" variant="destructive" onClick={handleCancel}>
                      {t('missions', 'cancelMission') || 'Annuler la mission'}
                    </Button>
                  </>
                )}

                {mission.status === 'COMPLETED' && !mission.review && (
                  <Button className="w-full" onClick={() => setShowReviewForm(true)}>
                    {t('reviews', 'leaveReview') || 'Laisser un avis'}
                  </Button>
                )}

                {mission.status === 'COMPLETED' && (
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
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('missions', 'created') || 'Mission créée'}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(mission.createdAt)}</p>
                    </div>
                  </div>

                  {mission.acceptedAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {t('missions', 'accepted') || 'Mission acceptée'}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(mission.acceptedAt)}</p>
                      </div>
                    </div>
                  )}

                  {mission.completedAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {t('missions', 'completed') || 'Mission terminée'}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(mission.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
