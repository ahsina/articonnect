import { Module } from '@nestjs/common';
import { SubcontractorController } from './controllers/subcontractor.controller';
import { SubcontractorService } from './services/subcontractor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubcontractorController],
  providers: [SubcontractorService],
  exports: [SubcontractorService],
})
export class SubcontractorModule {}
