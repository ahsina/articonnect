'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { artisanApi } from '@/lib/api/artisan';
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
  AreaChart,
  Area,
} from 'recharts';

interface AnalyticsData {
  earnings: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    byMonth: Array<{ month: string; amount: number }>;
  };
  missions: {
    total: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
    byCategory: Array<{ category: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  performance: {
    averageRating: number;
    totalReviews: number;
    responseTime: number;
    completionRate: number;
    repeatClientRate: number;
  };
  geography: {
    topCities: Array<{ city: string; count: number; revenue: number }>;
    averageDistance: number;
  };
  trends: {
    peakHours: Array<{ hour: number; requests: number }>;
    peakDays: Array<{ day: string; requests: number }>;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ArtisanAnalyticsPage() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Try to load real data from API
      try {
        const response = await fetch(`/api/artisan/analytics?period=${period}`);
        if (response.ok) {
          const apiData = await response.json();
          if (apiData && apiData.earnings) {
            setData(apiData);
            return;
          }
        }
      } catch (apiError) {
        console.log('Analytics API not available, using demo data');
      }

      // Fallback to mock data for demonstration
      setData({
        earnings: {
          total: 45780,
          thisMonth: 8450,
          lastMonth: 7200,
          growth: 17.4,
          byMonth: [
            { month: 'Jan', amount: 5200 },
            { month: 'Feb', amount: 6100 },
            { month: 'Mar', amount: 5800 },
            { month: 'Apr', amount: 7200 },
            { month: 'May', amount: 6900 },
            { month: 'Jun', amount: 8450 },
          ],
        },
        missions: {
          total: 156,
          completed: 142,
          cancelled: 8,
          conversionRate: 78,
          byCategory: [
            { category: 'Plomberie', count: 45 },
            { category: 'Électricité', count: 38 },
            { category: 'Chauffage', count: 32 },
            { category: 'Rénovation', count: 25 },
            { category: 'Autres', count: 16 },
          ],
          byStatus: [
            { status: 'Complétées', count: 142 },
            { status: 'En cours', count: 6 },
            { status: 'Annulées', count: 8 },
          ],
        },
        performance: {
          averageRating: 4.8,
          totalReviews: 128,
          responseTime: 2.5,
          completionRate: 91,
          repeatClientRate: 34,
        },
        geography: {
          topCities: [
            { city: 'Luxembourg', count: 52, revenue: 15600 },
            { city: 'Esch-sur-Alzette', count: 34, revenue: 9800 },
            { city: 'Differdange', count: 28, revenue: 7200 },
            { city: 'Dudelange', count: 22, revenue: 6100 },
            { city: 'Pétange', count: 20, revenue: 5080 },
          ],
          averageDistance: 12.5,
        },
        trends: {
          peakHours: [
            { hour: 8, requests: 12 },
            { hour: 9, requests: 24 },
            { hour: 10, requests: 32 },
            { hour: 11, requests: 28 },
            { hour: 12, requests: 15 },
            { hour: 13, requests: 10 },
            { hour: 14, requests: 22 },
            { hour: 15, requests: 26 },
            { hour: 16, requests: 30 },
            { hour: 17, requests: 25 },
            { hour: 18, requests: 18 },
          ],
          peakDays: [
            { day: 'Lun', requests: 45 },
            { day: 'Mar', requests: 52 },
            { day: 'Mer', requests: 48 },
            { day: 'Jeu', requests: 55 },
            { day: 'Ven', requests: 42 },
            { day: 'Sam', requests: 28 },
            { day: 'Dim', requests: 12 },
          ],
        },
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('analytics', 'noData') || 'No data available'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const periodOptions: Array<{ v: '7d' | '30d' | '90d' | '1y'; label: string }> = [
    { v: '7d', label: t('analytics', 'last7Days') || 'Last 7 days' },
    { v: '30d', label: t('analytics', 'last30Days') || 'Last 30 days' },
    { v: '90d', label: t('analytics', 'last90Days') || 'Last 90 days' },
    { v: '1y', label: t('analytics', 'lastYear') || 'Last year' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1180px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">
            {t('analytics', 'title') || 'Analytics Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('analytics', 'subtitle') || 'Track your performance and earnings'}
          </p>
        </div>

        {/* Sélecteur de période (segmenté) */}
        <div className="inline-flex bg-muted rounded-xl p-1 gap-0.5">
          {periodOptions.map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setPeriod(opt.v)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                period === opt.v
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-[18px]">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {t('analytics', 'totalEarnings') || 'Total Earnings'}
            </div>
            <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground">
              {(Number(data.earnings.total) || 0).toLocaleString()}€
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className={`text-xs font-semibold ${data.earnings.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {data.earnings.growth >= 0 ? '▲' : '▼'} {Math.abs(data.earnings.growth)}%
              </span>
              <span className="text-xs text-muted-foreground">{t('artisanAnalytics', 'vsLastMonth') || 'vs last month'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-[18px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              {t('analytics', 'completedMissions') || 'Completed Missions'}
            </div>
            <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground">{data.missions.completed}</div>
            <div className="text-xs font-semibold text-muted-foreground mt-2.5">
              {data.missions.conversionRate}% {t('analytics', 'conversionRate') || 'conversion rate'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-[18px]">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {t('analytics', 'averageRating') || 'Average Rating'}
            </div>
            <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground">
              {data.performance.averageRating} ★
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2.5">
              {data.performance.totalReviews} {t('analytics', 'reviews') || 'reviews'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-[18px]">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {t('analytics', 'repeatClients') || 'Repeat Clients'}
            </div>
            <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground">
              {data.performance.repeatClientRate}%
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2.5">
              {t('analytics', 'returnRate') || 'client return rate'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Over Time */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-display">{t('analytics', 'earningsOverTime') || 'Earnings Over Time'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.earnings.byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}€`, t('artisanAnalytics', 'earnings') || 'Earnings']} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10B981"
                  fill="#D1FAE5"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Missions by Category */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-display">{t('analytics', 'missionsByCategory') || 'Missions by Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.missions.byCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} (${(Number(percent * 100) || 0).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.missions.byCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-display">{t('analytics', 'peakHours') || 'Peak Request Hours'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                <YAxis />
                <Tooltip labelFormatter={(h) => `${h}:00`} />
                <Bar dataKey="requests" fill="#0F0F0F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Days */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-display">{t('analytics', 'peakDays') || 'Requests by Day of Week'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.peakDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#0F0F0F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Cities Table */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-display">{t('analytics', 'topCities') || 'Top Cities by Revenue'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-5 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t('analytics', 'city') || 'City'}
                  </th>
                  <th className="text-right py-3 px-5 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t('analytics', 'missions') || 'Missions'}
                  </th>
                  <th className="text-right py-3 px-5 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t('analytics', 'revenue') || 'Revenue'}
                  </th>
                  <th className="text-right py-3 px-5 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t('analytics', 'avgPerMission') || 'Avg/Mission'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.geography.topCities.map((city, index) => (
                  <tr key={city.city} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base w-5 text-center font-bold">{['🥇', '🥈', '🥉', '4', '5'][index] ?? index + 1}</span>
                        <span className="font-medium">{city.city}</span>
                      </div>
                    </td>
                    <td className="text-right py-3.5 px-5 tabular-nums">{city.count}</td>
                    <td className="text-right py-3.5 px-5 font-semibold text-foreground tabular-nums">
                      {(Number(city.revenue) || 0).toLocaleString()}€
                    </td>
                    <td className="text-right py-3.5 px-5 text-muted-foreground tabular-nums">
                      {Math.round(city.revenue / city.count)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-display">{t('analytics', 'performanceMetrics') || 'Performance Metrics'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-5 bg-muted rounded-2xl">
              <div className="text-[23px] font-display font-extrabold tracking-tight text-foreground">
                {data.performance.responseTime}h
              </div>
              <div className="text-xs font-semibold text-muted-foreground mt-1.5">
                {t('analytics', 'avgResponseTime') || 'Avg Response Time'}
              </div>
            </div>
            <div className="text-center p-5 bg-muted rounded-2xl">
              <div className="text-[23px] font-display font-extrabold tracking-tight text-foreground">
                {data.performance.completionRate}%
              </div>
              <div className="text-xs font-semibold text-muted-foreground mt-1.5">
                {t('analytics', 'completionRate') || 'Completion Rate'}
              </div>
            </div>
            <div className="text-center p-5 bg-muted rounded-2xl">
              <div className="text-[23px] font-display font-extrabold tracking-tight text-foreground">
                {data.geography.averageDistance} km
              </div>
              <div className="text-xs font-semibold text-muted-foreground mt-1.5">
                {t('analytics', 'avgTravelDistance') || 'Avg Travel Distance'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
