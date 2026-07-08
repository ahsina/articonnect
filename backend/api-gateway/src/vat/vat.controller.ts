import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { VatService } from './vat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';

@ApiTags('VAT/TVA')
@ApiBearerAuth()
@Controller('vat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VatController {
  constructor(private readonly vatService: VatService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries with tax rates' })
  getAllCountries() {
    return this.vatService.getAllCountries();
  }

  @Get('countries/:code')
  @ApiOperation({ summary: 'Get tax rates for a specific country' })
  getTaxRatesByCountry(@Param('code') code: string) {
    return this.vatService.getTaxRatesByCountry(code);
  }

  @Get('rate')
  @ApiOperation({ summary: 'Get VAT rate for country and category' })
  @ApiQuery({ name: 'country', required: true, description: 'Country code (LU, FR, BE)' })
  @ApiQuery({ name: 'category', required: true, enum: ServiceCategory })
  async getTaxRate(
    @Query('country') country: string,
    @Query('category', new ParseEnumPipe(ServiceCategory))
    category: ServiceCategory,
  ) {
    if (!country || typeof country !== 'string' || !country.trim()) {
      throw new BadRequestException('Le paramètre "country" est requis.');
    }
    const rate = await this.vatService.getTaxRate(country, category);
    return { country, category, rate };
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate VAT for an amount' })
  @ApiQuery({ name: 'country', required: true })
  @ApiQuery({ name: 'category', required: true, enum: ServiceCategory })
  @ApiQuery({ name: 'subtotal', required: true, type: Number })
  calculateVat(
    @Query('country') country: string,
    @Query('category', new ParseEnumPipe(ServiceCategory))
    category: ServiceCategory,
    @Query('subtotal') subtotal: number,
  ) {
    if (!country || typeof country !== 'string' || !country.trim()) {
      throw new BadRequestException('Le paramètre "country" est requis.');
    }
    return this.vatService.calculateVat(country, category, Number(subtotal));
  }

  @Get('artisan/:artisanId/exemption')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Check if artisan is eligible for VAT exemption' })
  @ApiQuery({ name: 'country', required: true })
  checkVatExemption(
    @Param('artisanId') artisanId: string,
    @Query('country') country: string,
  ) {
    if (!country || typeof country !== 'string' || !country.trim()) {
      throw new BadRequestException('Le paramètre "country" est requis.');
    }
    return this.vatService.checkVatExemption(artisanId, country);
  }

  @Post('artisan/:artisanId/declaration')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Generate VAT declaration for a period' })
  @ApiQuery({ name: 'period', required: true, description: 'Period (YYYY-QX or YYYY-MM)' })
  @ApiQuery({ name: 'country', required: true })
  generateVatDeclaration(
    @Param('artisanId') artisanId: string,
    @Query('period') period: string,
    @Query('country') country: string,
  ) {
    return this.vatService.generateVatDeclaration(artisanId, period, country);
  }

  @Get('artisan/:artisanId/declarations')
  @Roles('ARTISAN', 'ADMIN')
  @ApiOperation({ summary: 'Get VAT declarations for artisan' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'status', required: false })
  getVatDeclarations(
    @Param('artisanId') artisanId: string,
    @Query('year') year?: number,
    @Query('country') country?: string,
    @Query('status') status?: string,
  ) {
    return this.vatService.getVatDeclarations(artisanId, {
      year: year ? Number(year) : undefined,
      countryCode: country,
      status,
    });
  }
}
