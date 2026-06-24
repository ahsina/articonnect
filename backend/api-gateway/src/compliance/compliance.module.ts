import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { KycService } from './services/kyc.service';
import { StripeIdentityService } from './services/stripe-identity.service';
import { KycController } from './controllers/kyc.controller';

@Module({
  // forwardRef des deux côtés : PaymentModule ↔ ComplianceModule (dépendance circulaire)
  imports: [PrismaModule, forwardRef(() => PaymentModule), NotificationModule],
  controllers: [KycController],
  // StripeIdentityService doit être fourni pour que le vrai KYC Stripe Identity soit utilisé
  // (sinon l'injection optionnelle dans KycService = undefined → fallback mock).
  providers: [KycService, StripeIdentityService],
  exports: [KycService],
})
export class ComplianceModule {}
