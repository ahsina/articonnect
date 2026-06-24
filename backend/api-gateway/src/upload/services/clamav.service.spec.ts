import { Test, TestingModule } from '@nestjs/testing';
import { ClamavService } from './clamav.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

// Mock NodeClam
jest.mock('clamscan', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue({
      isInfected: jest.fn(),
      getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
    }),
  })),
}));

// Mock fs
jest.mock('fs');

describe('ClamavService', () => {
  let service: ClamavService;

  const mockPrismaService = {};

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        CLAMAV_ENABLED: 'false', // Disabled by default for tests
        CLAMAV_HOST: 'localhost',
        CLAMAV_PORT: '3310',
        CLAMAV_QUARANTINE_PATH: '/tmp/quarantine',
        CLAMAV_SCAN_TIMEOUT: '60000',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClamavService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ClamavService>(ClamavService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with ClamAV disabled', () => {
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('scanBuffer', () => {
    it('should return clean result when disabled', async () => {
      const buffer = Buffer.from('test content');

      const result = await service.scanBuffer(buffer, 'test.txt', 'user-123');

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
      expect(result.scanTime).toBe(0);
    });
  });

  describe('scanFile', () => {
    it('should return clean result when disabled', async () => {
      const result = await service.scanFile('/path/to/file.txt', 'user-123');

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
      expect(result.scanTime).toBe(0);
    });
  });

  describe('scanAndValidate', () => {
    it('should not throw when disabled in non-production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      const buffer = Buffer.from('test content');

      await expect(
        service.scanAndValidate(buffer, 'test.txt', 'user-123'),
      ).resolves.not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw BadRequestException in production when disabled', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const buffer = Buffer.from('test content');

      await expect(
        service.scanAndValidate(buffer, 'test.txt', 'user-123'),
      ).rejects.toThrow(BadRequestException);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isEnabled', () => {
    it('should return false when ClamAV is disabled', () => {
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return "disabled" when service is disabled', async () => {
      const version = await service.getVersion();

      expect(version).toBe('disabled');
    });
  });

  describe('isHealthy', () => {
    it('should return false when service is disabled', async () => {
      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics structure', async () => {
      const stats = await service.getStatistics(7);

      expect(stats).toHaveProperty('totalScans');
      expect(stats).toHaveProperty('infectedFiles');
      expect(stats).toHaveProperty('cleanFiles');
      expect(stats).toHaveProperty('topViruses');
      expect(stats).toHaveProperty('averageScanTime');
    });

    it('should return zeros when no data', async () => {
      const stats = await service.getStatistics(7);

      expect(stats.totalScans).toBe(0);
      expect(stats.infectedFiles).toBe(0);
      expect(stats.cleanFiles).toBe(0);
      expect(stats.topViruses).toEqual([]);
      expect(stats.averageScanTime).toBe(0);
    });
  });

  describe('getQuarantinedFiles', () => {
    it('should return list of quarantined files', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['infected-file-1.txt', 'infected-file-2.txt']);

      const files = await service.getQuarantinedFiles();

      expect(files).toHaveLength(2);
      expect(files).toContain('infected-file-1.txt');
    });

    it('should return empty array when quarantine dir does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const files = await service.getQuarantinedFiles();

      expect(files).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const files = await service.getQuarantinedFiles();

      expect(files).toEqual([]);
    });
  });

  describe('deleteQuarantinedFile', () => {
    it('should delete quarantined file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.deleteQuarantinedFile('infected-file.txt');

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/quarantine/infected-file.txt');
    });

    it('should not throw if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        service.deleteQuarantinedFile('nonexistent.txt'),
      ).resolves.not.toThrow();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on delete error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Delete error');
      });

      await expect(
        service.deleteQuarantinedFile('infected.txt'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

describe('ClamavService (enabled)', () => {
  let service: ClamavService;
  let mockClamav: any;

  const mockPrismaService = {};

  const enabledConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        CLAMAV_ENABLED: 'true',
        CLAMAV_HOST: 'localhost',
        CLAMAV_PORT: '3310',
        CLAMAV_QUARANTINE_PATH: '/tmp/quarantine',
        CLAMAV_SCAN_TIMEOUT: '60000',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockClamav = {
      isInfected: jest.fn().mockResolvedValue({ isInfected: false, viruses: [] }),
      getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
    };

    // Reset the mock
    const NodeClam = require('clamscan').default;
    NodeClam.mockImplementation(() => ({
      init: jest.fn().mockResolvedValue(mockClamav),
    }));

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClamavService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: enabledConfigService },
      ],
    }).compile();

    service = module.get<ClamavService>(ClamavService);

    // Manually set the clamav instance for testing
    (service as any).clamav = mockClamav;
    (service as any).enabled = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scanBuffer (enabled)', () => {
    it('should scan buffer and return clean result', async () => {
      mockClamav.isInfected.mockResolvedValue({ isInfected: false, viruses: [] });
      const buffer = Buffer.from('test content');

      const result = await service.scanBuffer(buffer, 'test.txt', 'user-123');

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
      expect(result.scanTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect infected file', async () => {
      mockClamav.isInfected.mockResolvedValue({
        isInfected: true,
        viruses: ['Eicar-Test-Signature'],
      });
      const buffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

      const result = await service.scanBuffer(buffer, 'eicar.txt', 'user-123');

      expect(result.isInfected).toBe(true);
      expect(result.viruses).toContain('Eicar-Test-Signature');
    });

    it('should quarantine infected files', async () => {
      mockClamav.isInfected.mockResolvedValue({
        isInfected: true,
        viruses: ['TestVirus'],
      });
      const buffer = Buffer.from('malicious content');

      await service.scanBuffer(buffer, 'malware.exe', 'user-123');

      expect(fs.copyFileSync).toHaveBeenCalled();
    });
  });

  describe('scanAndValidate (enabled)', () => {
    it('should pass clean files', async () => {
      mockClamav.isInfected.mockResolvedValue({ isInfected: false, viruses: [] });
      const buffer = Buffer.from('clean content');

      await expect(
        service.scanAndValidate(buffer, 'clean.txt', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject infected files', async () => {
      mockClamav.isInfected.mockResolvedValue({
        isInfected: true,
        viruses: ['TestVirus'],
      });
      const buffer = Buffer.from('malicious');

      await expect(
        service.scanAndValidate(buffer, 'malware.exe', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include virus name in error', async () => {
      mockClamav.isInfected.mockResolvedValue({
        isInfected: true,
        viruses: ['Win.Trojan.Test'],
      });
      const buffer = Buffer.from('malicious');

      await expect(
        service.scanAndValidate(buffer, 'malware.exe', 'user-123'),
      ).rejects.toThrow(/Win.Trojan.Test/);
    });
  });

  describe('isHealthy (enabled)', () => {
    it('should return true when ClamAV is healthy', async () => {
      const healthy = await service.isHealthy();

      expect(healthy).toBe(true);
      expect(mockClamav.getVersion).toHaveBeenCalled();
    });

    it('should return false on health check error', async () => {
      mockClamav.getVersion.mockRejectedValue(new Error('Connection failed'));

      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  describe('getVersion (enabled)', () => {
    it('should return ClamAV version', async () => {
      const version = await service.getVersion();

      expect(version).toBe('ClamAV 0.103.0');
    });

    it('should return "unknown" on error', async () => {
      mockClamav.getVersion.mockRejectedValue(new Error('Error'));

      const version = await service.getVersion();

      expect(version).toBe('unknown');
    });
  });
});
