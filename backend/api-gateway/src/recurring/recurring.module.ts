import { Module } from '@nestjs/common';
import { RecurringController } from './controllers/recurring.controller';
import { RecurringService } from './services/recurring.service';
import { RecurringSchedulerService } from './services/recurring-scheduler.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringSchedulerService],
  exports: [RecurringService, RecurringSchedulerService],
})
export class RecurringModule {}
