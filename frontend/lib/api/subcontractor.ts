import apiClient from './client';

// ---------------------------------------------------------------------------
// Types — shapes tolérants (le back reste la source de vérité).
// ---------------------------------------------------------------------------

// Statut réel côté back : une offre en attente de réponse a le statut `ASSIGNED`
// (le sous-traitant l'a reçue mais ne l'a pas encore acceptée). Une fois acceptée
// elle devient `IN_PROGRESS`, refusée -> `CANCELLED`.
export type SubcontractorOfferStatus =
  | 'ASSIGNED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | string;

export type SubcontractorAssignmentStatus =
  | 'ASSIGNED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

/** Commission plateforme : plancher réglementaire de 5 %. */
export const COMMISSION_FLOOR_RATE = 5;

/** Convertit une valeur (Decimal string, number, null) en number sûr (0 si NaN). */
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type SubcontractorStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING_INVITATION'
  | string;

/** Mission telle qu'incluse dans une offre / un assignment (normalisée). */
export interface SubcontractorMission {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  /** Normalisé depuis `scheduledFor` (nom réel côté back). */
  scheduledAt?: string;
  scheduledFor?: string;
  status?: string;
  clientName?: string;
  client?: { firstName?: string; lastName?: string; phone?: string; [key: string]: any };
  [key: string]: any;
}

/**
 * Offre reçue par l'artisan qui EXÉCUTE (portail sous-traitant).
 * Forme réelle du back : { agreedAmount, commissionRate, role, description,
 * status:'ASSIGNED', mission{...,scheduledFor,client}, subcontractor:{artisan{...}} }.
 * Les fonctions `portal.*` normalisent vers les champs ci-dessous.
 */
