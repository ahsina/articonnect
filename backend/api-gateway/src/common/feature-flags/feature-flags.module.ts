import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeatureFlagsService, FEATURE_FLAGS_OPTIONS } from './feature-flags.service';
import { FeatureFlagGuard } from './feature-flags.guard';
import { FeatureFlagsController, FeatureFlagsPublicController } from './feature-flags.controller';
import { FeatureFlagsModuleOptions, DEFAULT_OPTIONS } from './feature-flags.interface';

@Global()
@Module({})
export class FeatureFlagsModule {
  /**
   * Register the module with default options
   */
  static forRoot(options?: FeatureFlagsModuleOptions): DynamicModule {
    return {
      module: FeatureFlagsModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: FEATURE_FLAGS_OPTIONS,
          useValue: { ...DEFAULT_OPTIONS, ...options },
        },
        FeatureFlagsService,
        FeatureFlagGuard,
      ],
      controllers: [FeatureFlagsController, FeatureFlagsPublicController],
      exports: [FeatureFlagsService, FeatureFlagGuard],
    };
  }

  /**
   * Register the module with async options
   */
  static forRootAsync(options?: {
    useFactory: (...args: any[]) => Promise<FeatureFlagsModuleOptions> | FeatureFlagsModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: FeatureFlagsModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: FEATURE_FLAGS_OPTIONS,
          useFactory: options?.useFactory || (() => DEFAULT_OPTIONS),
          inject: options?.inject || [],
        },
        FeatureFlagsService,
        FeatureFlagGuard,
      ],
      controllers: [FeatureFlagsController, FeatureFlagsPublicController],
      exports: [FeatureFlagsService, FeatureFlagGuard],
    };
  }
}

export * from './feature-flags.service';
export * from './feature-flags.interface';
export * from './feature-flags.decorator';
export * from './feature-flags.guard';
