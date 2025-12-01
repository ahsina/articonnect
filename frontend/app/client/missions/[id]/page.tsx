'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { missionsApi } from '@/lib/api/missions';
import { userApi } from '@/lib/api/user';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function MissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (missionId) {
      loadData();
    }
  }, [missionId]);

  const loadData = async () => {
    try {
      const [missionData, profileData] = await Promise.all([
        missionsApi.getById(missionId),
        userApi.getClientProfile().catch(() => null),
      ]);
      setMission(missionData);
      setClientProfile(profileData);
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
