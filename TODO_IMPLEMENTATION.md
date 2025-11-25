# ArtiConnect Implementation Todolist

This document tracks all issues identified in the codebase analysis that need to be fixed.

---

## 🔴 CRITICAL SECURITY FIXES (Priority 1 - Must fix before production)

### 1.1 Weak Random Token Generation
- [ ] **AUTH-001**: Replace `Math.random()` with `crypto.randomBytes()` in email verification token generation
  - File: `backend/api-gateway/src/auth/services/auth.service.ts` (Lines 112-114)
- [ ] **AUTH-002**: Replace `Math.random()` with `crypto.randomBytes()` in password reset token generation
  - File: `backend/api-gateway/src/auth/services/auth.service.ts` (Lines 490-492)
- [ ] **AUTH-003**: Replace `Math.random()` with `crypto.randomBytes()` in email verification (second instance)
  - File: `backend/api-gateway/src/auth/services/auth.service.ts` (Lines 761-763)
- [ ] **AUTH-004**: Replace `Math.random()` with `crypto.randomInt()` in phone verification code generation
  - File: `backend/api-gateway/src/auth/services/phone-verification.service.ts` (Line 18)
- [ ] **AUTH-005**: Replace `Math.random()` with `crypto.randomBytes()` in OAuth random password generation
  - File: `backend/api-gateway/src/auth/services/auth.service.ts` (Line 832)

### 1.2 Hardcoded Credentials
- [ ] **SEC-001**: Remove hardcoded test credentials from seed file
  - File: `backend/shared/prisma/seed.ts` (Lines 635-645)
- [ ] **SEC-002**: Use environment variables for test data passwords
  - File: `backend/shared/prisma/seed.ts`

### 1.3 Tokens in URLs
- [ ] **SEC-003**: Refactor password reset to use POST with token in body instead of URL query param
  - File: `backend/api-gateway/src/email/services/email.service.ts` (Line 100)
  - File: `backend/api-gateway/src/notification/services/email-template.service.ts` (Line 523)
- [ ] **SEC-004**: Refactor email verification to use POST with token in body
  - File: `backend/api-gateway/src/email/services/email.service.ts` (Line 114)
- [ ] **SEC-005**: Update frontend password reset page to send token in POST body
  - File: `frontend/app/(auth)/reset-password/page.tsx`
- [ ] **SEC-006**: Update frontend email verification to send token in POST body
  - File: `frontend/app/(auth)/verify-email/page.tsx`

---

## 🟠 HIGH SECURITY FIXES (Priority 2)

### 2.1 Information Disclosure
- [ ] **SEC-007**: Sanitize error output in WebSocket connection handler
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.ts` (Line 45)
- [ ] **SEC-008**: Disable Swagger `persistAuthorization` in production
  - File: `backend/api-gateway/src/main.ts` (Line 184)
- [ ] **SEC-009**: Add ownership verification in payment capture endpoint
  - File: `backend/api-gateway/src/payment/controllers/payment.controller.ts` (Lines 55-70)
- [ ] **SEC-010**: Add ownership verification in payment refund endpoint
  - File: `backend/api-gateway/src/payment/controllers/payment.controller.ts`

### 2.2 Console Logging (Replace with Logger Service)
- [ ] **LOG-001**: Replace console.log in PrismaService
  - File: `backend/api-gateway/src/common/prisma/prisma.service.ts` (Lines 8, 13)
- [ ] **LOG-002**: Replace console.log in RedisService
  - File: `backend/api-gateway/src/common/redis/redis.service.ts` (Lines 10, 15)
- [ ] **LOG-003**: Replace console.log in PaymentService (12 instances)
  - File: `backend/api-gateway/src/payment/services/payment.service.ts` (Lines 1021-1253)
- [ ] **LOG-004**: Replace console.error in ChatGateway
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.ts` (Lines 45, 122)
- [ ] **LOG-005**: Replace console.log in CompanyNotificationService
  - File: `backend/api-gateway/src/company/services/company-notification.service.ts`
- [ ] **LOG-006**: Replace console.log in NoShowService
  - File: `backend/api-gateway/src/payment/services/no-show.service.ts`

### 2.3 Process-Level Error Handling
- [ ] **ERR-001**: Add `process.on('unhandledRejection')` handler
  - File: `backend/api-gateway/src/main.ts`
- [ ] **ERR-002**: Add `process.on('uncaughtException')` handler
  - File: `backend/api-gateway/src/main.ts`

