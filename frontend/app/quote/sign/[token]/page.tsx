'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ElectronicSignature } from '@/components/quote/ElectronicSignature';
import { useLanguage } from '@/contexts/LanguageContext';

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validUntil: string;
  artisan: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    artisanProfile?: {
      companyName?: string;
      siret?: string;
    };
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SignatureData {
  quote: Quote;
  expiresAt: string;
  message?: string;
}

export default function SignQuotePage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SignatureData | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/sign/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || t('quoteSign', 'invalidLinkError'));
        }
        const quoteData = await response.json();
        setData(quoteData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchQuote();
    }
  }, [token]);

  const handleSigned = () => {
    setSigned(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('quoteSign', 'loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t('quoteSign', 'invalidLinkTitle')}</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('quoteSign', 'backHome')}
          </a>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t('quoteSign', 'signedTitle')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('quoteSign', 'signedMessage')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('quoteSign', 'signedEmailNote')}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { quote, expiresAt, message } = data;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {t('quoteSign', 'pageTitle')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('quoteSign', 'quoteNumber')} {quote.quoteNumber}
          </p>
        </div>

        {/* Message from artisan */}
        {message && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <p className="text-primary">
              <span className="font-medium">{t('quoteSign', 'artisanMessage')}</span> {message}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quote Details */}
          <div className="bg-card rounded-xl shadow-lg overflow-hidden">
            <div className="bg-muted px-6 py-4">
              <h2 className="text-lg font-bold text-white">{t('quoteSign', 'quoteDetails')}</h2>
            </div>

            <div className="p-6">
              {/* Artisan info */}
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('quoteSign', 'artisan')}</h3>
                <p className="font-semibold text-foreground">
                  {quote.artisan.artisanProfile?.companyName || `${quote.artisan.firstName} ${quote.artisan.lastName}`}
                </p>
                {quote.artisan.artisanProfile?.siret && (
                  <p className="text-sm text-muted-foreground">SIRET: {quote.artisan.artisanProfile.siret}</p>
                )}
                <p className="text-sm text-muted-foreground">{quote.artisan.email}</p>
                {quote.artisan.phone && (
                  <p className="text-sm text-muted-foreground">{quote.artisan.phone}</p>
                )}
              </div>

              {/* Quote title & description */}
              <div className="mb-6 pb-4 border-b border-border">
                <h3 className="font-semibold text-foreground">{quote.title}</h3>
                {quote.description && (
                  <p className="text-sm text-muted-foreground mt-2">{quote.description}</p>
                )}
              </div>

              {/* Line items */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('quoteSign', 'lineItems')}</h3>
                <div className="space-y-3">
                  {quote.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground ml-4">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('quoteSign', 'subtotal')}</span>
                  <span className="text-foreground">{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('quoteSign', 'vat')} ({quote.taxRate}%)</span>
                  <span className="text-foreground">{formatCurrency(quote.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span className="text-foreground">{t('quoteSign', 'totalInclTax')}</span>
                  <span className="text-primary">{formatCurrency(quote.totalAmount)}</span>
                </div>
              </div>

              {/* Validity */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {t('quoteSign', 'validUntil')} <span className="font-medium text-foreground">{formatDate(quote.validUntil)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('quoteSign', 'linkExpires')} {formatDate(expiresAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Signature Component */}
          <div>
            <ElectronicSignature
              quoteId={quote.id}
              signerRole="CLIENT"
              onSigned={handleSigned}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            {t('quoteSign', 'providedBy')}{' '}
            <span className="font-medium">
              {quote.artisan.artisanProfile?.companyName || `${quote.artisan.firstName} ${quote.artisan.lastName}`}
            </span>
          </p>
          <p className="mt-2">
            {t('quoteSign', 'poweredBy')} <span className="font-medium text-primary">Krafolt</span>
          </p>
        </div>
      </div>
    </div>
  );
}
