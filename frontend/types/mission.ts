export type MissionStatus =
  | 'PENDING'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'PENDING_DEPOSIT'
  | 'DEPOSIT_PAID'
  | 'IN_TRANSIT'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'AUTO_VALIDATED'
  | 'CANCELLED'
  | 'CANCELLED_NO_SHOW'
  | 'DISPUTED';

export type MissionType = 'URGENT' | 'EMERGENCY' | 'SCHEDULED' | 'QUOTE';

// Statut dérivé d'une offre (Negotiation), exposé par l'API
export type OfferStatus = 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// Une offre (Negotiation) telle que renvoyée par l'API
export interface Offer {
  id: string;
  missionId: string;
  status: OfferStatus;
  proposedPrice: string | number;
  laborCost?: string | number | null;
  materialCost?: string | number | null;
  travelCost?: string | number | null;
  availability?: string | null;
  estimatedDuration?: string | null;
  message?: string | null;
  senderId?: string;
  receiverId?: string;
  accepted?: boolean | null;
  rejectedReason?: string | null;
  expiresAt?: string | null;
  viewedAt?: string | null;
  createdAt: string;
  // enrichissements
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
    artisanProfile?: {
      companyName?: string;
      rating?: number;
      reviewCount?: number;
      businessVerified?: boolean;
    };
  };
  mission?: { id: string; title: string; category: string; city: string; status: MissionStatus };
  clientName?: string;
}

// Réponse de GET /missions/negotiations/mine
export interface MyOffersResponse {
  offers: Offer[];
  stats: {
    total: number;
    counts: Partial<Record<OfferStatus, number>>;
    conversionRate: number;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'CLIENT' | 'ARTISAN' | 'ADMIN';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  type: MissionType;
  status: MissionStatus;
  city: string;
  address?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  agreedPrice?: number;
  startDate?: string;
  endDate?: string;
  clientId: string;
  artisanId?: string;
  client?: User;
  artisan?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMissionDto {
  title: string;
  description: string;
  category: string;
  type: MissionType;
  city: string;
  address?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  startDate?: string;
}

export interface UpdateMissionStatusDto {
  status: MissionStatus;
  agreedPrice?: number;
}