### 2.4 Input Validation
- [ ] **VAL-001**: Add coordinate validation (lat: -90 to 90, lng: -180 to 180) in mission controller
  - File: `backend/api-gateway/src/mission/controllers/mission.controller.ts` (Lines 62-67)
- [ ] **VAL-002**: Add timing-safe comparison for token verification
  - File: `backend/api-gateway/src/auth/services/phone-verification.service.ts` (Line 85)

---

## 🗄️ DATABASE SCHEMA FIXES (Priority 3)

### 3.1 Missing Indexes
- [ ] **DB-001**: Add composite index on `Mission(clientId, status)`
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-002**: Add composite index on `Mission(companyId, status, completedAt)`
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-003**: Add composite index on `Message(senderId, receiverId, createdAt)`
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-004**: Add composite index on `CompanyEmployee(companyId, status)`
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-005**: Add composite index on `EmployeeEarnings(employeeId, status, createdAt)`
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-006**: Add index on `Transaction(missionId)`
  - File: `backend/shared/prisma/schema.prisma`

### 3.2 Schema Refactoring
- [ ] **DB-007**: Create `UserFraudProfile` model to extract fraud-related fields from User
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-008**: Create `UserKycProfile` model to extract KYC-related fields from User
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-009**: Update User model to reference new profile models
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-010**: Migrate existing User fraud data to UserFraudProfile
  - File: `backend/shared/prisma/migrations/`
- [ ] **DB-011**: Migrate existing User KYC data to UserKycProfile
  - File: `backend/shared/prisma/migrations/`

### 3.3 Review System Fix
- [ ] **DB-012**: Change Review unique constraint from `missionId` to `(missionId, reviewType)` for bidirectional reviews
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-013**: Update ReviewService to handle bidirectional reviews
  - File: `backend/api-gateway/src/review/services/review.service.ts`
- [ ] **DB-014**: Create migration for review constraint change
  - File: `backend/shared/prisma/migrations/`

### 3.4 Missing Foreign Keys
- [ ] **DB-015**: Add proper FK relation for `Negotiation.senderId` to User
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-016**: Add proper FK relation for `Negotiation.receiverId` to User
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-017**: Add proper FK relation for `MissionHistory.changedBy` to User
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-018**: Add proper FK relation for `EmployeeShift.createdBy` to User
  - File: `backend/shared/prisma/schema.prisma`

### 3.5 Soft Delete Consistency
- [ ] **DB-019**: Add `deletedAt` field to Mission model
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-020**: Add `deletedAt` field to Company model
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-021**: Add `deletedAt` field to Product model
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-022**: Add `deletedAt` field to Review model
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **DB-023**: Add soft delete middleware to Prisma
  - File: `backend/api-gateway/src/common/prisma/prisma.service.ts`

---

## ⚡ PERFORMANCE FIXES (Priority 4)

### 4.1 N+1 Query Problems
- [ ] **PERF-001**: Refactor `findAndNotifyNearbyArtisans` to use `createMany()` for notifications
  - File: `backend/api-gateway/src/mission/services/mission.service.ts` (Lines 341-352)
- [ ] **PERF-002**: Refactor `cleanupExpiredMissions` to use `updateMany()` instead of loop
  - File: `backend/api-gateway/src/mission/services/mission-cron.service.ts` (Lines 132-139)
- [ ] **PERF-003**: Refactor `sendWeeklyClientSummaries` to batch user queries
  - File: `backend/api-gateway/src/admin/services/email-cron.service.ts` (Lines 43-119)
- [ ] **PERF-004**: Refactor `sendWeeklyArtisanSummaries` to batch user queries
  - File: `backend/api-gateway/src/admin/services/email-cron.service.ts` (Lines 140+)
- [ ] **PERF-005**: Refactor `scoreEmployees` to use `Promise.all()` instead of sequential async calls
  - File: `backend/api-gateway/src/mission/services/auto-assignment.service.ts` (Lines 143-147)
- [ ] **PERF-006**: Refactor payment cron loops to use batch operations
  - File: `backend/api-gateway/src/payment/services/payment-cron.service.ts` (Lines 52-175)

### 4.2 Caching Implementation
- [ ] **PERF-007**: Implement Redis caching for system configuration
  - File: `backend/api-gateway/src/config/services/config.service.ts`
  - TTL: 3600s
- [ ] **PERF-008**: Implement Redis caching for currency exchange rates
  - File: `backend/api-gateway/src/payment/services/currency.service.ts`
  - TTL: 1800s
- [ ] **PERF-009**: Implement Redis caching for specialty list
  - File: `backend/api-gateway/src/specialty/services/specialty.service.ts`
  - TTL: 3600s
