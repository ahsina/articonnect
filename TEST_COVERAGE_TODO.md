# Test Coverage Implementation Plan - Target 90%

## Current Status
- **Current Coverage**: ~7.3% (7/96 services tested)
- **Target Coverage**: 90%
- **Tests Needed**: ~86 service tests + ~47 controller tests

## Existing Test Files
1. `auth.service.spec.ts` ✅
2. `payment.service.spec.ts` ✅
3. `phone-verification.service.spec.ts` ✅
4. `mission.service.spec.ts` ✅
5. `chat.service.spec.ts` ✅
6. `bot-detector.service.spec.ts` ✅
7. `review.service.spec.ts` ✅

---

## Phase 1: Core Auth Services (4 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | TokenService | `auth/services/token.service.spec.ts` | Critical |
| 2 | TwoFactorService | `auth/services/two-factor.service.spec.ts` | Critical |
| 3 | SessionService | `auth/services/session.service.spec.ts` | Critical |
| 4 | PasswordResetService | `auth/services/password-reset.service.spec.ts` | Critical |

---

## Phase 2: Payment Services (8 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | StripeService | `payment/services/stripe.service.spec.ts` | Critical |
| 2 | MangopayService | `payment/services/mangopay.service.spec.ts` | Critical |
| 3 | EscrowService | `payment/services/escrow.service.spec.ts` | Critical |
| 4 | RefundService | `payment/services/refund.service.spec.ts` | High |
| 5 | InvoiceService | `payment/services/invoice.service.spec.ts` | High |
| 6 | PayoutService | `payment/services/payout.service.spec.ts` | High |
| 7 | WalletService | `payment/services/wallet.service.spec.ts` | High |
| 8 | SubscriptionService | `payment/services/subscription.service.spec.ts` | Medium |

---

## Phase 3: Mission Services (6 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | MissionCronService | `mission/services/mission-cron.service.spec.ts` | High |
| 2 | AutoAssignmentService | `mission/services/auto-assignment.service.spec.ts` | High |
| 3 | MissionStatusService | `mission/services/mission-status.service.spec.ts` | High |
| 4 | QuoteService | `mission/services/quote.service.spec.ts` | High |
| 5 | NegotiationService | `mission/services/negotiation.service.spec.ts` | Medium |
| 6 | MissionHistoryService | `mission/services/mission-history.service.spec.ts` | Medium |

---

## Phase 4: Fraud Detection Services (7 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | FraudDetectionService | `fraud/services/fraud-detection.service.spec.ts` | Critical |
| 2 | RiskScoringService | `fraud/services/risk-scoring.service.spec.ts` | Critical |
| 3 | AnomalyDetectionService | `fraud/services/anomaly-detection.service.spec.ts` | High |
| 4 | IpReputationService | `fraud/services/ip-reputation.service.spec.ts` | High |
| 5 | DeviceFingerprintService | `fraud/services/device-fingerprint.service.spec.ts` | High |
| 6 | VelocityCheckService | `fraud/services/velocity-check.service.spec.ts` | Medium |
| 7 | FraudAlertService | `fraud/services/fraud-alert.service.spec.ts` | Medium |

---

## Phase 5: Chat & Notification Services (6 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | NotificationService | `notification/services/notification.service.spec.ts` | High |
| 2 | EmailService | `notification/services/email.service.spec.ts` | High |
| 3 | SmsService | `notification/services/sms.service.spec.ts` | High |
| 4 | PushNotificationService | `notification/services/push-notification.service.spec.ts` | Medium |
| 5 | MessageService | `chat/services/message.service.spec.ts` | High |
| 6 | ConversationService | `chat/services/conversation.service.spec.ts` | Medium |

---

## Phase 6: User & Company Services (8 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | UserService | `user/services/user.service.spec.ts` | Critical |
| 2 | ProfileService | `user/services/profile.service.spec.ts` | High |
| 3 | ArtisanService | `artisan/services/artisan.service.spec.ts` | High |
| 4 | CompanyService | `company/services/company.service.spec.ts` | High |
| 5 | CompanyVerificationService | `company/services/company-verification.service.spec.ts` | High |
| 6 | CompanyNotificationService | `company/services/company-notification.service.spec.ts` | Medium |
| 7 | KycService | `kyc/services/kyc.service.spec.ts` | Critical |
| 8 | DocumentService | `document/services/document.service.spec.ts` | High |

---

## Phase 7: Marketplace Services (5 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | ProductService | `marketplace/services/product.service.spec.ts` | High |
| 2 | CategoryService | `marketplace/services/category.service.spec.ts` | Medium |
| 3 | SearchService | `search/services/search.service.spec.ts` | High |
| 4 | SpecialtyService | `specialty/services/specialty.service.spec.ts` | Medium |
| 5 | DashboardService | `dashboard/services/dashboard.service.spec.ts` | Medium |

---

