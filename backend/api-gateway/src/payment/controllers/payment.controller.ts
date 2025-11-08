import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentService } from '../services/payment.service';
import { NoShowService } from '../services/no-show.service';
import {
  CreateDepositPaymentDto,
  RequestRefundDto,
  PaymentIntentResponseDto,
  RefundResponseDto,
} from '../dto/payment.dto';
import {
  ReportNoShowDto,
  ValidateNoShowDto,
  RejectNoShowDto,
  NoShowResponseDto,
} from '../dto/no-show.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly noShowService: NoShowService,
  ) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPaymentIntent(
    @Request() req,
    @Body() body: { missionId: string },
  ) {
    return this.paymentService.createPaymentIntent(body.missionId, req.user.userId);
  }

  @Post('capture/:missionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async captureMissionPayment(@Param('missionId') missionId: string) {
    return this.paymentService.captureMissionPayment(missionId);
  }

  @Post('refund/:missionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async refundMissionPayment(
    @Param('missionId') missionId: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentService.refundMissionPayment(missionId, body.reason);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: Record<string, unknown>) {
    // In production, verify webhook signature
    return this.paymentService.handleWebhook(body);
  }

  // ================================================================
  // HYBRID PAYMENT SYSTEM - NEW ENDPOINTS
  // ================================================================

  /**
   * Créer un paiement d'acompte basé sur la réputation du client
   */
  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer un paiement d\'acompte',
    description: 'Crée un Payment Intent Stripe pour l\'acompte requis selon la réputation du client',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment Intent créé avec succès',
    type: PaymentIntentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Acompte non requis ou prix non défini' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async createDepositPayment(
    @Request() req,
    @Body() dto: CreateDepositPaymentDto,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentService.createDepositPayment(dto.missionId, req.user.userId);
  }

  /**
   * Demander un remboursement avec logique de compensation intelligente
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Demander un remboursement',
    description: 'Traite le remboursement avec compensation intelligente selon la raison',
  })
  @ApiResponse({
    status: 200,
    description: 'Remboursement traité avec succès',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Aucun paiement à rembourser' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async requestRefund(
    @Request() req,
    @Body() dto: RequestRefundDto,
  ): Promise<RefundResponseDto> {
    return this.paymentService.processRefund(
      dto.missionId,
      dto.reason,
      dto.amount,
      req.user.userId,
    );
  }

  // ================================================================
  // NO-SHOW ENDPOINTS
  // ================================================================

  /**
   * Signaler un no-show (artisan)
   */
  @Post('no-show/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Signaler un no-show',
    description: 'L\'artisan signale que le client n\'est pas présent/joignable avec preuves',
  })
  @ApiResponse({
    status: 201,
    description: 'No-show signalé avec succès',
    type: NoShowResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Preuves insuffisantes (15min, 2 contacts, GPS, photos)' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 403, description: 'Réservé aux artisans' })
  async reportNoShow(
    @Request() req,
    @Body() dto: ReportNoShowDto,
  ): Promise<NoShowResponseDto> {
    return this.noShowService.reportNoShow(req.user.userId, dto);
  }

  /**
   * Obtenir les no-shows en attente de review (admin)
   */
  @Get('no-show/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Liste des no-shows en attente de validation',
    description: 'Récupère tous les no-shows nécessitant une review admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des no-shows en attente',
  })
  @ApiResponse({ status: 403, description: 'Réservé aux admins' })
  async getPendingNoShows() {
    return this.noShowService.getPendingNoShows();
  }

  /**
   * Valider un no-show (admin)
   */
  @Post('no-show/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Valider un no-show',
    description: 'Valide le no-show et applique les pénalités/compensations',
  })
  @ApiResponse({
    status: 200,
    description: 'No-show validé avec succès',
    type: NoShowResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No-show event introuvable' })
  @ApiResponse({ status: 403, description: 'Réservé aux admins' })
  async validateNoShow(
    @Request() req,
    @Body() dto: ValidateNoShowDto,
  ): Promise<NoShowResponseDto> {
    return this.noShowService.validateNoShow(dto.noShowEventId, req.user.userId);
  }

  /**
   * Rejeter un no-show (admin)
   */
  @Post('no-show/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rejeter un no-show',
    description: 'Rejette le no-show signalé par l\'artisan',
  })
  @ApiResponse({
    status: 200,
    description: 'No-show rejeté avec succès',
  })
  @ApiResponse({ status: 403, description: 'Réservé aux admins' })
  async rejectNoShow(
    @Request() req,
    @Body() dto: RejectNoShowDto,
  ) {
    return this.noShowService.rejectNoShow(
      dto.noShowEventId,
      req.user.userId,
      dto.reason,
    );
  }

  /**
   * Obtenir les no-shows d'une mission
   */
  @Get('no-show/mission/:missionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Récupérer les no-shows d\'une mission',
    description: 'Liste tous les événements no-show pour une mission donnée',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des no-shows',
  })
  async getNoShowsByMission(@Param('missionId') missionId: string) {
    return this.noShowService.getNoShowsByMission(missionId);
  }
}