- [ ] **PERF-010**: Implement Redis caching for feature toggles
  - File: `backend/api-gateway/src/fraud/services/feature-toggle.service.ts`
  - TTL: 600s
- [ ] **PERF-011**: Implement Redis caching for dashboard KPIs
  - File: `backend/api-gateway/src/reports/services/dashboard.service.ts`
  - TTL: 300s
- [ ] **PERF-012**: Implement Redis caching for product listings
  - File: `backend/api-gateway/src/marketplace/services/product.service.ts`
  - TTL: 600s

### 4.3 Geographic Query Optimization
- [ ] **PERF-013**: Add PostGIS extension to PostgreSQL
  - File: `docker-compose.yml`
- [ ] **PERF-014**: Add geometry column to Mission model
  - File: `backend/shared/prisma/schema.prisma`
- [ ] **PERF-015**: Refactor `getNearbyMissions` to use PostGIS spatial query
  - File: `backend/api-gateway/src/mission/services/mission.service.ts` (Lines 261-296)
- [ ] **PERF-016**: Refactor `findAndNotifyNearbyArtisans` to use PostGIS
  - File: `backend/api-gateway/src/mission/services/mission.service.ts` (Lines 298-356)
- [ ] **PERF-017**: Create spatial index on Mission location
  - File: `backend/shared/prisma/migrations/`

### 4.4 Pagination
- [ ] **PERF-018**: Add pagination to `getRecentActivities`
  - File: `backend/api-gateway/src/reports/services/dashboard.service.ts` (Lines 231-296)
- [ ] **PERF-019**: Add pagination to `getEmployeePerformanceReport`
  - File: `backend/api-gateway/src/reports/services/company-reports.service.ts` (Lines 112-150)
- [ ] **PERF-020**: Add pagination to `mission.findAll`
  - File: `backend/api-gateway/src/mission/services/mission.service.ts` (Lines 71-113)
- [ ] **PERF-021**: Add pagination to `processPayoutsByFrequency`
  - File: `backend/api-gateway/src/payment/services/automated-payout.service.ts` (Lines 36-83)

