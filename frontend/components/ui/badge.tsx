import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'outline'
    | 'secondary'
    | 'destructive';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          {
            'bg-primary text-primary-foreground': variant === 'default',
            'bg-green-500/15 text-green-400': variant === 'success',
            'bg-yellow-500/15 text-yellow-400': variant === 'warning',
            'bg-red-500/15 text-red-400': variant === 'error',
            'bg-primary/10 text-primary': variant === 'info',
            'border border-border bg-transparent text-foreground': variant === 'outline',
            'bg-muted text-foreground': variant === 'secondary',
            'bg-red-600 text-white': variant === 'destructive',
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';

export { Badge };
