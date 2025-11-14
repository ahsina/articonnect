import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { ReputationController } from './controllers/reputation.controller';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';
import { ReputationService } from './services/reputation.service';
import { NoShowService } from './services/no-show.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [
    PaymentController,
    ReputationController,
  ],
  providers: [
    PaymentService,
    StripeService,
    ReputationService,
    NoShowService,
  ],
  exports: [
    PaymentService,
    StripeService,
    ReputationService,
    NoShowService,
  ],
})
export class PaymentModule {}
