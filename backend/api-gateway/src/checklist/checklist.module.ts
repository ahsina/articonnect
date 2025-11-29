import { Module } from '@nestjs/common';
import { ChecklistController } from './controllers/checklist.controller';
import { ChecklistService } from './services/checklist.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChecklistController],
  providers: [ChecklistService],
  exports: [ChecklistService],
})
export class ChecklistModule {}
