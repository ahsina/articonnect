'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/stores/cartStore';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { marketplaceApi } from '@/lib/api/marketplace';
import { useToast } from '@/hooks/use-toast';

export default function CartPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } =
    useCartStore();
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      toast({
        title: t('cart', 'error'),
        description: t('cart', 'shippingAddressRequired'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare order items
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId,
      }));

      // Create order
      const order = await marketplaceApi.createOrder({
        items: orderItems,
        shippingAddress,
      });

      // Clear cart
      clearCart();

      // Show success message
      toast({
        title: t('cart', 'orderPlaced'),
        description: t('cart', 'orderPlacedDescription'),
        variant: 'success',
      });

      // Redirect to orders page
      router.push('/client/orders');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: t('cart', 'checkoutError'),
        description:
          error.response?.data?.message ||
          t('cart', 'checkoutErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            {t('cart', 'title')}
          </h1>
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4"></div>
              <p className="text-xl text-muted-foreground mb-6">
                {t('cart', 'emptyCart')}
              </p>
              <Button onClick={() => router.push('/client/marketplace')}>
                {t('cart', 'continueShopping')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t('cart', 'title')} ({items.length} {items.length > 1 ? t('cart', 'items') : t('cart', 'item')})
          </h1>
          <Button variant="outline" onClick={clearCart}>
            {t('cart', 'emptyCartButton')}
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
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {item.productName}
                      </h3>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {t('cart', 'variant')}: {item.variantName}
                        </p>
                      )}
                      {item.artisan && (
                        <p className="text-sm text-muted-foreground">
                          {t('cart', 'seller')}: {item.artisan.name}
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
                        <div className="text-lg font-semibold text-foreground">
                          {(Number(item.price * item.quantity) || 0).toFixed(2)}€
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="ml-auto text-red-600 hover:text-red-700"
                        >
                          {t('cart', 'remove')}
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
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {t('cart', 'summary')}
                </h2>

                {/* Shipping Address */}
                <div className="mb-6">
                  <label
                    htmlFor="shippingAddress"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {t('cart', 'shippingAddress')} *
                  </label>
                  <textarea
                    id="shippingAddress"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder={t('cart', 'shippingAddressPlaceholder')}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={3}
                    required
                  />
                </div>

                {/* Doit refléter le calcul serveur : sous-total + TVA (17% LU) + livraison forfaitaire 5.99€ */}
                {(() => {
                  const subtotal = getTotalPrice();
                  const VAT_RATE = 0.17;
                  const SHIPPING = 5.99;
                  const vat = subtotal * VAT_RATE;
                  const total = subtotal + vat + SHIPPING;
                  return (
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-foreground">
                        <span>{t('cart', 'subtotal')}</span>
                        <span>{(Number(subtotal) || 0).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('checkout', 'vat') || 'TVA (17%)'}</span>
                        <span>{(Number(vat) || 0).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('cart', 'shipping')}</span>
                        <span>{(Number(SHIPPING) || 0).toFixed(2)}€</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-xl font-bold text-foreground">
                          <span>{t('cart', 'total')}</span>
                          <span>{(Number(total) || 0).toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <Button
                  className="w-full mb-3"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loading || !shippingAddress.trim()}
                >
                  {loading ? t('cart', 'processing') : t('cart', 'placeOrder')}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/client/marketplace')}
                >
                  {t('cart', 'continueShopping')}
                </Button>

                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-primary">
                    <strong>{t('cart', 'securePayment')}</strong> via Stripe
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