### 4.5 WebSocket Optimization
- [ ] **PERF-022**: Implement WebSocket heartbeat/ping-pong
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.ts`
- [ ] **PERF-023**: Add connection limit per user
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.ts`
- [ ] **PERF-024**: Implement reconnection timeout cleanup
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.ts`

---

## 🧪 TESTING (Priority 5)

### 5.1 Payment Services Unit Tests
- [ ] **TEST-001**: Create unit tests for `payment.service.ts`
  - File: `backend/api-gateway/src/payment/services/payment.service.spec.ts`
- [ ] **TEST-002**: Create unit tests for `stripe.service.ts`
  - File: `backend/api-gateway/src/payment/services/stripe.service.spec.ts`
- [ ] **TEST-003**: Create unit tests for `paypal.service.ts`
  - File: `backend/api-gateway/src/payment/services/paypal.service.spec.ts`
- [ ] **TEST-004**: Create unit tests for `bank-transfer.service.ts`
  - File: `backend/api-gateway/src/payment/services/bank-transfer.service.spec.ts`
- [ ] **TEST-005**: Create unit tests for `deferred-payment.service.ts`
  - File: `backend/api-gateway/src/payment/services/deferred-payment.service.spec.ts`
- [ ] **TEST-006**: Create unit tests for `automated-payout.service.ts`
  - File: `backend/api-gateway/src/payment/services/automated-payout.service.spec.ts`
- [ ] **TEST-007**: Create unit tests for `employee-earnings.service.ts`
  - File: `backend/api-gateway/src/payment/services/employee-earnings.service.spec.ts`
- [ ] **TEST-008**: Create unit tests for `currency.service.ts`
  - File: `backend/api-gateway/src/payment/services/currency.service.spec.ts`
- [ ] **TEST-009**: Create unit tests for `reputation.service.ts`
  - File: `backend/api-gateway/src/payment/services/reputation.service.spec.ts`

### 5.2 Fraud Detection Services Unit Tests
- [ ] **TEST-010**: Create unit tests for `bot-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/bot-detector.service.spec.ts`
- [ ] **TEST-011**: Create unit tests for `multi-account-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/multi-account-detector.service.spec.ts`
- [ ] **TEST-012**: Create unit tests for `session-anomaly-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/session-anomaly-detector.service.spec.ts`
- [ ] **TEST-013**: Create unit tests for `payout-fraud-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/payout-fraud-detector.service.spec.ts`
- [ ] **TEST-014**: Create unit tests for `price-anomaly-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/price-anomaly-detector.service.spec.ts`
- [ ] **TEST-015**: Create unit tests for `review-fraud-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/review-fraud-detector.service.spec.ts`
- [ ] **TEST-016**: Create unit tests for `refund-abuse-detector.service.ts`
  - File: `backend/api-gateway/src/fraud/services/refund-abuse-detector.service.spec.ts`
- [ ] **TEST-017**: Create unit tests for `feature-toggle.service.ts`
  - File: `backend/api-gateway/src/fraud/services/feature-toggle.service.spec.ts`

### 5.3 Authentication Services Unit Tests
- [ ] **TEST-018**: Create unit tests for `login-security.service.ts`
  - File: `backend/api-gateway/src/auth/services/login-security.service.spec.ts`
- [ ] **TEST-019**: Create unit tests for `phone-verification.service.ts`
  - File: `backend/api-gateway/src/auth/services/phone-verification.service.spec.ts`
- [ ] **TEST-020**: Create unit tests for `session.service.ts`
  - File: `backend/api-gateway/src/auth/services/session.service.spec.ts`
- [ ] **TEST-021**: Create unit tests for `two-factor.service.ts`
  - File: `backend/api-gateway/src/auth/services/two-factor.service.spec.ts`

### 5.4 Mission Services Unit Tests
- [ ] **TEST-022**: Create unit tests for `mission.service.ts`
  - File: `backend/api-gateway/src/mission/services/mission.service.spec.ts`
- [ ] **TEST-023**: Create unit tests for `mission-assignment.service.ts`
  - File: `backend/api-gateway/src/mission/services/mission-assignment.service.spec.ts`
- [ ] **TEST-024**: Create unit tests for `auto-assignment.service.ts`
  - File: `backend/api-gateway/src/mission/services/auto-assignment.service.spec.ts`
- [ ] **TEST-025**: Create unit tests for `mission-search.service.ts`
  - File: `backend/api-gateway/src/mission/services/mission-search.service.spec.ts`

### 5.5 Chat Services Unit Tests
- [ ] **TEST-026**: Create unit tests for `chat.service.ts`
  - File: `backend/api-gateway/src/chat/services/chat.service.spec.ts`
- [ ] **TEST-027**: Create unit tests for `encryption.service.ts`
  - File: `backend/api-gateway/src/chat/services/encryption.service.spec.ts`
- [ ] **TEST-028**: Create unit tests for `content-filter.service.ts`
  - File: `backend/api-gateway/src/chat/services/content-filter.service.spec.ts`

### 5.6 Frontend Testing Setup
- [ ] **TEST-029**: Configure Jest for frontend
  - File: `frontend/jest.config.js`
- [ ] **TEST-030**: Configure React Testing Library
  - File: `frontend/jest.setup.js`
- [ ] **TEST-031**: Create test utilities and mocks
  - File: `frontend/__tests__/utils/`
- [ ] **TEST-032**: Create unit tests for AuthContext
  - File: `frontend/__tests__/contexts/AuthContext.test.tsx`
- [ ] **TEST-033**: Create unit tests for cart store
  - File: `frontend/__tests__/stores/cartStore.test.ts`
- [ ] **TEST-034**: Create component tests for Button
  - File: `frontend/__tests__/components/ui/button.test.tsx`
- [ ] **TEST-035**: Create component tests for ReviewForm
  - File: `frontend/__tests__/components/reviews/ReviewForm.test.tsx`

### 5.7 Controller Integration Tests
- [ ] **TEST-036**: Create integration tests for AuthController
  - File: `backend/api-gateway/src/auth/controllers/auth.controller.spec.ts`
- [ ] **TEST-037**: Create integration tests for MissionController
  - File: `backend/api-gateway/src/mission/controllers/mission.controller.spec.ts`
- [ ] **TEST-038**: Create integration tests for PaymentController
  - File: `backend/api-gateway/src/payment/controllers/payment.controller.spec.ts`
- [ ] **TEST-039**: Create integration tests for MarketplaceController
  - File: `backend/api-gateway/src/marketplace/controllers/marketplace.controller.spec.ts`
- [ ] **TEST-040**: Create integration tests for ChatGateway
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.spec.ts`

---

## 🔧 MAJOR FUNCTIONALITY GAPS (Priority 6)

### 6.1 Payment System Enhancements
- [ ] **FEAT-001**: Create frontend UI for partial refunds
  - File: `frontend/app/client/missions/[id]/refund/page.tsx`
