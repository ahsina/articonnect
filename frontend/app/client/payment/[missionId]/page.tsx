'use client';

import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import apiClient from '@/lib/api/client';
import { missionsApi } from '@/lib/api/missions';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentMission {
  title?: string;
  agreedPrice?: number | string;
  artisan?: {
    firstName?: string;
    lastName?: string;
    artisanProfile?: { companyName?: string } | null;
  } | null;
}

const fmtEur = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isFinite(n)) return '';
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
};

export default function MissionPaymentPage() {
  const { t } = useLanguage();
  const { missionId } = useParams<{ missionId: string }>();
  const router = useRouter();
  const elementsRef = useRef<StripeElements | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const mountedRef = useRef(false);
  // Guard : ne demander un PaymentIntent qu'UNE seule fois (la promesse est mise en cache,
  // donc un ré-render / re-run de l'effet réutilise le même appel — même en cas d'erreur 400,
  // on ne relance jamais la requête en boucle).
  const intentRef = useRef<Promise<string | undefined> | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recap, setRecap] = useState<PaymentMission | null>(null);

  // Récapitulatif : nom de l'artisan choisi + montant + intitulé, pour ne plus payer « à l'aveugle ».
  useEffect(() => {
    if (!missionId) return;
    missionsApi.getById(missionId)
      .then((m) => setRecap(m))
      .catch(() => setRecap(null));
  }, [missionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isStripeConfigured()) {
          setError(t('clientPayment', 'notConfigured'));
          setLoading(false);
          return;
        }
        // 1) Demander un PaymentIntent au backend — UNE seule fois (promesse mise en cache).
        //    En cas d'échec (400 : prix non défini, etc.) on réutilise la promesse rejetée
        //    au lieu de relancer l'appel à chaque render.
        if (!intentRef.current) {
          intentRef.current = apiClient
            .post('/payments/create-intent', { missionId })
            .then((res) => res.data?.clientSecret as string | undefined);
        }
        const clientSecret = await intentRef.current;
        if (!clientSecret) throw new Error(t('clientPayment', 'noClientSecret'));

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
        <button onClick={() => router.back()} className="text-sm text-muted-foreground mb-4">{t('clientPayment', 'back')}</button>
        <div className="bg-card rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)] p-6">
          <h1 className="font-display text-2xl font-extrabold mb-1">{t('clientPayment', 'title')}</h1>
          <p className="text-muted-foreground mb-4">{t('clientPayment', 'securedByStripe')}</p>

          {/* Récapitulatif de la prestation payée (artisan + montant + intitulé) */}
          {recap && (recap.artisan || recap.agreedPrice || recap.title) && (
            <div className="mb-4 rounded-xl border border-border p-4">
              {recap.title && (
                <div className="font-display text-sm font-bold text-foreground">{recap.title}</div>
              )}
              {recap.artisan && (
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {t('offers', 'chosenArtisan') || 'Artisan'} :{' '}
                  <span className="font-semibold text-foreground">
                    {recap.artisan.artisanProfile?.companyName ||
                      `${recap.artisan.firstName ?? ''} ${recap.artisan.lastName ?? ''}`.trim()}
                  </span>
                </div>
              )}
              {recap.agreedPrice != null && (
                <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">{t('offers', 'amountToPay') || 'Montant à payer'}</span>
                  <span className="font-display text-2xl font-extrabold text-foreground">{fmtEur(recap.agreedPrice)}</span>
                </div>
              )}
            </div>
          )}

          {/* Réassurance séquestre */}
          <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-muted p-3.5 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
            <span className="font-medium">
              {t('clientPayment', 'escrowNotice') || 'Paiement sécurisé sous séquestre — l’artisan n’est payé qu’une fois le travail validé par vous.'}
            </span>
          </div>

          {loading && <div className="py-10 text-center text-muted-foreground" role="status">{t('clientPayment', 'preparing')}</div>}

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-foreground" strokeWidth={1.75} />
              <p className="font-semibold text-foreground">{t('clientPayment', 'paymentDone')}</p>
              <p className="text-muted-foreground text-sm">{t('clientPayment', 'redirecting')}</p>
            </div>
          ) : (
            <>
              <div id="payment-element" className={loading ? 'hidden' : ''} />
              {error && <div className="mt-4 bg-red-100 text-red-700 text-sm rounded-lg p-3" role="alert">{error}</div>}
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
