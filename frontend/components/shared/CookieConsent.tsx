'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'krafolt-cookie-consent';

/**
 * Bandeau de consentement cookies (RGPD / ePrivacy).
 * Tant qu'aucun choix n'est fait, aucun cookie non essentiel ne doit être déposé.
 * Le choix ('accepted' | 'rejected') est conservé en localStorage.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

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
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Nous utilisons des cookies essentiels au fonctionnement du site et, avec votre accord, des cookies de
          mesure d&apos;audience. En savoir plus dans notre{' '}
          <Link href="/legal/cookies" className="text-primary underline">
            politique cookies
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => choose('rejected')}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Refuser
          </button>
          <button
            onClick={() => choose('accepted')}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
