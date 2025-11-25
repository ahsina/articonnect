import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaService } from './captcha.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CaptchaService', () => {
  let service: CaptchaService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        RECAPTCHA_SECRET_KEY: 'test-secret-key',
        RECAPTCHA_ENABLED: 'true',
        RECAPTCHA_API_URL: 'https://www.google.com/recaptcha/api/siteverify',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptchaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CaptchaService>(CaptchaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('verifyCaptcha', () => {
    it('should return true for valid captcha', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.9,
          action: 'login',
        },
      });

      const result = await service.verifyCaptcha('valid-token', 'login', '127.0.0.1');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: 'test-secret-key',
            response: 'valid-token',
            remoteip: '127.0.0.1',
          },
        },
      );
    });

    it('should throw BadRequestException if token is missing', async () => {
      await expect(service.verifyCaptcha('', 'login')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if verification fails', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          'error-codes': ['invalid-input-response'],
        },
      });

      await expect(
        service.verifyCaptcha('invalid-token', 'login'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if action mismatch', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.9,
          action: 'register',
        },
      });

      await expect(
        service.verifyCaptcha('token', 'login'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if score is too low', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.3,
          action: 'login',
        },
      });

      await expect(
        service.verifyCaptcha('token', 'login'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on API error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        service.verifyCaptcha('token', 'login'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyCaptcha when disabled', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          RECAPTCHA_SECRET_KEY: 'test-secret-key',
          RECAPTCHA_ENABLED: 'false',
        };
        return config[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CaptchaService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<CaptchaService>(CaptchaService);
    });

    it('should return true without verification when disabled', async () => {
      const result = await service.verifyCaptcha('any-token', 'login');

      expect(result).toBe(true);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('verifyCaptcha when no secret key', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          RECAPTCHA_SECRET_KEY: '',
          RECAPTCHA_ENABLED: 'true',
        };
        return config[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CaptchaService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<CaptchaService>(CaptchaService);
    });

    it('should return true without verification when no secret key', async () => {
      const result = await service.verifyCaptcha('any-token', 'login');

      expect(result).toBe(true);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('verifyLoginCaptcha', () => {
    it('should call verifyCaptcha with login action', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.9,
          action: 'login',
        },
      });

      const result = await service.verifyLoginCaptcha('token', '127.0.0.1');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            response: 'token',
          }),
        }),
      );
    });
  });

  describe('verifyRegisterCaptcha', () => {
    it('should call verifyCaptcha with register action', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.9,
          action: 'register',
        },
      });

      const result = await service.verifyRegisterCaptcha('token', '127.0.0.1');

      expect(result).toBe(true);
    });
  });

  describe('verifyForgotPasswordCaptcha', () => {
    it('should call verifyCaptcha with forgot_password action', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.9,
          action: 'forgot_password',
        },
      });

      const result = await service.verifyForgotPasswordCaptcha('token', '127.0.0.1');

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle missing action in response gracefully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.9,
          // No action field (v2 response)
        },
      });

      const result = await service.verifyCaptcha('token', 'login');

      expect(result).toBe(true);
    });

    it('should handle missing score in response gracefully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          action: 'login',
          // No score field (v2 response)
        },
      });

      const result = await service.verifyCaptcha('token', 'login');

      expect(result).toBe(true);
    });

    it('should pass through BadRequestException without wrapping', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          'error-codes': ['timeout-or-duplicate'],
        },
      });

      await expect(
        service.verifyCaptcha('expired-token', 'login'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
