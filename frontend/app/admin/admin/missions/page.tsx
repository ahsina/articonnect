'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, BusinessMetrics } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MissionsManagementPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await adminApi.getBusinessMetrics();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading mission data:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminMissions', 'errorLoad'));
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
        <div className="text-red-600">{error || t('adminMissions', 'errorLoadData')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('adminMissions', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminMissions', 'title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('adminMissions', 'subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
          >
            {t('adminMissions', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'totalMissions')}</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.missions.total}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'pending')}</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.missions.pending}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'inProgress')}</p>
                  <p className="text-3xl font-bold text-primary">{metrics.missions.inProgress}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'completed')}</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.missions.completed}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span></span>
                {t('adminMissions', 'missionPerformance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'completionRate')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${metrics.missions.completionRate}%` }}
                      />
                    </div>
                    <span className="font-semibold text-foreground">
                      {(Number(metrics.missions.completionRate) || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'averageMissionValue')}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.missions.averageValue) || 0).toLocaleString('fr-FR')}€
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'totalTransactions')}</span>
                  <span className="font-semibold text-foreground">
                    {metrics.payments.totalTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{t('adminMissions', 'paymentSuccessRate')}</span>
                  <span className="font-semibold text-green-600">
                    {(Number(metrics.payments.successRate) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span></span>
                {t('adminMissions', 'disputesIssues')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'totalDisputes')}</span>
                  <span className="font-semibold text-foreground">{metrics.disputes.total}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'pendingDisputes')}</span>
                  <span
                    className={`font-semibold ${metrics.disputes.pending > 0 ? 'text-foreground' : 'text-foreground'}`}
                  >
                    {metrics.disputes.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'resolved')}</span>
                  <span className="font-semibold text-green-600">{metrics.disputes.resolved}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'resolutionRate')}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.disputes.resolutionRate) || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{t('adminMissions', 'avgResolutionTime')}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.disputes.averageResolutionTime) || 0).toFixed(1)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No-Shows */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span></span>
              {t('adminMissions', 'noShowReports')}
            </CardTitle>
            <CardDescription>
              {t('adminMissions', 'noShowReportsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.total}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'totalReports')}</div>
              </div>
              <div className="text-center p-4 bg-amber-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.pending}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'pending')}</div>
              </div>
              <div className="text-center p-4 bg-green-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.validated}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'validated')}</div>
              </div>
              <div className="text-center p-4 bg-red-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.rejected}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'rejected')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(Number(metrics.noShows.validationRate) || 0).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'validationRate')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span></span>
              {t('adminMissions', 'revenueOverview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-100 rounded-lg">
                <div className="text-3xl font-bold text-foreground">
                  {(Number(metrics.revenue.total) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'totalRevenue')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(Number(metrics.revenue.today) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'today')}</div>
              </div>
              <div className="text-center p-4 bg-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {(Number(metrics.revenue.thisWeek) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'thisWeek')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(Number(metrics.revenue.thisMonth) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'thisMonth')}</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-background rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('adminMissions', 'growth')}</span>
                <span
                  className={`text-xl font-bold ${metrics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.revenue.growth >= 0 ? '+' : ''}
                  {(Number(metrics.revenue.growth) || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminMissions', 'quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/admin/admin/moderation')}
                className="flex items-center gap-2 px-4 py-3 bg-amber-100 text-amber-800 rounded-lg hover:bg-yellow-200"
              >
                <span></span>
                <span>{t('adminMissions', 'viewDisputes')}</span>
              </button>
              <button
                onClick={() => router.push('/admin/admin/cron')}
                className="flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-blue-200"
              >
                <span></span>
                <span>{t('adminMissions', 'triggerAutoValidation')}</span>
              </button>
              <button
                onClick={() => router.push('/admin/admin/monitoring')}
                className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                <span></span>
                <span>{t('adminMissions', 'viewMonitoring')}</span>
              </button>
              <button
                onClick={() => router.push('/admin/admin/analytics')}
                className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                <span></span>
                <span>{t('adminMissions', 'analyticsDashboard')}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
