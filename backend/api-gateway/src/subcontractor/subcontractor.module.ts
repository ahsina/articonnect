import { Module } from '@nestjs/common';
import { SubcontractorController } from './controllers/subcontractor.controller';
import { SubcontractorPortalController } from './controllers/subcontractor-portal.controller';
import { SubcontractorService } from './services/subcontractor.service';
import { SubcontractorPortalService } from './services/subcontractor-portal.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubcontractorController, SubcontractorPortalController],
  providers: [SubcontractorService, SubcontractorPortalService],
  exports: [SubcontractorService, SubcontractorPortalService],
})
export class SubcontractorModule {}
