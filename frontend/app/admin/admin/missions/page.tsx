'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, BusinessMetrics } from '@/lib/api/admin';
import apiClient from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

// Forme EXACTE renvoyée par GET /missions/admin/all (voir mission.service.adminListMissions).
interface AdminMissionRow {
  id: string;
  title: string;
  status: string;
  category: string;
  type: string;
  clientBudget: string | number | null;
  agreedPrice: string | number | null;
  city: string | null;
  createdAt: string;
  scheduledFor: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  client: { id: string; firstName: string; lastName: string; email: string } | null;
  artisan: { id: string; firstName: string; lastName: string; email: string } | null;
}

// Statuts terminaux : plus aucune action de modération possible.
const TERMINAL_STATUSES = ['COMPLETED', 'AUTO_VALIDATED', 'CANCELLED', 'CANCELLED_NO_SHOW'];

export default function MissionsManagementPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Liste des missions + actions de modération admin.
  const [missions, setMissions] = useState<AdminMissionRow[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMissions();
  }, [statusFilter]);

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
        setError(t('adminMissions', 'errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    try {
      setMissionsLoading(true);
      const res = await apiClient.get('/missions/admin/all', {
        params: { limit: 50, ...(statusFilter ? { status: statusFilter } : {}) },
      });
      setMissions(res.data?.data ?? []);
    } catch (err) {
      console.error('Error loading missions list:', err);
    } finally {
      setMissionsLoading(false);
    }
  };

  const handleForceCancel = async (missionId: string) => {
    const reason = prompt("Motif de l'annulation forcée :", 'Annulation administrateur');
    if (reason === null) return;
    try {
      setActingId(missionId);
      const res = await apiClient.post(`/missions/${missionId}/admin/cancel`, { reason });
      alert(`Mission annulée. Remboursé au client: ${res.data?.refunded ?? 0}€`);
      await loadMissions();
    } catch (err: any) {
      console.error('Error force-cancelling mission:', err);
      alert(err?.response?.data?.message || "Échec de l'annulation");
    } finally {
      setActingId(null);
    }
  };

  const handleReassign = async (missionId: string) => {
    const artisanId = prompt("ID de l'artisan à qui réassigner la mission :");
    if (!artisanId || !artisanId.trim()) return;
    try {
      setActingId(missionId);
      await apiClient.post(`/missions/${missionId}/admin/reassign`, {
        artisanId: artisanId.trim(),
      });
      await loadMissions();
    } catch (err: any) {
      console.error('Error reassigning mission:', err);
      alert(err?.response?.data?.message || 'Échec de la réassignation');
    } finally {
      setActingId(null);
    }
  };

  const handleClose = async (missionId: string) => {
    if (!confirm('Clôturer de force cette mission (marquée TERMINÉE) ?')) return;
    try {
      setActingId(missionId);
      await apiClient.post(`/missions/${missionId}/admin/close`, {});
      await loadMissions();
    } catch (err: any) {
      console.error('Error closing mission:', err);
      alert(err?.response?.data?.message || 'Échec de la clôture');
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error || t('adminMissions', 'errorLoadData')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('adminMissions', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminMissions', 'title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('adminMissions', 'subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
          >
            {t('adminMissions', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'totalMissions')}</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.missions.total}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'pending')}</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.missions.pending}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'inProgress')}</p>
                  <p className="text-3xl font-bold text-primary">{metrics.missions.inProgress}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminMissions', 'completed')}</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.missions.completed}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span></span>
                {t('adminMissions', 'missionPerformance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'completionRate')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${metrics.missions.completionRate}%` }}
                      />
                    </div>
                    <span className="font-semibold text-foreground">
                      {(Number(metrics.missions.completionRate) || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'averageMissionValue')}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.missions.averageValue) || 0).toLocaleString('fr-FR')}€
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'totalTransactions')}</span>
                  <span className="font-semibold text-foreground">
                    {metrics.payments.totalTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{t('adminMissions', 'paymentSuccessRate')}</span>
                  <span className="font-semibold text-green-600">
                    {(Number(metrics.payments.successRate) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span></span>
                {t('adminMissions', 'disputesIssues')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'totalDisputes')}</span>
                  <span className="font-semibold text-foreground">{metrics.disputes.total}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'pendingDisputes')}</span>
                  <span
                    className={`font-semibold ${metrics.disputes.pending > 0 ? 'text-foreground' : 'text-foreground'}`}
                  >
                    {metrics.disputes.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'resolved')}</span>
                  <span className="font-semibold text-green-600">{metrics.disputes.resolved}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('adminMissions', 'resolutionRate')}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.disputes.resolutionRate) || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{t('adminMissions', 'avgResolutionTime')}</span>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.disputes.averageResolutionTime) || 0).toFixed(1)}h
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
              <span></span>
              {t('adminMissions', 'noShowReports')}
            </CardTitle>
            <CardDescription>
              {t('adminMissions', 'noShowReportsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.total}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'totalReports')}</div>
              </div>
              <div className="text-center p-4 bg-amber-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.pending}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'pending')}</div>
              </div>
              <div className="text-center p-4 bg-green-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.validated}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'validated')}</div>
              </div>
              <div className="text-center p-4 bg-red-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{metrics.noShows.rejected}</div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'rejected')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(Number(metrics.noShows.validationRate) || 0).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'validationRate')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span></span>
              {t('adminMissions', 'revenueOverview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-100 rounded-lg">
                <div className="text-3xl font-bold text-foreground">
                  {(Number(metrics.revenue.total) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'totalRevenue')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(Number(metrics.revenue.today) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'today')}</div>
              </div>
              <div className="text-center p-4 bg-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {(Number(metrics.revenue.thisWeek) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'thisWeek')}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(Number(metrics.revenue.thisMonth) || 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-sm text-muted-foreground">{t('adminMissions', 'thisMonth')}</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-background rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('adminMissions', 'growth')}</span>
                <span
                  className={`text-xl font-bold ${metrics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.revenue.growth >= 0 ? '+' : ''}
                  {(Number(metrics.revenue.growth) || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission Management — liste + actions de modération admin */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Gestion des missions</CardTitle>
                <CardDescription>
                  Annuler, réassigner ou clôturer une mission problématique.
                </CardDescription>
              </div>
              <select
                aria-label="Filtrer par statut"
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING">PENDING</option>
                <option value="NEGOTIATING">NEGOTIATING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="DEPOSIT_PAID">DEPOSIT_PAID</option>
                <option value="PAID">PAID</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="DISPUTED">DISPUTED</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {missionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common', 'loading')}
              </div>
            ) : missions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune mission
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Mission
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Artisan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Prix
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {missions.map((m) => {
                      const terminal = TERMINAL_STATUSES.includes(m.status);
                      const price = Number(m.agreedPrice ?? m.clientBudget ?? 0);
                      return (
                        <tr key={m.id} className="hover:bg-accent">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{m.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.category} · {m.city || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {m.client
                              ? `${m.client.firstName} ${m.client.lastName}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {m.artisan
                              ? `${m.artisan.firstName} ${m.artisan.lastName}`
                              : 'Non assigné'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-foreground">
                              {m.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {price.toLocaleString('fr-FR')}€
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleReassign(m.id)}
                                disabled={terminal || actingId === m.id}
                                className="text-primary font-medium hover:underline disabled:opacity-40 disabled:no-underline"
                              >
                                Réassigner
                              </button>
                              <button
                                onClick={() => handleClose(m.id)}
                                disabled={terminal || actingId === m.id}
                                className="text-green-700 font-medium hover:underline disabled:opacity-40 disabled:no-underline"
                              >
                                Clôturer
                              </button>
                              <button
                                onClick={() => handleForceCancel(m.id)}
                                disabled={terminal || actingId === m.id}
                                className="text-red-600 font-medium hover:underline disabled:opacity-40 disabled:no-underline"
                              >
                                Annuler
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminMissions', 'quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/admin/admin/moderation')}
                className="flex items-center gap-2 px-4 py-3 bg-amber-100 text-amber-800 rounded-lg hover:bg-yellow-200"
              >
                <span></span>
                <span>{t('adminMissions', 'viewDisputes')}</span>
              </button>
              <button
                onClick={() => router.push('/admin/admin/cron')}
                className="flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-blue-200"
              >
                <span></span>
                <span>{t('adminMissions', 'triggerAutoValidation')}</span>
              </button>
              <button
                onClick={() => router.push('/admin/admin/monitoring')}
                className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                <span></span>
                <span>{t('adminMissions', 'viewMonitoring')}</span>
              </button>
              <button
                onClick={() => router.push('/admin/admin/analytics')}
                className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                <span></span>
                <span>{t('adminMissions', 'analyticsDashboard')}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
