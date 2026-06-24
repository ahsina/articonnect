-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ARTISAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('OWNER', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'PENDING_INVITATION');

-- CreateEnum
CREATE TYPE "PaymentModel" AS ENUM ('SALARY', 'COMMISSION', 'HYBRID');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'INVALID');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('EMERGENCY', 'SCHEDULED', 'QUOTE');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('PENDING', 'NEGOTIATING', 'ACCEPTED', 'PENDING_DEPOSIT', 'DEPOSIT_PAID', 'IN_TRANSIT', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'AUTO_VALIDATED', 'CANCELLED', 'CANCELLED_NO_SHOW', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('CLIENT_TO_ARTISAN', 'ARTISAN_TO_CLIENT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RETURN_SHIPPED', 'RECEIVED', 'REFUNDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('MISSION', 'PRODUCT', 'REFUND', 'DEPOSIT', 'COMPENSATION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'HELD', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL_PAYMENT', 'REFUND', 'COMPENSATION');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CHANGED_MIND', 'EMERGENCY_RESOLVED', 'WORK_NOT_DONE', 'WORK_INCOMPLETE', 'MUTUAL_CANCELLATION', 'ARTISAN_NO_SHOW', 'CLIENT_NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'SEPA', 'DEFERRED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('MISSION', 'MARKETPLACE', 'NO_SHOW_FEE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NoShowStatus" AS ENUM ('REPORTED', 'PENDING_REVIEW', 'VALIDATED', 'REJECTED', 'COMPENSATED');

-- CreateEnum
CREATE TYPE "ReputationAction" AS ENUM ('MISSION_COMPLETED', 'MISSION_CANCELLED', 'NO_SHOW', 'DISPUTE_LOST', 'DISPUTE_WON', 'EXCELLENT_REVIEW', 'POOR_REVIEW', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CompensationReason" AS ENUM ('CLIENT_CHANGED_MIND', 'CLIENT_EMERGENCY_RESOLVED', 'CLIENT_NO_SHOW', 'PLATFORM_ERROR', 'GOODWILL_GESTURE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MISSION', 'MISSION_ACCEPTED', 'MISSION_COMPLETED', 'MISSION_CANCELLED', 'NEGOTIATION_NEW', 'NEGOTIATION_ACCEPTED', 'NEGOTIATION_REJECTED', 'PAYMENT_RECEIVED', 'REVIEW_NEW', 'MESSAGE_NEW', 'SYSTEM', 'CHAT_MESSAGE', 'CHAT_MENTION', 'CERTIFICATION_EXPIRING', 'CERTIFICATION_EXPIRED', 'KYC_VERIFIED', 'KYC_REQUIRES_INPUT');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('EMERGENCY', 'RENOVATION', 'INSTALLATION', 'MAINTENANCE', 'PRODUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('REVIEW', 'PRODUCT', 'USER', 'MISSION', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'FAKE_REVIEW', 'COUNTERFEIT_PRODUCT', 'FRAUD', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK_LEAVE', 'PERSONAL', 'PUBLIC_HOLIDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConfigCategory" AS ENUM ('FEES', 'PAYMENT', 'NOTIFICATION', 'FEATURE_TOGGLE', 'LIMIT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ConfigDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('PERFORMANCE', 'RELIABILITY', 'EXPERIENCE', 'SPECIALTY', 'CUSTOMER_SERVICE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('VALID', 'INVALIDATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RecurringServiceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PENDING_RENEWAL');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "SubcontractorStatus" AS ENUM ('PENDING_INVITATION', 'ACTIVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_SUPPORT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL_ISSUE', 'PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'MISSION_ISSUE', 'DISPUTE', 'FEATURE_REQUEST', 'FEEDBACK', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('CHECKLIST', 'SAFETY_FORM', 'COMPLIANCE_FORM', 'INSPECTION_REPORT', 'WORK_COMPLETION', 'WARRANTY_CERTIFICATE', 'HANDOVER_DOCUMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT', 'GROUP', 'TEAM', 'MISSION', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'VOICE_NOTE');

-- CreateEnum
CREATE TYPE "ChatMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "fcmTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outlookAccessToken" TEXT,
    "outlookRefreshToken" TEXT,
    "outlookTokenExpiry" TIMESTAMP(3),
    "preferredLocale" TEXT NOT NULL DEFAULT 'fr',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "reputationScore" INTEGER NOT NULL DEFAULT 100,
    "completedMissions" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "disputeCount" INTEGER NOT NULL DEFAULT 0,
    "disputeRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "deviceFingerprints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUserAgent" TEXT,
    "lastIpAddress" TEXT,
    "multiAccountRiskScore" INTEGER NOT NULL DEFAULT 0,
    "multiAccountFlagged" BOOLEAN NOT NULL DEFAULT false,
    "multiAccountReviewedAt" TIMESTAMP(3),
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycVerifiedAt" TIMESTAMP(3),
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "kycProvider" TEXT,
    "kycSessionId" TEXT,
    "stripeIdentitySessionId" TEXT,
    "refundCount" INTEGER NOT NULL DEFAULT 0,
    "refundRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "refundAbuseScore" INTEGER NOT NULL DEFAULT 0,
    "refundBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastSessionId" TEXT,
    "lastSessionLocation" TEXT,
    "sessionAnomalyCount" INTEGER NOT NULL DEFAULT 0,
    "botDetectionScore" INTEGER NOT NULL DEFAULT 0,
    "botFlagged" BOOLEAN NOT NULL DEFAULT false,
    "captchaRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "companyName" TEXT,
    "siret" TEXT,
    "vatNumber" TEXT,
    "industry" TEXT,
    "stripeCustomerId" TEXT,
    "defaultPaymentMethod" TEXT,
    "deferredPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "creditLimit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currentOutstanding" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastCreditReview" TIMESTAMP(3),
    "deferredPaymentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "companyName" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "vatNumber" TEXT,
    "description" TEXT,
    "website" TEXT,
    "serviceRadius" INTEGER NOT NULL DEFAULT 20,
    "baseAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DECIMAL(10,2),
    "emergencyRate" DECIMAL(10,2),
    "insurance" TEXT,
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "businessVerified" BOOLEAN NOT NULL DEFAULT false,
    "businessVerifiedAt" TIMESTAMP(3),
    "businessVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "businessRegistrationNumber" TEXT,
    "businessCountry" TEXT,
    "businessVerificationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessVerificationWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessLegalForm" TEXT,
    "businessActivityCode" TEXT,
    "businessVerificationLastCheck" TIMESTAMP(3),
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "missionCount" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtisanProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyEmployeeId" TEXT,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "document" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "vatNumber" TEXT,
    "description" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "ownerId" TEXT NOT NULL,
    "baseAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "serviceRadius" INTEGER NOT NULL DEFAULT 20,
    "businessVerified" BOOLEAN NOT NULL DEFAULT false,
    "businessVerifiedAt" TIMESTAMP(3),
    "businessVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "businessRegistrationNumber" TEXT,
    "businessCountry" TEXT,
    "businessVerificationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessVerificationWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessLegalForm" TEXT,
    "businessActivityCode" TEXT,
    "businessVerificationLastCheck" TIMESTAMP(3),
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'PENDING_INVITATION',
    "invitationToken" TEXT,
    "invitationSentAt" TIMESTAMP(3),
    "invitationAcceptedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "paymentModel" "PaymentModel" NOT NULL DEFAULT 'COMMISSION',
    "baseSalary" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,2),
    "hourlyRate" DECIMAL(10,2),
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEarnings" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRevenue" DECIMAL(10,2) NOT NULL,
    "platformCommission" DECIMAL(10,2) NOT NULL,
    "companyRevenue" DECIMAL(10,2) NOT NULL,
    "employeeCommission" DECIMAL(10,2) NOT NULL,
    "employeeCommissionRate" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payoutDate" TIMESTAMP(3),
    "payoutMethod" TEXT DEFAULT 'STRIPE_TRANSFER',
    "stripeTransferId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeEarnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "ownerCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "autoAssignMissions" BOOLEAN NOT NULL DEFAULT false,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowEmployeeSelfAssignment" BOOLEAN NOT NULL DEFAULT true,
    "payoutFrequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "minimumPayout" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "notifyOwnerOnNewMission" BOOLEAN NOT NULL DEFAULT true,
    "notifyManagerOnNewMission" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmployeeOnAssignment" BOOLEAN NOT NULL DEFAULT true,
    "defaultWorkingHoursStart" TEXT,
    "defaultWorkingHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShift" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL DEFAULT 'REGULAR',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionTimeTracking" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "totalHours" DECIMAL(8,2),
    "breakTime" DECIMAL(8,2) DEFAULT 0,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "startLocation" TEXT,
    "endLocation" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionTimeTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "TimeEntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "location" JSONB,
    "notes" TEXT,
    "missionId" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryCorrection" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "correctedBy" TEXT NOT NULL,
    "originalTimestamp" TIMESTAMP(3) NOT NULL,
    "newTimestamp" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewPeriodStart" TIMESTAMP(3) NOT NULL,
    "reviewPeriodEnd" TIMESTAMP(3) NOT NULL,
    "qualityOfWork" INTEGER,
    "communication" INTEGER,
    "reliability" INTEGER,
    "technicalSkills" INTEGER,
    "customerService" INTEGER,
    "teamwork" INTEGER,
    "overallRating" DECIMAL(3,2),
    "strengths" TEXT,
    "areasForImprovement" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillCategory" TEXT,
    "proficiencyLevel" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "certificationName" TEXT,
    "certificationNumber" TEXT,
    "certifiedBy" TEXT,
    "certificationDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedArtisan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedArtisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "artisanId" TEXT,
    "companyId" TEXT,
    "assignedToId" TEXT,
    "completedById" TEXT,
    "type" "MissionType" NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "clientBudget" DECIMAL(10,2),
    "artisanQuote" DECIMAL(10,2),
    "agreedPrice" DECIMAL(10,2),
    "finalPrice" DECIMAL(10,2),
    "vatRate" DECIMAL(5,2) NOT NULL,
    "totalAmount" DECIMAL(10,2),
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositPercentage" INTEGER NOT NULL DEFAULT 30,
    "depositAmount" DECIMAL(10,2),
    "depositPaidAt" TIMESTAMP(3),
    "retractionExpiresAt" TIMESTAMP(3),
    "autoValidated" BOOLEAN NOT NULL DEFAULT false,
    "priceAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "expectedPrice" DECIMAL(10,2),
    "priceDeviation" INTEGER,
    "priceAnomalySignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceReviewedAt" TIMESTAMP(3),
    "priceReviewedBy" TEXT,
    "photos" TEXT[],
    "beforePhotos" TEXT[],
    "afterPhotos" TEXT[],
    "purchaseOrderNumber" TEXT,
    "internalReference" TEXT,
    "billingCompanyName" TEXT,
    "billingAddress" TEXT,
    "billingVatNumber" TEXT,
    "initialSearchRadius" INTEGER NOT NULL DEFAULT 20,
    "currentSearchRadius" INTEGER NOT NULL DEFAULT 20,
    "lastRadiusExpansion" TIMESTAMP(3),
    "maxRadiusReached" BOOLEAN NOT NULL DEFAULT false,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "autoValidatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionHistory" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL,
    "changedById" TEXT,
    "changedByRole" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "proposedPrice" DECIMAL(10,2) NOT NULL,
    "laborCost" DECIMAL(10,2),
    "materialCost" DECIMAL(10,2),
    "travelCost" DECIMAL(10,2),
    "message" TEXT,
    "accepted" BOOLEAN,
    "rejectedReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Negotiation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewedId" TEXT NOT NULL,
    "reviewType" "ReviewType" NOT NULL DEFAULT 'CLIENT_TO_ARTISAN',
    "overallRating" INTEGER NOT NULL,
    "qualityRating" INTEGER,
    "punctualityRating" INTEGER,
    "communicationRating" INTEGER,
    "valueRating" INTEGER,
    "paymentPromptness" INTEGER,
    "respectRating" INTEGER,
    "safetyRating" INTEGER,
    "comment" TEXT,
    "photos" TEXT[],
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraudSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenReason" TEXT,
    "fraudReviewedAt" TIMESTAMP(3),
    "fraudReviewedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "DisputePriority" NOT NULL DEFAULT 'MEDIUM',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "photos" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "sku" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "vat" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "trackingNumber" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReturn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "description" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "returnLabel" TEXT,
    "trackingNumber" TEXT,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OrderReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "missionId" TEXT,
    "orderId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "commission" DECIMAL(10,2) NOT NULL,
    "artisanAmount" DECIMAL(10,2) NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "refundReason" "RefundReason",
    "refundedAmount" DECIMAL(10,2),
    "refundedAt" TIMESTAMP(3),
    "artisanCompensated" BOOLEAN NOT NULL DEFAULT false,
    "compensationAmount" DECIMAL(10,2),
    "platformAbsorbedCost" BOOLEAN NOT NULL DEFAULT false,
    "withinRetractionPeriod" BOOLEAN NOT NULL DEFAULT false,
    "retractionExpiresAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
    "stripePaymentIntentId" TEXT,
    "stripeRefundId" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "paypalRefundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "missionId" TEXT,
    "orderId" TEXT,
    "noShowEventId" TEXT,
    "issuerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "platformCommissionRate" DECIMAL(5,2) NOT NULL,
    "platformCommission" DECIMAL(10,2) NOT NULL,
    "artisanNetAmount" DECIMAL(10,2) NOT NULL,
    "lineItems" JSONB NOT NULL,
    "issuerAddress" JSONB NOT NULL,
    "clientAddress" JSONB NOT NULL,
    "paymentDueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "notes" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoShowEvent" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "waitDurationMinutes" INTEGER NOT NULL,
    "contactAttempts" JSONB NOT NULL,
    "proofPhotos" TEXT[],
    "gpsCoords" JSONB NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "compensationPaid" BOOLEAN NOT NULL DEFAULT false,
    "compensationPaidAt" TIMESTAMP(3),
    "status" "NoShowStatus" NOT NULL DEFAULT 'REPORTED',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "NoShowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 100,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "successfulMissions" INTEGER NOT NULL DEFAULT 0,
    "cancelledMissions" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReputationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ReputationAction" NOT NULL,
    "pointsChange" INTEGER NOT NULL,
    "previousScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "reason" TEXT,
    "relatedMissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT,
    "reason" "CompensationReason" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "clientRefunded" BOOLEAN NOT NULL DEFAULT false,
    "refundAmount" DECIMAL(10,2),
    "totalCost" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompensationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT[],
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentViolation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "detectedPatterns" TEXT[],
    "severity" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_protection_config" (
    "id" TEXT NOT NULL,
    "multiAccountDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "multiAccountRiskThreshold" INTEGER NOT NULL DEFAULT 70,
    "reviewFraudDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewFraudScoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "reviewAutoHideEnabled" BOOLEAN NOT NULL DEFAULT true,
    "payoutFraudScreeningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "payoutRiskThreshold" INTEGER NOT NULL DEFAULT 60,
    "payoutAutoHoldEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceAnomalyDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceDeviationThreshold" INTEGER NOT NULL DEFAULT -30,
    "priceAutoFlagEnabled" BOOLEAN NOT NULL DEFAULT true,
    "refundAbuseDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "refundAbuseScoreThreshold" INTEGER NOT NULL DEFAULT 60,
    "refundAutoRejectEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sessionAnomalyDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sessionThreatLevelThreshold" TEXT NOT NULL DEFAULT 'HIGH',
    "sessionAutoLogoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kycEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kycSingleTransactionThreshold" INTEGER NOT NULL DEFAULT 1000,
    "kycCumulativeThreshold" INTEGER NOT NULL DEFAULT 3000,
    "kycAutoBlockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "botDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "botScoreThreshold" INTEGER NOT NULL DEFAULT 70,
    "botCaptchaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "businessVerificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "businessVerificationAutoReject" BOOLEAN NOT NULL DEFAULT false,
    "fraudAlertEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fraudAlertEmail" TEXT NOT NULL DEFAULT 'admin@articonnect.com',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "fraud_protection_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "newMission" BOOLEAN NOT NULL DEFAULT true,
    "missionUpdate" BOOLEAN NOT NULL DEFAULT true,
    "newMessage" BOOLEAN NOT NULL DEFAULT true,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT true,
    "paymentSent" BOOLEAN NOT NULL DEFAULT true,
    "reviewReceived" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "emailDigest" TEXT NOT NULL DEFAULT 'INSTANT',
    "disabledTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsQueue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notificationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDigestQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDigestQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneVerificationToken" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "geolocation" BOOLEAN NOT NULL DEFAULT false,
    "emailNotif" BOOLEAN NOT NULL DEFAULT true,
    "smsNotif" BOOLEAN NOT NULL DEFAULT false,
    "pushNotif" BOOLEAN NOT NULL DEFAULT true,
    "consentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardRate" DECIMAL(5,2) NOT NULL,
    "reducedRate" DECIMAL(5,2) NOT NULL,
    "intermediateRate" DECIMAL(5,2),
    "superReducedRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatDeclaration" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL,
    "totalTax" DECIMAL(10,2) NOT NULL,
    "totalPurchases" DECIMAL(10,2),
    "totalTaxCredit" DECIMAL(10,2),
    "netTaxDue" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "reviewId" TEXT,
    "productId" TEXT,
    "reportedUserId" TEXT,
    "missionId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "missionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "type" "TimeOffType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringUnavailability" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pattern" "RecurrencePattern" NOT NULL,
    "dayOfWeek" "DayOfWeek",
    "dayOfMonth" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" "ConfigDataType" NOT NULL DEFAULT 'STRING',
    "category" "ConfigCategory" NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "type" "BadgeType" NOT NULL,
    "tier" "BadgeTier" NOT NULL,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerData" JSONB,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artisanId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "artisanId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "estimatedBudget" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "estimatedDuration" INTEGER,
    "defaultBudgetRange" TEXT,
    "requiredSkills" TEXT,
    "checklistItems" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "missionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "laborTotal" DECIMAL(10,2) NOT NULL,
    "materialsTotal" DECIMAL(10,2) NOT NULL,
    "travelTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2),
    "taxRate" DECIMAL(5,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "templateId" TEXT,
    "clientSignature" TEXT,
    "clientSignedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "pdfUrl" TEXT,
    "termsAndConditions" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentQuoteId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'LABOR',
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "catalogItemId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "trade" TEXT,
    "defaultLineItems" JSONB NOT NULL,
    "defaultTerms" TEXT,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSignature" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "signatureImage" TEXT,
    "signatureType" TEXT NOT NULL,
    "signatureToken" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "legalText" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "status" "SignatureStatus" NOT NULL DEFAULT 'VALID',
    "signedAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedBy" TEXT,
    "invalidationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSignatureRequest" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "usedAt" TIMESTAMP(3),
    "signerIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteSignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCatalogItem" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "category" TEXT NOT NULL,
    "trade" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "supplierPrice" DECIMAL(10,2),
    "supplierName" TEXT,
    "supplierRef" TEXT,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "currentStock" INTEGER,
    "minStockLevel" INTEGER,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSequence" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "trade" TEXT,
    "city" TEXT,
    "country" TEXT,
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "duration" TEXT,
    "beforePhotos" TEXT[],
    "afterPhotos" TEXT[],
    "videoUrl" TEXT,
    "projectScope" TEXT,
    "challenges" TEXT,
    "solutions" TEXT,
    "budgetRange" TEXT,
    "missionId" TEXT,
    "clientTestimonial" TEXT,
    "clientApproved" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isBefore" BOOLEAN NOT NULL DEFAULT false,
    "isAfter" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRelationship" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "clientType" TEXT NOT NULL DEFAULT 'REGULAR',
    "tags" TEXT[],
    "preferredContactMethod" TEXT,
    "preferredContactTime" TEXT,
    "notes" TEXT,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageMissionValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastMissionDate" TIMESTAMP(3),
    "acquisitionSource" TEXT,
    "firstContactDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastContactDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFollowUp" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "missionId" TEXT,
    "quoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringService" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "trade" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "frequency" "RecurringFrequency" NOT NULL,
    "scheduledDayOfWeek" INTEGER,
    "scheduledDayOfMonth" INTEGER,
    "scheduledMonth" INTEGER,
    "preferredTimeSlot" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextServiceDate" TIMESTAMP(3),
    "servicePrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "discountPercent" DECIMAL(5,2),
    "status" "RecurringServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "renewalNotifyDays" INTEGER NOT NULL DEFAULT 30,
    "autoCharge" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodId" TEXT,
    "serviceNotes" TEXT,
    "accessInstructions" TEXT,
    "internalNotes" TEXT,
    "totalServices" INTEGER NOT NULL DEFAULT 0,
    "missedServices" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringServiceMission" (
    "id" TEXT NOT NULL,
    "recurringServiceId" TEXT NOT NULL,
    "missionId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringServiceMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "subcontractorUserId" TEXT,
    "externalName" TEXT,
    "externalEmail" TEXT,
    "externalPhone" TEXT,
    "externalCompany" TEXT,
    "externalSiret" TEXT,
    "status" "SubcontractorStatus" NOT NULL DEFAULT 'PENDING_INVITATION',
    "invitationToken" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "defaultCommissionRate" DECIMAL(5,2),
    "paymentTerms" TEXT,
    "specialties" TEXT[],
    "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceExpiryDate" TIMESTAMP(3),
    "certifications" TEXT[],
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractorAssignment" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "agreedAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "rating" INTEGER,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "completedMissions" INTEGER NOT NULL DEFAULT 0,
    "cancelledMissions" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platformFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageMissionValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitMargin" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "newClients" INTEGER NOT NULL DEFAULT 0,
    "repeatClients" INTEGER NOT NULL DEFAULT 0,
    "repeatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "quotesCreated" INTEGER NOT NULL DEFAULT 0,
    "quotesAccepted" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "averageQuoteValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "responseTime" INTEGER,
    "onTimeRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "revenueByCategory" JSONB,
    "missionsByCategory" JSONB,
    "revenueByType" JSONB,
    "missionsByType" JSONB,
    "revenueChange" DECIMAL(5,2),
    "missionsChange" DECIMAL(5,2),
    "ratingChange" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueGoal" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "targetRevenue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "currentRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "missionId" TEXT,
    "orderId" TEXT,
    "quoteId" TEXT,
    "attachments" TEXT[],
    "tags" TEXT[],
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "satisfactionRating" INTEGER,
    "firstResponseAt" TIMESTAMP(3),
    "firstResponseSLA" INTEGER,
    "resolutionSLA" INTEGER,
    "firstResponseDue" TIMESTAMP(3),
    "resolutionDue" TIMESTAMP(3),
    "escalationCount" INTEGER NOT NULL DEFAULT 0,
    "satisfactionFeedback" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "isAutoResponse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSequence" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEscalation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "fromPriority" TEXT NOT NULL,
    "toPriority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedResponse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "shortcut" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpsResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpsResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "tags" TEXT[],
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "translations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeBaseArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DocumentTemplateType" NOT NULL,
    "category" TEXT,
    "trade" TEXT,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "requiresPhotos" BOOLEAN NOT NULL DEFAULT false,
    "requiresClientApproval" BOOLEAN NOT NULL DEFAULT false,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "translations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplateSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplateField" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minValue" INTEGER,
    "maxValue" INTEGER,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "pattern" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDocument" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "type" "DocumentTemplateType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "artisanSignature" TEXT,
    "artisanSignedAt" TIMESTAMP(3),
    "clientSignature" TEXT,
    "clientSignedAt" TIMESTAMP(3),
    "photos" TEXT[],
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchangeRate" DECIMAL(10,6) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "thousandsSep" TEXT NOT NULL DEFAULT ',',
    "decimalSep" TEXT NOT NULL DEFAULT '.',
    "symbolPosition" TEXT NOT NULL DEFAULT 'BEFORE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supportedCountries" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateHistory" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ECB',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryConfig" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT,
    "defaultLocale" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL,
    "businessRegistrationType" TEXT NOT NULL,
    "businessRegistrationLabel" TEXT NOT NULL,
    "businessRegistrationFormat" TEXT,
    "businessRegistrationRequired" BOOLEAN NOT NULL DEFAULT true,
    "vatNumberFormat" TEXT,
    "vatLabel" TEXT NOT NULL DEFAULT 'VAT',
    "standardVatRate" DECIMAL(5,2) NOT NULL,
    "reducedVatRates" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "launchDate" TIMESTAMP(3),
    "betaAccess" BOOLEAN NOT NULL DEFAULT false,
    "supportedPaymentMethods" TEXT[],
    "stripeSupportedCurrency" TEXT,
    "termsUrl" TEXT,
    "privacyUrl" TEXT,
    "legalNotices" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryComplianceRequirement" (
    "id" TEXT NOT NULL,
    "countryConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "trades" TEXT[],
    "serviceTypes" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "requiresDocument" BOOLEAN NOT NULL DEFAULT true,
    "documentTypes" TEXT[],
    "validityPeriod" INTEGER,
    "verificationMethod" TEXT NOT NULL DEFAULT 'MANUAL',
    "verificationUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "helpUrl" TEXT,
    "helpText" TEXT,
    "translations" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanComplianceRecord" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "documentName" TEXT,
    "documentType" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    "rejectionReason" TEXT,
    "expiryReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtisanComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locale" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ltr',
    "flag" TEXT,
    "dateFormat" TEXT,
    "timeFormat" TEXT,
    "currencyCode" TEXT,
    "currencySymbol" TEXT,
    "numberFormat" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "pluralValue" TEXT,
    "description" TEXT,
    "context" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationHistory" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" "ChatRoomType" NOT NULL DEFAULT 'GROUP',
    "avatar" TEXT,
    "companyId" TEXT,
    "missionId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatMemberRole" NOT NULL DEFAULT 'MEMBER',
    "nickname" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" TIMESTAMP(3),
    "lastReadMsgId" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedBy" TEXT,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reactions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReadReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ArtisanProfileToSpecialty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_reputationScore_idx" ON "User"("reputationScore");

-- CreateIndex
CREATE INDEX "User_multiAccountRiskScore_idx" ON "User"("multiAccountRiskScore");

-- CreateIndex
CREATE INDEX "User_kycStatus_idx" ON "User"("kycStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_stripeCustomerId_key" ON "ClientProfile"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "ClientProfile_clientType_idx" ON "ClientProfile"("clientType");

-- CreateIndex
CREATE INDEX "ClientProfile_siret_idx" ON "ClientProfile"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_userId_key" ON "ArtisanProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_siret_key" ON "ArtisanProfile"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_stripeAccountId_key" ON "ArtisanProfile"("stripeAccountId");

-- CreateIndex
CREATE INDEX "ArtisanProfile_latitude_longitude_idx" ON "ArtisanProfile"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ArtisanProfile_rating_idx" ON "ArtisanProfile"("rating");

-- CreateIndex
CREATE INDEX "Address_clientId_idx" ON "Address"("clientId");

-- CreateIndex
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "Company"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeAccountId_key" ON "Company"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Company_siret_idx" ON "Company"("siret");

-- CreateIndex
CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");

-- CreateIndex
CREATE INDEX "Company_latitude_longitude_idx" ON "Company"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Company_averageRating_idx" ON "Company"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployee_invitationToken_key" ON "CompanyEmployee"("invitationToken");

-- CreateIndex
CREATE INDEX "CompanyEmployee_companyId_idx" ON "CompanyEmployee"("companyId");

-- CreateIndex
CREATE INDEX "CompanyEmployee_userId_idx" ON "CompanyEmployee"("userId");

-- CreateIndex
CREATE INDEX "CompanyEmployee_status_idx" ON "CompanyEmployee"("status");

-- CreateIndex
CREATE INDEX "CompanyEmployee_role_idx" ON "CompanyEmployee"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployee_companyId_userId_key" ON "CompanyEmployee"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeEarnings_stripeTransferId_key" ON "EmployeeEarnings"("stripeTransferId");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_employeeId_idx" ON "EmployeeEarnings"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_missionId_idx" ON "EmployeeEarnings"("missionId");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_status_idx" ON "EmployeeEarnings"("status");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_payoutDate_idx" ON "EmployeeEarnings"("payoutDate");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_employeeId_status_createdAt_idx" ON "EmployeeEarnings"("employeeId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeShift_employeeId_idx" ON "EmployeeShift"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeShift_startTime_idx" ON "EmployeeShift"("startTime");

-- CreateIndex
CREATE INDEX "EmployeeShift_endTime_idx" ON "EmployeeShift"("endTime");

-- CreateIndex
CREATE INDEX "EmployeeShift_status_idx" ON "EmployeeShift"("status");

-- CreateIndex
CREATE INDEX "EmployeeShift_createdById_idx" ON "EmployeeShift"("createdById");

-- CreateIndex
CREATE INDEX "MissionTimeTracking_missionId_idx" ON "MissionTimeTracking"("missionId");

-- CreateIndex
CREATE INDEX "MissionTimeTracking_employeeId_idx" ON "MissionTimeTracking"("employeeId");

-- CreateIndex
CREATE INDEX "MissionTimeTracking_status_idx" ON "MissionTimeTracking"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_employeeId_idx" ON "TimeEntry"("employeeId");

-- CreateIndex
CREATE INDEX "TimeEntry_companyId_idx" ON "TimeEntry"("companyId");

-- CreateIndex
CREATE INDEX "TimeEntry_timestamp_idx" ON "TimeEntry"("timestamp");

-- CreateIndex
CREATE INDEX "TimeEntry_type_idx" ON "TimeEntry"("type");

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");

-- CreateIndex
CREATE INDEX "TimeEntryCorrection_timeEntryId_idx" ON "TimeEntryCorrection"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryCorrection_correctedBy_idx" ON "TimeEntryCorrection"("correctedBy");

-- CreateIndex
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");

-- CreateIndex
CREATE INDEX "PerformanceReview_reviewPeriodStart_idx" ON "PerformanceReview"("reviewPeriodStart");

-- CreateIndex
CREATE INDEX "PerformanceReview_status_idx" ON "PerformanceReview"("status");

-- CreateIndex
CREATE INDEX "EmployeeSkill_employeeId_idx" ON "EmployeeSkill"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeSkill_skillCategory_idx" ON "EmployeeSkill"("skillCategory");

-- CreateIndex
CREATE INDEX "EmployeeSkill_certified_idx" ON "EmployeeSkill"("certified");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_skillName_key" ON "EmployeeSkill"("employeeId", "skillName");

-- CreateIndex
CREATE UNIQUE INDEX "SavedArtisan_clientId_artisanId_key" ON "SavedArtisan"("clientId", "artisanId");

-- CreateIndex
CREATE INDEX "Mission_clientId_idx" ON "Mission"("clientId");

-- CreateIndex
CREATE INDEX "Mission_artisanId_idx" ON "Mission"("artisanId");

-- CreateIndex
CREATE INDEX "Mission_companyId_idx" ON "Mission"("companyId");

-- CreateIndex
CREATE INDEX "Mission_assignedToId_idx" ON "Mission"("assignedToId");

-- CreateIndex
CREATE INDEX "Mission_completedById_idx" ON "Mission"("completedById");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_type_idx" ON "Mission"("type");

-- CreateIndex
CREATE INDEX "Mission_latitude_longitude_idx" ON "Mission"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Mission_createdAt_idx" ON "Mission"("createdAt");

-- CreateIndex
CREATE INDEX "Mission_completedAt_idx" ON "Mission"("completedAt");

-- CreateIndex
CREATE INDEX "Mission_clientId_status_idx" ON "Mission"("clientId", "status");

-- CreateIndex
CREATE INDEX "Mission_companyId_status_completedAt_idx" ON "Mission"("companyId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "MissionHistory_missionId_idx" ON "MissionHistory"("missionId");

-- CreateIndex
CREATE INDEX "MissionHistory_changedById_idx" ON "MissionHistory"("changedById");

-- CreateIndex
CREATE INDEX "MissionHistory_createdAt_idx" ON "MissionHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Negotiation_missionId_idx" ON "Negotiation"("missionId");

-- CreateIndex
CREATE INDEX "Negotiation_expiresAt_idx" ON "Negotiation"("expiresAt");

-- CreateIndex
CREATE INDEX "Review_missionId_idx" ON "Review"("missionId");

-- CreateIndex
CREATE INDEX "Review_reviewedId_idx" ON "Review"("reviewedId");

-- CreateIndex
CREATE INDEX "Review_fraudScore_idx" ON "Review"("fraudScore");

-- CreateIndex
CREATE INDEX "Review_hidden_idx" ON "Review"("hidden");

-- CreateIndex
CREATE INDEX "Review_overallRating_idx" ON "Review"("overallRating");

-- CreateIndex
CREATE INDEX "Review_reviewType_idx" ON "Review"("reviewType");

-- CreateIndex
CREATE UNIQUE INDEX "Review_missionId_reviewType_key" ON "Review"("missionId", "reviewType");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewResponse_reviewId_key" ON "ReviewResponse"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewResponse_responderId_idx" ON "ReviewResponse"("responderId");

-- CreateIndex
CREATE INDEX "Dispute_missionId_idx" ON "Dispute"("missionId");

-- CreateIndex
CREATE INDEX "Dispute_createdById_idx" ON "Dispute"("createdById");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_priority_idx" ON "Dispute"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_active_idx" ON "Category"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_artisanId_idx" ON "Product"("artisanId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderReturn_orderId_idx" ON "OrderReturn"("orderId");

-- CreateIndex
CREATE INDEX "OrderReturn_clientId_idx" ON "OrderReturn"("clientId");

-- CreateIndex
CREATE INDEX "OrderReturn_status_idx" ON "OrderReturn"("status");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_missionId_key" ON "Transaction"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "Transaction"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeTransferId_key" ON "Transaction"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paypalOrderId_key" ON "Transaction"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paypalCaptureId_key" ON "Transaction"("paypalCaptureId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeRefundId_key" ON "Payment"("stripeRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paypalOrderId_key" ON "Payment"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paypalCaptureId_key" ON "Payment"("paypalCaptureId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paypalRefundId_key" ON "Payment"("paypalRefundId");

-- CreateIndex
CREATE INDEX "Payment_missionId_idx" ON "Payment"("missionId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_paymentMethod_idx" ON "Payment"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_noShowEventId_key" ON "Invoice"("noShowEventId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_issuerId_idx" ON "Invoice"("issuerId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_missionId_idx" ON "Invoice"("missionId");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_year_sequenceNumber_key" ON "Invoice"("year", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_year_key" ON "InvoiceSequence"("year");

-- CreateIndex
CREATE UNIQUE INDEX "NoShowEvent_missionId_key" ON "NoShowEvent"("missionId");

-- CreateIndex
CREATE INDEX "NoShowEvent_artisanId_idx" ON "NoShowEvent"("artisanId");

-- CreateIndex
CREATE INDEX "NoShowEvent_status_idx" ON "NoShowEvent"("status");

-- CreateIndex
CREATE INDEX "NoShowEvent_createdAt_idx" ON "NoShowEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationProfile_userId_key" ON "ReputationProfile"("userId");

-- CreateIndex
CREATE INDEX "ReputationProfile_userId_idx" ON "ReputationProfile"("userId");

-- CreateIndex
CREATE INDEX "ReputationProfile_totalPoints_idx" ON "ReputationProfile"("totalPoints");

-- CreateIndex
CREATE INDEX "ReputationHistory_userId_idx" ON "ReputationHistory"("userId");

-- CreateIndex
CREATE INDEX "ReputationHistory_createdAt_idx" ON "ReputationHistory"("createdAt");

-- CreateIndex
CREATE INDEX "CompensationLog_userId_idx" ON "CompensationLog"("userId");

-- CreateIndex
CREATE INDEX "CompensationLog_reason_idx" ON "CompensationLog"("reason");

-- CreateIndex
CREATE INDEX "CompensationLog_createdAt_idx" ON "CompensationLog"("createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_createdAt_idx" ON "Message"("senderId", "receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentViolation_userId_idx" ON "ContentViolation"("userId");

-- CreateIndex
CREATE INDEX "ContentViolation_severity_idx" ON "ContentViolation"("severity");

-- CreateIndex
CREATE INDEX "ContentViolation_reviewed_idx" ON "ContentViolation"("reviewed");

-- CreateIndex
CREATE INDEX "ContentViolation_createdAt_idx" ON "ContentViolation"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userId_idx" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_emailDigest_idx" ON "NotificationPreference"("emailDigest");

-- CreateIndex
CREATE INDEX "ScheduledNotification_userId_idx" ON "ScheduledNotification"("userId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_status_scheduledFor_idx" ON "ScheduledNotification"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "EmailQueue_status_idx" ON "EmailQueue"("status");

-- CreateIndex
CREATE INDEX "EmailQueue_createdAt_idx" ON "EmailQueue"("createdAt");

-- CreateIndex
CREATE INDEX "SmsQueue_status_idx" ON "SmsQueue"("status");

-- CreateIndex
CREATE INDEX "SmsQueue_createdAt_idx" ON "SmsQueue"("createdAt");

-- CreateIndex
CREATE INDEX "EmailDigestQueue_userId_idx" ON "EmailDigestQueue"("userId");

-- CreateIndex
CREATE INDEX "EmailDigestQueue_createdAt_idx" ON "EmailDigestQueue"("createdAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "BackupCode_userId_idx" ON "BackupCode"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "PhoneVerificationToken_phone_idx" ON "PhoneVerificationToken"("phone");

-- CreateIndex
CREATE INDEX "PhoneVerificationToken_code_idx" ON "PhoneVerificationToken"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_key" ON "UserConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_code_idx" ON "Country"("code");

-- CreateIndex
CREATE INDEX "TaxRate_countryId_idx" ON "TaxRate"("countryId");

-- CreateIndex
CREATE INDEX "TaxRate_category_idx" ON "TaxRate"("category");

-- CreateIndex
CREATE INDEX "TaxRate_effectiveFrom_idx" ON "TaxRate"("effectiveFrom");

-- CreateIndex
CREATE INDEX "VatDeclaration_artisanId_idx" ON "VatDeclaration"("artisanId");

-- CreateIndex
CREATE INDEX "VatDeclaration_period_idx" ON "VatDeclaration"("period");

-- CreateIndex
CREATE INDEX "VatDeclaration_status_idx" ON "VatDeclaration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VatDeclaration_artisanId_period_countryCode_key" ON "VatDeclaration"("artisanId", "period", "countryCode");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- CreateIndex
CREATE INDEX "WorkingHours_artisanId_idx" ON "WorkingHours"("artisanId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_artisanId_dayOfWeek_key" ON "WorkingHours"("artisanId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_artisanId_idx" ON "AvailabilitySlot"("artisanId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startTime_idx" ON "AvailabilitySlot"("startTime");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_isBooked_idx" ON "AvailabilitySlot"("isBooked");

-- CreateIndex
CREATE INDEX "TimeOff_artisanId_idx" ON "TimeOff"("artisanId");

-- CreateIndex
CREATE INDEX "TimeOff_startDate_idx" ON "TimeOff"("startDate");

-- CreateIndex
CREATE INDEX "TimeOff_status_idx" ON "TimeOff"("status");

-- CreateIndex
CREATE INDEX "RecurringUnavailability_artisanId_idx" ON "RecurringUnavailability"("artisanId");

-- CreateIndex
CREATE INDEX "RecurringUnavailability_isActive_idx" ON "RecurringUnavailability"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");

-- CreateIndex
CREATE INDEX "PlatformConfig_category_idx" ON "PlatformConfig"("category");

-- CreateIndex
CREATE INDEX "PlatformConfig_isActive_idx" ON "PlatformConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE INDEX "Badge_type_idx" ON "Badge"("type");

-- CreateIndex
CREATE INDEX "Badge_tier_idx" ON "Badge"("tier");

-- CreateIndex
CREATE INDEX "Badge_isActive_idx" ON "Badge"("isActive");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX "UserBadge_earnedAt_idx" ON "UserBadge"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_artisanId_idx" ON "Favorite"("artisanId");

-- CreateIndex
CREATE INDEX "Favorite_productId_idx" ON "Favorite"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_artisanId_key" ON "Favorite"("userId", "artisanId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_productId_key" ON "Favorite"("userId", "productId");

-- CreateIndex
CREATE INDEX "Request_clientId_idx" ON "Request"("clientId");

-- CreateIndex
CREATE INDEX "Request_artisanId_idx" ON "Request"("artisanId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_category_idx" ON "Request"("category");

-- CreateIndex
CREATE INDEX "Request_createdAt_idx" ON "Request"("createdAt");

-- CreateIndex
CREATE INDEX "MissionTemplate_category_idx" ON "MissionTemplate"("category");

-- CreateIndex
CREATE INDEX "MissionTemplate_isPublic_idx" ON "MissionTemplate"("isPublic");

-- CreateIndex
CREATE INDEX "MissionTemplate_createdBy_idx" ON "MissionTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "MissionTemplate_usageCount_idx" ON "MissionTemplate"("usageCount");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_artisanId_idx" ON "Quote"("artisanId");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_missionId_idx" ON "Quote"("missionId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_itemType_idx" ON "QuoteLineItem"("itemType");

-- CreateIndex
CREATE INDEX "QuoteTemplate_artisanId_idx" ON "QuoteTemplate"("artisanId");

-- CreateIndex
CREATE INDEX "QuoteTemplate_category_idx" ON "QuoteTemplate"("category");

-- CreateIndex
CREATE INDEX "QuoteTemplate_trade_idx" ON "QuoteTemplate"("trade");

-- CreateIndex
CREATE INDEX "QuoteTemplate_isActive_idx" ON "QuoteTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSignature_signatureToken_key" ON "QuoteSignature"("signatureToken");

-- CreateIndex
CREATE INDEX "QuoteSignature_quoteId_idx" ON "QuoteSignature"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteSignature_signerId_idx" ON "QuoteSignature"("signerId");

-- CreateIndex
CREATE INDEX "QuoteSignature_status_idx" ON "QuoteSignature"("status");

-- CreateIndex
CREATE INDEX "QuoteSignature_signedAt_idx" ON "QuoteSignature"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSignatureRequest_token_key" ON "QuoteSignatureRequest"("token");

-- CreateIndex
CREATE INDEX "QuoteSignatureRequest_quoteId_idx" ON "QuoteSignatureRequest"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteSignatureRequest_token_idx" ON "QuoteSignatureRequest"("token");

-- CreateIndex
CREATE INDEX "QuoteSignatureRequest_expiresAt_idx" ON "QuoteSignatureRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "MaterialCatalogItem_artisanId_idx" ON "MaterialCatalogItem"("artisanId");

-- CreateIndex
CREATE INDEX "MaterialCatalogItem_category_idx" ON "MaterialCatalogItem"("category");

-- CreateIndex
CREATE INDEX "MaterialCatalogItem_trade_idx" ON "MaterialCatalogItem"("trade");

-- CreateIndex
CREATE INDEX "MaterialCatalogItem_isGlobal_idx" ON "MaterialCatalogItem"("isGlobal");

-- CreateIndex
CREATE INDEX "MaterialCatalogItem_isActive_idx" ON "MaterialCatalogItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCatalogItem_artisanId_sku_key" ON "MaterialCatalogItem"("artisanId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSequence_year_key" ON "QuoteSequence"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_artisanId_key" ON "Portfolio"("artisanId");

-- CreateIndex
CREATE INDEX "Portfolio_isPublic_idx" ON "Portfolio"("isPublic");

-- CreateIndex
CREATE INDEX "PortfolioProject_portfolioId_idx" ON "PortfolioProject"("portfolioId");

-- CreateIndex
CREATE INDEX "PortfolioProject_category_idx" ON "PortfolioProject"("category");

-- CreateIndex
CREATE INDEX "PortfolioProject_trade_idx" ON "PortfolioProject"("trade");

-- CreateIndex
CREATE INDEX "PortfolioProject_isPublic_idx" ON "PortfolioProject"("isPublic");

-- CreateIndex
CREATE INDEX "PortfolioProject_isFeatured_idx" ON "PortfolioProject"("isFeatured");

-- CreateIndex
CREATE INDEX "PortfolioPhoto_projectId_idx" ON "PortfolioPhoto"("projectId");

-- CreateIndex
CREATE INDEX "ClientRelationship_artisanId_idx" ON "ClientRelationship"("artisanId");

-- CreateIndex
CREATE INDEX "ClientRelationship_clientId_idx" ON "ClientRelationship"("clientId");

-- CreateIndex
CREATE INDEX "ClientRelationship_status_idx" ON "ClientRelationship"("status");

-- CreateIndex
CREATE INDEX "ClientRelationship_clientType_idx" ON "ClientRelationship"("clientType");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRelationship_artisanId_clientId_key" ON "ClientRelationship"("artisanId", "clientId");

-- CreateIndex
CREATE INDEX "ClientFollowUp_relationshipId_idx" ON "ClientFollowUp"("relationshipId");

-- CreateIndex
CREATE INDEX "ClientFollowUp_dueDate_idx" ON "ClientFollowUp"("dueDate");

-- CreateIndex
CREATE INDEX "ClientFollowUp_status_idx" ON "ClientFollowUp"("status");

-- CreateIndex
CREATE INDEX "RecurringService_artisanId_idx" ON "RecurringService"("artisanId");

-- CreateIndex
CREATE INDEX "RecurringService_clientId_idx" ON "RecurringService"("clientId");

-- CreateIndex
CREATE INDEX "RecurringService_status_idx" ON "RecurringService"("status");

-- CreateIndex
CREATE INDEX "RecurringService_nextServiceDate_idx" ON "RecurringService"("nextServiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringServiceMission_missionId_key" ON "RecurringServiceMission"("missionId");

-- CreateIndex
CREATE INDEX "RecurringServiceMission_recurringServiceId_idx" ON "RecurringServiceMission"("recurringServiceId");

-- CreateIndex
CREATE INDEX "RecurringServiceMission_scheduledDate_idx" ON "RecurringServiceMission"("scheduledDate");

-- CreateIndex
CREATE INDEX "RecurringServiceMission_status_idx" ON "RecurringServiceMission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontractor_invitationToken_key" ON "Subcontractor"("invitationToken");

-- CreateIndex
CREATE INDEX "Subcontractor_artisanId_idx" ON "Subcontractor"("artisanId");

-- CreateIndex
CREATE INDEX "Subcontractor_subcontractorUserId_idx" ON "Subcontractor"("subcontractorUserId");

-- CreateIndex
CREATE INDEX "Subcontractor_status_idx" ON "Subcontractor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontractor_artisanId_subcontractorUserId_key" ON "Subcontractor"("artisanId", "subcontractorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontractor_artisanId_externalEmail_key" ON "Subcontractor"("artisanId", "externalEmail");

-- CreateIndex
CREATE INDEX "SubcontractorAssignment_subcontractorId_idx" ON "SubcontractorAssignment"("subcontractorId");

-- CreateIndex
CREATE INDEX "SubcontractorAssignment_missionId_idx" ON "SubcontractorAssignment"("missionId");

-- CreateIndex
CREATE INDEX "SubcontractorAssignment_paymentStatus_idx" ON "SubcontractorAssignment"("paymentStatus");

-- CreateIndex
CREATE INDEX "SubcontractorAssignment_status_idx" ON "SubcontractorAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubcontractorAssignment_subcontractorId_missionId_key" ON "SubcontractorAssignment"("subcontractorId", "missionId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_artisanId_idx" ON "AnalyticsSnapshot"("artisanId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_periodType_idx" ON "AnalyticsSnapshot"("periodType");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_periodStart_idx" ON "AnalyticsSnapshot"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_artisanId_periodType_periodStart_key" ON "AnalyticsSnapshot"("artisanId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "RevenueGoal_artisanId_idx" ON "RevenueGoal"("artisanId");

-- CreateIndex
CREATE INDEX "RevenueGoal_status_idx" ON "RevenueGoal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueGoal_artisanId_periodType_periodStart_key" ON "RevenueGoal"("artisanId", "periodType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToId_idx" ON "SupportTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_firstResponseDue_idx" ON "SupportTicket"("firstResponseDue");

-- CreateIndex
CREATE INDEX "SupportTicket_resolutionDue_idx" ON "SupportTicket"("resolutionDue");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_senderId_idx" ON "TicketMessage"("senderId");

-- CreateIndex
CREATE INDEX "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSequence_date_key" ON "TicketSequence"("date");

-- CreateIndex
CREATE INDEX "TicketEscalation_ticketId_idx" ON "TicketEscalation"("ticketId");

-- CreateIndex
CREATE INDEX "TicketEscalation_createdAt_idx" ON "TicketEscalation"("createdAt");

-- CreateIndex
CREATE INDEX "CannedResponse_category_idx" ON "CannedResponse"("category");

-- CreateIndex
CREATE INDEX "CannedResponse_isActive_idx" ON "CannedResponse"("isActive");

-- CreateIndex
CREATE INDEX "CannedResponse_usageCount_idx" ON "CannedResponse"("usageCount");

-- CreateIndex
CREATE INDEX "NpsResponse_userId_idx" ON "NpsResponse"("userId");

-- CreateIndex
CREATE INDEX "NpsResponse_ticketId_idx" ON "NpsResponse"("ticketId");

-- CreateIndex
CREATE INDEX "NpsResponse_createdAt_idx" ON "NpsResponse"("createdAt");

-- CreateIndex
CREATE INDEX "NpsResponse_score_idx" ON "NpsResponse"("score");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseArticle_slug_key" ON "KnowledgeBaseArticle"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_category_idx" ON "KnowledgeBaseArticle"("category");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_status_idx" ON "KnowledgeBaseArticle"("status");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_locale_idx" ON "KnowledgeBaseArticle"("locale");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_targetAudience_idx" ON "KnowledgeBaseArticle"("targetAudience");

-- CreateIndex
CREATE INDEX "DocumentTemplate_artisanId_idx" ON "DocumentTemplate"("artisanId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_category_idx" ON "DocumentTemplate"("category");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isGlobal_idx" ON "DocumentTemplate"("isGlobal");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");

-- CreateIndex
CREATE INDEX "DocumentTemplateSection_templateId_idx" ON "DocumentTemplateSection"("templateId");

-- CreateIndex
CREATE INDEX "DocumentTemplateField_sectionId_idx" ON "DocumentTemplateField"("sectionId");

-- CreateIndex
CREATE INDEX "JobDocument_missionId_idx" ON "JobDocument"("missionId");

-- CreateIndex
CREATE INDEX "JobDocument_templateId_idx" ON "JobDocument"("templateId");

-- CreateIndex
CREATE INDEX "JobDocument_type_idx" ON "JobDocument"("type");

-- CreateIndex
CREATE INDEX "JobDocument_status_idx" ON "JobDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_code_idx" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_fromCurrency_toCurrency_idx" ON "ExchangeRateHistory"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_recordedAt_idx" ON "ExchangeRateHistory"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CountryConfig_countryCode_key" ON "CountryConfig"("countryCode");

-- CreateIndex
CREATE INDEX "CountryConfig_isActive_idx" ON "CountryConfig"("isActive");

-- CreateIndex
CREATE INDEX "CountryConfig_defaultCurrency_idx" ON "CountryConfig"("defaultCurrency");

-- CreateIndex
CREATE INDEX "CountryComplianceRequirement_countryConfigId_idx" ON "CountryComplianceRequirement"("countryConfigId");

-- CreateIndex
CREATE INDEX "CountryComplianceRequirement_category_idx" ON "CountryComplianceRequirement"("category");

-- CreateIndex
CREATE INDEX "CountryComplianceRequirement_isRequired_idx" ON "CountryComplianceRequirement"("isRequired");

-- CreateIndex
CREATE INDEX "CountryComplianceRequirement_isActive_idx" ON "CountryComplianceRequirement"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CountryComplianceRequirement_countryConfigId_name_key" ON "CountryComplianceRequirement"("countryConfigId", "name");

-- CreateIndex
CREATE INDEX "ArtisanComplianceRecord_artisanId_idx" ON "ArtisanComplianceRecord"("artisanId");

-- CreateIndex
CREATE INDEX "ArtisanComplianceRecord_requirementId_idx" ON "ArtisanComplianceRecord"("requirementId");

-- CreateIndex
CREATE INDEX "ArtisanComplianceRecord_status_idx" ON "ArtisanComplianceRecord"("status");

-- CreateIndex
CREATE INDEX "ArtisanComplianceRecord_expiryDate_idx" ON "ArtisanComplianceRecord"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanComplianceRecord_artisanId_requirementId_key" ON "ArtisanComplianceRecord"("artisanId", "requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "Locale_code_key" ON "Locale"("code");

-- CreateIndex
CREATE INDEX "Locale_code_idx" ON "Locale"("code");

-- CreateIndex
CREATE INDEX "Locale_isActive_idx" ON "Locale"("isActive");

-- CreateIndex
CREATE INDEX "Translation_key_idx" ON "Translation"("key");

-- CreateIndex
CREATE INDEX "Translation_locale_idx" ON "Translation"("locale");

-- CreateIndex
CREATE INDEX "Translation_namespace_idx" ON "Translation"("namespace");

-- CreateIndex
CREATE INDEX "Translation_status_idx" ON "Translation"("status");

-- CreateIndex
CREATE INDEX "Translation_locale_namespace_idx" ON "Translation"("locale", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_key_locale_namespace_key" ON "Translation"("key", "locale", "namespace");

-- CreateIndex
CREATE INDEX "TranslationHistory_translationId_idx" ON "TranslationHistory"("translationId");

-- CreateIndex
CREATE INDEX "TranslationHistory_userId_idx" ON "TranslationHistory"("userId");

-- CreateIndex
CREATE INDEX "TranslationHistory_createdAt_idx" ON "TranslationHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ChatRoom_companyId_idx" ON "ChatRoom"("companyId");

-- CreateIndex
CREATE INDEX "ChatRoom_missionId_idx" ON "ChatRoom"("missionId");

-- CreateIndex
CREATE INDEX "ChatRoom_type_idx" ON "ChatRoom"("type");

-- CreateIndex
CREATE INDEX "ChatRoom_lastMessageAt_idx" ON "ChatRoom"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatRoom_isArchived_idx" ON "ChatRoom"("isArchived");

-- CreateIndex
CREATE INDEX "ChatMember_roomId_idx" ON "ChatMember"("roomId");

-- CreateIndex
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");

-- CreateIndex
CREATE INDEX "ChatMember_leftAt_idx" ON "ChatMember"("leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMember_roomId_userId_key" ON "ChatMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_idx" ON "ChatMessage"("roomId");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_type_idx" ON "ChatMessage"("type");

-- CreateIndex
CREATE INDEX "ChatMessage_isPinned_idx" ON "ChatMessage"("isPinned");

-- CreateIndex
CREATE INDEX "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");

-- CreateIndex
CREATE INDEX "ChatReadReceipt_messageId_idx" ON "ChatReadReceipt"("messageId");

-- CreateIndex
CREATE INDEX "ChatReadReceipt_userId_idx" ON "ChatReadReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReadReceipt_messageId_userId_key" ON "ChatReadReceipt"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "_ArtisanProfileToSpecialty_AB_unique" ON "_ArtisanProfileToSpecialty"("A", "B");

-- CreateIndex
CREATE INDEX "_ArtisanProfileToSpecialty_B_index" ON "_ArtisanProfileToSpecialty"("B");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_companyEmployeeId_fkey" FOREIGN KEY ("companyEmployeeId") REFERENCES "CompanyEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEarnings" ADD CONSTRAINT "EmployeeEarnings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEarnings" ADD CONSTRAINT "EmployeeEarnings_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionTimeTracking" ADD CONSTRAINT "MissionTimeTracking_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionTimeTracking" ADD CONSTRAINT "MissionTimeTracking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryCorrection" ADD CONSTRAINT "TimeEntryCorrection_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "CompanyEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedArtisan" ADD CONSTRAINT "SavedArtisan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedArtisan" ADD CONSTRAINT "SavedArtisan_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "CompanyEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "CompanyEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionHistory" ADD CONSTRAINT "MissionHistory_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionHistory" ADD CONSTRAINT "MissionHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewedId_fkey" FOREIGN KEY ("reviewedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReturn" ADD CONSTRAINT "OrderReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReturn" ADD CONSTRAINT "OrderReturn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "OrderReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_noShowEventId_fkey" FOREIGN KEY ("noShowEventId") REFERENCES "NoShowEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoShowEvent" ADD CONSTRAINT "NoShowEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoShowEvent" ADD CONSTRAINT "NoShowEvent_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationHistory" ADD CONSTRAINT "ReputationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationLog" ADD CONSTRAINT "CompensationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentViolation" ADD CONSTRAINT "ContentViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupCode" ADD CONSTRAINT "BackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatDeclaration" ADD CONSTRAINT "VatDeclaration_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringUnavailability" ADD CONSTRAINT "RecurringUnavailability_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_parentQuoteId_fkey" FOREIGN KEY ("parentQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "MaterialCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteTemplate" ADD CONSTRAINT "QuoteTemplate_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSignature" ADD CONSTRAINT "QuoteSignature_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSignature" ADD CONSTRAINT "QuoteSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSignatureRequest" ADD CONSTRAINT "QuoteSignatureRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCatalogItem" ADD CONSTRAINT "MaterialCatalogItem_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPhoto" ADD CONSTRAINT "PortfolioPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRelationship" ADD CONSTRAINT "ClientRelationship_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRelationship" ADD CONSTRAINT "ClientRelationship_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFollowUp" ADD CONSTRAINT "ClientFollowUp_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "ClientRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringService" ADD CONSTRAINT "RecurringService_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringService" ADD CONSTRAINT "RecurringService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringServiceMission" ADD CONSTRAINT "RecurringServiceMission_recurringServiceId_fkey" FOREIGN KEY ("recurringServiceId") REFERENCES "RecurringService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringServiceMission" ADD CONSTRAINT "RecurringServiceMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_subcontractorUserId_fkey" FOREIGN KEY ("subcontractorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorAssignment" ADD CONSTRAINT "SubcontractorAssignment_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorAssignment" ADD CONSTRAINT "SubcontractorAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueGoal" ADD CONSTRAINT "RevenueGoal_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEscalation" ADD CONSTRAINT "TicketEscalation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseArticle" ADD CONSTRAINT "KnowledgeBaseArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplateSection" ADD CONSTRAINT "DocumentTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplateField" ADD CONSTRAINT "DocumentTemplateField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DocumentTemplateSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDocument" ADD CONSTRAINT "JobDocument_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDocument" ADD CONSTRAINT "JobDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryComplianceRequirement" ADD CONSTRAINT "CountryComplianceRequirement_countryConfigId_fkey" FOREIGN KEY ("countryConfigId") REFERENCES "CountryConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanComplianceRecord" ADD CONSTRAINT "ArtisanComplianceRecord_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanComplianceRecord" ADD CONSTRAINT "ArtisanComplianceRecord_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "CountryComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationHistory" ADD CONSTRAINT "TranslationHistory_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "Translation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArtisanProfileToSpecialty" ADD CONSTRAINT "_ArtisanProfileToSpecialty_A_fkey" FOREIGN KEY ("A") REFERENCES "ArtisanProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArtisanProfileToSpecialty" ADD CONSTRAINT "_ArtisanProfileToSpecialty_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

