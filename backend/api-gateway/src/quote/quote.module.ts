import { Module } from '@nestjs/common';
import { QuoteController } from './controllers/quote.controller';
import { QuoteService } from './services/quote.service';
import { QuoteTemplateService } from './services/quote-template.service';
import { MaterialCatalogService } from './services/material-catalog.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuoteController],
  providers: [QuoteService, QuoteTemplateService, MaterialCatalogService],
  exports: [QuoteService, QuoteTemplateService, MaterialCatalogService],
})
export class QuoteModule {}
