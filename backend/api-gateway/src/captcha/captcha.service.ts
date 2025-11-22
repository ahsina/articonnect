import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly recaptchaSecretKey: string;
  private readonly recaptchaEnabled: boolean;
  private readonly minScore: number = 0.5; // Google reCAPTCHA v3 score threshold

  constructor(private configService: ConfigService) {
    this.recaptchaSecretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY') || '';
    this.recaptchaEnabled = this.configService.get<string>('RECAPTCHA_ENABLED') === 'true';

    if (!this.recaptchaSecretKey && this.recaptchaEnabled) {
      this.logger.warn('RECAPTCHA_SECRET_KEY is not configured, CAPTCHA verification will be skipped');
    }
  }

  /**
   * Verify Google reCAPTCHA v3 token
   * @param token - reCAPTCHA token from client
   * @param action - Expected action (login, register, etc.)
   * @param remoteIp - User's IP address (optional)
   */
  async verifyCaptcha(
    token: string,
    action: string,
    remoteIp?: string,
  ): Promise<boolean> {
    // Skip verification if CAPTCHA is disabled or no secret key
    if (!this.recaptchaEnabled) {
      this.logger.debug('CAPTCHA verification skipped (disabled)');
      return true;
    }

    if (!this.recaptchaSecretKey) {
      this.logger.warn('CAPTCHA verification skipped (no secret key)');
      return true;
    }

    if (!token) {
      throw new BadRequestException('CAPTCHA token manquant');
    }

    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: this.recaptchaSecretKey,
            response: token,
            remoteip: remoteIp,
          },
        },
      );

      const { success, score, action: returnedAction, 'error-codes': errorCodes } = response.data;

      // Log for debugging
      this.logger.debug(
        `CAPTCHA verification: success=${success}, score=${score}, action=${returnedAction}`,
      );

      // Check if verification failed
      if (!success) {
        this.logger.warn(`CAPTCHA verification failed: ${errorCodes?.join(', ')}`);
        throw new BadRequestException('CAPTCHA invalide');
      }

      // Check action matches (v3)
      if (returnedAction && returnedAction !== action) {
        this.logger.warn(
          `CAPTCHA action mismatch: expected=${action}, got=${returnedAction}`,
        );
        throw new BadRequestException('CAPTCHA invalide (action mismatch)');
      }

      // Check score (v3 only)
      if (score !== undefined && score < this.minScore) {
        this.logger.warn(`CAPTCHA score too low: ${score} < ${this.minScore}`);
        throw new BadRequestException(
          'Vérification de sécurité échouée. Veuillez réessayer.',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('CAPTCHA verification error:', error.message);
      throw new BadRequestException('Erreur lors de la vérification CAPTCHA');
    }
  }

  /**
   * Verify CAPTCHA for login action
   */
  async verifyLoginCaptcha(token: string, ip?: string): Promise<boolean> {
    return this.verifyCaptcha(token, 'login', ip);
  }

  /**
   * Verify CAPTCHA for register action
   */
  async verifyRegisterCaptcha(token: string, ip?: string): Promise<boolean> {
    return this.verifyCaptcha(token, 'register', ip);
  }

  /**
   * Verify CAPTCHA for forgot password action
   */
  async verifyForgotPasswordCaptcha(token: string, ip?: string): Promise<boolean> {
    return this.verifyCaptcha(token, 'forgot_password', ip);
  }
}
