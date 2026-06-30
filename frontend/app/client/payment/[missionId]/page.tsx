'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import apiClient from '@/lib/api/client';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MissionPaymentPage() {
  const { t } = useLanguage();
  const { missionId } = useParams<{ missionId: string }>();
  const router = useRouter();
  const elementsRef = useRef<StripeElements | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isStripeConfigured()) {
          setError(t('clientPayment', 'notConfigured'));
          setLoading(false);
          return;
        }
        // 1) Demander un PaymentIntent au backend
        const { data } = await apiClient.post('/payments/create-intent', { missionId });
        const clientSecret: string | undefined = data?.clientSecret;
        if (!clientSecret) throw new Error(t('clientPayment', 'noClientSecret'));

        // 2) Charger Stripe + monter le Payment Element
        const stripe = await getStripe();
        if (!stripe || cancelled) return;
        stripeRef.current = stripe;
        const elements = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } });
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
    return () => { cancelled = true; };
  }, [missionId]);

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: `${window.location.origin}/client/missions` },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || t('clientPayment', 'paymentFailed'));
      setSubmitting(false);
    } else {
      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => router.push('/client/missions'), 1800);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-lg mx-auto px-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground mb-4">← {t('clientPayment', 'back')}</button>
        <div className="bg-card rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold mb-1">{t('clientPayment', 'title')}</h1>
          <p className="text-muted-foreground mb-6">{t('clientPayment', 'securedByStripe')}</p>

          {loading && <div className="py-10 text-center text-muted-foreground" role="status">{t('clientPayment', 'preparing')}</div>}

          {success ? (
            <div className="py-8 text-center">
              <div className="text-green-600 text-4xl mb-2">✓</div>
              <p className="font-semibold text-foreground">{t('clientPayment', 'paymentDone')}</p>
              <p className="text-muted-foreground text-sm">{t('clientPayment', 'redirecting')}</p>
            </div>
          ) : (
            <>
              <div id="payment-element" className={loading ? 'hidden' : ''} />
              {error && <div className="mt-4 bg-red-500/10 text-red-400 text-sm rounded-lg p-3" role="alert">{error}</div>}
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
