import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID') || 'com.articonnect.service',
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyString: configService.get<string>('APPLE_PRIVATE_KEY'),
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL') ||
                   'http://localhost:4000/auth/apple/callback',
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    // Apple returns user info only on first sign in
    // On subsequent logins, only the ID token is provided
    const { sub: providerId, email } = idToken;
    const { name } = profile || {};

    const user = {
      providerId,
      provider: 'apple',
      email: email || null,
      firstName: name?.firstName || '',
      lastName: name?.lastName || '',
      avatar: null, // Apple doesn't provide avatar
      accessToken,
    };

    done(null, user);
  }
}
