import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
  ) {}

  @Get('products')
  async getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.productService.findAll({ category, search });
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createProduct(@Request() req, @Body() data: any) {
    return this.productService.create(req.user.userId, data);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createOrder(@Request() req, @Body() body: any) {
    return this.orderService.create(
      req.user.userId,
      body.items,
      body.shippingAddress,
    );
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getOrders(@Request() req) {
    return this.orderService.findAll(req.user.userId);
  }
}
