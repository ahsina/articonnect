'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { cn } from '@/lib/utils';

interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string | number;
}

interface SidebarLayoutProps {
  children: ReactNode;
  user: {
    id: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
  sidebarItems: SidebarItem[];
  sidebarTitle?: string;
  className?: string;
}

export function SidebarLayout({
  children,
  user,
  sidebarItems,
  sidebarTitle = 'Menu',
  className,
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="flex pt-16">
        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="navigation"
          aria-label="Navigation secondaire"
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{sidebarTitle}</h2>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-accent'
                        )}
                        onClick={() => setIsSidebarOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed bottom-4 left-4 z-40 lg:hidden flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isSidebarOpen}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {isSidebarOpen ? (
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
        </button>

        {/* Main content */}
        <main
          id="main-content"
          className={cn(
            'flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
