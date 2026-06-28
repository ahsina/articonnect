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
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      GOLD: 'bg-yellow-500/15 text-yellow-400',
      SILVER: 'bg-muted text-foreground',
      BRONZE: 'bg-yellow-500/15 text-yellow-400',
      NEW: 'bg-primary/10 text-primary',
      TRUSTED: 'bg-green-500/15 text-green-400',
      WARNING: 'bg-red-500/15 text-red-400',
    };
    return colors[level] || 'bg-muted text-foreground';
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reputation Management</h1>
              <p className="text-muted-foreground mt-1">Look up and adjust user reputation scores</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-300 font-medium">
              Dismiss
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-4 text-green-300 font-medium">
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
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Lookup'}
                </button>
              </div>

              {/* Reputation Display */}
              {reputation && (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="text-center p-6 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Reputation Score</p>
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
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Missions</p>
                      <p className="text-xl font-bold text-foreground">{reputation.totalMissions}</p>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-xl font-bold text-green-600">
                        {reputation.completedMissions}
                      </p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Cancelled</p>
                      <p className="text-xl font-bold text-red-600">
                        {reputation.cancelledMissions}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">No-Shows</p>
                      <p className="text-xl font-bold text-yellow-600">{reputation.noShowCount}</p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Rating</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {reputation.averageRating.toFixed(1)} / 5
                      </p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Reviews</p>
                      <p className="text-xl font-bold text-primary">{reputation.reviewCount}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
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
                <div className="text-center py-8 text-muted-foreground">
                  <span className="text-4xl block mb-2">🔍</span>
                  <p>Look up a user first to adjust their reputation</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quick Presets */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Quick Presets</p>
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
                              ? 'bg-green-500/15 text-green-400 hover:bg-green-200'
                              : 'bg-red-500/15 text-red-400 hover:bg-red-200'
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
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Adjustment Amount
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev - 5)}
                        className="px-3 py-1 bg-red-500/15 text-red-400 rounded hover:bg-red-200"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev - 1)}
                        className="px-3 py-1 bg-red-500/15 text-red-400 rounded hover:bg-red-200"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                        className="w-24 text-center px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev + 1)}
                        className="px-3 py-1 bg-green-500/15 text-green-400 rounded hover:bg-green-200"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => setAdjustmentAmount((prev) => prev + 5)}
                        className="px-3 py-1 bg-green-500/15 text-green-400 rounded hover:bg-green-200"
                      >
                        +5
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      New score will be:{' '}
                      <strong className={getReputationColor(reputation.score + adjustmentAmount)}>
                        {Math.max(0, Math.min(100, reputation.score + adjustmentAmount))}
                      </strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
                    <textarea
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Explain why you are adjusting this user's reputation..."
                      rows={3}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <button
                    onClick={handleAdjust}
                    disabled={processing || adjustmentAmount === 0 || !adjustmentReason.trim()}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Adjustment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {recentAdjustments.map((adj, idx) => (
                      <tr key={idx} className="hover:bg-accent">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-foreground">
                          {adj.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-sm font-medium rounded ${
                              adj.adjustment > 0
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {adj.adjustment > 0 ? '+' : ''}
                            {adj.adjustment}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{adj.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
