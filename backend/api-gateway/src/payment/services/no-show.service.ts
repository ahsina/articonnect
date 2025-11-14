import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReputationService } from './reputation.service';
import { StripeService } from './stripe.service';
import { MissionType, NoShowStatus } from '@prisma/client';

/**
 * ================================================================
 * NO-SHOW SERVICE
 * ================================================================
 *
 * Gère les incidents où le client n'est pas présent/joignable
 * lors du déplacement de l'artisan.
 *
 * Processus de validation:
 * 1. Artisan signale un no-show avec preuves
 * 2. Validation automatique si preuves complètes:
 *    - Attente minimum 15 minutes
 *    - 2+ tentatives de contact
 *    - Photos de localisation
 *    - GPS vérifié (distance < 100m)
 * 3. Sinon → Review manuelle par admin
 * 4. Si validé → Client pénalisé, artisan compensé
 *
 * Frais no-show:
 * - Urgence: 50€
 * - Planifié: 30€
 * ================================================================
 */

export interface ReportNoShowDto {
  missionId: string;
  arrivalTime: Date;
  waitDurationMinutes: number;
  contactAttempts: ContactAttempt[];
  proofPhotos: string[]; // S3 URLs
  gpsCoords: {
    latitude: number;
    longitude: number;
    accuracy: number; // meters
  };
}

export interface ContactAttempt {
  timestamp: Date;
  method: 'PHONE_CALL' | 'SMS' | 'APP_MESSAGE';
  success: boolean;
  notes?: string;
}

@Injectable()
export class NoShowService {
  constructor(
    private prisma: PrismaService,
    private reputationService: ReputationService,
    private stripeService: StripeService,
  ) {}

  /**
   * L'artisan signale un no-show avec preuves
   */
  async reportNoShow(
    artisanId: string,
    data: ReportNoShowDto,
  ): Promise<{
    noShowEvent: any;
    autoValidated: boolean;
    message: string;
  }> {
    // Vérifier que la mission existe et appartient à cet artisan
    const mission = await this.prisma.mission.findUnique({
      where: { id: data.missionId },
      include: {
        client: true,
      },
    });

    if (!mission) {
      throw new BadRequestException('Mission introuvable');
    }

    if (mission.artisanId !== artisanId) {
      throw new BadRequestException('Cette mission ne vous appartient pas');
    }

    // Vérifier que la mission est dans un état approprié
    if (!['DEPOSIT_PAID', 'IN_TRANSIT', 'PAID'].includes(mission.status)) {
      throw new BadRequestException(
        'La mission doit être en cours pour signaler un no-show',
      );
    }

    // Valider les preuves minimales
    this.validateNoShowProofs(data, mission);

    // Calculer les frais de no-show
    const feeAmount = this.calculateNoShowFee(mission.type);

    // Créer l'événement no-show
    const noShowEvent = await this.prisma.noShowEvent.create({
      data: {
        missionId: data.missionId,
        artisanId,
        arrivalTime: data.arrivalTime,
        waitDurationMinutes: data.waitDurationMinutes,
        contactAttempts: data.contactAttempts as any,
        proofPhotos: data.proofPhotos,
        gpsCoords: data.gpsCoords as any,
        feeAmount,
        status: 'REPORTED',
      },
    });

    // Vérifier si validation automatique possible
    const canAutoValidate = this.canAutoValidate(data, mission);

    if (canAutoValidate) {
      // Auto-validation
      return this.validateNoShow(noShowEvent.id, 'AUTO');
    } else {
      // Envoi en review admin
      await this.prisma.noShowEvent.update({
        where: { id: noShowEvent.id },
        data: { status: 'PENDING_REVIEW' },
      });

      // TODO: Notifier les admins pour review

      return {
        noShowEvent,
        autoValidated: false,
        message: 'No-show signalé - En attente de validation admin',
      };
    }
  }

