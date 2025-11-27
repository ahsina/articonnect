import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService, FEATURE_FLAGS_OPTIONS } from './feature-flags.service';
import {
  FeatureFlagType,
  FeatureFlagStatus,
  EvaluationReason,
} from './feature-flags.interface';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    // Create fresh mock for each test - returns 'test' to match Jest environment
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'REDIS_URL') return null; // No Redis for tests
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: FEATURE_FLAGS_OPTIONS, useValue: { defaultValue: false, cacheEnabled: false } },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    await service.onModuleInit();
  });

  describe('createFlag', () => {
    it('should create a boolean feature flag', async () => {
      const flag = await service.createFlag({
        key: 'test-feature',
        name: 'Test Feature',
        description: 'A test feature flag',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });

      expect(flag.key).toBe('test-feature');
      expect(flag.name).toBe('Test Feature');
      expect(flag.status).toBe(FeatureFlagStatus.ACTIVE);
    });

    it('should throw error for duplicate key', async () => {
      await service.createFlag({
        key: 'duplicate-key',
        name: 'First',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });

      await expect(
        service.createFlag({
          key: 'duplicate-key',
          name: 'Second',
          type: FeatureFlagType.BOOLEAN,
          value: { enabled: true },
        }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled boolean flag', async () => {
      await service.createFlag({
        key: 'enabled-flag',
        name: 'Enabled',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });

      const result = await service.isEnabled('enabled-flag');
      expect(result).toBe(true);
    });

    it('should return false for disabled boolean flag', async () => {
      await service.createFlag({
        key: 'disabled-flag',
        name: 'Disabled',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: false },
      });

      const result = await service.isEnabled('disabled-flag');
      expect(result).toBe(false);
    });

    it('should return default value for non-existent flag', async () => {
      const result = await service.isEnabled('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('should return FLAG_NOT_FOUND for missing flags', async () => {
      const result = await service.evaluate('missing-flag');
      expect(result.reason).toBe(EvaluationReason.FLAG_NOT_FOUND);
      expect(result.enabled).toBe(false);
    });

    it('should return FLAG_INACTIVE for inactive flags', async () => {
      await service.createFlag({
        key: 'inactive-flag',
        name: 'Inactive',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });
      await service.updateFlag('inactive-flag', { status: FeatureFlagStatus.INACTIVE });

      const result = await service.evaluate('inactive-flag');
      expect(result.reason).toBe(EvaluationReason.FLAG_INACTIVE);
      expect(result.enabled).toBe(false);
    });
  });

  describe('percentage rollout', () => {
    it('should provide consistent results for same user', async () => {
      await service.createFlag({
        key: 'percentage-flag',
        name: 'Percentage',
        type: FeatureFlagType.PERCENTAGE,
        value: { enabled: true, percentage: 50 },
      });

      const context = { userId: 'user-123' };
      const result1 = await service.isEnabled('percentage-flag', context);
      const result2 = await service.isEnabled('percentage-flag', context);
      const result3 = await service.isEnabled('percentage-flag', context);

      // Same user should get consistent results
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should return false when percentage is 0', async () => {
      await service.createFlag({
        key: 'zero-percent',
        name: 'Zero Percent',
        type: FeatureFlagType.PERCENTAGE,
        value: { enabled: true, percentage: 0 },
      });

      const result = await service.isEnabled('zero-percent', { userId: 'any-user' });
      expect(result).toBe(false);
    });

    it('should return true when percentage is 100', async () => {
      await service.createFlag({
        key: 'full-rollout',
        name: 'Full Rollout',
        type: FeatureFlagType.PERCENTAGE,
        value: { enabled: true, percentage: 100 },
      });

      const result = await service.isEnabled('full-rollout', { userId: 'any-user' });
      expect(result).toBe(true);
    });
  });

  describe('user list', () => {
    beforeEach(async () => {
      await service.createFlag({
        key: 'user-list-flag',
        name: 'User List',
        type: FeatureFlagType.USER_LIST,
        value: {
          enabled: true,
          allowedUsers: ['user-1', 'user-2'],
          allowedRoles: ['ADMIN'],
        },
      });
    });

    it('should return true for allowed user', async () => {
      const result = await service.isEnabled('user-list-flag', { userId: 'user-1' });
      expect(result).toBe(true);
    });

    it('should return true for allowed role', async () => {
      const result = await service.isEnabled('user-list-flag', { userId: 'other', userRole: 'ADMIN' });
      expect(result).toBe(true);
    });

    it('should return false for non-allowed user', async () => {
      const result = await service.isEnabled('user-list-flag', { userId: 'user-99', userRole: 'CLIENT' });
      expect(result).toBe(false);
    });
  });

  describe('environment flags', () => {
    it('should return true for enabled environment', async () => {
      await service.createFlag({
        key: 'env-flag',
        name: 'Environment Flag',
        type: FeatureFlagType.ENVIRONMENT,
        value: {
          enabled: true,
          environments: {
            development: true,
            staging: true,
            production: true,
            test: true, // Include test environment for Jest
          },
        },
      });

      // All environments enabled, should return true
      const result = await service.isEnabled('env-flag');
      expect(result).toBe(true);
    });

    it('should return false for disabled environment', async () => {
      await service.createFlag({
        key: 'env-flag-disabled',
        name: 'Disabled Environment Flag',
        type: FeatureFlagType.ENVIRONMENT,
        value: {
          enabled: true,
          environments: {
            development: false,
            staging: false,
            production: false,
            test: false,
          },
        },
      });

      // All environments disabled, should return false
      const result = await service.isEnabled('env-flag-disabled');
      expect(result).toBe(false);
    });

    it('should return false when flag is disabled regardless of environment', async () => {
      await service.createFlag({
        key: 'env-flag-off',
        name: 'Disabled Flag',
        type: FeatureFlagType.ENVIRONMENT,
        value: {
          enabled: false,
          environments: {
            development: true,
            staging: true,
            production: true,
            test: true,
          },
        },
      });

      const result = await service.isEnabled('env-flag-off');
      expect(result).toBe(false);
    });

    it('should return false for undefined environment', async () => {
      await service.createFlag({
        key: 'env-flag-partial',
        name: 'Partial Environment Flag',
        type: FeatureFlagType.ENVIRONMENT,
        value: {
          enabled: true,
          environments: {
            production: true,
            // test not defined, should default to false
          },
        },
      });

      const result = await service.isEnabled('env-flag-partial');
      expect(result).toBe(false);
    });
  });

  describe('updateFlag', () => {
    it('should update flag value', async () => {
      await service.createFlag({
        key: 'update-test',
        name: 'Update Test',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });

      await service.updateFlag('update-test', {
        value: { enabled: false },
      });

      const result = await service.isEnabled('update-test');
      expect(result).toBe(false);
    });

    it('should throw error for non-existent flag', async () => {
      await expect(
        service.updateFlag('non-existent', { name: 'New Name' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('deleteFlag', () => {
    it('should delete flag', async () => {
      await service.createFlag({
        key: 'delete-test',
        name: 'Delete Test',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });

      await service.deleteFlag('delete-test');

      const flag = await service.getFlag('delete-test');
      expect(flag).toBeNull();
    });

    it('should throw error for non-existent flag', async () => {
      await expect(service.deleteFlag('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('enableFlag/disableFlag', () => {
    it('should quickly enable a flag', async () => {
      await service.createFlag({
        key: 'quick-toggle',
        name: 'Quick Toggle',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: false },
      });

      await service.enableFlag('quick-toggle');

      const result = await service.isEnabled('quick-toggle');
      expect(result).toBe(true);
    });

    it('should quickly disable a flag', async () => {
      await service.createFlag({
        key: 'quick-toggle-2',
        name: 'Quick Toggle 2',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });

      await service.disableFlag('quick-toggle-2');

      const result = await service.isEnabled('quick-toggle-2');
      expect(result).toBe(false);
    });
  });

  describe('evaluateMultiple', () => {
    it('should evaluate multiple flags at once', async () => {
      await service.createFlag({
        key: 'multi-1',
        name: 'Multi 1',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });
      await service.createFlag({
        key: 'multi-2',
        name: 'Multi 2',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: false },
      });

      const results = await service.evaluateMultiple(['multi-1', 'multi-2', 'multi-3']);

      expect(results['multi-1']).toBe(true);
      expect(results['multi-2']).toBe(false);
      expect(results['multi-3']).toBe(false); // default for non-existent
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', async () => {
      await service.createFlag({
        key: 'all-1',
        name: 'All 1',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: true },
      });
      await service.createFlag({
        key: 'all-2',
        name: 'All 2',
        type: FeatureFlagType.BOOLEAN,
        value: { enabled: false },
      });

      const flags = await service.getAllFlags();
      const keys = flags.map(f => f.key);

      expect(keys).toContain('all-1');
      expect(keys).toContain('all-2');
    });
  });
});
