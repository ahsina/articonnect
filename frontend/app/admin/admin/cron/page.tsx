'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  CronJobsStatus,
  CronHealth,
  AutoValidationResult,
} from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CronJobsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [status, setStatus] = useState<CronJobsStatus | null>(null);
  const [health, setHealth] = useState<CronHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AutoValidationResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusData, healthData] = await Promise.all([
        adminApi.getCronJobsStatus(),
        adminApi.getCronHealth(),
      ]);
      setStatus(statusData);
      setHealth(healthData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading CRON data:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminCron', 'loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutoValidation = async () => {
    setTriggering('auto-validate');
    setLastResult(null);
    try {
      const result = await adminApi.triggerAutoValidation();
      setLastResult(result);
      setError(null);
    } catch (err) {
      console.error('Error triggering auto-validation:', err);
      setError(t('adminCron', 'triggerError'));
    } finally {
      setTriggering(null);
    }
  };

  const getJobIcon = (name: string) => {
    if (name.includes('auto-validate')) return '';
    if (name.includes('cleanup')) return '';
    if (name.includes('alert') || name.includes('notification')) return '';
    if (name.includes('statistic') || name.includes('report')) return '';
    if (name.includes('payment')) return '';
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!status || !health) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error || t('adminCron', 'loadDataError')}</div>
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
              {t('adminCron', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminCron', 'title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('adminCron', 'subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
          >
            {t('adminCron', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Health Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`px-4 py-2 rounded-lg ${health.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {health.status === 'healthy' ? `${t('adminCron', 'healthy')}` : `${t('adminCron', 'unhealthy')}`}
                </div>
                <div>
                  <p className="text-foreground">{health.message}</p>
                  <p className="text-sm text-muted-foreground">{t('adminCron', 'timezone')} {health.timezone}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">
                  {health.activeJobs}/{health.totalJobs}
                </div>
                <div className="text-sm text-muted-foreground">{t('adminCron', 'activeJobs')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Trigger Result */}
        {lastResult && (
          <Card className="mb-8 bg-green-100">
            <CardHeader>
              <CardTitle className="text-green-700">
                {t('adminCron', 'autoValidationCompleted')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700 mb-4">
                Successfully auto-validated {lastResult.autoValidatedCount} mission(s)
              </p>
              {lastResult.missions.length > 0 && (
                <div className="space-y-2">
                  {lastResult.missions.map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg"
                    >
                      <span className="font-medium">{mission.title}</span>
                      <span className="text-sm text-muted-foreground">{mission.id.slice(0, 8)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CRON Jobs List */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('adminCron', 'scheduledJobs')}</CardTitle>
            <CardDescription>
              {t('adminCron', 'scheduledJobsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.jobs.map((job, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${job.enabled ? 'bg-card border-border' : 'bg-background border-border'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{getJobIcon(job.name)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{job.name}</h3>
                          {job.enabled ? (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              {t('adminCron', 'active')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                              {t('adminCron', 'disabled')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{job.description}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">{t('adminCron', 'schedule')}</span> {job.schedule}
                        </p>
                      </div>
                    </div>
                    {job.name.includes('auto-validate') && (
                      <button
                        onClick={handleTriggerAutoValidation}
                        disabled={triggering === 'auto-validate'}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {triggering === 'auto-validate' ? t('adminCron', 'running') : t('adminCron', 'triggerNow')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Executions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminCron', 'nextExecutions')}</CardTitle>
            <CardDescription>
              {t('adminCron', 'nextExecutionsDesc')} ({status.timezone})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(status.nextExecutions).map(([jobName, nextTime]) => (
                <div
                  key={jobName}
                  className="flex items-center justify-between p-4 bg-background rounded-lg"
                >
                  <div>
                    <div className="font-medium text-foreground capitalize">
                      {jobName.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm text-muted-foreground">{t('adminCron', 'nextExecution')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-foreground">
                      {new Date(nextTime).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getTimeUntil(new Date(nextTime))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('adminCron', 'manualTriggers')}</CardTitle>
            <CardDescription>
              {t('adminCron', 'manualTriggersDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleTriggerAutoValidation}
                disabled={triggering !== null}
                className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <span></span>
                <span>{t('adminCron', 'runAutoValidation')}</span>
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
              >
                <span></span>
                <span>{t('adminCron', 'runCleanup')}</span>
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
              >
                <span></span>
                <span>{t('adminCron', 'generateReports')}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return 'Past due';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }

  return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
