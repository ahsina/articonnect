import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { TracingModuleOptions } from './tracing.module';

// OpenTelemetry types for type safety
interface Span {
  setAttribute(key: string, value: string | number | boolean): this;
  setAttributes(attributes: Record<string, string | number | boolean>): this;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): this;
  setStatus(status: { code: number; message?: string }): this;
  recordException(exception: Error): this;
  end(): void;
}

interface Tracer {
  startSpan(name: string, options?: any): Span;
  startActiveSpan<T>(name: string, fn: (span: Span) => T): T;
  startActiveSpan<T>(name: string, options: any, fn: (span: Span) => T): T;
}

interface TracerProvider {
  getTracer(name: string, version?: string): Tracer;
  shutdown(): Promise<void>;
}

// Status codes
export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const;

// Try to load OpenTelemetry dynamically
let api: any = null;
let sdk: any = null;
let resourceModule: any = null;
let semanticConventions: any = null;

try {
  api = require('@opentelemetry/api');
  sdk = require('@opentelemetry/sdk-node');
  resourceModule = require('@opentelemetry/resources');
  semanticConventions = require('@opentelemetry/semantic-conventions');
} catch {
  // OpenTelemetry not installed
}

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TracingService.name);
  private initialized = false;
  private tracerProvider: TracerProvider | null = null;
  private tracer: Tracer | null = null;

  constructor(
    @Inject('TRACING_OPTIONS')
    private readonly options: TracingModuleOptions,
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private async initialize() {
    if (!api || !sdk) {
      this.logger.warn('OpenTelemetry SDK not installed - distributed tracing disabled');
      return;
    }

    if (!this.options.enabled) {
      this.logger.warn('OpenTelemetry disabled via configuration');
      return;
    }

    if (this.initialized) {
      return;
    }

    try {
      // Create resource with service information
      const resource = resourceModule?.Resource?.default?.()?.merge?.(
        new resourceModule.Resource({
          [semanticConventions?.SEMRESATTRS_SERVICE_NAME || 'service.name']: this.options.serviceName,
          [semanticConventions?.SEMRESATTRS_SERVICE_VERSION || 'service.version']: this.options.serviceVersion,
          [semanticConventions?.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT || 'deployment.environment']: this.options.environment,
        })
      ) || new resourceModule.Resource({
        'service.name': this.options.serviceName,
        'service.version': this.options.serviceVersion,
        'deployment.environment': this.options.environment,
      });

      // Configure exporters based on type
      const exporters = await this.configureExporters();

      // Create SDK
      const nodeSdk = new sdk.NodeSDK({
        resource,
        ...exporters,
        instrumentations: await this.getInstrumentations(),
      });

      // Start SDK
      await nodeSdk.start();

      // Get tracer
      this.tracer = api.trace.getTracer(this.options.serviceName, this.options.serviceVersion);
      this.tracerProvider = api.trace.getTracerProvider();

      this.initialized = true;
      this.logger.log(`OpenTelemetry initialized for service: ${this.options.serviceName}`);
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry', error);
    }
  }

  private async configureExporters(): Promise<any> {
    const exporters: any = {};

    if (!this.options.exporterEndpoint && this.options.exporterType !== 'console') {
      this.logger.warn('No OTEL exporter endpoint configured, using console exporter');
      try {
        const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
        exporters.traceExporter = new ConsoleSpanExporter();
      } catch {
        // Console exporter not available
      }
      return exporters;
    }

    switch (this.options.exporterType) {
      case 'otlp':
        try {
          const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
          exporters.traceExporter = new OTLPTraceExporter({
            url: this.options.exporterEndpoint,
          });
        } catch {
          this.logger.warn('OTLP exporter not available');
        }
        break;

      case 'jaeger':
        try {
          const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
          exporters.traceExporter = new JaegerExporter({
            endpoint: this.options.exporterEndpoint,
          });
        } catch {
          this.logger.warn('Jaeger exporter not available');
        }
        break;

      case 'zipkin':
        try {
          const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
          exporters.traceExporter = new ZipkinExporter({
            url: this.options.exporterEndpoint,
          });
        } catch {
          this.logger.warn('Zipkin exporter not available');
        }
        break;

      case 'console':
      default:
        try {
          const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
          exporters.traceExporter = new ConsoleSpanExporter();
        } catch {
          // Console exporter not available
        }
        break;
    }

    return exporters;
  }

  private async getInstrumentations(): Promise<any[]> {
    const instrumentations: any[] = [];

    // HTTP instrumentation
    try {
      const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
      instrumentations.push(new HttpInstrumentation({
        ignoreIncomingPaths: ['/health', '/metrics'],
      }));
    } catch {
      // HTTP instrumentation not available
    }

    // Express instrumentation
    try {
      const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
      instrumentations.push(new ExpressInstrumentation());
    } catch {
      // Express instrumentation not available
    }

    // NestJS instrumentation
    try {
      const { NestInstrumentation } = require('@opentelemetry/instrumentation-nestjs-core');
      instrumentations.push(new NestInstrumentation());
    } catch {
      // NestJS instrumentation not available
    }

    // Prisma instrumentation
    try {
      const { PrismaInstrumentation } = require('@prisma/instrumentation');
      instrumentations.push(new PrismaInstrumentation());
    } catch {
      // Prisma instrumentation not available
    }

    // Redis instrumentation
    try {
      const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis');
      instrumentations.push(new IORedisInstrumentation());
    } catch {
      // Redis instrumentation not available
    }

    return instrumentations;
  }

  async shutdown() {
    if (this.tracerProvider) {
      await this.tracerProvider.shutdown();
      this.logger.log('OpenTelemetry shutdown complete');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, options?: { attributes?: Record<string, string | number | boolean> }): Span | null {
    if (!this.initialized || !this.tracer) {
      return null;
    }

    const span = this.tracer.startSpan(name, options);
    return span;
  }

  /**
   * Execute a function within a new span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    options?: { attributes?: Record<string, string | number | boolean> }
  ): Promise<T> {
    if (!this.initialized || !this.tracer) {
      return fn(this.createNoOpSpan());
    }

    return this.tracer.startActiveSpan(name, options || {}, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : 'Unknown error' });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Add attributes to the current active span
   */
  setSpanAttributes(attributes: Record<string, string | number | boolean>) {
    if (!this.initialized || !api) {
      return;
    }

    const span = api.trace.getActiveSpan?.();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add an event to the current active span
   */
  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>) {
    if (!this.initialized || !api) {
      return;
    }

    const span = api.trace.getActiveSpan?.();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Record an exception on the current active span
   */
  recordException(error: Error) {
    if (!this.initialized || !api) {
      return;
    }

    const span = api.trace.getActiveSpan?.();
    if (span) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }
  }

  /**
   * Get the current trace context for propagation
   */
  getTraceContext(): { traceId: string; spanId: string } | null {
    if (!this.initialized || !api) {
      return null;
    }

    const span = api.trace.getActiveSpan?.();
    if (!span) {
      return null;
    }

    const context = span.spanContext?.();
    if (!context) {
      return null;
    }

    return {
      traceId: context.traceId,
      spanId: context.spanId,
    };
  }

  /**
   * Create a no-op span for when tracing is disabled
   */
  private createNoOpSpan(): Span {
    return {
      setAttribute: () => this.createNoOpSpan(),
      setAttributes: () => this.createNoOpSpan(),
      addEvent: () => this.createNoOpSpan(),
      setStatus: () => this.createNoOpSpan(),
      recordException: () => this.createNoOpSpan(),
      end: () => {},
    };
  }
}
