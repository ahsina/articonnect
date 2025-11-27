import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAG_KEY, FeatureFlagDecoratorOptions } from './feature-flags.decorator';
import { FeatureFlagContext } from './feature-flags.interface';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagConfig = this.reflector.getAllAndOverride<
      { key?: string; keys?: string[]; multiple?: boolean; requireAll?: boolean } & FeatureFlagDecoratorOptions
    >(FEATURE_FLAG_KEY, [context.getHandler(), context.getClass()]);

    if (!flagConfig) {
      return true; // No feature flag requirement
    }

    const request = context.switchToHttp().getRequest();
    const flagContext = this.buildContext(request);

    // Handle multiple flags
    if (flagConfig.multiple && flagConfig.keys) {
      return this.checkMultipleFlags(flagConfig.keys, flagConfig.requireAll, flagContext, flagConfig);
    }

    // Handle single flag
    if (flagConfig.key) {
      return this.checkSingleFlag(flagConfig.key, flagContext, flagConfig);
    }

    return true;
  }

  private async checkSingleFlag(
    key: string,
    context: FeatureFlagContext,
    options: FeatureFlagDecoratorOptions,
  ): Promise<boolean> {
    const isEnabled = await this.featureFlagsService.isEnabled(key, context);

    if (!isEnabled) {
      this.throwDisabledException(options);
    }

    return true;
  }

  private async checkMultipleFlags(
    keys: string[],
    requireAll: boolean | undefined,
    context: FeatureFlagContext,
    options: FeatureFlagDecoratorOptions,
  ): Promise<boolean> {
    const results = await this.featureFlagsService.evaluateMultiple(keys, context);

    if (requireAll) {
      const allEnabled = Object.values(results).every(Boolean);
      if (!allEnabled) {
        this.throwDisabledException(options);
      }
    } else {
      const anyEnabled = Object.values(results).some(Boolean);
      if (!anyEnabled) {
        this.throwDisabledException(options);
      }
    }

    return true;
  }

  private throwDisabledException(options: FeatureFlagDecoratorOptions): never {
    const status = options.statusOnDisabled ?? 404;
    const message = options.messageOnDisabled ?? 'This feature is not available';

    if (status === 403) {
      throw new ForbiddenException(message);
    }

    throw new NotFoundException(message);
  }

  private buildContext(request: any): FeatureFlagContext {
    return {
      userId: request.user?.sub || request.user?.id,
      userRole: request.user?.role,
      sessionId: request.sessionId || request.headers?.['x-session-id'],
      attributes: {
        userAgent: request.headers?.['user-agent'],
        ip: request.ip,
      },
    };
  }
}
