import { Module } from '@nestjs/common';
import { DisputeController } from './controllers/dispute.controller';
import { DisputeService } from './services/dispute.service';
import { DisputeResolutionService } from './services/dispute-resolution.service';
import { NotificationModule } from '../notification/notification.module';
import { FraudModule } from '../fraud/fraud.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [NotificationModule, FraudModule, PaymentModule],
  controllers: [DisputeController],
  providers: [DisputeService, DisputeResolutionService],
  exports: [DisputeService, DisputeResolutionService],
})
export class DisputeModule {}
