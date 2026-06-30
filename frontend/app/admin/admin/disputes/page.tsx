'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Dispute, DisputeStatus, DisputePriority } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DisputesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<DisputePriority | ''>('');

  useEffect(() => {
    loadDisputes();
  }, [statusFilter, priorityFilter]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const filters: { status?: DisputeStatus; priority?: DisputePriority } = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;

      const data = await adminApi.getDisputes(filters);
      setDisputes(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading disputes:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminDisputes', 'errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim()) return;

    setResolving(true);
    try {
      await adminApi.resolveDispute(selectedDispute.id, { resolution: resolution.trim() });
      setSelectedDispute(null);
      setResolution('');
      await loadDisputes();
      setError(null);
    } catch (err) {
      console.error('Error resolving dispute:', err);
      setError(t('adminDisputes', 'errorResolve'));
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.OPEN:
        return 'bg-yellow-500/15 text-yellow-400';
      case DisputeStatus.IN_REVIEW:
        return 'bg-primary/10 text-primary';
      case DisputeStatus.RESOLVED:
        return 'bg-green-500/15 text-green-400';
      case DisputeStatus.CANCELLED:
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getPriorityColor = (priority: DisputePriority) => {
    switch (priority) {
      case DisputePriority.CRITICAL:
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case DisputePriority.HIGH:
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case DisputePriority.MEDIUM:
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case DisputePriority.LOW:
        return 'bg-green-500/15 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const getPriorityIcon = (priority: DisputePriority) => {
    switch (priority) {
      case DisputePriority.CRITICAL:
        return '🔴';
      case DisputePriority.HIGH:
        return '🟠';
      case DisputePriority.MEDIUM:
        return '🟡';
      case DisputePriority.LOW:
        return '🟢';
      default:
        return '⚪';
    }
  };

  // Stats
  const stats = {
    total: disputes.length,
    open: disputes.filter((d) => d.status === DisputeStatus.OPEN).length,
    inReview: disputes.filter((d) => d.status === DisputeStatus.IN_REVIEW).length,
    resolved: disputes.filter((d) => d.status === DisputeStatus.RESOLVED).length,
    critical: disputes.filter((d) => d.priority === DisputePriority.CRITICAL).length,
    high: disputes.filter((d) => d.priority === DisputePriority.HIGH).length,
  };

  if (loading && disputes.length === 0) {
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
              ← {t('adminDisputes', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminDisputes', 'title')}</h1>
              <p className="text-muted-foreground mt-1">{t('adminDisputes', 'subtitle')}</p>
            </div>
          </div>
          <button
            onClick={loadDisputes}
            disabled={loading}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {loading ? t('common', 'loading') : t('adminDisputes', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">{t('adminDisputes', 'statTotal')}</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
              <p className="text-sm text-muted-foreground">{t('adminDisputes', 'statOpen')}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.inReview}</p>
              <p className="text-sm text-muted-foreground">{t('adminDisputes', 'statInReview')}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">{t('adminDisputes', 'statResolved')}</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-sm text-muted-foreground">{t('adminDisputes', 'statCritical')}</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.high}</p>
              <p className="text-sm text-muted-foreground">{t('adminDisputes', 'statHighPriority')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('adminDisputes', 'filterStatus')}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DisputeStatus | '')}
                  className="px-3 py-2 border border-border rounded-md"
                >
                  <option value="">{t('adminDisputes', 'allStatuses')}</option>
                  <option value={DisputeStatus.OPEN}>{t('adminDisputes', 'optOpen')}</option>
                  <option value={DisputeStatus.IN_REVIEW}>{t('adminDisputes', 'optInReview')}</option>
                  <option value={DisputeStatus.RESOLVED}>{t('adminDisputes', 'optResolved')}</option>
                  <option value={DisputeStatus.CANCELLED}>{t('adminDisputes', 'optCancelled')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('adminDisputes', 'filterPriority')}</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as DisputePriority | '')}
                  className="px-3 py-2 border border-border rounded-md"
                >
                  <option value="">{t('adminDisputes', 'allPriorities')}</option>
                  <option value={DisputePriority.CRITICAL}>{t('adminDisputes', 'optCritical')}</option>
                  <option value={DisputePriority.HIGH}>{t('adminDisputes', 'optHigh')}</option>
                  <option value={DisputePriority.MEDIUM}>{t('adminDisputes', 'optMedium')}</option>
                  <option value={DisputePriority.LOW}>{t('adminDisputes', 'optLow')}</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground self-end"
              >
                {t('adminDisputes', 'clearFilters')}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminDisputes', 'listTitle')} ({disputes.length})</CardTitle>
            <CardDescription>{t('adminDisputes', 'listDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {disputes.length > 0 ? (
              <div className="space-y-4">
                {disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    onClick={() => setSelectedDispute(dispute)}
                    className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                      dispute.status === DisputeStatus.OPEN ||
                      dispute.status === DisputeStatus.IN_REVIEW
                        ? 'border-l-4 ' + getPriorityColor(dispute.priority).split(' ')[2]
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span>{getPriorityIcon(dispute.priority)}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${getStatusColor(dispute.status)}`}
                          >
                            {dispute.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${getPriorityColor(dispute.priority)}`}
                          >
                            {dispute.priority}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{dispute.reason}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{dispute.description}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {dispute.user && (
                            <span>
                              {t('adminDisputes', 'by')}: {dispute.user.firstName} {dispute.user.lastName}
                            </span>
                          )}
                          {dispute.mission && <span>{t('adminDisputes', 'mission')}: {dispute.mission.title}</span>}
                          <span>
                            {t('adminDisputes', 'created')}: {new Date(dispute.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      {(dispute.status === DisputeStatus.OPEN ||
                        dispute.status === DisputeStatus.IN_REVIEW) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDispute(dispute);
                          }}
                          className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90"
                        >
                          {t('adminDisputes', 'resolve')}
                        </button>
                      )}
                    </div>
                    {dispute.status === DisputeStatus.RESOLVED && dispute.resolution && (
                      <div className="mt-3 p-3 bg-green-500/10 rounded-lg">
                        <p className="text-sm text-green-400">
                          <strong>{t('adminDisputes', 'resolution')}:</strong> {dispute.resolution}
                        </p>
                        {dispute.resolvedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            {t('adminDisputes', 'resolvedLabel')}: {new Date(dispute.resolvedAt).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <span className="text-6xl block mb-4">⚖️</span>
                <p className="text-lg font-medium">{t('adminDisputes', 'emptyTitle')}</p>
                <p className="text-sm mt-2">{t('adminDisputes', 'emptyDesc')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolve Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{t('adminDisputes', 'detailsTitle')}</h2>
                  <button
                    onClick={() => {
                      setSelectedDispute(null);
                      setResolution('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-sm rounded ${getStatusColor(selectedDispute.status)}`}
                  >
                    {selectedDispute.status}
                  </span>
                  <span
                    className={`px-2 py-1 text-sm rounded ${getPriorityColor(selectedDispute.priority)}`}
                  >
                    {getPriorityIcon(selectedDispute.priority)} {selectedDispute.priority}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground text-lg">{selectedDispute.reason}</h3>
                  <p className="text-muted-foreground mt-2">{selectedDispute.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-background rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('adminDisputes', 'fieldCreated')}</p>
                    <p className="font-medium">
                      {new Date(selectedDispute.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('adminDisputes', 'disputeId')}</p>
                    <p className="font-mono text-sm">{selectedDispute.id.slice(0, 8)}...</p>
                  </div>
                  {selectedDispute.user && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('adminDisputes', 'reportedBy')}</p>
                      <p className="font-medium">
                        {selectedDispute.user.firstName} {selectedDispute.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedDispute.user.email}</p>
                    </div>
                  )}
                  {selectedDispute.mission && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('adminDisputes', 'relatedMission')}</p>
                      <p className="font-medium">{selectedDispute.mission.title}</p>
                      {selectedDispute.mission.agreedPrice && (
                        <p className="text-sm text-muted-foreground">
                          {selectedDispute.mission.agreedPrice.toLocaleString('fr-FR')}€
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {selectedDispute.status === DisputeStatus.RESOLVED ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">{t('adminDisputes', 'resolution')}</h4>
                    <p className="text-green-400">{selectedDispute.resolution}</p>
                    {selectedDispute.resolvedAt && (
                      <p className="text-sm text-green-600 mt-2">
                        {t('adminDisputes', 'resolvedOn')}: {new Date(selectedDispute.resolvedAt).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-foreground mb-2">{t('adminDisputes', 'resolution')}</label>
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder={t('adminDisputes', 'resolutionPlaceholder')}
                      rows={4}
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-4">
                <button
                  onClick={() => {
                    setSelectedDispute(null);
                    setResolution('');
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  {t('adminDisputes', 'close')}
                </button>
                {(selectedDispute.status === DisputeStatus.OPEN ||
                  selectedDispute.status === DisputeStatus.IN_REVIEW) && (
                  <button
                    onClick={handleResolve}
                    disabled={!resolution.trim() || resolving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {resolving ? t('adminDisputes', 'resolving') : t('adminDisputes', 'resolveDispute')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
