export type MissionStatus =
  | 'PENDING'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MissionType = 'URGENT' | 'SCHEDULED';

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
