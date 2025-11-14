import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip rate limiting on specific routes
 *
 * Usage:
 * @SkipThrottle()
 * @Get('health')
 * healthCheck() { ... }
 *
 * Or skip specific throttlers:
 * @SkipThrottle({ short: true })
 */
export const SKIP_THROTTLE_KEY = 'skipThrottle';
export const SkipThrottle = (skip = true) => SetMetadata(SKIP_THROTTLE_KEY, skip);
