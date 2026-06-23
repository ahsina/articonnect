import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { KycService } from './services/kyc.service';
import { KycController } from './controllers/kyc.controller';

@Module({
  // forwardRef des deux côtés : PaymentModule ↔ ComplianceModule (dépendance circulaire)
  imports: [PrismaModule, forwardRef(() => PaymentModule)],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class ComplianceModule {}
