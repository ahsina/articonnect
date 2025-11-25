import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService, Currency } from './currency.service';
import { RedisService } from '../../common/redis/redis.service';
import { BadRequestException } from '@nestjs/common';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convert', () => {
    it('should return same amount when currencies are equal', async () => {
      const result = await service.convert(100, Currency.EUR, Currency.EUR);

      expect(result).toBe(100);
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should convert EUR to USD using default rates', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convert(100, Currency.EUR, Currency.USD);

      expect(result).toBe(110); // 100 * 1.10
    });

    it('should convert EUR to GBP using default rates', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convert(100, Currency.EUR, Currency.GBP);

      expect(result).toBe(85); // 100 * 0.85
    });

    it('should convert USD to EUR using default rates', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convert(100, Currency.USD, Currency.EUR);

      expect(result).toBe(91); // 100 * 0.91
    });

    it('should use cached rates when available', async () => {
      const cachedRates = JSON.stringify({
        base: Currency.EUR,
        rates: { USD: 1.15, GBP: 0.90, EUR: 1.00 },
        lastUpdated: new Date(),
      });
      mockRedisService.get.mockResolvedValue(cachedRates);

      const result = await service.convert(100, Currency.EUR, Currency.USD);

      expect(result).toBe(115); // Uses cached rate 1.15
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should round to 2 decimal places', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convert(99.99, Currency.EUR, Currency.USD);

      expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should throw error for unavailable currency pair', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({
        base: Currency.EUR,
        rates: {}, // Empty rates
        lastUpdated: new Date(),
      }));

      await expect(
        service.convert(100, Currency.EUR, Currency.USD),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getExchangeRates', () => {
    it('should return exchange rates for base currency', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.getExchangeRates(Currency.EUR);

      expect(result.base).toBe(Currency.EUR);
      expect(result.rates).toHaveProperty('USD');
      expect(result.rates).toHaveProperty('GBP');
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should cache exchange rates', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.getExchangeRates(Currency.EUR);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'currency:exchange_rates:EUR',
        expect.any(String),
        3600,
      );
    });

    it('should return cached rates when available', async () => {
      const cachedRates = JSON.stringify({
        base: Currency.EUR,
        rates: { USD: 1.15 },
        lastUpdated: new Date().toISOString(),
      });
      mockRedisService.get.mockResolvedValue(cachedRates);

      const result = await service.getExchangeRates(Currency.EUR);

      expect(result.rates.USD).toBe(1.15);
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('formatAmount', () => {
    it('should format EUR amount with symbol after number', () => {
      const result = service.formatAmount(1234.56, Currency.EUR);

      expect(result).toBe('1,234.56€');
    });

    it('should format USD amount with symbol before number', () => {
      const result = service.formatAmount(1234.56, Currency.USD);

      expect(result).toBe('$1,234.56');
    });

    it('should format GBP amount with symbol after number', () => {
      const result = service.formatAmount(1234.56, Currency.GBP);

      expect(result).toBe('1,234.56£');
    });

    it('should format whole numbers with decimals', () => {
      const result = service.formatAmount(100, Currency.EUR);

      expect(result).toBe('100.00€');
    });

    it('should format large amounts with thousands separator', () => {
      const result = service.formatAmount(1000000, Currency.EUR);

      expect(result).toBe('1,000,000.00€');
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return all supported currencies', () => {
      const result = service.getSupportedCurrencies();

      expect(result).toContain(Currency.EUR);
      expect(result).toContain(Currency.USD);
      expect(result).toContain(Currency.GBP);
      expect(result).toHaveLength(3);
    });
  });

  describe('isValidCurrency', () => {
    it('should return true for valid currency codes', () => {
      expect(service.isValidCurrency('EUR')).toBe(true);
      expect(service.isValidCurrency('USD')).toBe(true);
      expect(service.isValidCurrency('GBP')).toBe(true);
    });

    it('should return false for invalid currency codes', () => {
      expect(service.isValidCurrency('XYZ')).toBe(false);
      expect(service.isValidCurrency('')).toBe(false);
      expect(service.isValidCurrency('eur')).toBe(false); // Case sensitive
    });
  });

  describe('getCurrencyForCountry', () => {
    it('should return EUR for Luxembourg', () => {
      expect(service.getCurrencyForCountry('LU')).toBe(Currency.EUR);
    });

    it('should return EUR for France', () => {
      expect(service.getCurrencyForCountry('FR')).toBe(Currency.EUR);
    });

    it('should return EUR for Belgium', () => {
      expect(service.getCurrencyForCountry('BE')).toBe(Currency.EUR);
    });

    it('should return USD for United States', () => {
      expect(service.getCurrencyForCountry('US')).toBe(Currency.USD);
    });

    it('should return GBP for United Kingdom', () => {
      expect(service.getCurrencyForCountry('GB')).toBe(Currency.GBP);
      expect(service.getCurrencyForCountry('UK')).toBe(Currency.GBP);
    });

    it('should return EUR for unknown countries', () => {
      expect(service.getCurrencyForCountry('XX')).toBe(Currency.EUR);
    });

    it('should handle lowercase country codes', () => {
      expect(service.getCurrencyForCountry('lu')).toBe(Currency.EUR);
    });
  });

  describe('convertWithFees', () => {
    it('should convert and calculate platform fee', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convertWithFees(100, Currency.EUR, Currency.USD, 12);

      expect(result.original).toBe(100);
      expect(result.converted).toBe(110); // 100 EUR * 1.10
      expect(result.platformFee).toBe(13.2); // 110 * 0.12
      expect(result.netAmount).toBe(96.8); // 110 - 13.2
    });

    it('should use default 12% fee when not specified', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convertWithFees(100, Currency.EUR, Currency.EUR);

      expect(result.platformFee).toBe(12); // 100 * 0.12
    });

    it('should handle same currency conversion', async () => {
      const result = await service.convertWithFees(100, Currency.EUR, Currency.EUR, 10);

      expect(result.original).toBe(100);
      expect(result.converted).toBe(100);
      expect(result.platformFee).toBe(10);
      expect(result.netAmount).toBe(90);
    });

    it('should round fee to 2 decimal places', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.convertWithFees(99.99, Currency.EUR, Currency.USD, 15);

      expect(result.platformFee.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.netAmount.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });
});
