/**
 * Type definitions for Prisma JSON fields
 * These interfaces provide proper typing for JSON fields in the database schema
 */

import { Prisma } from '@prisma/client';

// Invoice address types
export interface AddressInfo {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  siret?: string;
  vat?: string;
}

export interface IssuerAddress extends AddressInfo {
  siret?: string;
  vat?: string;
}

export interface ClientAddress extends AddressInfo {}

// Invoice line item
export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total: number;
}

// Quote line item
export interface QuoteLineItem {
  itemType: 'LABOR' | 'MATERIAL' | 'EQUIPMENT' | 'TRAVEL' | 'OTHER';
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice?: number;
  catalogItemId?: string;
}

// Quote totals
export interface QuoteTotals {
  subtotal: number;
  laborTotal: number;
  materialsTotal: number;
  travelTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

// Location/GPS coords
export interface GeoLocation {
  lat: number;
  lng: number;
}

// Contact attempt for no-show tracking
export interface ContactAttempt {
  timestamp: Date | string;
  method: 'PHONE' | 'SMS' | 'EMAIL';
  successful: boolean;
  notes?: string;
}

// Badge criteria
export interface BadgeCriteria {
  missions_completed?: number;
  avg_rating?: number;
  min_reviews?: number;
  consecutive_5_stars?: number;
  response_time_under_hours?: number;
  referrals_count?: number;
  total_earnings?: number;
  verified_artisan?: boolean;
  years_active?: number;
}

// Employee permissions
export interface EmployeePermissions {
  canViewAllMissions?: boolean;
  canAssignMissions?: boolean;
  canManageEmployees?: boolean;
  canViewAnalytics?: boolean;
  canManageSettings?: boolean;
}

// Knowledge base translations
export interface KBTranslations {
  fr?: { title?: string; content?: string };
  de?: { title?: string; content?: string };
  en?: { title?: string; content?: string };
}

// Feature flag value
export interface FeatureFlagValue {
  enabled: boolean;
  [key: string]: unknown;
}

// Analytics category breakdown
export interface CategoryBreakdown {
  [category: string]: number;
}

// Default quote line items (catalog template)
export interface DefaultLineItem {
  itemType: 'LABOR' | 'MATERIAL' | 'EQUIPMENT' | 'TRAVEL' | 'OTHER';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

// Notification preferences disabled types
export type DisabledNotificationTypes = string[];

// Safe cast helper that preserves type safety
export function safeJsonCast<T>(value: Prisma.JsonValue, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return value as unknown as T;
}
