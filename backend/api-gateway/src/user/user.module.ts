import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { StripeController } from './controllers/stripe.controller';
import { AvailabilityController } from './controllers/availability.controller';
import { UserService } from './services/user.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { GdprService } from './services/gdpr.service';
import { AvailabilityService } from './services/availability.service';
import { PaymentModule } from '../payment/payment.module';
import { VerificationModule } from '../verification/verification.module';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [PaymentModule, VerificationModule, FraudModule],
  controllers: [UserController, StripeController, AvailabilityController],
  providers: [UserService, StripeConnectService, GdprService, AvailabilityService],
  exports: [UserService, StripeConnectService, GdprService, AvailabilityService],
})
export class UserModule {}
