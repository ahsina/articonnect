import { Test, TestingModule } from '@nestjs/testing';
import { ContentFilterService } from './content-filter.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ContentFilterService', () => {
  let service: ContentFilterService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    contentViolation: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentFilterService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContentFilterService>(ContentFilterService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('filterContent', () => {
    it('should block content with phone numbers', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      const result = await service.filterContent(
        'Appelez-moi au 06 12 34 56 78',
        'user-123',
      );

      expect(result.isBlocked).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      expect(result.violationType).toBe('HIGH');
    });

    it('should block content with email addresses', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      const result = await service.filterContent(
        'Contactez-moi à mon-email@gmail.com',
        'user-123',
      );

      expect(result.isBlocked).toBe(true);
      expect(result.detectedPatterns).toContain('EMAIL');
    });

    it('should block content with WhatsApp links', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      const result = await service.filterContent(
        'Mon WhatsApp: wa.me/33612345678',
        'user-123',
      );

      expect(result.isBlocked).toBe(true);
      expect(result.detectedPatterns).toContain('WHATSAPP');
    });

    it('should allow safe content', async () => {
      const result = await service.filterContent(
        'Bonjour, je suis intéressé par votre service de plomberie.',
        'user-123',
      );

      expect(result.isBlocked).toBe(false);
      expect(result.detectedPatterns).toHaveLength(0);
      expect(result.filteredContent).toBe(
        'Bonjour, je suis intéressé par votre service de plomberie.',
      );
    });

    it('should detect international phone numbers', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      const result = await service.filterContent(
        'Numéro international: +33 6 12 34 56 78',
        'user-123',
      );

      expect(result.isBlocked).toBe(true);
      expect(result.detectedPatterns).toContain('PHONE_FR_INTERNATIONAL');
    });

    it('should detect obfuscated emails', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      const result = await service.filterContent(
        'Écrivez à user at gmail dot com',
        'user-123',
      );

      expect(result.isBlocked).toBe(true);
      expect(result.detectedPatterns).toContain('EMAIL_OBFUSCATED');
    });

    it('should detect URLs', async () => {
      const result = await service.filterContent(
        'Visitez https://example.com pour plus',
        'user-123',
      );

      expect(result.detectedPatterns).toContain('URL_HTTP');
    });

    it('should detect social media handles', async () => {
      const result = await service.filterContent(
        'Mon Instagram: instagram.com/myprofile',
        'user-123',
      );

      expect(result.detectedPatterns).toContain('INSTAGRAM');
    });

    it('should replace detected content in filtered output', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      const result = await service.filterContent(
        'Mon email: test@example.com',
        'user-123',
      );

      expect(result.filteredContent).toContain('[EMAIL BLOQUÉ]');
      expect(result.filteredContent).not.toContain('test@example.com');
    });

    it('should log violation when HIGH severity detected', async () => {
      mockPrismaService.contentViolation.create.mockResolvedValue({});
      mockPrismaService.contentViolation.count.mockResolvedValue(1);

      await service.filterContent('Appelez-moi: 0612345678', 'user-123');

      expect(mockPrismaService.contentViolation.create).toHaveBeenCalled();
    });
  });

  describe('isContentSafe', () => {
    it('should return true for safe content', async () => {
      const result = await service.isContentSafe(
        'Je voudrais un devis pour la rénovation.',
      );

      expect(result).toBe(true);
    });

    it('should return false for content with phone number', async () => {
      const result = await service.isContentSafe(
        'Appelez-moi au 06.12.34.56.78',
      );

      expect(result).toBe(false);
    });

    it('should return false for content with email', async () => {
      const result = await service.isContentSafe(
        'Écrivez-moi à contact@example.com',
      );

      expect(result).toBe(false);
    });
  });

  describe('detectPatterns', () => {
    it('should return list of detected patterns', async () => {
      const result = await service.detectPatterns(
        'Email: test@test.com, Tel: 0612345678, Site: www.example.com',
      );

      expect(result).toContain('EMAIL');
      expect(result).toContain('URL_WWW');
    });

    it('should return empty array for clean content', async () => {
      const result = await service.detectPatterns(
        'Bonjour, comment allez-vous ?',
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserViolations', () => {
    it('should return user violations', async () => {
      const mockViolations = [
        { id: 'v1', content: 'test', severity: 'HIGH' },
        { id: 'v2', content: 'test2', severity: 'HIGH' },
      ];
      mockPrismaService.contentViolation.findMany.mockResolvedValue(mockViolations);
      mockPrismaService.contentViolation.count.mockResolvedValue(2);

      const result = await service.getUserViolations('user-123', 30);

      expect(result.violations).toEqual(mockViolations);
      expect(result.total).toBe(2);
      expect(result.period).toBe('30 days');
    });

    it('should use default 30 days period', async () => {
      mockPrismaService.contentViolation.findMany.mockResolvedValue([]);
      mockPrismaService.contentViolation.count.mockResolvedValue(0);

      await service.getUserViolations('user-123');

      expect(mockPrismaService.contentViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            createdAt: { gte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('getAllViolations', () => {
    it('should return paginated violations for admin', async () => {
      const mockViolations = [{ id: 'v1', user: { email: 'user@test.com' } }];
      mockPrismaService.contentViolation.findMany.mockResolvedValue(mockViolations);
      mockPrismaService.contentViolation.count.mockResolvedValue(100);

      const result = await service.getAllViolations(1, 50);

      expect(result.violations).toEqual(mockViolations);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 100,
        pages: 2,
      });
    });

    it('should calculate correct skip for pagination', async () => {
      mockPrismaService.contentViolation.findMany.mockResolvedValue([]);
      mockPrismaService.contentViolation.count.mockResolvedValue(0);

      await service.getAllViolations(3, 20);

      expect(mockPrismaService.contentViolation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
    });
  });

  describe('togglePattern', () => {
    it('should enable a pattern', async () => {
      await service.togglePattern('EMAIL', true);

      // Pattern state is internal, verify by checking content filtering
      const patterns = service.getPatterns();
      const emailPattern = patterns.find((p) => p.name === 'EMAIL');
      expect(emailPattern?.enabled).toBe(true);
    });

    it('should disable a pattern', async () => {
      await service.togglePattern('EMAIL', false);

      const patterns = service.getPatterns();
      const emailPattern = patterns.find((p) => p.name === 'EMAIL');
      expect(emailPattern?.enabled).toBe(false);

      // Re-enable for other tests
      await service.togglePattern('EMAIL', true);
    });

    it('should handle non-existent pattern gracefully', async () => {
      await expect(
        service.togglePattern('NON_EXISTENT', true),
      ).resolves.not.toThrow();
    });
  });

  describe('getPatterns', () => {
    it('should return all patterns', () => {
      const patterns = service.getPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('regex');
      expect(patterns[0]).toHaveProperty('severity');
      expect(patterns[0]).toHaveProperty('enabled');
    });

    it('should include phone, email, and URL patterns', () => {
      const patterns = service.getPatterns();
      const patternNames = patterns.map((p) => p.name);

      expect(patternNames).toContain('EMAIL');
      expect(patternNames).toContain('PHONE_FR_MOBILE');
      expect(patternNames).toContain('URL_HTTP');
    });
  });
});
