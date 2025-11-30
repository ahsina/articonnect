import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { PhoneVerifiedGuard, REQUIRE_PHONE_VERIFICATION } from '../guards/phone-verified.guard';

/**
 * Decorator that combines the PhoneVerifiedGuard with metadata
 *
 * Usage:
 * @RequirePhoneVerification()
 * @Post(':id/accept')
 * async acceptMission(@Request() req, @Param('id') id: string) { ... }
 */
export function RequirePhoneVerification() {
  return applyDecorators(
    SetMetadata(REQUIRE_PHONE_VERIFICATION, true),
    UseGuards(PhoneVerifiedGuard),
  );
}
