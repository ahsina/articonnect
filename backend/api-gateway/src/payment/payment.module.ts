import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { ReputationController } from './controllers/reputation.controller';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';
import { PaypalService } from './services/paypal.service';
import { BankTransferService } from './services/bank-transfer.service';
import { ReputationService } from './services/reputation.service';
import { NoShowService } from './services/no-show.service';
import { CurrencyService } from './services/currency.service';
import { DeferredPaymentService } from './services/deferred-payment.service';
import { PaymentCronService } from './services/payment-cron.service';
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
    PaypalService,
    BankTransferService,
    ReputationService,
    NoShowService,
    CurrencyService,
    DeferredPaymentService,
    PaymentCronService,
  ],
  exports: [
    PaymentService,
    StripeService,
    PaypalService,
    BankTransferService,
    ReputationService,
    NoShowService,
    CurrencyService,
    DeferredPaymentService,
    PaymentCronService,
  ],
})
export class PaymentModule {}
