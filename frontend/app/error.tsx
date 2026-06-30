'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visibilité erreur (remplacé par Sentry une fois configuré).
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <p className="font-display text-6xl font-bold text-primary">Oups</p>
      <h1 className="mt-4 text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Quelque chose s&apos;est mal passé de notre côté. Vous pouvez réessayer.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-2xl border border-border bg-card px-6 py-3 font-semibold transition hover:bg-accent"
        >
          Accueil
        </a>
      </div>
    </div>
  );
}
