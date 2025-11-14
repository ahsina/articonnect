'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/stores/cartStore';
import { Input } from '@/components/ui/input';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } =
    useCartStore();

  const handleCheckout = () => {
    // TODO: Implement checkout flow with Stripe
    alert('Checkout en cours de développement');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Panier
          </h1>
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-xl text-gray-600 mb-6">
                Votre panier est vide
              </p>
              <Button onClick={() => router.push('/client/marketplace')}>
                Continuer vos achats
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Panier ({items.length} {items.length > 1 ? 'articles' : 'article'})
          </h1>
          <Button variant="outline" onClick={clearCart}>
            Vider le panier
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card
                key={`${item.productId}-${item.variantId || 'default'}`}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <img
                      src={item.image || 'https://via.placeholder.com/100?text=Produit'}
                      alt={item.productName}
                      className="w-24 h-24 object-cover rounded-lg"
                    />

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.productName}
                      </h3>
                      {item.variantName && (
                        <p className="text-sm text-gray-600 mb-2">
                          Variante: {item.variantName}
                        </p>
                      )}
                      {item.artisan && (
                        <p className="text-sm text-gray-500">
                          Vendeur: {item.artisan.name}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.variantId
                              )
                            }
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.productId,
                                parseInt(e.target.value) || 1,
                                item.variantId
                              )
                            }
                            className="w-16 text-center"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.variantId
                              )
                            }
                          >
                            +
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="text-lg font-semibold text-gray-900">
                          {(item.price * item.quantity).toFixed(2)}€
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="ml-auto text-red-600 hover:text-red-700"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Récapitulatif
                </h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-gray-700">
                    <span>Sous-total</span>
                    <span>{getTotalPrice().toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Livraison</span>
                    <span>Gratuite</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span>{getTotalPrice().toFixed(2)}€</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full mb-3" size="lg" onClick={handleCheckout}>
                  Passer la commande
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/client/marketplace')}
                >
                  Continuer mes achats
                </Button>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Paiement sécurisé</strong> via Stripe
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
