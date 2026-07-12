import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { SupportService } from '../services/support.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AddTicketMessageDto,
  RateTicketDto,
  TicketFilterDto,
  AdminTicketFilterDto,
  CreateArticleDto,
  UpdateArticleDto,
} from '../dto/support.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ============ TICKETS ============

  // Inbox opérateur : liste GLOBALE de tous les tickets (ADMIN uniquement).
  // Déclarée AVANT `@Get('tickets/:id')` : 'admin/tickets' est un chemin distinct, mais on la
  // place en tête par clarté (l'inbox est le point d'entrée admin).
  @Get('admin/tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllTickets(@Query() filters: AdminTicketFilterDto) {
    return this.supportService.getAllTickets(filters);
  }

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  async createTicket(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.id, dto);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  async getMyTickets(@Request() req, @Query() filters: TicketFilterDto) {
    return this.supportService.getMyTickets(req.user.id, filters);
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  async getTicket(@Request() req, @Param('id') id: string) {
    return this.supportService.getTicket(id, req.user.id);
  }

  @Put('tickets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateTicket(@Request() req, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.updateTicket(id, req.user.id, dto);
  }

  @Post('tickets/:id/messages')
  @UseGuards(JwtAuthGuard)
  async addMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
  ) {
    return this.supportService.addMessage(id, req.user.id, dto);
  }

  @Post('tickets/:id/rate')
  @UseGuards(JwtAuthGuard)
  async rateTicket(@Request() req, @Param('id') id: string, @Body() dto: RateTicketDto) {
    return this.supportService.rateTicket(id, req.user.id, dto.rating);
  }

  @Post('tickets/:id/reopen')
  @UseGuards(JwtAuthGuard)
  async reopenTicket(@Request() req, @Param('id') id: string) {
    return this.supportService.reopenTicket(id, req.user.id);
  }

  // ============ KNOWLEDGE BASE ============

  @Get('articles')
  @Public()
  async getArticles(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
  ) {
    return this.supportService.getArticles(category, search, locale);
  }

  @Get('articles/:slug')
  @Public()
  async getArticle(@Param('slug') slug: string) {
    return this.supportService.getArticle(slug);
  }

  @Post('articles/:slug/helpful')
  @Public()
  async markArticleHelpful(@Param('slug') slug: string, @Body('helpful') helpful: boolean) {
    return this.supportService.markArticleHelpful(slug, helpful);
  }

  // Admin endpoints

  @Post('articles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createArticle(@Request() req, @Body() dto: CreateArticleDto) {
    return this.supportService.createArticle(req.user.id, dto);
  }

  @Put('articles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.supportService.updateArticle(id, dto);
  }
}
