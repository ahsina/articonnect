import { Module } from '@nestjs/common';
import { CrmController } from './controllers/crm.controller';
import { CrmService } from './services/crm.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
