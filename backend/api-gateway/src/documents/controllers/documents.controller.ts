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
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DocumentsService } from '../services/documents.service';
import { PdfService } from '../services/pdf.service';
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
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pdfService: PdfService,
  ) {}

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

  // ============ PDF GENERATION ============

  @Get('pdf/quote/:id')
  @Roles('ARTISAN')
  async getQuotePdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateQuotePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="devis-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Get('pdf/invoice/:id')
  @Roles('ARTISAN')
  async getInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateInvoicePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Get('pdf/contract/:missionId')
  @Roles('ARTISAN')
  async getContractPdf(@Param('missionId') missionId: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateContractPdf(missionId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contrat-${missionId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
