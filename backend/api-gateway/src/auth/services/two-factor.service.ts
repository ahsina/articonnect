import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

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
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  async enable2FA(userId: string, secret: string) {
    // In production, encrypt the secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
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
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
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
