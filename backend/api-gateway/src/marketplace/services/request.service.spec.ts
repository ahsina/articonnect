import { Test, TestingModule } from '@nestjs/testing';
import { RequestService } from './request.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('RequestService', () => {
  let service: RequestService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
    },
    request: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRequest = {
    id: 'request-123',
    clientId: 'client-123',
    artisanId: null,
    title: 'Réparation plomberie',
    description: 'Fuite sous évier',
    category: 'plumbing',
    address: '10 Rue du Test',
    city: 'Luxembourg',
    postalCode: '1234',
    latitude: 49.6116,
    longitude: 6.1319,
    estimatedBudget: 150,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    client: {
      firstName: 'Jean',
      lastName: 'Client',
      email: 'jean@example.com',
      phone: '+352123456',
    },
    artisan: null,
  };

  const mockArtisan = {
    id: 'artisan-123',
    firstName: 'Pierre',
    lastName: 'Artisan',
    role: 'ARTISAN',
    artisanProfile: {
      companyName: 'Pierre Plomberie',
      rating: 4.5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RequestService>(RequestService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a request', async () => {
      mockPrismaService.request.create.mockResolvedValue(mockRequest);

      const result = await service.create('client-123', {
        title: 'Réparation plomberie',
        description: 'Fuite sous évier',
        category: 'plumbing',
        address: '10 Rue du Test',
        city: 'Luxembourg',
        postalCode: '1234',
      });

      expect(result).toEqual(mockRequest);
      expect(mockPrismaService.request.create).toHaveBeenCalled();
    });

    it('should create request with artisan if provided', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockArtisan);
      mockPrismaService.request.create.mockResolvedValue({
        ...mockRequest,
        artisanId: 'artisan-123',
      });

      const result = await service.create('client-123', {
        title: 'Réparation plomberie',
        description: 'Fuite sous évier',
        category: 'plumbing',
        address: '10 Rue du Test',
        city: 'Luxembourg',
        postalCode: '1234',
        artisanId: 'artisan-123',
      });

      expect(result.artisanId).toBe('artisan-123');
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.create('client-123', {
          title: 'Test',
          description: 'Test',
          category: 'plumbing',
          address: 'Test',
          city: 'Test',
          postalCode: '1234',
          artisanId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set default expiration to 30 days', async () => {
      mockPrismaService.request.create.mockResolvedValue(mockRequest);

      await service.create('client-123', {
        title: 'Test',
        description: 'Test',
        category: 'plumbing',
        address: 'Test',
        city: 'Test',
        postalCode: '1234',
      });

      expect(mockPrismaService.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all requests', async () => {
      mockPrismaService.request.findMany.mockResolvedValue([mockRequest]);

      const result = await service.findAll();

      expect(result).toEqual([mockRequest]);
    });

    it('should filter by clientId', async () => {
      mockPrismaService.request.findMany.mockResolvedValue([mockRequest]);

      await service.findAll({ clientId: 'client-123' });

      expect(mockPrismaService.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 'client-123' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.request.findMany.mockResolvedValue([mockRequest]);

      await service.findAll({ status: 'PENDING' });

      expect(mockPrismaService.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.request.findMany.mockResolvedValue([mockRequest]);

      await service.findAll({ category: 'plumbing' });

      expect(mockPrismaService.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'plumbing' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a request by id', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);

      const result = await service.findOne('request-123');

      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update request as client owner', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.request.update.mockResolvedValue({
        ...mockRequest,
        estimatedBudget: 200,
      });

      const result = await service.update('request-123', 'client-123', 'CLIENT', {
        estimatedBudget: 200,
      });

      expect(result.estimatedBudget).toBe(200);
    });

    it('should throw ForbiddenException if client not owner', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.update('request-123', 'other-client', 'CLIENT', {
          estimatedBudget: 200,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if client changes status with artisan assigned', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue({
        ...mockRequest,
        artisanId: 'artisan-123',
      });

      await expect(
        service.update('request-123', 'client-123', 'CLIENT', {
          status: 'CANCELLED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow artisan to update assigned request', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue({
        ...mockRequest,
        artisanId: 'artisan-123',
      });
      mockPrismaService.request.update.mockResolvedValue({
        ...mockRequest,
        status: 'QUOTED',
      });

      const result = await service.update('request-123', 'artisan-123', 'ARTISAN', {
        status: 'QUOTED',
      });

      expect(result.status).toBe('QUOTED');
    });

    it('should throw BadRequestException for invalid artisan status', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue({
        ...mockRequest,
        artisanId: 'artisan-123',
      });

      await expect(
        service.update('request-123', 'artisan-123', 'ARTISAN', {
          status: 'INVALID_STATUS',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'client-123', 'CLIENT', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete request as client owner', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.request.delete.mockResolvedValue(mockRequest);

      const result = await service.remove('request-123', 'client-123', 'CLIENT');

      expect(result.message).toBe('Request deleted successfully');
    });

    it('should throw ForbiddenException if client not owner', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.remove('request-123', 'other-client', 'CLIENT'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for artisan', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.remove('request-123', 'artisan-123', 'ARTISAN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'client-123', 'CLIENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignArtisan', () => {
    it('should assign artisan to request', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findFirst.mockResolvedValue(mockArtisan);
      mockPrismaService.request.update.mockResolvedValue({
        ...mockRequest,
        artisanId: 'artisan-123',
        artisan: mockArtisan,
      });

      const result = await service.assignArtisan(
        'request-123',
        'artisan-123',
        'client-123',
      );

      expect(result.artisanId).toBe('artisan-123');
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(null);

      await expect(
        service.assignArtisan('nonexistent', 'artisan-123', 'client-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.assignArtisan('request-123', 'artisan-123', 'other-client'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if artisan already assigned', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue({
        ...mockRequest,
        artisanId: 'existing-artisan',
      });

      await expect(
        service.assignArtisan('request-123', 'artisan-123', 'client-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.request.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assignArtisan('request-123', 'nonexistent', 'client-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getExpiredRequests', () => {
    it('should return expired requests', async () => {
      mockPrismaService.request.findMany.mockResolvedValue([mockRequest]);

      const result = await service.getExpiredRequests();

      expect(mockPrismaService.request.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          status: { in: ['PENDING', 'QUOTED'] },
        },
        include: expect.any(Object),
      });
    });
  });

  describe('markExpiredRequests', () => {
    it('should mark expired requests', async () => {
      const expiredRequests = [
        { ...mockRequest, id: 'exp-1' },
        { ...mockRequest, id: 'exp-2' },
      ];
      mockPrismaService.request.findMany.mockResolvedValue(expiredRequests);
      mockPrismaService.request.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markExpiredRequests();

      expect(result.count).toBe(2);
      expect(mockPrismaService.request.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['exp-1', 'exp-2'] },
        },
        data: { status: 'EXPIRED' },
      });
    });

    it('should return zero when no expired requests', async () => {
      mockPrismaService.request.findMany.mockResolvedValue([]);

      const result = await service.markExpiredRequests();

      expect(result.count).toBe(0);
      expect(result.message).toBe('No expired requests');
    });
  });

  describe('getRequestStats', () => {
    it('should return stats for client', async () => {
      mockPrismaService.request.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(2) // quoted
        .mockResolvedValueOnce(4) // accepted
        .mockResolvedValueOnce(0) // declined
        .mockResolvedValueOnce(1); // expired

      const result = await service.getRequestStats('client-123', 'CLIENT');

      expect(result.total).toBe(10);
      expect(result.pending).toBe(3);
      expect(result.quoted).toBe(2);
      expect(result.accepted).toBe(4);
      expect(result.declined).toBe(0);
      expect(result.expired).toBe(1);
    });

    it('should filter by clientId for clients', async () => {
      mockPrismaService.request.count.mockResolvedValue(5);

      await service.getRequestStats('client-123', 'CLIENT');

      expect(mockPrismaService.request.count).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
      });
    });

    it('should filter by artisanId for artisans', async () => {
      mockPrismaService.request.count.mockResolvedValue(3);

      await service.getRequestStats('artisan-123', 'ARTISAN');

      expect(mockPrismaService.request.count).toHaveBeenCalledWith({
        where: { artisanId: 'artisan-123' },
      });
    });
  });
});
