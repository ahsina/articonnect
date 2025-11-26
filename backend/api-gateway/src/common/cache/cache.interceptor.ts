import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, tap } from 'rxjs';
import { CacheService, CacheOptions } from './cache.service';
import { CACHE_KEY, CACHE_OPTIONS, CACHE_INVALIDATE } from './cache.decorator';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
  };
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const keyPrefix = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const options = this.reflector.get<CacheOptions>(CACHE_OPTIONS, context.getHandler());
    const invalidateTags = this.reflector.get<string[]>(CACHE_INVALIDATE, context.getHandler());

    // If no cache key defined, just proceed
    if (!keyPrefix && !invalidateTags) {
      return next.handle();
    }

    // Handle cache invalidation
    if (invalidateTags) {
      return next.handle().pipe(
        tap(async () => {
          const resolvedTags = this.resolveTags(invalidateTags, context);
          await this.cacheService.invalidateByTags(resolvedTags);
        }),
      );
    }

    // Handle cache lookup
    if (keyPrefix && !options?.skipCache) {
      const cacheKey = this.buildCacheKey(keyPrefix, context);
      const cached = await this.cacheService.get(cacheKey);

      if (cached !== null) {
        return of(cached);
      }

      return next.handle().pipe(
        tap(async (data) => {
          if (data !== undefined && data !== null) {
            await this.cacheService.set(cacheKey, data, options);
          }
        }),
      );
    }

    return next.handle();
  }

  private buildCacheKey(prefix: string, context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const handler = context.getHandler();
    const className = context.getClass().name;

    // Build key from request params
    const params = request.params || {};
    const query = request.query || {};
    const userId = request.user?.id;

    // Create a deterministic cache key
    const paramsKey = Object.keys(params)
      .sort()
      .map((k) => `${k}:${params[k]}`)
      .join(':');

    const queryKey = Object.keys(query)
      .sort()
      .filter((k) => !['page', 'limit'].includes(k)) // Include pagination in key
      .map((k) => `${k}:${query[k]}`)
      .join(':');

    const parts = [prefix, className, handler.name];
    if (userId) parts.push(`u:${userId}`);
    if (paramsKey) parts.push(paramsKey);
    if (queryKey) parts.push(queryKey);

    return this.cacheService.buildKey('api', ...parts);
  }

  private resolveTags(tags: string[], context: ExecutionContext): string[] {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const params = request.params || {};
    const userId = request.user?.id;

    return tags.map((tag) => {
      // Replace placeholders like ${userId}, ${id}, etc.
      let resolved = tag;
      if (userId) {
        resolved = resolved.replace('${userId}', userId);
      }
      Object.keys(params).forEach((key) => {
        resolved = resolved.replace(`\${${key}}`, params[key]);
      });
      return resolved;
    });
  }
}
