import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import {
  CreateArticleDto,
  UpdateArticleDto,
  ArticleTranslationDto,
  ArticleFilterDto,
  ArticleFeedbackDto,
  SearchQueryDto,
  BulkUpdateStatusDto,
  TargetAudience,
} from '../dto/knowledge-base.dto';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  // Public endpoints (with optional auth for personalization)
  @Get('articles')
  @UseGuards(OptionalJwtAuthGuard)
  async findAllArticles(@Request() req, @Query() filters: ArticleFilterDto) {
    return this.kbService.findAllArticles(filters, req.user?.id);
  }

  @Get('articles/:idOrSlug')
  @UseGuards(OptionalJwtAuthGuard)
  async findArticleById(@Request() req, @Param('idOrSlug') idOrSlug: string) {
    return this.kbService.findArticleById(idOrSlug, req.user?.id);
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  async search(@Request() req, @Query() query: SearchQueryDto) {
    return this.kbService.search(query, req.user?.id);
  }

  @Get('categories')
  async getCategories() {
    return this.kbService.getCategories();
  }

  @Get('tags')
  async getPopularTags(@Query('limit') limit?: number) {
    return this.kbService.getPopularTags(limit);
  }

  @Get('featured')
  async getFeaturedArticles(
    @Query('audience') audience?: TargetAudience,
    @Query('limit') limit?: number,
  ) {
    return this.kbService.getFeaturedArticles(audience, limit);
  }

  @Get('recent')
  async getRecentlyUpdated(@Query('limit') limit?: number) {
    return this.kbService.getRecentlyUpdated(limit);
  }

  @Post('articles/:id/feedback')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ArticleFeedbackDto,
  ) {
    return this.kbService.submitFeedback(id, req.user?.id, dto);
  }

  // Admin endpoints
  @Post('articles')
  @UseGuards(JwtAuthGuard)
  async createArticle(@Request() req, @Body() dto: CreateArticleDto) {
    return this.kbService.createArticle(req.user.id, dto);
  }

  @Put('articles/:id')
  @UseGuards(JwtAuthGuard)
  async updateArticle(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.kbService.updateArticle(id, req.user.id, dto);
  }

  @Delete('articles/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteArticle(@Request() req, @Param('id') id: string) {
    return this.kbService.deleteArticle(id, req.user.id);
  }

  @Post('articles/:id/publish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async publishArticle(@Request() req, @Param('id') id: string) {
    return this.kbService.publishArticle(id, req.user.id);
  }

  @Post('articles/:id/unpublish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unpublishArticle(@Request() req, @Param('id') id: string) {
    return this.kbService.unpublishArticle(id, req.user.id);
  }

  @Post('articles/:id/archive')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async archiveArticle(@Request() req, @Param('id') id: string) {
    return this.kbService.archiveArticle(id, req.user.id);
  }

  @Post('articles/:id/translations')
  @UseGuards(JwtAuthGuard)
  async addTranslation(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ArticleTranslationDto,
  ) {
    return this.kbService.addTranslation(id, req.user.id, dto);
  }

  @Delete('articles/:id/translations/:locale')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeTranslation(
    @Request() req,
    @Param('id') id: string,
    @Param('locale') locale: string,
  ) {
    return this.kbService.removeTranslation(id, locale, req.user.id);
  }

  @Post('bulk/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(@Request() req, @Body() dto: BulkUpdateStatusDto) {
    return this.kbService.bulkUpdateStatus(req.user.id, dto);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kbService.getAnalytics(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
