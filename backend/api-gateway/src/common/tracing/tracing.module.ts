import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TracingService } from './tracing.service';

export interface TracingModuleOptions {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  exporterEndpoint?: string;
  exporterType?: 'otlp' | 'jaeger' | 'zipkin' | 'console';
  samplingRatio?: number;
  enabled?: boolean;
}

@Global()
@Module({})
export class TracingModule {
  static forRoot(options?: TracingModuleOptions): DynamicModule {
    return {
      module: TracingModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'TRACING_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            serviceName: options?.serviceName || configService.get<string>('OTEL_SERVICE_NAME', 'articonnect-api'),
            serviceVersion: options?.serviceVersion || configService.get<string>('APP_VERSION', '1.0.0'),
            environment: options?.environment || configService.get<string>('NODE_ENV', 'development'),
            exporterEndpoint: options?.exporterEndpoint || configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT'),
            exporterType: options?.exporterType || configService.get<string>('OTEL_EXPORTER_TYPE', 'otlp') as any,
            samplingRatio: options?.samplingRatio ?? parseFloat(configService.get<string>('OTEL_SAMPLING_RATIO', '0.1')),
            enabled: options?.enabled ?? configService.get<string>('OTEL_ENABLED', 'false') === 'true',
          }),
          inject: [ConfigService],
        },
        TracingService,
      ],
      exports: [TracingService, 'TRACING_OPTIONS'],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: TracingModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'TRACING_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            serviceName: configService.get<string>('OTEL_SERVICE_NAME', 'articonnect-api'),
            serviceVersion: configService.get<string>('APP_VERSION', '1.0.0'),
            environment: configService.get<string>('NODE_ENV', 'development'),
            exporterEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT'),
            exporterType: configService.get<string>('OTEL_EXPORTER_TYPE', 'otlp') as any,
            samplingRatio: parseFloat(configService.get<string>('OTEL_SAMPLING_RATIO', '0.1')),
            enabled: configService.get<string>('OTEL_ENABLED', 'false') === 'true',
          }),
          inject: [ConfigService],
        },
        TracingService,
      ],
      exports: [TracingService, 'TRACING_OPTIONS'],
    };
  }
}
