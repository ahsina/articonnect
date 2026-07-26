import { Module } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { InvoiceController } from './controllers/invoice.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { VatModule } from '../vat/vat.module';

@Module({
  imports: [PrismaModule, UploadModule, VatModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, PdfGeneratorService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
