'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { missionsApi } from '@/lib/api/missions';

export default function ArtisanDashboard() {
  const router = useRouter();
  const [missions, setMissions] = useState([]);
  const [nearbyMissions, setNearbyMissions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load artisan missions
      const data = await missionsApi.getAll();
      setMissions(data);

      // Load nearby missions (using geolocation)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const nearby = await missionsApi.getNearby(
            position.coords.latitude,
            position.coords.longitude,
            20
          );
          setNearbyMissions(nearby);
        });
      }

      // Calculate stats
      setStats({
        total: data.length,
        inProgress: data.filter((m: any) => m.status === 'IN_PROGRESS').length,
        completed: data.filter((m: any) => m.status === 'COMPLETED').length,
        rating: 4.8, // Would come from API
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
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
                ArtiConnect Pro
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/artisan/missions">
                <Button variant="ghost">Missions</Button>
              </Link>
              <Link href="/artisan/shop">
                <Button variant="ghost">Ma Boutique</Button>
              </Link>
              <Link href="/artisan/profile">
                <Button variant="ghost">Profil</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  localStorage.clear();
                  router.push('/');
                }}
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Missions totales</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">En cours</div>
            <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Terminées</div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Note moyenne</div>
            <div className="text-3xl font-bold text-yellow-600">
              ⭐ {stats.rating}
            </div>
          </div>
        </div>

        {/* Nearby Missions */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Missions Disponibles Près de Vous
          </h2>

          {nearbyMissions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Aucune mission disponible dans votre zone pour le moment
            </div>
          ) : (
            <div className="space-y-4">
              {nearbyMissions.slice(0, 5).map((mission: any) => (
                <div
                  key={mission.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mission.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        📍 {mission.city} • {mission.category}
                      </p>
                      {mission.clientBudget && (
                        <p className="text-green-600 font-semibold mt-2">
                          Budget client: {mission.clientBudget}€
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Link href={`/artisan/missions/${mission.id}`}>
                        <Button>Voir Détails</Button>
                      </Link>
                      {mission.type === 'EMERGENCY' && (
                        <span className="block mt-2 text-red-600 text-xs font-semibold">
                          🚨 URGENT
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Active Missions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mes Missions Actives</h2>

          {missions.filter((m: any) => ['ACCEPTED', 'IN_PROGRESS'].includes(m.status))
            .length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Aucune mission active
            </div>
          ) : (
            <div className="space-y-4">
              {missions
                .filter((m: any) => ['ACCEPTED', 'IN_PROGRESS'].includes(m.status))
                .map((mission: any) => (
                  <Link
                    key={mission.id}
                    href={`/artisan/missions/${mission.id}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {mission.title}
                        </h3>
                        <p className="text-gray-600 text-sm mt-1">
                          Client: {mission.client?.firstName} {mission.client?.lastName}
                        </p>
                        <p className="text-gray-600 text-sm">
                          📍 {mission.address}, {mission.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {mission.agreedPrice}€
                        </div>
                        <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {mission.status === 'IN_PROGRESS' ? 'En cours' : 'Acceptée'}
                        </span>
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
