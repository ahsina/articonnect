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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MissionTemplateService, CreateTemplateDto } from '../services/mission-template.service';

@ApiTags('Mission Templates')
@Controller('mission-templates')
export class MissionTemplateController {
  constructor(private readonly templateService: MissionTemplateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new mission template' })
  async createTemplate(@Request() req, @Body() dto: CreateTemplateDto) {
    const template = await this.templateService.createTemplate(req.user.userId, dto);
    return { template };
  }

  @Get()
  @ApiOperation({ summary: 'Get all available templates (public + user\'s private)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'userId', required: false, description: 'Include user\'s private templates' })
  async getTemplates(
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    const templates = await this.templateService.getTemplates(userId, category);
    return { templates };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular templates by usage' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of templates (default: 10)' })
  async getPopularTemplates(@Query('limit') limit?: string) {
    const templates = await this.templateService.getPopularTemplates(
      limit ? parseInt(limit, 10) : 10,
    );
    return { templates };
  }

  @Get('my-templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s templates' })
  async getMyTemplates(@Request() req) {
    const templates = await this.templateService.getUserTemplates(req.user.userId);
    return { templates };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific template by ID' })
  async getTemplate(@Request() req, @Param('id') id: string) {
    // IDOR fix : l'identité de contrôle d'accès vient du JWT, jamais d'un query param.
    const template = await this.templateService.getTemplate(id, req.user.userId);
    return { template };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a template (owner only)' })
  async updateTemplate(
    @Param('id') id: string,
    @Request() req,
    @Body() updates: Partial<CreateTemplateDto>,
  ) {
    const template = await this.templateService.updateTemplate(
      id,
      req.user.userId,
      updates,
    );
    return { template };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a template (owner only)' })
  async deleteTemplate(@Param('id') id: string, @Request() req) {
    await this.templateService.deleteTemplate(id, req.user.userId);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/use')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a mission from a template' })
  async createFromTemplate(
    @Param('id') id: string,
    @Request() req,
    @Body() customizations?: any,
  ) {
    const missionData = await this.templateService.createMissionFromTemplate(
      id,
      req.user.userId,
      customizations,
    );
    return { missionData };
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a template (creates personal copy)' })
  async duplicateTemplate(
    @Param('id') id: string,
    @Request() req,
    @Body('newName') newName?: string,
  ) {
    const template = await this.templateService.duplicateTemplate(
      id,
      req.user.userId,
      newName,
    );
    return { template };
  }
}
