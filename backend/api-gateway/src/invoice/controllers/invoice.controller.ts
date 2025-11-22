import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new invoice (draft)' })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Post(':id/issue')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Issue an invoice (generate PDF and change status to ISSUED)' })
  issue(@Param('id') id: string) {
    return this.invoiceService.issue(id);
  }

  @Post(':id/paid')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  markAsPaid(@Param('id') id: string) {
    return this.invoiceService.markAsPaid(id);
  }

  @Post(':id/cancel')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Cancel an invoice' })
  cancel(@Param('id') id: string) {
    return this.invoiceService.cancel(id);
  }

  @Post('mission/:missionId')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Auto-generate invoice from mission' })
  createFromMission(@Param('missionId') missionId: string) {
    return this.invoiceService.createFromMission(missionId);
  }

  @Post('order/:orderId')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Auto-generate invoice from order' })
  createFromOrder(@Param('orderId') orderId: string) {
    return this.invoiceService.createFromOrder(orderId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices with filters' })
  @ApiQuery({ name: 'issuerId', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('issuerId') issuerId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoiceService.findAll({
      issuerId,
      clientId,
      status,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({ summary: 'Get invoice by invoice number' })
  findByInvoiceNumber(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoiceService.findByInvoiceNumber(invoiceNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(':id')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Update invoice (only DRAFT invoices)' })
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Delete(':id')
  @Roles('ARTISAN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete invoice (only DRAFT or CANCELLED)' })
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generate and get PDF URL for invoice' })
  async generatePDF(@Param('id') id: string) {
    const pdfUrl = await this.invoiceService.generatePDF(id);
    return { pdfUrl };
  }
}
