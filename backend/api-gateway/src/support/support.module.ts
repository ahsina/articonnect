import { Module } from '@nestjs/common';
import { SupportController } from './controllers/support.controller';
import { SupportService } from './services/support.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
