'use client';

import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Wrench, Zap, Paintbrush, Hammer, Blocks, Snowflake, Sprout, KeyRound,
  Star, Check, Menu, X, ShieldCheck, BadgeCheck, MessageSquare, Scale,
  CreditCard, Lock, CheckCircle2, Plus, Minus, Euro,
} from 'lucide-react';

export default function HomePage() {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const VALUE_PROPS = [
    { Icon: ShieldCheck, title: t('landing', 'feature1Title'), desc: t('landing', 'feature1Desc') },
    { Icon: BadgeCheck, title: t('landing', 'feature2Title'), desc: t('landing', 'feature2Desc') },
    { Icon: MessageSquare, title: t('landing', 'feature3Title'), desc: t('landing', 'feature3Desc') },
    { Icon: Scale, title: t('landing', 'feature4Title'), desc: t('landing', 'feature4Desc') },
  ];

  const PERKS = [
    [t('landing', 'proFeature1Title'), t('landing', 'proFeature1Desc')],
    [t('landing', 'proFeature2Title'), t('landing', 'proFeature2Desc')],
    [t('landing', 'proFeature3Title'), t('landing', 'proFeature3Desc')],
    [t('landing', 'proFeature4Title'), t('landing', 'proFeature4Desc')],
  ];

  const TESTIMONIALS = [
    { s: 'SL', name: 'Sophie L.', role: t('landing', 'testimonial1Role'), text: t('landing', 'testimonial1Text'), bg: 'bg-primary text-primary-foreground' },
    { s: 'PL', name: 'Pierre L.', role: t('landing', 'testimonial2Role'), text: t('landing', 'testimonial2Text'), bg: 'bg-success text-white' },
    { s: 'MK', name: 'Marc K.', role: t('landing', 'testimonial3Role'), text: t('landing', 'testimonial3Text'), bg: 'bg-warning text-black' },
  ];

  const HERO_CARDS = [
    { av: 'P', name: 'Pierre Plomberie', trade: 'Plombier · Luxembourg', rating: '4,9', reviews: '128', avatar: 'bg-primary text-primary-foreground', pos: 'left-0 top-0 z-30' },
    { av: 'É', name: 'Élec Express', trade: 'Électricien · Esch', rating: '5,0', reviews: '42', avatar: 'bg-success text-white', pos: 'right-0 top-36 z-20' },
    { av: 'M', name: 'Menuiserie Carpentier', trade: 'Menuisier · Metz', rating: '4,8', reviews: '76', avatar: 'bg-warning text-black', pos: 'left-10 top-[19rem] z-10 opacity-95' },
  ];

  const splitTags = (key: string) => (t('landing', key) || '').split('|').map((x) => x.trim()).filter(Boolean);
  const FEATURED = [
    { av: 'P', name: 'Pierre Plomberie', role: t('landing', 'fa1Role'), tags: splitTags('fa1Tags'), rating: '4,9', reviews: '128', cover: 'from-black to-neutral-700', avatar: 'bg-primary text-primary-foreground' },
    { av: 'É', name: 'Élec Express', role: t('landing', 'fa2Role'), tags: splitTags('fa2Tags'), rating: '5,0', reviews: '42', cover: 'from-emerald-700 to-emerald-900', avatar: 'bg-success text-white' },
    { av: 'M', name: 'Menuiserie Carpentier', role: t('landing', 'fa3Role'), tags: splitTags('fa3Tags'), rating: '4,8', reviews: '76', cover: 'from-amber-500 to-amber-700', avatar: 'bg-warning text-black' },
  ];

  const ESCROW = [
    { Icon: CreditCard, title: t('landing', 'escrow1Title'), desc: t('landing', 'escrow1Desc'), hl: false },
    { Icon: Lock, title: t('landing', 'escrow2Title'), desc: t('landing', 'escrow2Desc'), hl: true },
    { Icon: CheckCircle2, title: t('landing', 'escrow3Title'), desc: t('landing', 'escrow3Desc'), hl: false },
  ];

  const FAQ = [
    { q: t('landing', 'faq1Q'), a: t('landing', 'faq1A') },
    { q: t('landing', 'faq2Q'), a: t('landing', 'faq2A') },
    { q: t('landing', 'faq3Q'), a: t('landing', 'faq3A') },
    { q: t('landing', 'faq4Q'), a: t('landing', 'faq4A') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav className="container mx-auto flex h-[70px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">K</span>
            <span className="font-display text-xl font-extrabold tracking-tight">Krafolt</span>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            <a href="#how" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('landing', 'howItWorksTitle')}</a>
            <a href="#categories" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('landing', 'categoriesEyebrow')}</a>
            <a href="#featured" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('landing', 'featuredEyebrow')}</a>
            <Link href="/auth/register?role=artisan" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t('landing', 'ctaIamArtisan')}</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:block"><LanguageSwitcher /></span>
            <Link href="/auth/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:block">{t('landing', 'login')}</Link>
            <Link href="/auth/register" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">{t('landing', 'register')}</Link>
            <button type="button" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)} className="inline-flex items-center rounded-lg p-2 text-foreground hover:bg-muted lg:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {menuOpen && (
          <>
            <div className="fixed inset-0 top-[70px] z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />
            <div className="absolute inset-x-0 top-[70px] z-50 border-t border-border bg-background shadow-lg lg:hidden">
              <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
                <a href="#how" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">{t('landing', 'howItWorksTitle')}</a>
                <a href="#categories" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">{t('landing', 'categoriesEyebrow')}</a>
                <a href="#featured" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">{t('landing', 'featuredEyebrow')}</a>
                <Link href="/auth/register?role=artisan" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">{t('landing', 'ctaIamArtisan')}</Link>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">{t('landing', 'login')}</Link>
                <div className="mt-1 border-t border-border px-3 pt-3"><LanguageSwitcher /></div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(680px 340px at 78% 8%, hsl(var(--foreground)/0.05), transparent 70%)' }} />
        <div className="container relative mx-auto grid items-center gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-bold shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              {t('landing', 'liveActivity')}
            </span>
            <h1 className="font-display mt-5 text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl">
              {t('landing', 'heroTitle')}{' '}
              <span className="bg-gradient-to-b from-transparent from-[68%] to-warning/40 to-[68%] px-0.5">{t('landing', 'heroTitleHighlight')}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">{t('landing', 'heroSubtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth/register?role=client" className="rounded-xl bg-primary px-6 py-3.5 font-display font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">{t('landing', 'ctaFindArtisan')} →</Link>
              <Link href="/auth/register?role=artisan" className="rounded-xl bg-card px-6 py-3.5 font-display font-bold text-foreground shadow-[inset_0_0_0_1.5px_hsl(var(--foreground))] transition-colors hover:bg-accent">{t('landing', 'ctaIamArtisan')}</Link>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex">
                {['bg-primary text-primary-foreground', 'bg-success text-white', 'bg-warning text-black', 'bg-muted-foreground text-white'].map((c, i) => (
                  <span key={i} className={`-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-background font-display text-[13px] font-extrabold first:ml-0 ${c}`}>{['SL', 'PL', 'MK', '+'][i]}</span>
                ))}
              </div>
              <div className="text-sm font-semibold text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('landing', 'ratedText') }} />
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-muted-foreground">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {t('landing', 'heroTrust1')}</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {t('landing', 'heroTrust2')}</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> LU · FR · BE</span>
            </div>
          </div>

          {/* Pile de cartes artisan */}
          <div className="relative hidden h-[440px] lg:block">
            <div className="absolute right-[-6px] top-24 z-40 flex items-center gap-2.5 rounded-2xl bg-foreground px-3.5 py-3 text-background shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/10 text-success"><Euro className="h-4 w-4" /></span>
              <div className="font-display text-[13px] font-bold leading-tight">
                {t('landing', 'heroPillTitle')}
                <span className="block text-[11px] font-semibold text-background/60">{t('landing', 'heroPillSub')}</span>
              </div>
            </div>
            {HERO_CARDS.map((c) => (
              <div key={c.name} className={`absolute w-[308px] rounded-2xl border border-border bg-card p-[18px] shadow-[0_14px_50px_rgba(0,0,0,0.12)] ${c.pos}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-[13px] font-display font-extrabold ${c.avatar}`}>{c.av}</span>
                  <div>
                    <div className="font-display font-extrabold">{c.name}</div>
                    <div className="text-[13px] font-semibold text-muted-foreground">{c.trade}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 font-display text-[13px] font-bold">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{c.rating}</span>
                  <span className="text-muted-foreground">{c.reviews} {t('landing', 'reviewsLabel')}</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-extrabold text-success"><Check className="h-3 w-3" />{t('landing', 'verified')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-border bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-6">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'trustLabel')}</span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {['stripe', 'SIRET · KYC', 'eIDAS', 'RGPD', 'SSL / 3-D Secure'].map((l) => (
              <span key={l} className="font-display text-[17px] font-extrabold tracking-tight text-muted-foreground/50">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-foreground text-background">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {[
            ['2 400+', t('landing', 'statArtisans')],
            ['18 000+', t('landing', 'statMissions')],
            ['★ 4,9', t('landing', 'statRating')],
            ['< 15 min', t('landing', 'statCountries')],
          ].map(([n, l], i) => (
            <div key={l} className={`text-center md:border-background/10 ${i > 0 ? 'md:border-l' : ''}`}>
              <div className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{n}</div>
              <div className="mt-1 text-sm font-semibold text-background/60">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* POURQUOI KRAFOLT */}
      <section className="container mx-auto px-4 py-20">
        <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'whyTitle')}</div>
        <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'whySubtitle')}</h2>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border p-6 transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-[0_10px_34px_rgba(0,0,0,0.06)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[13px] bg-muted"><v.Icon className="h-6 w-6 text-foreground" strokeWidth={1.75} /></span>
              <h3 className="font-display mt-4 text-lg font-extrabold">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="container mx-auto px-4 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'categoriesEyebrow')}</div>
            <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'categoriesTitle')}</h2>
          </div>
          <Link href="/auth/register?role=client" className="rounded-lg border border-border px-4 py-2.5 font-display text-sm font-bold transition-colors hover:border-foreground">{t('landing', 'categoriesViewAll')} →</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link href="/auth/register?role=client" key={c.label} className="group rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:border-foreground">
              <c.Icon className="h-6 w-6 text-foreground" strokeWidth={1.75} />
              <div className="font-display mt-3 font-extrabold">{c.label}</div>
              <div className="text-[13px] font-semibold text-muted-foreground">{c.count} {t('landing', 'artisansLabel')}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="how" className="container mx-auto px-4">
        <div className="rounded-[28px] bg-muted px-8 py-14 sm:px-12">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'howItWorksSubtitle')}</div>
          <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'howItWorksTitle')}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-card p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">{s.n}</div>
                <h3 className="font-display mt-4 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARTISANS À LA UNE */}
      <section id="featured" className="container mx-auto px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'featuredEyebrow')}</div>
            <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'featuredTitle')}</h2>
          </div>
          <Link href="/auth/register?role=client" className="rounded-lg border border-border px-4 py-2.5 font-display text-sm font-bold transition-colors hover:border-foreground">{t('landing', 'featuredCta')} →</Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURED.map((f) => (
            <div key={f.name} className="overflow-hidden rounded-2xl border border-border transition-all hover:border-foreground hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]">
              <div className={`h-24 bg-gradient-to-br ${f.cover}`} />
              <div className="px-5 pb-5">
                <span className={`-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-card font-display text-2xl font-extrabold ${f.avatar}`}>{f.av}</span>
                <div className="font-display mt-3 text-lg font-extrabold">{f.name}</div>
                <div className="text-sm font-semibold text-muted-foreground">{f.role}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2.5 py-1 font-display text-[11.5px] font-bold text-foreground/80">{tag}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2.5 font-display text-[13px] font-bold">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{f.rating}</span>
                  <span className="text-muted-foreground">{f.reviews} {t('landing', 'reviewsLabel')}</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-extrabold text-success"><Check className="h-3 w-3" />{t('landing', 'verified')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SÉQUESTRE */}
      <section className="container mx-auto px-4 pb-4">
        <div className="rounded-[28px] bg-foreground p-8 text-background sm:p-14">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-background/50">{t('landing', 'escrowEyebrow')}</div>
          <h2 className="font-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('landing', 'escrowTitle')}</h2>
          <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {ESCROW.map((e, i) => (
              <div key={e.title} className="contents">
                <div className={`rounded-2xl border p-6 text-center ${e.hl ? 'border-success/40 bg-success/10' : 'border-background/12 bg-white/[0.04]'}`}>
                  <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] ${e.hl ? 'bg-success/20 text-success' : 'bg-white/8 text-background/80'}`}><e.Icon className="h-6 w-6" strokeWidth={1.75} /></span>
                  <h4 className="font-display mt-3.5 text-base font-extrabold">{e.title}</h4>
                  <p className="mt-1.5 text-sm text-background/60">{e.desc}</p>
                </div>
                {i < ESCROW.length - 1 && (
                  <div className="flex items-center justify-center text-2xl text-background/30">
                    <span className="hidden md:block">→</span>
                    <span className="block md:hidden">↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BANDEAU ARTISANS */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid items-center gap-10 rounded-[28px] bg-gradient-to-br from-neutral-900 to-black p-8 text-background sm:p-14 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="font-display text-sm font-bold uppercase tracking-wider text-background/50">{t('landing', 'ctaIamArtisan')}</div>
            <h2 className="font-display mt-2 text-4xl font-extrabold leading-tight tracking-tight">{t('landing', 'proTitleLine1')}<br />{t('landing', 'proTitleLine2')}</h2>
            <p className="mt-3.5 max-w-md text-background/70">{t('landing', 'proSubtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth/register?role=artisan" className="rounded-xl bg-background px-6 py-3.5 font-display font-bold text-foreground transition-opacity hover:opacity-90">{t('landing', 'becomeArtisan')} →</Link>
              <a href="#how" className="rounded-xl border border-background/25 px-6 py-3.5 font-display font-bold text-background transition-colors hover:bg-background/10">{t('landing', 'howItWorksTitle')}</a>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {PERKS.map(([b, s]) => (
              <div key={b} className="flex items-start gap-3 rounded-2xl border border-background/8 bg-white/[0.04] p-4">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-success/20 text-success"><Check className="h-4 w-4" strokeWidth={3} /></span>
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
      <section className="container mx-auto px-4 pb-16">
        <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'testimonialsEyebrow')}</div>
        <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'testimonialsTitle')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <div key={tm.name} className="rounded-2xl border border-border p-6">
              <div className="font-display text-[15px] font-extrabold tracking-[2px] text-warning">★★★★★</div>
              <p className="mt-3.5 text-[15px]">« {tm.text} »</p>
              <div className="mt-4 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-display font-extrabold ${tm.bg}`}>{tm.s}</span>
                <div>
                  <div className="font-display text-sm font-bold">{tm.name}</div>
                  <div className="text-xs font-semibold text-muted-foreground">{tm.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-20">
        <div className="text-center">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('landing', 'faqEyebrow')}</div>
          <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{t('landing', 'faqTitle')}</h2>
        </div>
        <div className="mx-auto mt-8 max-w-3xl">
          {FAQ.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="mb-3 block w-full rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:border-foreground/40"
            >
              <div className="flex items-center justify-between gap-4 font-display text-[16.5px] font-extrabold">
                {f.q}
                {openFaq === i ? <Minus className="h-5 w-5 flex-shrink-0 text-muted-foreground" /> : <Plus className="h-5 w-5 flex-shrink-0 text-muted-foreground" />}
              </div>
              {openFaq === i && <p className="mt-3 text-[14.5px] text-muted-foreground">{f.a}</p>}
            </button>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-neutral-900 to-black p-10 text-center text-background sm:p-16">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(500px 220px at 50% -10%, rgba(245,166,35,0.18), transparent 70%)' }} />
          <h2 className="font-display relative mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">{t('landing', 'ctaFinalTitle')}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-background/70">{t('landing', 'ctaFinalSubtitle')}</p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/register?role=client" className="w-full rounded-xl bg-background px-8 py-4 font-display font-bold text-foreground transition-opacity hover:opacity-90 sm:w-auto">{t('landing', 'ctaStartNow')}</Link>
            <Link href="/auth/register?role=artisan" className="w-full rounded-xl border border-background/25 px-8 py-4 font-display font-bold text-background transition-colors hover:bg-background/10 sm:w-auto">{t('landing', 'ctaIamArtisan')}</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="container mx-auto grid gap-8 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:pr-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground">K</span>
              <span className="font-display text-xl font-extrabold">Krafolt</span>
            </div>
            <p className="mt-3 max-w-[260px] text-sm text-muted-foreground">{t('landing', 'footerTagline')} {t('landing', 'footerDesc')}</p>
            <div className="mt-4 flex gap-2">
              {['in', 'X', 'f', 'ig'].map((s) => (
                <span key={s} className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted font-display text-[13px] font-extrabold text-muted-foreground">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">{t('landing', 'footerClients')}</h4>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/auth/register?role=client" className="transition-colors hover:text-foreground">{t('landing', 'footerPostProject')}</Link>
              <a href="#categories" className="transition-colors hover:text-foreground">{t('landing', 'ctaFindArtisan')}</a>
              <a href="#how" className="transition-colors hover:text-foreground">{t('landing', 'howItWorksTitle')}</a>
            </div>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">{t('landing', 'footerArtisans')}</h4>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/auth/register?role=artisan" className="transition-colors hover:text-foreground">{t('landing', 'ctaIamArtisan')}</Link>
              <Link href="/auth/login" className="transition-colors hover:text-foreground">{t('landing', 'footerLogin')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">Krafolt</h4>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link href="/legal/mentions" className="transition-colors hover:text-foreground">{t('landing', 'footerLegal')}</Link>
              <Link href="/legal/terms" className="transition-colors hover:text-foreground">{t('landing', 'footerTerms')}</Link>
              <Link href="/legal/privacy" className="transition-colors hover:text-foreground">{t('landing', 'footerPrivacy')}</Link>
              <Link href="/legal/cookies" className="transition-colors hover:text-foreground">{t('landing', 'footerCookies')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-[13px] font-extrabold">{t('landing', 'newsletterTitle')}</h4>
            <p className="mt-3 text-sm text-muted-foreground">{t('landing', 'newsletterDesc')}</p>
            <div className="mt-3 flex gap-2">
              <input type="email" placeholder={t('landing', 'newsletterPlaceholder')} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground" />
              <button type="button" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">OK</button>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] font-semibold text-muted-foreground">
            <span>© 2026 Krafolt · LU · FR · BE</span>
            <span>{t('landing', 'footerStripe')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
