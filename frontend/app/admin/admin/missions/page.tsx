'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, BusinessMetrics } from '@/lib/api/admin';
import apiClient from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

// Mapping statut mission → variante de pastille (rendu uniquement).
const statusVariant = (
  status: string,
): 'success' | 'warning' | 'info' | 'error' | 'secondary' => {
  if (['COMPLETED', 'AUTO_VALIDATED', 'PAID', 'DEPOSIT_PAID'].includes(status)) return 'success';
  if (['IN_PROGRESS', 'ACCEPTED'].includes(status)) return 'info';
  if (['PENDING', 'NEGOTIATING'].includes(status)) return 'warning';
  if (['CANCELLED', 'CANCELLED_NO_SHOW', 'DISPUTED'].includes(status)) return 'error';
  return 'secondary';
};

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
        <div className="text-destructive">{error || t('adminMissions', 'errorLoadData')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/admin/dashboard')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('adminMissions', 'back')}
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t('adminMissions', 'title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('adminMissions', 'subtitle')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          {t('adminMissions', 'refresh')}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminMissions', 'totalMissions')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            {metrics.missions.total}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminMissions', 'pending')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-warning">
            {metrics.missions.pending}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminMissions', 'inProgress')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary">
            {metrics.missions.inProgress}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminMissions', 'completed')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-success">
            {metrics.missions.completed}
          </p>
        </Card>
      </div>

      {/* Mission Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">{t('adminMissions', 'missionPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'completionRate')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full"
                      style={{ width: `${metrics.missions.completionRate}%` }}
                    />
                  </div>
                  <span className="font-semibold text-foreground">
                    {(Number(metrics.missions.completionRate) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'averageMissionValue')}</span>
                <span className="font-display font-bold text-foreground">
                  {(Number(metrics.missions.averageValue) || 0).toLocaleString('fr-FR')}€
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'totalTransactions')}</span>
                <span className="font-semibold text-foreground">
                  {metrics.payments.totalTransactions}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'paymentSuccessRate')}</span>
                <span className="font-semibold text-success">
                  {(Number(metrics.payments.successRate) || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">{t('adminMissions', 'disputesIssues')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'totalDisputes')}</span>
                <span className="font-semibold text-foreground">{metrics.disputes.total}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'pendingDisputes')}</span>
                <span
                  className={`font-semibold ${metrics.disputes.pending > 0 ? 'text-warning' : 'text-foreground'}`}
                >
                  {metrics.disputes.pending}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'resolved')}</span>
                <span className="font-semibold text-success">{metrics.disputes.resolved}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'resolutionRate')}</span>
                <span className="font-semibold text-foreground">
                  {(Number(metrics.disputes.resolutionRate) || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('adminMissions', 'avgResolutionTime')}</span>
                <span className="font-semibold text-foreground">
                  {(Number(metrics.disputes.averageResolutionTime) || 0).toFixed(1)}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No-Shows */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t('adminMissions', 'noShowReports')}</CardTitle>
          <CardDescription>{t('adminMissions', 'noShowReportsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-foreground">{metrics.noShows.total}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'totalReports')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-warning">{metrics.noShows.pending}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'pending')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-success">{metrics.noShows.validated}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'validated')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-destructive">{metrics.noShows.rejected}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'rejected')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-primary">
                {(Number(metrics.noShows.validationRate) || 0).toFixed(0)}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'validationRate')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t('adminMissions', 'revenueOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-success">
                {(Number(metrics.revenue.total) || 0).toLocaleString('fr-FR')}€
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'totalRevenue')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-primary">
                {(Number(metrics.revenue.today) || 0).toLocaleString('fr-FR')}€
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'today')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-foreground">
                {(Number(metrics.revenue.thisWeek) || 0).toLocaleString('fr-FR')}€
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'thisWeek')}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <div className="font-display text-2xl font-extrabold text-primary">
                {(Number(metrics.revenue.thisMonth) || 0).toLocaleString('fr-FR')}€
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t('adminMissions', 'thisMonth')}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
            <span className="text-sm text-muted-foreground">{t('adminMissions', 'growth')}</span>
            <span
              className={`font-display text-xl font-bold ${metrics.revenue.growth >= 0 ? 'text-success' : 'text-destructive'}`}
            >
              {metrics.revenue.growth >= 0 ? '+' : ''}
              {(Number(metrics.revenue.growth) || 0).toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Statut</label>
            <select
              aria-label="Filtrer par statut"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
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
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={loadMissions}>
              {t('adminMissions', 'refresh')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Mission Management — liste + actions de modération admin */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Gestion des missions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Annuler, réassigner ou clôturer une mission problématique.
            </p>
          </div>
          <Badge variant="secondary">{missions.length} résultats</Badge>
        </div>
        {missionsLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('common', 'loading')}
          </div>
        ) : missions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Aucune mission</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Mission</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Client</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Artisan</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Prix</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {missions.map((m) => {
                  const terminal = TERMINAL_STATUSES.includes(m.status);
                  const price = Number(m.agreedPrice ?? m.clientBudget ?? 0);
                  return (
                    <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 align-middle">
                        <div className="font-semibold text-foreground">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.category} · {m.city || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {m.client ? `${m.client.firstName} ${m.client.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {m.artisan ? `${m.artisan.firstName} ${m.artisan.lastName}` : 'Non assigné'}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-display font-bold text-foreground">
                          {price.toLocaleString('fr-FR')}€
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReassign(m.id)}
                            disabled={terminal || actingId === m.id}
                          >
                            Réassigner
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleClose(m.id)}
                            disabled={terminal || actingId === m.id}
                          >
                            Clôturer
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleForceCancel(m.id)}
                            disabled={terminal || actingId === m.id}
                          >
                            Annuler
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t('adminMissions', 'quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/admin/admin/moderation')}>
              {t('adminMissions', 'viewDisputes')}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/admin/cron')}>
              {t('adminMissions', 'triggerAutoValidation')}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/admin/monitoring')}>
              {t('adminMissions', 'viewMonitoring')}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/admin/analytics')}>
              {t('adminMissions', 'analyticsDashboard')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
