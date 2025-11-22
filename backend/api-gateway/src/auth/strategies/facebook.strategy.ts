import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || 'http://localhost:3000/auth/facebook/callback',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'displayName', 'emails', 'name', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails && emails.length > 0 ? emails[0].value : null,
      firstName: name?.givenName || profile.displayName.split(' ')[0],
      lastName: name?.familyName || profile.displayName.split(' ').slice(1).join(' '),
      avatar: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
      provider: 'facebook',
      providerId: profile.id,
    };
    done(null, user);
  }
}
