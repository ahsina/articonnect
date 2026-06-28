import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

const ChevronIcon = () => (
  <svg
    className="h-4 w-4 text-muted-foreground flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const HomeIcon = () => (
  <svg
    className="h-4 w-4 flex-shrink-0"
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const Breadcrumb = ({
  items,
  separator = <ChevronIcon />,
  className,
}: BreadcrumbProps) => {
  if (!items.length) return null;

  return (
    <nav className={cn('flex', className)} aria-label="Fil d'Ariane">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {!isFirst && (
                <span className="mx-2" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'text-sm',
                    isLast
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {isFirst && item.label === 'Accueil' ? (
                    <span className="flex items-center gap-1">
                      <HomeIcon />
                      <span className="sr-only">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'text-sm text-muted-foreground hover:text-foreground',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded'
                  )}
                >
                  {isFirst && item.label === 'Accueil' ? (
                    <span className="flex items-center gap-1">
                      <HomeIcon />
                      <span className="sr-only">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumb };
