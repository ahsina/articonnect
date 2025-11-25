import { Test, TestingModule } from '@nestjs/testing';
import { EmailCronService } from './email-cron.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { UserRole, MissionStatus } from '@prisma/client';

describe('EmailCronService', () => {
  let service: EmailCronService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
    mission: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
      findUnique: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEmailService = {
    sendWeeklyClientSummaryEmail: jest.fn(),
    sendWeeklyArtisanSummaryEmail: jest.fn(),
    sendMissionCreatedEmail: jest.fn(),
    sendMissionAcceptedEmail: jest.fn(),
    sendMissionCompletedEmail: jest.fn(),
    sendPaymentReceivedEmail: jest.fn(),
  };

  const mockClient = {
    id: 'client-123',
    email: 'client@example.com',
    firstName: 'Jean',
    lastName: 'Client',
    emailVerified: true,
    role: UserRole.CLIENT,
  };

  const mockArtisan = {
    id: 'artisan-123',
    email: 'artisan@example.com',
    firstName: 'Pierre',
    lastName: 'Artisan',
    emailVerified: true,
    role: UserRole.ARTISAN,
    artisanProfile: {
      companyName: 'Pierre Plomberie',
      rating: 4.5,
    },
  };

  const mockMission = {
    id: 'mission-123',
    title: 'Réparation plomberie',
    category: 'plumbing',
    clientBudget: 150,
    agreedPrice: 200,
    scheduledFor: new Date('2025-02-01T10:00:00Z'),
    client: mockClient,
    artisan: mockArtisan,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailCronService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<EmailCronService>(EmailCronService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWeeklyClientSummaries', () => {
    it('should send weekly summaries to all verified clients', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockClient]);
      mockPrismaService.mission.count.mockResolvedValue(5);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      await service.sendWeeklyClientSummaries();

      expect(mockEmailService.sendWeeklyClientSummaryEmail).toHaveBeenCalledWith(
        mockClient.email,
        mockClient.firstName,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Array),
      );
    });

    it('should include upcoming missions in summary', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockClient]);
      mockPrismaService.mission.count.mockResolvedValue(5);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      await service.sendWeeklyClientSummaries();

      const call = mockEmailService.sendWeeklyClientSummaryEmail.mock.calls[0];
      const upcomingMissions = call[5];

      expect(upcomingMissions).toHaveLength(1);
      expect(upcomingMissions[0]).toHaveProperty('title');
      expect(upcomingMissions[0]).toHaveProperty('date');
      expect(upcomingMissions[0]).toHaveProperty('artisanName');
    });

    it('should handle client email failures gracefully', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        mockClient,
        { ...mockClient, id: 'client-2', email: 'client2@example.com' },
      ]);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      mockEmailService.sendWeeklyClientSummaryEmail
        .mockRejectedValueOnce(new Error('Email failed'))
        .mockResolvedValueOnce(undefined);

      await expect(service.sendWeeklyClientSummaries()).resolves.not.toThrow();

      // Second client should still receive email
      expect(mockEmailService.sendWeeklyClientSummaryEmail).toHaveBeenCalledTimes(2);
    });

    it('should handle null payment amounts', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockClient]);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.sendWeeklyClientSummaries();

      expect(mockEmailService.sendWeeklyClientSummaryEmail).toHaveBeenCalledWith(
        mockClient.email,
        mockClient.firstName,
        0,
        0,
        0, // totalSpent should be 0
        [],
      );
    });
  });

  describe('sendWeeklyArtisanSummaries', () => {
    it('should send weekly summaries to all verified artisans', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockArtisan]);
      mockPrismaService.mission.count.mockResolvedValue(10);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 1000 },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 4.5 },
        _count: { id: 20 },
      });
      mockPrismaService.review.count.mockResolvedValue(3);

      await service.sendWeeklyArtisanSummaries();

      expect(mockEmailService.sendWeeklyArtisanSummaryEmail).toHaveBeenCalledWith(
        mockArtisan.email,
        'Pierre Plomberie', // company name
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should use full name when company name not available', async () => {
      const artisanNoCompany = {
        ...mockArtisan,
        artisanProfile: { companyName: null, rating: 4.5 },
      };
      mockPrismaService.user.findMany.mockResolvedValue([artisanNoCompany]);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: null },
        _count: { id: 0 },
      });
      mockPrismaService.review.count.mockResolvedValue(0);

      await service.sendWeeklyArtisanSummaries();

      expect(mockEmailService.sendWeeklyArtisanSummaryEmail).toHaveBeenCalledWith(
        mockArtisan.email,
        'Pierre Artisan', // full name
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should handle artisan email failures gracefully', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockArtisan]);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: null },
        _count: { id: 0 },
      });
      mockPrismaService.review.count.mockResolvedValue(0);

      mockEmailService.sendWeeklyArtisanSummaryEmail.mockRejectedValue(
        new Error('Email failed'),
      );

      await expect(service.sendWeeklyArtisanSummaries()).resolves.not.toThrow();
    });
  });

  describe('sendMissionCreatedNotificationEmails', () => {
    it('should send mission created email to client', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await service.sendMissionCreatedNotificationEmails('mission-123');

      expect(mockEmailService.sendMissionCreatedEmail).toHaveBeenCalledWith(
        mockClient.email,
        'Jean Client',
        'Réparation plomberie',
        'mission-123',
        150, // clientBudget
        'plumbing',
      );
    });

    it('should use agreedPrice when clientBudget not available', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        clientBudget: null,
      });

      await service.sendMissionCreatedNotificationEmails('mission-123');

      expect(mockEmailService.sendMissionCreatedEmail).toHaveBeenCalledWith(
        mockClient.email,
        'Jean Client',
        'Réparation plomberie',
        'mission-123',
        200, // agreedPrice
        'plumbing',
      );
    });

    it('should handle mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMissionCreatedNotificationEmails('nonexistent'),
      ).resolves.not.toThrow();

      expect(mockEmailService.sendMissionCreatedEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendMissionAcceptedNotificationEmail', () => {
    it('should send mission accepted email to client', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await service.sendMissionAcceptedNotificationEmail('mission-123');

      expect(mockEmailService.sendMissionAcceptedEmail).toHaveBeenCalledWith(
        mockClient.email,
        'Jean Client',
        'Pierre Plomberie',
        'Réparation plomberie',
        'mission-123',
        expect.any(String),
      );
    });

    it('should format scheduled date correctly', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await service.sendMissionAcceptedNotificationEmail('mission-123');

      const call = mockEmailService.sendMissionAcceptedEmail.mock.calls[0];
      const scheduledDate = call[5];

      // Should be formatted in French
      expect(scheduledDate).not.toBe('À planifier');
    });

    it('should show "À planifier" when no scheduled date', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        scheduledFor: null,
      });

      await service.sendMissionAcceptedNotificationEmail('mission-123');

      expect(mockEmailService.sendMissionAcceptedEmail).toHaveBeenCalledWith(
        mockClient.email,
        'Jean Client',
        'Pierre Plomberie',
        'Réparation plomberie',
        'mission-123',
        'À planifier',
      );
    });

    it('should handle mission without artisan', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        artisan: null,
      });

      await expect(
        service.sendMissionAcceptedNotificationEmail('mission-123'),
      ).resolves.not.toThrow();

      expect(mockEmailService.sendMissionAcceptedEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendMissionCompletedNotificationEmail', () => {
    it('should send mission completed email to client', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await service.sendMissionCompletedNotificationEmail('mission-123');

      expect(mockEmailService.sendMissionCompletedEmail).toHaveBeenCalledWith(
        mockClient.email,
        'Jean Client',
        'Pierre Plomberie',
        'Réparation plomberie',
        'mission-123',
      );
    });

    it('should handle mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMissionCompletedNotificationEmail('nonexistent'),
      ).resolves.not.toThrow();

      expect(mockEmailService.sendMissionCompletedEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendPaymentReceivedNotificationEmail', () => {
    it('should send payment received email to artisan', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-123',
        amount: 200,
        mission: mockMission,
      });

      await service.sendPaymentReceivedNotificationEmail('payment-123');

      expect(mockEmailService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        mockArtisan.email,
        'Pierre Plomberie',
        200,
        'Réparation plomberie',
        'mission-123',
      );
    });

    it('should handle payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.sendPaymentReceivedNotificationEmail('nonexistent'),
      ).resolves.not.toThrow();

      expect(mockEmailService.sendPaymentReceivedEmail).not.toHaveBeenCalled();
    });

    it('should handle payment without artisan', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-123',
        amount: 200,
        mission: {
          ...mockMission,
          artisan: null,
        },
      });

      await expect(
        service.sendPaymentReceivedNotificationEmail('payment-123'),
      ).resolves.not.toThrow();

      expect(mockEmailService.sendPaymentReceivedEmail).not.toHaveBeenCalled();
    });
  });
});
