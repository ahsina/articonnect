import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { SentryModuleOptions } from './sentry.module';

export interface SentryScope {
  setUser?: (user: { id: string; email?: string; role?: string }) => void;
  setTags?: (tags: Record<string, string>) => void;
  setExtras?: (extras: Record<string, any>) => void;
  setLevel?: (level: 'fatal' | 'error' | 'warning' | 'info' | 'debug') => void;
}

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

export interface Breadcrumb {
  category?: string;
  message?: string;
  level?: SeverityLevel;
  data?: Record<string, any>;
  timestamp?: number;
}

// Sentry SDK interface for type safety
interface SentrySDK {
  init: (options: any) => void;
  captureException: (exception: any) => string;
  captureMessage: (message: string, level: string) => string;
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  setUser: (user: any) => void;
  setTags: (tags: Record<string, string>) => void;
  withScope: (callback: (scope: any) => any) => any;
  flush: (timeout: number) => Promise<boolean>;
  startInactiveSpan?: (options: { name: string; op: string }) => any;
  httpIntegration?: () => any;
  expressIntegration?: () => any;
}

// Try to load Sentry dynamically
let Sentry: SentrySDK | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/node');
} catch {
  // Sentry not installed
}

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(
    @Inject('SENTRY_OPTIONS')
    private readonly options: SentryModuleOptions,
  ) {}

  onModuleInit() {
    this.initialize();
  }

  private initialize() {
    if (!Sentry) {
      this.logger.warn('Sentry SDK not installed - error tracking disabled');
      return;
    }

    if (!this.options.dsn) {
      this.logger.warn('Sentry DSN not configured - error tracking disabled');
      return;
    }

    if (this.initialized) {
      return;
    }

    try {
      const integrations: any[] = [];
      if (Sentry.httpIntegration) {
        integrations.push(Sentry.httpIntegration());
      }
      if (Sentry.expressIntegration) {
        integrations.push(Sentry.expressIntegration());
      }

      Sentry.init({
        dsn: this.options.dsn,
        environment: this.options.environment,
        release: this.options.release,
        tracesSampleRate: this.options.tracesSampleRate,
        profilesSampleRate: this.options.profilesSampleRate,
        debug: this.options.debug,
        integrations: integrations.length > 0 ? integrations : undefined,
        beforeSend: (event: any) => {
          // Filter out sensitive data before sending
          if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          return event;
        },
      });

      this.initialized = true;
      this.logger.log(`Sentry initialized for environment: ${this.options.environment}`);
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture an exception and send it to Sentry
   */
  captureException(exception: Error | any, context?: Partial<SentryScope>): string | undefined {
    if (!this.initialized || !Sentry) {
      this.logger.debug('Sentry not initialized, skipping exception capture');
      return undefined;
    }

    return Sentry.withScope((scope: any) => {
      if (context?.setUser) {
        context.setUser = (user: any) => scope.setUser(user);
      }
      if (context?.setTags) {
        context.setTags = (tags: Record<string, string>) => scope.setTags(tags);
      }
      if (context?.setExtras) {
        context.setExtras = (extras: Record<string, any>) => scope.setExtras(extras);
      }
      if (context?.setLevel) {
        context.setLevel = (level: string) => scope.setLevel(level);
      }

      return Sentry.captureException(exception);
    });
  }

  /**
   * Capture an exception with user context
   */
  captureExceptionWithUser(
    exception: Error | any,
    user?: { id: string; email?: string; role?: string },
    extra?: Record<string, any>,
  ): string | undefined {
    if (!this.initialized || !Sentry) {
      return undefined;
    }

    return Sentry.withScope((scope: any) => {
      if (user) {
        scope.setUser(user);
      }
      if (extra) {
        scope.setExtras(extra);
      }
      return Sentry.captureException(exception);
    });
  }

  /**
   * Capture a message and send it to Sentry
   */
  captureMessage(message: string, level: SeverityLevel = 'info'): string | undefined {
    if (!this.initialized || !Sentry) {
      return undefined;
    }

    return Sentry.captureMessage(message, level);
  }

  /**
   * Add breadcrumb for context
   */
  addBreadcrumb(breadcrumb: Breadcrumb) {
    if (!this.initialized || !Sentry) {
      return;
    }
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context for all future events
   */
  setUser(user: { id: string; email?: string; role?: string } | null) {
    if (!this.initialized || !Sentry) {
      return;
    }
    Sentry.setUser(user);
  }

  /**
   * Set tags for all future events
   */
  setTags(tags: Record<string, string>) {
    if (!this.initialized || !Sentry) {
      return;
    }
    Sentry.setTags(tags);
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(name: string, operation: string) {
    if (!this.initialized || !Sentry) {
      return null;
    }
    return Sentry.startInactiveSpan?.({ name, op: operation }) || null;
  }

  /**
   * Flush all pending events to Sentry
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized || !Sentry) {
      return true;
    }
    return Sentry.flush(timeout);
  }
}
