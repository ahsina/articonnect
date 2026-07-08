import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import { ConfigService } from '../services/config.service';
import { UpdateConfigDto, CreateConfigDto } from '../dto/update-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ConfigCategory } from '@prisma/client';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get public configurations
   * GET /config/public
   */
  @Get('public')
  async getPublicConfigs() {
    return this.configService.getPublicConfigs();
  }

  /**
   * Get all configurations (admin only)
   * GET /config
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllConfigs() {
    return this.configService.getAll();
  }

  /**
   * Get configuration by key (admin only)
   * GET /config/:key
   */
  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getConfig(@Param('key') key: string) {
    return this.configService.get(key);
  }

  /**
   * Get configurations by category (admin only)
   * GET /config/category/:category
   */
  @Get('category/:category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getByCategory(
    @Param('category', new ParseEnumPipe(ConfigCategory)) category: ConfigCategory,
  ) {
    return this.configService.getByCategory(category);
  }

  /**
   * Create new configuration (admin only)
   * POST /config
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createConfig(@Request() req, @Body() dto: CreateConfigDto) {
    return this.configService.create(dto, req.user.userId);
  }

  /**
   * Update configuration (admin only)
   * PUT /config/:key
   */
  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateConfig(
    @Param('key') key: string,
    @Request() req,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.configService.update(key, dto, req.user.userId);
  }

  /**
   * Delete configuration (admin only)
   * DELETE /config/:key
   */
  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteConfig(@Param('key') key: string) {
    return this.configService.delete(key);
  }

  /**
   * Clear configuration cache (admin only)
   * POST /config/cache/clear
   */
  @Post('cache/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async clearCache() {
    return this.configService.clearCache();
  }
}
