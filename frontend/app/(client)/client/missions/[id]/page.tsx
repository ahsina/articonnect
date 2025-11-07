'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { missionsApi } from '@/lib/api/missions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export default function MissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (missionId) {
      loadMission();
    }
  }, [missionId]);

  const loadMission = async () => {
    try {
      const data = await missionsApi.getById(missionId);
      setMission(data);
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette mission ?')) {
      return;
    }

    try {
      await missionsApi.cancel(missionId);
      loadMission();
    } catch (error) {
      console.error('Error cancelling mission:', error);
      alert('Erreur lors de l\'annulation');
    }
  };

  const handleComplete = async () => {
    if (!confirm('Confirmer que la mission est terminée ?')) {
      return;
    }

    try {
      await missionsApi.complete(missionId);
      loadMission();
      setShowReviewForm(true);
    } catch (error) {
      console.error('Error completing mission:', error);
      alert('Erreur lors de la finalisation');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      PENDING: { variant: 'warning', label: 'En attente' },
      ACCEPTED: { variant: 'info', label: 'Acceptée' },
      IN_PROGRESS: { variant: 'info', label: 'En cours' },
      COMPLETED: { variant: 'success', label: 'Terminée' },
      CANCELLED: { variant: 'error', label: 'Annulée' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Mission non trouvée</div>
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
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Retour
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {mission.title}
              </h1>
              <p className="text-gray-600 mt-2">Référence: {mission.id.slice(0, 8)}</p>
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
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {mission.description}
                </p>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Détails de la mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Catégorie</p>
                    <p className="text-gray-900">{mission.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <p className="text-gray-900">
                      {mission.type === 'EMERGENCY' ? 'Urgence' : 'Programmée'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Budget client</p>
                    <p className="text-gray-900 font-semibold">
                      {mission.clientBudget ? `${mission.clientBudget}€` : 'Non défini'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Prix final</p>
                    <p className="text-gray-900 font-semibold">
                      {mission.agreedPrice ? `${mission.agreedPrice}€` : 'Non négocié'}
                    </p>
                  </div>
                </div>

                {mission.scheduledDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date programmée</p>
                    <p className="text-gray-900">{formatDate(mission.scheduledDate)}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Adresse</p>
                  <p className="text-gray-900">
                    {mission.address}<br />
                    {mission.postalCode} {mission.city}<br />
                    {mission.country}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Artisan Info */}
            {mission.artisan && (
              <Card>
                <CardHeader>
                  <CardTitle>Artisan assigné</CardTitle>
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
                    <Button
                      onClick={() => router.push(`/chat/${mission.artisan.id}`)}
                    >
                      Contacter
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
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mission.status === 'PENDING' && (
                  <>
                    <Button className="w-full" variant="outline">
                      Modifier
                    </Button>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={handleCancel}
                    >
                      Annuler la mission
                    </Button>
                  </>
                )}

                {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
                  <>
                    <Button className="w-full" onClick={handleComplete}>
                      Marquer comme terminée
                    </Button>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={handleCancel}
                    >
                      Annuler la mission
                    </Button>
                  </>
                )}

                {mission.status === 'COMPLETED' && !mission.review && (
                  <Button
                    className="w-full"
                    onClick={() => setShowReviewForm(true)}
                  >
                    Laisser un avis
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Mission créée</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(mission.createdAt)}
                      </p>
                    </div>
                  </div>

                  {mission.acceptedAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Mission acceptée</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(mission.acceptedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {mission.completedAt && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Mission terminée</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(mission.completedAt)}
                        </p>
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
