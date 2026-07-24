'use client';

import { CategoryLabel } from '@/components/shared/CategoryLabel';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { missionsApi } from '@/lib/api/missions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotificationSocket } from '@/lib/hooks/useNotificationSocket';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  price: number;
  clientId: string;
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

  // Garde anti-chevauchement pour les rafraîchissements silencieux (poll + socket).
  const refreshingRef = useRef(false);
  const { onNotification } = useNotificationSocket();

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

  // Rafraîchissement silencieux (sans spinner plein écran), ignore les appels concurrents.
  const silentRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const data = await missionsApi.getAll();
      setMissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error refreshing missions:', error);
    } finally {
      refreshingRef.current = false;
    }
  };

  // Temps réel : une nouvelle mission (NEW_MISSION) déclenche un refetch silencieux.
  useEffect(() => {
    const unsubscribe = onNotification((n) => {
      if (n && n.type === 'NEW_MISSION') {
        silentRefresh();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNotification]);

  // Repli poll : refetch silencieux toutes les 25 s (même sans socket).
  useEffect(() => {
    const interval = setInterval(() => {
      silentRefresh();
    }, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground mb-1">{t('artisan', 'myMissions')}</h1>
          <p className="text-muted-foreground">
            {t('artisan', 'manageMissions')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {([
            { key: 'all', label: `${t('artisan', 'all')} (${missions.length})` },
            { key: 'PENDING', label: `${t('missions', 'pending')} (${missions.filter((m) => m.status === 'PENDING').length})` },
            { key: 'ACCEPTED', label: `${t('artisan', 'accepted')} (${missions.filter((m) => m.status === 'ACCEPTED').length})` },
            { key: 'IN_PROGRESS', label: `${t('missions', 'inProgress')} (${missions.filter((m) => m.status === 'IN_PROGRESS').length})` },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`h-9 px-4 rounded-full border text-sm font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Missions List */}
        <div className="space-y-4">
          {filteredMissions.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl shadow-sm p-10 text-center">
              <p className="text-muted-foreground mb-4">{t('artisan', 'noMissionsFound')}</p>
              <Button onClick={() => router.push('/artisan/dashboard')}>
                {t('artisan', 'backToDashboard')}
              </Button>
            </div>
          ) : (
            filteredMissions.map((mission) => (
              <div
                key={mission.id}
                className="bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex gap-4"
              >
                <img
                  src={mission.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                  alt={mission.client.firstName}
                  className="w-14 h-14 rounded-2xl object-cover bg-muted flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {mission.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t('artisan', 'by')} {mission.client.firstName} {mission.client.lastName} · {mission.client.city}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[mission.status]}>
                      {STATUS_LABELS[mission.status]}
                    </Badge>
                  </div>

                  <p className="my-3 text-foreground/80">{mission.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3.5 border-t border-b border-border text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{t('artisan', 'category')}</div>
                      <p className="font-semibold mt-0.5"><CategoryLabel value={mission.category} /></p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('artisan', 'price')}</div>
                      <p className="font-display font-extrabold text-success mt-0.5">
                        {mission.price ? `${mission.price} €` : (t('artisan', 'toDefine') || 'À définir')}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('artisan', 'distance')}</div>
                      <p className="font-semibold mt-0.5">{mission.distance ? `${mission.distance} km` : '—'}</p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('artisan', 'address')}</div>
                      <p className="font-semibold mt-0.5">
                        {mission.address}, {mission.city}
                      </p>
                    </div>
                  </div>

                  {mission.scheduledDate && (
                    <div className="mt-3 text-sm">
                      <span className="text-xs text-muted-foreground">{t('artisan', 'scheduledDate')}</span>
                      <p className="font-semibold mt-0.5">
                        {formatDate(mission.scheduledDate)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
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
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/artisan/missions/${mission.id}`)}
                    >
                      {t('artisan', 'viewDetails')}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/artisan/messages?userId=${mission.clientId}`)}
                    >
                      {t('artisan', 'contact')}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
