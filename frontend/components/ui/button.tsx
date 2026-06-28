import * as React from 'react';
import { cn } from '@/lib/utils';

// Loading spinner component
const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin h-4 w-4', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // Generate aria-label if not provided and children is a string
    const computedAriaLabel =
      ariaLabel || (typeof children === 'string' ? children : undefined);

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.98] transition-transform duration-100',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-glow font-semibold': variant === 'default',
            'border border-border bg-card hover:bg-accent text-foreground':
              variant === 'outline',
            'hover:bg-accent text-foreground': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 shadow-sm': variant === 'destructive',
            'text-primary underline-offset-4 hover:underline': variant === 'link',
          },
          {
            // Updated sizes with 44px minimum for touch targets
            'h-11 min-h-[44px] px-4 py-2': size === 'default',
            'h-9 min-h-[36px] px-3 text-sm': size === 'sm',
            'h-12 min-h-[48px] px-8 text-lg': size === 'lg',
            'h-11 w-11 min-h-[44px] min-w-[44px] p-0': size === 'icon',
          },
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={computedAriaLabel}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, LoadingSpinner };
