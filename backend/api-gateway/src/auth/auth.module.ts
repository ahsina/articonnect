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
import { OAuthController } from './controllers/oauth.controller';

@Module({
  imports: [
    PassportModule,
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
  ],
  controllers: [AuthController, SessionController, OAuthController],
  providers: [
    AuthService,
    SessionService,
    LoginSecurityService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    TwoFactorService,
    PhoneVerificationService,
  ],
  exports: [AuthService, SessionService, LoginSecurityService, PhoneVerificationService],
})
export class AuthModule {}
