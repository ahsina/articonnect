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
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">📡</div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isOnline
              ? t('offlinePage', 'titleOnline') || 'Connexion rétablie !'
              : t('offlinePage', 'titleOffline') || 'Vous êtes hors ligne'}
          </h1>

          <p className="text-muted-foreground mb-6">
            {isOnline
              ? t('offlinePage', 'descOnline') || 'Votre connexion internet est de retour. Cliquez ci-dessous pour continuer.'
              : t('offlinePage', 'descOffline') || 'Impossible de se connecter à Internet. Vérifiez votre connexion et réessayez.'}
          </p>

          {/* Connection status indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
            />
            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? t('offlinePage', 'statusOnline') || 'En ligne' : t('offlinePage', 'statusOffline') || 'Hors ligne'}
            </span>
          </div>

          <button
            onClick={handleRetry}
            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {isOnline ? t('offlinePage', 'backHome') || "Retour à l'accueil" : t('offlinePage', 'retry') || 'Réessayer'}
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full mt-3 bg-card text-foreground px-6 py-3 rounded-lg font-medium border border-border hover:bg-accent transition-colors"
          >
            {t('offlinePage', 'back') || 'Retour'}
          </button>

          {/* Offline features */}
          {!isOnline && (
            <div className="mt-8 pt-6 border-t text-left">
              <h3 className="text-sm font-medium text-foreground mb-3">
                {t('offlinePage', 'availableTitle') || 'Fonctionnalités disponibles hors ligne :'}
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('offlinePage', 'featSavedMissions') || 'Consulter vos missions enregistrées'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('offlinePage', 'featProfile') || 'Voir votre profil'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('offlinePage', 'featCachedMessages') || 'Accéder aux messages en cache'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">✗</span>
                  <span className="text-muted-foreground">{t('offlinePage', 'featSendMessages') || 'Envoyer de nouveaux messages'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">✗</span>
                  <span className="text-muted-foreground">{t('offlinePage', 'featAcceptMissions') || 'Accepter des missions'}</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
