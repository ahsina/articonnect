import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { EmailService } from '../../email/services/email.service';

export interface VerificationSessionResult {
  sessionId: string;
  url: string;
  status: string;
}

export interface VerificationStatus {
  verified: boolean;
  status: 'unverified' | 'pending' | 'verified' | 'requires_input' | 'canceled';
  lastCheck?: Date;
  verifiedAt?: Date;
  documentType?: string;
  details?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    address?: {
      city?: string;
      country?: string;
    };
  };
}

@Injectable()
export class StripeIdentityService {
  private readonly logger = new Logger(StripeIdentityService.name);
  private stripe: Stripe | null = null;
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (secretKey && secretKey.startsWith('sk_')) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
      this.enabled = true;
      this.logger.log('✅ Stripe Identity service initialized');
    } else {
      this.enabled = false;
      this.logger.warn('⚠️ Stripe Identity service disabled (missing STRIPE_SECRET_KEY)');
    }
  }

  /**
   * Check if the service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId: string): Promise<VerificationSessionResult> {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException('Stripe Identity service is not configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
        stripeIdentitySessionId: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if there's an existing pending session
    if (user.stripeIdentitySessionId && user.kycStatus === 'PENDING') {
      try {
        const existingSession = await this.stripe.identity.verificationSessions.retrieve(
          user.stripeIdentitySessionId,
        );

        if (existingSession.status === 'requires_input') {
          return {
            sessionId: existingSession.id,
            url: existingSession.url!,
            status: existingSession.status,
          };
        }
      } catch (error) {
        this.logger.warn(`Previous session ${user.stripeIdentitySessionId} not found, creating new one`);
      }
    }

    // Create new verification session
    const session = await this.stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        user_id: userId,
        email: user.email,
      },
      options: {
        document: {
          allowed_types: ['passport', 'id_card', 'driving_license'],
          require_id_number: false,
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/artisan/settings?kyc=completed`,
    });

    // Update user with session ID
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeIdentitySessionId: session.id,
        kycStatus: 'PENDING',
        kycProvider: 'STRIPE_IDENTITY',
      },
    });

    this.logger.log(`Created verification session ${session.id} for user ${userId}`);

    return {
      sessionId: session.id,
      url: session.url!,
      status: session.status,
    };
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus> {
    if (!this.enabled || !this.stripe) {
      return {
        verified: false,
        status: 'unverified',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycVerified: true,
        kycStatus: true,
        kycVerifiedAt: true,
        stripeIdentitySessionId: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.kycVerified) {
      return {
        verified: true,
        status: 'verified',
        verifiedAt: user.kycVerifiedAt || undefined,
      };
    }

    if (!user.stripeIdentitySessionId) {
      return {
        verified: false,
        status: 'unverified',
      };
    }

    // Check current session status
    try {
      const session = await this.stripe.identity.verificationSessions.retrieve(
        user.stripeIdentitySessionId,
        {
          expand: ['verified_outputs'],
        },
      );

      const status = this.mapStripeStatus(session.status);

      return {
        verified: session.status === 'verified',
        status,
        lastCheck: new Date(),
        documentType: typeof session.last_verification_report === 'object' ? session.last_verification_report?.document?.type : undefined,
        details: session.verified_outputs
          ? {
              firstName: session.verified_outputs.first_name || undefined,
              lastName: session.verified_outputs.last_name || undefined,
              dateOfBirth: session.verified_outputs.dob
                ? `${session.verified_outputs.dob.year}-${session.verified_outputs.dob.month}-${session.verified_outputs.dob.day}`
                : undefined,
              address: session.verified_outputs.address
                ? {
                    city: session.verified_outputs.address.city || undefined,
                    country: session.verified_outputs.address.country || undefined,
                  }
                : undefined,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get verification status for user ${userId}:`, error);
      return {
        verified: false,
        status: 'unverified',
      };
    }
  }

  /**
   * Handle Stripe Identity webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'identity.verification_session.verified':
        await this.handleVerificationVerified(event.data.object as Stripe.Identity.VerificationSession);
        break;

      case 'identity.verification_session.requires_input':
        await this.handleVerificationRequiresInput(event.data.object as Stripe.Identity.VerificationSession);
        break;

      case 'identity.verification_session.canceled':
        await this.handleVerificationCanceled(event.data.object as Stripe.Identity.VerificationSession);
        break;

      default:
        this.logger.debug(`Unhandled identity event type: ${event.type}`);
    }
  }

  /**
   * Handle successful verification
   */
  private async handleVerificationVerified(session: Stripe.Identity.VerificationSession): Promise<void> {
    const userId = session.metadata?.user_id;

    if (!userId) {
      this.logger.error('No user_id in session metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.error(`User ${userId} not found`);
      return;
    }

    // Update user KYC status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycVerified: true,
        kycVerifiedAt: new Date(),
        kycStatus: 'VERIFIED',
      },
    });

    // Send notification
    await this.notificationService.createNotification(
      userId,
      'KYC_VERIFIED',
      '✅ Identité vérifiée !',
      'Votre vérification d\'identité a été approuvée. Vous pouvez maintenant recevoir des paiements sans limite.',
      '/artisan/settings',
    );

    // Send email
    try {
      await this.emailService.sendEmail(
        user.email,
        '✅ Votre identité a été vérifiée - ArtiConnect',
        this.getVerifiedEmailHtml(user.firstName || 'Artisan'),
      );
    } catch (error) {
      this.logger.error(`Failed to send verification email:`, error);
    }

    this.logger.log(`User ${userId} identity verified successfully`);
  }

  /**
   * Handle verification requires additional input
   */
  private async handleVerificationRequiresInput(session: Stripe.Identity.VerificationSession): Promise<void> {
    const userId = session.metadata?.user_id;

    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'REQUIRES_INPUT',
      },
    });

    // Notify user
    await this.notificationService.createNotification(
      userId,
      'KYC_REQUIRES_INPUT',
      '📋 Action requise pour la vérification',
      'Nous avons besoin d\'informations supplémentaires pour compléter votre vérification d\'identité.',
      session.url || '/artisan/settings',
    );

    this.logger.log(`User ${userId} verification requires additional input`);
  }

  /**
   * Handle verification canceled
   */
  private async handleVerificationCanceled(session: Stripe.Identity.VerificationSession): Promise<void> {
    const userId = session.metadata?.user_id;

    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'CANCELED',
        stripeIdentitySessionId: null,
      },
    });

    this.logger.log(`User ${userId} verification canceled`);
  }

  /**
   * Map Stripe status to internal status
   */
  private mapStripeStatus(stripeStatus: Stripe.Identity.VerificationSession.Status): VerificationStatus['status'] {
    const statusMap: Record<string, VerificationStatus['status']> = {
      requires_input: 'requires_input',
      processing: 'pending',
      verified: 'verified',
      canceled: 'canceled',
    };

    return statusMap[stripeStatus] || 'unverified';
  }

  /**
   * Generate verified email HTML
   */
  private getVerifiedEmailHtml(firstName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .benefits { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Identité Vérifiée !</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${firstName}</strong>,</p>

      <div class="success-box">
        <strong>Félicitations !</strong> Votre vérification d'identité a été approuvée avec succès.
      </div>

      <div class="benefits">
        <h3 style="margin-top: 0;">Ce que cela signifie pour vous :</h3>
        <ul>
          <li>✓ Aucune limite de paiement</li>
          <li>✓ Badge "Vérifié" sur votre profil</li>
          <li>✓ Accès à toutes les fonctionnalités premium</li>
          <li>✓ Confiance accrue des clients</li>
        </ul>
      </div>

      <p>Vous pouvez maintenant accepter des missions et recevoir des paiements sans restriction.</p>

      <a href="${process.env.FRONTEND_URL || 'https://articonnect.lu'}/artisan/dashboard" class="btn">
        Aller au tableau de bord
      </a>
    </div>
    <div class="footer">
      <p>ArtiConnect - La plateforme des artisans au Luxembourg</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Cancel a verification session
   */
  async cancelVerificationSession(userId: string): Promise<void> {
    if (!this.enabled || !this.stripe) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeIdentitySessionId: true },
    });

    if (user?.stripeIdentitySessionId) {
      try {
        await this.stripe.identity.verificationSessions.cancel(user.stripeIdentitySessionId);
      } catch (error) {
        this.logger.warn(`Could not cancel session ${user.stripeIdentitySessionId}:`, error);
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          stripeIdentitySessionId: null,
          kycStatus: null,
        },
      });
    }
  }
}