- [ ] **FEAT-002**: Create invoice PDF download endpoint
  - File: `backend/api-gateway/src/invoice/controllers/invoice.controller.ts`
- [ ] **FEAT-003**: Create frontend invoice download button
  - File: `frontend/app/client/invoices/page.tsx`
- [ ] **FEAT-004**: Implement payment retry logic on failure
  - File: `backend/api-gateway/src/payment/services/payment.service.ts`
- [ ] **FEAT-005**: Create saved payment methods management UI
  - File: `frontend/app/client/settings/payment-methods/page.tsx`

### 6.2 Chat Enhancements
- [ ] **FEAT-006**: Add file attachment support to chat messages
  - File: `backend/api-gateway/src/chat/services/chat.service.ts`
- [ ] **FEAT-007**: Create file upload endpoint for chat
  - File: `backend/api-gateway/src/chat/controllers/chat.controller.ts`
- [ ] **FEAT-008**: Update ChatBox component for file attachments
  - File: `frontend/components/chat/ChatBox.tsx`
- [ ] **FEAT-009**: Implement message search in chat
  - File: `backend/api-gateway/src/chat/services/chat.service.ts`
- [ ] **FEAT-010**: Add message search UI
  - File: `frontend/components/chat/ChatSearch.tsx`

### 6.3 Marketplace Enhancements
- [ ] **FEAT-011**: Implement product reviews system
  - File: `backend/api-gateway/src/marketplace/services/product-review.service.ts`
- [ ] **FEAT-012**: Create ProductReviewController
  - File: `backend/api-gateway/src/marketplace/controllers/product-review.controller.ts`
- [ ] **FEAT-013**: Create product review UI components
  - File: `frontend/components/marketplace/ProductReviewForm.tsx`
- [ ] **FEAT-014**: Implement wishlist/favorites for products
  - File: `backend/api-gateway/src/marketplace/services/wishlist.service.ts`
- [ ] **FEAT-015**: Create wishlist UI
  - File: `frontend/app/client/wishlist/page.tsx`
- [ ] **FEAT-016**: Implement low stock alerts
  - File: `backend/api-gateway/src/marketplace/services/inventory-alert.service.ts`

### 6.4 Error Handling Standardization
- [ ] **FEAT-017**: Create standard error response interface
  - File: `backend/api-gateway/src/common/interfaces/error-response.interface.ts`
- [ ] **FEAT-018**: Update global exception filter to use standard format
  - File: `backend/api-gateway/src/common/filters/http-exception.filter.ts`
- [ ] **FEAT-019**: Standardize WebSocket error responses
  - File: `backend/api-gateway/src/chat/gateways/chat.gateway.ts`
- [ ] **FEAT-020**: Create frontend error handling utilities
  - File: `frontend/lib/utils/error-handler.ts`

---

## 📊 Summary

| Category | Total Tasks | Priority |
|----------|-------------|----------|
| 🔴 Critical Security | 12 | 1 - Immediate |
| 🟠 High Security | 16 | 2 - This week |
| 🗄️ Database | 23 | 3 - Next week |
| ⚡ Performance | 24 | 4 - Next 2 weeks |
| 🧪 Testing | 40 | 5 - Ongoing |
| 🔧 Functionality | 20 | 6 - After testing |

**Total Tasks: 135**

---

## Progress Tracking

### Phase 1: Critical Security (Week 1)
- [ ] Start Date: ___________
- [ ] Complete AUTH-001 through AUTH-005
- [ ] Complete SEC-001 through SEC-006
- [ ] End Date: ___________

### Phase 2: High Security (Week 1-2)
- [ ] Start Date: ___________
- [ ] Complete SEC-007 through SEC-010
- [ ] Complete LOG-001 through LOG-006
- [ ] Complete ERR-001, ERR-002
- [ ] Complete VAL-001, VAL-002
- [ ] End Date: ___________

### Phase 3: Database (Week 2-3)
- [ ] Start Date: ___________
- [ ] Complete DB-001 through DB-023
- [ ] End Date: ___________

### Phase 4: Performance (Week 3-4)
- [ ] Start Date: ___________
- [ ] Complete PERF-001 through PERF-024
- [ ] End Date: ___________

### Phase 5: Testing (Ongoing)
- [ ] Start Date: ___________
- [ ] Complete TEST-001 through TEST-040
- [ ] Target Coverage: 80%
- [ ] End Date: ___________

### Phase 6: Features (After Testing)
- [ ] Start Date: ___________
- [ ] Complete FEAT-001 through FEAT-020
- [ ] End Date: ___________

---

*Last Updated: November 25, 2025*
