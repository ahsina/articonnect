import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { FecExportService } from './services/fec-export.service';

@Module({
  controllers: [AccountingController],
  providers: [FecExportService],
  exports: [FecExportService],
})
export class AccountingModule {}
