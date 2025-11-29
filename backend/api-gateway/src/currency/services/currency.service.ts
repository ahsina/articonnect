import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  UpdateExchangeRateDto,
  ConvertCurrencyDto,
} from '../dto/currency.dto';

@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  // ============ CURRENCIES ============

  async create(dto: CreateCurrencyDto) {
    const existing = await this.prisma.currency.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException('Currency already exists');
    }

    return this.prisma.currency.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        symbol: dto.symbol,
        decimalPlaces: dto.decimalPlaces,
        symbolPosition: dto.symbolPosition || 'BEFORE',
        thousandsSep: dto.thousandsSeparator || ',',
        decimalSep: dto.decimalSeparator || '.',
        exchangeRate: 1, // Default exchange rate
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.currency.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async findOne(code: string) {
    const currency = await this.prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  async update(code: string, dto: UpdateCurrencyDto) {
    const currency = await this.findOne(code);

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.symbol) updateData.symbol = dto.symbol;
    if (dto.decimalPlaces !== undefined) updateData.decimalPlaces = dto.decimalPlaces;
    if (dto.symbolPosition) updateData.symbolPosition = dto.symbolPosition;
    if (dto.thousandsSeparator) updateData.thousandsSep = dto.thousandsSeparator;
    if (dto.decimalSeparator) updateData.decimalSep = dto.decimalSeparator;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.currency.update({
      where: { code: currency.code },
      data: updateData,
    });
  }

  async delete(code: string) {
    const currency = await this.findOne(code);

    // Soft delete by setting inactive
    await this.prisma.currency.update({
      where: { code: currency.code },
      data: { isActive: false },
    });

    return { success: true };
  }

  // ============ EXCHANGE RATES ============

  async updateExchangeRate(dto: UpdateExchangeRateDto) {
    const fromCurrency = await this.findOne(dto.fromCurrency);
    const toCurrency = await this.findOne(dto.toCurrency);

    // Update current rate on currency
    if (dto.toCurrency === 'EUR') {
      await this.prisma.currency.update({
        where: { code: fromCurrency.code },
        data: {
          exchangeRate: dto.rate,
          lastUpdated: new Date(),
        },
      });
    }

    // Store in history
    return this.prisma.exchangeRateHistory.create({
      data: {
        fromCurrency: fromCurrency.code,
        toCurrency: toCurrency.code,
        rate: dto.rate,
        source: dto.source || 'manual',
      },
    });
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return { rate: 1, fromCurrency: from, toCurrency: to };
    }

    // Try direct rate from history
    const directRate = await this.prisma.exchangeRateHistory.findFirst({
      where: { fromCurrency: from, toCurrency: to },
      orderBy: { recordedAt: 'desc' },
    });

    if (directRate) {
      return {
        rate: Number(directRate.rate),
        fromCurrency: from,
        toCurrency: to,
        recordedAt: directRate.recordedAt,
      };
    }

    // Try via EUR as intermediary using stored exchange rates
    const fromCurrencyData = await this.prisma.currency.findUnique({
      where: { code: from },
      select: { exchangeRate: true },
    });

    const toCurrencyData = await this.prisma.currency.findUnique({
      where: { code: to },
      select: { exchangeRate: true },
    });

    if (fromCurrencyData?.exchangeRate && toCurrencyData?.exchangeRate) {
      // Convert via EUR
      const rate = Number(fromCurrencyData.exchangeRate) / Number(toCurrencyData.exchangeRate);
      return { rate, fromCurrency: from, toCurrency: to, viaEur: true };
    }

    throw new NotFoundException('Exchange rate not found');
  }

  async getExchangeRateHistory(
    fromCurrency: string,
    toCurrency: string,
    days = 30,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.exchangeRateHistory.findMany({
      where: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // ============ CONVERSIONS ============

  async convert(dto: ConvertCurrencyDto) {
    const { rate } = await this.getExchangeRate(dto.fromCurrency, dto.toCurrency);

    const toCurrency = await this.findOne(dto.toCurrency);
    const convertedAmount = dto.amount * rate;

    // Round to appropriate decimal places
    const rounded = Number(convertedAmount.toFixed(toCurrency.decimalPlaces));

    return {
      originalAmount: dto.amount,
      originalCurrency: dto.fromCurrency.toUpperCase(),
      convertedAmount: rounded,
      convertedCurrency: dto.toCurrency.toUpperCase(),
      rate,
    };
  }

  async formatAmount(amount: number, currencyCode: string): Promise<string> {
    const currency = await this.findOne(currencyCode);

    const formatted = amount.toFixed(currency.decimalPlaces);
    const [intPart, decPart] = formatted.split('.');

    // Add thousands separator
    const withThousands = intPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      currency.thousandsSep,
    );

    const number = decPart
      ? `${withThousands}${currency.decimalSep}${decPart}`
      : withThousands;

    return currency.symbolPosition === 'BEFORE'
      ? `${currency.symbol}${number}`
      : `${number}${currency.symbol}`;
  }

  // ============ SEED DEFAULT CURRENCIES ============

  async seedDefaultCurrencies() {
    const currencies = [
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        symbolPosition: 'AFTER',
        thousandsSep: ' ',
        decimalSep: ',',
        exchangeRate: 1,
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
        symbolPosition: 'BEFORE',
        thousandsSep: ',',
        decimalSep: '.',
        exchangeRate: 1.17,
      },
      {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'CHF',
        decimalPlaces: 2,
        symbolPosition: 'BEFORE',
        thousandsSep: "'",
        decimalSep: '.',
        exchangeRate: 1.06,
      },
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        symbolPosition: 'BEFORE',
        thousandsSep: ',',
        decimalSep: '.',
        exchangeRate: 0.92,
      },
    ];

    for (const currency of currencies) {
      await this.prisma.currency.upsert({
        where: { code: currency.code },
        update: currency,
        create: { ...currency, isActive: true },
      });
    }

    return { success: true, count: currencies.length };
  }
}
