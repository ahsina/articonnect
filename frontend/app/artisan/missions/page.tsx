'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { missionsApi } from '@/lib/api/missions';
import { useLanguage } from '@/contexts/LanguageContext';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  price: number;
  client: {
    firstName: string;
    lastName: string;
    avatar?: string;
    city: string;
  };
  address: string;
  city: string;
  scheduledDate?: string;
  createdAt: string;
  distance?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-primary/10 text-primary',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function ArtisanMissionsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS'>('all');

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('missions', 'pending'),
    ACCEPTED: t('artisan', 'accepted'),
    IN_PROGRESS: t('missions', 'inProgress'),
    COMPLETED: t('missions', 'completed'),
    CANCELLED: t('missions', 'cancelled'),
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const data = await missionsApi.getAll();
      setMissions(data);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(
    (mission) => filter === 'all' || mission.status === filter
  );

  const handleAcceptMission = async (missionId: string) => {
    try {
      await missionsApi.accept(missionId);

      setMissions(
        missions.map((m) =>
          m.id === missionId ? { ...m, status: 'ACCEPTED' as const } : m
        )
      );
    } catch (error) {
      console.error('Error accepting mission:', error);
    }
  };

  const handleStartMission = async (missionId: string) => {
    try {
      await missionsApi.updateStatus(missionId, 'IN_PROGRESS');

      setMissions(
        missions.map((m) =>
          m.id === missionId ? { ...m, status: 'IN_PROGRESS' as const } : m
        )
      );
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  const formatDate = (dateString: string) => {
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('artisan', 'myMissions')}</h1>
          <p className="text-muted-foreground">
            {t('artisan', 'manageMissions')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            {t('artisan', 'all')} ({missions.length})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            {t('missions', 'pending')} ({missions.filter((m) => m.status === 'PENDING').length})
          </Button>
          <Button
            variant={filter === 'ACCEPTED' ? 'default' : 'outline'}
            onClick={() => setFilter('ACCEPTED')}
          >
            {t('artisan', 'accepted')} ({missions.filter((m) => m.status === 'ACCEPTED').length})
          </Button>
          <Button
            variant={filter === 'IN_PROGRESS' ? 'default' : 'outline'}
            onClick={() => setFilter('IN_PROGRESS')}
          >
            {t('missions', 'inProgress')} ({missions.filter((m) => m.status === 'IN_PROGRESS').length})
          </Button>
        </div>

        {/* Missions List */}
        <div className="space-y-4">
          {filteredMissions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">{t('artisan', 'noMissionsFound')}</p>
                <Button onClick={() => router.push('/artisan/dashboard')}>
                  {t('artisan', 'backToDashboard')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMissions.map((mission) => (
              <Card key={mission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <img
                          src={mission.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={mission.client.firstName}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">
                                {mission.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {t('artisan', 'by')} {mission.client.firstName} {mission.client.lastName} • {mission.client.city}
                              </p>
                            </div>
                            <Badge className={STATUS_COLORS[mission.status]}>
                              {STATUS_LABELS[mission.status]}
                            </Badge>
                          </div>

                          <p className="text-foreground mb-3">{mission.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'category')}:</span>
                              <p className="font-semibold">{mission.category}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'price')}:</span>
                              <p className="font-semibold text-foreground">
                                {mission.price ? `${mission.price}€` : (t('artisan', 'toDefine') || 'À définir')}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'distance')}:</span>
                              <p className="font-semibold">{mission.distance ? `${mission.distance} km` : '—'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'address')}:</span>
                              <p className="font-semibold">
                                {mission.address}, {mission.city}
                              </p>
                            </div>
                          </div>

                          {mission.scheduledDate && (
                            <div className="mt-3 text-sm">
                              <span className="text-muted-foreground">{t('artisan', 'scheduledDate')}:</span>
                              <p className="font-semibold">
                                {formatDate(mission.scheduledDate)}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/artisan/missions/${mission.id}`)}
                            >
                              {t('artisan', 'viewDetails')}
                            </Button>

                            {mission.status === 'PENDING' && (
                              <Button
                                size="sm"
                                onClick={() => handleAcceptMission(mission.id)}
                              >
                                {t('artisan', 'acceptMission')}
                              </Button>
                            )}

                            {mission.status === 'ACCEPTED' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartMission(mission.id)}
                              >
                                {t('artisan', 'startMission')}
                              </Button>
                            )}

                            {mission.status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/artisan/missions/${mission.id}`)}
                              >
                                {t('artisan', 'completeMission')}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/client/messages?userId=${mission.client}`)}
                            >
                              {t('artisan', 'contact')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
