/**
 * Standard API Error Response Interface
 *
 * All API errors should follow this format for consistency
 * across the application.
 */
export interface StandardErrorResponse {
  /** HTTP status code */
  statusCode: number;

  /** ISO 8601 timestamp when error occurred */
  timestamp: string;

  /** Request path that caused the error */
  path: string;

  /** HTTP method used */
  method: string;

  /** Error type/category */
  error: string;

  /** Human-readable error message */
  message: string | string[];

  /** Error code for programmatic handling (optional) */
  code?: string;

  /** Additional error details (optional) */
  details?: Record<string, any>;
}

/**
 * Validation Error Response
 * Extended interface for validation errors with field-level details
 */
export interface ValidationErrorResponse extends StandardErrorResponse {
  /** Validation errors by field */
  validationErrors?: {
    field: string;
    message: string;
    value?: any;
  }[];
}

/**
 * Error codes for programmatic handling
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_2FA_REQUIRED: 'AUTH_2FA_REQUIRED',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',

  // Authorization errors
  AUTHZ_FORBIDDEN: 'AUTHZ_FORBIDDEN',
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_CARD_DECLINED: 'PAYMENT_CARD_DECLINED',
  PAYMENT_KYC_REQUIRED: 'PAYMENT_KYC_REQUIRED',

  // Mission errors
  MISSION_INVALID_STATUS_TRANSITION: 'MISSION_INVALID_STATUS_TRANSITION',
  MISSION_ALREADY_ASSIGNED: 'MISSION_ALREADY_ASSIGNED',
  MISSION_EXPIRED: 'MISSION_EXPIRED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // WebSocket errors
  WS_CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  WS_MESSAGE_SEND_FAILED: 'WS_MESSAGE_SEND_FAILED',
  WS_MAX_CONNECTIONS_EXCEEDED: 'WS_MAX_CONNECTIONS_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Helper function to create standard error responses
 */
export function createErrorResponse(
  statusCode: number,
  error: string,
  message: string | string[],
  options?: {
    code?: ErrorCode;
    details?: Record<string, any>;
    validationErrors?: ValidationErrorResponse['validationErrors'];
  },
): StandardErrorResponse | ValidationErrorResponse {
  const response: StandardErrorResponse = {
    statusCode,
    timestamp: new Date().toISOString(),
    path: '', // Will be filled by filter
    method: '', // Will be filled by filter
    error,
    message,
  };

  if (options?.code) {
    response.code = options.code;
  }

  if (options?.details) {
    response.details = options.details;
  }

  if (options?.validationErrors) {
    (response as ValidationErrorResponse).validationErrors = options.validationErrors;
  }

  return response;
}
