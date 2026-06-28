'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marketplaceApi } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  items: OrderItem[];
  artisan: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  trackingNumber?: string;
}


const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  CONFIRMED: 'bg-primary/10 text-primary',
  SHIPPED: 'bg-purple-500/15 text-purple-400',
  DELIVERED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

export default function ClientOrdersPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: t('common', 'pending'),
      CONFIRMED: t('orders', 'confirmed'),
      SHIPPED: t('orders', 'shipped'),
      DELIVERED: t('orders', 'delivered'),
      CANCELLED: t('common', 'cancelled'),
    };
    return statusMap[status] || status;
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await marketplaceApi.getOrders();
      setOrders(data);
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
      await marketplaceApi.updateOrderStatus(orderId, 'CANCELLED');

      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, status: 'CANCELLED' as const } : o
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('orders', 'title')}</h1>
          <p className="text-muted-foreground">
            {t('orders', 'trackOrders')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('orders', 'totalOrders')}</div>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('common', 'pending')}</div>
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('orders', 'inProgress')}</div>
              <div className="text-2xl font-bold text-primary">
                {orders.filter((o) => ['CONFIRMED', 'SHIPPED'].includes(o.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('orders', 'delivered')}</div>
              <div className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === 'DELIVERED').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            {t('orders', 'all')} ({orders.length})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            {t('common', 'pending')} ({orders.filter((o) => o.status === 'PENDING').length})
          </Button>
          <Button
            variant={filter === 'CONFIRMED' ? 'default' : 'outline'}
            onClick={() => setFilter('CONFIRMED')}
          >
            {t('orders', 'confirmed')} ({orders.filter((o) => o.status === 'CONFIRMED').length})
          </Button>
          <Button
            variant={filter === 'SHIPPED' ? 'default' : 'outline'}
            onClick={() => setFilter('SHIPPED')}
          >
            {t('orders', 'shipped')} ({orders.filter((o) => o.status === 'SHIPPED').length})
          </Button>
          <Button
            variant={filter === 'DELIVERED' ? 'default' : 'outline'}
            onClick={() => setFilter('DELIVERED')}
          >
            {t('orders', 'delivered')} ({orders.filter((o) => o.status === 'DELIVERED').length})
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-muted-foreground mb-4">{t('orders', 'noOrders')}</p>
                <Button onClick={() => router.push('/client/marketplace')}>
                  {t('orders', 'discoverMarketplace')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">
                          {t('orders', 'order')} {order.orderNumber}
                        </h3>
                        <Badge className={STATUS_COLORS[order.status]}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('orders', 'orderedOn')} {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">
                        {order.totalAmount}€
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} {order.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? t('cart', 'items') : t('cart', 'item')}
                      </p>
                    </div>
                  </div>

                  {/* Artisan Info (le listing peut ne pas inclure l'artisan) */}
                  {order.artisan && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                      <img
                        src={order.artisan.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt={order.artisan.firstName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('orders', 'soldBy')}</p>
                        <p className="font-semibold text-foreground">
                          {order.artisan.firstName} {order.artisan.lastName}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {(order.items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('cart', 'quantity')}: {item.quantity} × {Number(item.price)}€
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {(item.quantity * Number(item.price)).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Info */}
                  {order.trackingNumber && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-primary">
                        {t('orders', 'trackingNumber')}: {order.trackingNumber}
                      </p>
                      {order.deliveredAt && (
                        <p className="text-xs text-primary mt-1">
                          {t('orders', 'deliveredOn')} {formatDate(order.deliveredAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {t('orders', 'viewDetails')}
                    </Button>

                    {order.status === 'DELIVERED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => order.items?.[0] && router.push(`/client/marketplace/${order.items[0].productId}`)}
                      >
                        {t('orders', 'leaveReview')}
                      </Button>
                    )}

                    {order.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-red-600 hover:text-red-400"
                      >
                        {t('orders', 'cancelOrder')}
                      </Button>
                    )}

                    {order.artisan?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/client/messages?userId=${order.artisan.id}`)}
                      >
                        💬 {t('orders', 'contactSeller')}
                      </Button>
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
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order Number and Status */}
                  <div>
                    <p className="text-sm text-muted-foreground">{t('orders', 'orderNumber')}</p>
                    <p className="font-semibold text-lg">{selectedOrder.orderNumber}</p>
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
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {Number(item.price)}€
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(item.quantity * Number(item.price)).toFixed(2)}€
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('orders', 'shippingAddress')}</p>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="font-medium">{selectedOrder.shippingAddress.address}</p>
                      <p className="text-foreground">
                        {selectedOrder.shippingAddress.postalCode} {selectedOrder.shippingAddress.city}
                      </p>
                      <p className="text-foreground">{selectedOrder.shippingAddress.country}</p>
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

                  {/* Total */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">{t('cart', 'total')}</span>
                      <span className="text-2xl font-bold text-foreground">
                        {selectedOrder.totalAmount}€
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
