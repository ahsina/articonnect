import { Test, TestingModule } from '@nestjs/testing';
import { GdprService } from './gdpr.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GdprService', () => {
  let service: GdprService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userConsent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed-password',
    twoFactorSecret: 'secret',
    status: 'ACTIVE',
    role: 'CLIENT',
    clientProfile: {
      id: 'client-profile-123',
      addresses: [
        { id: 'addr-1', street: '123 Main St', city: 'Luxembourg' },
      ],
      savedArtisans: [
        {
          artisan: {
            firstName: 'Pierre',
            lastName: 'Artisan',
            email: 'pierre@example.com',
          },
        },
      ],
    },
    artisanProfile: null,
    givenReviews: [{ id: 'review-1', rating: 5, comment: 'Great!' }],
    receivedReviews: [],
    clientMissions: [{ id: 'mission-1', title: 'Fix sink' }],
    artisanMissions: [],
    notifications: [{ id: 'notif-1', message: 'Welcome!' }],
    refreshTokens: [{ id: 'token-1', token: 'refresh-token' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConsent = {
    id: 'consent-123',
    userId: 'user-123',
    marketing: false,
    analytics: true,
    geolocation: false,
    ipAddress: '192.168.1.1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('should export user data without sensitive fields', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user-123');

      expect(result.personalData).toBeDefined();
      expect(result.personalData.password).toBeUndefined();
      expect(result.personalData.twoFactorSecret).toBeUndefined();
      expect(result.personalData.refreshTokens).toBeUndefined();
      expect(result.personalData.email).toBe('user@example.com');
    });

    it('should include export metadata', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user-123');

      expect(result.exportDate).toBeDefined();
      expect(result.metadata.dataCategories).toContain('Account Information');
      expect(result.metadata.gdprCompliant).toBe(true);
    });

    it('should include related data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user-123');

      expect(result.personalData.clientProfile).toBeDefined();
      expect(result.personalData.givenReviews).toHaveLength(1);
      expect(result.personalData.clientMissions).toHaveLength(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('requestDeletion', () => {
    it('should mark user for deletion', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      const result = await service.requestDeletion('user-123');

      expect(result.message).toContain('supprimé dans 30 jours');
      expect(result.deletionDate).toBeDefined();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { status: 'SUSPENDED' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.requestDeletion('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return deletion date 30 days in future', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.requestDeletion('user-123');

      const deletionDate = new Date(result.deletionDate);
      const daysDiff = Math.round(
        (deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(30);
    });
  });

  describe('cancelDeletionRequest', () => {
    it('should reactivate user account', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        status: 'ACTIVE',
      });

      const result = await service.cancelDeletionRequest('user-123');

      expect(result.message).toBe('Demande de suppression annulée');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { status: 'ACTIVE' },
      });
    });
  });

  describe('getUserConsents', () => {
    it('should return existing consents', async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue(mockConsent);

      const result = await service.getUserConsents('user-123');

      expect(result).toEqual(mockConsent);
    });

    it('should create default consents if not found', async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue(null);
      mockPrismaService.userConsent.create.mockResolvedValue({
        ...mockConsent,
        marketing: false,
        analytics: false,
        geolocation: false,
      });

      const result = await service.getUserConsents('user-123');

      expect(mockPrismaService.userConsent.create).toHaveBeenCalledWith({
        data: {
          user: { connect: { id: 'user-123' } },
          marketing: false,
          analytics: false,
          geolocation: false,
          ipAddress: 'unknown',
        },
      });
    });
  });

  describe('updateConsents', () => {
    it('should update user consents', async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue(mockConsent);
      mockPrismaService.userConsent.update.mockResolvedValue({
        ...mockConsent,
        marketing: true,
        analytics: true,
      });

      const result = await service.updateConsents('user-123', {
        marketing: true,
        analytics: true,
      });

      expect(result.marketing).toBe(true);
      expect(result.analytics).toBe(true);
      expect(mockPrismaService.userConsent.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { marketing: true, analytics: true },
      });
    });

    it('should ensure consents exist before updating', async () => {
      mockPrismaService.userConsent.findUnique
        .mockResolvedValueOnce(null) // First call in getUserConsents
        .mockResolvedValueOnce(mockConsent); // Second call after creation
      mockPrismaService.userConsent.create.mockResolvedValue(mockConsent);
      mockPrismaService.userConsent.update.mockResolvedValue({
        ...mockConsent,
        geolocation: true,
      });

      await service.updateConsents('user-123', { geolocation: true });

      expect(mockPrismaService.userConsent.create).toHaveBeenCalled();
      expect(mockPrismaService.userConsent.update).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue(mockConsent);
      mockPrismaService.userConsent.update.mockResolvedValue({
        ...mockConsent,
        marketing: true,
      });

      const result = await service.updateConsents('user-123', {
        marketing: true,
      });

      expect(mockPrismaService.userConsent.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { marketing: true },
      });
    });
  });
});
