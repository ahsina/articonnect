import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { KycService } from './services/kyc.service';
import { StripeIdentityService } from './services/stripe-identity.service';
import { GdprAdminService } from './services/gdpr-admin.service';
import { KycController } from './controllers/kyc.controller';
import { GdprAdminController } from './controllers/gdpr-admin.controller';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  // forwardRef des deux côtés : PaymentModule ↔ ComplianceModule (dépendance circulaire)
  imports: [PrismaModule, forwardRef(() => PaymentModule), NotificationModule],
  controllers: [KycController, GdprAdminController],
  // StripeIdentityService doit être fourni pour que le vrai KYC Stripe Identity soit utilisé
  // (sinon l'injection optionnelle dans KycService = undefined → fallback mock).
  // AuditLogService : registre RGPD (trace du traitement des demandes de suppression).
  providers: [KycService, StripeIdentityService, GdprAdminService, AuditLogService],
  exports: [KycService],
})
export class ComplianceModule {}
