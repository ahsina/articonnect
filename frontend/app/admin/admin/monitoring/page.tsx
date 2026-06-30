'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  MonitoringDashboard,
  MonitoringHealthStatus,
  MonitoringAlerts,
} from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MonitoringPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [health, setHealth] = useState<MonitoringHealthStatus | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, healthData, alertsData] = await Promise.all([
        adminApi.getMonitoringDashboard(),
        adminApi.getMonitoringHealth(),
        adminApi.getMonitoringAlerts(),
      ]);
      setDashboard(dashboardData);
      setHealth(healthData);
      setAlerts(alertsData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading monitoring data:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminMonitoring', 'loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'text-green-600 bg-green-500/15';
      case 'GOOD':
        return 'text-primary bg-primary/10';
      case 'FAIR':
        return 'text-yellow-600 bg-yellow-500/15';
      case 'POOR':
        return 'text-red-600 bg-red-500/15';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-500 bg-red-500/10';
      case 'WARNING':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'INFO':
        return 'border-primary bg-primary/10';
      default:
        return 'border-border bg-background';
    }
  };

  const getCheckStatusIcon = (status: string) => {
    return status === 'OK' ? '✅' : '⚠️';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!dashboard || !health) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error || t('adminMonitoring', 'loadDataError')}</div>
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
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              ← {t('adminMonitoring', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminMonitoring', 'title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('adminMonitoring', 'subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {refreshing ? t('adminMonitoring', 'refreshing') : t('adminMonitoring', 'refresh')}
          </button>
        </div>

        {/* Health Score Banner */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div
                  className={`text-5xl font-bold px-6 py-3 rounded-lg ${getHealthColor(health.status)}`}
                >
                  {health.score}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t('adminMonitoring', 'systemHealth')}: {health.status}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {t('adminMonitoring', 'lastChecked')}: {new Date(health.lastCheck).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {alerts && (
                  <>
                    {alerts.critical > 0 && (
                      <div className="text-center px-4 py-2 bg-red-500/15 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{alerts.critical}</div>
                        <div className="text-xs text-red-600">{t('adminMonitoring', 'critical')}</div>
                      </div>
                    )}
                    {alerts.warnings > 0 && (
                      <div className="text-center px-4 py-2 bg-yellow-500/15 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{alerts.warnings}</div>
                        <div className="text-xs text-yellow-600">{t('adminMonitoring', 'warnings')}</div>
                      </div>
                    )}
                    <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{alerts.info}</div>
                      <div className="text-xs text-primary">{t('adminMonitoring', 'info')}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMonitoring', 'totalMissions')}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {dashboard.overview.totalMissions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dashboard.overview.missionsLast24h} {t('adminMonitoring', 'today')}
                  </p>
                </div>
                <span className="text-4xl">📋</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMonitoring', 'autoValidated')}</p>
                  <p className="text-3xl font-bold text-green-600">
                    {dashboard.overview.autoValidatedMissions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dashboard.overview.autoValidationRate} {t('adminMonitoring', 'rate')}
                  </p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMonitoring', 'pendingValidations')}</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {dashboard.overview.pendingValidations}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{t('adminMonitoring', 'awaitingClient')}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMonitoring', 'cancelled')}</p>
                  <p className="text-3xl font-bold text-red-600">
                    {dashboard.overview.cancelledMissions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{t('adminMonitoring', 'bySystemUsers')}</p>
                </div>
                <span className="text-4xl">❌</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Checks & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Health Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🔍</span>
                {t('adminMonitoring', 'healthChecks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(health.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{check.value}</span>
                      <span>{getCheckStatusIcon(check.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>💡</span>
                {t('adminMonitoring', 'recommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {health.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span className="text-foreground">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        {alerts && alerts.alerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🚨</span>
                {t('adminMonitoring', 'activeAlerts')} ({alerts.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border-l-4 rounded-r-lg ${getAlertColor(alert.level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{alert.message}</div>
                        <div className="text-sm text-muted-foreground mt-1">{alert.recommendation}</div>
                      </div>
                      {alert.actionUrl && (
                        <button
                          onClick={() => router.push(alert.actionUrl!)}
                          className="text-sm text-primary hover:text-primary"
                        >
                          {t('adminMonitoring', 'takeAction')} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auto-Validation Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📊</span>
              {t('adminMonitoring', 'autoValidationStats')}
            </CardTitle>
            <CardDescription>
              {t('adminMonitoring', 'last30Days')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {dashboard.autoValidation.total}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMonitoring', 'totalAutoValidated')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {dashboard.autoValidation.totalAmount}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMonitoring', 'totalAmount')}</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {dashboard.autoValidation.avgDelayHours}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMonitoring', 'avgDelay')}</div>
              </div>
            </div>

            {dashboard.autoValidation.recentAutoValidations.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-3">{t('adminMonitoring', 'recentAutoValidations')}</h4>
                <div className="space-y-2">
                  {dashboard.autoValidation.recentAutoValidations.slice(0, 5).map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between py-2 border-b border-border"
                    >
                      <span className="text-foreground">{mission.title}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-green-600 font-medium">
                          {mission.amount.toLocaleString('fr-FR')}€
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(mission.validatedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trends & Predictions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📈</span>
              {t('adminMonitoring', 'trendsPredictions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">{t('adminMonitoring', 'currentGrowth')}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('adminMonitoring', 'missionsGrowth')}</span>
                    <span
                      className={`font-semibold ${parseFloat(dashboard.trends.missionsGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {dashboard.trends.missionsGrowth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('adminMonitoring', 'autoValidationGrowth')}</span>
                    <span
                      className={`font-semibold ${parseFloat(dashboard.trends.autoValidationGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {dashboard.trends.autoValidationGrowth}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-3">{t('adminMonitoring', 'nextMonthPredictions')}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('adminMonitoring', 'expectedMissions')}</span>
                    <span className="font-semibold text-foreground">
                      {dashboard.trends.prediction.nextMonthMissions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('adminMonitoring', 'expectedAutoValidations')}</span>
                    <span className="font-semibold text-foreground">
                      {dashboard.trends.prediction.nextMonthAutoValidations}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Cleanup Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🧹</span>
              {t('adminMonitoring', 'systemCleanup')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {dashboard.cleanup.cancelledBySystemLast30Days}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMonitoring', 'cancelled30d')}</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {dashboard.cleanup.oldPendingMissions}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMonitoring', 'oldPending')}</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-sm font-medium text-foreground">
                  {dashboard.cleanup.cleanupFrequency}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMonitoring', 'cleanupSchedule')}</div>
              </div>
            </div>
            {dashboard.cleanup.nextCleanupRecommended && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <span className="text-yellow-400">
                  {t('adminMonitoring', 'cleanupRecommended')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer with generated time */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t('adminMonitoring', 'dataGeneratedAt')}: {new Date(dashboard.generatedAt).toLocaleString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
