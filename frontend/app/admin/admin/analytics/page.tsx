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
    { name: t('adminAnalytics', 'pending'), value: metrics.missions.pending, color: COLORS[2] },
    {
      name: t('adminAnalytics', 'inProgress'),
      value: metrics.missions.inProgress,
      color: COLORS[0],
    },
    { name: t('adminAnalytics', 'completed'), value: metrics.missions.completed, color: COLORS[1] },
  ];

  const userTypeData = [
    { name: t('adminAnalytics', 'clients'), value: metrics.users.clients, color: COLORS[0] },
    { name: t('adminAnalytics', 'artisans'), value: metrics.users.artisans, color: COLORS[4] },
  ];

  const disputeData = [
    { name: t('adminAnalytics', 'inProgress'), value: metrics.disputes.pending },
    { name: t('adminAnalytics', 'resolved'), value: metrics.disputes.resolved },
  ];

  const noShowData = [
    { name: t('adminAnalytics', 'validated'), value: metrics.noShows.validated },
    { name: t('adminAnalytics', 'rejected'), value: metrics.noShows.rejected },
    { name: t('adminAnalytics', 'pending'), value: metrics.noShows.pending },
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
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border'
              }`}
            >
              {t('admin', 'lastDays').replace('{days}', '7')}
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-4 py-2 rounded-lg ${
                days === 30
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border'
              }`}
            >
              {t('admin', 'lastDays').replace('{days}', '30')}
            </button>
            <button
              onClick={() => setDays(90)}
              className={`px-4 py-2 rounded-lg ${
                days === 90
                  ? 'bg-primary text-primary-foreground'
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
            value={`${(Number(metrics.revenue.total) || 0).toLocaleString('fr-FR')}€`}
            trend={metrics.revenue.growth}
            color="green"
          />
          <MetricCard
            title={t('admin', 'thisMonth')}
            value={`${(Number(metrics.revenue.thisMonth) || 0).toLocaleString('fr-FR')}€`}
            color="blue"
          />
          <MetricCard
            title={t('admin', 'thisWeek')}
            value={`${(Number(metrics.revenue.thisWeek) || 0).toLocaleString('fr-FR')}€`}
            color="purple"
          />
          <MetricCard
            title={t('admin', 'today')}
            value={`${(Number(metrics.revenue.today) || 0).toLocaleString('fr-FR')}€`}
            color="yellow"
          />
        </div>

        {/* Time Series Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('adminAnalytics', 'evolutionPrefix')} ({days} {t('adminAnalytics', 'evolutionSuffix')})</CardTitle>
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
                  name={t('adminAnalytics', 'revenueLegend')}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="missions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  name={t('adminAnalytics', 'missionsLegend')}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name={t('adminAnalytics', 'newUsersLegend')}
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
              <CardTitle>{t('adminAnalytics', 'missionStatus')}</CardTitle>
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
                  {t('adminAnalytics', 'completionRate')}:{' '}
                  <span className="font-bold text-green-600">
                    {metrics.missions.completionRate}%
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('adminAnalytics', 'averageValue')}:{' '}
                  <span className="font-bold">
                    {(Number(metrics.missions.averageValue) || 0).toLocaleString('fr-FR')}€
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminAnalytics', 'userDistribution')}</CardTitle>
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
                  {t('adminAnalytics', 'totalUsers')}:{' '}
                  <span className="font-bold">{metrics.users.total}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('adminAnalytics', 'newToday')}:{' '}
                  <span className="font-bold text-primary">
                    {metrics.users.newToday}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('adminAnalytics', 'activeUsers')}:{' '}
                  <span className="font-bold text-foreground">
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
              <CardTitle>{t('adminAnalytics', 'disputes')}</CardTitle>
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
                  <p className="text-sm text-muted-foreground">{t('adminAnalytics', 'resolutionRate')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {metrics.disputes.resolutionRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('adminAnalytics', 'avgResolutionTime')}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {(Number(metrics.disputes.averageResolutionTime) || 0).toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No-Show Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminAnalytics', 'noShows')}</CardTitle>
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
                <p className="text-sm text-muted-foreground">{t('adminAnalytics', 'validationRate')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.noShows.validationRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.noShows.total} {t('adminAnalytics', 'casesTotal')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('adminAnalytics', 'paymentStats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('adminAnalytics', 'successRate')}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics.payments.successRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('adminAnalytics', 'totalTransactions')}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {metrics.payments.totalTransactions}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{t('adminAnalytics', 'averageTransaction')}</p>
                <p className="text-3xl font-bold text-foreground">
                  {(Number(metrics.payments.averageTransaction) || 0).toLocaleString('fr-FR')}€
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('adminAnalytics', 'failedTransactions')}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics.payments.failedTransactions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Artisans */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminAnalytics', 'topArtisans')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t('adminAnalytics', 'rank')}</th>
                    <th className="text-left py-3 px-4">{t('adminAnalytics', 'name')}</th>
                    <th className="text-center py-3 px-4">
                      {t('adminAnalytics', 'completedMissions')}
                    </th>
                    <th className="text-center py-3 px-4">{t('adminAnalytics', 'rating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topArtisans.map((artisan, index) => (
                    <tr key={artisan.id} className="border-b hover:bg-accent">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            index === 0
                              ? 'bg-amber-100 text-amber-800'
                              : index === 1
                              ? 'bg-muted text-foreground'
                              : index === 2
                              ? 'bg-amber-100 text-amber-800'
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
                          <span className="text-foreground"></span>
                          <span className="font-semibold">
                            {(Number(artisan.rating) || 0).toFixed(1)}
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
  const { t } = useLanguage();
  // Charte Uber : cartes KPI monochromes (plus d'aplats pastel).
  const colorClasses: Record<string, string> = {
    blue: 'bg-card', green: 'bg-card', yellow: 'bg-card', purple: 'bg-card', red: 'bg-card',
  };

  return (
    <Card className={`${colorClasses[color]} border`}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {trend !== undefined && (
          <p
            className={`text-sm mt-2 flex items-center gap-1 ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <span>{trend >= 0 ? '' : ''}</span>
            <span>
              {(Number(Math.abs(trend)) || 0).toFixed(1)}% {t('adminAnalytics', 'vsLastMonth')}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
