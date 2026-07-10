import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  MissionType,
  ReputationAction,
  User,
} from '@prisma/client';
import { PlatformConfigService } from '../../config/services/platform-config.service';

/**
 * ================================================================
 * REPUTATION SERVICE
 * ================================================================
 *
 * Gère le système de réputation et détermine le modèle de paiement
 * basé sur le score de réputation du client.
 *
 * All thresholds and point values are now configurable via PlatformConfigService
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
  constructor(
    private prisma: PrismaService,
    private platformConfig: PlatformConfigService,
  ) {}

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

    // Get configurable thresholds
    const reputationRules = await this.platformConfig.getReputationRules();
    const feeSettings = await this.platformConfig.getFeeSettings();

    const warningThreshold = reputationRules.warningThreshold; // default 50
    const trustedThreshold = reputationRules.trustedThreshold; // default 100
    const streakThreshold = reputationRules.streakThreshold; // default 5 (using for VIP missions count)
    const depositPercentage = feeSettings.depositPercentage; // default 30

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

    // Règle 3: Score très bas (<warningThreshold) → 100% avant
    if (score < warningThreshold) {
      return {
        depositPercentage: 100,
        depositRequired: true,
        reason: 'Nouveau client ou score de réputation faible',
        clientRiskLevel: 'HIGH',
      };
    }

    // Règle 4: Urgence nécessite minimum 50% pour tous
    if (missionType === 'EMERGENCY') {
      if (score > trustedThreshold && completedMissions >= streakThreshold * 2) {
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

    // Règle 5: Client VIP (score > trustedThreshold + missions) → reduced deposit
    if (score > trustedThreshold && completedMissions >= streakThreshold * 2) {
      return {
        depositPercentage: depositPercentage,
        depositRequired: true,
        reason: 'Client VIP - Acompte réduit',
        clientRiskLevel: 'LOW',
      };
    }

    // Règle 6: Client établi → 50% acompte standard
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

    // Get configurable score limits
    const reputationRules = await this.platformConfig.getReputationRules();
    const minScore = reputationRules.minScore; // default 0
    const maxScore = reputationRules.maxScore; // default 200

    const previousScore = user.reputationScore;
    const newScore = Math.max(minScore, Math.min(maxScore, previousScore + pointsChange));

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
    const reputationRules = await this.platformConfig.getReputationRules();
    // La pénalité doit TOUJOURS soustraire, quel que soit le signe stocké en config
    // (la prod stocke `noShowPenalty: 20` en magnitude positive).
    const penalty = -Math.abs(reputationRules.noShowPenalty ?? -10);

    return this.addReputationPoints(
      userId,
      ReputationAction.NO_SHOW,
      penalty,
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
    const reputationRules = await this.platformConfig.getReputationRules();
    const bonus = reputationRules.completedMissionBonus ?? 10;

    await this.incrementCompletedMissions(userId);
    return this.addReputationPoints(
      userId,
      ReputationAction.MISSION_COMPLETED,
      bonus,
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
    const reputationRules = await this.platformConfig.getReputationRules();
    // La config stocke la pénalité en magnitude POSITIVE (comme noShowPenalty).
    // On force le SIGNE NÉGATIF : annuler après appariement DOIT baisser la réputation,
    // jamais la récompenser (sinon match-annule-illimité devient un bonus → désintermédiation).
    const penalty = -Math.abs(reputationRules.cancellationPenalty ?? -5);

    return this.addReputationPoints(
      userId,
      ReputationAction.MISSION_CANCELLED,
      penalty,
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
    const reputationRules = await this.platformConfig.getReputationRules();
    const excellentReviewBonus = Math.abs(reputationRules.fiveStarReviewBonus ?? 15);
    const poorReviewPenalty = -Math.abs(reputationRules.oneStarReviewPenalty ?? -10);

    if (rating >= 5) {
      // Excellent review
      return this.addReputationPoints(
        userId,
        ReputationAction.EXCELLENT_REVIEW,
        excellentReviewBonus,
        'Avis 5 étoiles',
        missionId,
      );
    } else if (rating <= 2) {
      // Poor review
      return this.addReputationPoints(
        userId,
        ReputationAction.POOR_REVIEW,
        poorReviewPenalty,
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
    const reputationRules = await this.platformConfig.getReputationRules();
    const penalty = reputationRules.disputeLossPenalty ?? -20;

    await this.incrementDisputeCount(userId);
    return this.addReputationPoints(
      userId,
      ReputationAction.DISPUTE_LOST,
      penalty,
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
    const reputationRules = await this.platformConfig.getReputationRules();
    const bonus = reputationRules.disputeWinBonus ?? 5;

    return this.addReputationPoints(
      userId,
      ReputationAction.DISPUTE_WON,
      bonus,
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

    // Get configurable thresholds
    const reputationRules = await this.platformConfig.getReputationRules();
    const lowRiskThreshold = reputationRules.silverThreshold ?? 120; // Silver status = low risk
    const highRiskThreshold = reputationRules.warningThreshold ?? 80; // Warning threshold = high risk
    const vipThreshold = reputationRules.trustedThreshold ?? 100;
    const vipMinMissions = 10; // Could be added to config if needed

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (user.reputationScore > lowRiskThreshold && user.noShowCount === 0) {
      riskLevel = 'LOW';
    } else if (
      user.reputationScore < highRiskThreshold ||
      user.noShowCount > 0 ||
      Number(user.disputeRate) > 5
    ) {
      riskLevel = 'HIGH';
    }

    return {
      ...user,
      riskLevel,
      vipStatus: user.reputationScore > vipThreshold && user.completedMissions >= vipMinMissions,
    };
  }
}
