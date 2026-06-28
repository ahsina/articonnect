'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  BusinessMetrics,
  TimeSeriesData,
  TopArtisan,
} from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [topArtisans, setTopArtisans] = useState<TopArtisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    try {
      const [metricsData, timeSeriesResult, artisansData] = await Promise.all([
        adminApi.getBusinessMetrics(),
        adminApi.getTimeSeriesData(days),
        adminApi.getTopArtisans(10),
      ]);

      setMetrics(metricsData);
      setTimeSeriesData(timeSeriesResult);
      setTopArtisans(artisansData);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
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
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{t('admin', 'errorLoadingStats')}</div>
      </div>
    );
  }

  // Prepare data for charts
  const missionStatusData = [
    { name: 'En attente', value: metrics.missions.pending, color: COLORS[2] },
    {
      name: 'En cours',
      value: metrics.missions.inProgress,
      color: COLORS[0],
    },
    { name: 'Complétées', value: metrics.missions.completed, color: COLORS[1] },
  ];

  const userTypeData = [
    { name: 'Clients', value: metrics.users.clients, color: COLORS[0] },
    { name: 'Artisans', value: metrics.users.artisans, color: COLORS[4] },
  ];

  const disputeData = [
    { name: 'En cours', value: metrics.disputes.pending },
    { name: 'Résolus', value: metrics.disputes.resolved },
  ];

  const noShowData = [
    { name: 'Validés', value: metrics.noShows.validated },
    { name: 'Rejetés', value: metrics.noShows.rejected },
    { name: 'En attente', value: metrics.noShows.pending },
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('admin', 'detailedAnalytics')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('admin', 'platformInsights')}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDays(7)}
              className={`px-4 py-2 rounded-lg ${
                days === 7
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground border'
              }`}
            >
              {t('admin', 'lastDays').replace('{days}', '7')}
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-4 py-2 rounded-lg ${
                days === 30
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground border'
              }`}
            >
              {t('admin', 'lastDays').replace('{days}', '30')}
            </button>
            <button
              onClick={() => setDays(90)}
              className={`px-4 py-2 rounded-lg ${
                days === 90
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground border'
              }`}
            >
              {t('admin', 'lastDays').replace('{days}', '90')}
            </button>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t('admin', 'revenueTotal')}
            value={`${metrics.revenue.total.toLocaleString('fr-FR')}€`}
            trend={metrics.revenue.growth}
            color="green"
          />
          <MetricCard
            title={t('admin', 'thisMonth')}
            value={`${metrics.revenue.thisMonth.toLocaleString('fr-FR')}€`}
            color="blue"
          />
          <MetricCard
            title={t('admin', 'thisWeek')}
            value={`${metrics.revenue.thisWeek.toLocaleString('fr-FR')}€`}
            color="purple"
          />
          <MetricCard
            title={t('admin', 'today')}
            value={`${metrics.revenue.today.toLocaleString('fr-FR')}€`}
            color="yellow"
          />
        </div>

        {/* Time Series Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Évolution ({days} derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Revenu (€)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="missions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  name="Missions"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Nouveaux utilisateurs"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mission Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Statut des missions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={missionStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {missionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Taux de complétion:{' '}
                  <span className="font-bold text-green-600">
                    {metrics.missions.completionRate}%
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Valeur moyenne:{' '}
                  <span className="font-bold">
                    {metrics.missions.averageValue.toLocaleString('fr-FR')}€
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Total utilisateurs:{' '}
                  <span className="font-bold">{metrics.users.total}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Nouveaux aujourd'hui:{' '}
                  <span className="font-bold text-primary">
                    {metrics.users.newToday}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Actifs (30j):{' '}
                  <span className="font-bold text-purple-600">
                    {metrics.users.activeUsers}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Dispute Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Litiges</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={disputeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Taux de résolution</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.disputes.resolutionRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Temps moyen résolution
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {metrics.disputes.averageResolutionTime.toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No-Show Stats */}
          <Card>
            <CardHeader>
              <CardTitle>No-shows</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={noShowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">Taux de validation</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.noShows.validationRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.noShows.total} cas au total
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Statistiques de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Taux de succès
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics.payments.successRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Total transactions
                </p>
                <p className="text-3xl font-bold text-primary">
                  {metrics.payments.totalTransactions}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Transaction moyenne</p>
                <p className="text-3xl font-bold text-purple-600">
                  {metrics.payments.averageTransaction.toLocaleString('fr-FR')}€
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Transactions échouées
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics.payments.failedTransactions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Artisans */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Artisans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Rang</th>
                    <th className="text-left py-3 px-4">Nom</th>
                    <th className="text-center py-3 px-4">
                      Missions complétées
                    </th>
                    <th className="text-center py-3 px-4">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {topArtisans.map((artisan, index) => (
                    <tr key={artisan.id} className="border-b hover:bg-accent">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            index === 0
                              ? 'bg-yellow-500/15 text-yellow-400'
                              : index === 1
                              ? 'bg-muted text-foreground'
                              : index === 2
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{artisan.name}</td>
                      <td className="py-3 px-4 text-center">
                        {artisan.completedMissions}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-semibold">
                            {artisan.rating.toFixed(1)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  color = 'blue',
}: {
  title: string;
  value: string;
  trend?: number;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-primary/10 border-primary/20',
    green: 'bg-green-500/10 border-green-500/30',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    red: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <Card className={`${colorClasses[color]} border-2`}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {trend !== undefined && (
          <p
            className={`text-sm mt-2 flex items-center gap-1 ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span>
              {Math.abs(trend).toFixed(1)}% vs mois dernier
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
