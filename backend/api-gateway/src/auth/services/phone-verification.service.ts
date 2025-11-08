import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(phone: string, userId?: string): Promise<{ message: string; expiresIn: number }> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/\D/g, '');

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Invalidate any existing unused tokens for this phone
    await this.prisma.phoneVerificationToken.updateMany({
      where: {
        phone: normalizedPhone,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Create new verification token
    await this.prisma.phoneVerificationToken.create({
      data: {
        code,
        phone: normalizedPhone,
        userId,
        expiresAt,
      },
    });

    // Send SMS using SMS provider
    await this.sendSMS(normalizedPhone, code);

    return {
      message: 'Code de vérification envoyé par SMS',
      expiresIn: 600, // 10 minutes in seconds
    };
  }

  /**
   * Verify the code sent to phone number
   */
  async verifyCode(phone: string, code: string): Promise<{ verified: boolean; phone: string }> {
    const normalizedPhone = phone.replace(/\D/g, '');

    // Find the token
    const token = await this.prisma.phoneVerificationToken.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new BadRequestException('Code de vérification invalide');
    }

    // Check if expired
    if (new Date() > token.expiresAt) {
      throw new BadRequestException('Code de vérification expiré');
    }

    // Check attempts (max 5 attempts)
    if (token.attempts >= 5) {
      throw new BadRequestException('Nombre maximal de tentatives dépassé');
    }

    // Verify the code
    if (token.code !== code) {
      // Increment attempts
      await this.prisma.phoneVerificationToken.update({
        where: { id: token.id },
        data: { attempts: token.attempts + 1 },
      });
      throw new BadRequestException('Code de vérification incorrect');
    }

    // Mark as used
    await this.prisma.phoneVerificationToken.update({
      where: { id: token.id },
      data: { used: true },
    });

    // Update user's phone verification status if userId is associated
    if (token.userId) {
      await this.prisma.user.update({
        where: { id: token.userId },
        data: { phoneVerified: true },
      });
    }

    return {
      verified: true,
      phone: normalizedPhone,
    };
  }

  /**
   * Send SMS using SMS provider (Twilio, etc.)
   * This is a placeholder that can be integrated with actual SMS service
   */
  private async sendSMS(phone: string, code: string): Promise<void> {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      // In development/test mode, just log the code
      this.logger.warn(`SMS not configured. Verification code for ${phone}: ${code}`);
      this.logger.warn('Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS');
      return;
    }

    try {
      // Twilio integration would go here
      // Example (requires 'twilio' package):
      // const client = require('twilio')(twilioAccountSid, twilioAuthToken);
      // await client.messages.create({
      //   body: `Votre code de vérification ArticConnect: ${code}`,
      //   from: twilioPhoneNumber,
      //   to: phone,
      // });

      this.logger.log(`SMS sent to ${phone} (code: ${code})`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}:`, error);
      throw new BadRequestException('Échec de l\'envoi du SMS');
    }
  }

  /**
   * Check if a phone number is already verified
   */
  async isPhoneVerified(phone: string): Promise<boolean> {
    const normalizedPhone = phone.replace(/\D/g, '');

    const user = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        phoneVerified: true,
      },
    });

    return !!user;
  }
}
