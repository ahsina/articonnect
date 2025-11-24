import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { ReputationController } from './controllers/reputation.controller';
import { EmployeeEarningsController } from './controllers/employee-earnings.controller';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';
import { PaypalService } from './services/paypal.service';
import { BankTransferService } from './services/bank-transfer.service';
import { ReputationService } from './services/reputation.service';
import { NoShowService } from './services/no-show.service';
import { CurrencyService } from './services/currency.service';
import { DeferredPaymentService } from './services/deferred-payment.service';
import { PaymentCronService } from './services/payment-cron.service';
import { EmployeeEarningsService } from './services/employee-earnings.service';
import { NotificationModule } from '../notification/notification.module';
import { FraudModule } from '../fraud/fraud.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [NotificationModule, FraudModule, forwardRef(() => ComplianceModule)],
  controllers: [
    PaymentController,
    ReputationController,
    EmployeeEarningsController,
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
    EmployeeEarningsService,
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
    EmployeeEarningsService,
  ],
})
export class PaymentModule {}
