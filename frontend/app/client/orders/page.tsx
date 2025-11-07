'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ClientOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await ordersApi.getMyOrders();

      // Mock data
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'CMD-2024-001',
          status: 'DELIVERED',
          totalAmount: 850,
          items: [
            {
              id: '1',
              productId: 'p1',
              productName: 'Table en chêne massif',
              productImage: 'https://via.placeholder.com/150?text=Table',
              quantity: 1,
              price: 850,
            },
          ],
          artisan: {
            id: 'a1',
            firstName: 'Marc',
            lastName: 'Menuisier',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marc',
          },
          shippingAddress: {
            address: '10 Rue de la Gare',
            city: 'Luxembourg',
            postalCode: '1234',
            country: 'LU',
          },
          createdAt: '2024-01-10T10:00:00Z',
          updatedAt: '2024-01-15T14:30:00Z',
          deliveredAt: '2024-01-15T14:30:00Z',
          trackingNumber: 'LU123456789',
        },
        {
          id: '2',
          orderNumber: 'CMD-2024-002',
          status: 'SHIPPED',
          totalAmount: 240,
          items: [
            {
              id: '2',
              productId: 'p2',
              productName: 'Étagère murale bois',
              productImage: 'https://via.placeholder.com/150?text=Etagere',
              quantity: 2,
              price: 120,
            },
          ],
          artisan: {
            id: 'a1',
            firstName: 'Marc',
            lastName: 'Menuisier',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marc',
          },
          shippingAddress: {
            address: '10 Rue de la Gare',
            city: 'Luxembourg',
            postalCode: '1234',
            country: 'LU',
          },
          createdAt: '2024-01-18T09:00:00Z',
          updatedAt: '2024-01-20T11:00:00Z',
          trackingNumber: 'LU987654321',
        },
        {
          id: '3',
          orderNumber: 'CMD-2024-003',
          status: 'CONFIRMED',
          totalAmount: 350,
          items: [
            {
              id: '3',
              productId: 'p3',
              productName: 'Set d\'outils professionnel',
              productImage: 'https://via.placeholder.com/150?text=Outils',
              quantity: 1,
              price: 350,
            },
          ],
          artisan: {
            id: 'a2',
            firstName: 'Sophie',
            lastName: 'Artisan',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
          },
          shippingAddress: {
            address: '10 Rue de la Gare',
            city: 'Luxembourg',
            postalCode: '1234',
            country: 'LU',
          },
          createdAt: '2024-01-20T15:00:00Z',
          updatedAt: '2024-01-20T16:00:00Z',
        },
        {
          id: '4',
          orderNumber: 'CMD-2024-004',
          status: 'PENDING',
          totalAmount: 185,
          items: [
            {
              id: '4',
              productId: 'p4',
              productName: 'Lampe artisanale',
              productImage: 'https://via.placeholder.com/150?text=Lampe',
              quantity: 1,
              price: 95,
            },
            {
              id: '5',
              productId: 'p5',
              productName: 'Cadre photo bois',
              productImage: 'https://via.placeholder.com/150?text=Cadre',
              quantity: 3,
              price: 30,
            },
          ],
          artisan: {
            id: 'a3',
            firstName: 'Pierre',
            lastName: 'Créateur',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pierre',
          },
          shippingAddress: {
            address: '10 Rue de la Gare',
            city: 'Luxembourg',
            postalCode: '1234',
            country: 'LU',
          },
          createdAt: '2024-01-21T10:00:00Z',
          updatedAt: '2024-01-21T10:00:00Z',
        },
      ];

      setOrders(mockOrders);
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
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;

    try {
      // TODO: Replace with actual API call
      // await ordersApi.cancelOrder(orderId);

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
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes commandes</h1>
          <p className="text-gray-600">
            Suivez l'état de vos commandes et consultez votre historique
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total commandes</div>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">En attente</div>
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">En cours</div>
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter((o) => ['CONFIRMED', 'SHIPPED'].includes(o.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Livrées</div>
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
            Toutes ({orders.length})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            En attente ({orders.filter((o) => o.status === 'PENDING').length})
          </Button>
          <Button
            variant={filter === 'CONFIRMED' ? 'default' : 'outline'}
            onClick={() => setFilter('CONFIRMED')}
          >
            Confirmées ({orders.filter((o) => o.status === 'CONFIRMED').length})
          </Button>
          <Button
            variant={filter === 'SHIPPED' ? 'default' : 'outline'}
            onClick={() => setFilter('SHIPPED')}
          >
            Expédiées ({orders.filter((o) => o.status === 'SHIPPED').length})
          </Button>
          <Button
            variant={filter === 'DELIVERED' ? 'default' : 'outline'}
            onClick={() => setFilter('DELIVERED')}
          >
            Livrées ({orders.filter((o) => o.status === 'DELIVERED').length})
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-gray-500 mb-4">Aucune commande trouvée</p>
                <Button onClick={() => router.push('/client/marketplace')}>
                  Découvrir le marketplace
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
                        <h3 className="text-xl font-semibold text-gray-900">
                          Commande {order.orderNumber}
                        </h3>
                        <Badge className={STATUS_COLORS[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Commandé le {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {order.totalAmount}€
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} article(s)
                      </p>
                    </div>
                  </div>

                  {/* Artisan Info */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    <img
                      src={order.artisan.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                      alt={order.artisan.firstName}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="text-sm text-gray-600">Vendu par</p>
                      <p className="font-semibold text-gray-900">
                        {order.artisan.firstName} {order.artisan.lastName}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-600">
                            Quantité: {item.quantity} × {item.price}€
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {(item.quantity * item.price).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Info */}
                  {order.trackingNumber && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-blue-900">
                        Numéro de suivi: {order.trackingNumber}
                      </p>
                      {order.deliveredAt && (
                        <p className="text-xs text-blue-700 mt-1">
                          Livré le {formatDate(order.deliveredAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Voir les détails
                    </Button>

                    {order.status === 'DELIVERED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/client/marketplace/${order.items[0].productId}`)}
                      >
                        Laisser un avis
                      </Button>
                    )}

                    {order.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Annuler la commande
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/client/messages?userId=${order.artisan.id}`)}
                    >
                      💬 Contacter le vendeur
                    </Button>
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
                  <CardTitle>Détails de la commande</CardTitle>
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
                    <p className="text-sm text-gray-600">Numéro de commande</p>
                    <p className="font-semibold text-lg">{selectedOrder.orderNumber}</p>
                    <Badge className={`${STATUS_COLORS[selectedOrder.status]} mt-2`}>
                      {STATUS_LABELS[selectedOrder.status]}
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Date de commande</p>
                      <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                    {selectedOrder.deliveredAt && (
                      <div>
                        <p className="text-sm text-gray-600">Date de livraison</p>
                        <p className="font-medium">{formatDate(selectedOrder.deliveredAt)}</p>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Articles commandés</p>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} × {item.price}€
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(item.quantity * item.price).toFixed(2)}€
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Adresse de livraison</p>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{selectedOrder.shippingAddress.address}</p>
                      <p className="text-gray-700">
                        {selectedOrder.shippingAddress.postalCode} {selectedOrder.shippingAddress.city}
                      </p>
                      <p className="text-gray-700">{selectedOrder.shippingAddress.country}</p>
                    </div>
                  </div>

                  {/* Tracking */}
                  {selectedOrder.trackingNumber && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Suivi de livraison</p>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-900">
                          {selectedOrder.trackingNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Total</span>
                      <span className="text-2xl font-bold text-gray-900">
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
