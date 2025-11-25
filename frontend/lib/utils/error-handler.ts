import { toast } from 'sonner';

/**
 * Standard API Error Response from backend
 */
export interface ApiErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  error: string;
  message: string | string[];
  code?: string;
  details?: Record<string, any>;
  validationErrors?: {
    field: string;
    message: string;
    value?: any;
  }[];
}

/**
 * Error codes that can be handled programmatically
 */
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_2FA_REQUIRED: 'AUTH_2FA_REQUIRED',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTHZ_FORBIDDEN: 'AUTHZ_FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_KYC_REQUIRED: 'PAYMENT_KYC_REQUIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  WS_MAX_CONNECTIONS_EXCEEDED: 'WS_MAX_CONNECTIONS_EXCEEDED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Check if error response is an API error
 */
export function isApiError(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error
  );
}

/**
 * Extract error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (Array.isArray(error.message)) {
      return error.message.join(', ');
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Une erreur inattendue s\'est produite';
}

/**
 * Get error code from API error
 */
export function getErrorCode(error: unknown): ErrorCode | undefined {
  if (isApiError(error) && error.code) {
    return error.code as ErrorCode;
  }
  return undefined;
}

/**
 * Get validation errors from API error
 */
export function getValidationErrors(
  error: unknown,
): Record<string, string> | null {
  if (isApiError(error) && error.validationErrors) {
    return error.validationErrors.reduce(
      (acc, { field, message }) => ({
        ...acc,
        [field]: message,
      }),
      {},
    );
  }
  return null;
}

/**
 * Human-readable error messages by code
 */
const errorMessages: Record<string, string> = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Votre session a expiré. Veuillez vous reconnecter.',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Session invalide. Veuillez vous reconnecter.',
  [ErrorCodes.AUTH_2FA_REQUIRED]: 'Vérification en deux étapes requise',
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: 'Veuillez vérifier votre email avant de continuer',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'Votre compte est temporairement bloqué',
  [ErrorCodes.AUTHZ_FORBIDDEN]: 'Vous n\'avez pas accès à cette ressource',
  [ErrorCodes.VALIDATION_FAILED]: 'Veuillez corriger les erreurs dans le formulaire',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'La ressource demandée n\'existe pas',
  [ErrorCodes.RESOURCE_CONFLICT]: 'Cette ressource existe déjà',
  [ErrorCodes.PAYMENT_FAILED]: 'Le paiement a échoué. Veuillez réessayer.',
  [ErrorCodes.PAYMENT_KYC_REQUIRED]: 'Vérification d\'identité requise pour ce montant',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Trop de tentatives. Veuillez patienter.',
  [ErrorCodes.WS_MAX_CONNECTIONS_EXCEEDED]: 'Nombre maximum de connexions atteint',
};

/**
 * Get human-readable message for error code
 */
export function getHumanReadableError(error: unknown): string {
  const code = getErrorCode(error);
  if (code && errorMessages[code]) {
    return errorMessages[code];
  }
  return getErrorMessage(error);
}

/**
 * Handle API error with toast notification
 */
export function handleApiError(
  error: unknown,
  options?: {
    showToast?: boolean;
    onAuthError?: () => void;
    onValidationError?: (errors: Record<string, string>) => void;
  },
): void {
  const { showToast = true, onAuthError, onValidationError } = options || {};

  const code = getErrorCode(error);
  const message = getHumanReadableError(error);

  // Handle specific error types
  if (code === ErrorCodes.AUTH_TOKEN_EXPIRED || code === ErrorCodes.AUTH_TOKEN_INVALID) {
    if (onAuthError) {
      onAuthError();
    } else {
      // Default: redirect to login
      window.location.href = '/login?session=expired';
    }
    return;
  }

  // Handle validation errors
  if (code === ErrorCodes.VALIDATION_FAILED) {
    const validationErrors = getValidationErrors(error);
    if (validationErrors && onValidationError) {
      onValidationError(validationErrors);
    }
  }

  // Show toast notification
  if (showToast) {
    const statusCode = isApiError(error) ? error.statusCode : 500;

    if (statusCode >= 500) {
      toast.error('Erreur serveur', {
        description: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      });
    } else if (statusCode === 429) {
      toast.warning('Trop de requêtes', {
        description: message,
      });
    } else {
      toast.error('Erreur', {
        description: message,
      });
    }
  }
}

/**
 * Wrapper for async functions with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    showToast?: boolean;
    onError?: (error: unknown) => void;
    onAuthError?: () => void;
  },
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleApiError(error, options);
    if (options?.onError) {
      options.onError(error);
    }
    return null;
  }
}

/**
 * React hook for form error handling
 */
export function useFormErrors() {
  const setFieldErrors = (
    setError: (field: string, error: { type: string; message: string }) => void,
    error: unknown,
  ): void => {
    const validationErrors = getValidationErrors(error);
    if (validationErrors) {
      Object.entries(validationErrors).forEach(([field, message]) => {
        setError(field, { type: 'server', message });
      });
    }
  };

  return { setFieldErrors };
}
