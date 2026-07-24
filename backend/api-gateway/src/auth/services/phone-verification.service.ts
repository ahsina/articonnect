import { Injectable, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomInt, timingSafeEqual } from 'crypto';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  // Rate limiting: max 3 SMS per phone per hour
  private readonly MAX_SMS_PER_HOUR = 3;

  constructor(private prisma: PrismaService) {}

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(phone: string, userId?: string): Promise<{ message: string; expiresIn: number }> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = this.normalizePhone(phone);

    // Check rate limit
    await this.checkRateLimit(normalizedPhone);

    // Check if phone is already used by another verified user
    if (userId) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          phone: normalizedPhone,
          phoneVerified: true,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé par un autre compte');
      }
    }

    // Generate cryptographically secure 6-digit code
    const code = randomInt(100000, 999999).toString();

    // Set expiry to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Envoyer le SMS AVANT toute écriture en base : si la livraison échoue
    // (ex. numéro Twilio trial ne délivrant pas vers LU/FR), on lève l'erreur
    // sans avoir créé de token. Ainsi une tentative ratée :
    //   - ne consomme pas le quota de rate-limit (pas de token orphelin) ;
    //   - n'invalide pas le dernier code valide déjà envoyé.
    const delivered = await this.sendSMS(normalizedPhone, code);

    // La livraison a réussi (ou le fallback démo l'a contournée) : on invalide les anciens
    // tokens non utilisés puis on persiste le nouveau (ordre garanti après l'envoi).
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

    const response: {
      message: string;
      expiresIn: number;
      delivered: boolean;
      devCode?: string;
    } = {
      message: delivered
        ? 'Code de vérification envoyé par SMS'
        : 'Code de vérification généré (SMS indisponible)',
      expiresIn: 600, // 10 minutes in seconds
      delivered,
    };
    // Mode démo uniquement : expose le code pour permettre la vérif quand le SMS ne part pas
    // (ex. permissions géo Twilio non activées). À DÉSACTIVER en prod (ne jamais exposer l'OTP).
    if (!delivered && process.env.DEMO_SMS_FALLBACK === 'true') {
      response.devCode = code;
    }
    return response;
  }

  /**
   * Check rate limit for SMS sending
   */
  private async checkRateLimit(phone: string): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentTokens = await this.prisma.phoneVerificationToken.count({
      where: {
        phone,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentTokens >= this.MAX_SMS_PER_HOUR) {
      throw new BadRequestException(
        'Trop de tentatives. Veuillez attendre une heure avant de réessayer.'
      );
    }
  }

  /**
   * Normalize phone number to international format
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If no country code, assume France (+33)
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('0')) {
        normalized = '+33' + normalized.slice(1);
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Verify the code sent to phone number
   */
  async verifyCode(phone: string, code: string): Promise<{ verified: boolean; phone: string }> {
    const normalizedPhone = this.normalizePhone(phone);

    // Find the token - search with normalized phone
    const token = await this.prisma.phoneVerificationToken.findFirst({
      where: {
        phone: normalizedPhone,
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

    // Verify the code using timing-safe comparison to prevent timing attacks
    const codeBuffer = Buffer.from(token.code.padEnd(6, '0'));
    const inputBuffer = Buffer.from(code.padEnd(6, '0'));
    const isCodeValid = codeBuffer.length === inputBuffer.length &&
      timingSafeEqual(codeBuffer, inputBuffer);

    if (!isCodeValid) {
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

    // Update user's phone and verification status if userId is associated
    if (token.userId) {
      await this.prisma.user.update({
        where: { id: token.userId },
        data: {
          phone: normalizedPhone,
          phoneVerified: true,
        },
      });
    }

    return {
      verified: true,
      phone: normalizedPhone,
    };
  }

  /**
   * Verify code for authenticated user and update their phone
   */
  async verifyCodeForUser(
    userId: string,
    phone: string,
    code: string,
  ): Promise<{ verified: boolean; phone: string }> {
    const normalizedPhone = this.normalizePhone(phone);

    // Find the token for this user and phone
    const token = await this.prisma.phoneVerificationToken.findFirst({
      where: {
        phone: normalizedPhone,
        userId,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new BadRequestException('Code de vérification invalide ou expiré');
    }

    // Check if expired
    if (new Date() > token.expiresAt) {
      throw new BadRequestException('Code de vérification expiré');
    }

    // Check attempts
    if (token.attempts >= 5) {
      throw new BadRequestException('Nombre maximal de tentatives dépassé');
    }

    // Verify the code
    const codeBuffer = Buffer.from(token.code.padEnd(6, '0'));
    const inputBuffer = Buffer.from(code.padEnd(6, '0'));
    const isCodeValid = codeBuffer.length === inputBuffer.length &&
      timingSafeEqual(codeBuffer, inputBuffer);

    if (!isCodeValid) {
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

    // Update user's phone number and set as verified
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: normalizedPhone,
        phoneVerified: true,
      },
    });

    this.logger.log(`Phone verified for user ${userId}: ${normalizedPhone}`);

    return {
      verified: true,
      phone: normalizedPhone,
    };
  }

  /**
   * Get phone verification status for a user
   */
  async getPhoneStatus(userId: string): Promise<{
    hasPhone: boolean;
    phone: string | null;
    verified: boolean;
    maskedPhone: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerified: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    return {
      hasPhone: !!user.phone,
      phone: user.phone,
      verified: user.phoneVerified,
      maskedPhone: user.phone ? this.maskPhone(user.phone) : null,
    };
  }

  /**
   * Mask phone number for privacy
   */
  private maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    const start = phone.slice(0, 4);
    const end = phone.slice(-2);
    return `${start}****${end}`;
  }

  /**
   * Send SMS using SMS provider (Twilio, etc.)
   * This is a placeholder that can be integrated with actual SMS service
   */
  /** Message clair selon le code d'erreur Twilio (sinon message générique). */
  private mapTwilioError(twilioCode?: number): string {
    switch (twilioCode) {
      case 21408: // Permission to send an SMS has not been enabled for the region of the 'To' number
        return "L'envoi de SMS vers ce pays n'est pas activé sur le compte SMS. " +
          'Activez la zone géographique dans la console Twilio (Messaging → Geo Permissions).';
      case 21211:
        return 'Numéro de téléphone invalide.';
      case 21614:
        return "Ce numéro n'est pas un mobile capable de recevoir des SMS.";
      case 21610:
        return 'Ce numéro s\'est désinscrit des SMS (STOP).';
      case 21612:
        return "Impossible d'acheminer un SMS vers ce numéro depuis l'expéditeur configuré.";
      default:
        return "Échec de l'envoi du SMS. Réessayez plus tard.";
    }
  }

  /**
   * Envoie le SMS. Renvoie `true` si effectivement livré via Twilio, `false` sinon
   * (Twilio non configuré, ou échec récupérable en mode démo). Ne lève une exception
   * que sur un échec non contourné (DEMO_SMS_FALLBACK != 'true').
   */
  private async sendSMS(phone: string, code: string): Promise<boolean> {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const demoFallback = process.env.DEMO_SMS_FALLBACK === 'true';

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      // Pas de SMS configuré : on log le code (dev/démo) et on ne bloque pas.
      this.logger.warn(`SMS not configured. Verification code for ${phone}: ${code}`);
      this.logger.warn('Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS');
      return false;
    }

    try {
      // Real Twilio send when credentials are configured (works with Twilio trial too).
      // Lazy-require so the 'twilio' package is only loaded when actually used.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio');
      const client = twilio(twilioAccountSid, twilioAuthToken);
      const result = await client.messages.create({
        body: `Votre code de vérification Krafolt: ${code}. Valide 10 min.`,
        from: twilioPhoneNumber,
        to: phone,
      });

      // Do NOT log the verification code here (auth secret).
      this.logger.log(`Verification SMS sent to ${phone} (sid: ${result.sid})`);
      return true;
    } catch (error) {
      const twilioCode = (error as { code?: number })?.code;
      this.logger.error(
        `Failed to send SMS to ${phone} (Twilio ${twilioCode ?? '?'}): ${(error as Error)?.message}`,
      );
      // Fallback démo : ne bloque pas l'onboarding quand Twilio refuse (ex. géo non activée).
      // Le code reste valide ; il est loggé et exposé dans la réponse (voir sendVerificationCode).
      if (demoFallback) {
        this.logger.warn(`[DEMO_SMS_FALLBACK] Code de vérification pour ${phone}: ${code}`);
        return false;
      }
      throw new BadRequestException(this.mapTwilioError(twilioCode));
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
