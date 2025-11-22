import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_LOCATION') || './keys/AuthKey.p8',
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL') || 'http://localhost:3000/auth/apple/callback',
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
    const { email, sub } = idToken;
    const name = profile.name || {};

    const user = {
      email: email,
      firstName: name.firstName || 'Apple',
      lastName: name.lastName || 'User',
      avatar: null,
      accessToken,
      provider: 'apple',
      providerId: sub,
    };
    done(null, user);
  }
}
