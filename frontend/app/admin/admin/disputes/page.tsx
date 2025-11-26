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
        setError('Failed to load disputes');
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
      setError('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.OPEN:
        return 'bg-yellow-100 text-yellow-700';
      case DisputeStatus.IN_REVIEW:
        return 'bg-blue-100 text-blue-700';
      case DisputeStatus.RESOLVED:
        return 'bg-green-100 text-green-700';
      case DisputeStatus.CANCELLED:
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: DisputePriority) => {
    switch (priority) {
      case DisputePriority.CRITICAL:
        return 'bg-red-100 text-red-700 border-red-300';
      case DisputePriority.HIGH:
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case DisputePriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case DisputePriority.LOW:
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
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
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution</h1>
              <p className="text-gray-600 mt-1">Manage and resolve platform disputes</p>
            </div>
          </div>
          <button
            onClick={loadDisputes}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
              <p className="text-sm text-gray-600">Open</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.inReview}</p>
              <p className="text-sm text-gray-600">In Review</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-sm text-gray-600">Resolved</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-sm text-gray-600">Critical</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
              <p className="text-sm text-gray-600">High Priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DisputeStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value={DisputeStatus.OPEN}>Open</option>
                  <option value={DisputeStatus.IN_REVIEW}>In Review</option>
                  <option value={DisputeStatus.RESOLVED}>Resolved</option>
                  <option value={DisputeStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as DisputePriority | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Priorities</option>
                  <option value={DisputePriority.CRITICAL}>Critical</option>
                  <option value={DisputePriority.HIGH}>High</option>
                  <option value={DisputePriority.MEDIUM}>Medium</option>
                  <option value={DisputePriority.LOW}>Low</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 self-end"
              >
                Clear Filters
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        <Card>
          <CardHeader>
            <CardTitle>Disputes ({disputes.length})</CardTitle>
            <CardDescription>Click on a dispute to view details and resolve</CardDescription>
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
                        <h3 className="font-semibold text-gray-900 mb-1">{dispute.reason}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{dispute.description}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                          {dispute.user && (
                            <span>
                              By: {dispute.user.firstName} {dispute.user.lastName}
                            </span>
                          )}
                          {dispute.mission && <span>Mission: {dispute.mission.title}</span>}
                          <span>
                            Created: {new Date(dispute.createdAt).toLocaleDateString('fr-FR')}
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
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                    {dispute.status === DisputeStatus.RESOLVED && dispute.resolution && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">
                          <strong>Resolution:</strong> {dispute.resolution}
                        </p>
                        {dispute.resolvedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Resolved: {new Date(dispute.resolvedAt).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <span className="text-6xl block mb-4">⚖️</span>
                <p className="text-lg font-medium">No disputes found</p>
                <p className="text-sm mt-2">Adjust your filters or check back later</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolve Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Dispute Details</h2>
                  <button
                    onClick={() => {
                      setSelectedDispute(null);
                      setResolution('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
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
                  <h3 className="font-semibold text-gray-900 text-lg">{selectedDispute.reason}</h3>
                  <p className="text-gray-600 mt-2">{selectedDispute.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">
                      {new Date(selectedDispute.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dispute ID</p>
                    <p className="font-mono text-sm">{selectedDispute.id.slice(0, 8)}...</p>
                  </div>
                  {selectedDispute.user && (
                    <div>
                      <p className="text-sm text-gray-500">Reported By</p>
                      <p className="font-medium">
                        {selectedDispute.user.firstName} {selectedDispute.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{selectedDispute.user.email}</p>
                    </div>
                  )}
                  {selectedDispute.mission && (
                    <div>
                      <p className="text-sm text-gray-500">Related Mission</p>
                      <p className="font-medium">{selectedDispute.mission.title}</p>
                      {selectedDispute.mission.agreedPrice && (
                        <p className="text-sm text-gray-500">
                          {selectedDispute.mission.agreedPrice.toLocaleString('fr-FR')}€
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {selectedDispute.status === DisputeStatus.RESOLVED ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-2">Resolution</h4>
                    <p className="text-green-700">{selectedDispute.resolution}</p>
                    {selectedDispute.resolvedAt && (
                      <p className="text-sm text-green-600 mt-2">
                        Resolved on: {new Date(selectedDispute.resolvedAt).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">Resolution</label>
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Enter the resolution details..."
                      rows={4}
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
                <button
                  onClick={() => {
                    setSelectedDispute(null);
                    setResolution('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                {(selectedDispute.status === DisputeStatus.OPEN ||
                  selectedDispute.status === DisputeStatus.IN_REVIEW) && (
                  <button
                    onClick={handleResolve}
                    disabled={!resolution.trim() || resolving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {resolving ? 'Resolving...' : 'Resolve Dispute'}
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
