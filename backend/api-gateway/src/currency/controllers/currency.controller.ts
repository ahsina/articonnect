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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrencyService } from '../services/currency.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  UpdateExchangeRateDto,
  ConvertCurrencyDto,
} from '../dto/currency.dto';

@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  // ============ PUBLIC ENDPOINTS ============

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.currencyService.findAll(includeInactive === 'true');
  }

  @Get('rate')
  async getExchangeRate(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.currencyService.getExchangeRate(from, to);
  }

  @Post('convert')
  async convert(@Body() dto: ConvertCurrencyDto) {
    return this.currencyService.convert(dto);
  }

  @Get('format')
  async formatAmount(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ) {
    const formatted = await this.currencyService.formatAmount(
      parseFloat(amount),
      currency,
    );
    return { formatted };
  }

  @Get(':code')
  async findOne(@Param('code') code: string) {
    return this.currencyService.findOne(code);
  }

  @Get(':code/history')
  async getExchangeRateHistory(
    @Param('code') code: string,
    @Query('to') toCurrency: string,
    @Query('days') days?: string,
  ) {
    return this.currencyService.getExchangeRateHistory(
      code,
      toCurrency || 'EUR',
      days ? parseInt(days) : 30,
    );
  }

  // ============ ADMIN ENDPOINTS ============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.create(dto);
  }

  @Put(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencyService.update(code, dto);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('code') code: string) {
    return this.currencyService.delete(code);
  }

  @Post('exchange-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateExchangeRate(@Body() dto: UpdateExchangeRateDto) {
    return this.currencyService.updateExchangeRate(dto);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async seedDefaults() {
    return this.currencyService.seedDefaultCurrencies();
  }
}
