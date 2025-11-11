import { Module } from '@nestjs/common';
import { MarketplaceController } from './controllers/marketplace.controller';
import { FavoriteController } from './controllers/favorite.controller';
import { RequestController } from './controllers/request.controller';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { FavoriteService } from './services/favorite.service';
import { RequestService } from './services/request.service';

@Module({
  controllers: [
    MarketplaceController,
    FavoriteController,
    RequestController,
  ],
  providers: [
    ProductService,
    OrderService,
    FavoriteService,
    RequestService,
  ],
  exports: [
    ProductService,
    OrderService,
    FavoriteService,
    RequestService,
  ],
})
export class MarketplaceModule {}
