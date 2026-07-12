import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { CategoryService } from '../services/category.service';
import { CreateProductDto, UpdateProductDto, CreateProductReviewDto, ReplyProductReviewDto } from '../dto/product.dto';
import { CreateVariantDto, UpdateVariantDto } from '../dto/variant.dto';
import { CreateOrderDto, UpdateOrderStatusDto, ShipOrderDto } from '../dto/order.dto';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { UpdateShippingPolicyDto } from '../dto/shipping-policy.dto';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly categoryService: CategoryService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'List product categories' })
  async getCategories(@Query('tree') tree?: string) {
    return tree === 'true'
      ? this.categoryService.getTree()
      : this.categoryService.findAll();
  }

  // ==================== CATEGORIES (ADMIN) ====================
  // Gestion CRUD réservée aux administrateurs. Le GET public ci-dessus ne renvoie
  // que les catégories actives ; l'admin a besoin de voir aussi les désactivées.

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister toutes les catégories (actives + désactivées) — admin' })
  @ApiResponse({ status: 200, description: 'Liste complète des catégories' })
  async getAllCategoriesAdmin() {
    return this.categoryService.findAll(true);
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une catégorie produit — admin' })
  @ApiResponse({ status: 201, description: 'Catégorie créée' })
  @ApiResponse({ status: 409, description: 'Slug déjà utilisé' })
  async createCategory(@Body() data: CreateCategoryDto) {
    return this.categoryService.create(data);
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une catégorie (dont activer/désactiver) — admin' })
  @ApiResponse({ status: 200, description: 'Catégorie mise à jour' })
  @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
  @ApiResponse({ status: 409, description: 'Slug déjà utilisé' })
  async updateCategory(@Param('id') id: string, @Body() data: UpdateCategoryDto) {
    return this.categoryService.update(id, data);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Supprimer une catégorie — admin (désactivation si elle contient des produits)',
  })
  @ApiResponse({ status: 200, description: 'Catégorie supprimée ou désactivée' })
  @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
  @ApiResponse({ status: 409, description: 'Contient des sous-catégories actives' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products with advanced filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  async getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('artisanId') artisanId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('minRating') minRating?: number,
    @Query('sortBy') sortBy?: 'price' | 'rating' | 'newest' | 'popular',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productService.findAll({
      category,
      search,
      artisanId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      sortBy,
      sortOrder,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });
  }

  // ⚠️ Doit être déclaré AVANT `products/:id` sinon "mine" serait capturé comme un :id.
  @Get('products/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes produits (vendeur) — tous statuts (DRAFT/ACTIVE/INACTIVE)' })
  @ApiResponse({ status: 200, description: 'Produits de l\'artisan connecté' })
  async getMyProducts(@Request() req) {
    return this.productService.getMyProducts(req.user.userId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(@Request() req, @Body() data: CreateProductDto) {
    return this.productService.create(req.user.userId, data);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(@Request() req, @Param('id') id: string, @Body() data: UpdateProductDto) {
    return this.productService.update(id, req.user.userId, data);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async deleteProduct(@Request() req, @Param('id') id: string) {
    return this.productService.delete(id, req.user.userId);
  }

  // ==================== PRODUCT VARIANTS ====================

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product variant' })
  @ApiResponse({ status: 201, description: 'Variant created' })
  async createVariant(
    @Request() req,
    @Param('productId') productId: string,
    @Body() data: CreateVariantDto,
  ) {
    return this.productService.createVariant(productId, req.user.userId, data);
  }

  @Get('products/:productId/variants')
  @ApiOperation({ summary: 'Get product variants' })
  @ApiResponse({ status: 200, description: 'List of variants' })
  async getVariants(@Param('productId') productId: string) {
    return this.productService.getVariants(productId);
  }

  @Get('variants/:variantId')
  @ApiOperation({ summary: 'Get variant details' })
  @ApiResponse({ status: 200, description: 'Variant details' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async getVariant(@Param('variantId') variantId: string) {
    return this.productService.getVariant(variantId);
  }

  @Patch('variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product variant' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async updateVariant(
    @Request() req,
    @Param('variantId') variantId: string,
    @Body() data: UpdateVariantDto,
  ) {
    return this.productService.updateVariant(variantId, req.user.userId, data);
  }

  @Delete('variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product variant' })
  @ApiResponse({ status: 200, description: 'Variant deleted' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async deleteVariant(@Request() req, @Param('variantId') variantId: string) {
    return this.productService.deleteVariant(variantId, req.user.userId);
  }

  // ==================== PRODUCT REVIEWS ====================

  @Post('products/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave (or update) a review on a purchased product' })
  @ApiResponse({ status: 201, description: 'Review created/updated' })
  @ApiResponse({ status: 403, description: 'Product not purchased by the user' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async createProductReview(
    @Request() req,
    @Param('id') id: string,
    @Body() data: CreateProductReviewDto,
  ) {
    return this.productService.createProductReview(req.user.userId, id, data);
  }

  @Get('products/:id/reviews')
  @ApiOperation({ summary: 'Get reviews of a product' })
  @ApiResponse({ status: 200, description: 'List of product reviews' })
  async getProductReviews(@Param('id') id: string) {
    return this.productService.getProductReviews(id);
  }

  @Post('products/:id/reviews/:reviewId/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seller reply to a product review (owner only)' })
  @ApiResponse({ status: 201, description: 'Reply posted' })
  @ApiResponse({ status: 403, description: 'Not the product owner' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async replyToReview(
    @Request() req,
    @Param('id') id: string,
    @Param('reviewId') reviewId: string,
    @Body() data: ReplyProductReviewDto,
  ) {
    return this.productService.replyToReview(id, reviewId, req.user.userId, data);
  }

  // ==================== SELLER (VENDEUR) ====================

  @Get('seller/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes commandes vendeur (contenant mes produits)' })
  @ApiResponse({ status: 200, description: 'Ventes de l\'artisan connecté' })
  async getSellerOrders(@Request() req) {
    return this.orderService.getSellerOrders(req.user.userId);
  }

  @Get('seller/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques de vente (CA, commandes, top produits)' })
  @ApiResponse({ status: 200, description: 'Stats vendeur' })
  async getSellerStats(@Request() req) {
    return this.orderService.getSellerStats(req.user.userId);
  }

  // ==================== VENDEUR : FRAIS DE PORT (ShippingPolicy) ====================

  @Get('shipping-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ma politique de frais de port (ou défauts 5,99 € si absente)' })
  @ApiResponse({ status: 200, description: 'Politique de frais de port du vendeur' })
  async getShippingPolicy(@Request() req) {
    return this.orderService.getShippingPolicy(req.user.userId);
  }

  @Put('shipping-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer / mettre à jour ma politique de frais de port (upsert)' })
  @ApiResponse({ status: 200, description: 'Politique de frais de port enregistrée' })
  async putShippingPolicy(@Request() req, @Body() data: UpdateShippingPolicyDto) {
    return this.orderService.upsertShippingPolicy(req.user.userId, data);
  }

  @Post('shipping-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer / mettre à jour ma politique de frais de port (upsert, alias POST)' })
  @ApiResponse({ status: 201, description: 'Politique de frais de port enregistrée' })
  async postShippingPolicy(@Request() req, @Body() data: UpdateShippingPolicyDto) {
    return this.orderService.upsertShippingPolicy(req.user.userId, data);
  }

  // ==================== ORDERS ====================

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

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.findOne(id, req.user.userId);
  }

  @Post('orders/:id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay an order (client checkout): PENDING -> PAID + stock reservation' })
  @ApiResponse({ status: 201, description: 'Order paid' })
  async payOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.payOrder(id, req.user.userId);
  }

  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Annuler MA commande (client) — remboursement Stripe si déjà payée, tant qu’elle n’est pas expédiée',
  })
  @ApiResponse({ status: 200, description: 'Commande annulée (PENDING) ou remboursée (PAID -> REFUNDED)' })
  @ApiResponse({ status: 400, description: 'Commande déjà en préparation / expédiée : annulation impossible' })
  @ApiResponse({ status: 404, description: 'Commande introuvable (ou n’appartenant pas au client)' })
  async cancelOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.cancelByClient(id, req.user.userId);
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (seller): PAID->PROCESSING->SHIPPED->DELIVERED' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(@Request() req, @Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, req.user.userId, body.status, body.trackingNumber);
  }

  @Post('orders/:id/ship')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark order as shipped (seller) + tracking number' })
  @ApiResponse({ status: 200, description: 'Order shipped' })
  async shipOrder(@Request() req, @Param('id') id: string, @Body() body: ShipOrderDto) {
    return this.orderService.shipOrder(id, req.user.userId, body.trackingNumber);
  }
}
