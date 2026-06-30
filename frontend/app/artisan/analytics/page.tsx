'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('analytics', 'title') || 'Analytics Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {t('analytics', 'subtitle') || 'Track your performance and earnings'}
          </p>
        </div>

        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('analytics', 'last7Days') || 'Last 7 days'}</SelectItem>
            <SelectItem value="30d">{t('analytics', 'last30Days') || 'Last 30 days'}</SelectItem>
            <SelectItem value="90d">{t('analytics', 'last90Days') || 'Last 90 days'}</SelectItem>
            <SelectItem value="1y">{t('analytics', 'lastYear') || 'Last year'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 mb-1">
              {t('analytics', 'totalEarnings') || 'Total Earnings'}
            </div>
            <div className="text-3xl font-bold text-green-400">
              {data.earnings.total.toLocaleString()}€
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Badge className={data.earnings.growth >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}>
                {data.earnings.growth >= 0 ? '↑' : '↓'} {Math.abs(data.earnings.growth)}%
              </Badge>
              <span className="text-xs text-muted-foreground">{t('artisanAnalytics', 'vsLastMonth') || 'vs last month'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-sm text-primary mb-1">
              {t('analytics', 'completedMissions') || 'Completed Missions'}
            </div>
            <div className="text-3xl font-bold text-primary">{data.missions.completed}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.missions.conversionRate}% {t('analytics', 'conversionRate') || 'conversion rate'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="text-sm text-yellow-600 mb-1">
              {t('analytics', 'averageRating') || 'Average Rating'}
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              ⭐ {data.performance.averageRating}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.performance.totalReviews} {t('analytics', 'reviews') || 'reviews'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="text-sm text-purple-600 mb-1">
              {t('analytics', 'repeatClients') || 'Repeat Clients'}
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {data.performance.repeatClientRate}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t('analytics', 'returnRate') || 'client return rate'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics', 'earningsOverTime') || 'Earnings Over Time'}</CardTitle>
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
          <CardHeader>
            <CardTitle>{t('analytics', 'missionsByCategory') || 'Missions by Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.missions.byCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
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
          <CardHeader>
            <CardTitle>{t('analytics', 'peakHours') || 'Peak Request Hours'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                <YAxis />
                <Tooltip labelFormatter={(h) => `${h}:00`} />
                <Bar dataKey="requests" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Days */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics', 'peakDays') || 'Requests by Day of Week'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.peakDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Cities Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics', 'topCities') || 'Top Cities by Revenue'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('analytics', 'city') || 'City'}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t('analytics', 'missions') || 'Missions'}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t('analytics', 'revenue') || 'Revenue'}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t('analytics', 'avgPerMission') || 'Avg/Mission'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.geography.topCities.map((city, index) => (
                  <tr key={city.city} className="border-b hover:bg-accent">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]}</span>
                        <span className="font-medium">{city.city}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{city.count}</td>
                    <td className="text-right py-3 px-4 font-medium text-green-600">
                      {city.revenue.toLocaleString()}€
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
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
        <CardHeader>
          <CardTitle>{t('analytics', 'performanceMetrics') || 'Performance Metrics'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-4xl mb-2">⚡</div>
              <div className="text-2xl font-bold text-foreground">
                {data.performance.responseTime}h
              </div>
              <div className="text-sm text-muted-foreground">
                {t('analytics', 'avgResponseTime') || 'Avg Response Time'}
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-2xl font-bold text-foreground">
                {data.performance.completionRate}%
              </div>
              <div className="text-sm text-muted-foreground">
                {t('analytics', 'completionRate') || 'Completion Rate'}
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-4xl mb-2">📍</div>
              <div className="text-2xl font-bold text-foreground">
                {data.geography.averageDistance} km
              </div>
              <div className="text-sm text-muted-foreground">
                {t('analytics', 'avgTravelDistance') || 'Avg Travel Distance'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
