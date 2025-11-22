import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { PhoneVerificationService } from '../services/phone-verification.service';
import { CaptchaService } from '../../captcha/captcha.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
  VerifyEmailDto,
} from '../dto/auth.dto';
import { SendPhoneCodeDto, VerifyPhoneCodeDto } from '../dto/phone-verification.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly phoneVerificationService: PhoneVerificationService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Response({ passthrough: true }) res: any,
  ) {
    // Verify CAPTCHA if provided
    if (registerDto.captchaToken) {
      await this.captchaService.verifyRegisterCaptcha(registerDto.captchaToken, ipAddress);
    }

    const result = await this.authService.register(registerDto, ipAddress);

    // Set httpOnly cookies for tokens
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // Return user info without tokens in body (tokens are in cookies)
    return {
      user: result.user,
      message: result.message,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Response({ passthrough: true }) res: any,
  ) {
    // Verify CAPTCHA if provided
    if (loginDto.captchaToken) {
      await this.captchaService.verifyLoginCaptcha(loginDto.captchaToken, ipAddress);
    }

    const result = await this.authService.login(loginDto);

    // If 2FA required, don't set cookies yet
    if (result.requires2FA) {
      return result;
    }

    // Set httpOnly cookies for tokens
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // Return user info without tokens in body (tokens are in cookies)
    return {
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Request() req,
    @Response({ passthrough: true }) res: any,
  ) {
    // Get refresh token from cookie or body (for backward compatibility)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token manquant');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    // Set new access token in cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return {
      message: 'Token rafraîchi avec succès',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @Request() req,
    @Response({ passthrough: true }) res: any,
    @Body() body?: { refreshToken?: string },
  ) {
    const refreshToken = req.cookies?.refreshToken || body?.refreshToken;
    const result = await this.authService.logout(req.user.userId, refreshToken);

    // Clear auth cookies
    this.clearAuthCookies(res);

    return result;
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user' })
  async me(@Request() req) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Ip() ipAddress: string,
  ) {
    // Verify CAPTCHA if provided
    if (forgotPasswordDto.captchaToken) {
      await this.captchaService.verifyForgotPasswordCaptcha(forgotPasswordDto.captchaToken, ipAddress);
    }

    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  async enable2FA(@Request() req, @Body() enable2FADto: Enable2FADto) {
    return this.authService.enable2FA(req.user.userId, enable2FADto.password);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify and activate 2FA' })
  async verify2FA(@Request() req, @Body() verify2FADto: Verify2FADto) {
    return this.authService.verify2FA(req.user.userId, verify2FADto.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  async disable2FA(@Request() req, @Body() disable2FADto: Disable2FADto) {
    return this.authService.disable2FA(
      req.user.userId,
      disable2FADto.password,
      disable2FADto.token,
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  async resendVerification(@Request() req) {
    return this.authService.resendVerificationEmail(req.user.userId);
  }

  @Post('phone/send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS verification code to phone number' })
  async sendPhoneCode(@Body() sendPhoneCodeDto: SendPhoneCodeDto) {
    return this.phoneVerificationService.sendVerificationCode(sendPhoneCodeDto.phone);
  }

  @Post('phone/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone number with SMS code' })
  async verifyPhoneCode(@Body() verifyPhoneCodeDto: VerifyPhoneCodeDto) {
    return this.phoneVerificationService.verifyCode(
      verifyPhoneCodeDto.phone,
      verifyPhoneCodeDto.code,
    );
  }

  @Post('phone/send-code-authenticated')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS verification code (authenticated user)' })
  async sendPhoneCodeAuthenticated(@Request() req, @Body() sendPhoneCodeDto: SendPhoneCodeDto) {
    return this.phoneVerificationService.sendVerificationCode(
      sendPhoneCodeDto.phone,
      req.user.userId,
    );
  }

  @Post('2fa/backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate 2FA backup codes' })
  async regenerateBackupCodes(@Request() req) {
    return this.authService.regenerate2FABackupCodes(req.user.userId);
  }

  @Get('2fa/backup-codes/count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get remaining backup codes count' })
  async getBackupCodesCount(@Request() req) {
    return this.authService.getRemainingBackupCodesCount(req.user.userId);
  }

  // ================================
  // Helper Methods for Cookies
  // ================================

  private setAuthCookies(res: any, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Set access token cookie (short-lived: 15 minutes)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (long-lived: 30 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  private clearAuthCookies(res: any) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }
}
