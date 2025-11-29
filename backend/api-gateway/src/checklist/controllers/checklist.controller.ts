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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChecklistService } from '../services/checklist.service';
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  CreateChecklistInstanceDto,
  UpdateChecklistInstanceDto,
  CompleteChecklistDto,
  ChecklistFilterDto,
  InstanceFilterDto,
  CloneTemplateDto,
  AddPhotoDto,
  ChecklistCategory,
} from '../dto/checklist.dto';

@Controller('checklists')
@UseGuards(JwtAuthGuard)
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  // Template Endpoints
  @Post('templates')
  async createTemplate(@Request() req, @Body() dto: CreateChecklistTemplateDto) {
    return this.checklistService.createTemplate(req.user.id, dto);
  }

  @Get('templates')
  async findAllTemplates(@Request() req, @Query() filters: ChecklistFilterDto) {
    return this.checklistService.findAllTemplates(req.user.id, filters);
  }

  @Get('templates/global')
  async getGlobalTemplates(@Query('category') category?: ChecklistCategory) {
    return this.checklistService.getGlobalTemplates(category);
  }

  @Get('templates/:id')
  async findTemplateById(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checklistService.findTemplateById(id, req.user.id);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistTemplateDto,
  ) {
    return this.checklistService.updateTemplate(id, req.user.id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.checklistService.deleteTemplate(id, req.user.id);
  }

  @Post('templates/:id/clone')
  async cloneTemplate(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneTemplateDto,
  ) {
    return this.checklistService.cloneTemplate(id, req.user.id, dto);
  }

  // Instance Endpoints
  @Post('instances')
  async createInstance(@Request() req, @Body() dto: CreateChecklistInstanceDto) {
    return this.checklistService.createInstance(req.user.id, dto);
  }

  @Get('instances')
  async findAllInstances(@Request() req, @Query() filters: InstanceFilterDto) {
    return this.checklistService.findAllInstances(req.user.id, filters);
  }

  @Get('instances/mission/:missionId')
  async findInstancesByMission(
    @Request() req,
    @Param('missionId', ParseUUIDPipe) missionId: string,
  ) {
    return this.checklistService.findInstancesByMission(missionId, req.user.id);
  }

  @Get('instances/:id')
  async findInstanceById(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checklistService.findInstanceById(id, req.user.id);
  }

  @Put('instances/:id')
  async updateInstance(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistInstanceDto,
  ) {
    return this.checklistService.updateInstance(id, req.user.id, dto);
  }

  @Post('instances/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeChecklist(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteChecklistDto,
  ) {
    return this.checklistService.completeChecklist(id, req.user.id, dto);
  }

  @Post('instances/:id/photos')
  async addPhoto(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPhotoDto,
  ) {
    return this.checklistService.addPhoto(id, req.user.id, dto);
  }

  @Delete('instances/:id')
  @HttpCode(HttpStatus.OK)
  async deleteInstance(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.checklistService.deleteInstance(id, req.user.id);
  }

  // Analytics
  @Get('analytics')
  async getAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.checklistService.getChecklistAnalytics(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
