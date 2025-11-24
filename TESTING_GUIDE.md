# Multi-Employee System - Testing Guide

## Overview

This guide provides testing strategies and examples for the multi-employee company management system. Tests ensure correctness, security, and performance of all features.

## Test Structure

```
backend/api-gateway/
├── src/
│   ├── company/
│   │   ├── __tests__/
│   │   │   ├── company.service.spec.ts
│   │   │   └── company.controller.spec.ts
│   ├── employee/
│   │   ├── __tests__/
│   │   │   ├── employee.service.spec.ts
│   │   │   └── shift-scheduling.service.spec.ts
│   ├── mission/
│   │   ├── __tests__/
│   │   │   ├── mission-assignment.service.spec.ts
│   │   │   └── auto-assignment.service.spec.ts
│   └── payment/
│       ├── __tests__/
│           ├── employee-earnings.service.spec.ts
│           └── automated-payout.service.spec.ts
└── test/
    ├── integration/
    │   ├── company-workflow.e2e-spec.ts
    │   ├── employee-invitation.e2e-spec.ts
    │   └── mission-assignment.e2e-spec.ts
    └── fixtures/
        ├── company.fixture.ts
        └── employee.fixture.ts
```

## Unit Testing Examples

### 1. Company Service Tests

```typescript
// company.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from '../company.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            companyEmployee: {
              create: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createCompany', () => {
    it('should create a company with owner as first employee', async () => {
      const ownerId = 'user-123';
      const createDto = {
        companyName: 'Test Company',
        siret: '12345678901234',
        address: '123 Test St',
        city: 'Paris',
        postalCode: '75001',
        phone: '+33123456789',
      };

      const mockCompany = {
        id: 'company-123',
        ...createDto,
        ownerId,
      };

      jest.spyOn(prisma.company, 'create').mockResolvedValue(mockCompany as any);

      const result = await service.createCompany(ownerId, createDto);

      expect(result).toEqual(mockCompany);
      expect(prisma.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyName: createDto.companyName,
          ownerId,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if SIRET already exists', async () => {
      const createDto = {
        companyName: 'Test Company',
        siret: '12345678901234',
      };

      jest.spyOn(prisma.company, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['siret'] },
      });

      await expect(service.createCompany('user-123', createDto))
        .rejects.toThrow('Company with this SIRET already exists');
    });
  });

  describe('getCompanyById', () => {
    it('should return company with employees', async () => {
      const companyId = 'company-123';
      const userId = 'user-123';

      const mockCompany = {
        id: companyId,
        companyName: 'Test Company',
        employees: [
          { id: 'emp-1', userId, role: 'OWNER', status: 'ACTIVE' },
        ],
      };

      jest.spyOn(prisma.company, 'findUnique').mockResolvedValue(mockCompany as any);

      const result = await service.getCompanyById(companyId, userId);

      expect(result).toEqual(mockCompany);
    });

    it('should throw ForbiddenException if user not in company', async () => {
      jest.spyOn(prisma.company, 'findUnique').mockResolvedValue({
        id: 'company-123',
        employees: [],
      } as any);

      await expect(service.getCompanyById('company-123', 'other-user'))
        .rejects.toThrow('You do not have access to this company');
    });
  });
});
```

### 2. Employee Earnings Service Tests

