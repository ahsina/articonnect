import { Module } from '@nestjs/common';
import { QuoteController } from './controllers/quote.controller';
import { SignatureController } from './controllers/signature.controller';
import { QuoteService } from './services/quote.service';
import { QuoteTemplateService } from './services/quote-template.service';
import { MaterialCatalogService } from './services/material-catalog.service';
import { SignatureService } from './services/signature.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuoteController, SignatureController],
  providers: [QuoteService, QuoteTemplateService, MaterialCatalogService, SignatureService],
  exports: [QuoteService, QuoteTemplateService, MaterialCatalogService, SignatureService],
})
export class QuoteModule {}
