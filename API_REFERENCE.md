# Multi-Employee System - API Reference

## Table of Contents
1. [Company Management](#company-management)
2. [Employee Management](#employee-management)
3. [Mission Assignment](#mission-assignment)
4. [Payment & Earnings](#payment--earnings)
5. [Reports & Analytics](#reports--analytics)
6. [Employee Features](#employee-features)

---

## Company Management

### Create Company
```
POST /company
Authorization: Bearer <token>
Role: ARTISAN
```

**Request Body:**
```json
{
  "companyName": "string",
  "siret": "string (14 digits)",
  "vatNumber": "string (optional)",
  "address": "string",
  "city": "string",
  "postalCode": "string",
  "country": "string (default: FR)",
  "phone": "string",
  "email": "string",
  "description": "string (optional)",
  "website": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "companyName": "string",
  "ownerId": "uuid",
  "totalMissions": 0,
  "totalRevenue": "0.00",
  "createdAt": "ISO8601"
}
```

---

### Get Company Details
```
GET /company/:id
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "companyName": "string",
  "siret": "string",
  "owner": {
    "id": "uuid",
    "firstName": "string",
    "lastName": "string"
  },
  "totalMissions": 0,
  "totalRevenue": "0.00",
  "employees": [...]
}
```

---

### Update Company
```
PUT /company/:id
Authorization: Bearer <token>
Role: ARTISAN (Owner only)
```

**Request Body:** Same as Create Company (all fields optional)

**Response:** `200 OK` - Updated company object

---

### Delete Company
```
DELETE /company/:id
Authorization: Bearer <token>
Role: ARTISAN (Owner only)
```

**Response:** `200 OK`
```json
{
  "message": "Company deleted successfully"
}
```

---

### Get Company Statistics
```
GET /company/:id/stats
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "totalEmployees": 5,
  "activeEmployees": 4,
  "totalMissions": 150,
  "completedMissions": 145,
  "totalRevenue": "125000.00",
  "averageRating": "4.85"
}
```

---

### Get Company Settings
```
GET /company/:id/settings
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Response:** `200 OK`
```json
{
  "defaultCommissionRate": "50.00",
  "autoAssignMissions": false,
  "payoutFrequency": "WEEKLY",
  "minimumPayout": "50.00",
  "notifyOwnerOnNewMission": true
}
```

---

### Update Company Settings
```
PUT /company/:id/settings
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager with canManageSettings)
```

**Request Body:**
```json
{
  "defaultCommissionRate": "number (0-100)",
  "autoAssignMissions": "boolean",
  "payoutFrequency": "DAILY | WEEKLY | BIWEEKLY | MONTHLY",
  "minimumPayout": "number"
}
```

---

## Employee Management

### Invite Employee
```
POST /employees/invite?companyId=<uuid>
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "email": "string",
  "role": "MANAGER | SUPERVISOR | TECHNICIAN | CONTRACTOR",
  "commissionRate": "number (0-100)",
  "baseSalary": "number (optional)",
  "paymentModel": "SALARY | COMMISSION | HYBRID",
  "permissions": ["string"] // optional
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "invitationToken": "string (64 chars)",
  "email": "string",
  "role": "string",
  "status": "PENDING_INVITATION",
  "invitationSentAt": "ISO8601"
}
```

---

### Accept Invitation
```
POST /employees/accept-invitation
Authorization: Bearer <token>
Role: ARTISAN
```

**Request Body:**
```json
{
  "invitationToken": "string"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "company": { ... },
  "role": "string"
}
```

---

### List Company Employees
```
GET /employees/company/:companyId?status=ACTIVE&role=TECHNICIAN
Authorization: Bearer <token>
Role: ARTISAN
```

**Query Parameters:**
- `status`: PENDING_INVITATION | ACTIVE | SUSPENDED | TERMINATED
- `role`: OWNER | MANAGER | SUPERVISOR | TECHNICIAN | CONTRACTOR

**Response:** `200 OK`
```json
{
  "total": 10,
  "employees": [
    {
      "id": "uuid",
      "user": {
        "firstName": "string",
        "lastName": "string",
        "email": "string"
      },
      "role": "TECHNICIAN",
      "status": "ACTIVE",
      "commissionRate": "50.00",
      "totalMissions": 25,
      "totalEarnings": "15000.00"
    }
  ]
}
```

---

### Update Employee
```
PUT /employees/:id
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "role": "string (optional)",
  "commissionRate": "number (optional)",
  "baseSalary": "number (optional)",
  "status": "string (optional)",
  "permissions": ["string"] // optional
}
```

---

### Remove Employee
```
DELETE /employees/:id
Authorization: Bearer <token>
Role: ARTISAN (Owner only)
```

**Response:** `200 OK`

---

## Mission Assignment

### Assign Mission to Employee
```
POST /missions/assignment/assign
Authorization: Bearer <token>
Role: ARTISAN (canAssignMissions permission)
```

**Request Body:**
```json
{
  "missionId": "uuid",
  "employeeId": "uuid",
  "notes": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "mission": { ... },
  "assignedTo": { ... },
  "assignedAt": "ISO8601"
}
```

---

### Auto-Assign Mission
```
POST /missions/auto-assignment/:missionId/assign
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "assigned": true,
  "employee": {
    "id": "uuid",
    "name": "string",
    "score": 87.5
  },
  "reasoning": {
    "specialtyMatch": 95,
    "workload": 80,
    "rating": 90,
    "availability": 100,
    "experience": 75
  }
}
```

---

### Get Auto-Assignment Suggestions
```
GET /missions/auto-assignment/:missionId/suggestions
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "mission": { ... },
  "suggestions": [
    {
      "employee": { ... },
      "score": 92.5,
      "recommendation": "HIGHLY_RECOMMENDED",
      "reasoning": { ... }
    }
  ]
}
```

---

### Bulk Assign Missions
```
POST /missions/assignment/bulk-assign
Authorization: Bearer <token>
Role: ARTISAN
```

**Request Body:**
```json
{
  "assignments": [
    {
      "missionId": "uuid",
      "employeeId": "uuid"
    }
  ]
}
```

---

### Get Employee Missions
```
GET /missions/assignment/employee/:employeeId?status=IN_PROGRESS
Authorization: Bearer <token>
Role: ARTISAN
```

**Query Parameters:**
- `status`: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
- `startDate`: ISO8601 (optional)
- `endDate`: ISO8601 (optional)

---

### Get Employee Workload
```
GET /missions/assignment/employee/:employeeId/workload
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "employeeId": "uuid",
  "activeMissions": 3,
  "pendingMissions": 2,
  "completedThisMonth": 12,
  "utilizationRate": 75.5
}
```

---

## Payment & Earnings

### Create Earnings Record
```
POST /earnings/create
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "missionId": "uuid",
  "employeeId": "uuid",
  "notes": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "missionRevenue": "1000.00",
  "platformCommission": "120.00",
  "companyRevenue": "880.00",
  "employeeCommission": "440.00",
  "employeeCommissionRate": "50.00",
  "status": "PENDING"
}
```

---

### Process Payout
```
POST /earnings/:id/process-payout
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "payoutMethod": "STRIPE_TRANSFER | BANK_TRANSFER | MANUAL"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "PAID",
  "payoutDate": "ISO8601",
  "stripeTransferId": "string"
}
```

---

### Get Employee Earnings
```
GET /earnings/employee/:employeeId?status=PENDING
Authorization: Bearer <token>
Role: ARTISAN
```

**Query Parameters:**
- `status`: PENDING | PROCESSING | PAID | FAILED
- `startDate`: ISO8601 (optional)
- `endDate`: ISO8601 (optional)

**Response:** `200 OK`
```json
{
  "total": 25,
  "totalAmount": "12500.00",
  "earnings": [
    {
      "id": "uuid",
      "mission": { ... },
      "employeeCommission": "500.00",
      "status": "PENDING",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

### Batch Payout Processing
```
POST /earnings/company/:companyId/batch-payout
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "employeeIds": ["uuid"] // optional, processes all if empty
}
```

**Response:** `200 OK`
```json
{
  "processed": 15,
  "totalAmount": "22500.00",
  "failed": 2
}
```

---

### Automated Payout Processing
```
POST /payouts/automated/company/:companyId/process
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Response:** `200 OK`
```json
{
  "processed": 12,
  "totalAmount": "18000.00",
  "nextScheduledRun": "ISO8601"
}
```

---

## Reports & Analytics

### Company Dashboard
```
GET /reports/company/:companyId/dashboard
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "company": { ... },
  "metrics": {
    "totalEmployees": 10,
    "activeMissions": 15,
    "completedMissions": 145,
    "totalRevenue": "125000.00",
    "pendingPayouts": 5
  },
  "recentMissions": [...]
}
```

---

### Revenue Report
```
GET /reports/company/:companyId/revenue?startDate=2025-01-01&endDate=2025-12-31&groupBy=month
Authorization: Bearer <token>
Role: ARTISAN (canViewFinancials)
```

**Query Parameters:**
- `startDate`: ISO8601 (optional)
- `endDate`: ISO8601 (optional)
- `groupBy`: day | week | month (default: month)

**Response:** `200 OK`
```json
{
  "period": { ... },
  "summary": {
    "totalRevenue": "125000.00",
    "totalMissions": 150,
    "averageRevenue": "833.33"
  },
  "data": [
    {
      "period": "2025-01",
      "revenue": "10500.00",
      "missions": 12,
      "averageRevenue": "875.00"
    }
  ]
}
```

---

### Employee Performance Report
```
GET /reports/company/:companyId/employee-performance?startDate=2025-01-01
Authorization: Bearer <token>
Role: ARTISAN (canViewFinancials)
```

**Response:** `200 OK`
```json
{
  "period": { ... },
  "totalEmployees": 10,
  "topPerformers": [
    {
      "employeeId": "uuid",
      "name": "string",
      "metrics": {
        "completedMissions": 25,
        "totalRevenue": "18000.00",
        "averageRevenuePerMission": "720.00",
        "totalEarnings": "9000.00"
      }
    }
  ],
  "allEmployees": [...]
}
```

---

### Employee Dashboard
```
GET /reports/employee/:employeeId/dashboard
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "employee": { ... },
  "kpis": {
    "activeMissions": 3,
    "completedLast30Days": 12,
    "earningsLast30Days": "2400.00",
    "pendingEarnings": "800.00",
    "commissionRate": "50.00"
  },
  "recentMissions": [...]
}
```

---

### Financial Summary
```
GET /reports/company/:companyId/financial-summary?startDate=2025-01-01
Authorization: Bearer <token>
Role: ARTISAN (canViewFinancials)
```

**Response:** `200 OK`
```json
{
  "period": { ... },
  "revenue": {
    "total": "125000.00",
    "afterPlatformFees": "110000.00"
  },
  "earnings": {
    "totalGross": "55000.00",
    "totalNet": "55000.00",
    "totalPlatformFees": "15000.00"
  },
  "payouts": {
    "totalPaid": "48000.00",
    "totalPending": "7000.00",
    "pendingCount": 8
  },
  "companyShare": "55000.00"
}
```

---

## Employee Features

### Create Shift
```
POST /employee-features/shifts?companyId=<uuid>
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "employeeId": "uuid",
  "startTime": "ISO8601",
  "endTime": "ISO8601",
  "shiftType": "REGULAR | OVERTIME | ONCALL | BREAK",
  "notes": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "employee": { ... },
  "startTime": "ISO8601",
  "endTime": "ISO8601",
  "duration": 8.0,
  "shiftType": "REGULAR",
  "status": "SCHEDULED"
}
```

---

### Bulk Schedule Shifts
```
POST /employee-features/shifts/bulk?companyId=<uuid>
Authorization: Bearer <token>
Role: ARTISAN (Owner/Manager)
```

**Request Body:**
```json
{
  "employeeIds": ["uuid"],
  "startTime": "ISO8601",
  "endTime": "ISO8601",
  "shiftType": "REGULAR",
  "repeatPattern": "DAILY | WEEKLY | BIWEEKLY | MONTHLY",
  "repeatCount": 4
}
```

**Response:** `200 OK`
```json
{
  "message": "Shifts scheduled successfully",
  "count": 20
}
```

---

### Get Employee Schedule
```
GET /employee-features/employee/:employeeId/schedule?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "employee": { ... },
  "period": { ... },
  "summary": {
    "totalHours": 160,
    "totalShifts": 20,
    "byType": {
      "REGULAR": 152,
      "OVERTIME": 8
    }
  },
  "shifts": [...]
}
```

---

### Get Available Employees
```
GET /employee-features/company/:companyId/available-employees?startTime=2025-11-25T09:00&endTime=2025-11-25T17:00
Authorization: Bearer <token>
Role: ARTISAN
```

**Response:** `200 OK`
```json
{
  "period": { ... },
  "available": [
    {
      "id": "uuid",
      "name": "string",
      "role": "TECHNICIAN",
      "available": true
    }
  ],
  "busy": [
    {
      "id": "uuid",
      "name": "string",
      "available": false,
      "conflictingShifts": 2
    }
  ]
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `500 Internal Server Error` - Server error

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Short**: 10 requests per second
- **Medium**: 100 requests per minute
- **Long**: 1000 requests per hour

Headers returned:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Headers:**
- `X-Total-Count`: Total items
- `X-Page`: Current page
- `X-Page-Count`: Total pages

---

**API Version:** 1.0.0
**Base URL:** `https://api.articonnect.com/v1`
**Documentation:** https://docs.articonnect.com
