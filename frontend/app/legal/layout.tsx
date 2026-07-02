import Link from 'next/link';
import type { ReactNode } from 'react';

const sections = [
  { href: '/legal/mentions', label: 'Mentions légales' },
  { href: '/legal/terms', label: 'CGU / CGV' },
  { href: '/legal/privacy', label: 'Confidentialité (RGPD)' },
  { href: '/legal/cookies', label: 'Cookies' },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-xl font-bold text-primary">
            Krafolt
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <nav className="mb-8 flex flex-wrap gap-2">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <article className="prose-legal space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary">
          {children}
        </article>

        <p className="mt-12 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          Ces documents constituent une base structurée et doivent être <strong>validés par un conseil
          juridique</strong> avant ouverture publique (LU/FR/BE). Dernière mise à jour : juin 2026.
        </p>
      </div>
    </div>
  );
}
