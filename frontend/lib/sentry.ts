/**
 * Sentry configuration for Next.js frontend
 *
 * To use Sentry, install the package:
 * npm install @sentry/nextjs
 *
 * Then set the following environment variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Your Sentry DSN
 * - NEXT_PUBLIC_SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - NEXT_PUBLIC_SENTRY_RELEASE: Optional release version
 */

interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaySessionSampleRate: number;
  replayOnErrorSampleRate: number;
  debug: boolean;
}

interface SentryUser {
  id: string;
  email?: string;
  role?: string;
}

// Check if Sentry is available
let Sentry: any = null;
try {
  Sentry = require('@sentry/nextjs');
} catch {
  // Sentry not installed, will use stub functions
}

const config: SentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  replaySessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE || '0.1'),
  replayOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE || '1.0'),
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
};

let initialized = false;

/**
 * Initialize Sentry SDK
 */
export function initSentry(): void {
  if (initialized || !Sentry || !config.dsn) {
    if (!config.dsn) {
      console.warn('[Sentry] DSN not configured - error tracking disabled');
    }
    return;
  }

  if (typeof window === 'undefined') {
    // Server-side initialization
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      tracesSampleRate: config.tracesSampleRate,
      debug: config.debug,
    });
  } else {
    // Client-side initialization with replay
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      tracesSampleRate: config.tracesSampleRate,
      replaysSessionSampleRate: config.replaySessionSampleRate,
      replaysOnErrorSampleRate: config.replayOnErrorSampleRate,
      debug: config.debug,
      integrations: [
        Sentry.browserTracingIntegration?.() || null,
        Sentry.replayIntegration?.() || null,
      ].filter(Boolean),
      beforeSend(event: any) {
        // Filter out sensitive data
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });
  }

  initialized = true;
  console.log(`[Sentry] Initialized for environment: ${config.environment}`);
}

/**
 * Check if Sentry is initialized and available
 */
export function isSentryInitialized(): boolean {
  return initialized && !!Sentry;
}

/**
 * Set user context for all future events
 */
export function setUser(user: SentryUser | null): void {
  if (!Sentry || !initialized) return;
  Sentry.setUser(user);
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(
  error: Error | any,
  context?: {
    user?: SentryUser;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): string | undefined {
  if (!Sentry || !initialized) {
    console.error('[Sentry] Not initialized, error not reported:', error);
    return undefined;
  }

  return Sentry.withScope((scope: any) => {
    if (context?.user) {
      scope.setUser(context.user);
    }
    if (context?.tags) {
      scope.setTags(context.tags);
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    return Sentry.captureException(error);
  });
}

/**
 * Capture a message and send to Sentry
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'
): string | undefined {
  if (!Sentry || !initialized) {
    console.warn('[Sentry] Not initialized, message not reported:', message);
    return undefined;
  }
  return Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for context
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  data?: Record<string, any>;
}): void {
  if (!Sentry || !initialized) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set tags for all future events
 */
export function setTags(tags: Record<string, string>): void {
  if (!Sentry || !initialized) return;
  Sentry.setTags(tags);
}

/**
 * Set extra context for all future events
 */
export function setExtra(key: string, value: any): void {
  if (!Sentry || !initialized) return;
  Sentry.setExtra(key, value);
}

// Auto-initialize on import if DSN is configured
if (typeof window !== 'undefined' && config.dsn) {
  initSentry();
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
