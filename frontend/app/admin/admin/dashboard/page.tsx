'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, DashboardStats, AuditLog } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Users, User, Wrench, ClipboardList, CheckCircle2, Wallet, CreditCard, TrendingUp,
  BarChart3, ShieldAlert, Activity, Flag, Timer, FileCheck, AlertTriangle, ScrollText,
  Eye, Ban, Award, Tags, Star, Lock, FileText, Settings, ArrowRight, type LucideIcon,
} from 'lucide-react';

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
    return 'bg-muted text-foreground';
  };

  const getResourceIcon = (resource: string): LucideIcon => {
    const resourceLower = resource.toLowerCase();
    if (resourceLower.includes('user')) return User;
    if (resourceLower.includes('mission')) return ClipboardList;
    if (resourceLower.includes('payment')) return CreditCard;
    if (resourceLower.includes('review')) return Star;
    if (resourceLower.includes('auth') || resourceLower.includes('session')) return Lock;
    return FileText;
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
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">{t('admin', 'errorLoadingStats')}</div>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'blue',
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: LucideIcon;
    color?: string;
  }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-primary/10 text-primary',
      green: 'bg-green-500/15 text-green-400',
      yellow: 'bg-yellow-500/15 text-yellow-400',
      purple: 'bg-purple-500/15 text-purple-400',
      red: 'bg-red-500/15 text-red-400',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const quickLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/admin/fraud-settings', label: 'Fraud Settings', icon: ShieldAlert },
    { href: '/admin/monitoring', label: 'Monitoring', icon: Activity },
    { href: '/admin/feature-flags', label: 'Feature Flags', icon: Flag },
    { href: '/admin/cron', label: 'CRON Jobs', icon: Timer },
    { href: '/admin/verifications', label: 'KYC & Verification', icon: FileCheck },
    { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { href: '/admin/moderation', label: 'Moderation', icon: Eye },
    { href: '/admin/no-shows', label: 'No-Shows', icon: Ban },
    { href: '/admin/certifications', label: 'Certifications', icon: Award },
    { href: '/admin/specialties', label: 'Specialties', icon: Tags },
    { href: '/admin/reputation', label: 'Reputation', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('admin', 'dashboard')}</h1>
          <p className="text-muted-foreground mt-2">{t('admin', 'platformOverviewKrafolt')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title={t('admin', 'totalUsers')} value={stats.totalUsers} subtitle={`${stats.newUsers7d} ${t('admin', 'newUsers')} (7j)`} icon={Users} color="blue" />
          <StatCard title={t('admin', 'clients')} value={stats.totalClients} subtitle={t('admin', 'clientUsers')} icon={User} color="green" />
          <StatCard title={t('admin', 'artisans')} value={stats.totalArtisans} subtitle={t('admin', 'activeProfessionals')} icon={Wrench} color="purple" />
          <StatCard title={t('admin', 'totalMissions')} value={stats.totalMissions} subtitle={`${stats.pendingMissions} ${t('admin', 'pending')}`} icon={ClipboardList} color="yellow" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title={t('admin', 'completedMissions')} value={stats.completedMissions} subtitle={`${Math.round((stats.completedMissions / stats.totalMissions) * 100)}% ${t('admin', 'ofTotal')}`} icon={CheckCircle2} color="green" />
          <StatCard title={t('admin', 'totalRevenue')} value={`${stats.totalRevenue.toLocaleString('fr-FR')}€`} subtitle={t('admin', 'businessVolume')} icon={Wallet} color="green" />
          <StatCard title={t('admin', 'platformCommission')} value={`${stats.platformRevenue.toLocaleString('fr-FR')}€`} subtitle={`${Math.round((stats.platformRevenue / stats.totalRevenue) * 100)}% ${t('admin', 'commission')}`} icon={CreditCard} color="blue" />
          <StatCard title={t('admin', 'activeUsers')} value={stats.activeUsers30d} subtitle={t('admin', 'last30Days')} icon={TrendingUp} color="purple" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { href: '/admin/users', icon: Users, title: t('admin', 'userManagement'), desc: t('admin', 'viewManageUsers') },
            { href: '/admin/missions', icon: ClipboardList, title: t('admin', 'missionManagement'), desc: t('admin', 'trackModerateMissions') },
            { href: '/admin/analytics', icon: BarChart3, title: t('admin', 'analytics'), desc: t('admin', 'detailedReports') },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Card key={a.href} className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardHeader onClick={() => router.push(a.href)}>
                  <CardTitle className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="text-lg">{a.title}</div>
                      <div className="text-sm font-normal text-muted-foreground">{a.desc}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard', 'recentActivity')}</CardTitle>
            <button onClick={() => router.push('/admin/audit-logs')} className="text-sm text-primary hover:underline">
              View All →
            </button>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const ResourceIcon = getResourceIcon(activity.resource);
                  return (
                    <div key={activity.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <ResourceIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getActionColor(activity.action)}`}>
                              {activity.action}
                            </span>
                            <span className="text-foreground">{activity.resource}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.userId ? `User: ${activity.userId.slice(0, 8)}...` : 'System'} •{' '}
                            {activity.ipAddress}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{getTimeAgo(activity.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-9 w-9 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors text-left"
              >
                <Icon className="h-6 w-6 mb-2 text-primary" />
                <span className="font-medium text-foreground">{link.label}</span>
              </button>
            );
          })}
        </div>

        {/* Platform Settings - Prominent Link */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/admin/settings')}
            className="w-full p-6 bg-gradient-to-r from-primary to-yellow-600 rounded-2xl hover:shadow-glow transition-all text-left"
          >
            <div className="flex items-center gap-4 text-primary-foreground">
              <Settings className="h-9 w-9 flex-shrink-0" />
              <div>
                <span className="text-xl font-semibold block">Platform Settings</span>
                <span className="text-sm opacity-80">
                  Configure fees, payments, limits, notifications, integrations, and more
                </span>
              </div>
              <ArrowRight className="ml-auto h-6 w-6 flex-shrink-0" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
