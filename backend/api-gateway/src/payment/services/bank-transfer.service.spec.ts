import { Test, TestingModule } from '@nestjs/testing';
import { BankTransferService } from './bank-transfer.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../notification/services/notification.service';
import { PlatformConfigService } from '../../config/services/platform-config.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BankTransferService', () => {
  let service: BankTransferService;
  let prismaService: PrismaService;
  let stripeService: StripeService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        BANK_TRANSFER_IBAN: 'LU12 3456 7890 1234 5678',
        BANK_TRANSFER_BIC: 'BGLLLULL',
        BANK_TRANSFER_ACCOUNT_HOLDER: 'Krafolt SAS',
        BANK_TRANSFER_BANK_NAME: 'BGL BNP Paribas',
        BANK_TRANSFER_EXPIRY_DAYS: '7',
      };
      return config[key];
    }),
  };

  const mockStripeService = {
    createTransfer: jest.fn(),
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  const mockPlatformConfigService = {
    getFeeSettings: jest.fn().mockResolvedValue({
      platformCommissionRate: 12,
      artisanPayoutPercentage: 88,
    }),
  };

  const mockMission = {
    id: 'mission-123',
    clientId: 'client-123',
    artisanId: 'artisan-123',
    title: 'Fix plumbing',
    artisan: {
      id: 'artisan-123',
      artisanProfile: {
        stripeAccountId: 'acct_123',
      },
    },
  };

  const mockTransaction = {
    id: 'txn-123',
    missionId: 'mission-123',
    amount: { toNumber: () => 250 },
    currency: 'EUR',
    commission: { toNumber: () => 30 },
    artisanAmount: { toNumber: () => 220 },
    paymentMethod: 'BANK_TRANSFER',
    status: 'PENDING',
    createdAt: new Date(),
    mission: mockMission,
  };

  beforeEach(async () => {
    // Reset mock implementation for ConfigService
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        BANK_TRANSFER_IBAN: 'LU12 3456 7890 1234 5678',
        BANK_TRANSFER_BIC: 'BGLLLULL',
        BANK_TRANSFER_ACCOUNT_HOLDER: 'Krafolt SAS',
        BANK_TRANSFER_BANK_NAME: 'BGL BNP Paribas',
        BANK_TRANSFER_EXPIRY_DAYS: '7',
      };
      return config[key];
    });

    // Reset mock implementations
    mockPlatformConfigService.getFeeSettings.mockResolvedValue({
      platformCommissionRate: 12,
      artisanPayoutPercentage: 88,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankTransferService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
      ],
    }).compile();

    service = module.get<BankTransferService>(BankTransferService);
    prismaService = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeService>(StripeService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBankTransferPayment', () => {
    it('should create bank transfer payment instructions', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.createBankTransferPayment({
        missionId: 'mission-123',
        clientId: 'client-123',
        amount: 250,
      });

      expect(result.accountHolder).toBe('Krafolt SAS');
      expect(result.iban).toBe('LU12 3456 7890 1234 5678');
      expect(result.bic).toBe('BGLLLULL');
      expect(result.amount).toBe(250);
      expect(result.reference).toContain('ARTIC-');
    });

    it('should throw BadRequestException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.createBankTransferPayment({
          missionId: 'nonexistent',
          clientId: 'client-123',
          amount: 250,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if client does not own mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        clientId: 'other-client',
      });

      await expect(
        service.createBankTransferPayment({
          missionId: 'mission-123',
          clientId: 'client-123',
          amount: 250,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set expiry date 7 days from now', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.createBankTransferPayment({
        missionId: 'mission-123',
        clientId: 'client-123',
        amount: 250,
      });

      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);
      const daysDiff = Math.round(
        (result.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(7);
    });
  });

  describe('uploadProofOfPayment', () => {
    it('should accept proof of payment upload', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        mission: { clientId: 'client-123' },
      });

      await expect(
        service.uploadProofOfPayment({
          transactionId: 'txn-123',
          proofImageUrl: 'https://s3.example.com/proof.jpg',
          userId: 'client-123',
        }),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadProofOfPayment({
          transactionId: 'nonexistent',
          proofImageUrl: 'https://s3.example.com/proof.jpg',
          userId: 'client-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user not authorized', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        mission: { clientId: 'other-client' },
      });

      await expect(
        service.uploadProofOfPayment({
          transactionId: 'txn-123',
          proofImageUrl: 'https://s3.example.com/proof.jpg',
          userId: 'client-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transaction already processed', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        status: 'COMPLETED',
        mission: { clientId: 'client-123' },
      });

      await expect(
        service.uploadProofOfPayment({
          transactionId: 'txn-123',
          proofImageUrl: 'https://s3.example.com/proof.jpg',
          userId: 'client-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyBankTransfer', () => {
    const transactionWithArtisan = {
      ...mockTransaction,
      mission: {
        ...mockMission,
        artisan: {
          id: 'artisan-123',
          artisanProfile: {
            stripeAccountId: 'acct_123',
          },
        },
      },
    };

    it('should verify and complete bank transfer', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(transactionWithArtisan);
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: 'COMPLETED',
      });
      mockStripeService.createTransfer.mockResolvedValue({ id: 'transfer-123' });
      mockNotificationService.createNotification.mockResolvedValue({});

      await service.verifyBankTransfer({
        transactionId: 'txn-123',
        adminId: 'admin-123',
        verified: true,
        notes: 'Payment received in bank account',
      });

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      });
      expect(mockStripeService.createTransfer).toHaveBeenCalled();
    });

    it('should reject payment and notify client', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...transactionWithArtisan,
        mission: { ...mockMission, clientId: 'client-123' },
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: 'FAILED',
      });
      mockNotificationService.createNotification.mockResolvedValue({});

      await service.verifyBankTransfer({
        transactionId: 'txn-123',
        adminId: 'admin-123',
        verified: false,
        notes: 'Proof does not match',
      });

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-123' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyBankTransfer({
          transactionId: 'nonexistent',
          adminId: 'admin-123',
          verified: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not a bank transfer', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        paymentMethod: 'CARD',
      });

      await expect(
        service.verifyBankTransfer({
          transactionId: 'txn-123',
          adminId: 'admin-123',
          verified: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingBankTransfers', () => {
    it('should return pending bank transfers', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([mockTransaction]);

      const result = await service.getPendingBankTransfers();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            paymentMethod: 'BANK_TRANSFER',
            status: 'PENDING',
          },
        }),
      );
    });

    it('should respect pagination params', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      await service.getPendingBankTransfers({ limit: 10, offset: 5 });

      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getBankTransferStatus', () => {
    it('should return transaction status with instructions', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.getBankTransferStatus('txn-123');

      expect(result.status).toBe('PENDING');
      expect(result.instructions).toBeDefined();
      expect(result.instructions?.iban).toBe('LU12 3456 7890 1234 5678');
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.getBankTransferStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should not return instructions for completed transactions', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        status: 'COMPLETED',
      });

      const result = await service.getBankTransferStatus('txn-123');

      expect(result.instructions).toBeUndefined();
    });
  });

  describe('expirePendingBankTransfers', () => {
    it('should mark old pending transfers as expired', async () => {
      mockPrismaService.transaction.updateMany.mockResolvedValue({ count: 3 });

      await service.expirePendingBankTransfers();

      expect(mockPrismaService.transaction.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          paymentMethod: 'BANK_TRANSFER',
          status: 'PENDING',
          createdAt: expect.any(Object),
        }),
        data: {
          status: 'FAILED',
        },
      });
    });
  });

  describe('getStatistics', () => {
    it('should return bank transfer statistics', async () => {
      // Service uses Number(t.amount) so mock should return plain numbers
      mockPrismaService.transaction.findMany.mockResolvedValue([
        { ...mockTransaction, status: 'PENDING', amount: 100 },
        { ...mockTransaction, status: 'COMPLETED', amount: 200 },
        { ...mockTransaction, status: 'COMPLETED', amount: 150 },
      ]);

      const result = await service.getStatistics(30);

      expect(result.totalBankTransfers).toBe(3);
      expect(result.pendingVerification).toBe(1);
      expect(result.verified).toBe(2);
      expect(result.totalAmount).toBe(450);
      expect(result.averageAmount).toBe(150);
    });
  });

  describe('isEnabled', () => {
    it('should return true when configured', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('getBankAccountInfo', () => {
    it('should return partially masked bank info', () => {
      const result = service.getBankAccountInfo();

      expect(result.accountHolder).toBe('Krafolt SAS');
      expect(result.bankName).toBe('BGL BNP Paribas');
      expect(result.bic).toBe('BGLLLULL');
      // IBAN should be partially masked
      expect(result.iban).toContain('****');
    });
  });
});
