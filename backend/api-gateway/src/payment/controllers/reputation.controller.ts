import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReputationService } from '../services/reputation.service';

// Import DTOs - we'll define them inline for now since user module doesn't exist
import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour ajuster manuellement la réputation (admin)
 */
export class AdjustReputationDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur',
    example: 'uuid-user-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Changement de points (positif ou négatif)',
    example: -10,
  })
  @IsNumber()
  pointsChange: number;

  @ApiProperty({
    description: 'Raison de l\'ajustement',
    example: 'Remboursement de bonne volonté suite à incident technique',
  })
  @IsString()
  reason: string;
}

@ApiTags('Reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  /**
   * Obtenir le résumé de réputation d'un utilisateur
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Résumé de réputation',
    description: 'Récupère le résumé de réputation d\'un utilisateur (score, stats, niveau de risque)',
  })
  @ApiResponse({
    status: 200,
    description: 'Résumé de réputation',
    schema: {
      example: {
        reputationScore: 115,
        completedMissions: 15,
        noShowCount: 0,
        disputeCount: 1,
        disputeRate: 6.67,
        riskLevel: 'LOW',
        vipStatus: true,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async getReputationSummary(@Param('userId') userId: string) {
    return this.reputationService.getReputationSummary(userId);
  }

  /**
   * Obtenir l'historique de réputation d'un utilisateur
   */
  @Get('user/:userId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historique de réputation',
    description: 'Récupère l\'historique complet des changements de réputation',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum d\'entrées à retourner',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Historique de réputation',
    schema: {
      example: {
        history: [
          {
            id: 'uuid-history-1',
            action: 'MISSION_COMPLETED',
            pointsChange: 10,
            previousScore: 105,
            newScore: 115,
            reason: 'Mission complétée avec succès',
            relatedMissionId: 'uuid-mission-123',
            createdAt: '2025-11-08T14:30:00Z',
          },
        ],
        total: 23,
      },
    },
  })
  async getReputationHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const history = await this.reputationService.getReputationHistory(
      userId,
      limit ? Number(limit) : 50,
    );

    return {
      history,
      total: history.length,
    };
  }

  /**
   * Ajuster manuellement la réputation (admin)
   */
  @Post('adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ajuster la réputation',
    description: 'Ajuste manuellement la réputation d\'un utilisateur (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Réputation ajustée avec succès',
  })
  @ApiResponse({ status: 403, description: 'Réservé aux admins' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async adjustReputation(@Body() dto: AdjustReputationDto) {
    return this.reputationService.addReputationPoints(
      dto.userId,
      'ADMIN_ADJUSTMENT' as any,
      dto.pointsChange,
      dto.reason,
    );
  }

  /**
   * Obtenir mon propre résumé de réputation
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ma réputation',
    description: 'Récupère le résumé de réputation de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Résumé de réputation',
  })
  async getMyReputation(@Request() req) {
    return this.reputationService.getReputationSummary(req.user.userId);
  }

  /**
   * Obtenir mon historique de réputation
   */
  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mon historique de réputation',
    description: 'Récupère l\'historique complet de mes changements de réputation',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum d\'entrées à retourner',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Historique de réputation',
  })
  async getMyReputationHistory(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    const history = await this.reputationService.getReputationHistory(
      req.user.userId,
      limit ? Number(limit) : 50,
    );

    return {
      history,
      total: history.length,
    };
  }
}
