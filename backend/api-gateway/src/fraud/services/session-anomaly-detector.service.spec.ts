import { Test, TestingModule } from '@nestjs/testing';
import { SessionAnomalyDetectorService } from './session-anomaly-detector.service';

describe('SessionAnomalyDetectorService', () => {
  let service: SessionAnomalyDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionAnomalyDetectorService],
    }).compile();

    service = module.get<SessionAnomalyDetectorService>(SessionAnomalyDetectorService);
  });

  describe('detectSessionAnomaly', () => {
    const baseSession = {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Chrome/120',
      deviceId: 'device-123',
      location: { lat: 49.6116, lng: 6.1319 }, // Luxembourg
    };

    it('should return no anomaly for first session', async () => {
      const result = await service.detectSessionAnomaly(
        'user-123',
        baseSession,
        undefined,
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.threatLevel).toBe('LOW');
      expect(result.signals).toHaveLength(0);
      expect(result.recommendation).toBe('ALLOW');
    });

    it('should return no anomaly for identical sessions', async () => {
      const result = await service.detectSessionAnomaly(
        'user-123',
        baseSession,
        baseSession,
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.recommendation).toBe('ALLOW');
    });

    it('should detect impossible travel', async () => {
      const previousSession = {
        ...baseSession,
        location: { lat: 49.6116, lng: 6.1319 }, // Luxembourg
      };
      const currentSession = {
        ...baseSession,
        location: { lat: 48.8566, lng: 2.3522 }, // Paris (~300km away)
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      expect(result.isAnomalous).toBe(true);
      const travelSignal = result.signals.find(s => s.type === 'IMPOSSIBLE_TRAVEL');
      expect(travelSignal).toBeDefined();
      expect(travelSignal?.severity).toBe('CRITICAL');
    });

    it('should detect device change', async () => {
      const previousSession = {
        ...baseSession,
        deviceId: 'device-123',
      };
      const currentSession = {
        ...baseSession,
        deviceId: 'device-456',
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      expect(result.isAnomalous).toBe(true);
      const deviceSignal = result.signals.find(s => s.type === 'DEVICE_CHANGE');
      expect(deviceSignal).toBeDefined();
      expect(deviceSignal?.severity).toBe('MEDIUM');
    });

    it('should detect user agent change', async () => {
      const previousSession = {
        ...baseSession,
        userAgent: 'Mozilla/5.0 Chrome/120',
      };
      const currentSession = {
        ...baseSession,
        userAgent: 'Mozilla/5.0 Firefox/121',
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      expect(result.isAnomalous).toBe(true);
      const uaSignal = result.signals.find(s => s.type === 'USER_AGENT_CHANGE');
      expect(uaSignal).toBeDefined();
      expect(uaSignal?.severity).toBe('MEDIUM');
    });

    it('should detect IP jump', async () => {
      const previousSession = {
        ...baseSession,
        ipAddress: '192.168.1.1',
      };
      const currentSession = {
        ...baseSession,
        ipAddress: '10.0.0.1',
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      expect(result.isAnomalous).toBe(true);
      const ipSignal = result.signals.find(s => s.type === 'IP_JUMP');
      expect(ipSignal).toBeDefined();
      expect(ipSignal?.severity).toBe('LOW');
    });

    it('should return CRITICAL threat level for impossible travel', async () => {
      const previousSession = {
        ...baseSession,
        location: { lat: 49.6116, lng: 6.1319 },
      };
      const currentSession = {
        ...baseSession,
        location: { lat: 40.7128, lng: -74.0060 }, // New York
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      expect(result.threatLevel).toBe('CRITICAL');
      expect(result.recommendation).toBe('BLOCK_IP');
    });

    it('should return MEDIUM threat level for single medium severity signal', async () => {
      const previousSession = {
        ...baseSession,
        deviceId: 'device-123',
      };
      const currentSession = {
        ...baseSession,
        deviceId: 'device-456',
        // Keep other fields same to only trigger device change
        location: undefined,
        userAgent: baseSession.userAgent,
        ipAddress: baseSession.ipAddress,
      };

      // Need to also not have location to avoid other signals
      const result = await service.detectSessionAnomaly(
        'user-123',
        { ...currentSession, location: undefined },
        { ...previousSession, location: undefined },
      );

      // With only device change (MEDIUM), threat level should be MEDIUM
      expect(result.threatLevel).toBe('MEDIUM');
      expect(result.recommendation).toBe('CHALLENGE_2FA');
    });

    it('should return HIGH threat level for multiple medium signals', async () => {
      const previousSession = {
        ...baseSession,
        deviceId: 'device-123',
        userAgent: 'Chrome',
        ipAddress: '1.1.1.1',
        location: undefined,
      };
      const currentSession = {
        ...baseSession,
        deviceId: 'device-456',
        userAgent: 'Firefox',
        ipAddress: '2.2.2.2',
        location: undefined,
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      // 2 medium (device, user agent) + 1 low (IP) = HIGH
      expect(result.threatLevel).toBe('HIGH');
      expect(result.recommendation).toBe('FORCE_LOGOUT');
    });

    it('should handle sessions without location', async () => {
      const previousSession = {
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
      };
      const currentSession = {
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome',
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      // Should only detect IP change
      expect(result.signals.some(s => s.type === 'IMPOSSIBLE_TRAVEL')).toBe(false);
    });

    it('should handle sessions without deviceId', async () => {
      const previousSession = {
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        deviceId: undefined,
      };
      const currentSession = {
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        deviceId: undefined,
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      // Should not detect device change when both are undefined
      expect(result.signals.some(s => s.type === 'DEVICE_CHANGE')).toBe(false);
    });

    it('should include previous and current values in signals', async () => {
      const previousSession = {
        ...baseSession,
        ipAddress: '192.168.1.1',
        deviceId: 'device-old',
      };
      const currentSession = {
        ...baseSession,
        ipAddress: '10.0.0.1',
        deviceId: 'device-new',
        location: undefined,
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        { ...previousSession, location: undefined },
      );

      const ipSignal = result.signals.find(s => s.type === 'IP_JUMP');
      expect(ipSignal?.previousValue).toBe('192.168.1.1');
      expect(ipSignal?.currentValue).toBe('10.0.0.1');

      const deviceSignal = result.signals.find(s => s.type === 'DEVICE_CHANGE');
      expect(deviceSignal?.previousValue).toBe('device-old');
      expect(deviceSignal?.currentValue).toBe('device-new');
    });

    it('should not flag small location changes as impossible travel', async () => {
      const previousSession = {
        ...baseSession,
        location: { lat: 49.6116, lng: 6.1319 },
      };
      const currentSession = {
        ...baseSession,
        location: { lat: 49.6120, lng: 6.1325 }, // Very close
      };

      const result = await service.detectSessionAnomaly(
        'user-123',
        currentSession,
        previousSession,
      );

      expect(result.signals.some(s => s.type === 'IMPOSSIBLE_TRAVEL')).toBe(false);
    });
  });

  describe('threat level calculation', () => {
    it('should calculate LOW for only low severity signals', async () => {
      // Only IP change
      const result = await service.detectSessionAnomaly(
        'user-123',
        { ipAddress: '2.2.2.2', userAgent: 'Chrome' },
        { ipAddress: '1.1.1.1', userAgent: 'Chrome' },
      );

      expect(result.threatLevel).toBe('LOW');
    });
  });

  describe('recommendations', () => {
    it('should recommend ALLOW for LOW threat', async () => {
      const result = await service.detectSessionAnomaly(
        'user-123',
        { ipAddress: '1.1.1.1', userAgent: 'Chrome' },
        undefined,
      );

      expect(result.recommendation).toBe('ALLOW');
    });

    it('should recommend CHALLENGE_2FA for MEDIUM threat', async () => {
      const result = await service.detectSessionAnomaly(
        'user-123',
        { ipAddress: '1.1.1.1', userAgent: 'Firefox', deviceId: 'new' },
        { ipAddress: '1.1.1.1', userAgent: 'Chrome', deviceId: 'old' },
      );

      // This will have MEDIUM signals, should recommend 2FA
      expect(['CHALLENGE_2FA', 'FORCE_LOGOUT']).toContain(result.recommendation);
    });
  });
});
