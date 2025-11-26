'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, NoShowEvent, NoShowStatus } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function NoShowsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noShows, setNoShows] = useState<NoShowEvent[]>([]);
  const [selectedNoShow, setSelectedNoShow] = useState<NoShowEvent | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPendingNoShows();
      setNoShows(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading no-shows:', err);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        router.push('/');
      } else {
        setError('Failed to load no-show reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (noShowId: string) => {
    try {
      setProcessingId(noShowId);
      await adminApi.validateNoShow(noShowId);
      await loadData();
      setSelectedNoShow(null);
    } catch (err) {
      console.error('Error validating no-show:', err);
      setError('Failed to validate no-show');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedNoShow || !rejectReason.trim()) return;
    try {
      setProcessingId(selectedNoShow.id);
      await adminApi.rejectNoShow(selectedNoShow.id, rejectReason);
      await loadData();
      setSelectedNoShow(null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err) {
      console.error('Error rejecting no-show:', err);
      setError('Failed to reject no-show');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: NoShowStatus) => {
    switch (status) {
      case NoShowStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case NoShowStatus.VALIDATED:
        return 'bg-green-100 text-green-700';
      case NoShowStatus.REJECTED:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Stats
  const pendingCount = noShows.filter((n) => n.status === NoShowStatus.PENDING).length;

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
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">No-Show Management</h1>
              <p className="text-gray-600 mt-1">Review and validate artisan no-show reports</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-3xl font-bold text-blue-600">{noShows.length}</p>
                </div>
                <span className="text-4xl">📋</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Action Required</p>
                  <p className="text-3xl font-bold text-red-600">
                    {pendingCount > 0 ? 'Yes' : 'No'}
                  </p>
                </div>
                <span className="text-4xl">{pendingCount > 0 ? '🚨' : '✅'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No-Shows List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending No-Show Reports</CardTitle>
            <CardDescription>Review evidence and validate or reject artisan claims</CardDescription>
          </CardHeader>
          <CardContent>
            {noShows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Artisan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Evidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reported
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {noShows.map((noShow) => (
                      <tr key={noShow.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {noShow.mission?.title || 'Unknown Mission'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {noShow.mission?.address?.city || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {noShow.artisan?.firstName} {noShow.artisan?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{noShow.artisan?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {noShow.client?.firstName} {noShow.client?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{noShow.client?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {noShow.evidence.gpsVerified && (
                              <span
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded"
                                title="GPS Verified"
                              >
                                GPS
                              </span>
                            )}
                            <span
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              title="Wait Time"
                            >
                              {noShow.evidence.waitTime}min
                            </span>
                            <span
                              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded"
                              title="Contact Attempts"
                            >
                              {noShow.evidence.contactAttempts} calls
                            </span>
                            {noShow.evidence.photos && noShow.evidence.photos.length > 0 && (
                              <span
                                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                                title="Photos"
                              >
                                {noShow.evidence.photos.length} pics
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(noShow.reportedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              noShow.status,
                            )}`}
                          >
                            {noShow.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedNoShow(noShow)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Review
                            </button>
                            {noShow.status === NoShowStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => handleValidate(noShow.id)}
                                  disabled={processingId === noShow.id}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                >
                                  Validate
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedNoShow(noShow);
                                    setShowRejectModal(true);
                                  }}
                                  disabled={processingId === noShow.id}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">✅</span>
                <p>No pending no-show reports</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Modal */}
        {selectedNoShow && !showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">No-Show Details</h2>
                  <button
                    onClick={() => setSelectedNoShow(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    X
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Mission Info */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Mission Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Title</p>
                        <p className="font-medium">{selectedNoShow.mission?.title || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Scheduled Date</p>
                        <p className="font-medium">
                          {formatDate(selectedNoShow.mission?.scheduledDate)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">
                          {selectedNoShow.mission?.address
                            ? `${selectedNoShow.mission.address.street}, ${selectedNoShow.mission.address.postalCode} ${selectedNoShow.mission.address.city}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Parties Involved</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Artisan (Reporter)</p>
                        <p className="font-medium text-gray-900">
                          {selectedNoShow.artisan?.firstName} {selectedNoShow.artisan?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{selectedNoShow.artisan?.email}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Client (No-Show)</p>
                        <p className="font-medium text-gray-900">
                          {selectedNoShow.client?.firstName} {selectedNoShow.client?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{selectedNoShow.client?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Evidence */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Evidence Submitted</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedNoShow.evidence.waitTime}
                        </p>
                        <p className="text-sm text-gray-600">Minutes Waited</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedNoShow.evidence.contactAttempts}
                        </p>
                        <p className="text-sm text-gray-600">Contact Attempts</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl">
                          {selectedNoShow.evidence.gpsVerified ? '✅' : '❌'}
                        </p>
                        <p className="text-sm text-gray-600">GPS Verified</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedNoShow.evidence.photos?.length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Photos</p>
                      </div>
                    </div>
                    {selectedNoShow.evidence.notes && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Notes</p>
                        <p className="text-gray-900">{selectedNoShow.evidence.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Compensation Preview */}
                  {selectedNoShow.compensation && (
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Compensation (if validated)
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600">Artisan Compensation</p>
                          <p className="text-xl font-bold text-green-700">
                            {formatCurrency(selectedNoShow.compensation.artisanAmount)}
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-600">Client Penalty</p>
                          <p className="text-xl font-bold text-red-700">
                            {formatCurrency(selectedNoShow.compensation.clientPenalty)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedNoShow.status === NoShowStatus.PENDING && (
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={() => setSelectedNoShow(null)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processingId === selectedNoShow.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleValidate(selectedNoShow.id)}
                        disabled={processingId === selectedNoShow.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingId === selectedNoShow.id ? 'Processing...' : 'Validate No-Show'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedNoShow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reject No-Show Report</h2>
                <p className="text-gray-600 mb-4">
                  Please provide a reason for rejecting this no-show report.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={4}
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || processingId === selectedNoShow.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {processingId === selectedNoShow.id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
