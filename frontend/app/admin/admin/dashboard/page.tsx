'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, DashboardStats, AuditLog } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, activityData] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getAuditLogs({ limit: 10 }),
      ]);
      setStats(statsData);
      setRecentActivity(activityData.data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      if (error.response?.status === 403) {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('register')) {
      return 'bg-green-100 text-green-700';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'bg-red-100 text-red-700';
    }
    if (actionLower.includes('update') || actionLower.includes('edit')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'bg-purple-100 text-purple-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getResourceIcon = (resource: string) => {
    const resourceLower = resource.toLowerCase();
    if (resourceLower.includes('user')) return '👤';
    if (resourceLower.includes('mission')) return '📋';
    if (resourceLower.includes('payment')) return '💳';
    if (resourceLower.includes('review')) return '⭐';
    if (resourceLower.includes('auth') || resourceLower.includes('session')) return '🔐';
    return '📄';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{t('admin', 'errorLoadingStats')}</div>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color = 'blue',
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => {
    const colorClasses: any = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin', 'dashboard')}</h1>
          <p className="text-gray-600 mt-2">{t('admin', 'platformOverviewArtiConnect')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('admin', 'totalUsers')}
            value={stats.totalUsers}
            subtitle={`${stats.newUsers7d} ${t('admin', 'newUsers')} (7j)`}
            icon="👥"
            color="blue"
          />
          <StatCard
            title={t('admin', 'clients')}
            value={stats.totalClients}
            subtitle={t('admin', 'clientUsers')}
            icon="👤"
            color="green"
          />
          <StatCard
            title={t('admin', 'artisans')}
            value={stats.totalArtisans}
            subtitle={t('admin', 'activeProfessionals')}
            icon="🔧"
            color="purple"
          />
          <StatCard
            title={t('admin', 'totalMissions')}
            value={stats.totalMissions}
            subtitle={`${stats.pendingMissions} ${t('admin', 'pending')}`}
            icon="📋"
            color="yellow"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('admin', 'completedMissions')}
            value={stats.completedMissions}
            subtitle={`${Math.round((stats.completedMissions / stats.totalMissions) * 100)}% ${t('admin', 'ofTotal')}`}
            icon="✅"
            color="green"
          />
          <StatCard
            title={t('admin', 'totalRevenue')}
            value={`${stats.totalRevenue.toLocaleString('fr-FR')}€`}
            subtitle={t('admin', 'businessVolume')}
            icon="💰"
            color="green"
          />
          <StatCard
            title={t('admin', 'platformCommission')}
            value={`${stats.platformRevenue.toLocaleString('fr-FR')}€`}
            subtitle={`${Math.round((stats.platformRevenue / stats.totalRevenue) * 100)}% ${t('admin', 'commission')}`}
            icon="💳"
            color="blue"
          />
          <StatCard
            title={t('admin', 'activeUsers')}
            value={stats.activeUsers30d}
            subtitle={t('admin', 'last30Days')}
            icon="📈"
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader onClick={() => router.push('/admin/users')}>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">👥</span>
                <div>
                  <div className="text-lg">{t('admin', 'userManagement')}</div>
                  <div className="text-sm font-normal text-gray-500">
                    {t('admin', 'viewManageUsers')}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader onClick={() => router.push('/admin/missions')}>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <div className="text-lg">{t('admin', 'missionManagement')}</div>
                  <div className="text-sm font-normal text-gray-500">
                    {t('admin', 'trackModerateMissions')}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader onClick={() => router.push('/admin/analytics')}>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <div>
                  <div className="text-lg">{t('admin', 'analytics')}</div>
                  <div className="text-sm font-normal text-gray-500">
                    {t('admin', 'detailedReports')}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard', 'recentActivity')}</CardTitle>
            <button
              onClick={() => router.push('/admin/audit-logs')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All →
            </button>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getResourceIcon(activity.resource)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${getActionColor(activity.action)}`}
                          >
                            {activity.action}
                          </span>
                          <span className="text-gray-700">{activity.resource}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {activity.userId ? `User: ${activity.userId.slice(0, 8)}...` : 'System'} •{' '}
                          {activity.ipAddress}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">{getTimeAgo(activity.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">📋</span>
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <button
            onClick={() => router.push('/admin/fraud-settings')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">🛡️</span>
            <span className="font-medium text-gray-700">Fraud Settings</span>
          </button>
          <button
            onClick={() => router.push('/admin/monitoring')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">📊</span>
            <span className="font-medium text-gray-700">Monitoring</span>
          </button>
          <button
            onClick={() => router.push('/admin/feature-flags')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">🏳️</span>
            <span className="font-medium text-gray-700">Feature Flags</span>
          </button>
          <button
            onClick={() => router.push('/admin/cron')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">⚙️</span>
            <span className="font-medium text-gray-700">CRON Jobs</span>
          </button>
        </div>

        {/* Additional Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <button
            onClick={() => router.push('/admin/verifications')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">✅</span>
            <span className="font-medium text-gray-700">KYC & Verification</span>
          </button>
          <button
            onClick={() => router.push('/admin/disputes')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">⚠️</span>
            <span className="font-medium text-gray-700">Disputes</span>
          </button>
          <button
            onClick={() => router.push('/admin/audit-logs')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">📜</span>
            <span className="font-medium text-gray-700">Audit Logs</span>
          </button>
          <button
            onClick={() => router.push('/admin/moderation')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">🔍</span>
            <span className="font-medium text-gray-700">Moderation</span>
          </button>
        </div>

        {/* More Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <button
            onClick={() => router.push('/admin/no-shows')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">🚫</span>
            <span className="font-medium text-gray-700">No-Shows</span>
          </button>
          <button
            onClick={() => router.push('/admin/certifications')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">📜</span>
            <span className="font-medium text-gray-700">Certifications</span>
          </button>
          <button
            onClick={() => router.push('/admin/specialties')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">🛠️</span>
            <span className="font-medium text-gray-700">Specialties</span>
          </button>
          <button
            onClick={() => router.push('/admin/reputation')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <span className="text-2xl block mb-2">⭐</span>
            <span className="font-medium text-gray-700">Reputation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
