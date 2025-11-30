import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';

// Decorator key for marking routes that require phone verification
export const REQUIRE_PHONE_VERIFICATION = 'requirePhoneVerification';

/**
 * Guard that ensures the user has a verified phone number.
 *
 * Used for sensitive operations like:
 * - Accepting missions (artisans)
 * - Withdrawing funds
 * - Updating payment information
 *
 * This is especially important for artisans to ensure:
 * 1. Identity verification (fraud prevention)
 * 2. Emergency contact capability
 * 3. SMS notifications for important events
 */
@Injectable()
export class PhoneVerifiedGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // Get user from database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        phone: true,
        phoneVerified: true,
        role: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Check if phone exists
    if (!dbUser.phone) {
      throw new ForbiddenException({
        code: 'PHONE_REQUIRED',
        message: 'Un numéro de téléphone est requis pour cette action',
        details: {
          action: 'add_phone',
          redirectUrl: '/settings/phone',
        },
      });
    }

    // Check if phone is verified
    if (!dbUser.phoneVerified) {
      throw new ForbiddenException({
        code: 'PHONE_NOT_VERIFIED',
        message: 'Veuillez vérifier votre numéro de téléphone avant de continuer',
        details: {
          action: 'verify_phone',
          phone: this.maskPhone(dbUser.phone),
          redirectUrl: '/settings/phone/verify',
        },
      });
    }

    return true;
  }

  /**
   * Mask phone number for privacy (e.g., +33612345678 -> +33****5678)
   */
  private maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    const start = phone.slice(0, 3);
    const end = phone.slice(-4);
    return `${start}****${end}`;
  }
}
