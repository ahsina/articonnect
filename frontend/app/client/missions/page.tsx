'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { missionsApi } from '@/lib/api/missions';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateMissionStatus } from '@/lib/utils/enum-translations';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  type: string;
  address: string;
  city: string;
  postalCode: string;
  clientBudget?: number;
  agreedPrice?: number;
  scheduledFor?: string;
  createdAt: string;
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  NEGOTIATING: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

type StatusFilter = 'all' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export default function ClientMissionsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

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

  const filteredMissions = missions
    .filter((m) => filter === 'all' || m.status === filter)
    .filter(
      (m) =>
        search === '' ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase()) ||
        m.city.toLowerCase().includes(search.toLowerCase())
    );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('missions', 'myMissions')}</h1>
            <p className="text-gray-600 mt-1">
              {missions.length} {missions.length > 1 ? 'missions' : 'mission'}
            </p>
          </div>
          <Link href="/client/missions/new">
            <Button>{t('missions', 'newRequest')}</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{missions.length}</div>
              <div className="text-sm text-gray-600">{t('missions', 'total')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {missions.filter((m) => m.status === 'PENDING').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'pending')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {missions.filter((m) => m.status === 'IN_PROGRESS').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'inProgress')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {missions.filter((m) => m.status === 'COMPLETED').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'completed')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {missions.filter((m) => m.status === 'CANCELLED').length}
              </div>
              <div className="text-sm text-gray-600">{t('status', 'cancelled')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            type="text"
            placeholder={t('common', 'search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:w-64"
          />
          <div className="flex flex-wrap gap-2">
            {(['all', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as StatusFilter[]).map(
              (status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status)}
                >
                  {status === 'all' ? t('common', 'all') : translateMissionStatus(status, t)}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Missions List */}
        {filteredMissions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('missions', 'noMissions')}
              </h3>
              <p className="text-gray-600 mb-4">{t('missions', 'createFirstRequest')}</p>
              <Link href="/client/missions/new">
                <Button>{t('missions', 'newRequest')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMissions.map((mission) => (
              <Card
                key={mission.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/client/missions/${mission.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{mission.title}</h3>
                        <Badge className={STATUS_COLORS[mission.status]}>
                          {translateMissionStatus(mission.status, t)}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{mission.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>{mission.category}</span>
                        <span>•</span>
                        <span>
                          {mission.city}, {mission.postalCode}
                        </span>
                        <span>•</span>
                        <span>{formatDate(mission.createdAt)}</span>
                      </div>

                      {mission.artisan && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                          <img
                            src={
                              mission.artisan.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${mission.artisan.id}`
                            }
                            alt={mission.artisan.firstName}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="text-sm text-gray-700">
                            {mission.artisan.firstName} {mission.artisan.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      {mission.agreedPrice ? (
                        <div className="text-xl font-bold text-gray-900">{mission.agreedPrice}€</div>
                      ) : mission.clientBudget ? (
                        <div className="text-lg text-gray-600">Budget: {mission.clientBudget}€</div>
                      ) : null}
                      {mission.scheduledFor && (
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(mission.scheduledFor)}
                        </div>
                      )}
                      {mission.agreedPrice && !['COMPLETED', 'CANCELLED', 'AUTO_VALIDATED'].includes(mission.status) && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/client/payment/${mission.id}`);
                          }}
                        >
                          💳 Payer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
