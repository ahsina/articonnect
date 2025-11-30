'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { translateDisputeStatus } from '@/lib/utils/enum-translations';

interface Dispute {
  id: string;
  missionId: string;
  mission: {
    title: string;
    artisan?: {
      firstName: string;
      lastName: string;
    };
  };
  type: string;
  description: string;
  status: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ESCALATED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const DISPUTE_TYPES = [
  { id: 'QUALITY', label: 'Qualité du travail' },
  { id: 'DELAY', label: 'Retard' },
  { id: 'PRICE', label: 'Prix/Facturation' },
  { id: 'COMMUNICATION', label: 'Communication' },
  { id: 'NO_SHOW', label: 'Absence' },
  { id: 'OTHER', label: 'Autre' },
];

export default function ClientDisputesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [missions, setMissions] = useState<Array<{ id: string; title: string }>>([]);

  // New dispute form
  const [newDispute, setNewDispute] = useState({
    missionId: '',
    type: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDisputes();
    loadMissions();
  }, []);

  const loadDisputes = async () => {
    try {
      const response = await apiClient.get('/disputes');
      setDisputes(response.data);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    try {
      const response = await apiClient.get('/missions');
      // Filter missions that are completed or in progress
      const eligibleMissions = response.data.filter(
        (m: { status: string }) => ['IN_PROGRESS', 'COMPLETED'].includes(m.status)
      );
      setMissions(eligibleMissions);
    } catch (error) {
      console.error('Error loading missions:', error);
    }
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDispute.missionId || !newDispute.type || !newDispute.description) {
      toast({
        title: t('common', 'error'),
        description: t('disputes', 'fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.post('/disputes', newDispute);
      setDisputes([response.data, ...disputes]);
      setShowNewDispute(false);
      setNewDispute({ missionId: '', type: '', description: '' });
      toast({
        title: t('common', 'success'),
        description: t('disputes', 'created'),
      });
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDispute = async (disputeId: string) => {
    if (!confirm(t('disputes', 'confirmCancel'))) return;

    try {
      await apiClient.post(`/disputes/${disputeId}/cancel`);
      setDisputes(
        disputes.map((d) => (d.id === disputeId ? { ...d, status: 'CLOSED' } : d))
      );
      toast({
        title: t('common', 'success'),
        description: t('disputes', 'cancelled'),
      });
    } catch (error) {
      console.error('Error cancelling dispute:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          ← {t('common', 'back')}
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('disputes', 'title')}</h1>
            <p className="text-gray-600 mt-1">{t('disputes', 'subtitle')}</p>
          </div>
          <Button onClick={() => setShowNewDispute(true)}>
            {t('disputes', 'newDispute')}
          </Button>
        </div>

        {/* New Dispute Form */}
        {showNewDispute && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('disputes', 'createDispute')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDispute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('disputes', 'selectMission')} *
                  </label>
                  <select
                    value={newDispute.missionId}
                    onChange={(e) =>
                      setNewDispute({ ...newDispute, missionId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('common', 'select')}</option>
                    {missions.map((mission) => (
                      <option key={mission.id} value={mission.id}>
                        {mission.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('disputes', 'type')} *
                  </label>
                  <select
                    value={newDispute.type}
                    onChange={(e) => setNewDispute({ ...newDispute, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('common', 'select')}</option>
                    {DISPUTE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('disputes', 'description')} *
                  </label>
                  <textarea
                    value={newDispute.description}
                    onChange={(e) =>
                      setNewDispute({ ...newDispute, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    placeholder={t('disputes', 'descriptionPlaceholder')}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t('common', 'submitting') : t('disputes', 'submit')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewDispute(false)}
                  >
                    {t('common', 'cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{disputes.length}</div>
              <div className="text-sm text-gray-600">{t('disputes', 'total')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {disputes.filter((d) => d.status === 'OPEN').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'open')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {disputes.filter((d) => d.status === 'UNDER_REVIEW').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'underReview')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {disputes.filter((d) => d.status === 'RESOLVED').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'resolved')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">⚖️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('disputes', 'noDisputes')}
              </h3>
              <p className="text-gray-600">{t('disputes', 'noDisputesDesc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <Card key={dispute.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {dispute.mission.title}
                        </h3>
                        <Badge className={STATUS_COLORS[dispute.status]}>
                          {translateDisputeStatus(dispute.status, t)}
                        </Badge>
                      </div>
                      {dispute.mission.artisan && (
                        <p className="text-sm text-gray-600">
                          Artisan: {dispute.mission.artisan.firstName}{' '}
                          {dispute.mission.artisan.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {formatDate(dispute.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="text-sm text-gray-600 mb-1">
                      Type:{' '}
                      <span className="font-medium">
                        {DISPUTE_TYPES.find((t) => t.id === dispute.type)?.label || dispute.type}
                      </span>
                    </div>
                    <p className="text-gray-800">{dispute.description}</p>
                  </div>

                  {dispute.resolution && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                      <div className="text-sm font-medium text-green-800 mb-1">
                        {t('disputes', 'resolution')}
                      </div>
                      <p className="text-green-700">{dispute.resolution}</p>
                      {dispute.resolvedAt && (
                        <p className="text-xs text-green-600 mt-2">
                          {t('disputes', 'resolvedOn')} {formatDate(dispute.resolvedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {dispute.status === 'OPEN' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleCancelDispute(dispute.id)}
                      >
                        {t('disputes', 'cancel')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
