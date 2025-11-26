'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, UserReputation } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function ReputationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recentAdjustments, setRecentAdjustments] = useState<
    Array<{ userId: string; adjustment: number; reason: string; timestamp: string }>
  >([]);

  const handleLookup = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const data = await adminApi.getUserReputation(userId.trim());
      setReputation(data);
    } catch (err: unknown) {
      console.error('Error fetching reputation:', err);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        setError('User not found');
      } else if (error.response?.status === 403) {
        router.push('/');
      } else {
        setError('Failed to fetch reputation data');
      }
      setReputation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!userId.trim() || adjustmentAmount === 0 || !adjustmentReason.trim()) {
      setError('Please provide adjustment amount and reason');
      return;
    }
    try {
      setProcessing(true);
      setError(null);
      const data = await adminApi.adjustReputation(
        userId.trim(),
        adjustmentAmount,
        adjustmentReason,
      );
      setReputation(data);
      setSuccess(
        `Reputation adjusted by ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} points`,
      );

      // Add to recent adjustments
      setRecentAdjustments((prev) => [
        {
          userId: userId.trim(),
          adjustment: adjustmentAmount,
          reason: adjustmentReason,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);

      // Reset form
      setAdjustmentAmount(0);
      setAdjustmentReason('');
    } catch (err) {
      console.error('Error adjusting reputation:', err);
      setError('Failed to adjust reputation');
    } finally {
      setProcessing(false);
    }
  };

  const getReputationColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      GOLD: 'bg-yellow-100 text-yellow-700',
      SILVER: 'bg-gray-100 text-gray-700',
      BRONZE: 'bg-orange-100 text-orange-700',
      NEW: 'bg-blue-100 text-blue-700',
      TRUSTED: 'bg-green-100 text-green-700',
      WARNING: 'bg-red-100 text-red-700',
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Preset adjustment reasons
  const presetReasons = [
    {
      label: 'Dispute Resolution - Favor User',
      value: 10,
      reason: 'Dispute resolved in user favor',
    },
    {
      label: 'Dispute Resolution - Against User',
      value: -15,
      reason: 'Dispute resolved against user',
    },
    {
      label: 'Excellent Service Feedback',
      value: 5,
      reason: 'Exceptional service quality reported',
    },
    { label: 'Policy Violation - Minor', value: -10, reason: 'Minor policy violation' },
    { label: 'Policy Violation - Major', value: -25, reason: 'Major policy violation' },
    { label: 'False No-Show Report', value: -20, reason: 'Filed false no-show report' },
    { label: 'Account Rehabilitation', value: 15, reason: 'Account rehabilitation after review' },
  ];

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
              <h1 className="text-3xl font-bold text-gray-900">Reputation Management</h1>
              <p className="text-gray-600 mt-1">Look up and adjust user reputation scores</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 font-medium">
              Dismiss
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-4 text-green-900 font-medium">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lookup Section */}
          <Card>
            <CardHeader>
              <CardTitle>User Lookup</CardTitle>
              <CardDescription>Search for a user to view their reputation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter User ID"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Lookup'}
                </button>
              </div>

              {/* Reputation Display */}
              {reputation && (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Reputation Score</p>
                    <p className={`text-5xl font-bold ${getReputationColor(reputation.score)}`}>
                      {reputation.score}
                    </p>
                    <span
                      className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${getLevelBadge(reputation.level)}`}
                    >
                      {reputation.level}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Missions</p>
                      <p className="text-xl font-bold text-gray-900">{reputation.totalMissions}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-green-600">
                        {reputation.completedMissions}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Cancelled</p>
                      <p className="text-xl font-bold text-red-600">
                        {reputation.cancelledMissions}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">No-Shows</p>
                      <p className="text-xl font-bold text-orange-600">{reputation.noShowCount}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">Avg Rating</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {reputation.averageRating.toFixed(1)} / 5
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Reviews</p>
                      <p className="text-xl font-bold text-blue-600">{reputation.reviewCount}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Last updated: {formatDate(reputation.lastUpdated)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adjustment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Adjust Reputation</CardTitle>
              <CardDescription>Manually adjust a user&apos;s reputation score</CardDescription>
            </CardHeader>
            <CardContent>
              {!reputation ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl block mb-2">🔍</span>
                  <p>Look up a user first to adjust their reputation</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quick Presets */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Quick Presets</p>
                    <div className="flex flex-wrap gap-2">
                      {presetReasons.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setAdjustmentAmount(preset.value);
                            setAdjustmentReason(preset.reason);
                          }}
                          className={`px-3 py-1 text-xs rounded-full ${
                            preset.value > 0
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {preset.label} ({preset.value > 0 ? '+' : ''}
                          {preset.value})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Adjustment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjustment Amount
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev - 5)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev - 1)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                        className="w-24 text-center px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev + 1)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev + 5)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        +5
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      New score will be:{' '}
                      <strong className={getReputationColor(reputation.score + adjustmentAmount)}>
                        {Math.max(0, Math.min(100, reputation.score + adjustmentAmount))}
                      </strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                    <textarea
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Explain why you are adjusting this user's reputation..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleAdjust}
                    disabled={processing || adjustmentAmount === 0 || !adjustmentReason.trim()}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processing ? 'Applying...' : 'Apply Adjustment'}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Adjustments */}
        {recentAdjustments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Adjustments (This Session)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Adjustment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentAdjustments.map((adj, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                          {adj.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-sm font-medium rounded ${
                              adj.adjustment > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {adj.adjustment > 0 ? '+' : ''}
                            {adj.adjustment}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{adj.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(adj.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
