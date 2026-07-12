import { Module } from '@nestjs/common';
import { MarketplaceController } from './controllers/marketplace.controller';
import { FavoriteController } from './controllers/favorite.controller';
import { RequestController } from './controllers/request.controller';
import { ReturnController } from './controllers/return.controller';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { FavoriteService } from './services/favorite.service';
import { RequestService } from './services/request.service';
import { ReturnService } from './services/return.service';
import { CategoryService } from './services/category.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  // PaymentModule fournit StripeService (encaissement des commandes marketplace via OrderService).
  // InvoiceModule fournit InvoiceService (facture de vente auto au règlement d'une commande).
  imports: [PrismaModule, AuthModule, PaymentModule, InvoiceModule],
  controllers: [
    MarketplaceController,
    FavoriteController,
    RequestController,
    ReturnController,
  ],
  providers: [
    ProductService,
    OrderService,
    FavoriteService,
    RequestService,
    ReturnService,
    CategoryService,
  ],
  exports: [
    ProductService,
    OrderService,
    FavoriteService,
    RequestService,
    ReturnService,
  ],
})
export class MarketplaceModule {}
