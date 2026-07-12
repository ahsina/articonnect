import { Module } from '@nestjs/common';
import { QuoteController } from './controllers/quote.controller';
import { SignatureController } from './controllers/signature.controller';
import { QuoteService } from './services/quote.service';
import { QuoteTemplateService } from './services/quote-template.service';
import { MaterialCatalogService } from './services/material-catalog.service';
import { SignatureService } from './services/signature.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { InvoiceModule } from '../invoice/invoice.module';
// Générateur PDF PROUVÉ des devis (libellé DEVIS, remise, CGV, mentions légales) : réutilisé tel
// quel pour GET /quotes/:id/pdf. PdfService ne dépend que de PrismaService → fourni ici sans
// modifier le module documents (instance stateless, même connexion Prisma).
import { PdfService } from '../documents/services/pdf.service';

@Module({
  imports: [PrismaModule, NotificationModule, InvoiceModule],
  controllers: [QuoteController, SignatureController],
  providers: [QuoteService, QuoteTemplateService, MaterialCatalogService, SignatureService, PdfService],
  exports: [QuoteService, QuoteTemplateService, MaterialCatalogService, SignatureService],
})
export class QuoteModule {}
