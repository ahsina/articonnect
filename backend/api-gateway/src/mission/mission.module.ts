import { Module } from '@nestjs/common';
import { MissionController } from './controllers/mission.controller';
import { MissionService } from './services/mission.service';
import { NegotiationService } from './services/negotiation.service';
import { MissionCronService } from './services/mission-cron.service';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PaymentModule, NotificationModule],
  controllers: [MissionController],
  providers: [MissionService, NegotiationService, MissionCronService],
  exports: [MissionService, MissionCronService],
})
export class MissionModule {}
