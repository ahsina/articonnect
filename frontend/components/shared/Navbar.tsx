'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavbarProps {
  user?: {
    id: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

// Hamburger icon component
const HamburgerIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    {isOpen ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    )}
  </svg>
);

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router]);

  const handleLogout = () => {
    // Clear only auth-related localStorage items, preserve user preferences
    const authKeys = ['token', 'refreshToken', 'user', 'authState', 'sessionId'];
    authKeys.forEach(key => localStorage.removeItem(key));
    router.push('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'ARTISAN') return '/artisan/dashboard';
    return '/client/dashboard';
  };

  const navLinks = {
    CLIENT: [
      { href: '/client/missions', label: t('nav', 'myMissions') || 'Mes Missions' },
      { href: '/client/artisans', label: t('nav', 'artisans') || 'Artisans' },
      { href: '/client/marketplace', label: t('nav', 'marketplace') || 'Marketplace' },
    ],
    ARTISAN: [
      { href: '/artisan/missions', label: t('nav', 'missions') || 'Missions' },
      { href: '/artisan/shop', label: t('nav', 'myShop') || 'Ma Boutique' },
      { href: '/artisan/profile', label: t('nav', 'profile') || 'Profil' },
    ],
    ADMIN: [
      { href: '/admin/users', label: t('nav', 'users') || 'Utilisateurs' },
      { href: '/admin/missions', label: t('nav', 'missions') || 'Missions' },
    ],
  };

  const currentLinks = user ? navLinks[user.role as keyof typeof navLinks] || [] : [];

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="skip-to-content"
      >
        {t('nav', 'skipToContent') || 'Aller au contenu principal'}
      </a>

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || isMobileMenuOpen ? 'bg-card shadow-md' : 'bg-background/80 backdrop-blur-xl'
        }`}
        role="navigation"
        aria-label={t('nav', 'mainNavigation') || 'Navigation principale'}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link
                href={getDashboardLink()}
                className="text-2xl font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                Krafolt
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  {currentLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button variant="ghost">{link.label}</Button>
                    </Link>
                  ))}

                  <NotificationBell />
                  <LanguageSwitcher />

                  <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-border">
                    <span className="text-sm text-muted-foreground">
                      {user.firstName} {user.lastName}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      aria-label={t('nav', 'logout') || 'Déconnexion'}
                    >
                      {t('nav', 'logout') || 'Déconnexion'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <LanguageSwitcher />
                  <Link href="/auth/login">
                    <Button variant="ghost">{t('nav', 'login') || 'Connexion'}</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button>{t('nav', 'register') || "S'inscrire"}</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              {user && <NotificationBell />}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] min-w-[44px]"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                <HamburgerIcon isOpen={isMobileMenuOpen} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? 'max-h-screen opacity-100'
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="px-4 pt-2 pb-4 space-y-1 bg-card border-t border-border">
            {user ? (
              <>
                {/* User info */}
                <div className="py-3 px-2 border-b border-border mb-2">
                  <p className="text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
                </div>

                {/* Navigation links */}
                {currentLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-3 px-2 text-base font-medium text-foreground hover:bg-accent rounded-md min-h-[44px] flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="pt-2 border-t border-border mt-2">
                  <div className="py-2 px-2">
                    <LanguageSwitcher />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left py-3 px-2 text-base font-medium text-red-600 hover:bg-red-500/10 rounded-md min-h-[44px] flex items-center"
                  >
                    {t('nav', 'logout') || 'Déconnexion'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="py-2 px-2">
                  <LanguageSwitcher />
                </div>
                <Link
                  href="/auth/login"
                  className="block py-3 px-2 text-base font-medium text-foreground hover:bg-accent rounded-md min-h-[44px] flex items-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('nav', 'login') || 'Connexion'}
                </Link>
                <Link
                  href="/auth/register"
                  className="block py-3 px-2 text-base font-medium text-primary hover:bg-primary/10 rounded-md min-h-[44px] flex items-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('nav', 'register') || "S'inscrire"}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
