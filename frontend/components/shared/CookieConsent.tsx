'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const STORAGE_KEY = 'krafolt-cookie-consent';

// Bandeau site-wide : dictionnaire local (7 langues) pour rester cohérent avec le sélecteur de langue.
const COOKIE_I18N: Record<string, { text: string; policy: string; reject: string; accept: string }> = {
  fr: { text: "Nous utilisons des cookies essentiels au fonctionnement du site et, avec votre accord, des cookies de mesure d'audience. En savoir plus dans notre", policy: 'politique cookies', reject: 'Refuser', accept: 'Accepter' },
  en: { text: 'We use cookies that are essential to the operation of the site and, with your consent, analytics cookies. Learn more in our', policy: 'cookie policy', reject: 'Decline', accept: 'Accept' },
  de: { text: 'Wir verwenden Cookies, die für den Betrieb der Website unerlässlich sind, und mit Ihrer Zustimmung Analyse-Cookies. Mehr dazu in unserer', policy: 'Cookie-Richtlinie', reject: 'Ablehnen', accept: 'Akzeptieren' },
  nl: { text: 'We gebruiken cookies die essentieel zijn voor de werking van de site en, met uw toestemming, analytische cookies. Lees meer in ons', policy: 'cookiebeleid', reject: 'Weigeren', accept: 'Accepteren' },
  es: { text: 'Utilizamos cookies esenciales para el funcionamiento del sitio y, con su consentimiento, cookies de análisis. Más información en nuestra', policy: 'política de cookies', reject: 'Rechazar', accept: 'Aceptar' },
  it: { text: 'Utilizziamo cookie essenziali per il funzionamento del sito e, con il tuo consenso, cookie di analisi. Scopri di più nella nostra', policy: 'informativa sui cookie', reject: 'Rifiuta', accept: 'Accetta' },
  pt: { text: 'Utilizamos cookies essenciais ao funcionamento do site e, com o seu consentimento, cookies de medição de audiência. Saiba mais na nossa', policy: 'política de cookies', reject: 'Recusar', accept: 'Aceitar' },
};

/**
 * Bandeau de consentement cookies (RGPD / ePrivacy).
 * Tant qu'aucun choix n'est fait, aucun cookie non essentiel ne doit être déposé.
 * Le choix ('accepted' | 'rejected') est conservé en localStorage.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { language } = useLanguage();
  const tr = COOKIE_I18N[language] || COOKIE_I18N.fr;

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* localStorage indisponible : on n'affiche pas pour ne pas bloquer */
    }
  }, []);

  const choose = (value: 'accepted' | 'rejected') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      // Les scripts de mesure d'audience ne devront s'initialiser que si value === 'accepted'.
      window.dispatchEvent(new CustomEvent('cookie-consent', { detail: value }));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm text-muted-foreground">
          {tr.text}{' '}
          <Link href="/legal/cookies" className="text-primary underline">
            {tr.policy}
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <button
            onClick={() => choose('rejected')}
            className="flex-1 whitespace-nowrap rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent sm:flex-none"
          >
            {tr.reject}
          </button>
          <button
            onClick={() => choose('accepted')}
            className="flex-1 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:flex-none"
          >
            {tr.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
