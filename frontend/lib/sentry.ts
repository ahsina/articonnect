/**
 * Sentry configuration for Next.js frontend
 *
 * This module provides a graceful fallback when @sentry/nextjs is not installed.
 * All functions work as no-ops when Sentry is unavailable.
 *
 * To use Sentry, install the package:
 * npm install @sentry/nextjs
 *
 * Then set the following environment variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Your Sentry DSN
 * - NEXT_PUBLIC_SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - NEXT_PUBLIC_SENTRY_RELEASE: Optional release version
 */

interface SentryUser {
  id: string;
  email?: string;
  role?: string;
}

let initialized = false;

/**
 * Initialize Sentry SDK (stub - Sentry not installed)
 */
export async function initSentry(): Promise<void> {
  if (initialized) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (typeof window !== 'undefined') {
      console.info('[Sentry] DSN not configured - install @sentry/nextjs to enable error tracking');
    }
    return;
  }

  // Sentry package not installed - log warning
  console.warn(
    '[Sentry] Package @sentry/nextjs not installed. Install it to enable error tracking.',
  );
  initialized = true;
}

/**
 * Check if Sentry is initialized and available
 */
export function isSentryInitialized(): boolean {
  return false; // Always false when package not installed
}

/**
 * Set user context for all future events
 */
export function setUser(_user: SentryUser | null): void {
  // No-op when Sentry not installed
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(
  error: Error | unknown,
  _context?: {
    user?: SentryUser;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
): string | undefined {
  // Always log to console
  console.error('[Error]', error);
  return undefined;
}

/**
 * Capture a message and send to Sentry
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
): string | undefined {
  console.log(`[${level}]`, message);
  return undefined;
}

/**
 * Add breadcrumb for context
 */
export function addBreadcrumb(_breadcrumb: {
  category?: string;
  message?: string;
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  // No-op when Sentry not installed
}

/**
 * Set tags for all future events
 */
export function setTags(_tags: Record<string, string>): void {
  // No-op when Sentry not installed
}

/**
 * Set extra context for all future events
 */
export function setExtra(_key: string, _value: unknown): void {
  // No-op when Sentry not installed
}

export default {
  initSentry,
  isSentryInitialized,
  setUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  setTags,
  setExtra,
};
