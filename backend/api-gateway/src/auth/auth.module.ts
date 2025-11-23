import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { SessionController } from './controllers/session.controller';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { LoginSecurityService } from './services/login-security.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TwoFactorService } from './services/two-factor.service';
import { PhoneVerificationService } from './services/phone-verification.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { OAuthController } from './controllers/oauth.controller';
import { CaptchaModule } from '../captcha/captcha.module';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [
    PassportModule,
    FraudModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    CaptchaModule,
  ],
  controllers: [AuthController, SessionController, OAuthController],
  providers: [
    AuthService,
    SessionService,
    LoginSecurityService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
    TwoFactorService,
    PhoneVerificationService,
  ],
  exports: [AuthService, SessionService, LoginSecurityService, PhoneVerificationService],
})
export class AuthModule {}