## Phase 8: Admin & Reports Services (6 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | AdminService | `admin/services/admin.service.spec.ts` | High |
| 2 | ModerationService | `admin/services/moderation.service.spec.ts` | High |
| 3 | ReportService | `reports/services/report.service.spec.ts` | Medium |
| 4 | AnalyticsService | `analytics/services/analytics.service.spec.ts` | Medium |
| 5 | AuditLogService | `audit/services/audit-log.service.spec.ts` | High |
| 6 | DisputeService | `dispute/services/dispute.service.spec.ts` | High |

---

## Phase 9: Utility Services (10 tests)
| # | Service | File Path | Priority |
|---|---------|-----------|----------|
| 1 | FileUploadService | `upload/services/file-upload.service.spec.ts` | High |
| 2 | ImageProcessingService | `upload/services/image-processing.service.spec.ts` | Medium |
| 3 | GeocodingService | `geo/services/geocoding.service.spec.ts` | High |
| 4 | DistanceCalculationService | `geo/services/distance-calculation.service.spec.ts` | Medium |
| 5 | CacheService | `common/cache/cache.service.spec.ts` | High |
| 6 | QueueService | `common/queue/queue.service.spec.ts` | High |
| 7 | HealthService | `health/services/health.service.spec.ts` | Low |
| 8 | ConfigService | `common/config/config.service.spec.ts` | Medium |
| 9 | ValidationService | `common/validation/validation.service.spec.ts` | Medium |
| 10 | EncryptionService | `common/encryption/encryption.service.spec.ts` | High |

---

## Phase 10: Controller Tests (25 tests)
| # | Controller | File Path | Priority |
|---|------------|-----------|----------|
| 1 | AuthController | `auth/controllers/auth.controller.spec.ts` | Critical |
| 2 | UserController | `user/controllers/user.controller.spec.ts` | Critical |
| 3 | MissionController | `mission/controllers/mission.controller.spec.ts` | Critical |
| 4 | PaymentController | `payment/controllers/payment.controller.spec.ts` | Critical |
| 5 | ChatController | `chat/controllers/chat.controller.spec.ts` | High |
| 6 | ReviewController | `review/controllers/review.controller.spec.ts` | High |
| 7 | NotificationController | `notification/controllers/notification.controller.spec.ts` | High |
| 8 | CompanyController | `company/controllers/company.controller.spec.ts` | High |
| 9 | ArtisanController | `artisan/controllers/artisan.controller.spec.ts` | High |
| 10 | ProductController | `marketplace/controllers/product.controller.spec.ts` | Medium |
| 11 | SearchController | `search/controllers/search.controller.spec.ts` | Medium |
| 12 | AdminController | `admin/controllers/admin.controller.spec.ts` | High |
| 13 | UploadController | `upload/controllers/upload.controller.spec.ts` | Medium |
| 14 | QuoteController | `mission/controllers/quote.controller.spec.ts` | Medium |
| 15 | DisputeController | `dispute/controllers/dispute.controller.spec.ts` | Medium |
| 16 | KycController | `kyc/controllers/kyc.controller.spec.ts` | High |
| 17 | WalletController | `payment/controllers/wallet.controller.spec.ts` | Medium |
| 18 | InvoiceController | `payment/controllers/invoice.controller.spec.ts` | Medium |
| 19 | SubscriptionController | `payment/controllers/subscription.controller.spec.ts` | Low |
| 20 | HealthController | `health/controllers/health.controller.spec.ts` | Low |
| 21 | ReportController | `reports/controllers/report.controller.spec.ts` | Low |
| 22 | AnalyticsController | `analytics/controllers/analytics.controller.spec.ts` | Low |
| 23 | DashboardController | `dashboard/controllers/dashboard.controller.spec.ts` | Medium |
| 24 | FraudController | `fraud/controllers/fraud.controller.spec.ts` | High |
| 25 | SpecialtyController | `specialty/controllers/specialty.controller.spec.ts` | Low |

---

## Test Coverage Summary

| Phase | Tests | Status |
|-------|-------|--------|
| Phase 1: Core Auth | 4 | ⬜ Pending |
| Phase 2: Payment | 8 | ⬜ Pending |
| Phase 3: Mission | 6 | ⬜ Pending |
| Phase 4: Fraud Detection | 7 | ⬜ Pending |
| Phase 5: Chat & Notification | 6 | ⬜ Pending |
| Phase 6: User & Company | 8 | ⬜ Pending |
| Phase 7: Marketplace | 5 | ⬜ Pending |
| Phase 8: Admin & Reports | 6 | ⬜ Pending |
| Phase 9: Utility | 10 | ⬜ Pending |
| Phase 10: Controllers | 25 | ⬜ Pending |
| **Total New Tests** | **85** | |
| **Existing Tests** | **7** | ✅ Complete |
| **Grand Total** | **92** | |

---

## Implementation Notes

### Test Structure Template
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ServiceName', () => {
  let service: ServiceName;
  let prismaService: PrismaService;

  const mockPrismaService = {
    // Mock methods
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Coverage Requirements
- Each service must have at least 80% line coverage
- All public methods must be tested
- Edge cases and error scenarios must be covered
- Integration points must be mocked properly

### Progress Tracking
Update this file as tests are completed by changing ⬜ to ✅
