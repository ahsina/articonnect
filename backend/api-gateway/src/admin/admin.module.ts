import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { CronController } from './controllers/cron.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AdminService } from './services/admin.service';
import { MonitoringService } from './services/monitoring.service';
import { AnalyticsService } from './services/analytics.service';
import { EmailCronService } from './services/email-cron.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { MissionModule } from '../mission/mission.module';
import { RedisModule } from '../common/redis/redis.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [MissionModule, RedisModule, EmailModule],
  controllers: [AdminController, CronController, MonitoringController, AnalyticsController],
  providers: [AdminService, MonitoringService, AnalyticsService, EmailCronService, AuditLogService],
  exports: [AnalyticsService, EmailCronService],
})
export class AdminModule {}