```typescript
// employee-earnings.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeEarningsService } from '../employee-earnings.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('EmployeeEarningsService', () => {
  let service: EmployeeEarningsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeEarningsService,
        {
          provide: PrismaService,
          useValue: {
            mission: { findUnique: jest.fn() },
            companyEmployee: { findUnique: jest.fn() },
            employeeEarnings: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmployeeEarningsService>(EmployeeEarningsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createEarningsFromMission', () => {
    it('should calculate correct commission for employee', async () => {
      const missionPrice = new Prisma.Decimal(1000);
      const commissionRate = new Prisma.Decimal(50);

      const mockMission = {
        id: 'mission-123',
        finalPrice: missionPrice,
        companyId: 'company-123',
        assignedToId: 'emp-123',
      };

      const mockEmployee = {
        id: 'emp-123',
        commissionRate,
        companyId: 'company-123',
      };

      jest.spyOn(prisma.mission, 'findUnique').mockResolvedValue(mockMission as any);
      jest.spyOn(prisma.companyEmployee, 'findUnique').mockResolvedValue(mockEmployee as any);

      const mockEarnings = {
        id: 'earnings-123',
        missionRevenue: new Prisma.Decimal(1000),
        platformCommission: new Prisma.Decimal(120), // 12%
        companyRevenue: new Prisma.Decimal(880),
        employeeCommission: new Prisma.Decimal(440), // 50% of 880
        employeeCommissionRate: commissionRate,
        status: 'PENDING',
      };

      jest.spyOn(prisma.employeeEarnings, 'create').mockResolvedValue(mockEarnings as any);

      const result = await service.createEarningsFromMission('mission-123', 'emp-123');

      expect(result.employeeCommission.toNumber()).toBe(440);
      expect(result.platformCommission.toNumber()).toBe(120);
      expect(result.companyRevenue.toNumber()).toBe(880);
    });

    it('should throw error if mission has no final price', async () => {
      jest.spyOn(prisma.mission, 'findUnique').mockResolvedValue({
        id: 'mission-123',
        finalPrice: null,
      } as any);

      await expect(service.createEarningsFromMission('mission-123', 'emp-123'))
        .rejects.toThrow('Mission does not have a final price');
    });
  });

  describe('processPayout', () => {
    it('should mark earnings as PAID and record payout date', async () => {
      const mockEarnings = {
        id: 'earnings-123',
        employeeCommission: new Prisma.Decimal(440),
        status: 'PENDING',
      };

      jest.spyOn(prisma.employeeEarnings, 'findUnique').mockResolvedValue(mockEarnings as any);
      jest.spyOn(prisma.employeeEarnings, 'update').mockResolvedValue({
        ...mockEarnings,
        status: 'PAID',
        payoutDate: new Date(),
      } as any);

      const result = await service.processPayout('earnings-123', 'STRIPE_TRANSFER');

      expect(result.status).toBe('PAID');
      expect(result.payoutDate).toBeDefined();
    });
  });
});
```

### 3. Auto-Assignment Service Tests

```typescript
// auto-assignment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AutoAssignmentService } from '../auto-assignment.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AutoAssignmentService', () => {
  let service: AutoAssignmentService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoAssignmentService,
        {
          provide: PrismaService,
          useValue: {
            mission: { findUnique: jest.fn(), update: jest.fn() },
            companyEmployee: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AutoAssignmentService>(AutoAssignmentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('autoAssignMission', () => {
    it('should assign to employee with highest score', async () => {
      const mockMission = {
        id: 'mission-123',
        category: 'PLUMBING',
        companyId: 'company-123',
      };

      const mockEmployees = [
        {
          id: 'emp-1',
          specialties: [{ name: 'PLUMBING' }],
          assignedMissions: [],
          averageRating: new Prisma.Decimal(4.8),
          totalMissions: 50,
        },
        {
          id: 'emp-2',
          specialties: [{ name: 'ELECTRICAL' }],
          assignedMissions: [{ id: 'm1' }, { id: 'm2' }],
          averageRating: new Prisma.Decimal(4.5),
          totalMissions: 30,
        },
      ];

      jest.spyOn(prisma.mission, 'findUnique').mockResolvedValue(mockMission as any);
      jest.spyOn(prisma.companyEmployee, 'findMany').mockResolvedValue(mockEmployees as any);
      jest.spyOn(prisma.mission, 'update').mockResolvedValue({
        ...mockMission,
        assignedToId: 'emp-1',
      } as any);

      const result = await service.autoAssignMission('mission-123', 'requester-123');

      expect(result.assigned).toBe(true);
      expect(result.employee.id).toBe('emp-1'); // Better specialty match
      expect(result.employee.score).toBeGreaterThan(70);
    });

    it('should return suggestions if no auto-assignment', async () => {
      const result = await service.getSuggestions('mission-123', 'requester-123');

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toHaveProperty('score');
      expect(result.suggestions[0]).toHaveProperty('recommendation');
    });
  });

  describe('scoreEmployees', () => {
    it('should weight specialty match highest (40%)', () => {
      // Test implementation of scoring algorithm
      const mission = { category: 'PLUMBING' };
      const employee = {
        specialties: [{ name: 'PLUMBING' }],
        assignedMissions: [],
        averageRating: new Prisma.Decimal(4.0),
        totalMissions: 20,
      };

      // Specialty match should contribute 40 points to total score
      const score = service['calculateSpecialtyMatch']('PLUMBING', employee.specialties);
      expect(score).toBeGreaterThan(0.9); // 90%+ match
    });
  });
});
```

## Integration Testing Examples

### 1. Company Workflow E2E Test

