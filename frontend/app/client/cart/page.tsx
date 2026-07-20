'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/lib/stores/cartStore';
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

      // Create order (statut PENDING) — le paiement se fait à l'étape suivante.
      const order = await marketplaceApi.createOrder({
        items: orderItems,
        shippingAddress,
      });

      // Clear cart (les articles sont désormais portés par la commande PENDING).
      clearCart();

      // Direction l'étape de PAIEMENT de la commande (Stripe). Si l'ID est absent
      // (réponse inattendue), repli sur la liste des commandes.
      if (order?.id) {
        router.push(`/client/orders/${order.id}/pay`);
      } else {
        toast({
          title: t('cart', 'orderPlaced'),
          description: t('cart', 'orderPlacedDescription'),
          variant: 'success',
        });
        router.push('/client/orders');
      }
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
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-[1120px] mx-auto">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground mb-6">
            {t('cart', 'title')}
          </h1>
          <Card>
            <CardContent className="p-12 pt-12 text-center">
              <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-lg text-muted-foreground mb-6">
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
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            {t('cart', 'title')}{' '}
            <span className="font-semibold text-lg text-muted-foreground">
              ({items.length} {items.length > 1 ? t('cart', 'items') : t('cart', 'item')})
            </span>
          </h1>
          <button
            onClick={clearCart}
            className="text-sm font-semibold text-destructive hover:opacity-80"
          >
            {t('cart', 'emptyCartButton')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Cart Items */}
          <Card className="overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.variantId || 'default'}`}
                className={`flex gap-5 p-5 items-start ${idx > 0 ? 'border-t border-border' : ''}`}
              >
                {/* Product Image */}
                <img
                  src={item.image || 'https://via.placeholder.com/100?text=Produit'}
                  alt={item.productName}
                  className="w-[92px] h-[92px] object-cover rounded-2xl flex-shrink-0 bg-muted"
                />

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-foreground">
                    {item.productName}
                  </h3>
                  {item.variantName && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {t('cart', 'variant')}: {item.variantName}
                    </p>
                  )}
                  {item.artisan && (
                    <p className="text-[13px] text-muted-foreground">
                      {t('cart', 'seller')}: {item.artisan.name}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3.5">
                    {/* Quantity Controls */}
                    <div className="inline-flex items-center border border-border rounded-xl overflow-hidden">
                      <button
                        className="w-9 h-[38px] text-lg text-foreground hover:bg-muted"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity - 1,
                            item.variantId
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.productId,
                            parseInt(e.target.value) || 1,
                            item.variantId
                          )
                        }
                        className="w-11 h-[38px] text-center font-bold text-sm border-x border-border bg-card text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="1"
                      />
                      <button
                        className="w-9 h-[38px] text-lg text-foreground hover:bg-muted"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity + 1,
                            item.variantId
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    {/* Price */}
                    <div className="font-display font-bold text-[17px] text-foreground">
                      {(Number(item.price * item.quantity) || 0).toFixed(2)}€
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="ml-auto text-[13px] font-semibold text-destructive hover:opacity-80"
                    >
                      {t('cart', 'remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Order Summary */}
          <Card className="lg:sticky lg:top-24">
            <CardContent className="p-6 pt-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">
                {t('cart', 'summary')}
              </h2>

              {/* Shipping Address */}
              <div className="mb-4">
                <label
                  htmlFor="shippingAddress"
                  className="block text-[13px] font-semibold text-foreground mb-2"
                >
                  {t('cart', 'shippingAddress')} *
                </label>
                <textarea
                  id="shippingAddress"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder={t('cart', 'shippingAddressPlaceholder')}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm resize-none bg-card text-foreground focus:outline focus:outline-2 focus:outline-foreground focus:-outline-offset-1"
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
                  <div className="border-t border-border pt-1.5 mb-4">
                    <div className="flex justify-between py-2 text-sm text-foreground">
                      <span>{t('cart', 'subtotal')}</span>
                      <span>{(Number(subtotal) || 0).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm text-muted-foreground">
                      <span>{t('checkout', 'vat') || 'TVA (17%)'}</span>
                      <span>{(Number(vat) || 0).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm text-muted-foreground">
                      <span>{t('cart', 'shipping')}</span>
                      <span>{(Number(SHIPPING) || 0).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border mt-1.5 pt-3.5">
                      <span className="font-display font-extrabold text-lg text-foreground">{t('cart', 'total')}</span>
                      <span className="font-display font-extrabold text-xl text-foreground">{(Number(total) || 0).toFixed(2)}€</span>
                    </div>
                  </div>
                );
              })()}

              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={loading || !shippingAddress.trim()}
              >
                {loading ? t('cart', 'processing') : t('cart', 'placeOrder')}
              </Button>

              <Button
                variant="outline"
                className="w-full mt-2.5"
                onClick={() => router.push('/client/marketplace')}
              >
                {t('cart', 'continueShopping')}
              </Button>

              <div className="mt-3.5 flex items-start gap-2.5 bg-muted rounded-xl p-3 text-[13px] font-medium text-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
                <span>
                  <strong>{t('cart', 'securePayment')}</strong> via Stripe
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
