import { Module } from '@nestjs/common';
import { SubcontractorController } from './controllers/subcontractor.controller';
import { SubcontractorPortalController } from './controllers/subcontractor-portal.controller';
import { SubcontractorService } from './services/subcontractor.service';
import { SubcontractorPortalService } from './services/subcontractor-portal.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  // PaymentModule expose StripeService (versement Connect réel du sous-traitant à la clôture).
  // On appelle uniquement ses méthodes existantes (createTransfer) — aucun fichier payment/* modifié.
  imports: [PrismaModule, PaymentModule],
  controllers: [SubcontractorController, SubcontractorPortalController],
  providers: [SubcontractorService, SubcontractorPortalService],
  exports: [SubcontractorService, SubcontractorPortalService],
})
export class SubcontractorModule {}
