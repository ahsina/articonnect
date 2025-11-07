import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { CreateOrderDto, UpdateOrderStatusDto } from '../dto/order.dto';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('artisanId') artisanId?: string,
  ) {
    return this.productService.findAll({ category, search, artisanId });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(@Request() req, @Body() data: CreateProductDto) {
    return this.productService.create(req.user.userId, data);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(@Param('id') id: string, @Body() data: UpdateProductDto) {
    return this.productService.update(id, data);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async createOrder(@Request() req, @Body() body: CreateOrderDto) {
    return this.orderService.create(req.user.userId, body.items, body.shippingAddress);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async getOrders(@Request() req) {
    return this.orderService.findAll(req.user.userId);
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, body.status);
  }
}