  /**
   * Valide un no-show (auto ou admin)
   */
  async validateNoShow(
    noShowEventId: string,
    validatedBy: 'AUTO' | string, // 'AUTO' or admin userId
  ): Promise<{
    noShowEvent: any;
    autoValidated: boolean;
    message: string;
  }> {
    const noShowEvent = await this.prisma.noShowEvent.findUnique({
      where: { id: noShowEventId },
      include: {
        mission: {
          include: {
            client: true,
            artisan: {
              include: {
                artisanProfile: true,
              },
            },
          },
        },
      },
    });

    if (!noShowEvent) {
      throw new BadRequestException('No-show event introuvable');
    }

    // Update no-show status
    const updated = await this.prisma.noShowEvent.update({
      where: { id: noShowEventId },
      data: {
        status: 'VALIDATED',
        validatedAt: new Date(),
        reviewedBy: validatedBy === 'AUTO' ? null : validatedBy,
        reviewNotes:
          validatedBy === 'AUTO' ? 'Validation automatique' : undefined,
      },
    });

    // Appliquer les pénalités et compensations
    await this.applyNoShowConsequences(noShowEvent);

    return {
      noShowEvent: updated,
      autoValidated: validatedBy === 'AUTO',
      message: 'No-show validé - Client pénalisé, artisan compensé',
    };
  }

  /**
   * Rejette un no-show (admin seulement)
   */
  async rejectNoShow(
    noShowEventId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.noShowEvent.update({
      where: { id: noShowEventId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewNotes: reason,
      },
    });

    // TODO: Notifier l'artisan du rejet
  }

  /**
   * Applique les conséquences d'un no-show validé
   * Uses atomic transaction to ensure data consistency
   */
  private async applyNoShowConsequences(noShowEvent: any): Promise<void> {
    const { mission } = noShowEvent;

    // Atomic transaction for all database operations
    await this.prisma.$transaction(async (tx) => {
      // 1. Pénaliser le client (inline to include in transaction)
      const user = await tx.user.findUnique({
        where: { id: mission.clientId },
      });

      if (user) {
        // Apply no-show penalty
        const previousScore = user.reputationScore;
        const newScore = Math.max(0, Math.min(200, previousScore - 10));

        await tx.user.update({
          where: { id: mission.clientId },
          data: {
            reputationScore: newScore,
            noShowCount: { increment: 1 },
          },
        });

        await tx.reputationHistory.create({
          data: {
            userId: mission.clientId,
            action: 'NO_SHOW',
            pointsChange: -10,
            previousScore,
            newScore,
            reason: 'No-show confirmé par admin',
            relatedMissionId: mission.id,
          },
        });
      }

      // 2. Créer un paiement de compensation pour l'artisan
      await tx.payment.create({
        data: {
          missionId: mission.id,
          userId: mission.clientId, // Le client est débité
          type: 'COMPENSATION',
          amount: noShowEvent.feeAmount,
          refundReason: 'CLIENT_NO_SHOW',
          artisanCompensated: true,
          compensationAmount: noShowEvent.feeAmount,
          platformAbsorbedCost: false, // Le client paie directement
        },
      });

      // 3. Logger la compensation
      await tx.compensationLog.create({
        data: {
          userId: mission.artisanId,
          missionId: mission.id,
          reason: 'CLIENT_NO_SHOW',
          amount: noShowEvent.feeAmount,
          clientRefunded: false,
          totalCost: noShowEvent.feeAmount,
          notes: `No-show frais: ${noShowEvent.feeAmount}€`,
        },
      });

      // 4. Marquer le no-show comme compensé
      await tx.noShowEvent.update({
        where: { id: noShowEvent.id },
        data: {
          status: 'COMPENSATED',
          compensationPaid: true,
          compensationPaidAt: new Date(),
        },
      });

      // 5. Annuler la mission
      await tx.mission.update({
        where: { id: mission.id },
        data: {
          status: 'CANCELLED_NO_SHOW',
          cancelledAt: new Date(),
        },
      });
    });

    // 6. Transférer les frais de no-show à l'artisan via Stripe (outside transaction)
    // If this fails, compensation is still recorded in DB
    await this.transferToArtisan(mission.artisanId, noShowEvent.feeAmount, {
      missionId: mission.id,
      type: 'NO_SHOW_COMPENSATION',
      reason: 'Client no-show - artisan compensation',
    });
  }

  /**
   * Valide que les preuves minimales sont fournies
   */
  private validateNoShowProofs(
    data: ReportNoShowDto,
    mission: any,
  ): void {
    // 1. Vérifier l'attente minimum (15 minutes)
    if (data.waitDurationMinutes < 15) {
      throw new BadRequestException(
        'Attente minimum de 15 minutes requise avant de signaler un no-show',
      );
    }

    // 2. Vérifier les tentatives de contact (minimum 2)
    if (data.contactAttempts.length < 2) {
      throw new BadRequestException(
        'Minimum 2 tentatives de contact requises',
      );
    }

    // 3. Vérifier les photos de preuve
    if (data.proofPhotos.length === 0) {
      throw new BadRequestException('Au moins une photo de preuve requise');
    }

    // 4. Vérifier les coordonnées GPS
    if (!data.gpsCoords || !data.gpsCoords.latitude || !data.gpsCoords.longitude) {
      throw new BadRequestException('Coordonnées GPS requises');
    }

    // 5. Vérifier que les coordonnées GPS correspondent à l'adresse de la mission
    const distance = this.calculateDistance(
      data.gpsCoords.latitude,
      data.gpsCoords.longitude,
      mission.latitude,
      mission.longitude,
    );

    // Distance max: 100 mètres
    if (distance > 100) {
      throw new BadRequestException(
        'Position GPS trop éloignée de l\'adresse de la mission (max 100m)',
      );
    }
  }

