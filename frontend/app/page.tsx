'use client';

import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();

  const CATEGORIES = [
    { icon: '🔧', label: t('landing', 'categoryPlumbing') },
    { icon: '⚡', label: t('landing', 'categoryElectricity') },
    { icon: '🎨', label: t('landing', 'categoryPainting') },
    { icon: '🪵', label: t('landing', 'categoryCarpentry') },
    { icon: '🧱', label: t('landing', 'categoryMasonry') },
    { icon: '🌿', label: t('landing', 'categoryGardening') },
    { icon: '❄️', label: t('landing', 'categoryHeating') },
    { icon: '🔑', label: t('landing', 'categoryLocksmith') },
  ];

  const STEPS = [
    { n: '01', title: t('landing', 'step1Title'), desc: t('landing', 'step1Desc') },
    { n: '02', title: t('landing', 'step2Title'), desc: t('landing', 'step2Desc') },
    { n: '03', title: t('landing', 'step3Title'), desc: t('landing', 'step3Desc') },
  ];

  const FEATURES = [
    { icon: '📍', title: t('landing', 'feature1Title'), desc: t('landing', 'feature1Desc') },
    { icon: '💬', title: t('landing', 'feature2Title'), desc: t('landing', 'feature2Desc') },
    { icon: '⭐', title: t('landing', 'feature3Title'), desc: t('landing', 'feature3Desc') },
    { icon: '🛡️', title: t('landing', 'feature4Title'), desc: t('landing', 'feature4Desc') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-glow">K</span>
            <span className="font-display text-xl font-bold tracking-tight">Krafolt</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t('landing', 'login')}
            </Link>
            <Link href="/auth/register" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-glow active:scale-[0.98]">
              {t('landing', 'register')}
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="container relative mx-auto px-4 pb-20 pt-20 sm:pt-28 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            {t('landing', 'heroBadge')}
          </div>
          <h1 className="font-display mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            {t('landing', 'heroTitle')}{' '}
            <span className="text-primary">{t('landing', 'heroTitleHighlight')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {t('landing', 'heroSubtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/register?role=client" className="w-full rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-glow active:scale-[0.98] sm:w-auto">
              {t('landing', 'ctaFindArtisan')}
            </Link>
            <Link href="/auth/register?role=artisan" className="w-full rounded-2xl border border-border bg-card px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-accent sm:w-auto">
              {t('landing', 'ctaIamArtisan')}
            </Link>
          </div>

          {/* Catégories rapides */}
          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary">
                <span>{c.icon}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-card/40">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4">
          {[
            ['1 200+', t('landing', 'statArtisans')],
            ['15 000+', t('landing', 'statMissions')],
            ['4,8/5', t('landing', 'statRating')],
            [t('landing', 'statCountries'), 'LU · FR · BE'],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-3xl font-bold text-primary sm:text-4xl">{n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t('landing', 'howItWorksTitle')}</h2>
          <p className="mt-3 text-muted-foreground">{t('landing', 'howItWorksSubtitle')}</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/40">
              <div className="font-display text-5xl font-bold text-primary/30">{s.n}</div>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border bg-card/40">
        <div className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">{t('landing', 'whyTitle')}</h2>
            <p className="mt-3 text-muted-foreground">{t('landing', 'whySubtitle')}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">{f.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-10 text-center text-background sm:p-16">
          <h2 className="font-display relative text-3xl font-bold sm:text-5xl">
            {t('landing', 'ctaFinalTitle')}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-background/70">
            {t('landing', 'ctaFinalSubtitle')}
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/register?role=client" className="w-full rounded-2xl bg-background px-8 py-4 font-semibold text-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:w-auto">
              {t('landing', 'ctaStartNow')}
            </Link>
            <Link href="/auth/login" className="w-full rounded-2xl border border-background/25 bg-transparent px-8 py-4 font-semibold text-background transition-colors hover:bg-background/10 sm:w-auto">
              {t('landing', 'ctaHaveAccount')}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">K</span>
            <span className="font-display font-bold">Krafolt</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Krafolt — {t('landing', 'footerTagline')} · LU · FR · BE</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/auth/login" className="transition-colors hover:text-foreground">{t('landing', 'footerLogin')}</Link>
            <Link href="/auth/register" className="transition-colors hover:text-foreground">{t('landing', 'footerRegister')}</Link>
            <Link href="/legal/mentions" className="transition-colors hover:text-foreground">Mentions légales</Link>
            <Link href="/legal/terms" className="transition-colors hover:text-foreground">CGU/CGV</Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-foreground">Confidentialité</Link>
            <Link href="/legal/cookies" className="transition-colors hover:text-foreground">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
