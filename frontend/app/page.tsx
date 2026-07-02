'use client';

import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wrench, Zap, Paintbrush, Hammer, Blocks, Snowflake, Sprout, KeyRound, Star, Check } from 'lucide-react';

export default function HomePage() {
  const { t } = useLanguage();

  const CATEGORIES = [
    { Icon: Wrench, label: t('landing', 'categoryPlumbing'), count: '320' },
    { Icon: Zap, label: t('landing', 'categoryElectricity'), count: '210' },
    { Icon: Paintbrush, label: t('landing', 'categoryPainting'), count: '175' },
    { Icon: Hammer, label: t('landing', 'categoryCarpentry'), count: '140' },
    { Icon: Blocks, label: t('landing', 'categoryMasonry'), count: '98' },
    { Icon: Snowflake, label: t('landing', 'categoryHeating'), count: '64' },
    { Icon: Sprout, label: t('landing', 'categoryGardening'), count: '112' },
    { Icon: KeyRound, label: t('landing', 'categoryLocksmith'), count: '57' },
  ];

  const STEPS = [
    { n: '1', title: t('landing', 'step1Title'), desc: t('landing', 'step1Desc') },
    { n: '2', title: t('landing', 'step2Title'), desc: t('landing', 'step2Desc') },
    { n: '3', title: t('landing', 'step3Title'), desc: t('landing', 'step3Desc') },
  ];

  // Copy marketing spécifique landing (FR — à internationaliser ultérieurement)
  const PERKS = [
    ['Des clients près de chez vous', 'Missions géolocalisées, filtrées par métier.'],
    ['Zéro impayé', 'Paiement sous séquestre, versé à la validation.'],
    ['Devis & factures intégrés', 'Créez, envoyez, signez — tout est automatisé.'],
    ['Gérez votre équipe', 'Salariés, pointeuse, répartition des missions.'],
  ];
  const TESTIMONIALS = [
    { s: 'SL', name: 'Sophie L.', role: 'Cliente · Luxembourg', text: 'Fuite réglée le jour même. L’artisan était vérifié, le prix affiché à l’avance, zéro mauvaise surprise.' },
    { s: 'PL', name: 'Pierre L.', role: 'Plombier · Esch', text: 'Depuis Krafolt je remplis mon agenda sans démarcher. Et surtout : je suis payé à tous les coups.' },
    { s: 'MK', name: 'Marc K.', role: 'Client · Metz', text: 'Devis clairs, paiement sécurisé, suivi de la mission en temps réel. Exactement ce qu’il me fallait.' },
  ];
  const HERO_CARDS = [
    { av: 'P', name: 'Pierre Plomberie', trade: 'Plombier · Luxembourg', rating: '4,9', reviews: '128', pos: 'left-0 top-2 z-30' },
    { av: 'É', name: 'Élec Express', trade: 'Électricien · Esch', rating: '5,0', reviews: '42', pos: 'right-0 top-32 z-20' },
    { av: 'M', name: 'Menuiserie Carpentier', trade: 'Menuisier · Metz', rating: '4,8', reviews: '76', pos: 'left-10 top-64 z-10 opacity-95' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav className="container mx-auto flex h-[68px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">K</span>
            <span className="font-display text-xl font-extrabold tracking-tight">Krafolt</span>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            <a href="#how" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('landing', 'howItWorksTitle')}</a>
            <a href="#categories" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('nav', 'artisans') || 'Catégories'}</a>
            <Link href="/auth/register?role=artisan" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('landing', 'ctaIamArtisan')}</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:block">
              <LanguageSwitcher />
            </span>
            <Link href="/auth/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:block">
              {t('landing', 'login')}
            </Link>
            <Link href="/auth/register" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
              {t('landing', 'register')}
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="container mx-auto grid items-center gap-12 px-4 pb-16 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm font-bold">
            <span className="h-2 w-2 rounded-full bg-success" />
            {t('landing', 'heroBadge')}
          </span>
          <h1 className="font-display mt-5 text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl">
            {t('landing', 'heroTitle')} {t('landing', 'heroTitleHighlight')}
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            {t('landing', 'heroSubtitle')}
          </p>
          {/* Barre de recherche */}
          <div className="mt-6 flex max-w-lg gap-2 rounded-2xl bg-muted p-2">
            <input
              className="w-full rounded-xl bg-card px-4 py-3.5 text-sm font-semibold outline-none placeholder:text-muted-foreground"
              placeholder="Ex. : réparer une fuite, refaire l'électricité…"
            />
            <Link href="/auth/register?role=client" className="flex items-center rounded-xl bg-primary px-5 font-display font-bold text-primary-foreground transition-colors hover:bg-primary/90">
              {t('common', 'search') || 'Rechercher'}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/auth/register?role=client" className="rounded-xl bg-primary px-6 py-3.5 font-display font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
              {t('landing', 'ctaFindArtisan')} 
            </Link>
            <Link href="/auth/register?role=artisan" className="rounded-xl bg-card px-6 py-3.5 font-display font-bold text-foreground shadow-[inset_0_0_0_1.5px_hsl(var(--foreground))] transition-colors hover:bg-accent">
              {t('landing', 'ctaIamArtisan')}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-muted-foreground">
            <span className="flex items-center gap-2"><span className="text-success">●</span> {t('landing', 'feature4Title')}</span>
            <span className="flex items-center gap-2"><span className="text-success">●</span> {t('landing', 'statArtisans')}</span>
            <span className="flex items-center gap-2"><span className="text-success">●</span> LU · FR · BE</span>
          </div>
        </div>

        {/* Pile de cartes artisan */}
        <div className="relative hidden h-[420px] lg:block">
          {HERO_CARDS.map((c) => (
            <div key={c.name} className={`absolute w-[300px] rounded-2xl border border-border bg-card p-[18px] shadow-[0_10px_40px_rgba(0,0,0,0.10)] ${c.pos}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[13px] bg-primary font-display font-extrabold text-primary-foreground">{c.av}</span>
                <div>
                  <div className="font-display font-extrabold">{c.name}</div>
                  <div className="text-[13px] font-semibold text-muted-foreground">{c.trade}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 font-display text-[13px] font-bold">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-foreground text-foreground" />{c.rating}</span>
                <span className="text-muted-foreground">{c.reviews} avis</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground"><Check className="h-3 w-3" />Vérifié</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {[
            ['2 400+', t('landing', 'statArtisans')],
            ['18 000+', t('landing', 'statMissions')],
            ['4,9', t('landing', 'statRating')],
            ['< 15 min', t('landing', 'statCountries')],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{n}</div>
              <div className="mt-1 text-sm font-semibold text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="container mx-auto px-4 py-20">
        <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Catégories</div>
        <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">Tous les métiers, un seul endroit.</h2>
        <p className="mt-2 text-lg text-muted-foreground">Du dépannage urgent à la rénovation complète.</p>
        <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link href="/auth/register?role=client" key={c.label} className="group rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:border-foreground">
              <c.Icon className="h-6 w-6 text-foreground" strokeWidth={1.75} />
              <div className="font-display mt-3 font-extrabold">{c.label}</div>
              <div className="text-[13px] font-semibold text-muted-foreground">{c.count} artisans</div>
            </Link>
          ))}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="how" className="container mx-auto px-4 py-6">
        <div className="rounded-[28px] bg-muted px-8 py-14 sm:px-12">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'howItWorksSubtitle')}</div>
          <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'howItWorksTitle')}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">{s.n}</div>
                <h3 className="font-display mt-4 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BANDEAU ARTISANS */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid items-center gap-10 rounded-[28px] bg-foreground p-8 text-background sm:p-14 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-wider text-background/50">{t('landing', 'ctaIamArtisan')}</div>
            <h2 className="font-display mt-2 text-4xl font-extrabold leading-tight tracking-tight">Développez votre activité.<br />Soyez payé, à coup sûr.</h2>
            <p className="mt-3.5 max-w-md text-background/70">Recevez des demandes qualifiées près de chez vous, envoyez vos devis en un clic, et encaissez sans impayés grâce au paiement sécurisé.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth/register?role=artisan" className="rounded-xl bg-background px-6 py-3.5 font-display font-bold text-foreground transition-opacity hover:opacity-90">Devenir artisan </Link>
              <a href="#how" className="rounded-xl border border-background/25 px-6 py-3.5 font-display font-bold text-background transition-colors hover:bg-background/10">Comment ça marche</a>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {PERKS.map(([b, s]) => (
              <div key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm text-green-700"></span>
                <div>
                  <div className="font-display font-bold">{b}</div>
                  <div className="text-sm text-background/60">{s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="container mx-auto px-4 py-10">
        <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Ils nous font confiance</div>
        <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">Des projets réussis, des deux côtés.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <div key={tm.name} className="rounded-2xl border border-border p-6">
              <div className="font-display font-extrabold text-warning"></div>
              <p className="mt-3 text-[15px]">« {tm.text} »</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted font-display font-extrabold">{tm.s}</span>
                <div>
                  <div className="font-display text-sm font-bold">{tm.name}</div>
                  <div className="text-xs font-semibold text-muted-foreground">{tm.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-[28px] bg-foreground p-10 text-center text-background sm:p-16">
          <h2 className="font-display mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t('landing', 'ctaFinalTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-background/70">
            {t('landing', 'ctaFinalSubtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/register?role=client" className="w-full rounded-xl bg-background px-8 py-4 font-display font-bold text-foreground transition-opacity hover:opacity-90 sm:w-auto">
              {t('landing', 'ctaStartNow')}
            </Link>
            <Link href="/auth/register?role=artisan" className="w-full rounded-xl border border-background/25 px-8 py-4 font-display font-bold text-background transition-colors hover:bg-background/10 sm:w-auto">
              {t('landing', 'ctaIamArtisan')}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="container mx-auto grid gap-8 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">K</span>
              <span className="font-display text-xl font-extrabold">Krafolt</span>
            </div>
            <p className="mt-3 max-w-[260px] text-sm text-muted-foreground">{t('landing', 'footerTagline')} La marketplace des artisans de confiance — LU · FR · BE.</p>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">Clients</h4>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/auth/register?role=client" className="transition-colors hover:text-foreground">Publier un projet</Link>
              <a href="#categories" className="transition-colors hover:text-foreground">Trouver un artisan</a>
              <a href="#how" className="transition-colors hover:text-foreground">{t('landing', 'howItWorksTitle')}</a>
            </div>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">Artisans</h4>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/auth/register?role=artisan" className="transition-colors hover:text-foreground">{t('landing', 'ctaIamArtisan')}</Link>
              <Link href="/auth/login" className="transition-colors hover:text-foreground">{t('landing', 'footerLogin')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">Krafolt</h4>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/legal/mentions" className="transition-colors hover:text-foreground">Mentions légales</Link>
              <Link href="/legal/terms" className="transition-colors hover:text-foreground">CGU/CGV</Link>
              <Link href="/legal/privacy" className="transition-colors hover:text-foreground">Confidentialité</Link>
              <Link href="/legal/cookies" className="transition-colors hover:text-foreground">Cookies</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] font-semibold text-muted-foreground">
            <span>© 2026 Krafolt · LU · FR · BE</span>
            <span>Paiements sécurisés par Stripe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
