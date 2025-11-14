import { Mission, Payment, NoShowEvent, User, ArtisanProfile } from '@prisma/client';

/**
 * Mission with related entities for payment operations
 */
export type MissionWithRelations = Mission & {
  client: User;
  artisan: User & {
    artisanProfile: ArtisanProfile | null;
  };
  transaction?: {
    id: string;
    stripePaymentIntentId: string | null;
    status: string;
    artisanAmount: number;
  } | null;
};

/**
 * Payment with related mission
 */
export type PaymentWithMission = Payment & {
  mission?: Mission;
};

/**
 * No-show event with related mission
 */
export type NoShowEventWithMission = NoShowEvent & {
  mission: Mission & {
    client: User;
    artisan: User;
  };
};
