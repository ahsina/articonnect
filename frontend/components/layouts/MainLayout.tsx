'use client';

import { ReactNode } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  user?: {
    id: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
  className?: string;
  showNavbar?: boolean;
  fullWidth?: boolean;
}

export function MainLayout({
  children,
  user,
  className,
  showNavbar = true,
  fullWidth = false,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showNavbar && <Navbar user={user} />}

      <main
        id="main-content"
        className={cn(
          'flex-1',
          showNavbar && 'pt-16', // Account for fixed navbar
          !fullWidth && 'max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8',
          className
        )}
      >
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Krafolt. Tous droits réservés.
            </p>
            <nav className="flex gap-6" aria-label="Navigation du pied de page">
              <a
                href="/legal/privacy"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Politique de confidentialité
              </a>
              <a
                href="/legal/terms"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Conditions d&apos;utilisation
              </a>
              <a
                href="/contact"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Contact
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
