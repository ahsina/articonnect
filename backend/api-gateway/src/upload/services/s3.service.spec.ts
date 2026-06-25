import { Test, TestingModule } from '@nestjs/testing';
import { S3Service, FileType } from './s3.service';
import { ClamavService } from './clamav.service';
import { BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let service: S3Service;
  let clamavService: ClamavService;

  const mockClamavService = {
    scanAndValidate: jest.fn(),
  };

  const mockS3Send = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3Send,
    }));

    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.example.com');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: ClamavService, useValue: mockClamavService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    clamavService = module.get<ClamavService>(ClamavService);
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      buffer: Buffer.from('test file content'),
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('should upload a file successfully', async () => {
      mockClamavService.scanAndValidate.mockResolvedValue(undefined);
      mockS3Send.mockResolvedValue({});

      const result = await service.uploadFile(
        mockFile,
        FileType.AVATAR,
        'user-123',
      );

      expect(result).toContain('avatar/user-123/');
      expect(result).toContain('.jpg');
      expect(mockClamavService.scanAndValidate).toHaveBeenCalled();
    });

    it('should reject invalid mime type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/exe',
      };

      await expect(
        service.uploadFile(invalidFile, FileType.AVATAR, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file exceeding size limit', async () => {
      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB, exceeds 5MB limit for images
      };

      await expect(
        service.uploadFile(largeFile, FileType.AVATAR, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should scan file for viruses', async () => {
      mockClamavService.scanAndValidate.mockResolvedValue(undefined);
      mockS3Send.mockResolvedValue({});

      await service.uploadFile(mockFile, FileType.AVATAR, 'user-123');

      expect(mockClamavService.scanAndValidate).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        'user-123',
      );
    });

    it('should handle S3 upload errors', async () => {
      mockClamavService.scanAndValidate.mockResolvedValue(undefined);
      mockS3Send.mockRejectedValue(new Error('S3 error'));

      await expect(
        service.uploadFile(mockFile, FileType.AVATAR, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadBuffer', () => {
    it('should upload a buffer successfully', async () => {
      const buffer = Buffer.from('PDF content');
      mockClamavService.scanAndValidate.mockResolvedValue(undefined);
      mockS3Send.mockResolvedValue({});

      const result = await service.uploadBuffer(
        buffer,
        'invoices/test.pdf',
        'application/pdf',
      );

      expect(result).toBe('invoices/test.pdf');
      expect(mockClamavService.scanAndValidate).toHaveBeenCalled();
    });

    it('should skip virus scan when specified', async () => {
      const buffer = Buffer.from('Generated PDF');
      mockS3Send.mockResolvedValue({});

      await service.uploadBuffer(
        buffer,
        'generated/report.pdf',
        'application/pdf',
        true, // skipVirusScan
      );

      expect(mockClamavService.scanAndValidate).not.toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const buffer = Buffer.from('test');
      mockClamavService.scanAndValidate.mockResolvedValue(undefined);
      mockS3Send.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.uploadBuffer(buffer, 'test.pdf', 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL for upload', async () => {
      const result = await service.getPresignedUrl(
        FileType.PRODUCT_PHOTO,
        'artisan-123',
        'image/jpeg',
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.url).toBe('https://signed-url.example.com');
      expect(result.key).toContain('product-photo/artisan-123/');
    });

    it('should reject invalid mime type', async () => {
      await expect(
        service.getPresignedUrl(
          FileType.AVATAR,
          'user-123',
          'application/exe',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use correct expiration time', async () => {
      await service.getPresignedUrl(
        FileType.DOCUMENT,
        'user-123',
        'application/pdf',
        7200,
      );

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: 7200 },
      );
    });

    it('should handle presigned URL generation errors', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Signing failed'));

      await expect(
        service.getPresignedUrl(FileType.AVATAR, 'user-123', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate download URL', async () => {
      const result = await service.getDownloadUrl('path/to/file.pdf');

      expect(result).toBe('https://signed-url.example.com');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should use default expiration of 1 hour', async () => {
      await service.getDownloadUrl('file.pdf');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(GetObjectCommand),
        { expiresIn: 3600 },
      );
    });

    it('should use custom expiration', async () => {
      await service.getDownloadUrl('file.pdf', 7200);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(GetObjectCommand),
        { expiresIn: 7200 },
      );
    });

    it('should handle errors', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Error'));

      await expect(service.getDownloadUrl('file.pdf')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getViewUrl', () => {
    it('should generate view URL with inline disposition', async () => {
      const result = await service.getViewUrl('path/to/image.jpg');

      expect(result).toBe('https://signed-url.example.com');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Error'));

      await expect(service.getViewUrl('image.jpg')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete a file from S3', async () => {
      mockS3Send.mockResolvedValue({});

      await service.deleteFile(
        'https://bucket.s3.eu-west-1.amazonaws.com/path/to/file.jpg',
      );

      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should extract correct key from URL', async () => {
      mockS3Send.mockResolvedValue({});

      await service.deleteFile(
        'https://bucket.s3.eu-west-1.amazonaws.com/avatar/user-123/image.jpg',
      );

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.any(DeleteObjectCommand),
      );
    });

    it('should treat a non-S3 string as a raw key (S3-compatible/MinIO)', async () => {
      // Désormais, une chaîne sans host S3 est traitée comme une clé brute
      // (support des URLs publiques MinIO et des clés). deleteFile ne rejette plus.
      mockS3Send.mockResolvedValue({});
      await expect(service.deleteFile('invalid-url')).resolves.toBeUndefined();
    });

    it('should handle delete errors', async () => {
      mockS3Send.mockRejectedValue(new Error('Delete failed'));

      await expect(
        service.deleteFile(
          'https://bucket.s3.eu-west-1.amazonaws.com/file.jpg',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
