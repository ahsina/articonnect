'use client';

import { useState, useEffect } from 'react';
import { adminApi, PerformanceSettings } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultPerformanceSettings: PerformanceSettings = {
  cacheEnabled: true,
  cacheTtlSeconds: 300,
  cacheMaxSize: 256,
  cdnEnabled: true,
  cdnUrl: '',
  imageOptimizationEnabled: true,
  imageMaxWidth: 2048,
  imageMaxHeight: 2048,
  imageQuality: 85,
  lazyLoadingEnabled: true,
  paginationDefaultLimit: 20,
  paginationMaxLimit: 100,
  searchIndexEnabled: true,
  searchIndexRefreshMinutes: 15,
  databaseConnectionPoolSize: 20,
  databaseQueryTimeout: 30000,
  backgroundJobsEnabled: true,
  backgroundJobConcurrency: 5,
  rateLimitingEnabled: true,
  requestTimeoutMs: 30000,
  enableCompression: true,
  compressionLevel: 6,
  logLevel: 'INFO',
  logRetentionDays: 30,
  metricsEnabled: true,
  metricsCollectionInterval: 60,
  healthCheckEnabled: true,
  healthCheckInterval: 30,
};

export default function PerformanceSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<PerformanceSettings>(defaultPerformanceSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPerformanceSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading performance settings:', err);
      setSettings(defaultPerformanceSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updatePerformanceSettings(settings);
      setSuccess(t('adminSettingsPerformance', 'savedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving performance settings:', err);
      setError(t('adminSettingsPerformance', 'saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PerformanceSettings>(
    key: K,
    value: PerformanceSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsPerformance', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Caching */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'cachingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'cachingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cacheEnabled}
              onChange={(e) => updateSetting('cacheEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsPerformance', 'enableCaching')}</span>
          </label>

          {settings.cacheEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsPerformance', 'cacheTtl')}
                </label>
                <input
                  type="number"
                  value={settings.cacheTtlSeconds}
                  onChange={(e) => updateSetting('cacheTtlSeconds', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.round(settings.cacheTtlSeconds / 60)} {t('adminSettingsPerformance', 'minutes')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsPerformance', 'maxCacheSize')}
                </label>
                <input
                  type="number"
                  value={settings.cacheMaxSize}
                  onChange={(e) => updateSetting('cacheMaxSize', parseInt(e.target.value))}
                  min="16"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CDN */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'cdnTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'cdnDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cdnEnabled}
              onChange={(e) => updateSetting('cdnEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsPerformance', 'enableCdn')}</span>
          </label>

          {settings.cdnEnabled && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsPerformance', 'cdnUrl')}</label>
              <input
                type="text"
                value={settings.cdnUrl || ''}
                onChange={(e) => updateSetting('cdnUrl', e.target.value)}
                placeholder="https://cdn.example.com"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'imageOptTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'imageOptDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.imageOptimizationEnabled}
              onChange={(e) => updateSetting('imageOptimizationEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsPerformance', 'enableImageOpt')}</span>
          </label>

          {settings.imageOptimizationEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsPerformance', 'maxWidth')}
                </label>
                <input
                  type="number"
                  value={settings.imageMaxWidth}
                  onChange={(e) => updateSetting('imageMaxWidth', parseInt(e.target.value))}
                  min="100"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsPerformance', 'maxHeight')}
                </label>
                <input
                  type="number"
                  value={settings.imageMaxHeight}
                  onChange={(e) => updateSetting('imageMaxHeight', parseInt(e.target.value))}
                  min="100"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminSettingsPerformance', 'quality')}
                </label>
                <input
                  type="number"
                  value={settings.imageQuality}
                  onChange={(e) => updateSetting('imageQuality', parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.lazyLoadingEnabled}
              onChange={(e) => updateSetting('lazyLoadingEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm text-foreground">{t('adminSettingsPerformance', 'enableLazyLoading')}</span>
          </label>
        </CardContent>
      </Card>

      {/* Pagination */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'paginationTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'paginationDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'defaultPageSize')}
              </label>
              <input
                type="number"
                value={settings.paginationDefaultLimit}
                onChange={(e) => updateSetting('paginationDefaultLimit', parseInt(e.target.value))}
                min="5"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'maximumPageSize')}
              </label>
              <input
                type="number"
                value={settings.paginationMaxLimit}
                onChange={(e) => updateSetting('paginationMaxLimit', parseInt(e.target.value))}
                min="10"
                max="1000"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Index */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'searchIndexTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'searchIndexDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.searchIndexEnabled}
              onChange={(e) => updateSetting('searchIndexEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsPerformance', 'enableSearchIndex')}</span>
          </label>

          {settings.searchIndexEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'refreshInterval')}
              </label>
              <input
                type="number"
                value={settings.searchIndexRefreshMinutes}
                onChange={(e) =>
                  updateSetting('searchIndexRefreshMinutes', parseInt(e.target.value))
                }
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'databaseTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'databaseDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'connectionPoolSize')}
              </label>
              <input
                type="number"
                value={settings.databaseConnectionPoolSize}
                onChange={(e) =>
                  updateSetting('databaseConnectionPoolSize', parseInt(e.target.value))
                }
                min="5"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'queryTimeout')}
              </label>
              <input
                type="number"
                value={settings.databaseQueryTimeout}
                onChange={(e) => updateSetting('databaseQueryTimeout', parseInt(e.target.value))}
                min="1000"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.round(settings.databaseQueryTimeout / 1000)} {t('adminSettingsPerformance', 'seconds')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'backgroundJobsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'backgroundJobsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.backgroundJobsEnabled}
              onChange={(e) => updateSetting('backgroundJobsEnabled', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">{t('adminSettingsPerformance', 'enableBackgroundJobs')}</span>
          </label>

          {settings.backgroundJobsEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsPerformance', 'concurrency')}</label>
              <input
                type="number"
                value={settings.backgroundJobConcurrency}
                onChange={(e) =>
                  updateSetting('backgroundJobConcurrency', parseInt(e.target.value))
                }
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'requestSettingsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'requestSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'requestTimeout')}
              </label>
              <input
                type="number"
                value={settings.requestTimeoutMs}
                onChange={(e) => updateSetting('requestTimeoutMs', parseInt(e.target.value))}
                min="1000"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.round(settings.requestTimeoutMs / 1000)} {t('adminSettingsPerformance', 'seconds')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'compressionLevel')}
              </label>
              <input
                type="number"
                value={settings.compressionLevel}
                onChange={(e) => updateSetting('compressionLevel', parseInt(e.target.value))}
                min="1"
                max="9"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.rateLimitingEnabled}
                onChange={(e) => updateSetting('rateLimitingEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPerformance', 'enableRateLimiting')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enableCompression}
                onChange={(e) => updateSetting('enableCompression', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPerformance', 'enableCompression')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Logging & Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsPerformance', 'loggingTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsPerformance', 'loggingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsPerformance', 'logLevel')}</label>
              <select
                value={settings.logLevel}
                onChange={(e) =>
                  updateSetting('logLevel', e.target.value as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR')
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="DEBUG">{t('adminSettingsPerformance', 'logLevelDebug')}</option>
                <option value="INFO">{t('adminSettingsPerformance', 'logLevelInfo')}</option>
                <option value="WARN">{t('adminSettingsPerformance', 'logLevelWarning')}</option>
                <option value="ERROR">{t('adminSettingsPerformance', 'logLevelError')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'logRetention')}
              </label>
              <input
                type="number"
                value={settings.logRetentionDays}
                onChange={(e) => updateSetting('logRetentionDays', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'metricsInterval')}
              </label>
              <input
                type="number"
                value={settings.metricsCollectionInterval}
                onChange={(e) =>
                  updateSetting('metricsCollectionInterval', parseInt(e.target.value))
                }
                min="10"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.metricsEnabled}
                onChange={(e) => updateSetting('metricsEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPerformance', 'enableMetricsCollection')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.healthCheckEnabled}
                onChange={(e) => updateSetting('healthCheckEnabled', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-foreground">{t('adminSettingsPerformance', 'enableHealthChecks')}</span>
            </label>
          </div>

          {settings.healthCheckEnabled && (
            <div className="w-48">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsPerformance', 'healthCheckInterval')}
              </label>
              <input
                type="number"
                value={settings.healthCheckInterval}
                onChange={(e) => updateSetting('healthCheckInterval', parseInt(e.target.value))}
                min="10"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsPerformance', 'saving') : t('adminSettingsPerformance', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
