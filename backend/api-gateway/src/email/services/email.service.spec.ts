import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EmailTemplateService } from '../../notification/services/email-template.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

// Mock email config to provide credentials so the synchronous transporter path is used
jest.mock('../email.config', () => ({
  getEmailConfig: () => ({
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@test.com',
      pass: 'test-password',
    },
    from: {
      name: 'ArtiConnect',
      email: 'noreply@articonnect.com',
    },
  }),
}));

describe('EmailService', () => {
  let service: EmailService;
  let emailTemplateService: EmailTemplateService;
  let mockTransporter: any;

  const mockEmailTemplateService = {
    welcomeClient: jest.fn(),
    welcomeArtisan: jest.fn(),
    missionCreated: jest.fn(),
    newMissionAvailable: jest.fn(),
    missionAccepted: jest.fn(),
    missionCompleted: jest.fn(),
    paymentReceived: jest.fn(),
    negotiationReceived: jest.fn(),
    noShowAlert: jest.fn(),
    weeklyClientSummary: jest.fn(),
    weeklyArtisanSummary: jest.fn(),
    disputeCreated: jest.fn(),
    passwordReset: jest.fn(),
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
      }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue('https://ethereal.email/preview');
    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'test-password',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EmailTemplateService, useValue: mockEmailTemplateService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailTemplateService = module.get<EmailTemplateService>(EmailTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const result = await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<p>Test content</p>',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.messageId).toBe('test-message-id');
    });

    it('should throw error when email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendEmail('test@example.com', 'Subject', '<p>Body</p>'),
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('sendResetPasswordEmail', () => {
    it('should send password reset email with correct template', async () => {
      const to = 'user@example.com';
      const resetToken = 'reset-token-123';
      const userName = 'John';

      await service.sendResetPasswordEmail(to, resetToken, userName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Réinitialisation de votre mot de passe',
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct template', async () => {
      const to = 'newuser@example.com';
      const userName = 'Marie';

      await service.sendWelcomeEmail(to, userName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Bienvenue sur ArtiConnect !',
        }),
      );
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email with token link', async () => {
      const to = 'verify@example.com';
      const verificationToken = 'verify-token-456';
      const userName = 'Pierre';

      await service.sendEmailVerification(to, verificationToken, userName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Vérifiez votre adresse email',
        }),
      );
    });
  });

  describe('sendMissionNotification', () => {
    it('should send mission notification email', async () => {
      const to = 'artisan@example.com';
      const userName = 'Jacques';
      const missionTitle = 'Plumbing Repair';
      const missionUrl = 'http://example.com/missions/123';

      await service.sendMissionNotification(to, userName, missionTitle, missionUrl);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: `Nouvelle mission : ${missionTitle}`,
        }),
      );
    });
  });

  describe('sendWelcomeClientEmail', () => {
    it('should send welcome email to new client', async () => {
      mockEmailTemplateService.welcomeClient.mockReturnValue({
        subject: 'Welcome to ArtiConnect',
        html: '<p>Welcome client!</p>',
      });

      const firstName = 'Alice';
      const email = 'alice@example.com';

      await service.sendWelcomeClientEmail(firstName, email);

      expect(emailTemplateService.welcomeClient).toHaveBeenCalledWith(firstName, email);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Welcome to ArtiConnect',
        }),
      );
    });
  });

  describe('sendWelcomeArtisanEmail', () => {
    it('should send welcome email to new artisan', async () => {
      mockEmailTemplateService.welcomeArtisan.mockReturnValue({
        subject: 'Welcome Artisan',
        html: '<p>Welcome artisan!</p>',
      });

      const firstName = 'Bob';
      const companyName = 'Bob Plumbing';
      const email = 'bob@example.com';

      await service.sendWelcomeArtisanEmail(firstName, companyName, email);

      expect(emailTemplateService.welcomeArtisan).toHaveBeenCalledWith(firstName, companyName, email);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('sendMissionCreatedEmail', () => {
    it('should send mission created confirmation to client', async () => {
      mockEmailTemplateService.missionCreated.mockReturnValue({
        subject: 'Mission Created',
        html: '<p>Your mission was created</p>',
      });

      await service.sendMissionCreatedEmail(
        'client@example.com',
        'Client Name',
        'Fix leaky faucet',
        'mission-123',
        150,
        'Plumbing',
      );

      expect(emailTemplateService.missionCreated).toHaveBeenCalledWith(
        'Client Name',
        'Fix leaky faucet',
        'mission-123',
        150,
        'Plumbing',
      );
    });
  });

  describe('sendNewMissionAvailableEmail', () => {
    it('should send new mission alert to artisan', async () => {
      mockEmailTemplateService.newMissionAvailable.mockReturnValue({
        subject: 'New Mission Available',
        html: '<p>A new mission is available</p>',
      });

      await service.sendNewMissionAvailableEmail(
        'artisan@example.com',
        'Artisan Name',
        'Bathroom renovation',
        'mission-456',
        500,
        5.2,
        'Renovation',
      );

      expect(emailTemplateService.newMissionAvailable).toHaveBeenCalledWith(
        'Artisan Name',
        'Bathroom renovation',
        'mission-456',
        500,
        5.2,
        'Renovation',
      );
    });
  });

  describe('sendMissionAcceptedEmail', () => {
    it('should send mission accepted notification to client', async () => {
      mockEmailTemplateService.missionAccepted.mockReturnValue({
        subject: 'Mission Accepted',
        html: '<p>Your mission was accepted</p>',
      });

      await service.sendMissionAcceptedEmail(
        'client@example.com',
        'Client Name',
        'Artisan Company',
        'Kitchen repair',
        'mission-789',
        '2024-01-15',
      );

      expect(emailTemplateService.missionAccepted).toHaveBeenCalledWith(
        'Client Name',
        'Artisan Company',
        'Kitchen repair',
        'mission-789',
        '2024-01-15',
      );
    });
  });

  describe('sendMissionCompletedEmail', () => {
    it('should send mission completed notification', async () => {
      mockEmailTemplateService.missionCompleted.mockReturnValue({
        subject: 'Mission Completed',
        html: '<p>Mission completed successfully</p>',
      });

      await service.sendMissionCompletedEmail(
        'client@example.com',
        'Client Name',
        'Artisan Name',
        'Electrical work',
        'mission-101',
      );

      expect(emailTemplateService.missionCompleted).toHaveBeenCalledWith(
        'Client Name',
        'Artisan Name',
        'Electrical work',
        'mission-101',
      );
    });
  });

  describe('sendPaymentReceivedEmail', () => {
    it('should send payment confirmation to artisan', async () => {
      mockEmailTemplateService.paymentReceived.mockReturnValue({
        subject: 'Payment Received',
        html: '<p>Payment received</p>',
      });

      await service.sendPaymentReceivedEmail(
        'artisan@example.com',
        'Artisan Name',
        250,
        'Plumbing repair',
        'mission-202',
      );

      expect(emailTemplateService.paymentReceived).toHaveBeenCalledWith(
        'Artisan Name',
        250,
        'Plumbing repair',
        'mission-202',
      );
    });
  });

  describe('sendNegotiationReceivedEmail', () => {
    it('should send negotiation notification', async () => {
      mockEmailTemplateService.negotiationReceived.mockReturnValue({
        subject: 'New Negotiation',
        html: '<p>New price negotiation</p>',
      });

      await service.sendNegotiationReceivedEmail(
        'user@example.com',
        'User Name',
        'Sender Name',
        'Home repair',
        180,
        200,
        'mission-303',
      );

      expect(emailTemplateService.negotiationReceived).toHaveBeenCalledWith(
        'User Name',
        'Sender Name',
        'Home repair',
        180,
        200,
        'mission-303',
      );
    });
  });

  describe('sendNoShowAlertEmail', () => {
    it('should send no-show alert to artisan', async () => {
      mockEmailTemplateService.noShowAlert.mockReturnValue({
        subject: 'No Show Alert',
        html: '<p>No-show reported</p>',
      });

      await service.sendNoShowAlertEmail(
        'artisan@example.com',
        'Artisan Name',
        'Client Name',
        'Scheduled repair',
        'mission-404',
        50,
      );

      expect(emailTemplateService.noShowAlert).toHaveBeenCalledWith(
        'Artisan Name',
        'Client Name',
        'Scheduled repair',
        'mission-404',
        50,
      );
    });
  });

  describe('sendWeeklyClientSummaryEmail', () => {
    it('should send weekly summary to client', async () => {
      mockEmailTemplateService.weeklyClientSummary.mockReturnValue({
        subject: 'Weekly Summary',
        html: '<p>Your weekly summary</p>',
      });

      const upcomingMissions = [
        { title: 'Repair', date: '2024-01-20', artisanName: 'John' },
      ];

      await service.sendWeeklyClientSummaryEmail(
        'client@example.com',
        'Client Name',
        3,
        2,
        500,
        upcomingMissions,
      );

      expect(emailTemplateService.weeklyClientSummary).toHaveBeenCalledWith(
        'Client Name',
        3,
        2,
        500,
        upcomingMissions,
      );
    });
  });

  describe('sendWeeklyArtisanSummaryEmail', () => {
    it('should send weekly summary to artisan', async () => {
      mockEmailTemplateService.weeklyArtisanSummary.mockReturnValue({
        subject: 'Weekly Artisan Summary',
        html: '<p>Your weekly artisan summary</p>',
      });

      await service.sendWeeklyArtisanSummaryEmail(
        'artisan@example.com',
        'Artisan Name',
        5,
        4,
        1200,
        4.8,
        3,
      );

      expect(emailTemplateService.weeklyArtisanSummary).toHaveBeenCalledWith(
        'Artisan Name',
        5,
        4,
        1200,
        4.8,
        3,
      );
    });
  });

  describe('sendDisputeCreatedEmail', () => {
    it('should send dispute notification', async () => {
      mockEmailTemplateService.disputeCreated.mockReturnValue({
        subject: 'Dispute Created',
        html: '<p>A dispute has been created</p>',
      });

      await service.sendDisputeCreatedEmail(
        'user@example.com',
        'User Name',
        'Mission Title',
        'dispute-123',
        'Service not completed',
      );

      expect(emailTemplateService.disputeCreated).toHaveBeenCalledWith(
        'User Name',
        'Mission Title',
        'dispute-123',
        'Service not completed',
      );
    });
  });

  describe('sendPasswordResetEmailRich', () => {
    it('should send rich password reset email', async () => {
      mockEmailTemplateService.passwordReset.mockReturnValue({
        subject: 'Password Reset',
        html: '<p>Reset your password</p>',
      });

      await service.sendPasswordResetEmailRich('User Name', 'user@example.com', 'reset-token');

      expect(emailTemplateService.passwordReset).toHaveBeenCalledWith('User Name', 'reset-token');
    });
  });
});
