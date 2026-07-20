'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  MonitoringDashboard,
  MonitoringHealthStatus,
  MonitoringAlerts,
} from '@/lib/api/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft } from 'lucide-react';
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
        return 'text-foreground bg-muted';
      case 'GOOD':
        return 'text-primary bg-primary/10';
      case 'FAIR':
        return 'text-foreground bg-muted';
      case 'POOR':
        return 'text-foreground bg-muted';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-500 bg-red-100';
      case 'WARNING':
        return 'border-yellow-500 bg-amber-100';
      case 'INFO':
        return 'border-primary bg-primary/10';
      default:
        return 'border-border bg-background';
    }
  };

  const getHealthVariant = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
      case 'GOOD':
        return 'success' as const;
      case 'FAIR':
        return 'warning' as const;
      case 'POOR':
        return 'error' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">{t('common', 'loading')}</div>
    );
  }

  if (!dashboard || !health) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        {error || t('adminMonitoring', 'loadDataError')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('adminMonitoring', 'back')}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('adminMonitoring', 'title')}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{t('adminMonitoring', 'subtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getHealthVariant(health.status)}>
              {t('adminMonitoring', 'systemHealth')}: {health.status}
            </Badge>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t('adminMonitoring', 'refreshing') : t('adminMonitoring', 'refresh')}
            </Button>
          </div>
        </div>

        {/* Health Score Banner */}
        <Card className="mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-2xl font-display text-4xl font-extrabold ${getHealthColor(health.status)}`}
              >
                {health.score}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  {t('adminMonitoring', 'systemHealth')}: {health.status}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('adminMonitoring', 'lastChecked')}:{' '}
                  {new Date(health.lastCheck).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
            {alerts && (
              <div className="flex gap-3">
                {alerts.critical > 0 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
                    <div className="font-display text-2xl font-extrabold text-destructive">
                      {alerts.critical}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminMonitoring', 'critical')}
                    </div>
                  </div>
                )}
                {alerts.warnings > 0 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
                    <div className="font-display text-2xl font-extrabold text-warning">
                      {alerts.warnings}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminMonitoring', 'warnings')}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
                  <div className="font-display text-2xl font-extrabold text-primary">{alerts.info}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('adminMonitoring', 'info')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Overview Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminMonitoring', 'totalMissions')}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {dashboard.overview.totalMissions}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dashboard.overview.missionsLast24h} {t('adminMonitoring', 'today')}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminMonitoring', 'autoValidated')}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {dashboard.overview.autoValidatedMissions}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dashboard.overview.autoValidationRate} {t('adminMonitoring', 'rate')}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminMonitoring', 'pendingValidations')}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-warning">
              {dashboard.overview.pendingValidations}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('adminMonitoring', 'awaitingClient')}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('adminMonitoring', 'cancelled')}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {dashboard.overview.cancelledMissions}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('adminMonitoring', 'bySystemUsers')}
            </p>
          </Card>
        </div>

        {/* Health Checks & Recommendations */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Health Checks */}
          <Card>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-display text-base font-bold text-foreground">
                {t('adminMonitoring', 'healthChecks')}
              </h2>
            </div>
            <div>
              {Object.entries(health.checks).map(([key, check]) => (
                <div
                  key={key}
                  className="flex items-center justify-between border-b border-border px-5 py-4 last:border-0"
                >
                  <span className="flex items-center gap-2.5 text-sm text-foreground">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${check.status === 'OK' ? 'bg-success' : 'bg-warning'}`}
                    />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{check.value}</span>
                    <Badge variant={check.status === 'OK' ? 'success' : 'warning'}>
                      {check.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommendations */}
          <Card>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-display text-base font-bold text-foreground">
                {t('adminMonitoring', 'recommendations')}
              </h2>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {health.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    <span className="text-sm text-foreground">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Active Alerts */}
        {alerts && alerts.alerts.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-display text-base font-bold text-foreground">
                {t('adminMonitoring', 'activeAlerts')}
              </h2>
              <Badge variant="secondary">{alerts.total}</Badge>
            </div>
            <div className="space-y-4 p-5">
              {alerts.alerts.map((alert, idx) => (
                <div key={idx} className={`rounded-r-lg border-l-4 p-4 ${getAlertColor(alert.level)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-foreground">{alert.message}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{alert.recommendation}</div>
                    </div>
                    {alert.actionUrl && (
                      <button
                        onClick={() => router.push(alert.actionUrl!)}
                        className="whitespace-nowrap text-sm font-medium text-primary hover:underline"
                      >
                        {t('adminMonitoring', 'takeAction')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Auto-Validation Stats */}
        <Card className="mb-6">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminMonitoring', 'autoValidationStats')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('adminMonitoring', 'last30Days')}</p>
          </div>
          <div className="p-5">
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="font-display text-3xl font-extrabold text-success">
                  {dashboard.autoValidation.total}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('adminMonitoring', 'totalAutoValidated')}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="font-display text-3xl font-extrabold text-primary">
                  {dashboard.autoValidation.totalAmount}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('adminMonitoring', 'totalAmount')}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="font-display text-3xl font-extrabold text-foreground">
                  {dashboard.autoValidation.avgDelayHours}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('adminMonitoring', 'avgDelay')}
                </div>
              </div>
            </div>

            {dashboard.autoValidation.recentAutoValidations.length > 0 && (
              <div>
                <h4 className="mb-3 font-display text-sm font-bold text-foreground">
                  {t('adminMonitoring', 'recentAutoValidations')}
                </h4>
                <div>
                  {dashboard.autoValidation.recentAutoValidations.slice(0, 5).map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between border-b border-border py-3 last:border-0"
                    >
                      <span className="text-sm text-foreground">{mission.title}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-success">
                          {(Number(mission.amount) || 0).toLocaleString('fr-FR')}€
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(mission.validatedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Trends & Predictions */}
        <Card className="mb-6">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminMonitoring', 'trendsPredictions')}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
            <div>
              <h4 className="mb-3 font-display text-sm font-bold text-foreground">
                {t('adminMonitoring', 'currentGrowth')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('adminMonitoring', 'missionsGrowth')}
                  </span>
                  <span
                    className={`font-semibold ${parseFloat(dashboard.trends.missionsGrowth) >= 0 ? 'text-success' : 'text-destructive'}`}
                  >
                    {dashboard.trends.missionsGrowth}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('adminMonitoring', 'autoValidationGrowth')}
                  </span>
                  <span
                    className={`font-semibold ${parseFloat(dashboard.trends.autoValidationGrowth) >= 0 ? 'text-success' : 'text-destructive'}`}
                  >
                    {dashboard.trends.autoValidationGrowth}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-bold text-foreground">
                {t('adminMonitoring', 'nextMonthPredictions')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('adminMonitoring', 'expectedMissions')}
                  </span>
                  <span className="font-semibold text-foreground">
                    {dashboard.trends.prediction.nextMonthMissions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('adminMonitoring', 'expectedAutoValidations')}
                  </span>
                  <span className="font-semibold text-foreground">
                    {dashboard.trends.prediction.nextMonthAutoValidations}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* System Cleanup Info */}
        <Card>
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminMonitoring', 'systemCleanup')}
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="font-display text-2xl font-extrabold text-foreground">
                  {dashboard.cleanup.cancelledBySystemLast30Days}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('adminMonitoring', 'cancelled30d')}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="font-display text-2xl font-extrabold text-foreground">
                  {dashboard.cleanup.oldPendingMissions}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('adminMonitoring', 'oldPending')}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="text-sm font-semibold text-foreground">
                  {dashboard.cleanup.cleanupFrequency}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('adminMonitoring', 'cleanupSchedule')}
                </div>
              </div>
            </div>
            {dashboard.cleanup.nextCleanupRecommended && (
              <div className="mt-4 rounded-xl border border-border bg-warning/10 p-3">
                <span className="text-sm text-warning">{t('adminMonitoring', 'cleanupRecommended')}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Footer with generated time */}
        <div className="mt-6 text-center font-mono text-xs text-muted-foreground">
          {t('adminMonitoring', 'dataGeneratedAt')}:{' '}
          {new Date(dashboard.generatedAt).toLocaleString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
