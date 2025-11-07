'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, DashboardStats } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      if (error.response?.status === 403) {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Erreur de chargement des statistiques</div>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color = 'blue',
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => {
    const colorClasses: any = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de bord administrateur
          </h1>
          <p className="text-gray-600 mt-2">
            Vue d'ensemble de la plateforme ArtiConnect
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Utilisateurs totaux"
            value={stats.totalUsers}
            subtitle={`${stats.newUsers7d} nouveaux (7j)`}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Clients"
            value={stats.totalClients}
            subtitle="Utilisateurs clients"
            icon="👤"
            color="green"
          />
          <StatCard
            title="Artisans"
            value={stats.totalArtisans}
            subtitle="Professionnels actifs"
            icon="🔧"
            color="purple"
          />
          <StatCard
            title="Missions totales"
            value={stats.totalMissions}
            subtitle={`${stats.pendingMissions} en attente`}
            icon="📋"
            color="yellow"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Missions complétées"
            value={stats.completedMissions}
            subtitle={`${Math.round((stats.completedMissions / stats.totalMissions) * 100)}% du total`}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Revenu total"
            value={`${stats.totalRevenue.toLocaleString('fr-FR')}€`}
            subtitle="Volume d'affaires"
            icon="💰"
            color="green"
          />
          <StatCard
            title="Commission plateforme"
            value={`${stats.platformRevenue.toLocaleString('fr-FR')}€`}
            subtitle={`${Math.round((stats.platformRevenue / stats.totalRevenue) * 100)}% commission`}
            icon="💳"
            color="blue"
          />
          <StatCard
            title="Utilisateurs actifs"
            value={stats.activeUsers30d}
            subtitle="Derniers 30 jours"
            icon="📈"
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader onClick={() => router.push('/admin/users')}>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">👥</span>
                <div>
                  <div className="text-lg">Gestion des utilisateurs</div>
                  <div className="text-sm font-normal text-gray-500">
                    Voir et gérer tous les utilisateurs
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader onClick={() => router.push('/admin/missions')}>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <div className="text-lg">Gestion des missions</div>
                  <div className="text-sm font-normal text-gray-500">
                    Suivre et modérer les missions
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader onClick={() => router.push('/admin/analytics')}>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <div>
                  <div className="text-lg">Analytiques</div>
                  <div className="text-sm font-normal text-gray-500">
                    Rapports et analyses détaillées
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Fonctionnalité en cours de développement</p>
              <p className="text-sm mt-2">
                Affichera les dernières actions sur la plateforme
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
