import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FavoriteService } from '../services/favorite.service';

/**
 * Controller pour la gestion des favoris
 */
@ApiTags('Marketplace - Favorites')
@Controller('marketplace/favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  /**
   * GET /marketplace/favorites
   * Récupérer tous les favoris de l'utilisateur
   */
  @Get()
  @ApiOperation({
    summary: 'Get user favorites',
    description: 'Get all favorites (products and artisans) for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User favorites',
    schema: {
      example: {
        products: [
          {
            id: 'fav-123',
            createdAt: '2025-01-15T10:00:00Z',
            product: {
              id: 'prod-456',
              name: 'Table en chêne massif',
              price: 850,
              category: 'furniture',
              artisan: {
                firstName: 'Pierre',
                lastName: 'Bernard',
              },
            },
          },
        ],
        artisans: [
          {
            id: 'fav-789',
            createdAt: '2025-01-14T15:30:00Z',
            artisan: {
              id: 'art-101',
              firstName: 'Jean',
              lastName: 'Dupont',
              artisanProfile: {
                companyName: 'Plomberie Dupont',
                rating: 4.8,
              },
            },
          },
        ],
        total: 2,
      },
    },
  })
  async getUserFavorites(@Request() req) {
    return this.favoriteService.getUserFavorites(req.user.userId);
  }

  /**
   * GET /marketplace/favorites/products
   * Récupérer uniquement les produits favoris
   */
  @Get('products')
  @ApiOperation({
    summary: 'Get favorite products',
    description: 'Get only product favorites for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Favorite products' })
  async getFavoriteProducts(@Request() req) {
    return this.favoriteService.getFavoriteProducts(req.user.userId);
  }

  /**
   * GET /marketplace/favorites/artisans
   * Récupérer uniquement les artisans favoris
   */
  @Get('artisans')
  @ApiOperation({
    summary: 'Get favorite artisans',
    description: 'Get only artisan favorites for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Favorite artisans' })
  async getFavoriteArtisans(@Request() req) {
    return this.favoriteService.getFavoriteArtisans(req.user.userId);
  }

  /**
   * GET /marketplace/favorites/stats
   * Statistiques des favoris
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get favorites statistics',
    description: 'Get count of favorites by type',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorites statistics',
    schema: {
      example: {
        total: 15,
        products: 10,
        artisans: 5,
      },
    },
  })
  async getFavoritesStats(@Request() req) {
    return this.favoriteService.getFavoritesStats(req.user.userId);
  }

  /**
   * POST /marketplace/favorites/products/:productId
   * Ajouter un produit aux favoris
   */
  @Post('products/:productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add product to favorites',
    description: 'Add a product to user favorites',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 201, description: 'Product added to favorites' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product already in favorites' })
  async addProductFavorite(@Request() req, @Param('productId') productId: string) {
    return this.favoriteService.addProductFavorite(req.user.userId, productId);
  }

  /**
   * POST /marketplace/favorites/artisans/:artisanId
   * Ajouter un artisan aux favoris
   */
  @Post('artisans/:artisanId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add artisan to favorites',
    description: 'Add an artisan to user favorites',
  })
  @ApiParam({ name: 'artisanId', description: 'Artisan ID' })
  @ApiResponse({ status: 201, description: 'Artisan added to favorites' })
  @ApiResponse({ status: 404, description: 'Artisan not found' })
  @ApiResponse({ status: 409, description: 'Artisan already in favorites' })
  async addArtisanFavorite(@Request() req, @Param('artisanId') artisanId: string) {
    return this.favoriteService.addArtisanFavorite(req.user.userId, artisanId);
  }

  /**
   * DELETE /marketplace/favorites/:favoriteId
   * Supprimer un favori
   */
  @Delete(':favoriteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove favorite',
    description: 'Remove a product or artisan from favorites',
  })
  @ApiParam({ name: 'favoriteId', description: 'Favorite ID' })
  @ApiResponse({ status: 200, description: 'Favorite removed successfully' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async removeFavorite(@Request() req, @Param('favoriteId') favoriteId: string) {
    return this.favoriteService.removeFavorite(req.user.userId, favoriteId);
  }

  /**
   * GET /marketplace/favorites/check/product/:productId
   * Vérifier si un produit est en favori
   */
  @Get('check/product/:productId')
  @ApiOperation({
    summary: 'Check if product is favorite',
    description: 'Check if a product is in user favorites',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Check result',
    schema: {
      example: {
        isFavorite: true,
      },
    },
  })
  async checkProductFavorite(@Request() req, @Param('productId') productId: string) {
    const isFavorite = await this.favoriteService.isProductFavorite(
      req.user.userId,
      productId,
    );
    return { isFavorite };
  }

  /**
   * GET /marketplace/favorites/check/artisan/:artisanId
   * Vérifier si un artisan est en favori
   */
  @Get('check/artisan/:artisanId')
  @ApiOperation({
    summary: 'Check if artisan is favorite',
    description: 'Check if an artisan is in user favorites',
  })
  @ApiParam({ name: 'artisanId', description: 'Artisan ID' })
  @ApiResponse({
    status: 200,
    description: 'Check result',
    schema: {
      example: {
        isFavorite: false,
      },
    },
  })
  async checkArtisanFavorite(@Request() req, @Param('artisanId') artisanId: string) {
    const isFavorite = await this.favoriteService.isArtisanFavorite(
      req.user.userId,
      artisanId,
    );
    return { isFavorite };
  }
}
