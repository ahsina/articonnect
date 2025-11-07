import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FavoriteService } from '../services/favorite.service';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post('artisans/:artisanId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add artisan to favorites' })
  @ApiResponse({ status: 201, description: 'Artisan added to favorites' })
  async addFavorite(@Request() req, @Param('artisanId') artisanId: string) {
    return this.favoriteService.addFavorite(req.user.userId, artisanId);
  }

  @Delete('artisans/:artisanId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove artisan from favorites' })
  @ApiResponse({ status: 200, description: 'Artisan removed from favorites' })
  async removeFavorite(@Request() req, @Param('artisanId') artisanId: string) {
    return this.favoriteService.removeFavorite(req.user.userId, artisanId);
  }

  @Get('artisans')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all favorite artisans' })
  @ApiResponse({ status: 200, description: 'List of favorite artisans' })
  async getFavorites(@Request() req) {
    return this.favoriteService.getFavorites(req.user.userId);
  }

  @Get('artisans/:artisanId/check')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if artisan is in favorites' })
  @ApiResponse({ status: 200, description: 'Favorite status' })
  async isFavorite(@Request() req, @Param('artisanId') artisanId: string) {
    return this.favoriteService.isFavorite(req.user.userId, artisanId);
  }
}