```typescript
// company-workflow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Company Workflow (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let companyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as artisan to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'owner@example.com',
        password: 'password123',
      });

    ownerToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete company setup flow', () => {
    it('Step 1: Create company', async () => {
      const response = await request(app.getHttpServer())
        .post('/company')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          companyName: 'Elite Services',
          siret: '12345678901234',
          address: '123 Test St',
          city: 'Paris',
          postalCode: '75001',
          phone: '+33123456789',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.companyName).toBe('Elite Services');
      companyId = response.body.id;
    });

    it('Step 2: Update company settings', async () => {
      const response = await request(app.getHttpServer())
        .put(`/company/${companyId}/settings`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          defaultCommissionRate: 50,
          autoAssignMissions: true,
          payoutFrequency: 'WEEKLY',
        })
        .expect(200);

      expect(response.body.defaultCommissionRate).toBe('50.00');
    });

    it('Step 3: Invite employee', async () => {
      const response = await request(app.getHttpServer())
        .post(`/employees/invite?companyId=${companyId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'tech@example.com',
          role: 'TECHNICIAN',
          commissionRate: 50,
          paymentModel: 'COMMISSION',
        })
        .expect(201);

      expect(response.body).toHaveProperty('invitationToken');
      expect(response.body.status).toBe('PENDING_INVITATION');
    });

    it('Step 4: Get company stats', async () => {
      const response = await request(app.getHttpServer())
        .get(`/company/${companyId}/stats`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.totalEmployees).toBe(1); // Owner
    });
  });
});
```

### 2. Mission Assignment E2E Test

```typescript
// mission-assignment.e2e-spec.ts
describe('Mission Assignment Flow (e2e)', () => {
  let app: INestApplication;
  let managerToken: string;
  let missionId: string;
  let employeeId: string;

  it('Should auto-assign mission to best employee', async () => {
    const response = await request(app.getHttpServer())
      .post(`/missions/auto-assignment/${missionId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body.assigned).toBe(true);
    expect(response.body.employee).toHaveProperty('score');
    expect(response.body.employee.score).toBeGreaterThan(70);
  });

  it('Should create earnings when mission completed', async () => {
    // Complete mission
    await request(app.getHttpServer())
      .put(`/missions/assignment/${missionId}/complete`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ completedById: employeeId })
      .expect(200);

    // Check earnings created
    const earningsResponse = await request(app.getHttpServer())
      .get(`/earnings/employee/${employeeId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(earningsResponse.body.earnings).toHaveLength(1);
    expect(earningsResponse.body.earnings[0].status).toBe('PENDING');
  });
});
```

## Test Data Fixtures

```typescript
// fixtures/company.fixture.ts
export const createMockCompany = (overrides = {}) => ({
  id: 'company-123',
  companyName: 'Test Company',
  siret: '12345678901234',
  ownerId: 'user-123',
  totalMissions: 0,
  totalRevenue: new Prisma.Decimal(0),
  ...overrides,
});

export const createMockEmployee = (overrides = {}) => ({
  id: 'emp-123',
  companyId: 'company-123',
  userId: 'user-456',
  role: 'TECHNICIAN',
  status: 'ACTIVE',
  commissionRate: new Prisma.Decimal(50),
  paymentModel: 'COMMISSION',
  ...overrides,
});

export const createMockEarnings = (overrides = {}) => ({
  id: 'earnings-123',
  employeeId: 'emp-123',
  missionId: 'mission-123',
  missionRevenue: new Prisma.Decimal(1000),
  platformCommission: new Prisma.Decimal(120),
  companyRevenue: new Prisma.Decimal(880),
  employeeCommission: new Prisma.Decimal(440),
  employeeCommissionRate: new Prisma.Decimal(50),
  status: 'PENDING',
  ...overrides,
});
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Get company dashboard"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "owner@example.com"
            password: "password123"
          capture:
            - json: "$.access_token"
              as: "token"
      - get:
          url: "/reports/company/{{ companyId }}/dashboard"
          headers:
            Authorization: "Bearer {{ token }}"
```

Run with: `artillery run artillery-config.yml`

## Testing Checklist

### Unit Tests
- ✅ Service layer business logic
- ✅ Commission calculations
- ✅ Permission validation
- ✅ Auto-assignment scoring
- ✅ Error handling
- ✅ Edge cases

### Integration Tests
- ✅ API endpoints
- ✅ Database transactions
- ✅ Multi-step workflows
- ✅ Authentication/authorization
- ✅ Data validation

### E2E Tests
- ✅ Company creation flow
- ✅ Employee invitation flow
- ✅ Mission assignment flow
- ✅ Payout processing flow
- ✅ Report generation

### Performance Tests
- ✅ Dashboard load time <500ms
- ✅ Auto-assignment <2s
- ✅ Batch payout processing
- ✅ Report generation <3s
- ✅ Concurrent user load

## Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch

# Specific test file
npm run test -- company.service.spec.ts
```

## Coverage Requirements

- **Minimum Coverage:** 80%
- **Critical Services:** 90%+
  - CompanyService
  - EmployeeEarningsService
  - AutoAssignmentService
  - MissionAssignmentService

---

**Testing Framework:** Jest
**E2E Framework:** Supertest
**Coverage Tool:** Istanbul
**Load Testing:** Artillery

