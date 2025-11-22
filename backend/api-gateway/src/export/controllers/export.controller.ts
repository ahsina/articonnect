import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from '../services/export.service';
import { ExportQueryDto, ExportFormat } from '../dto/export.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Generate accounting export
   * POST /export/accounting
   */
  @Post('accounting')
  async generateAccountingExport(
    @Request() req,
    @Body() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;

    // Generate export
    const buffer = await this.exportService.generateExport(query, userId);

    // Set appropriate headers
    const fileExtension = query.format === ExportFormat.CSV ? 'csv' : 'pdf';
    const mimeType =
      query.format === ExportFormat.CSV
        ? 'text/csv'
        : 'application/pdf';

    const filename = `export_${query.type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
