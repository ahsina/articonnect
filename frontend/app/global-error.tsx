'use client';

import { useEffect } from 'react';

// global-error remplace le layout racine : il doit fournir <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0e1014',
          color: '#f5f6f7',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          padding: '0 1.5rem',
        }}
      >
        <p style={{ fontSize: '3.5rem', fontWeight: 700, color: '#FFD500', margin: 0 }}>Oups</p>
        <h1 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Une erreur critique est survenue</h1>
        <p style={{ marginTop: '0.5rem', maxWidth: '28rem', color: '#9aa0a6' }}>
          L&apos;application a rencontré un problème. Veuillez réessayer.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '2rem',
            borderRadius: '1rem',
            background: '#FFD500',
            color: '#16181d',
            border: 'none',
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
