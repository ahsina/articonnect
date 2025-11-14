import { Module } from '@nestjs/common';
import { MissionController } from './controllers/mission.controller';
import { MissionSearchController } from './controllers/mission-search.controller';
import { MissionTemplateController } from './controllers/mission-template.controller';
import { MissionService } from './services/mission.service';
import { MissionSearchService } from './services/mission-search.service';
import { MissionTemplateService } from './services/mission-template.service';
import { NegotiationService } from './services/negotiation.service';
import { MissionCronService } from './services/mission-cron.service';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PaymentModule, NotificationModule],
  controllers: [MissionController, MissionSearchController, MissionTemplateController],
  providers: [MissionService, MissionSearchService, MissionTemplateService, NegotiationService, MissionCronService],
  exports: [MissionService, MissionSearchService, MissionTemplateService, MissionCronService],
})
export class MissionModule {}
