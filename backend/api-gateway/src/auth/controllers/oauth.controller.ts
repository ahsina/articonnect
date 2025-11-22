import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { Response } from 'express';

@ApiTags('OAuth')
@Controller('auth')
export class OAuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  async appleAuth() {
    // Guard redirects to Apple
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleAuthRedirect(@Req() req, @Res() res: Response) {
    // Handle OAuth user
    const oauthUser = req.user;

    // Check if user exists
    const existingUser = await this.authService.findByEmail(oauthUser.email);

    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      user = await this.authService.createOAuthUser({
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        avatar: oauthUser.avatar,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      });
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);

    // Set httpOnly cookies for tokens
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to frontend without tokens in URL (tokens are in cookies)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookAuthRedirect(@Req() req, @Res() res: Response) {
    // Handle OAuth user
    const oauthUser = req.user;

    // Check if user exists
    const existingUser = await this.authService.findByEmail(oauthUser.email);

    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      user = await this.authService.createOAuthUser({
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        avatar: oauthUser.avatar,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      });
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);

    // Set httpOnly cookies for tokens
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to frontend without tokens in URL (tokens are in cookies)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    // Handle OAuth user
    const oauthUser = req.user;

    // Check if user exists
    const existingUser = await this.authService.findByEmail(oauthUser.email);

    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      user = await this.authService.createOAuthUser({
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        avatar: oauthUser.avatar,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      });
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);

    // Set httpOnly cookies for tokens
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to frontend without tokens in URL (tokens are in cookies)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }
}
