import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { ClamavService } from './clamav.service';

export enum FileType {
  AVATAR = 'avatar',
  PRODUCT_PHOTO = 'product-photo',
  DOCUMENT = 'document',
  CERTIFICATION = 'certification',
  MISSION_PHOTO = 'mission-photo',
}

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  private readonly allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  private readonly maxFileSizes = {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
  };

  constructor(private readonly clamavService: ClamavService) {
    this.bucket = process.env.AWS_S3_BUCKET || 'articonnect-dev';
    this.region = process.env.AWS_REGION || 'eu-west-1';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.logger.log(`S3Service initialized with bucket: ${this.bucket}`);
  }

  /**
   * Upload a file buffer to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
    userId: string,
  ): Promise<string> {
    // Validate file
    this.validateFile(file, fileType);

    // 🛡️ ANTIVIRUS SCAN - Scan for viruses BEFORE uploading to S3
    await this.clamavService.scanAndValidate(file.buffer, file.originalname, userId);

    // Generate unique filename
    const extension = this.getFileExtension(file.originalname);
    const randomString = crypto.randomBytes(16).toString('hex');
    const filename = `${fileType}/${userId}/${Date.now()}-${randomString}.${extension}`;

    // Upload to S3
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Make files publicly accessible
      });

      await this.s3Client.send(command);

      // Return public URL
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filename}`;
      this.logger.log(`File uploaded successfully: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('Failed to upload file to S3', error);
      throw new BadRequestException('Échec du téléchargement du fichier');
    }
  }

  /**
   * Upload a buffer directly to S3 (e.g., for generated PDFs)
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    skipVirusScan = false, // Allow skipping scan for generated PDFs
  ): Promise<string> {
    try {
      // 🛡️ ANTIVIRUS SCAN - Scan for viruses BEFORE uploading (unless skipped for trusted sources)
      if (!skipVirusScan) {
        await this.clamavService.scanAndValidate(buffer, filename);
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      // Return public URL
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filename}`;
      this.logger.log(`Buffer uploaded successfully: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('Failed to upload buffer to S3', error);
      throw new BadRequestException('Échec du téléchargement du fichier');
    }
  }

  /**
   * Generate presigned URL for direct client upload
   */
  async getPresignedUrl(
    fileType: FileType,
    userId: string,
    mimeType: string,
    expiresIn: number = 3600,
  ): Promise<{ url: string; key: string }> {
    // Validate mime type
    const category = this.getFileCategory(mimeType);
    if (!this.allowedMimeTypes[category]?.includes(mimeType)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }

    // Generate unique filename
    const extension = this.getExtensionFromMimeType(mimeType);
    const randomString = crypto.randomBytes(16).toString('hex');
    const key = `${fileType}/${userId}/${Date.now()}-${randomString}.${extension}`;

    // Create presigned URL
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        ACL: 'public-read',
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return { url, key };
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', error);
      throw new BadRequestException('Échec de génération de l\'URL de téléchargement');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(fileUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error('Failed to delete file from S3', error);
      throw new BadRequestException('Échec de suppression du fichier');
    }
  }

  /**
   * Validate file size and type
   */
  private validateFile(file: Express.Multer.File, _fileType: FileType): void {
    const category = this.getFileCategory(file.mimetype);

    // Check mime type
    if (!this.allowedMimeTypes[category]?.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Types acceptés: ${this.allowedMimeTypes[category]?.join(', ')}`
      );
    }

    // Check file size
    const maxSize = this.maxFileSizes[category];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximale: ${maxSize / (1024 * 1024)}MB`
      );
    }
  }

  private getFileCategory(mimeType: string): 'image' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || 'bin';
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };

    return extensions[mimeType] || 'bin';
  }

  private extractKeyFromUrl(url: string): string {
    // Extract key from S3 URL
    // Example: https://bucket.s3.region.amazonaws.com/path/to/file.jpg
    const urlParts = url.split('.amazonaws.com/');
    if (urlParts.length < 2) {
      throw new BadRequestException('URL S3 invalide');
    }
    return urlParts[1];
  }
}
