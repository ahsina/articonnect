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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { PortfolioService } from '../services/portfolio.service';
import {
  CreatePortfolioDto,
  CreatePortfolioProjectDto,
  UpdatePortfolioProjectDto,
  AddPortfolioPhotoDto,
} from '../dto/portfolio.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @Roles('ARTISAN')
  async getMyPortfolio(@Request() req) {
    return this.portfolioService.getOrCreatePortfolio(req.user.id);
  }

  @Put()
  @Roles('ARTISAN')
  async updatePortfolio(@Request() req, @Body() dto: CreatePortfolioDto) {
    return this.portfolioService.updatePortfolio(req.user.id, dto);
  }

  @Get('public/:artisanId')
  @Public()
  async getPublicPortfolio(@Param('artisanId') artisanId: string) {
    return this.portfolioService.getPublicPortfolio(artisanId);
  }

  @Post('projects')
  @Roles('ARTISAN')
  async createProject(@Request() req, @Body() dto: CreatePortfolioProjectDto) {
    return this.portfolioService.createProject(req.user.id, dto);
  }

  @Get('projects')
  @Roles('ARTISAN')
  async getProjects(@Request() req) {
    return this.portfolioService.getProjects(req.user.id);
  }

  @Get('projects/:id')
  async getProject(@Request() req, @Param('id') id: string) {
    return this.portfolioService.getProject(id, req.user.id);
  }

  @Put('projects/:id')
  @Roles('ARTISAN')
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioProjectDto,
  ) {
    return this.portfolioService.updateProject(id, req.user.id, dto);
  }

  @Delete('projects/:id')
  @Roles('ARTISAN')
  async deleteProject(@Request() req, @Param('id') id: string) {
    return this.portfolioService.deleteProject(id, req.user.id);
  }

  @Post('projects/:projectId/photos')
  @Roles('ARTISAN')
  async addPhoto(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() dto: AddPortfolioPhotoDto,
  ) {
    return this.portfolioService.addPhoto(projectId, req.user.id, dto);
  }

  @Delete('photos/:photoId')
  @Roles('ARTISAN')
  async deletePhoto(@Request() req, @Param('photoId') photoId: string) {
    return this.portfolioService.deletePhoto(photoId, req.user.id);
  }
}
