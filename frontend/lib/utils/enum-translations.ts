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

// Priority translations
export const translatePriority = (
  priority: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    LOW: t('priority', 'low') || 'Basse',
    MEDIUM: t('priority', 'medium') || 'Moyenne',
    HIGH: t('priority', 'high') || 'Haute',
    URGENT: t('priority', 'urgent') || 'Urgente',
  };
  return translations[priority] || priority;
};

// Employee role translations
export const translateEmployeeRole = (
  role: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    OWNER: t('roles', 'owner') || 'Propriétaire',
    MANAGER: t('roles', 'manager') || 'Manager',
    TECHNICIAN: t('roles', 'technician') || 'Technicien',
    APPRENTICE: t('roles', 'apprentice') || 'Apprenti',
    ADMIN: t('roles', 'admin') || 'Administrateur',
  };
  return translations[role] || role;
};

// Document type translations
export const translateDocumentType = (
  type: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    ID_CARD: t('documents', 'idCard') || "Carte d'identité",
    PASSPORT: t('documents', 'passport') || 'Passeport',
    DRIVING_LICENSE: t('documents', 'drivingLicense') || 'Permis de conduire',
    PROOF_OF_ADDRESS: t('documents', 'proofOfAddress') || 'Justificatif de domicile',
    INSURANCE: t('documents', 'insurance') || 'Assurance',
    CERTIFICATION: t('documents', 'certification') || 'Certification',
    OTHER: t('documents', 'other') || 'Autre',
  };
  return translations[type] || type;
};

// Dispute status translations
export const translateDisputeStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    OPEN: t('status', 'open') || 'Ouvert',
    UNDER_REVIEW: t('status', 'underReview') || 'En cours de révision',
    RESOLVED: t('status', 'resolved') || 'Résolu',
    ESCALATED: t('status', 'escalated') || 'Escaladé',
    CLOSED: t('status', 'closed') || 'Fermé',
  };
  return translations[status] || status;
};

// No-show status translations
export const translateNoShowStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    PENDING_VERIFICATION: t('status', 'pendingVerification') || 'En attente de vérification',
    CONFIRMED: t('status', 'confirmed') || 'Confirmé',
    DISPUTED: t('status', 'disputed') || 'Contesté',
    RESOLVED: t('status', 'resolved') || 'Résolu',
    PENALTY_APPLIED: t('status', 'penaltyApplied') || 'Pénalité appliquée',
  };
  return translations[status] || status;
};

// Verification status translations
export const translateVerificationStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    PENDING: t('status', 'pending') || 'En attente',
    VERIFIED: t('status', 'verified') || 'Vérifié',
    REJECTED: t('status', 'rejected') || 'Refusé',
    EXPIRED: t('status', 'expired') || 'Expiré',
    IN_REVIEW: t('status', 'inReview') || 'En révision',
  };
  return translations[status] || status;
};

// Feature flag status translations
export const translateFeatureFlagStatus = (
  status: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    ACTIVE: t('status', 'active') || 'Actif',
    INACTIVE: t('status', 'inactive') || 'Inactif',
    DEPRECATED: t('status', 'deprecated') || 'Déprécié',
  };
  return translations[status] || status;
};

// Feature flag type translations
export const translateFeatureFlagType = (
  type: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    BOOLEAN: t('types', 'boolean') || 'Booléen',
    PERCENTAGE: t('types', 'percentage') || 'Pourcentage',
    USER_LIST: t('types', 'userList') || 'Liste utilisateurs',
    JSON: t('types', 'json') || 'JSON',
  };
  return translations[type] || type;
};

// Event type translations
export const translateEventType = (
  type: string,
  t: TranslationFunction
): string => {
  const translations: Record<string, string> = {
    STATUS_CHANGE: t('events', 'statusChange') || 'Changement de statut',
    MESSAGE: t('events', 'message') || 'Message',
    PAYMENT: t('events', 'payment') || 'Paiement',
    NOTE: t('events', 'note') || 'Note',
    DOCUMENT: t('events', 'document') || 'Document',
  };
  return translations[type] || type;
};
