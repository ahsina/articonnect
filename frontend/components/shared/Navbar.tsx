'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useState, useEffect } from 'react';

interface NavbarProps {
  user?: {
    id: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'ARTISAN') return '/artisan/dashboard';
    return '/client/dashboard';
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all ${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={getDashboardLink()} className="text-2xl font-bold text-blue-600">
              ArtiConnect
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'CLIENT' && (
                  <>
                    <Link href="/client/missions">
                      <Button variant="ghost">Mes Missions</Button>
                    </Link>
                    <Link href="/client/artisans">
                      <Button variant="ghost">Artisans</Button>
                    </Link>
                    <Link href="/client/marketplace">
                      <Button variant="ghost">Marketplace</Button>
                    </Link>
                  </>
                )}

                {user.role === 'ARTISAN' && (
                  <>
                    <Link href="/artisan/missions">
                      <Button variant="ghost">Missions</Button>
                    </Link>
                    <Link href="/artisan/shop">
                      <Button variant="ghost">Ma Boutique</Button>
                    </Link>
                    <Link href="/artisan/profile">
                      <Button variant="ghost">Profil</Button>
                    </Link>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <Link href="/admin/users">
                      <Button variant="ghost">Utilisateurs</Button>
                    </Link>
                    <Link href="/admin/missions">
                      <Button variant="ghost">Missions</Button>
                    </Link>
                  </>
                )}

                <NotificationBell />

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {user.firstName} {user.lastName}
                  </span>
                  <Button variant="ghost" onClick={handleLogout}>
                    Déconnexion
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Connexion</Button>
                </Link>
                <Link href="/register">
                  <Button>S&apos;inscrire</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
