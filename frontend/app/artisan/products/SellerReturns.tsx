'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { returnsApi, ReturnRequest, ReturnStatus } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, RotateCcw, Check, X, PackageCheck, Euro } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  REQUESTED: 'warning',
  APPROVED: 'default',
  REJECTED: 'error',
  RETURN_SHIPPED: 'default',
  RECEIVED: 'default',
  INSPECTING: 'warning',
  REFUNDED: 'success',
  COMPLETED: 'success',
};

export default function SellerReturns() {
  const { t } = useLanguage();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await returnsApi.getReturns({ limit: 100 });
      setReturns(res.data || []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const patch = (updated: ReturnRequest) =>
    setReturns((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

  const run = async (id: string, fn: () => Promise<ReturnRequest>) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await fn();
      if (updated && updated.id) patch(updated);
      else await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || (t('common', 'error') || 'Erreur'));
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    await run(id, () => returnsApi.rejectReturn(id, rejectReason.trim()));
    setRejectingId(null);
    setRejectReason('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t('common', 'loading') || 'Chargement…'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {returns.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-50" />
            {t('artisan', 'noReturns') || 'Aucune demande de retour.'}
          </CardContent>
        </Card>
      ) : (
        returns.map((r) => {
          const status = r.status as ReturnStatus;
          const canApprove = status === 'REQUESTED';
          const canReceive = status === 'APPROVED' || status === 'RETURN_SHIPPED';
          const canRefund = status === 'RECEIVED' || status === 'INSPECTING';
          const canComplete = status === 'REFUNDED';
          const refundTotal = Number(r.totalRefundAmount ?? 0) || 0;
          return (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {t('artisan', 'return') || 'Retour'} #{r.id.slice(0, 8)}
                      </span>
                      <Badge variant={STATUS_VARIANT[status] || 'default'}>
                        {t('returnStatus', status) || status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                      {r.client ? ` · ${r.client.firstName} ${r.client.lastName}` : ''}
                      {r.orderId ? ` · ${t('orders', 'order') || 'Commande'} #${r.orderId.slice(0, 8)}` : ''}
                    </p>
                  </div>
                  {refundTotal > 0 && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">{refundTotal.toFixed(2)}€</div>
                      <div className="text-xs text-muted-foreground">{t('artisan', 'refundAmount') || 'Remboursement'}</div>
                    </div>
                  )}
                </div>

                {r.description && <p className="text-sm text-foreground mb-2">{r.description}</p>}

                <div className="space-y-2 border-t border-border pt-3">
                  {(r.items || []).map((it) => (
                    <div key={it.id} className="flex items-center gap-3 text-sm">
                      <img
                        src={it.product?.photos?.[0] || 'https://via.placeholder.com/48?text=%20'}
                        alt=""
                        className="w-10 h-10 rounded object-cover border border-border"
                      />
                      <span className="flex-1 text-foreground">{it.product?.name}</span>
                      <span className="text-muted-foreground">×{it.quantity}</span>
                      {it.reason && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('returnReason', it.reason) || it.reason}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-4 border-t border-border pt-3">
                  {rejectingId === r.id ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder={t('artisan', 'rejectReasonPlaceholder') || 'Motif du refus…'}
                        className="sm:max-w-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => doReject(r.id)} disabled={busyId === r.id || !rejectReason.trim()}>
                          {busyId === r.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {t('artisan', 'confirmReject') || 'Confirmer le refus'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }} disabled={busyId === r.id}>
                          {t('common', 'cancel') || 'Annuler'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {canApprove && (
                        <>
                          <Button size="sm" onClick={() => run(r.id, () => returnsApi.approveReturn(r.id))} disabled={busyId === r.id}>
                            {busyId === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            {t('artisan', 'approve') || 'Approuver'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingId(r.id); setRejectReason(''); setError(null); }}>
                            <X className="h-4 w-4 mr-1" />
                            {t('artisan', 'reject') || 'Refuser'}
                          </Button>
                        </>
                      )}
                      {canReceive && (
                        <Button size="sm" onClick={() => run(r.id, () => returnsApi.receiveReturn(r))} disabled={busyId === r.id}>
                          {busyId === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PackageCheck className="h-4 w-4 mr-1" />}
                          {t('artisan', 'markReceived') || 'Marquer reçu'}
                        </Button>
                      )}
                      {canRefund && (
                        <Button size="sm" onClick={() => run(r.id, () => returnsApi.refundReturn(r.id, { restockItems: true }))} disabled={busyId === r.id}>
                          {busyId === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Euro className="h-4 w-4 mr-1" />}
                          {t('artisan', 'refund') || 'Rembourser'}
                        </Button>
                      )}
                      {canComplete && (
                        <Button size="sm" variant="outline" onClick={() => run(r.id, () => returnsApi.completeReturn(r.id))} disabled={busyId === r.id}>
                          {busyId === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                          {t('artisan', 'complete') || 'Clôturer'}
                        </Button>
                      )}
                      {!canApprove && !canReceive && !canRefund && !canComplete && (
                        <span className="text-sm text-muted-foreground">{t('artisan', 'noAction') || 'Aucune action requise.'}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