  /**
   * Détermine si le no-show peut être auto-validé
   */
  private canAutoValidate(data: ReportNoShowDto, mission: any): boolean {
    // Critères d'auto-validation:
    // 1. Attente >= 20 minutes (plus que le minimum)
    if (data.waitDurationMinutes < 20) return false;

    // 2. Au moins 3 tentatives de contact
    if (data.contactAttempts.length < 3) return false;

    // 3. Au moins 2 photos
    if (data.proofPhotos.length < 2) return false;

    // 4. GPS précis (accuracy < 20m)
    if (data.gpsCoords.accuracy > 20) return false;

    // 5. Distance au point de mission < 50m
    const distance = this.calculateDistance(
      data.gpsCoords.latitude,
      data.gpsCoords.longitude,
      mission.latitude,
      mission.longitude,
    );
    if (distance > 50) return false;

    // Toutes les conditions sont remplies
    return true;
  }

  /**
   * Calcule les frais de no-show selon le type de mission
   */
  private calculateNoShowFee(missionType: MissionType): number {
    switch (missionType) {
      case 'EMERGENCY':
        return 50; // 50€ pour urgence
      case 'SCHEDULED':
      case 'QUOTE':
        return 30; // 30€ pour planifié/devis
      default:
        return 30;
    }
  }

  /**
   * Calcule la distance entre deux points GPS (en mètres)
   * Formule Haversine
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  /**
   * Récupère tous les no-shows d'une mission
   */
  async getNoShowsByMission(missionId: string) {
    return this.prisma.noShowEvent.findMany({
      where: { missionId },
      include: {
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Récupère les no-shows en attente de review (pour admins)
   */
  async getPendingNoShows() {
    return this.prisma.noShowEvent.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: {
        mission: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                reputationScore: true,
              },
            },
            artisan: {
              select: {
                firstName: true,
                lastName: true,
                artisanProfile: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Transfère de l'argent à un artisan via Stripe Connect
   * @param artisanId - ID de l'artisan
   * @param amount - Montant en euros (sera converti en centimes)
   * @param metadata - Métadonnées pour le transfert
   */
  private async transferToArtisan(
    artisanId: string,
    amount: number,
    metadata?: Record<string, string>,
  ): Promise<void> {
    // 1. Récupérer le profil artisan avec stripeAccountId
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: { artisanProfile: true },
    });

    if (!artisan?.artisanProfile) {
      throw new BadRequestException('Profil artisan introuvable');
    }

    const { stripeAccountId, stripeOnboarded } = artisan.artisanProfile;

    // 2. Vérifier que l'artisan a un compte Stripe Connect
    if (!stripeAccountId) {
      // Log warning but don't fail - artisan needs to complete onboarding
      console.warn(
        `[TRANSFER WARNING] Artisan ${artisanId} has no Stripe account. Transfer skipped.`,
      );
      return;
    }

    if (!stripeOnboarded) {
      console.warn(
        `[TRANSFER WARNING] Artisan ${artisanId} Stripe account not onboarded. Transfer skipped.`,
      );
      return;
    }

    // 3. Créer le transfert Stripe (convertir en centimes)
    const transferAmount = Math.floor(amount * 100);

    try {
      const transfer = await this.stripeService.createTransfer({
        amount: transferAmount,
        destination: stripeAccountId,
        metadata: metadata || {},
      });

      console.log(
        `[TRANSFER SUCCESS] ${amount}€ transferred to artisan ${artisanId} (Stripe Transfer: ${transfer.id})`,
      );
    } catch (error) {
      console.error(
        `[TRANSFER ERROR] Failed to transfer ${amount}€ to artisan ${artisanId}:`,
        error.message,
      );
      throw new BadRequestException(
        `Échec du transfert vers l'artisan: ${error.message}`,
      );
    }
  }
}
