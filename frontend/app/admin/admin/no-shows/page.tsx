'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, NoShowEvent, NoShowStatus } from '@/lib/api/admin';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NoShowsPage() {
  const { t } = useLanguage();
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
        setError(t('adminNoShows', 'errorLoad'));
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
      setError(t('adminNoShows', 'errorValidate'));
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
      setError(t('adminNoShows', 'errorReject'));
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusVariant = (status: NoShowStatus): BadgeProps['variant'] => {
    switch (status) {
      case NoShowStatus.PENDING:
        return 'warning';
      case NoShowStatus.VALIDATED:
        return 'success';
      case NoShowStatus.REJECTED:
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';

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
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  // Stats
  const pendingCount = noShows.filter((n) => n.status === NoShowStatus.PENDING).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/admin/dashboard')}
            className="mb-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t('adminNoShows', 'back')}
          </button>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t('adminNoShows', 'title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('adminNoShows', 'subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          {t('adminNoShows', 'refresh')}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminNoShows', 'pendingReview')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-warning">
            {pendingCount}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminNoShows', 'totalReports')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary">
            {noShows.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminNoShows', 'actionRequired')}
          </p>
          <p
            className={`mt-2 font-display text-3xl font-extrabold tracking-tight ${
              pendingCount > 0 ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {pendingCount > 0 ? t('adminNoShows', 'yes') : t('adminNoShows', 'no')}
          </p>
        </Card>
      </div>

      {/* No-Shows Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminNoShows', 'pendingReportsTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('adminNoShows', 'pendingReportsDesc')}
            </p>
          </div>
          <Badge variant="secondary">{noShows.length}</Badge>
        </div>

        {noShows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colMission')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colArtisan')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colClient')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colEvidence')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colReported')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colStatus')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminNoShows', 'colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {noShows.map((noShow) => (
                  <tr key={noShow.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <div className="font-medium text-foreground">
                        {noShow.mission?.title || t('adminNoShows', 'unknownMission')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {noShow.mission?.address?.city || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {getInitials(noShow.artisan?.firstName, noShow.artisan?.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {noShow.artisan?.firstName} {noShow.artisan?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{noShow.artisan?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {getInitials(noShow.client?.firstName, noShow.client?.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {noShow.client?.firstName} {noShow.client?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{noShow.client?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap gap-1.5">
                        {noShow.evidence.gpsVerified && (
                          <Badge variant="success" title={t('adminNoShows', 'gpsVerified')}>
                            GPS
                          </Badge>
                        )}
                        <Badge variant="info" title={t('adminNoShows', 'waitTime')}>
                          {noShow.evidence.waitTime}min
                        </Badge>
                        <Badge variant="secondary" title={t('adminNoShows', 'contactAttempts')}>
                          {noShow.evidence.contactAttempts} {t('adminNoShows', 'calls')}
                        </Badge>
                        {noShow.evidence.photos && noShow.evidence.photos.length > 0 && (
                          <Badge variant="warning" title={t('adminNoShows', 'photos')}>
                            {noShow.evidence.photos.length} {t('adminNoShows', 'pics')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(noShow.reportedAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={getStatusVariant(noShow.status)}>{noShow.status}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedNoShow(noShow)}>
                          {t('adminNoShows', 'review')}
                        </Button>
                        {noShow.status === NoShowStatus.PENDING && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleValidate(noShow.id)}
                              disabled={processingId === noShow.id}
                            >
                              {t('adminNoShows', 'validate')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedNoShow(noShow);
                                setShowRejectModal(true);
                              }}
                              disabled={processingId === noShow.id}
                            >
                              {t('adminNoShows', 'reject')}
                            </Button>
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
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('adminNoShows', 'emptyState')}
          </div>
        )}
      </Card>

      {/* Review Modal */}
      {selectedNoShow && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {t('adminNoShows', 'detailsTitle')}
                </h2>
                <button
                  onClick={() => setSelectedNoShow(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  X
                </button>
              </div>

              <div className="space-y-6">
                {/* Mission Info */}
                <div className="border-b border-border pb-4">
                  <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                    {t('adminNoShows', 'missionInfo')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'fieldTitle')}</p>
                      <p className="font-medium text-foreground">{selectedNoShow.mission?.title || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'scheduledDate')}</p>
                      <p className="font-medium text-foreground">
                        {formatDate(selectedNoShow.mission?.scheduledDate)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'address')}</p>
                      <p className="font-medium text-foreground">
                        {selectedNoShow.mission?.address
                          ? `${selectedNoShow.mission.address.street}, ${selectedNoShow.mission.address.postalCode} ${selectedNoShow.mission.address.city}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="border-b border-border pb-4">
                  <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                    {t('adminNoShows', 'partiesInvolved')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-primary/10 p-4">
                      <p className="text-sm font-medium text-primary">
                        {t('adminNoShows', 'artisanReporter')}
                      </p>
                      <p className="font-medium text-foreground">
                        {selectedNoShow.artisan?.firstName} {selectedNoShow.artisan?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedNoShow.artisan?.email}</p>
                    </div>
                    <div className="rounded-xl bg-warning/10 p-4">
                      <p className="text-sm font-medium text-warning">
                        {t('adminNoShows', 'clientNoShow')}
                      </p>
                      <p className="font-medium text-foreground">
                        {selectedNoShow.client?.firstName} {selectedNoShow.client?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedNoShow.client?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                <div className="border-b border-border pb-4">
                  <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                    {t('adminNoShows', 'evidenceSubmitted')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <p className="font-display text-2xl font-bold text-foreground">
                        {selectedNoShow.evidence.waitTime}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'minutesWaited')}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <p className="font-display text-2xl font-bold text-foreground">
                        {selectedNoShow.evidence.contactAttempts}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'contactAttempts')}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <p
                        className={`font-display text-2xl font-bold ${
                          selectedNoShow.evidence.gpsVerified ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        {selectedNoShow.evidence.gpsVerified ? t('adminNoShows', 'yes') : t('adminNoShows', 'no')}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'gpsVerified')}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-4 text-center">
                      <p className="font-display text-2xl font-bold text-foreground">
                        {selectedNoShow.evidence.photos?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'photos')}</p>
                    </div>
                  </div>
                  {selectedNoShow.evidence.notes && (
                    <div className="mt-4 rounded-xl bg-muted p-4">
                      <p className="text-xs text-muted-foreground">{t('adminNoShows', 'notes')}</p>
                      <p className="text-foreground">{selectedNoShow.evidence.notes}</p>
                    </div>
                  )}
                </div>

                {/* Compensation Preview */}
                {selectedNoShow.compensation && (
                  <div className="border-b border-border pb-4">
                    <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                      {t('adminNoShows', 'compensationTitle')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-success/10 p-4">
                        <p className="text-xs text-muted-foreground">
                          {t('adminNoShows', 'artisanCompensation')}
                        </p>
                        <p className="font-display text-xl font-bold text-success">
                          {formatCurrency(selectedNoShow.compensation.artisanAmount)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-destructive/10 p-4">
                        <p className="text-xs text-muted-foreground">{t('adminNoShows', 'clientPenalty')}</p>
                        <p className="font-display text-xl font-bold text-destructive">
                          {formatCurrency(selectedNoShow.compensation.clientPenalty)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedNoShow.status === NoShowStatus.PENDING && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setSelectedNoShow(null)}>
                      {t('adminNoShows', 'close')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectModal(true)}
                      disabled={processingId === selectedNoShow.id}
                    >
                      {t('adminNoShows', 'reject')}
                    </Button>
                    <Button
                      onClick={() => handleValidate(selectedNoShow.id)}
                      disabled={processingId === selectedNoShow.id}
                    >
                      {processingId === selectedNoShow.id
                        ? t('adminNoShows', 'processing')
                        : t('adminNoShows', 'validateNoShow')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedNoShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="p-6">
              <h2 className="mb-4 font-display text-xl font-bold text-foreground">
                {t('adminNoShows', 'rejectModalTitle')}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">{t('adminNoShows', 'rejectModalDesc')}</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('adminNoShows', 'rejectPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                rows={4}
              />
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                >
                  {t('adminNoShows', 'cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processingId === selectedNoShow.id}
                >
                  {processingId === selectedNoShow.id
                    ? t('adminNoShows', 'rejecting')
                    : t('adminNoShows', 'reject')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