export interface SubcontractorOffer {
  id: string;
  status?: SubcontractorOfferStatus;
  role?: string;
  missionId?: string;
  mission?: SubcontractorMission;
  /** Montant convenu (normalisé depuis `agreedAmount`). */
  amount?: number;
  currency?: string;
  /** Taux de commission plateforme en % (normalisé depuis `commissionRate`). */
  commissionRate?: number;
  /** Note interne / rôle (normalisé depuis `description`). */
  note?: string;
  message?: string;
  contractorId?: string;
  /** Donneur d'ordre (normalisé depuis `subcontractor.artisan`). */
  contractor?: {
    id?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  [key: string]: any;
}

/** Mission confiée à un sous-traitant (vue exécutant ET donneur d'ordre). */
export interface SubcontractorAssignment {
  id: string;
  status?: SubcontractorAssignmentStatus;
  role?: string;
  /** Avancement 0-100 (persisté côté back sur le champ `progress`). */
  progress?: number;
  subcontractorId?: string;
  subcontractor?: Subcontractor;
  missionId?: string;
  mission?: SubcontractorMission;
  /** Montant convenu (normalisé depuis `agreedAmount`). */
  amount?: number;
  currency?: string;
  /** Taux de commission plateforme en % (normalisé depuis `commissionRate`). */
  commissionRate?: number;
  paymentStatus?: string;
  /** Note du donneur d'ordre → sous-traitant (1-5) et son commentaire. */
  rating?: number | null;
  feedback?: string | null;
  /** Note RÉCIPROQUE du sous-traitant → donneur d'ordre (1-5) et son commentaire. */
  contractorRating?: number | null;
  contractorFeedback?: string | null;
  /** Donneur d'ordre (normalisé depuis `subcontractor.artisan`). `id` = userId (contact chat). */
  contractor?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  note?: string;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/** Sous-traitant tel que vu par le donneur d'ordre. */
export interface Subcontractor {
  id: string;
  status?: SubcontractorStatus;
  email?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  invitationToken?: string;
  invitationSentAt?: string;
  invitationAcceptedAt?: string;
  totalAssignments?: number;
  totalEarnings?: number;
  averageRating?: number;
  totalReviews?: number;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/**
 * Relation de sous-traitance vue par l'exécutant (portail).
 * Forme réelle du back (GET /subcontractor-portal/relationships) :
 * { id, status, available, specialties, acceptedAt, artisanName, artisanCompany }.
 * `id` est le subcontractorId à passer à setAvailability / leaveRelationship.
 */
export interface PortalRelationship {
  /** subcontractorId (clé de la relation) — cible de leave / setAvailability. */
  id: string;
  status?: SubcontractorStatus;
  /** true si status === 'ACTIVE' (reçoit des offres). */
  available?: boolean;
  specialties?: string[];
  acceptedAt?: string;
  /** Nom du donneur d'ordre (artisan). */
  artisanName?: string;
  /** Raison sociale du donneur d'ordre (peut être null). */
  artisanCompany?: string | null;
  [key: string]: any;
}

/** Résultat d'un changement de disponibilité. */
export interface SetAvailabilityResult {
  updated: number;
  active: boolean;
  subcontractorId?: string;
  [key: string]: any;
}

/** Résultat d'un départ de relation. */
export interface LeaveRelationshipResult {
  success: boolean;
  subcontractorId?: string;
  alreadyTerminated?: boolean;
  [key: string]: any;
}

/**
 * Tableau de bord du portail sous-traitant (normalisé et aplati).
 * Forme réelle du back : { isSubcontractor, subcontractorId, available, status,
 * stats:{ pendingOffers, activeAssignments, completedMissions, totalEarnings,
 * averageRating }, currentAssignments:[...] }.
 */
export interface PortalDashboard {
  isSubcontractor?: boolean;
  subcontractorId?: string;
  /** Disponibilité globale (true = reçoit des offres). Piloté par setAvailability. */
  available?: boolean;
  /** Statut brut de la relation courante ('ACTIVE' | 'INACTIVE' | ...). */
  status?: SubcontractorStatus;
  pendingOffers?: number;
  activeAssignments?: number;
  completedAssignments?: number;
  totalEarnings?: number;
  pendingEarnings?: number;
  averageRating?: number;
  currentAssignments?: SubcontractorAssignment[];
  recentOffers?: SubcontractorOffer[];
  recentAssignments?: SubcontractorAssignment[];
  [key: string]: any;
}

/**
 * Résumé des gains du portail sous-traitant (normalisé).
 * Forme réelle du back : { summary:{ totalEarned, totalPaid, totalPending,
 * missionsCompleted }, assignments:[{ id, missionTitle, amount, completedAt,
 * paymentStatus, paidAt }] }.
 */
export interface SubcontractorEarnings {
  totalEarnings?: number;
  paidEarnings?: number;
  pendingEarnings?: number;
  missionsCompleted?: number;
  currency?: string;
  items?: Array<{
    id?: string;
    assignmentId?: string;
    missionTitle?: string;
    amount?: number;
    status?: string;
    createdAt?: string;
    paidAt?: string | null;
    [key: string]: any;
  }>;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// DTOs — volontairement tolérants ; le back renvoie 400 avec les champs requis.
// ---------------------------------------------------------------------------

export interface InviteSubcontractorDto {
  email: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  message?: string;
  [key: string]: any;
}

export interface CreateSubcontractorAssignmentDto {
  subcontractorId: string;
  missionId: string;
  amount?: number;
  currency?: string;
  notes?: string;
  scheduledAt?: string;
  [key: string]: any;
}

export interface UpdateSubcontractorAssignmentDto {
  status?: SubcontractorAssignmentStatus;
  progress?: number;
  amount?: number;
  notes?: string;
  scheduledAt?: string;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Normalisation back -> front.
// Le back sérialise les Decimal en string ("400"), imbrique les gains sous
// `stats`/`summary`, nomme le montant `agreedAmount`, la date `scheduledFor`,
// le donneur d'ordre `subcontractor.artisan`, et le statut d'offre en attente
// `ASSIGNED`. On aligne tout ici pour que la page lise des champs stables.
// ---------------------------------------------------------------------------

function normalizeMission(m: any): SubcontractorMission | undefined {
  if (!m || typeof m !== 'object') return undefined;
  const clientName = m.client
    ? [m.client.firstName, m.client.lastName].filter(Boolean).join(' ') || undefined
    : undefined;
  return {
    ...m,
    scheduledAt: m.scheduledAt ?? m.scheduledFor ?? undefined,
    clientName,
  };
}

function normalizeContractor(raw: any) {
  const artisan = raw?.subcontractor?.artisan ?? raw?.contractor ?? null;
  if (!artisan || typeof artisan !== 'object') return undefined;
  return {
    // `id` = userId du donneur d'ordre (cible du chat POST /chat/conversation/:userId/message).
    id: artisan.id,
    firstName: artisan.firstName,
    lastName: artisan.lastName,
    email: artisan.email,
    phone: artisan.phone,
    companyName: artisan.companyName,
  };
}

function normalizeOffer(raw: any): SubcontractorOffer {
  return {
    ...raw,
    id: raw?.id,
    status: raw?.status,
    role: raw?.role ?? undefined,
    missionId: raw?.missionId,
    mission: normalizeMission(raw?.mission),
    amount: toNum(raw?.agreedAmount ?? raw?.amount),
    currency: raw?.currency || 'EUR',
    commissionRate: toNum(raw?.commissionRate),
    contractor: normalizeContractor(raw),
    note: raw?.description ?? raw?.note ?? undefined,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

function normalizeAssignment(raw: any): SubcontractorAssignment {
  const status = raw?.status;
  // `progress` est persisté côté back ; s'il manque encore, on déduit 100 % pour
  // une mission terminée et 0 sinon (jamais NaN).
  const progress =
    raw?.progress != null
      ? Math.min(100, Math.max(0, toNum(raw.progress)))
      : status === 'COMPLETED'
        ? 100
        : 0;
  return {
    ...raw,
    id: raw?.id,
    status,
    role: raw?.role ?? undefined,
    missionId: raw?.missionId,
    mission: normalizeMission(raw?.mission),
    amount: toNum(raw?.agreedAmount ?? raw?.amount),
    currency: raw?.currency || 'EUR',
    commissionRate: toNum(raw?.commissionRate),
    paymentStatus: raw?.paymentStatus,
    progress,
    rating: raw?.rating ?? null,
    feedback: raw?.feedback ?? null,
    contractorRating: raw?.contractorRating ?? null,
    contractorFeedback: raw?.contractorFeedback ?? null,
    contractor: normalizeContractor(raw),
    note: raw?.description ?? raw?.note ?? undefined,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

function normalizeRelationship(raw: any): PortalRelationship {
  const status = raw?.status;
  return {
    ...raw,
    id: raw?.id,
    status,
    // Le back renvoie `available` ; on le déduit du statut en repli (jamais undefined).
    available: raw?.available ?? status === 'ACTIVE',
    specialties: Array.isArray(raw?.specialties) ? raw.specialties : [],
    acceptedAt: raw?.acceptedAt,
    artisanName: raw?.artisanName ?? undefined,
    artisanCompany: raw?.artisanCompany ?? null,
  };
}

function normalizeDashboard(raw: any): PortalDashboard {
  if (!raw || raw.isSubcontractor === false) {
    return {
      isSubcontractor: false,
      available: false,
      pendingOffers: 0,
      activeAssignments: 0,
      completedAssignments: 0,
      totalEarnings: 0,
      averageRating: 0,
      currentAssignments: [],
    };
  }
  const stats = raw.stats ?? {};
  return {
    ...raw,
    isSubcontractor: true,
    subcontractorId: raw.subcontractorId,
    // `available` (booléen) piloté par setAvailability ; repli sur status === 'ACTIVE'.
    available: raw.available ?? raw.status === 'ACTIVE',
    status: raw.status,
    pendingOffers: toNum(stats.pendingOffers ?? raw.pendingOffers),
    activeAssignments: toNum(stats.activeAssignments ?? raw.activeAssignments),
    completedAssignments: toNum(
      stats.completedMissions ?? stats.completedAssignments ?? raw.completedAssignments,
    ),
    totalEarnings: toNum(stats.totalEarnings ?? raw.totalEarnings),
    averageRating: toNum(stats.averageRating ?? raw.averageRating),
    currentAssignments: Array.isArray(raw.currentAssignments)
      ? raw.currentAssignments.map(normalizeAssignment)
      : [],
  };
}

function normalizeEarnings(raw: any): SubcontractorEarnings {
  const summary = raw?.summary ?? {};
  const rows = Array.isArray(raw?.assignments)
    ? raw.assignments
    : Array.isArray(raw?.items)
      ? raw.items
      : [];
  return {
    ...raw,
    totalEarnings: toNum(summary.totalEarned ?? raw?.totalEarnings),
    paidEarnings: toNum(summary.totalPaid ?? raw?.paidEarnings),
    pendingEarnings: toNum(summary.totalPending ?? raw?.pendingEarnings),
    missionsCompleted: toNum(summary.missionsCompleted ?? raw?.missionsCompleted),
    currency: raw?.currency || 'EUR',
    items: rows.map((a: any) => ({
      id: a?.id,
      assignmentId: a?.assignmentId ?? a?.id,
      missionTitle: a?.missionTitle ?? a?.mission?.title,
      amount: toNum(a?.amount ?? a?.agreedAmount),
      status: a?.status ?? a?.paymentStatus,
      createdAt: a?.createdAt ?? a?.completedAt,
      paidAt: a?.paidAt ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Client API sous-traitance.
//   - portal : l'artisan qui EXÉCUTE (voit offres, missions, gains).
//   - manage : l'artisan DONNEUR d'ordre (invite, assigne, suit).
// ---------------------------------------------------------------------------

export const subcontractorApi = {
  // --- Portail sous-traitant (exécutant) ---------------------------------
  portal: {
    // Tableau de bord agrégé du portail (aplati depuis `stats`).
    getDashboard: async (): Promise<PortalDashboard> => {
      const response = await apiClient.get('/subcontractor-portal/dashboard');
      return normalizeDashboard(response.data);
    },

    // Offres reçues à traiter (statut back `ASSIGNED`).
    getOffers: async (): Promise<SubcontractorOffer[]> => {
      const response = await apiClient.get('/subcontractor-portal/offers');
      const list = Array.isArray(response.data) ? response.data : [];
      return list.map(normalizeOffer);
    },

    // Accepter une offre (notes optionnelles).
    acceptOffer: async (id: string, notes?: string): Promise<SubcontractorAssignment> => {
      const response = await apiClient.post(
        `/subcontractor-portal/offers/${id}/accept`,
        notes ? { notes } : {},
      );
      return normalizeAssignment(response.data);
    },

    // Refuser une offre. Le back exige un motif (`reason`) — on en fournit
    // toujours un pour éviter un feedback "undefined" en base.
    declineOffer: async (id: string, reason?: string): Promise<SubcontractorAssignment> => {
      const response = await apiClient.post(
        `/subcontractor-portal/offers/${id}/decline`,
        { reason: (reason && reason.trim()) || 'Refusé par le sous-traitant' },
      );
      return normalizeAssignment(response.data);
    },

    // Missions confiées à l'exécutant (tous statuts).
    getAssignments: async (): Promise<SubcontractorAssignment[]> => {
      const response = await apiClient.get('/subcontractor-portal/assignments');
      const list = Array.isArray(response.data) ? response.data : [];
      return list.map(normalizeAssignment);
    },

    // Mettre à jour l'avancement d'une mission (0-100, persisté sur `progress`).
    updateProgress: async (
      id: string,
      progress?: number,
    ): Promise<SubcontractorAssignment> => {
      // Entier borné 0-100 : le DTO back valide désormais @IsInt/@Min(0)/@Max(100),
      // on arrondit donc côté client pour éviter un 400 sur une valeur décimale.
      const clamped = Math.round(Math.min(100, Math.max(0, toNum(progress))));
      const response = await apiClient.post(
        `/subcontractor-portal/assignments/${id}/progress`,
        { progress: clamped, notes: `Avancement mis à jour: ${clamped}%` },
      );
      return normalizeAssignment(response.data);
    },

    // Marquer une mission comme terminée.
    completeAssignment: async (id: string): Promise<SubcontractorAssignment> => {
      const response = await apiClient.post(
        `/subcontractor-portal/assignments/${id}/complete`,
        {},
      );
      return normalizeAssignment(response.data);
    },

    // NOTATION RÉCIPROQUE : le sous-traitant note le donneur d'ordre (1-5) sur une
    // mission TERMINÉE. Écrit contractorRating/contractorFeedback (déjà en base).
    rateContractor: async (
      id: string,
      dto: { contractorRating: number; contractorFeedback?: string },
    ): Promise<SubcontractorAssignment> => {
      const rating = Math.round(Math.min(5, Math.max(1, toNum(dto?.contractorRating))));
      const feedback = (dto?.contractorFeedback || '').trim();
      const response = await apiClient.post(
        `/subcontractor-portal/assignments/${id}/rate-contractor`,
        { contractorRating: rating, ...(feedback ? { contractorFeedback: feedback } : {}) },
      );
      return normalizeAssignment(response.data);
    },

    // RECOURS / LITIGE : ouvre un ticket support (module support existant, non modifié).
    // Le ticket remonte dans l'inbox admin support. category DISPUTE ou PAYMENT_ISSUE.
    reportIssue: async (dto: {
      assignmentId: string;
      description: string;
      category?: 'DISPUTE' | 'PAYMENT_ISSUE' | 'MISSION_ISSUE';
      missionId?: string;
    }): Promise<{ id: string; ticketNumber?: string; [k: string]: any }> => {
      const response = await apiClient.post('/support/tickets', {
        subject: `Recours sous-traitance #${dto.assignmentId}`,
        description: dto.description,
        category: dto.category || 'DISPUTE',
        priority: 'HIGH',
        ...(dto.missionId ? { missionId: dto.missionId } : {}),
      });
      return response.data;
    },

    // CONTACT IN-APP : envoie un message au donneur d'ordre via le chat existant
    // (module chat non modifié). `contractorUserId` = contractor.id de l'attribution.
    contactContractor: async (dto: {
      contractorUserId: string;
      content: string;
      missionId?: string;
    }): Promise<{ id: string; [k: string]: any }> => {
      const response = await apiClient.post(
        `/chat/conversation/${dto.contractorUserId}/message`,
        { content: dto.content, ...(dto.missionId ? { missionId: dto.missionId } : {}) },
      );
      return response.data;
    },

    // Résumé des gains (aplati depuis `summary` + `assignments`).
    getEarnings: async (): Promise<SubcontractorEarnings> => {
      const response = await apiClient.get('/subcontractor-portal/earnings');
      return normalizeEarnings(response.data);
    },

    // --- Disponibilité & relations (self-service) ------------------------

    // Lister ses donneurs d'ordre (relations ACTIVE/INACTIVE).
    listRelationships: async (): Promise<PortalRelationship[]> => {
      const response = await apiClient.get('/subcontractor-portal/relationships');
      const list = Array.isArray(response.data) ? response.data : [];
      return list.map(normalizeRelationship);
    },

    // Basculer sa disponibilité (true = reçoit des offres, false = en pause).
    // Sans `subcontractorId`, s'applique à TOUTES les relations ACTIVE/INACTIVE.
    setAvailability: async (dto: {
      active: boolean;
      subcontractorId?: string;
    }): Promise<SetAvailabilityResult> => {
      const response = await apiClient.post('/subcontractor-portal/availability', {
        active: !!dto.active,
        ...(dto.subcontractorId ? { subcontractorId: dto.subcontractorId } : {}),
      });
      return response.data;
    },

    // Quitter définitivement une relation (status -> TERMINATED). Idempotent côté back.
    leaveRelationship: async (dto: {
      subcontractorId: string;
    }): Promise<LeaveRelationshipResult> => {
      const response = await apiClient.post('/subcontractor-portal/leave', {
        subcontractorId: dto.subcontractorId,
      });
      return response.data;
    },
  },

  // --- Gestion des sous-traitants (donneur d'ordre) ----------------------
  manage: {
    // Lister ses sous-traitants.
    listSubcontractors: async (): Promise<Subcontractor[]> => {
      const response = await apiClient.get('/subcontractors');
      return response.data;
    },

    // Inviter un nouveau sous-traitant (par email).
    invite: async (dto: InviteSubcontractorDto): Promise<Subcontractor> => {
      const response = await apiClient.post('/subcontractors', dto);
      return response.data;
    },

    // Détail d'un sous-traitant.
    getSubcontractor: async (id: string): Promise<Subcontractor> => {
      const response = await apiClient.get(`/subcontractors/${id}`);
      return response.data;
    },

    // Accepter une invitation via token (côté invité).
    acceptInvitation: async (token: string): Promise<Subcontractor> => {
      const response = await apiClient.post(
        `/subcontractors/accept-invitation/${token}`,
      );
      return response.data;
    },

    // Créer une mission de sous-traitance.
    createAssignment: async (
      dto: CreateSubcontractorAssignmentDto,
    ): Promise<SubcontractorAssignment> => {
      const response = await apiClient.post('/subcontractors/assignments', dto);
      return response.data;
    },

    // Lister les missions de sous-traitance (côté donneur d'ordre).
    listAssignments: async (): Promise<SubcontractorAssignment[]> => {
      const response = await apiClient.get('/subcontractors/assignments');
      return response.data;
    },

    // Mettre à jour une mission de sous-traitance.
    updateAssignment: async (
      id: string,
      dto: UpdateSubcontractorAssignmentDto,
    ): Promise<SubcontractorAssignment> => {
      const response = await apiClient.put(`/subcontractors/assignments/${id}`, dto);
      return response.data;
    },

    // Supprimer une mission de sous-traitance.
    removeAssignment: async (id: string): Promise<{ message: string }> => {
      const response = await apiClient.delete(`/subcontractors/assignments/${id}`);
      return response.data;
    },
  },
};

export default subcontractorApi;
