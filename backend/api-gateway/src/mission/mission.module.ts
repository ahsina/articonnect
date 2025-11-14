import { Module } from '@nestjs/common';
import { MissionController } from './controllers/mission.controller';
import { MissionSearchController } from './controllers/mission-search.controller';
import { MissionService } from './services/mission.service';
import { MissionSearchService } from './services/mission-search.service';
import { NegotiationService } from './services/negotiation.service';
import { MissionCronService } from './services/mission-cron.service';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PaymentModule, NotificationModule],
  controllers: [MissionController, MissionSearchController],
  providers: [MissionService, MissionSearchService, NegotiationService, MissionCronService],
  exports: [MissionService, MissionSearchService, MissionCronService],
})
export class MissionModule {}
