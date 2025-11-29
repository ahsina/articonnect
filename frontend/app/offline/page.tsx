'use client';

import { useState, useEffect } from 'react';

export default function OfflinePage() {
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">📡</div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? 'Connexion rétablie !' : 'Vous êtes hors ligne'}
          </h1>

          <p className="text-gray-600 mb-6">
            {isOnline
              ? 'Votre connexion internet est de retour. Cliquez ci-dessous pour continuer.'
              : 'Impossible de se connecter à Internet. Vérifiez votre connexion et réessayez.'}
          </p>

          {/* Connection status indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
            />
            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>

          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {isOnline ? "Retour à l'accueil" : 'Réessayer'}
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full mt-3 bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Retour
          </button>

          {/* Offline features */}
          {!isOnline && (
            <div className="mt-8 pt-6 border-t text-left">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Fonctionnalités disponibles hors ligne :
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Consulter vos missions enregistrées
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Voir votre profil
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Accéder aux messages en cache
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">✗</span>
                  <span className="text-gray-400">Envoyer de nouveaux messages</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">✗</span>
                  <span className="text-gray-400">Accepter des missions</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
