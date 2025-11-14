import { Mission, Payment, NoShowEvent, User, ArtisanProfile, Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

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
    artisanAmount: Decimal;
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
