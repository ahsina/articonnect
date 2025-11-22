import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { EmailService } from '../../email/services/email.service';
import { TwoFactorService } from './two-factor.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private emailService: EmailService,
    private twoFactorService: TwoFactorService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string) {
    const { email, password, firstName, lastName, role, phone } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || UserRole.CLIENT,
      },
    });

    // Create profile based on role
    if (user.role === UserRole.CLIENT) {
      await this.prisma.clientProfile.create({
        data: { userId: user.id },
      });
    }

    // Create consent record with actual IP address
    await this.prisma.userConsent.create({
      data: {
        userId: user.id,
        ipAddress: ipAddress || 'unknown', // Fallback if IP not available
      },
    });

    // Generate email verification token
    const verificationToken = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Store verification token (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification email
    await this.emailService.sendEmailVerification(
      user.email,
      verificationToken,
      user.firstName
    );

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      message: 'Compte créé. Veuillez vérifier votre email pour activer votre compte.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password, twoFactorToken } = loginDto;

    // Validate user
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && !twoFactorToken) {
      return {
        requires2FA: true,
        userId: user.id,
      };
    }

    // If 2FA enabled, verify token
    if (user.twoFactorEnabled && twoFactorToken) {
      // This would be handled by TwoFactorService
      // For now, we'll skip actual verification
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '30d',
      },
    );

    const hashedToken = await bcrypt.hash(token, 10);

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return token;
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.sub;

      // Verify refresh token exists in DB
      const tokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          revoked: false,
        },
      });

      let validToken = null;
      for (const t of tokens) {
        if (await bcrypt.compare(refreshToken, t.token)) {
          validToken = t;
          break;
        }
      }

      if (!validToken) {
        throw new UnauthorizedException('Refresh token invalide');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      // Generate new access token
      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      const tokens = await this.prisma.refreshToken.findMany({
        where: { userId },
      });

      for (const t of tokens) {
        if (await bcrypt.compare(refreshToken, t.token)) {
          await this.prisma.refreshToken.update({
            where: { id: t.id },
            data: { revoked: true },
          });
          break;
        }
      }
    } else {
      // Revoke all refresh tokens
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });
    }

    return { message: 'Déconnexion réussie' };
  }

  async changePassword(userId: string, changePasswordDto: { currentPassword: string; newPassword: string }) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  async forgotPassword(email: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      };
    }

    // Generate random token (32 bytes = 64 hex characters)
    const resetToken = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token in database
    await this.prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email with reset link
    await this.emailService.sendResetPasswordEmail(user.email, resetToken, user.firstName);

    return {
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find valid token
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException(
        'Token invalide ou expiré'
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId },
      data: { revoked: true },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async enable2FA(userId: string, password: string) {
    // Verify password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    // Check if 2FA already enabled
    if (user.twoFactorEnabled) {
      throw new BadRequestException('L\'authentification à deux facteurs est déjà activée');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ArtiConnect (${user.email})`,
      length: 32,
    });

    // Save secret (temporarily, will be confirmed on verification)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    // Return QR code data URL and secret for manual entry
    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  }

  async verify2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Configuration 2FA introuvable');
    }

    // First try to verify TOTP token
    let verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before/after for clock drift
    });

    // If TOTP fails, try backup code
    if (!verified) {
      verified = await this.twoFactorService.verifyBackupCode(userId, token);
    }

    if (!verified) {
      throw new UnauthorizedException('Code invalide ou code de secours déjà utilisé');
    }

    // Enable 2FA if not already enabled
    if (!user.twoFactorEnabled) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        Array.from({ length: 8 }, () =>
          Math.floor(Math.random() * 10)
        ).join('')
      );

      // Hash and store backup codes
      for (const code of backupCodes) {
        const hashedCode = await bcrypt.hash(code, 12);
        await this.prisma.backupCode.create({
          data: {
            userId: user.id,
            code: hashedCode,
          },
        });
      }

      return {
        message: 'Authentification à deux facteurs activée avec succès',
        backupCodes,
      };
    }

    return { message: 'Code vérifié avec succès' };
  }

  async disable2FA(userId: string, password: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('L\'authentification à deux facteurs n\'est pas activée');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new UnauthorizedException('Code 2FA invalide');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // Delete backup codes
    await this.prisma.backupCode.deleteMany({
      where: { userId },
    });

    return { message: 'Authentification à deux facteurs désactivée avec succès' };
  }

  async verifyEmail(token: string) {
    // Find valid token
    const verificationToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Update user email verification status
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Mark token as used
    await this.prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { used: true },
    });

    return { message: 'Email vérifié avec succès' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email déjà vérifié');
    }

    // Invalidate old tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: { used: true },
    });

    // Generate new verification token
    const verificationToken = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Store verification token (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification email
    await this.emailService.sendEmailVerification(
      user.email,
      verificationToken,
      user.firstName
    );

    return { message: 'Email de vérification renvoyé' };
  }

  async regenerate2FABackupCodes(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA n\'est pas activé');
    }

    return this.twoFactorService.regenerateBackupCodes(userId);
  }

  async getRemainingBackupCodesCount(userId: string) {
    const count = await this.twoFactorService.getRemainingBackupCodesCount(userId);
    return { count };
  }

  sanitizeUser(user: User) {
    const { password: _password, twoFactorSecret: _twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }

  // ================================
  // OAuth Methods
  // ================================

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        clientProfile: true,
        artisanProfile: true,
      },
    });
  }

  async createOAuthUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }) {
    // Create user with random password (OAuth users don't use password)
    const randomPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashedPassword,
        avatar: data.avatar,
        emailVerified: true, // OAuth emails are pre-verified
        role: UserRole.CLIENT, // Default role
      },
      include: {
        clientProfile: true,
      },
    });

    // Create client profile
    if (!user.clientProfile) {
      await this.prisma.clientProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    return user;
  }
}
