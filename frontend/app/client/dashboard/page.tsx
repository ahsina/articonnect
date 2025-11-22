'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { missionsApi } from '@/lib/api/missions';
import { useAuth } from '@/contexts/AuthContext';
import { Mission, MissionStatus } from '@/types/mission';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUS_BADGES: Record<MissionStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  NEGOTIATING: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ClientDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await missionsApi.getAll();
      setMissions(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: MissionStatus): string => {
    return STATUS_BADGES[status] || 'bg-gray-100 text-gray-800';
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                ArtiConnect
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/client/missions">
                <Button variant="ghost">{t('missions', 'myMissions')}</Button>
              </Link>
              <Link href="/client/artisans">
                <Button variant="ghost">{t('missions', 'findArtisan')}</Button>
              </Link>
              <Link href="/client/marketplace">
                <Button variant="ghost">{t('marketplace', 'title')}</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
              >
                {t('common', 'logout')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('missions', 'welcomeClient')}, {user?.firstName || 'Client'} !
          </h1>
          <p className="text-gray-600">
            {t('missions', 'manageRequests')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Link
            href="/client/missions/new"
            className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition"
          >
            <div className="text-3xl mb-2">🔧</div>
            <h3 className="text-xl font-semibold mb-2">Nouvelle Demande</h3>
            <p className="text-blue-100">Créer une demande d'intervention</p>
          </Link>

          <Link
            href="/client/artisans"
            className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition"
          >
            <div className="text-3xl mb-2">👷</div>
            <h3 className="text-xl font-semibold mb-2">Trouver un Artisan</h3>
            <p className="text-green-100">Parcourir les artisans locaux</p>
          </Link>

          <Link
            href="/client/marketplace"
            className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition"
          >
            <div className="text-3xl mb-2">🛒</div>
            <h3 className="text-xl font-semibold mb-2">Marketplace</h3>
            <p className="text-purple-100">Acheter des produits</p>
          </Link>
        </div>

        {/* Recent Missions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mes Missions Récentes</h2>

          {missions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune mission pour le moment
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première demande d'intervention
              </p>
              <Link href="/client/missions/new">
                <Button>Créer une demande</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {missions.slice(0, 5).map((mission) => (
                <Link
                  key={mission.id}
                  href={`/client/missions/${mission.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mission.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {mission.city} • {mission.category}
                      </p>
                      {mission.artisan && (
                        <p className="text-gray-600 text-sm">
                          Artisan: {mission.artisan.firstName} {mission.artisan.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          mission.status
                        )}`}
                      >
                        {mission.status}
                      </span>
                      {mission.agreedPrice && (
                        <div className="text-lg font-bold text-gray-900 mt-2">
                          {mission.agreedPrice}€
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
