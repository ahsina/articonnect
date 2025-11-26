import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SentryService } from './sentry.service';

export interface SentryModuleOptions {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
}

@Global()
@Module({})
export class SentryModule {
  static forRoot(options?: SentryModuleOptions): DynamicModule {
    return {
      module: SentryModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'SENTRY_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            dsn: options?.dsn || configService.get<string>('SENTRY_DSN'),
            environment: options?.environment || configService.get<string>('NODE_ENV', 'development'),
            release: options?.release || configService.get<string>('APP_VERSION', '1.0.0'),
            tracesSampleRate: options?.tracesSampleRate ?? 0.1,
            profilesSampleRate: options?.profilesSampleRate ?? 0.1,
            debug: options?.debug ?? false,
          }),
          inject: [ConfigService],
        },
        SentryService,
      ],
      exports: [SentryService, 'SENTRY_OPTIONS'],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: SentryModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'SENTRY_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            dsn: configService.get<string>('SENTRY_DSN'),
            environment: configService.get<string>('NODE_ENV', 'development'),
            release: configService.get<string>('APP_VERSION', '1.0.0'),
            tracesSampleRate: parseFloat(configService.get<string>('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
            profilesSampleRate: parseFloat(configService.get<string>('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),
            debug: configService.get<string>('SENTRY_DEBUG', 'false') === 'true',
          }),
          inject: [ConfigService],
        },
        SentryService,
      ],
      exports: [SentryService, 'SENTRY_OPTIONS'],
    };
  }
}
