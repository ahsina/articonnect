'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, BusinessMetrics } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MissionsManagementPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await adminApi.getBusinessMetrics();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading mission data:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError('Failed to load mission data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error || 'Failed to load data'}</div>
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
              <h1 className="text-3xl font-bold text-gray-900">Mission Management</h1>
              <p className="text-gray-600 mt-1">
                Overview of all platform missions and their status
              </p>
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Missions</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.missions.total}</p>
                </div>
                <span className="text-4xl">📋</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{metrics.missions.pending}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.missions.inProgress}</p>
                </div>
                <span className="text-4xl">🔧</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.missions.completed}</p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📊</span>
                Mission Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Completion Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${metrics.missions.completionRate}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900">
                      {metrics.missions.completionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Average Mission Value</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.missions.averageValue.toLocaleString('fr-FR')}€
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.payments.totalTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Payment Success Rate</span>
                  <span className="font-semibold text-green-600">
                    {metrics.payments.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>⚠️</span>
                Disputes & Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Disputes</span>
                  <span className="font-semibold text-gray-900">{metrics.disputes.total}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Pending Disputes</span>
                  <span
                    className={`font-semibold ${metrics.disputes.pending > 0 ? 'text-orange-600' : 'text-gray-900'}`}
                  >
                    {metrics.disputes.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Resolved</span>
                  <span className="font-semibold text-green-600">{metrics.disputes.resolved}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Resolution Rate</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.disputes.resolutionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Avg Resolution Time</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.disputes.averageResolutionTime.toFixed(1)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No-Shows */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🚫</span>
              No-Show Reports
            </CardTitle>
            <CardDescription>
              Client or artisan no-show incident reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{metrics.noShows.total}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{metrics.noShows.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics.noShows.validated}</div>
                <div className="text-sm text-gray-600">Validated</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{metrics.noShows.rejected}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.noShows.validationRate.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Validation Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>💰</span>
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {metrics.revenue.total.toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.revenue.today.toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-gray-600">Today</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.revenue.thisWeek.toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {metrics.revenue.thisMonth.toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Growth</span>
                <span
                  className={`text-xl font-bold ${metrics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.revenue.growth >= 0 ? '+' : ''}
                  {metrics.revenue.growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/admin/moderation')}
                className="flex items-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
              >
                <span>⚠️</span>
                <span>View Disputes</span>
              </button>
              <button
                onClick={() => router.push('/admin/cron')}
                className="flex items-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <span>✅</span>
                <span>Trigger Auto-Validation</span>
              </button>
              <button
                onClick={() => router.push('/admin/monitoring')}
                className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                <span>📊</span>
                <span>View Monitoring</span>
              </button>
              <button
                onClick={() => router.push('/admin/analytics')}
                className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                <span>📈</span>
                <span>Analytics Dashboard</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
