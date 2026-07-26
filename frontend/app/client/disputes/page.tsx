'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
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
  OPEN: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-primary/10 text-primary',
  RESOLVED: 'bg-green-100 text-green-700',
  ESCALATED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-muted text-foreground',
};

const DISPUTE_TYPES = [
  { id: 'QUALITY', labelKey: 'typeQuality' },
  { id: 'DELAY', labelKey: 'typeDelay' },
  { id: 'PRICE', labelKey: 'typePrice' },
  { id: 'COMMUNICATION', labelKey: 'typeCommunication' },
  { id: 'NO_SHOW', labelKey: 'typeNoShow' },
  { id: 'OTHER', labelKey: 'typeOther' },
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
      // Le backend attend `reason` (pas `type`) : on mappe le motif choisi.
      const response = await apiClient.post('/disputes', {
        missionId: newDispute.missionId,
        reason: newDispute.type,
        description: newDispute.description,
      });
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
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-9">
      <div className="max-w-[840px] mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="text-[13.5px] font-semibold text-muted-foreground mb-4 hover:text-foreground"
        >
          {t('common', 'back')}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">{t('disputes', 'title')}</h1>
            <p className="text-muted-foreground mt-1.5">{t('disputes', 'subtitle')}</p>
          </div>
          <Button onClick={() => setShowNewDispute(true)}>
            {t('disputes', 'newDispute')}
          </Button>
        </div>

        {/* New Dispute Form */}
        {showNewDispute && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('disputes', 'createDispute')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDispute} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-foreground mb-2">
                    {t('disputes', 'selectMission')} *
                  </label>
                  <select
                    value={newDispute.missionId}
                    onChange={(e) =>
                      setNewDispute({ ...newDispute, missionId: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground focus:outline focus:outline-2 focus:outline-foreground focus:-outline-offset-1"
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
                  <label className="block text-[13px] font-semibold text-foreground mb-2">
                    {t('disputes', 'type')} *
                  </label>
                  <select
                    value={newDispute.type}
                    onChange={(e) => setNewDispute({ ...newDispute, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground focus:outline focus:outline-2 focus:outline-foreground focus:-outline-offset-1"
                    required
                  >
                    <option value="">{t('common', 'select')}</option>
                    {DISPUTE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {t('disputes', type.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-foreground mb-2">
                    {t('disputes', 'description')} *
                  </label>
                  <textarea
                    value={newDispute.description}
                    onChange={(e) =>
                      setNewDispute({ ...newDispute, description: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground focus:outline focus:outline-2 focus:outline-foreground focus:-outline-offset-1 min-h-[120px] resize-none"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
          <Card>
            <CardContent className="p-4 pt-4 text-center">
              <div className="font-display text-[26px] font-extrabold text-foreground">{disputes.length}</div>
              <div className="text-[13px] text-muted-foreground">{t('disputes', 'total')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pt-4 text-center">
              <div className="font-display text-[26px] font-extrabold text-foreground">
                {disputes.filter((d) => d.status === 'OPEN').length}
              </div>
              <div className="text-[13px] text-muted-foreground">{t('status', 'open')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pt-4 text-center">
              <div className="font-display text-[26px] font-extrabold text-blue-600">
                {disputes.filter((d) => d.status === 'UNDER_REVIEW').length}
              </div>
              <div className="text-[13px] text-muted-foreground">{t('status', 'underReview')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pt-4 text-center">
              <div className="font-display text-[26px] font-extrabold text-foreground">
                {disputes.filter((d) => d.status === 'RESOLVED').length}
              </div>
              <div className="text-[13px] text-muted-foreground">{t('status', 'resolved')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <Card>
            <CardContent className="p-12 pt-12 text-center">
              <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                {t('disputes', 'noDisputes')}
              </h3>
              <p className="text-muted-foreground">{t('disputes', 'noDisputesDesc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <Card key={dispute.id}>
                <CardContent className="p-[22px] pt-[22px]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-[17px] font-bold text-foreground">
                          {dispute.mission.title}
                        </h3>
                        <Badge className={STATUS_COLORS[dispute.status]}>
                          {translateDisputeStatus(dispute.status, t)}
                        </Badge>
                      </div>
                      {dispute.mission.artisan && (
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {t('disputes', 'artisanLabel') || 'Artisan'} : {dispute.mission.artisan.firstName}{' '}
                          {dispute.mission.artisan.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-[13px] text-muted-foreground shrink-0">
                      {formatDate(dispute.createdAt)}
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-xl mt-3">
                    <div className="text-[12.5px] text-muted-foreground mb-1">
                      {t('disputes', 'type')} :{' '}
                      <span className="font-semibold text-foreground">
                        {(() => {
                          const dt = DISPUTE_TYPES.find((x) => x.id === dispute.type);
                          return dt ? t('disputes', dt.labelKey) : dispute.type;
                        })()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">{dispute.description}</p>
                  </div>

                  {/* Timeline de suivi — dérivée du statut réel (données honnêtes, pas de dates fabriquées) */}
                  {['OPEN', 'UNDER_REVIEW'].includes(dispute.status) && (
                    <div className="mt-4 pl-1.5">
                      <div className="flex gap-3 relative pb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0 mt-1 z-10" />
                        <span className="absolute left-[5px] top-3.5 bottom-0 w-0.5 bg-border" />
                        <div className="text-[13.5px]">
                          <div className="font-semibold text-foreground">{t('disputes', 'tlCreated') || 'Litige créé'}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(dispute.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex gap-3 relative pb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0 mt-1 z-10" />
                        <span className="absolute left-[5px] top-3.5 bottom-0 w-0.5 bg-border" />
                        <div className="text-[13.5px]">
                          <div className="font-semibold text-foreground">
                            {dispute.status === 'UNDER_REVIEW'
                              ? (t('disputes', 'tlSupport') || 'Pris en charge par le support')
                              : (t('disputes', 'tlNotified') || 'Artisan notifié')}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-card border-2 border-border shrink-0 mt-1 z-10" />
                        <div className="text-[13.5px]">
                          <div className="font-medium text-muted-foreground">
                            {dispute.status === 'UNDER_REVIEW'
                              ? (t('disputes', 'tlDeciding') || 'Décision en cours')
                              : (t('disputes', 'tlAwaiting') || "En attente de réponse de l'artisan")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {dispute.resolution && (
                    <div className="bg-green-50 rounded-xl p-4 mt-3 text-sm text-green-700">
                      <div className="font-bold mb-1">
                        {t('disputes', 'resolution')}
                      </div>
                      <p className="break-words">{dispute.resolution}</p>
                      {dispute.resolvedAt && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {t('disputes', 'resolvedOn')} {formatDate(dispute.resolvedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {dispute.status === 'OPEN' && (
                    <div className="mt-4 pt-3.5 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
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
