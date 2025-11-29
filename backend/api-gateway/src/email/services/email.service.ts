import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { getEmailConfig } from '../email.config';
import {
  getResetPasswordTemplate,
  getWelcomeEmailTemplate,
  getEmailVerificationTemplate,
  getMissionNotificationTemplate,
} from '../templates/email.templates';
import { EmailTemplateService } from '../../notification/services/email-template.service';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly config = getEmailConfig();

  constructor(
    @Inject(forwardRef(() => EmailTemplateService))
    private emailTemplateService: EmailTemplateService,
  ) {
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
      this.transporter = nodemailer.createTransport({
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

  async sendWelcomeClientEmail(firstName: string, email: string) {
    const template = this.emailTemplateService.welcomeClient(firstName, email);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendWelcomeArtisanEmail(firstName: string, companyName: string, email: string) {
    const template = this.emailTemplateService.welcomeArtisan(firstName, companyName, email);
    return this.sendEmail(email, template.subject, template.html);
  }

  async sendMissionCreatedEmail(
    clientEmail: string,
    clientName: string,
    missionTitle: string,
    missionId: string,
    budget: number,
    category: string,
  ) {
    const template = this.emailTemplateService.missionCreated(clientName, missionTitle, missionId, budget, category);
    return this.sendEmail(clientEmail, template.subject, template.html);
  }

  async sendNewMissionAvailableEmail(
    artisanEmail: string,
    artisanName: string,
    missionTitle: string,
    missionId: string,
    budget: number,
    distance: number,
    category: string,
  ) {
    const template = this.emailTemplateService.newMissionAvailable(
      artisanName,
      missionTitle,
      missionId,
      budget,
      distance,
      category,
    );
    return this.sendEmail(artisanEmail, template.subject, template.html);
  }

  async sendMissionAcceptedEmail(
    clientEmail: string,
    clientName: string,
    artisanName: string,
    missionTitle: string,
    missionId: string,
    scheduledDate: string,
  ) {
    const template = this.emailTemplateService.missionAccepted(
      clientName,
      artisanName,
      missionTitle,
      missionId,
      scheduledDate,
    );
    return this.sendEmail(clientEmail, template.subject, template.html);
  }

  async sendMissionCompletedEmail(
    clientEmail: string,
    clientName: string,
    artisanName: string,
    missionTitle: string,
    missionId: string,
  ) {
    const template = this.emailTemplateService.missionCompleted(clientName, artisanName, missionTitle, missionId);
    return this.sendEmail(clientEmail, template.subject, template.html);
  }

  async sendPaymentReceivedEmail(
    artisanEmail: string,
    artisanName: string,
    amount: number,
    missionTitle: string,
    missionId: string,
  ) {
    const template = this.emailTemplateService.paymentReceived(artisanName, amount, missionTitle, missionId);
    return this.sendEmail(artisanEmail, template.subject, template.html);
  }

  async sendNegotiationReceivedEmail(
    userEmail: string,
    userName: string,
    senderName: string,
    missionTitle: string,
    proposedPrice: number,
    currentPrice: number,
    missionId: string,
  ) {
    const template = this.emailTemplateService.negotiationReceived(
      userName,
      senderName,
      missionTitle,
      proposedPrice,
      currentPrice,
      missionId,
    );
    return this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendNoShowAlertEmail(
    artisanEmail: string,
    artisanName: string,
    clientName: string,
    missionTitle: string,
    missionId: string,
    feeAmount: number,
  ) {
    const template = this.emailTemplateService.noShowAlert(
      artisanName,
      clientName,
      missionTitle,
      missionId,
      feeAmount,
    );
    return this.sendEmail(artisanEmail, template.subject, template.html);
  }

  async sendWeeklyClientSummaryEmail(
    clientEmail: string,
    clientName: string,
    activeMissions: number,
    completedThisWeek: number,
    totalSpent: number,
    upcomingMissions: Array<{ title: string; date: string; artisanName: string }>,
  ) {
    const template = this.emailTemplateService.weeklyClientSummary(
      clientName,
      activeMissions,
      completedThisWeek,
      totalSpent,
      upcomingMissions,
    );
    return this.sendEmail(clientEmail, template.subject, template.html);
  }

  async sendWeeklyArtisanSummaryEmail(
    artisanEmail: string,
    artisanName: string,
    activeMissions: number,
    completedThisWeek: number,
    totalEarned: number,
    averageRating: number,
    newReviews: number,
  ) {
    const template = this.emailTemplateService.weeklyArtisanSummary(
      artisanName,
      activeMissions,
      completedThisWeek,
      totalEarned,
      averageRating,
      newReviews,
    );
    return this.sendEmail(artisanEmail, template.subject, template.html);
  }

  async sendDisputeCreatedEmail(
    userEmail: string,
    userName: string,
    missionTitle: string,
    disputeId: string,
    reason: string,
  ) {
    const template = this.emailTemplateService.disputeCreated(userName, missionTitle, disputeId, reason);
    return this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendPasswordResetEmailRich(userName: string, email: string, resetToken: string) {
    const template = this.emailTemplateService.passwordReset(userName, resetToken);
    return this.sendEmail(email, template.subject, template.html);
  }

  // Employee invitation emails
  async sendEmployeeInvitationEmail(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    inviterName: string,
    role: string,
    invitationToken: string,
  ) {
    const template = this.emailTemplateService.employeeInvitation(
      employeeName,
      companyName,
      inviterName,
      role,
      invitationToken,
    );
    return this.sendEmail(employeeEmail, template.subject, template.html);
  }

  // Subcontractor invitation emails
  async sendSubcontractorInvitationEmail(
    subcontractorEmail: string,
    subcontractorName: string,
    artisanName: string,
    artisanCompany: string,
    invitationToken: string,
    specialties: string[],
  ) {
    const template = this.emailTemplateService.subcontractorInvitation(
      subcontractorName,
      artisanName,
      artisanCompany,
      invitationToken,
      specialties,
    );
    return this.sendEmail(subcontractorEmail, template.subject, template.html);
  }

  // Company employee joined notification
  async sendCompanyEmployeeJoinedEmail(
    ownerEmail: string,
    ownerName: string,
    companyName: string,
    employeeName: string,
    employeeRole: string,
  ) {
    const template = this.emailTemplateService.companyEmployeeJoined(
      ownerName,
      companyName,
      employeeName,
      employeeRole,
    );
    return this.sendEmail(ownerEmail, template.subject, template.html);
  }

  // Company mission assigned notification
  async sendCompanyMissionAssignedEmail(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    missionTitle: string,
    missionId: string,
    scheduledDate: string,
    clientName: string,
    address: string,
  ) {
    const template = this.emailTemplateService.companyMissionAssigned(
      employeeName,
      companyName,
      missionTitle,
      missionId,
      scheduledDate,
      clientName,
      address,
    );
    return this.sendEmail(employeeEmail, template.subject, template.html);
  }

  // Company payout processed notification
  async sendCompanyPayoutProcessedEmail(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    amount: number,
    period: string,
    missionsCount: number,
  ) {
    const template = this.emailTemplateService.companyPayoutProcessed(
      employeeName,
      companyName,
      amount,
      period,
      missionsCount,
    );
    return this.sendEmail(employeeEmail, template.subject, template.html);
  }

  // Company shift scheduled notification
  async sendCompanyShiftScheduledEmail(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    shiftDate: string,
    startTime: string,
    endTime: string,
    shiftType: string,
  ) {
    const template = this.emailTemplateService.companyShiftScheduled(
      employeeName,
      companyName,
      shiftDate,
      startTime,
      endTime,
      shiftType,
    );
    return this.sendEmail(employeeEmail, template.subject, template.html);
  }

  // Company performance review notification
  async sendCompanyPerformanceReviewEmail(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    reviewerName: string,
    overallRating: number,
    reviewPeriod: string,
  ) {
    const template = this.emailTemplateService.companyPerformanceReview(
      employeeName,
      companyName,
      reviewerName,
      overallRating,
      reviewPeriod,
    );
    return this.sendEmail(employeeEmail, template.subject, template.html);
  }
}
