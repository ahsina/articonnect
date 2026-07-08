import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  // AES-256-GCM at-rest encryption for the TOTP secret.
  // Encrypted payload layout (base64): "enc:v1:" + salt(16) | iv(12) | authTag(16) | ciphertext
  private readonly encAlgorithm = 'aes-256-gcm';
  private readonly encPrefix = 'enc:v1:';

  constructor(private prisma: PrismaService) {}

  /**
   * Derive a 32-byte key from the app secret + a per-record random salt (PBKDF2).
   */
  private getMasterSecret(): string {
    // Reuse the app's ENCRYPTION_KEY if provided, otherwise fall back to JWT_SECRET.
    // A dev fallback keeps the demo working even if neither is set.
    return (
      process.env.ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'krafolt-dev-2fa-secret-do-not-use-in-prod'
    );
  }

  /**
   * Encrypt the TOTP secret at rest (AES-256-GCM).
   */
  private encryptSecret(plain: string): string {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.pbkdf2Sync(this.getMasterSecret(), salt, 100000, 32, 'sha256');
    const cipher = crypto.createCipheriv(this.encAlgorithm, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([salt, iv, authTag, ciphertext]).toString('base64');
    return `${this.encPrefix}${payload}`;
  }

  /**
   * Decrypt the TOTP secret. Backward-compatible: legacy plaintext secrets
   * (stored before at-rest encryption was introduced) are returned as-is.
   */
  private decryptSecret(stored: string): string {
    if (!stored || !stored.startsWith(this.encPrefix)) {
      return stored; // legacy plaintext secret
    }
    const data = Buffer.from(stored.slice(this.encPrefix.length), 'base64');
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 28);
    const authTag = data.subarray(28, 44);
    const ciphertext = data.subarray(44);
    const key = crypto.pbkdf2Sync(this.getMasterSecret(), salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv(this.encAlgorithm, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  async generateSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const secret = speakeasy.generateSecret({
      name: `Krafolt (${user.email})`,
      issuer: 'Krafolt',
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async verifyToken(secret: string, token: string): Promise<boolean> {
    // Transparently decrypt at-rest-encrypted secrets before verifying.
    // Legacy plaintext secrets pass through unchanged (see decryptSecret).
    let base32Secret: string;
    try {
      base32Secret = this.decryptSecret(secret);
    } catch {
      // If decryption fails (tampered/wrong key), treat as invalid token.
      return false;
    }
    return speakeasy.totp.verify({
      secret: base32Secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  async enable2FA(userId: string, secret: string) {
    // Encrypt the TOTP secret at rest (AES-256-GCM). The secret is the auth
    // factor itself, so a DB dump must not expose usable secrets.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.encryptSecret(secret),
        twoFactorEnabled: true,
      },
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store hashed backup codes
    for (const code of backupCodes) {
      const hashedCode = await bcrypt.hash(code, 10);
      await this.prisma.backupCode.create({
        data: {
          code: hashedCode,
          userId,
        },
      });
    }

    return { backupCodes };
  }

  private generateBackupCodes(): string[] {
    // Backup codes are auth bypasses: use a CSPRNG, not Math.random().
    // 8 chars from an unambiguous base32-like alphabet (~40 bits of entropy each).
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += alphabet[crypto.randomInt(0, alphabet.length)];
      }
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify backup code during login
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const backupCodes = await this.prisma.backupCode.findMany({
      where: {
        userId,
        used: false,
      },
    });

    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(code, backupCode.code);
      if (isMatch) {
        // Mark the backup code as used
        await this.prisma.backupCode.update({
          where: { id: backupCode.id },
          data: {
            used: true,
            usedAt: new Date(),
          },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingBackupCodesCount(userId: string): Promise<number> {
    return this.prisma.backupCode.count({
      where: {
        userId,
        used: false,
      },
    });
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string) {
    // Delete old backup codes
    await this.prisma.backupCode.deleteMany({
      where: { userId },
    });

    // Generate new codes
    const backupCodes = this.generateBackupCodes();

    // Store hashed backup codes
    for (const code of backupCodes) {
      const hashedCode = await bcrypt.hash(code, 10);
      await this.prisma.backupCode.create({
        data: {
          code: hashedCode,
          userId,
        },
      });
    }

    return { backupCodes };
  }
}
