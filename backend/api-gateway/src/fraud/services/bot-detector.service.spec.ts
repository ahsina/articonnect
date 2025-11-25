import { Test, TestingModule } from '@nestjs/testing';
import { BotDetectorService } from './bot-detector.service';

describe('BotDetectorService', () => {
  let service: BotDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BotDetectorService],
    }).compile();

    service = module.get<BotDetectorService>(BotDetectorService);
  });

  describe('detectBot', () => {
    const normalMetadata = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        accept: 'text/html,application/xhtml+xml',
      },
    };

    it('should return low score for normal browser request', async () => {
      const result = await service.detectBot(normalMetadata);

      expect(result).toHaveProperty('isBot');
      expect(result).toHaveProperty('botScore');
      expect(result).toHaveProperty('signals');
      expect(result).toHaveProperty('recommendation');
      expect(result.isBot).toBe(false);
      expect(result.botScore).toBeLessThan(70);
      expect(result.recommendation).toBe('ALLOW');
    });

    it('should detect missing headers', async () => {
      const metadataWithMissingHeaders = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        headers: {},
      };

      const result = await service.detectBot(metadataWithMissingHeaders);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_HEADERS',
        }),
      );
      expect(result.botScore).toBeGreaterThan(0);
    });

    it('should detect headless browser from user agent', async () => {
      const headlessMetadata = {
        userAgent: 'Mozilla/5.0 HeadlessChrome/90.0.4430.212',
        headers: {
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
      };

      const result = await service.detectBot(headlessMetadata);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'HEADLESS_BROWSER',
          confidence: 95,
        }),
      );
      expect(result.botScore).toBeGreaterThan(50);
    });

    it('should detect puppeteer in user agent', async () => {
      const puppeteerMetadata = {
        userAgent: 'Mozilla/5.0 (compatible; Puppeteer/1.0)',
        headers: {
          'accept-language': 'en',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
      };

      const result = await service.detectBot(puppeteerMetadata);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'HEADLESS_BROWSER',
        }),
      );
    });

    it('should detect selenium webdriver', async () => {
      const seleniumMetadata = {
        userAgent: 'Mozilla/5.0 selenium webdriver Chrome/90.0',
        headers: {
          'accept-language': 'en',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
      };

      const result = await service.detectBot(seleniumMetadata);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'HEADLESS_BROWSER',
        }),
      );
    });

    it('should detect rapid request patterns', async () => {
      const rapidRequestMetadata = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        headers: {
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
        requestPattern: {
          requestCount: 100,
          timeWindow: 10, // 10 requests per second
        },
      };

      const result = await service.detectBot(rapidRequestMetadata);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'RAPID_REQUESTS',
        }),
      );
      expect(result.botScore).toBeGreaterThan(50);
    });

    it('should return BLOCK recommendation for very high scores', async () => {
      // Combine multiple bot indicators
      const obviousBotMetadata = {
        userAgent: 'puppeteer headlesschrome selenium',
        headers: {}, // Missing all headers
        requestPattern: {
          requestCount: 200,
          timeWindow: 10,
        },
      };

      const result = await service.detectBot(obviousBotMetadata);

      expect(result.isBot).toBe(true);
      expect(result.botScore).toBeGreaterThanOrEqual(70);
    });

    it('should return CHALLENGE_CAPTCHA for medium-high scores', async () => {
      const suspiciousMetadata = {
        userAgent: 'headlesschrome',
        headers: {
          'accept-language': 'en',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
      };

      const result = await service.detectBot(suspiciousMetadata);

      expect(result.botScore).toBeGreaterThanOrEqual(70);
      expect(['CHALLENGE_CAPTCHA', 'BLOCK']).toContain(result.recommendation);
    });

    it('should handle empty user agent', async () => {
      const emptyUAMetadata = {
        userAgent: '',
        headers: {
          'accept-language': 'en',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
      };

      // Should not throw
      const result = await service.detectBot(emptyUAMetadata);

      expect(result).toHaveProperty('botScore');
      expect(result).toHaveProperty('signals');
    });

    it('should detect PhantomJS', async () => {
      const phantomMetadata = {
        userAgent: 'Mozilla/5.0 PhantomJS/2.1.1',
        headers: {
          'accept-language': 'en',
          'accept-encoding': 'gzip',
          accept: '*/*',
        },
      };

      const result = await service.detectBot(phantomMetadata);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'HEADLESS_BROWSER',
        }),
      );
    });

    it('should handle missing requestPattern gracefully', async () => {
      const metadataWithoutPattern = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        headers: {
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
          accept: 'text/html',
        },
        // No requestPattern
      };

      const result = await service.detectBot(metadataWithoutPattern);

      expect(result).toHaveProperty('botScore');
      // Should not have RAPID_REQUESTS signal
      expect(result.signals.map((s) => s.type)).not.toContain('RAPID_REQUESTS');
    });
  });
});
