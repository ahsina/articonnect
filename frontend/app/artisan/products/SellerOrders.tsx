'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { marketplaceApi, Order, OrderItem } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Truck, PackageCheck, Package, MessageCircle } from 'lucide-react';

interface SellerOrdersProps {
  myUserId: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  PENDING: 'secondary',
  PAID: 'warning',
  PROCESSING: 'warning',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'error',
  REFUNDED: 'error',
  PARTIALLY_REFUNDED: 'error',
};

const FILTERS = ['all', 'toShip', 'SHIPPED', 'DELIVERED'] as const;
type FilterKey = (typeof FILTERS)[number];

export default function SellerOrders({ myUserId }: SellerOrdersProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [shipping, setShipping] = useState<string | null>(null);
  const [tracking, setTracking] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Route vendeur dédiée (repli automatique vers le filtrage de /orders si indisponible).
      const mine = await marketplaceApi.getSellerOrders(myUserId);
      setOrders(mine);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const myItems = (o: Order): OrderItem[] =>
    (o.items || []).filter((it) => it.product?.artisanId === myUserId);

  const sellerTotal = (o: Order): number =>
    myItems(o).reduce((s, it) => s + (Number(it.totalPrice ?? 0) || 0), 0);

  const doShip = async (orderId: string) => {
    setBusyId(orderId);
    setError(null);
    try {
      const updated = await marketplaceApi.shipOrder(orderId, tracking.trim());
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: updated?.status || 'SHIPPED', trackingNumber: updated?.trackingNumber ?? tracking.trim(), shippedAt: updated?.shippedAt ?? new Date().toISOString() }
            : o,
        ),
      );
      setShipping(null);
      setTracking('');
    } catch (e: any) {
      setError(e?.response?.data?.message || (t('artisan', 'shipError') || "L'expédition a échoué."));
    } finally {
      setBusyId(null);
    }
  };

  const advance = async (orderId: string, status: string) => {
    setBusyId(orderId);
    setError(null);
    try {
      const updated = await marketplaceApi.updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated?.status || status } : o)),
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || (t('common', 'error') || 'Erreur'));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'toShip') return ['PAID', 'PROCESSING'].includes(o.status);
    return o.status === filter;
  });

  const toShipCount = orders.filter((o) => ['PAID', 'PROCESSING'].includes(o.status)).length;

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
      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {f === 'all'
              ? t('common', 'all') || 'Toutes'
              : f === 'toShip'
                ? `${t('artisan', 'toShip') || 'À expédier'}${toShipCount ? ` (${toShipCount})` : ''}`
                : f === 'SHIPPED'
                  ? t('orders', 'shipped') || 'Expédiées'
                  : t('orders', 'delivered') || 'Livrées'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            {t('artisan', 'noOrders') || 'Aucune commande pour le moment.'}
          </CardContent>
        </Card>
      ) : (
        filtered.map((order) => {
          const items = myItems(order);
          const canShip = ['PAID', 'PROCESSING'].includes(order.status);
          const canDeliver = order.status === 'SHIPPED';
          return (
            <Card key={order.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {t('orders', 'order') || 'Commande'} #{order.id.slice(0, 8)}
                      </span>
                      <Badge variant={STATUS_VARIANT[order.status] || 'default'}>
                        {t('orderStatus', order.status) || order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      {order.client ? ` · ${order.client.firstName} ${order.client.lastName}` : ''}
                      {order.shippingAddress ? ` · ${order.shippingAddress}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{sellerTotal(order).toFixed(2)}€</div>
                    <div className="text-xs text-muted-foreground">
                      {items.reduce((s, it) => s + (it.quantity || 0), 0)} {t('artisan', 'unitsSold') || 'article(s)'}
                    </div>
                  </div>
                </div>

                {/* Items du vendeur */}
                <div className="space-y-2 border-t border-border pt-3">
                  {items.map((it) => (
                    <div key={it.id || it.productId} className="flex items-center gap-3 text-sm">
                      <img
                        src={it.product?.photos?.[0] || 'https://via.placeholder.com/48?text=%20'}
                        alt=""
                        className="w-10 h-10 rounded object-cover border border-border"
                      />
                      <span className="flex-1 text-foreground">{it.product?.name || it.productName}</span>
                      <span className="text-muted-foreground">×{it.quantity}</span>
                      <span className="font-medium text-foreground w-20 text-right">
                        {(Number(it.totalPrice ?? 0) || 0).toFixed(2)}€
                      </span>
                    </div>
                  ))}
                </div>

                {order.trackingNumber && (
                  <div className="mt-3 text-sm text-muted-foreground flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {t('orders', 'trackingNumber') || 'Suivi'}: <span className="font-medium text-foreground">{order.trackingNumber}</span>
                  </div>
                )}

                {/* Contacter l'acheteur (SAV / suivi) — relaie vers le chat avec l'ID acheteur */}
                {(() => {
                  const buyerId = order.client?.id || order.clientId;
                  return buyerId ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/artisan/messages?userId=${buyerId}`)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {t('artisan', 'contactBuyer') || "Contacter l'acheteur"}
                      </Button>
                    </div>
                  ) : null;
                })()}

                {/* Actions vendeur */}
                {(canShip || canDeliver) && (
                  <div className="mt-4 border-t border-border pt-3">
                    {shipping === order.id ? (
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Input
                          value={tracking}
                          onChange={(e) => setTracking(e.target.value)}
                          placeholder={t('artisan', 'trackingPlaceholder') || 'N° de suivi (ex : LU123456789)'}
                          className="sm:max-w-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => doShip(order.id)} disabled={busyId === order.id}>
                            {busyId === order.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            <Truck className="h-4 w-4 mr-1" />
                            {t('artisan', 'confirmShip') || 'Confirmer expédition'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShipping(null);
                              setTracking('');
                            }}
                            disabled={busyId === order.id}
                          >
                            {t('common', 'cancel') || 'Annuler'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {canShip && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setShipping(order.id);
                              setTracking(order.trackingNumber || '');
                              setError(null);
                            }}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            {t('artisan', 'ship') || 'Expédier'}
                          </Button>
                        )}
                        {canDeliver && (
                          <Button size="sm" variant="outline" onClick={() => advance(order.id, 'DELIVERED')} disabled={busyId === order.id}>
                            {busyId === order.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PackageCheck className="h-4 w-4 mr-1" />}
                            {t('artisan', 'markDelivered') || 'Marquer livrée'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
