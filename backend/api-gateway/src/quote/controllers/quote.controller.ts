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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { QuoteService } from '../services/quote.service';
import { QuoteTemplateService } from '../services/quote-template.service';
import { MaterialCatalogService } from '../services/material-catalog.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  SendQuoteDto,
  RespondToQuoteDto,
  QuoteFilterDto,
  CreateQuoteTemplateDto,
  CreateMaterialCatalogItemDto,
} from '../dto/quote.dto';

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly templateService: QuoteTemplateService,
    private readonly catalogService: MaterialCatalogService,
  ) {}

  // ============ QUOTES ============

  @Post()
  @Roles('ARTISAN')
  async create(@Request() req, @Body() dto: CreateQuoteDto) {
    return this.quoteService.create(req.user.id, dto);
  }

  @Get()
  @Roles('ARTISAN')
  async findAll(@Request() req, @Query() filters: QuoteFilterDto) {
    return this.quoteService.findAll(req.user.id, filters);
  }

  @Get('stats')
  @Roles('ARTISAN')
  async getStats(@Request() req) {
    return this.quoteService.getStats(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.quoteService.findOne(id, req.user.id);
  }

  @Put(':id')
  @Roles('ARTISAN')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quoteService.update(id, req.user.id, dto);
  }

  @Post(':id/send')
  @Roles('ARTISAN')
  async send(@Request() req, @Param('id') id: string, @Body() dto: SendQuoteDto) {
    return this.quoteService.send(id, req.user.id, dto);
  }

  @Post(':id/view')
  @Roles('CLIENT')
  async markViewed(@Request() req, @Param('id') id: string) {
    return this.quoteService.markViewed(id, req.user.id);
  }

  @Post(':id/respond')
  @Roles('CLIENT')
  async respond(@Request() req, @Param('id') id: string, @Body() dto: RespondToQuoteDto) {
    return this.quoteService.respond(id, req.user.id, dto);
  }

  @Post(':id/new-version')
  @Roles('ARTISAN')
  async createNewVersion(@Request() req, @Param('id') id: string) {
    return this.quoteService.createNewVersion(id, req.user.id);
  }

  @Delete(':id')
  @Roles('ARTISAN')
  async delete(@Request() req, @Param('id') id: string) {
    return this.quoteService.delete(id, req.user.id);
  }

  // ============ TEMPLATES ============

  @Post('templates')
  @Roles('ARTISAN')
  async createTemplate(@Request() req, @Body() dto: CreateQuoteTemplateDto) {
    return this.templateService.create(req.user.id, dto);
  }

  @Get('templates')
  @Roles('ARTISAN')
  async getTemplates(@Request() req) {
    return this.templateService.findAll(req.user.id);
  }

  @Get('templates/:id')
  @Roles('ARTISAN')
  async getTemplate(@Request() req, @Param('id') id: string) {
    return this.templateService.findOne(id, req.user.id);
  }

  @Put('templates/:id')
  @Roles('ARTISAN')
  async updateTemplate(@Request() req, @Param('id') id: string, @Body() dto: CreateQuoteTemplateDto) {
    return this.templateService.update(id, req.user.id, dto);
  }

  @Delete('templates/:id')
  @Roles('ARTISAN')
  async deleteTemplate(@Request() req, @Param('id') id: string) {
    return this.templateService.delete(id, req.user.id);
  }

  // ============ MATERIAL CATALOG ============

  @Post('catalog')
  @Roles('ARTISAN')
  async createCatalogItem(@Request() req, @Body() dto: CreateMaterialCatalogItemDto) {
    return this.catalogService.create(req.user.id, dto);
  }

  @Get('catalog')
  @Roles('ARTISAN')
  async getCatalogItems(@Request() req, @Query('category') category?: string, @Query('trade') trade?: string) {
    return this.catalogService.findAll(req.user.id, category, trade);
  }

  @Get('catalog/:id')
  @Roles('ARTISAN')
  async getCatalogItem(@Request() req, @Param('id') id: string) {
    return this.catalogService.findOne(id, req.user.id);
  }

  @Put('catalog/:id')
  @Roles('ARTISAN')
  async updateCatalogItem(@Request() req, @Param('id') id: string, @Body() dto: CreateMaterialCatalogItemDto) {
    return this.catalogService.update(id, req.user.id, dto);
  }

  @Delete('catalog/:id')
  @Roles('ARTISAN')
  async deleteCatalogItem(@Request() req, @Param('id') id: string) {
    return this.catalogService.delete(id, req.user.id);
  }
}
