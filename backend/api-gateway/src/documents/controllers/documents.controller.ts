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
import { DocumentsService } from '../services/documents.service';
import {
  CreateDocumentTemplateDto,
  CreateJobDocumentDto,
  UpdateJobDocumentDto,
  SignDocumentDto,
  DocumentTemplateType,
} from '../dto/documents.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ============ TEMPLATES ============

  @Post('templates')
  @Roles('ARTISAN')
  async createTemplate(@Request() req, @Body() dto: CreateDocumentTemplateDto) {
    return this.documentsService.createTemplate(req.user.id, dto);
  }

  @Get('templates')
  @Roles('ARTISAN')
  async getTemplates(
    @Request() req,
    @Query('type') type?: DocumentTemplateType,
    @Query('category') category?: string,
  ) {
    return this.documentsService.getTemplates(req.user.id, type, category);
  }

  @Get('templates/global')
  async getGlobalTemplates(
    @Query('type') type?: DocumentTemplateType,
    @Query('trade') trade?: string,
  ) {
    return this.documentsService.getGlobalTemplates(type, trade);
  }

  @Get('templates/:id')
  @Roles('ARTISAN')
  async getTemplate(@Request() req, @Param('id') id: string) {
    return this.documentsService.getTemplate(id, req.user.id);
  }

  @Put('templates/:id')
  @Roles('ARTISAN')
  async updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateDocumentTemplateDto,
  ) {
    return this.documentsService.updateTemplate(id, req.user.id, dto);
  }

  @Delete('templates/:id')
  @Roles('ARTISAN')
  async deleteTemplate(@Request() req, @Param('id') id: string) {
    return this.documentsService.deleteTemplate(id, req.user.id);
  }

  // ============ JOB DOCUMENTS ============

  @Post()
  @Roles('ARTISAN')
  async createDocument(@Request() req, @Body() dto: CreateJobDocumentDto) {
    return this.documentsService.createDocument(req.user.id, dto);
  }

  @Get()
  @Roles('ARTISAN')
  async getDocuments(@Request() req, @Query('missionId') missionId?: string) {
    return this.documentsService.getDocuments(req.user.id, missionId);
  }

  @Get(':id')
  async getDocument(@Request() req, @Param('id') id: string) {
    return this.documentsService.getDocument(id, req.user.id);
  }

  @Put(':id')
  @Roles('ARTISAN')
  async updateDocument(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateJobDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, req.user.id, dto);
  }

  @Post(':id/sign')
  async signDocument(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SignDocumentDto,
  ) {
    return this.documentsService.signDocument(id, req.user.id, dto.signature);
  }

  @Delete(':id')
  @Roles('ARTISAN')
  async deleteDocument(@Request() req, @Param('id') id: string) {
    return this.documentsService.deleteDocument(id, req.user.id);
  }
}
