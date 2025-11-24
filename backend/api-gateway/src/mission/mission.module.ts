import { Module } from '@nestjs/common';
import { MissionController } from './controllers/mission.controller';
import { MissionSearchController } from './controllers/mission-search.controller';
import { MissionTemplateController } from './controllers/mission-template.controller';
import { MissionAssignmentController } from './controllers/mission-assignment.controller';
import { AutoAssignmentController } from './controllers/auto-assignment.controller';
import { MissionService } from './services/mission.service';
import { MissionSearchService } from './services/mission-search.service';
import { MissionTemplateService } from './services/mission-template.service';
import { MissionAssignmentService } from './services/mission-assignment.service';
import { AutoAssignmentService } from './services/auto-assignment.service';
import { MissionCompletionHookService } from './services/mission-completion-hook.service';
import { NegotiationService } from './services/negotiation.service';
import { MissionCronService } from './services/mission-cron.service';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [PaymentModule, NotificationModule, FraudModule],
  controllers: [
    MissionController,
    MissionSearchController,
    MissionTemplateController,
    MissionAssignmentController,
    AutoAssignmentController,
  ],
  providers: [
    MissionService,
    MissionSearchService,
    MissionTemplateService,
    MissionAssignmentService,
    AutoAssignmentService,
    MissionCompletionHookService,
    NegotiationService,
    MissionCronService,
  ],
  exports: [
    MissionService,
    MissionSearchService,
    MissionTemplateService,
    MissionAssignmentService,
    AutoAssignmentService,
    MissionCompletionHookService,
    MissionCronService,
  ],
})
export class MissionModule {}
