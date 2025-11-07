import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { StripeController } from './controllers/stripe.controller';
import { UserService } from './services/user.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [UserController, StripeController],
  providers: [UserService, StripeConnectService],
  exports: [UserService, StripeConnectService],
})
export class UserModule {}
