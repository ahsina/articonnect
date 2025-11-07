import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { getEmailConfig } from '../email.config';
import {
  getResetPasswordTemplate,
  getWelcomeEmailTemplate,
  getEmailVerificationTemplate,
  getMissionNotificationTemplate,
} from '../templates/email.templates';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly config = getEmailConfig();

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email is configured
    if (!this.config.auth.user || !this.config.auth.pass) {
      this.logger.warn(
        'Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.',
      );
      // Use test account for development
      this.createTestAccount();
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
    });

    this.logger.log('Email service initialized with production SMTP');
  }

  private async createTestAccount() {
    // Generate test SMTP service account from ethereal.email
    // Only works in development
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.logger.log(
        `Email service initialized with test account: ${testAccount.user}`,
      );
    } catch (error) {
      this.logger.error('Failed to create test email account', error);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to}: ${info.messageId}`);

      // Preview URL for development (only for Ethereal)
      if (process.env.NODE_ENV !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          this.logger.log(`Preview URL: ${previewUrl}`);
        }
      }

      return info;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(to: string, resetToken: string, userName: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const html = getResetPasswordTemplate(userName, resetUrl);

    return this.sendEmail(to, 'Réinitialisation de votre mot de passe', html);
  }

  async sendWelcomeEmail(to: string, userName: string) {
    const html = getWelcomeEmailTemplate(userName);

    return this.sendEmail(to, 'Bienvenue sur ArtiConnect !', html);
  }

  async sendEmailVerification(to: string, verificationToken: string, userName: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;

    const html = getEmailVerificationTemplate(userName, verificationUrl);

    return this.sendEmail(to, 'Vérifiez votre adresse email', html);
  }

  async sendMissionNotification(
    to: string,
    userName: string,
    missionTitle: string,
    missionUrl: string,
  ) {
    const html = getMissionNotificationTemplate(userName, missionTitle, missionUrl);

    return this.sendEmail(to, `Nouvelle mission : ${missionTitle}`, html);
  }
}
