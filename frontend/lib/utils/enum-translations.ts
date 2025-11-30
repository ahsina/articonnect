/**
 * Enum translation utilities for consistent translations across the app
 */

type TranslationFunction = (category: string, key: string) => string | undefined;

// Quotation status translations
export const translateQuotationStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    PENDING: t('status', 'pending') || 'En attente',
    ACCEPTED: t('status', 'accepted') || 'Accepté',
    REJECTED: t('status', 'rejected') || 'Refusé',
    EXPIRED: t('status', 'expired') || 'Expiré',
    SIGNED: t('status', 'signed') || 'Signé',
    DRAFT: t('status', 'draft') || 'Brouillon',
    SENT: t('status', 'sent') || 'Envoyé',
    CONVERTED: t('status', 'converted') || 'Converti',
  };
  return translations[status] || status;
};

// Payment status translations
export const translatePaymentStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    PENDING: t('status', 'pending') || 'En attente',
    PROCESSING: t('status', 'processing') || 'En cours',
    PAID: t('status', 'paid') || 'Payé',
    FAILED: t('status', 'failed') || 'Échoué',
    REFUNDED: t('status', 'refunded') || 'Remboursé',
    CANCELLED: t('status', 'cancelled') || 'Annulé',
  };
  return translations[status] || status;
};

// Mission status translations
export const translateMissionStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    PENDING: t('status', 'pending') || 'En attente',
    ACCEPTED: t('status', 'accepted') || 'Accepté',
    IN_PROGRESS: t('status', 'inProgress') || 'En cours',
    COMPLETED: t('status', 'completed') || 'Terminé',
    CANCELLED: t('status', 'cancelled') || 'Annulé',
    DISPUTED: t('status', 'disputed') || 'En litige',
  };
  return translations[status] || status;
};

// Badge type translations
export const translateBadgeType = (
  type: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    MILESTONE: t('badges', 'milestone') || 'Jalon',
    ACHIEVEMENT: t('badges', 'achievement') || 'Accomplissement',
    SPECIAL: t('badges', 'special') || 'Spécial',
    SEASONAL: t('badges', 'seasonal') || 'Saisonnier',
  };
  return translations[type] || type;
};

// Time entry status translations
export const translateTimeEntryStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    IN_PROGRESS: t('status', 'inProgress') || 'En cours',
    COMPLETED: t('status', 'completed') || 'Terminé',
    APPROVED: t('status', 'approved') || 'Approuvé',
    REJECTED: t('status', 'rejected') || 'Refusé',
  };
  return translations[status] || status;
};

// Time entry type translations
export const translateTimeEntryType = (
  type: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    CLOCK_IN: t('timeTracking', 'clockIn') || 'Pointage entrée',
    CLOCK_OUT: t('timeTracking', 'clockOut') || 'Pointage sortie',
    BREAK_START: t('timeTracking', 'breakStart') || 'Début pause',
    BREAK_END: t('timeTracking', 'breakEnd') || 'Fin pause',
  };
  return translations[type] || type;
};

// Notification type translations
export const translateNotificationType = (
  type: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    NEW_MISSION: t('notifications', 'newMission') || 'Nouvelle mission',
    MISSION_ACCEPTED: t('notifications', 'missionAccepted') || 'Mission acceptée',
    MISSION_COMPLETED: t('notifications', 'missionCompleted') || 'Mission terminée',
    MISSION_CANCELLED: t('notifications', 'missionCancelled') || 'Mission annulée',
    PAYMENT_RECEIVED: t('notifications', 'paymentReceived') || 'Paiement reçu',
    REVIEW_NEW: t('notifications', 'newReview') || 'Nouvel avis',
    MESSAGE_NEW: t('notifications', 'newMessage') || 'Nouveau message',
    CERTIFICATION_EXPIRING: t('notifications', 'certificationExpiring') || 'Certification expirante',
    CERTIFICATION_EXPIRED: t('notifications', 'certificationExpired') || 'Certification expirée',
  };
  return translations[type] || type;
};

// User role translations
export const translateUserRole = (
  role: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    CLIENT: t('roles', 'client') || 'Client',
    ARTISAN: t('roles', 'artisan') || 'Artisan',
    ADMIN: t('roles', 'admin') || 'Administrateur',
    EMPLOYEE: t('roles', 'employee') || 'Employé',
  };
  return translations[role] || role;
};

// Certification status translations
export const translateCertificationStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    PENDING: t('status', 'pending') || 'En attente',
    VERIFIED: t('status', 'verified') || 'Vérifié',
    REJECTED: t('status', 'rejected') || 'Refusé',
    EXPIRED: t('status', 'expired') || 'Expiré',
  };
  return translations[status] || status;
};
