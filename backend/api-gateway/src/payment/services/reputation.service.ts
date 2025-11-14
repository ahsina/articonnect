import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  MissionType,
  ReputationAction,
  User,
  Mission,
} from '@prisma/client';

/**
 * ================================================================
 * REPUTATION SERVICE
 * ================================================================
 *
 * Gère le système de réputation et détermine le modèle de paiement
 * basé sur le score de réputation du client.
 *
 * Règles de réputation:
 * - Score initial: 100 (neutre)
 * - Plage: 0-200
 * - Mission réussie: +10 points
 * - Excellent review (5*): +15 points
 * - No-show: -10 points
 * - Litige perdu: -20 points
 * - Avis négatif (1-2*): -10 points
 *
 * Modèle de paiement hybride:
 * - Score < 50 (nouveau/mauvais): 100% avant déplacement
 * - Score 50-100 (établi): 50% acompte
 * - Score > 100 (VIP, 10+ missions): 30% acompte
 * - Urgence: Minimum 50% pour tous
 * ================================================================
 */

export interface PaymentModel {
  depositPercentage: number; // 30, 50, or 100
  depositRequired: boolean;
  reason: string;
  clientRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Détermine le modèle de paiement requis pour une mission
   * basé sur la réputation du client et le type de mission
   */
  async determinePaymentModel(
    client: User,
    missionType: MissionType,
  ): Promise<PaymentModel> {
    const score = client.reputationScore;
    const completedMissions = client.completedMissions;
    const noShowCount = client.noShowCount;
    const disputeRate = Number(client.disputeRate);

    // Règle 1: Client avec no-show récent → 100% avant
    if (noShowCount > 0) {
      return {
        depositPercentage: 100,
        depositRequired: true,
        reason: 'Client avec historique de no-show',
        clientRiskLevel: 'HIGH',
      };
    }

    // Règle 2: Client avec taux de litige élevé (>10%) → 100% avant
    if (disputeRate > 10) {
      return {
        depositPercentage: 100,
        depositRequired: true,
        reason: 'Taux de litiges élevé',
        clientRiskLevel: 'HIGH',
      };
    }

    // Règle 3: Score très bas (<50) → 100% avant
    if (score < 50) {
      return {
        depositPercentage: 100,
        depositRequired: true,
        reason: 'Nouveau client ou score de réputation faible',
        clientRiskLevel: 'HIGH',
      };
    }

    // Règle 4: Urgence nécessite minimum 50% pour tous
    if (missionType === 'EMERGENCY') {
      if (score > 100 && completedMissions >= 10) {
        // VIP peut payer 50% seulement même en urgence
        return {
          depositPercentage: 50,
          depositRequired: true,
          reason: 'Urgence - Client VIP',
          clientRiskLevel: 'LOW',
        };
      } else {
        // Autres clients paient 100% pour urgence
        return {
          depositPercentage: 100,
          depositRequired: true,
          reason: 'Urgence - Paiement complet requis',
          clientRiskLevel: 'MEDIUM',
        };
      }
    }

    // Règle 5: Client VIP (score >100 + 10 missions) → 30% acompte
    if (score > 100 && completedMissions >= 10) {
      return {
        depositPercentage: 30,
        depositRequired: true,
        reason: 'Client VIP - Acompte réduit',
        clientRiskLevel: 'LOW',
      };
    }

    // Règle 6: Client établi (score 50-100) → 50% acompte
    return {
      depositPercentage: 50,
      depositRequired: true,
      reason: 'Client établi - Acompte standard',
      clientRiskLevel: 'MEDIUM',
    };
  }

  /**
   * Calcule le montant de l'acompte requis
   */
  calculateDepositAmount(totalAmount: number, depositPercentage: number): number {
    return Math.round((totalAmount * depositPercentage) / 100);
  }

