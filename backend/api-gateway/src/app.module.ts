import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MissionModule } from './mission/mission.module';
import { GeoModule } from './geo/geo.module';
import { PaymentModule } from './payment/payment.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';
import { SpecialtyModule } from './specialty/specialty.module';
import { ReviewModule } from './review/review.module';
import { UploadModule } from './upload/upload.module';
import { DisputeModule } from './dispute/dispute.module';
import { AddressModule } from './address/address.module';
import { FavoriteModule } from './favorite/favorite.module';
import { CertificationModule } from './certification/certification.module';
import { FcmModule } from './fcm/fcm.module';
import { HealthModule } from './health/health.module';
import { InvoiceModule } from './invoice/invoice.module';
import { VatModule } from './vat/vat.module';
import { ModerationModule } from './moderation/moderation.module';
import { VerificationModule } from './verification/verification.module';
import { FraudModule } from './fraud/fraud.module';
import { ComplianceModule } from './compliance/compliance.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { BadgesModule } from './badges/badges.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExportModule } from './export/export.module';
import { CompanyModule } from './company/company.module';
import { EmployeeModule } from './employee/employee.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MigrationModule } from './common/migrations/migration.module';
import { SentryModule } from './common/sentry/sentry.module';
import { TracingModule } from './common/tracing/tracing.module';
import { CacheModule } from './common/cache/cache.module';
import { LoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    SentryModule.forRootAsync(),
    TracingModule.forRootAsync(),
    PrismaModule,
    RedisModule,
    CacheModule,
    MigrationModule,
    HealthModule,
    AuthModule,
    UserModule,
    CompanyModule,
    EmployeeModule,
    MissionModule,
    GeoModule,
    PaymentModule,
    MarketplaceModule,
    SpecialtyModule,
    ReviewModule,
    UploadModule,
    DisputeModule,
    AddressModule,
    FavoriteModule,
    CertificationModule,
    AdminModule,
    ChatModule,
    NotificationModule,
    FcmModule,
    InvoiceModule,
    VatModule,
    ModerationModule,
    VerificationModule,
    FraudModule,
    ComplianceModule,
    CalendarModule,
    AppConfigModule,
    BadgesModule,
    AnalyticsModule,
    ExportModule,
    ReportsModule,
  ],
  providers: [
    LoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
