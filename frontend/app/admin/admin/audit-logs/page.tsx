'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AuditLog, AuditLogResponse } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
        setError('Failed to load audit logs');
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
      return 'bg-green-500/15 text-green-400';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'bg-red-500/15 text-red-400';
    }
    if (actionLower.includes('update') || actionLower.includes('edit')) {
      return 'bg-primary/10 text-primary';
    }
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'bg-purple-500/15 text-purple-400';
    }
    if (actionLower.includes('suspend') || actionLower.includes('block')) {
      return 'bg-yellow-500/15 text-yellow-400';
    }
    return 'bg-muted text-foreground';
  };

  const getResourceIcon = (resource: string) => {
    const resourceLower = resource.toLowerCase();
    if (resourceLower.includes('user')) return '👤';
    if (resourceLower.includes('mission')) return '📋';
    if (resourceLower.includes('payment')) return '💳';
    if (resourceLower.includes('review')) return '⭐';
    if (resourceLower.includes('auth') || resourceLower.includes('session')) return '🔐';
    if (resourceLower.includes('dispute')) return '⚠️';
    if (resourceLower.includes('message')) return '💬';
    if (resourceLower.includes('config') || resourceLower.includes('setting')) return '⚙️';
    return '📄';
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
              <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
              <p className="text-muted-foreground mt-1">Track all system activities and user actions</p>
            </div>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Input
                placeholder="User ID"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              />
              <Input
                placeholder="Action (e.g., LOGIN, CREATE)"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
              <Input
                placeholder="Resource (e.g., USER, MISSION)"
                value={filters.resource}
                onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
              <Input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Search
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
              >
                Clear Filters
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {response && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Logs</p>
                    <p className="text-3xl font-bold text-foreground">{response.meta.total}</p>
                  </div>
                  <span className="text-3xl">📊</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Page</p>
                    <p className="text-3xl font-bold text-primary">
                      {response.meta.page} / {response.meta.totalPages}
                    </p>
                  </div>
                  <span className="text-3xl">📄</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Per Page</p>
                    <p className="text-3xl font-bold text-muted-foreground">{response.meta.limit}</p>
                  </div>
                  <span className="text-3xl">📋</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>All tracked actions and events</CardDescription>
          </CardHeader>
          <CardContent>
            {response && response.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Action
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Resource
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        User ID
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        IP Address
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {response.data.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-accent">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="flex items-center gap-2">
                            <span>{getResourceIcon(log.resource)}</span>
                            <span className="text-foreground">{log.resource}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                          {log.userId ? log.userId.slice(0, 8) + '...' : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                          {log.ipAddress}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-primary hover:text-primary text-sm"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <span className="text-6xl block mb-4">📋</span>
                <p>No audit logs found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {response && response.meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page <= 1}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-muted-foreground">
              Page {response.meta.page} of {response.meta.totalPages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page >= response.meta.totalPages}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-semibold">Audit Log Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-mono text-sm">{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p>{new Date(selectedLog.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Action</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resource</p>
                    <p className="flex items-center gap-2">
                      <span>{getResourceIcon(selectedLog.resource)}</span>
                      {selectedLog.resource}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm">{selectedLog.userId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                  </div>
                </div>
                {selectedLog.userAgent && (
                  <div>
                    <p className="text-sm text-muted-foreground">User Agent</p>
                    <p className="text-sm text-foreground break-all">{selectedLog.userAgent}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Details</p>
                  <pre className="bg-background p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="p-6 border-t border-border">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
