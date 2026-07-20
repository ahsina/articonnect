'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Report } from '@/lib/api/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function ModerationPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      // Mapping vers les valeurs d'enum backend (ModerationReportStatus)
      const STATUS_MAP: Record<string, string> = {
        pending: 'PENDING',
        reviewing: 'UNDER_REVIEW',
        resolved: 'RESOLVED',
        dismissed: 'DISMISSED',
      };
      const filterParams =
        filter === 'all' ? {} : { status: STATUS_MAP[filter] || filter.toUpperCase() };
      const data = await adminApi.getReports(filterParams);
      setReports(data);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      if (error.response?.status === 403) {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport || !action || !resolution) {
      toast({
        title: t('common', 'error'),
        description: t('admin', 'fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await adminApi.resolveReport(selectedReport.id, action, resolution);
      toast({
        title: t('common', 'success'),
        description: t('admin', 'reportResolvedSuccess'),
      });
      setSelectedReport(null);
      setResolution('');
      setAction('');
      loadReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      toast({
        title: t('common', 'error'),
        description: t('admin', 'errorResolvingReport'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm(t('admin', 'deleteConfirm'))) {
      return;
    }

    try {
      await adminApi.deleteReport(reportId);
      toast({
        title: t('common', 'success'),
        description: t('admin', 'reportDeleted'),
      });
      loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: t('common', 'error'),
        description: t('admin', 'errorDeletingReport'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: t('adminModeration', 'statusPending'), variant: 'warning' },
      REVIEWING: { label: t('adminModeration', 'statusReviewing'), variant: 'info' },
      RESOLVED: { label: t('adminModeration', 'statusResolved'), variant: 'success' },
      DISMISSED: { label: t('adminModeration', 'statusDismissed'), variant: 'secondary' },
    };

    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      REVIEW: t('adminModeration', 'typeReview'),
      PRODUCT: t('adminModeration', 'typeProduct'),
      USER: t('adminModeration', 'typeUser'),
      MISSION: t('adminModeration', 'typeMission'),
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('adminModeration', 'loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t('adminModeration', 'title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('adminModeration', 'subtitle')}
          </p>
        </div>
        <Button variant="outline" onClick={loadReports}>
          Actualiser
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? t('adminModeration', 'filterAll') : status}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminModeration', 'totalReports')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            {reports.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminModeration', 'pending')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-warning">
            {reports.filter((r) => r.status === 'PENDING').length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminModeration', 'inProgress')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary">
            {reports.filter((r) => r.status === 'REVIEWING').length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminModeration', 'resolved')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-success">
            {reports.filter((r) => r.status === 'RESOLVED').length}
          </p>
        </Card>
      </div>

      {/* Reports table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-base font-bold text-foreground">
            {t('adminModeration', 'reports')}
          </h2>
          <Badge variant="secondary">{reports.length} résultats</Badge>
        </div>

        {reports.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('adminModeration', 'noReports')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminModeration', 'description')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminModeration', 'contentType')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminModeration', 'reportedBy')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminModeration', 'reportType')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="max-w-md truncate font-medium text-foreground">
                        {report.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(report.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant="outline">{getTypeLabel(report.reportedType)}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <p className="font-medium text-foreground">
                        {report.reporter.firstName} {report.reporter.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{report.reporter.email}</p>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">
                      {report.reason}
                    </td>
                    <td className="px-4 py-3 align-middle">{getStatusBadge(report.status)}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(report);
                          }}
                        >
                          {t('adminModeration', 'resolveReport')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id);
                          }}
                        >
                          {t('adminModeration', 'delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-lg">
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {t('adminModeration', 'resolveReport')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedReport(null);
                    setResolution('');
                    setAction('');
                  }}
                >
                  {t('adminModeration', 'cancel')}
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('adminModeration', 'reportType')}
                  </p>
                  <p className="text-sm text-foreground">{selectedReport.reason}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('adminModeration', 'description')}
                  </p>
                  <p className="text-sm text-foreground">{selectedReport.description}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('adminModeration', 'reportedBy')}
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedReport.reporter.firstName} {selectedReport.reporter.lastName} (
                    {selectedReport.reporter.email})
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('adminModeration', 'contentType')}
                  </p>
                  <p className="text-sm text-foreground">
                    {getTypeLabel(selectedReport.reportedType)}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    {t('adminModeration', 'actionToTake')}
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
                  >
                    <option value="">{t('adminModeration', 'selectAction')}</option>
                    <option value="DISMISS">{t('adminModeration', 'actionDismiss')}</option>
                    <option value="WARNING">{t('adminModeration', 'actionWarning')}</option>
                    <option value="CONTENT_REMOVED">
                      {t('adminModeration', 'actionRemoveContent')}
                    </option>
                    <option value="USER_SUSPENDED">
                      {t('adminModeration', 'actionSuspendUser')}
                    </option>
                    <option value="ACCOUNT_TERMINATED">
                      {t('adminModeration', 'actionBanAccount')}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    {t('adminModeration', 'resolution')}
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder={t('adminModeration', 'resolutionPlaceholder')}
                    className="h-32 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={handleResolve}>
                    {t('adminModeration', 'resolve')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedReport(null);
                      setResolution('');
                      setAction('');
                    }}
                  >
                    {t('adminModeration', 'cancel')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
