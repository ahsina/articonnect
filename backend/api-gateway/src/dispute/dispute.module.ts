import { Module } from '@nestjs/common';
import { DisputeController } from './controllers/dispute.controller';
import { DisputeService } from './services/dispute.service';
import { DisputeResolutionService } from './services/dispute-resolution.service';
import { NotificationModule } from '../notification/notification.module';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [NotificationModule, FraudModule],
  controllers: [DisputeController],
  providers: [DisputeService, DisputeResolutionService],
  exports: [DisputeService, DisputeResolutionService],
})
export class DisputeModule {}
