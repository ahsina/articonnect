'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AuditLog, AuditLogResponse } from '@/lib/api/admin';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuditLogsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [response, setResponse] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    loadLogs();
  }, [filters.page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs({
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page: filters.page,
        limit: filters.limit,
      });
      setResponse(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminAuditLogs', 'loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resource: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20,
    });
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('register')) {
      return 'bg-success/10 text-success';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'bg-destructive/10 text-destructive';
    }
    if (actionLower.includes('update') || actionLower.includes('edit')) {
      return 'bg-blue-600/10 text-blue-600';
    }
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'bg-purple-600/10 text-purple-600';
    }
    if (actionLower.includes('suspend') || actionLower.includes('block')) {
      return 'bg-warning/10 text-warning';
    }
    return 'bg-muted text-muted-foreground';
  };

  const getResourceIcon = (resource: string) => {
    const resourceLower = resource.toLowerCase();
    if (resourceLower.includes('user')) return '';
    if (resourceLower.includes('mission')) return '';
    if (resourceLower.includes('payment')) return '';
    if (resourceLower.includes('review')) return '';
    if (resourceLower.includes('auth') || resourceLower.includes('session')) return '';
    if (resourceLower.includes('dispute')) return '';
    if (resourceLower.includes('message')) return '';
    if (resourceLower.includes('config') || resourceLower.includes('setting')) return '';
    return '';
  };

  if (loading && !response) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page head */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t('adminAuditLogs', 'back')}
            </button>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                {t('adminAuditLogs', 'title')}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t('adminAuditLogs', 'subtitle')}</p>
            </div>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? t('adminAuditLogs', 'loading') : t('adminAuditLogs', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('adminAuditLogs', 'userId')}
              </label>
              <input
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-foreground"
                placeholder={t('adminAuditLogs', 'userIdPlaceholder')}
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('adminAuditLogs', 'action')}
              </label>
              <input
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-foreground"
                placeholder={t('adminAuditLogs', 'actionPlaceholder')}
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('adminAuditLogs', 'resource')}
              </label>
              <input
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-foreground"
                placeholder={t('adminAuditLogs', 'resourcePlaceholder')}
                value={filters.resource}
                onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('adminAuditLogs', 'startDate')}
              </label>
              <input
                type="date"
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-foreground"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('adminAuditLogs', 'endDate')}
              </label>
              <input
                type="date"
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-foreground"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSearch}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t('adminAuditLogs', 'search')}
            </button>
            <button
              onClick={handleClearFilters}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              {t('adminAuditLogs', 'clearFilters')}
            </button>
          </div>
        </div>

        {/* Stats */}
        {response && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('adminAuditLogs', 'totalLogs')}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
                {response.meta.total}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('adminAuditLogs', 'currentPage')}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-blue-600">
                {response.meta.page} / {response.meta.totalPages}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('adminAuditLogs', 'perPage')}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
                {response.meta.limit}
              </p>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {t('adminAuditLogs', 'activityLog')}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('adminAuditLogs', 'activityLogDesc')}
              </p>
            </div>
          </div>
          {response && response.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('adminAuditLogs', 'timestamp')}
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('adminAuditLogs', 'action')}
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('adminAuditLogs', 'resource')}
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('adminAuditLogs', 'userId')}
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('adminAuditLogs', 'ipAddress')}
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('adminAuditLogs', 'details')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {response.data.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="border-b border-border px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="border-b border-border px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="border-b border-border px-4 py-3.5 text-sm">
                        <span className="flex items-center gap-2">
                          <span>{getResourceIcon(log.resource)}</span>
                          <span className="text-foreground">{log.resource}</span>
                        </span>
                      </td>
                      <td className="border-b border-border px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        {log.userId ? log.userId.slice(0, 8) + '...' : '-'}
                      </td>
                      <td className="border-b border-border px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        {log.ipAddress}
                      </td>
                      <td className="border-b border-border px-4 py-3.5">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {t('adminAuditLogs', 'viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>{t('adminAuditLogs', 'noLogs')}</p>
              <p className="mt-2 text-sm">{t('adminAuditLogs', 'tryAdjusting')}</p>
            </div>
          )}

          {/* Pagination */}
          {response && response.meta.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
              <span className="text-sm text-muted-foreground">
                {t('adminAuditLogs', 'page')} {response.meta.page} {t('adminAuditLogs', 'of')} {response.meta.totalPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('adminAuditLogs', 'previous')}
                </button>
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-primary text-sm font-semibold text-primary-foreground">
                  {response.meta.page}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= response.meta.totalPages}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('adminAuditLogs', 'next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border p-6">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {t('adminAuditLogs', 'detailsTitle')}
                </h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'id')}</p>
                    <p className="mt-1 font-mono text-xs text-foreground">{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'timestamp')}</p>
                    <p className="mt-1 font-mono text-xs text-foreground">{new Date(selectedLog.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'action')}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'resource')}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
                      <span>{getResourceIcon(selectedLog.resource)}</span>
                      {selectedLog.resource}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'userId')}</p>
                    <p className="mt-1 font-mono text-xs text-foreground">{selectedLog.userId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'ipAddress')}</p>
                    <p className="mt-1 font-mono text-xs text-foreground">{selectedLog.ipAddress}</p>
                  </div>
                </div>
                {selectedLog.userAgent && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'userAgent')}</p>
                    <p className="mt-1 break-all text-sm text-foreground">{selectedLog.userAgent}</p>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adminAuditLogs', 'details')}</p>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 font-mono text-xs text-foreground">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="border-t border-border p-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  {t('adminAuditLogs', 'close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
