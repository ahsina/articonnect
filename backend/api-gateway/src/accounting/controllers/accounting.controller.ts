import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FecExportService } from '../services/fec-export.service';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly fecExportService: FecExportService) {}

  @Get('fec/export')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Export FEC (Fichier des Ecritures Comptables) for tax audit' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'format', required: false, enum: ['txt', 'csv'], description: 'Output format (default: txt)' })
  async exportFEC(
    @Request() req,
    @Res() res: Response,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('format') format: 'txt' | 'csv' = 'txt',
  ) {
    // Validate dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Dates invalides. Format attendu: YYYY-MM-DD');
    }

    if (startDate > endDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }

    // Check period doesn't exceed fiscal year
    const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    if (monthDiff > 12) {
      throw new BadRequestException('La période ne peut pas dépasser 12 mois (exercice fiscal)');
    }

    const { data, filename } = await this.fecExportService.generateFEC({
      userId: req.user.userId,
      startDate,
      endDate,
      format,
    });

    // Set response headers for file download
    const contentType = format === 'csv' ? 'text/csv' : 'text/plain';
    res.set({
      'Content-Type': `${contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(data, 'utf-8'),
    });

    res.status(HttpStatus.OK).send(data);
  }

  @Get('summary')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get accounting summary for a period' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getSummary(
    @Request() req,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Dates invalides. Format attendu: YYYY-MM-DD');
    }

    return this.fecExportService.getAccountingSummary(
      req.user.userId,
      startDate,
      endDate,
    );
  }

  @Get('vat-declaration')
  @Roles('ARTISAN')
  @ApiOperation({ summary: 'Get VAT declaration data for a period' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'quarter', required: false, type: Number, description: 'Quarter (1-4) for quarterly declaration' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Month (1-12) for monthly declaration' })
  async getVATDeclaration(
    @Request() req,
    @Query('year') year: number,
    @Query('quarter') quarter?: number,
    @Query('month') month?: number,
  ) {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      // Monthly declaration
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // Last day of month
    } else if (quarter) {
      // Quarterly declaration
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(year, startMonth, 1);
      endDate = new Date(year, startMonth + 3, 0);
    } else {
      // Annual declaration
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    const summary = await this.fecExportService.getAccountingSummary(
      req.user.userId,
      startDate,
      endDate,
    );

    // Standard French VAT rates
    const VAT_RATE_NORMAL = 0.20;
    const VAT_RATE_REDUCED = 0.10;
    const VAT_RATE_SUPER_REDUCED = 0.055;

    // Deductible VAT requires purchase/expense records with recoverable VAT.
    // The platform does not track artisan purchases (no expense/purchase model),
    // so deductible VAT is genuinely 0 here. We compute the balance as the real
    // net (collected - deductible) and flag explicitly that deductible VAT is not
    // tracked, so the figure is not blindly trusted as a final declaration.
    const collectedTva = summary.invoices.totalTVA;
    const deductibleTva = 0;
    const tvaDue = collectedTva - deductibleTva;
    const deductibleTracked = false;

    return {
      period: {
        type: month ? 'MONTHLY' : quarter ? 'QUARTERLY' : 'ANNUAL',
        year,
        month,
        quarter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      collected: {
        baseHT: summary.invoices.totalHT,
        tva: collectedTva,
      },
      deductible: {
        baseHT: 0,
        tva: deductibleTva,
        tracked: deductibleTracked,
      },
      balance: {
        tvaDue,
        message: tvaDue > 0
          ? `TVA à reverser: ${tvaDue.toFixed(2)}€`
          : 'Pas de TVA à déclarer pour cette période',
        note:
          'La TVA déductible sur achats n\'est pas suivie par la plateforme (aucune donnée d\'achat). ' +
          'Ce montant correspond à la TVA collectée ; déduisez vos achats professionnels avant déclaration.',
      },
      rates: {
        normal: `${VAT_RATE_NORMAL * 100}%`,
        reduced: `${VAT_RATE_REDUCED * 100}%`,
        superReduced: `${VAT_RATE_SUPER_REDUCED * 100}%`,
      },
    };
  }
}
