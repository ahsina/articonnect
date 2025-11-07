import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

  async generateSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const secret = speakeasy.generateSecret({
      name: `ArtiConnect (${user.email})`,
      issuer: 'ArtiConnect',
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
      const bcrypt = require('bcrypt');
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
}
