import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService, AuditLogOptions } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditLog = {
    id: 'log-123',
    userId: 'user-123',
    action: 'LOGIN',
    resource: 'auth',
    details: { method: 'password' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const options: AuditLogOptions = {
        userId: 'user-123',
        action: 'LOGIN',
        resource: 'auth',
        details: { method: 'password' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.log(options);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'LOGIN',
          resource: 'auth',
          details: { method: 'password' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should create log with default empty details', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.log({
        action: 'LOGOUT',
        resource: 'auth',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: {},
        }),
      });
    });

    it('should allow optional userId', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.log({
        action: 'PAGE_VIEW',
        resource: 'home',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: undefined,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by userId', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      await service.findAll({ userId: 'user-123' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        }),
      );
    });

    it('should filter by action', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      await service.findAll({ action: 'LOGIN' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'LOGIN' }),
        }),
      );
    });

    it('should filter by resource', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      await service.findAll({ resource: 'auth' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resource: 'auth' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await service.findAll({ startDate, endDate });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should handle pagination', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(100);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should order by createdAt desc', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll();

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return audit log by id', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockAuditLog);

      const result = await service.findOne('log-123');

      expect(result).toEqual(mockAuditLog);
      expect(mockPrismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'log-123' },
      });
    });

    it('should return null if not found', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('logUserAction', () => {
    it('should log user action with request info', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const request = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      await service.logUserAction(
        'user-123',
        'UPDATE_PROFILE',
        'user',
        { field: 'email' },
        request,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'UPDATE_PROFILE',
          resource: 'user',
          details: { field: 'email' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should use "unknown" for missing IP', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const request = {
        ip: '',
        headers: {},
      };

      await service.logUserAction('user-123', 'LOGIN', 'auth', {}, request);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: 'unknown',
        }),
      });
    });

    it('should handle undefined user agent', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const request = {
        ip: '192.168.1.1',
        headers: {},
      };

      await service.logUserAction('user-123', 'LOGIN', 'auth', {}, request);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: undefined,
        }),
      });
    });
  });
});
