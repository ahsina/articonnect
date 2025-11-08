import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { CronController } from './controllers/cron.controller';
import { AdminService } from './services/admin.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [MissionModule],
  controllers: [AdminController, CronController],
  providers: [AdminService, AuditLogService],
})
export class AdminModule {}
