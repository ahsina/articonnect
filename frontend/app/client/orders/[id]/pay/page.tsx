'use client';

import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { marketplaceApi } from '@/lib/api/marketplace';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Paiement d'une commande produit (checkout marketplace).
 * RÉUTILISE EXACTEMENT le pattern de la page d'escrow mission
 * (frontend/app/client/payment/[missionId]/page.tsx) : getStripe/isStripeConfigured,
 * Stripe Elements (Payment Element), confirmPayment(redirect: 'if_required').
 * Seule différence : la source du clientSecret = marketplaceApi.payOrder(orderId)
 * au lieu de POST /payments/create-intent, et le retour se fait vers /client/orders.
 *
 * NB anti-désintermédiation : la réponse backend peut contenir la commission plateforme ;
 * elle n'est jamais lue/affichée ici — on n'utilise que `clientSecret` et le montant total.
 */
export default function OrderPaymentPage() {
  const { t } = useLanguage();
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const elementsRef = useRef<StripeElements | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const mountedRef = useRef(false);
  // Guard : ne demander un PaymentIntent qu'UNE seule fois (promesse mise en cache), afin
  // qu'un ré-render / re-run de l'effet réutilise le même appel — jamais de boucle de requêtes.
  const intentRef = useRef<Promise<string | undefined> | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isStripeConfigured()) {
          setError(t('clientPayment', 'notConfigured'));
          setLoading(false);
          return;
        }
        // 1) Demander le PaymentIntent de la commande au backend — UNE seule fois (promesse en cache).
        if (!intentRef.current) {
          intentRef.current = marketplaceApi.payOrder(orderId).then((res) => {
            if (res.amount != null) setAmount(res.amount);
            // Commande déjà payée : pas de clientSecret -> on redirige vers la liste des commandes.
            if (res.alreadyPaid && !res.clientSecret) {
              setSuccess(true);
              setTimeout(() => router.push('/client/orders'), 1500);
              return undefined;
            }
            return res.clientSecret;
          });
        }
        const clientSecret = await intentRef.current;
        if (!clientSecret) {
          // Soit déjà payée (success déjà géré ci-dessus), soit réponse invalide.
          if (!cancelled) setLoading(false);
          return;
        }

        // 2) Charger Stripe + monter le Payment Element
        const stripe = await getStripe();
        if (!stripe || cancelled) return;
        stripeRef.current = stripe;
        const elements = stripe.elements({
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: { colorPrimary: '#000000', borderRadius: '10px', fontFamily: 'Manrope, Inter, sans-serif' },
          },
        });
        elementsRef.current = elements;
        const paymentElement = elements.create('payment');
        if (!cancelled && !mountedRef.current) {
          paymentElement.mount('#payment-element');
          mountedRef.current = true;
        }
        setLoading(false);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || t('clientPayment', 'prepError'));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: `${window.location.origin}/client/orders` },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || t('clientPayment', 'paymentFailed'));
      setSubmitting(false);
    } else {
      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => router.push('/client/orders'), 1800);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-lg mx-auto px-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground mb-4">
          {t('clientPayment', 'back')}
        </button>
        <div className="bg-card rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)] p-6">
          <h1 className="font-display text-2xl font-extrabold mb-1">Paiement de la commande</h1>
          <p className="text-muted-foreground mb-4">{t('clientPayment', 'securedByStripe')}</p>

          {amount != null && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-muted p-3.5 text-sm">
              <span className="text-muted-foreground">{t('cart', 'total') || 'Total'}</span>
              <span className="text-lg font-bold text-foreground">{(Number(amount) || 0).toFixed(2)}€</span>
            </div>
          )}

          {/* Réassurance paiement produit (capture immédiate, pas de séquestre comme une mission) */}
          <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-muted p-3.5 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
            <span className="font-medium">
              Paiement sécurisé — le vendeur prépare et expédie votre commande après confirmation.
            </span>
          </div>

          {loading && (
            <div className="py-10 text-center text-muted-foreground" role="status">
              {t('clientPayment', 'preparing')}
            </div>
          )}

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-foreground" strokeWidth={1.75} />
              <p className="font-semibold text-foreground">{t('clientPayment', 'paymentDone')}</p>
              <p className="text-muted-foreground text-sm">{t('clientPayment', 'redirecting')}</p>
            </div>
          ) : (
            <>
              <div id="payment-element" className={loading ? 'hidden' : ''} />
              {error && (
                <div className="mt-4 bg-red-100 text-red-700 text-sm rounded-lg p-3" role="alert">
                  {error}
                </div>
              )}
              {!loading && !error && (
                <Button className="w-full mt-6" onClick={handlePay} disabled={submitting}>
                  {submitting ? t('clientPayment', 'processing') : t('clientPayment', 'payNow')}
                </Button>
              )}
              {!loading && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {t('clientPayment', 'testCard')} : 4242 4242 4242 4242 · {t('clientPayment', 'testCardHint')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
