import apiClient from './client';

// ---------------------------------------------------------------------------
// Types — shapes tolérants (le back reste la source de vérité).
// ---------------------------------------------------------------------------

export type SubcontractorOfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | string;

export type SubcontractorAssignmentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export type SubcontractorStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING_INVITATION'
  | string;

/** Offre reçue par l'artisan qui EXÉCUTE (portail sous-traitant). */
export interface SubcontractorOffer {
  id: string;
  status?: SubcontractorOfferStatus;
  missionId?: string;
  mission?: {
    id?: string;
    title?: string;
    description?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    scheduledAt?: string;
    [key: string]: any;
  };
  amount?: number;
  currency?: string;
  message?: string;
  contractorId?: string;
  contractor?: {
    id?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
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
  progress?: number;
  subcontractorId?: string;
  subcontractor?: Subcontractor;
  missionId?: string;
  mission?: {
    id?: string;
    title?: string;
    description?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    scheduledAt?: string;
    [key: string]: any;
  };
  amount?: number;
  currency?: string;
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

/** Tableau de bord du portail sous-traitant. */
export interface PortalDashboard {
  pendingOffers?: number;
  activeAssignments?: number;
  completedAssignments?: number;
  totalEarnings?: number;
  pendingEarnings?: number;
  averageRating?: number;
  recentOffers?: SubcontractorOffer[];
  recentAssignments?: SubcontractorAssignment[];
  [key: string]: any;
}

/** Résumé des gains du portail sous-traitant. */
export interface SubcontractorEarnings {
  totalEarnings?: number;
  paidEarnings?: number;
  pendingEarnings?: number;
  currency?: string;
  items?: Array<{
    id?: string;
    assignmentId?: string;
    amount?: number;
    status?: string;
    createdAt?: string;
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
// Client API sous-traitance.
//   - portal : l'artisan qui EXÉCUTE (voit offres, missions, gains).
//   - manage : l'artisan DONNEUR d'ordre (invite, assigne, suit).
// ---------------------------------------------------------------------------

export const subcontractorApi = {
  // --- Portail sous-traitant (exécutant) ---------------------------------
  portal: {
    // Tableau de bord agrégé du portail.
    getDashboard: async (): Promise<PortalDashboard> => {
      const response = await apiClient.get('/subcontractor-portal/dashboard');
      return response.data;
    },

    // Offres reçues (en attente / historique).
    getOffers: async (): Promise<SubcontractorOffer[]> => {
      const response = await apiClient.get('/subcontractor-portal/offers');
      return response.data;
    },

    // Accepter une offre.
    acceptOffer: async (id: string): Promise<SubcontractorOffer> => {
      const response = await apiClient.post(`/subcontractor-portal/offers/${id}/accept`);
      return response.data;
    },

    // Refuser une offre.
    declineOffer: async (id: string): Promise<SubcontractorOffer> => {
      const response = await apiClient.post(`/subcontractor-portal/offers/${id}/decline`);
      return response.data;
    },

    // Missions confiées à l'exécutant.
    getAssignments: async (): Promise<SubcontractorAssignment[]> => {
      const response = await apiClient.get('/subcontractor-portal/assignments');
      return response.data;
    },

    // Mettre à jour l'avancement d'une mission (progress optionnel).
    updateProgress: async (
      id: string,
      progress?: number,
    ): Promise<SubcontractorAssignment> => {
      const response = await apiClient.post(
        `/subcontractor-portal/assignments/${id}/progress`,
        { progress },
      );
      return response.data;
    },

    // Marquer une mission comme terminée.
    completeAssignment: async (id: string): Promise<SubcontractorAssignment> => {
      const response = await apiClient.post(
        `/subcontractor-portal/assignments/${id}/complete`,
      );
      return response.data;
    },

    // Résumé des gains.
    getEarnings: async (): Promise<SubcontractorEarnings> => {
      const response = await apiClient.get('/subcontractor-portal/earnings');
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
