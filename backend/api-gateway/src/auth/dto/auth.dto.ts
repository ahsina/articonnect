import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

// Strong password regex:
// - At least 12 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character'
  })
  @IsString()
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @Matches(STRONG_PASSWORD_REGEX, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+352123456789', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CLIENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    example: '03AGdBq27...',
    description: 'Google reCAPTCHA v3 token',
    required: false
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;

  @ApiProperty({
    example: 'fp_abc123xyz',
    description: 'Client device fingerprint for fraud detection',
    required: false
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    description: 'User agent string',
    required: false
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twoFactorToken?: string;

  @ApiProperty({
    example: '03AGdBq27...',
    description: 'Google reCAPTCHA v3 token',
    required: false
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;

  @ApiProperty({
    example: 'fp_abc123xyz',
    description: 'Client device fingerprint for fraud detection',
    required: false
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    description: 'User agent string',
    required: false
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPass123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewStrongPass123!',
    description: 'New password must be at least 12 characters with uppercase, lowercase, number, and special character'
  })
  @IsString()
  @MinLength(12, { message: 'Le nouveau mot de passe doit contenir au moins 12 caractères' })
  @Matches(STRONG_PASSWORD_REGEX, {
    message: 'Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)',
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '03AGdBq27...',
    description: 'Google reCAPTCHA v3 token',
    required: false
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123def456...' })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewStrongPass123!',
    description: 'New password must be at least 12 characters with uppercase, lowercase, number, and special character'
  })
  @IsString()
  @MinLength(12, { message: 'Le nouveau mot de passe doit contenir au moins 12 caractères' })
  @Matches(STRONG_PASSWORD_REGEX, {
    message: 'Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)',
  })
  newPassword: string;
}

export class Enable2FADto {
  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  password: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  token: string;
}

export class Disable2FADto {
  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  password: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  token: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'abc123def456...' })
  @IsString()
  token: string;
}