  /**
   * Ajoute des points de réputation à un utilisateur
   */
  async addReputationPoints(
    userId: string,
    action: ReputationAction,
    pointsChange: number,
    reason?: string,
    relatedMissionId?: string,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const previousScore = user.reputationScore;
    const newScore = Math.max(0, Math.min(200, previousScore + pointsChange)); // Clamp 0-200

    // Update user reputation
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        reputationScore: newScore,
      },
    });

    // Create history entry
    await this.prisma.reputationHistory.create({
      data: {
        userId,
        action,
        pointsChange,
        previousScore,
        newScore,
        reason,
        relatedMissionId,
      },
    });

    return updatedUser;
  }

  /**
   * Incrémente le compteur de missions complétées
   */
  async incrementCompletedMissions(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        completedMissions: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Incrémente le compteur de no-shows
   */
  async incrementNoShowCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        noShowCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Incrémente le compteur de litiges et recalcule le taux
   */
  async incrementDisputeCount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const newDisputeCount = user.disputeCount + 1;
    const totalMissions = user.completedMissions;
    const newDisputeRate =
      totalMissions > 0 ? (newDisputeCount / totalMissions) * 100 : 0;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        disputeCount: newDisputeCount,
        disputeRate: newDisputeRate,
      },
    });
  }

  /**
   * Applique la pénalité pour un no-show
   */
  async applyNoShowPenalty(userId: string, missionId: string): Promise<User> {
    return this.addReputationPoints(
      userId,
      ReputationAction.NO_SHOW,
      -10,
      'No-show confirmé par admin',
      missionId,
    );
  }

  /**
   * Applique la récompense pour une mission réussie
   */
  async applyMissionCompletedReward(
    userId: string,
    missionId: string,
  ): Promise<User> {
    await this.incrementCompletedMissions(userId);
    return this.addReputationPoints(
      userId,
      ReputationAction.MISSION_COMPLETED,
      10,
      'Mission complétée avec succès',
      missionId,
    );
  }

  /**
   * Applique la pénalité pour une mission annulée
   */
  async applyMissionCancelledPenalty(
    userId: string,
    missionId: string,
  ): Promise<User> {
    return this.addReputationPoints(
      userId,
      ReputationAction.MISSION_CANCELLED,
      -5,
      'Mission annulée',
      missionId,
    );
  }

  /**
   * Applique la récompense/pénalité selon l'avis reçu
   */
  async applyReviewImpact(
    userId: string,
    rating: number,
    missionId: string,
  ): Promise<User> {
    if (rating >= 5) {
      // Excellent review
      return this.addReputationPoints(
        userId,
        ReputationAction.EXCELLENT_REVIEW,
        15,
        'Avis 5 étoiles',
        missionId,
      );
    } else if (rating <= 2) {
      // Poor review
      return this.addReputationPoints(
        userId,
        ReputationAction.POOR_REVIEW,
        -10,
        'Avis négatif (1-2 étoiles)',
        missionId,
      );
    }
    // 3-4 stars: no impact
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  /**
   * Applique la pénalité pour un litige perdu
   */
  async applyDisputeLostPenalty(
    userId: string,
    missionId: string,
  ): Promise<User> {
    await this.incrementDisputeCount(userId);
    return this.addReputationPoints(
      userId,
      ReputationAction.DISPUTE_LOST,
      -20,
      'Litige perdu',
      missionId,
    );
  }

  /**
   * Applique la récompense pour un litige gagné
   */
  async applyDisputeWonReward(
    userId: string,
    missionId: string,
  ): Promise<User> {
    return this.addReputationPoints(
      userId,
      ReputationAction.DISPUTE_WON,
      5,
      'Litige gagné',
      missionId,
    );
  }

  /**
   * Récupère l'historique de réputation d'un utilisateur
   */
  async getReputationHistory(userId: string, limit = 50) {
    return this.prisma.reputationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtient un résumé de la réputation d'un utilisateur
   */
  async getReputationSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        reputationScore: true,
        completedMissions: true,
        noShowCount: true,
        disputeCount: true,
        disputeRate: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (user.reputationScore > 120 && user.noShowCount === 0) {
      riskLevel = 'LOW';
    } else if (
      user.reputationScore < 80 ||
      user.noShowCount > 0 ||
      Number(user.disputeRate) > 5
    ) {
      riskLevel = 'HIGH';
    }

    return {
      ...user,
      riskLevel,
      vipStatus: user.reputationScore > 100 && user.completedMissions >= 10,
    };
  }
}
