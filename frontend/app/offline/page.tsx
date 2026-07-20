'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OfflinePage() {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-6 font-display text-lg font-extrabold text-foreground">Krafolt</div>

          {/* Illustration Wi-Fi */}
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
            <span className="absolute h-28 w-28 rounded-full border-2 border-border" />
            <span className="absolute h-[86px] w-[86px] rounded-full border-2 border-border" />
            <span className="absolute h-[52px] w-[52px] rounded-full border-2 border-border" />
            <span className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-muted">
              <svg className={`h-6 w-6 ${isOnline ? 'text-success' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.1 16.9a5 5 0 017.8 0M4.9 13.6a10 10 0 0114.2 0M2 10.4a15 15 0 0120 0M12 20h.01" />
              </svg>
            </span>
            {!isOnline && (
              <span className="absolute z-20 h-[3px] w-36 rotate-45 rounded bg-destructive" />
            )}
          </div>

          <h1 className="mb-2 font-display text-2xl font-extrabold text-foreground">
            {isOnline
              ? t('offlinePage', 'titleOnline') || 'Connexion rétablie !'
              : t('offlinePage', 'titleOffline') || 'Vous êtes hors ligne'}
          </h1>

          <p className="mb-6 text-muted-foreground">
            {isOnline
              ? t('offlinePage', 'descOnline') || 'Votre connexion internet est de retour. Cliquez ci-dessous pour continuer.'
              : t('offlinePage', 'descOffline') || 'Impossible de se connecter à Internet. Vérifiez votre connexion et réessayez.'}
          </p>

          {/* Connection status indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-destructive'} animate-pulse`}
            />
            <span className={`text-sm font-medium ${isOnline ? 'text-success' : 'text-destructive'}`}>
              {isOnline ? t('offlinePage', 'statusOnline') || 'En ligne' : t('offlinePage', 'statusOffline') || 'Hors ligne'}
            </span>
          </div>

          <button
            onClick={handleRetry}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.6M20 20v-5h-.6M5.6 9A7 7 0 0118.4 7.6L20 9M4 15l1.6 1.4A7 7 0 0018.4 15" />
            </svg>
            {isOnline ? t('offlinePage', 'backHome') || "Retour à l'accueil" : t('offlinePage', 'retry') || 'Réessayer'}
          </button>

          <button
            onClick={() => window.history.back()}
            className="mt-3 w-full rounded-xl border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t('offlinePage', 'back') || 'Retour'}
          </button>

          {/* Offline features */}
          {!isOnline && (
            <div className="mt-8 border-t border-border pt-6 text-left">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('offlinePage', 'availableTitle') || 'Fonctionnalités disponibles hors ligne :'}
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5 text-foreground">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {t('offlinePage', 'featSavedMissions') || 'Consulter vos missions enregistrées'}
                </li>
                <li className="flex items-center gap-2.5 text-foreground">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {t('offlinePage', 'featProfile') || 'Voir votre profil'}
                </li>
                <li className="flex items-center gap-2.5 text-foreground">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {t('offlinePage', 'featCachedMessages') || 'Accéder aux messages en cache'}
                </li>
                <li className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  {t('offlinePage', 'featSendMessages') || 'Envoyer de nouveaux messages'}
                </li>
                <li className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  {t('offlinePage', 'featAcceptMissions') || 'Accepter des missions'}
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
