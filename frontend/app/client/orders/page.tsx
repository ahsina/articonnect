'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marketplaceApi } from '@/lib/api/marketplace';
import { StarRating } from '@/components/ui/star-rating';
import apiClient from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageCircle, Package } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  product?: {
    name: string;
    images?: string[];
    // ID du vendeur (userId de l'artisan propriétaire du produit) exposé par l'API commande.
    artisanId?: string;
  };
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
}

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number | string;
  vat: number | string;
  shippingCost: number | string;
  total: number | string;
  items: OrderItem[];
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
}


const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-muted text-muted-foreground',
};

export default function ClientOrdersPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Avis produit (modal)
  const [reviewProduct, setReviewProduct] = useState<{ productId: string; name: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewDone, setReviewDone] = useState(false);

  const openReview = (order: Order) => {
    const item = order.items?.[0];
    if (!item) return;
    setReviewProduct({ productId: item.productId, name: item.product?.name || t('orders', 'order') });
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');
    setReviewDone(false);
  };

  const submitReview = async () => {
    if (!reviewProduct) return;
    if (reviewRating === 0) {
      setReviewError('Veuillez sélectionner une note');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await apiClient.post(`/marketplace/products/${reviewProduct.productId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewDone(true);
    } catch (err: any) {
      setReviewError(err?.response?.data?.message || "Erreur lors de l'envoi de l'avis");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: t('common', 'pending'),
      PAID: t('orders', 'confirmed'),
      PROCESSING: t('orders', 'confirmed'),
      SHIPPED: t('orders', 'shipped'),
      DELIVERED: t('orders', 'delivered'),
      CANCELLED: t('common', 'cancelled'),
      REFUNDED: t('common', 'cancelled'),
    };
    return statusMap[status] || status;
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await marketplaceApi.getOrders();
      setOrders(data as unknown as Order[]);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };


  const filteredOrders = orders.filter(
    (order) => filter === 'all' || order.status === filter
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(t('orders', 'cancelConfirm'))) return;

    try {
      // Endpoint client dédié (POST /marketplace/orders/:id/cancel). L'ancien /status
      // était réservé au vendeur (@Roles('ARTISAN')) et renvoyait un 403 au client.
      const updated = await marketplaceApi.cancelOrder(orderId);
      const nextStatus = (updated?.status as OrderStatus) || 'CANCELLED';

      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, status: nextStatus } : o
        )
      );
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-9">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">{t('orders', 'title')}</h1>
          <p className="text-muted-foreground mt-1.5">
            {t('orders', 'trackOrders')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
          <Card>
            <CardContent className="p-4 pt-4">
              <div className="text-[13px] text-muted-foreground">{t('orders', 'totalOrders')}</div>
              <div className="font-display text-[26px] font-extrabold mt-1 text-foreground">{orders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pt-4">
              <div className="text-[13px] text-muted-foreground">{t('common', 'pending')}</div>
              <div className="font-display text-[26px] font-extrabold mt-1 text-foreground">
                {orders.filter((o) => o.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pt-4">
              <div className="text-[13px] text-muted-foreground">{t('orders', 'inProgress')}</div>
              <div className="font-display text-[26px] font-extrabold mt-1 text-blue-600">
                {orders.filter((o) => ['PAID', 'PROCESSING', 'SHIPPED'].includes(o.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pt-4">
              <div className="text-[13px] text-muted-foreground">{t('orders', 'delivered')}</div>
              <div className="font-display text-[26px] font-extrabold mt-1 text-foreground">
                {orders.filter((o) => o.status === 'DELIVERED').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2.5">
          {([
            ['all', `${t('orders', 'all')} (${orders.length})`],
            ['PENDING', `${t('common', 'pending')} (${orders.filter((o) => o.status === 'PENDING').length})`],
            ['PAID', `${t('orders', 'confirmed')} (${orders.filter((o) => ['PAID', 'PROCESSING'].includes(o.status)).length})`],
            ['SHIPPED', `${t('orders', 'shipped')} (${orders.filter((o) => o.status === 'SHIPPED').length})`],
            ['DELIVERED', `${t('orders', 'delivered')} (${orders.filter((o) => o.status === 'DELIVERED').length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`rounded-full px-4 py-2 text-[13.5px] font-semibold border transition-colors ${
                filter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-10 pt-10 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-muted-foreground mb-4">{t('orders', 'noOrders')}</p>
                <Button onClick={() => router.push('/client/marketplace')}>
                  {t('orders', 'discoverMarketplace')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-[22px] pt-[22px]">
                  {/* Order Header */}
                  <div className="flex items-start justify-between gap-4 mb-3.5">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-lg font-bold text-foreground">
                          {t('orders', 'order')} #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <Badge className={STATUS_COLORS[order.status]}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        {t('orders', 'orderedOn')} {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-[22px] font-extrabold text-foreground">
                        {Number(order.total).toFixed(2)}€
                      </div>
                      <p className="text-[13px] text-muted-foreground">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} {order.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? t('cart', 'items') : t('cart', 'item')}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {(order.items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center gap-3.5 py-2">
                        {item.product?.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.product.images[0]}
                            alt={item.product?.name || 'Produit'}
                            className="w-14 h-14 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-muted" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{item.product?.name || '—'}</p>
                          <p className="text-[13px] text-muted-foreground">
                            {t('cart', 'quantity')}: {item.quantity} × {Number(item.unitPrice).toFixed(2)}€
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {Number(item.totalPrice).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Adresse de livraison (chaîne libre) */}
                  {order.shippingAddress && (
                    <p className="text-[13px] text-muted-foreground mt-2.5">
                      {t('orders', 'shippingTo') || 'Livraison'} : {order.shippingAddress}
                    </p>
                  )}

                  {/* Shipping Info */}
                  {order.trackingNumber && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 my-3 text-[13px] font-semibold text-blue-700">
                      📦 {t('orders', 'trackingNumber')}: {order.trackingNumber}
                      {order.deliveredAt && (
                        <span className="block font-normal text-blue-600 mt-1">
                          {t('orders', 'deliveredOn')} {formatDate(order.deliveredAt)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2.5 pt-4 mt-3.5 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {t('orders', 'viewDetails')}
                    </Button>

                    {/* Contacter le vendeur (SAV / suivi livraison) — relaie vers le chat
                        avec l'ID du vendeur (product.artisanId) issu de la commande chargée. */}
                    {(() => {
                      const sellerId = order.items
                        ?.map((it) => it.product?.artisanId)
                        .find(Boolean);
                      return sellerId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/client/messages?userId=${sellerId}`)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {t('orders', 'contactSeller') || 'Contacter le vendeur'}
                        </Button>
                      ) : null;
                    })()}

                    {order.status === 'DELIVERED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openReview(order);
                        }}
                      >
                        {t('orders', 'leaveReview')}
                      </Button>
                    )}

                    {order.status === 'PENDING' && (
                      <>
                        {/* Commande créée mais non payée : bouton de paiement (Stripe). */}
                        <Button
                          size="sm"
                          onClick={() => router.push(`/client/orders/${order.id}/pay`)}
                        >
                          Payer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-destructive"
                        >
                          {t('orders', 'cancelOrder')}
                        </Button>
                      </>
                    )}

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('orders', 'orderDetails')}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrder(null)}
                  >
                    
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order Number and Status */}
                  <div>
                    <p className="text-sm text-muted-foreground">{t('orders', 'orderNumber')}</p>
                    <p className="font-semibold text-lg">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                    <Badge className={`${STATUS_COLORS[selectedOrder.status]} mt-2`}>
                      {getStatusLabel(selectedOrder.status)}
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('orders', 'orderDate')}</p>
                      <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                    {selectedOrder.deliveredAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('orders', 'deliveryDate')}</p>
                        <p className="font-medium">{formatDate(selectedOrder.deliveredAt)}</p>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">{t('orders', 'orderedItems')}</p>
                    <div className="space-y-3">
                      {(selectedOrder.items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                          {item.product?.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.images[0]}
                              alt={item.product?.name || 'Produit'}
                              className="w-20 h-20 object-cover rounded"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded bg-muted" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.product?.name || '—'}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {Number(item.unitPrice).toFixed(2)}€
                            </p>
                          </div>
                          <p className="font-semibold">
                            {Number(item.totalPrice).toFixed(2)}€
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('orders', 'shippingAddress')}</p>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="font-medium whitespace-pre-line">{selectedOrder.shippingAddress}</p>
                    </div>
                  </div>

                  {/* Tracking */}
                  {selectedOrder.trackingNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{t('orders', 'deliveryTracking')}</p>
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="font-medium text-primary">
                          {selectedOrder.trackingNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Total (détail TVA + livraison) */}
                  <div className="pt-4 border-t border-border space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t('cart', 'subtotal') || 'Sous-total'}</span>
                      <span>{Number(selectedOrder.subtotal).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t('checkout', 'vat') || 'TVA'}</span>
                      <span>{Number(selectedOrder.vat).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t('checkout', 'shipping') || 'Livraison'}</span>
                      <span>{Number(selectedOrder.shippingCost).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-medium">{t('cart', 'total')}</span>
                      <span className="text-2xl font-bold text-foreground">
                        {Number(selectedOrder.total).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Review Modal */}
        {reviewProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('orders', 'leaveReview')}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setReviewProduct(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reviewDone ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-foreground font-medium">Merci pour votre avis !</p>
                    <Button onClick={() => setReviewProduct(null)}>Fermer</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{reviewProduct.name}</p>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Note *</label>
                      <StarRating rating={reviewRating} onRatingChange={setReviewRating} size="lg" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Votre avis</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        placeholder="Décrivez votre expérience..."
                      />
                    </div>

                    {reviewError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-600">{reviewError}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setReviewProduct(null)} disabled={reviewSubmitting}>
                        {t('common', 'cancel')}
                      </Button>
                      <Button onClick={submitReview} disabled={reviewSubmitting || reviewRating === 0}>
                        {reviewSubmitting ? t('common', 'sending') : 'Publier'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
