import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { CronController } from './controllers/cron.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { AdminService } from './services/admin.service';
import { MonitoringService } from './services/monitoring.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [MissionModule],
  controllers: [AdminController, CronController, MonitoringController],
  providers: [AdminService, MonitoringService, AuditLogService],
})
export class AdminModule {}
