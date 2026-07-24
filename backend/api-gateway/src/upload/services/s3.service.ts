import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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
  private readonly publicUrl: string;
  private readonly logger = new Logger(S3Service.name);

  private readonly allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  private readonly maxFileSizes = {
    image: 15 * 1024 * 1024, // 15MB (photos de téléphone)
    document: 10 * 1024 * 1024, // 10MB
  };

  constructor(private readonly clamavService: ClamavService) {
    this.bucket = process.env.AWS_S3_BUCKET || 'articonnect-dev';
    this.region = process.env.AWS_REGION || 'eu-west-1';
    this.publicUrl = process.env.S3_PUBLIC_URL || '';

    // endpoint custom + forcePathStyle => compatible MinIO / S3-compatible
    const endpoint = process.env.AWS_S3_ENDPOINT;
    this.s3Client = new S3Client({
      region: this.region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.logger.log(
      `S3Service initialized with bucket: ${this.bucket}${endpoint ? ` (endpoint: ${endpoint})` : ''}`,
    );
  }

  /** Construit l'URL publique d'un objet (servie via nginx /files/) ou retourne la clé brute. */
  private toPublicUrl(key: string): string {
    return this.publicUrl ? `${this.publicUrl}/${key}` : key;
  }

  /**
   * Upload a file buffer to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
    userId: string,
  ): Promise<string> {
    // Photos iPhone HEIC/HEIF : les navigateurs non-Safari ne peuvent pas les convertir côté client
    // (la normalisation front échoue → fichier original) → on convertit ici en JPEG, sinon la
    // validation par magic bytes les rejette (400). Conversion best-effort : si elle échoue, on
    // laisse la validation trancher.
    await this.convertHeicToJpeg(file);

    // Validate file (size + mime + magic bytes). Renvoie le vrai type détecté.
    const detectedMime = this.validateFile(file, fileType);

    // 🛡️ ANTIVIRUS SCAN - Scan for viruses BEFORE uploading to S3
    await this.clamavService.scanAndValidate(file.buffer, file.originalname, userId);

    // Generate unique filename — l'extension est DÉRIVÉE du vrai type détecté,
    // jamais de l'originalname fourni par le client (anti-spoofing d'extension).
    const extension = this.getExtensionFromMimeType(detectedMime);
    const randomString = crypto.randomBytes(16).toString('hex');
    const filename = `${fileType}/${userId}/${Date.now()}-${randomString}.${extension}`;

    // Upload to S3
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: detectedMime,
        // ACL removed - files are private by default
        // Access controlled via pre-signed URLs
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully: ${filename}`);
      return this.toPublicUrl(filename);
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
        // ACL removed - files are private by default
        // Access controlled via pre-signed URLs
      });

      await this.s3Client.send(command);

      this.logger.log(`Buffer uploaded successfully: ${filename}`);
      return this.toPublicUrl(filename);
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

    // Create presigned URL for upload
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        // ACL removed - files are private by default
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return { url, key };
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', error);
      throw new BadRequestException('Échec de génération de l\'URL de téléchargement');
    }
  }

  /**
   * Generate presigned URL for downloading/viewing a file
   * This provides temporary authorized access to private files
   */
  async getDownloadUrl(
    s3Key: string,
    expiresIn: number = 3600, // 1 hour by default
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error('Failed to generate download URL', error);
      throw new BadRequestException('Échec de génération de l\'URL de téléchargement');
    }
  }

  /**
   * Generate presigned URL for inline viewing (e.g., images, PDFs)
   */
  async getViewUrl(
    s3Key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ResponseContentDisposition: 'inline', // Display in browser instead of download
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error('Failed to generate view URL', error);
      throw new BadRequestException('Échec de génération de l\'URL de visualisation');
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
   * Validate file size and type.
   * SÉCURITÉ: le type réel est déterminé par les MAGIC BYTES du contenu, PAS par
   * le Content-Type multipart fourni par le client (qui est trivialement falsifiable).
   * Un binaire (ex MZ/PE .exe) déclaré 'image/png' est ainsi rejeté.
   * Retourne le vrai type MIME détecté (utilisé pour ContentType S3 + extension).
   */
  /** Vrai si le buffer est un HEIC/HEIF (ISOBMFF : boîte `ftyp` + marque heic/heif/mif1…). */
  private isHeicBuffer(file: Express.Multer.File): boolean {
    const b = file.buffer;
    if (b && b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp') {
      const brand = b.toString('ascii', 8, 12).toLowerCase();
      if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand)) {
        return true;
      }
    }
    return (
      /image\/(heic|heif)/i.test(file.mimetype || '') ||
      /\.(heic|heif)$/i.test(file.originalname || '')
    );
  }

  /** Convertit sur place un HEIC/HEIF en JPEG (mute file.buffer/mimetype/size/originalname). */
  private async convertHeicToJpeg(file: Express.Multer.File): Promise<void> {
    if (!this.isHeicBuffer(file)) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const heicConvert = require('heic-convert');
      const output: Buffer = await heicConvert({ buffer: file.buffer, format: 'JPEG', quality: 0.85 });
      file.buffer = output;
      file.size = output.length;
      file.mimetype = 'image/jpeg';
      file.originalname = (file.originalname || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      this.logger.log('HEIC/HEIF converti en JPEG avant upload');
    } catch (error) {
      this.logger.warn(`Conversion HEIC échouée (on laisse la validation trancher): ${(error as Error)?.message}`);
    }
  }

  private validateFile(file: Express.Multer.File, _fileType: FileType): string {
    // 1) Détection réelle par magic bytes
    const detectedMime = this.detectMimeFromMagicBytes(file.buffer);

    if (!detectedMime) {
      throw new BadRequestException(
        'Type de fichier non autorisé: contenu non reconnu ou non supporté.'
      );
    }

    // 2) Le type détecté doit appartenir à une catégorie autorisée
    const category = this.getFileCategory(detectedMime);
    if (!this.allowedMimeTypes[category]?.includes(detectedMime)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Types acceptés: ${this.allowedMimeTypes[category]?.join(', ')}`
      );
    }

    // 3) Cohérence: si le client déclare une catégorie différente du contenu réel, on rejette
    if (file.mimetype) {
      const declaredCategory = this.getFileCategory(file.mimetype);
      if (declaredCategory !== category) {
        throw new BadRequestException(
          'Le contenu du fichier ne correspond pas au type déclaré.'
        );
      }
    }

    // 4) Taille
    const maxSize = this.maxFileSizes[category];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximale: ${maxSize / (1024 * 1024)}MB`
      );
    }

    return detectedMime;
  }

  /**
   * Détecte le type MIME réel à partir des premiers octets (magic bytes / signatures).
   * Retourne null si non reconnu / non supporté.
   */
  private detectMimeFromMagicBytes(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) return null;
    const b = buffer;

    // JPEG: FF D8 FF
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
    ) return 'image/png';

    // GIF: 'GIF87a' / 'GIF89a'
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';

    // WEBP: 'RIFF' .... 'WEBP'
    if (
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
    ) return 'image/webp';

    // PDF: '%PDF'
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';

    // DOC (OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
    if (
      b.length >= 8 &&
      b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 &&
      b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1
    ) return 'application/msword';

    // DOCX / OOXML (ZIP container): 'PK' 03 04. On l'accepte comme docx si le client
    // le déclare comme tel, sinon on ne devine pas (ZIP générique = rejeté).
    if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    return null;
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
    // URL publique (nginx /files/) => on retire le préfixe
    if (this.publicUrl && url.startsWith(this.publicUrl)) {
      return url.slice(this.publicUrl.length + 1);
    }
    // URL S3 AWS classique
    const urlParts = url.split('.amazonaws.com/');
    if (urlParts.length >= 2) {
      return urlParts[1];
    }
    // Sinon, on suppose que c'est déjà une clé
    return url.replace(/^\/+/, '');
  }
}
