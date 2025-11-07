import { Module } from '@nestjs/common';
import { MarketplaceController } from './controllers/marketplace.controller';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';

@Module({
  controllers: [MarketplaceController],
  providers: [ProductService, OrderService],
})
export class MarketplaceModule {}
