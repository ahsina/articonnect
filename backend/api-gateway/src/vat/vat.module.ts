import { Module } from '@nestjs/common';
import { VatService } from './vat.service';
import { VatController } from './vat.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VatController],
  providers: [VatService],
  exports: [VatService],
})
export class VatModule {}
