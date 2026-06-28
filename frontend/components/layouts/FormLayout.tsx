'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FormLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function FormLayout({
  children,
  title,
  subtitle,
  showLogo = true,
  maxWidth = 'md',
  className,
}: FormLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="skip-to-content"
      >
        Aller au contenu principal
      </a>

      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-12"
      >
        <div
          className={cn(
            'w-full bg-card rounded-2xl shadow-xl p-8 sm:p-10 fade-in',
            maxWidthClasses[maxWidth],
            className
          )}
        >
          {showLogo && (
            <div className="text-center mb-8">
              <Link
                href="/"
                className="inline-block text-3xl font-bold text-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                Krafolt
              </Link>
            </div>
          )}

          {(title || subtitle) && (
            <div className="text-center mb-8">
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Krafolt. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
