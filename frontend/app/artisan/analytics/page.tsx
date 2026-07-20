'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { artisanApi, type ArtisanAnalytics } from '@/lib/api/artisan';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ArtisanAnalyticsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<ArtisanAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await artisanApi.getAnalytics();
        if (!cancelled) setData(res);
      } catch (e) {
        console.error('Error loading analytics:', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (error || !data) {
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

  // Détection d'état vide honnête : un artisan sans historique voit des zéros / des états
  // vides plutôt qu'un faux graphe.
  const earningsHasData = data.earnings.byMonth.some((m) => Number(m.amount) > 0);
  const categoryHasData = data.missions.byCategory.length > 0;
  const peakHoursHasData = data.trends.peakHours.some((h) => Number(h.requests) > 0);
  const peakDaysHasData = data.trends.peakDays.some((d) => Number(d.requests) > 0);
  const citiesHasData = data.geography.topCities.length > 0;

  const emptyChart = (
    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
      {t('analytics', 'noData') || 'No data available'}
    </div>
  );

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
            {earningsHasData ? (
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
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                {t('analytics', 'noData') || 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missions by Category */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-display">{t('analytics', 'missionsByCategory') || 'Missions by Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryHasData ? (
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
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                {t('analytics', 'noData') || 'No data available'}
              </div>
            )}
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
            {peakHoursHasData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.trends.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                  <YAxis />
                  <Tooltip labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="requests" fill="#0F0F0F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              emptyChart
            )}
          </CardContent>
        </Card>

        {/* Peak Days */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-display">{t('analytics', 'peakDays') || 'Requests by Day of Week'}</CardTitle>
          </CardHeader>
          <CardContent>
            {peakDaysHasData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.trends.peakDays}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#0F0F0F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              emptyChart
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Cities Table */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-display">{t('analytics', 'topCities') || 'Top Cities by Revenue'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {citiesHasData ? (
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
                        {city.count ? Math.round(city.revenue / city.count) : 0}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t('analytics', 'noData') || 'No data available'}
            </div>
          )}
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
