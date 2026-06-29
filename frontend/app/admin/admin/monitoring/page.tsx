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
        setError('Failed to load monitoring data');
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
        <div className="text-red-600">{error || 'Failed to load data'}</div>
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
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">System Monitoring</h1>
              <p className="text-muted-foreground mt-1">
                Real-time platform health and CRON job metrics
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
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
                    System Health: {health.status}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Last checked: {new Date(health.lastCheck).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {alerts && (
                  <>
                    {alerts.critical > 0 && (
                      <div className="text-center px-4 py-2 bg-red-500/15 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{alerts.critical}</div>
                        <div className="text-xs text-red-600">Critical</div>
                      </div>
                    )}
                    {alerts.warnings > 0 && (
                      <div className="text-center px-4 py-2 bg-yellow-500/15 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{alerts.warnings}</div>
                        <div className="text-xs text-yellow-600">Warnings</div>
                      </div>
                    )}
                    <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{alerts.info}</div>
                      <div className="text-xs text-primary">Info</div>
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
                  <p className="text-sm text-muted-foreground">Total Missions</p>
                  <p className="text-3xl font-bold text-foreground">
                    {dashboard.overview.totalMissions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dashboard.overview.missionsLast24h} today
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
                  <p className="text-sm text-muted-foreground">Auto-Validated</p>
                  <p className="text-3xl font-bold text-green-600">
                    {dashboard.overview.autoValidatedMissions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dashboard.overview.autoValidationRate} rate
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
                  <p className="text-sm text-muted-foreground">Pending Validations</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {dashboard.overview.pendingValidations}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Awaiting client action</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-3xl font-bold text-red-600">
                    {dashboard.overview.cancelledMissions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">By system/users</p>
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
                Health Checks
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
                Recommendations
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
                Active Alerts ({alerts.total})
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
                          Take Action →
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
              Auto-Validation Statistics
            </CardTitle>
            <CardDescription>
              Last 30 days of auto-validated missions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {dashboard.autoValidation.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Auto-Validated</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {dashboard.autoValidation.totalAmount}
                </div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {dashboard.autoValidation.avgDelayHours}
                </div>
                <div className="text-sm text-muted-foreground">Avg Delay</div>
              </div>
            </div>

            {dashboard.autoValidation.recentAutoValidations.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-3">Recent Auto-Validations</h4>
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
              Trends & Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">Current Growth</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Missions Growth</span>
                    <span
                      className={`font-semibold ${parseFloat(dashboard.trends.missionsGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {dashboard.trends.missionsGrowth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Auto-Validation Growth</span>
                    <span
                      className={`font-semibold ${parseFloat(dashboard.trends.autoValidationGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {dashboard.trends.autoValidationGrowth}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-3">Next Month Predictions</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expected Missions</span>
                    <span className="font-semibold text-foreground">
                      {dashboard.trends.prediction.nextMonthMissions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expected Auto-Validations</span>
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
              System Cleanup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {dashboard.cleanup.cancelledBySystemLast30Days}
                </div>
                <div className="text-sm text-muted-foreground">Cancelled (30d)</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {dashboard.cleanup.oldPendingMissions}
                </div>
                <div className="text-sm text-muted-foreground">Old Pending</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-sm font-medium text-foreground">
                  {dashboard.cleanup.cleanupFrequency}
                </div>
                <div className="text-sm text-muted-foreground">Cleanup Schedule</div>
              </div>
            </div>
            {dashboard.cleanup.nextCleanupRecommended && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <span className="text-yellow-400">
                  Cleanup recommended - consider running manual cleanup
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer with generated time */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Data generated at: {new Date(dashboard.generatedAt).toLocaleString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
