import { Module } from '@nestjs/common';
import { RecurringController } from './controllers/recurring.controller';
import { RecurringService } from './services/recurring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}
